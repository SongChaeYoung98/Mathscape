use base64::{engine::general_purpose, Engine as _};
use rusqlite::{params, Connection};
use serde::Serialize;
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Manager};

#[derive(Debug, Serialize)]
struct ProjectSummary {
    project_id: String,
    title: String,
    updated_at: i64,
}

#[derive(Debug, Serialize)]
struct VideoExportResult {
    output_path: String,
}

#[derive(Debug, Serialize)]
struct VideoExportSession {
    session_id: String,
    directory: String,
    frame_pattern: String,
    output_path: String,
}

#[tauri::command]
fn sample_expression(amplitude: f64, frequency: f64, phase: f64) -> Vec<math_core::SamplePoint> {
    math_core::sample_sine(amplitude, frequency, phase, -std::f64::consts::TAU, std::f64::consts::TAU, 480)
}

#[tauri::command(rename_all = "camelCase")]
fn save_project_to_library(
    app: AppHandle,
    project_id: String,
    project: serde_json::Value,
) -> Result<ProjectSummary, String> {
    let title = project
        .get("title")
        .and_then(|value| value.as_str())
        .unwrap_or("Untitled scene")
        .to_string();
    let updated_at = unix_timestamp_seconds()?;
    let json = serde_json::to_string_pretty(&project).map_err(|error| error.to_string())?;
    let connection = open_project_database(&app)?;

    connection
        .execute(
            "insert into projects (project_id, title, json, updated_at)
             values (?1, ?2, ?3, ?4)
             on conflict(project_id) do update set
               title = excluded.title,
               json = excluded.json,
               updated_at = excluded.updated_at",
            params![project_id, title, json, updated_at],
        )
        .map_err(|error| error.to_string())?;

    Ok(ProjectSummary {
        project_id,
        title,
        updated_at,
    })
}

#[tauri::command(rename_all = "camelCase")]
fn load_project_from_library(app: AppHandle, project_id: String) -> Result<serde_json::Value, String> {
    let connection = open_project_database(&app)?;
    let json: String = connection
        .query_row(
            "select json from projects where project_id = ?1",
            params![project_id],
            |row| row.get(0),
        )
        .map_err(|error| error.to_string())?;

    serde_json::from_str(&json).map_err(|error| error.to_string())
}

#[tauri::command]
fn list_project_library(app: AppHandle) -> Result<Vec<ProjectSummary>, String> {
    let connection = open_project_database(&app)?;
    let mut statement = connection
        .prepare("select project_id, title, updated_at from projects order by updated_at desc")
        .map_err(|error| error.to_string())?;
    let rows = statement
        .query_map([], |row| {
            Ok(ProjectSummary {
                project_id: row.get(0)?,
                title: row.get(1)?,
                updated_at: row.get(2)?,
            })
        })
        .map_err(|error| error.to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())
}

#[tauri::command(rename_all = "camelCase")]
fn encode_png_sequence_to_mp4(
    frame_pattern: String,
    output_path: String,
    fps: u32,
) -> Result<VideoExportResult, String> {
    let validated_fps = fps.clamp(1, 120).to_string();
    let status = Command::new("ffmpeg")
        .args([
            "-y",
            "-framerate",
            &validated_fps,
            "-i",
            &frame_pattern,
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            "-movflags",
            "+faststart",
            &output_path,
        ])
        .status()
        .map_err(|error| format!("Could not run ffmpeg: {error}"))?;

    if !status.success() {
        return Err(format!("ffmpeg exited with status {status}"));
    }

    Ok(VideoExportResult { output_path })
}

#[tauri::command(rename_all = "camelCase")]
fn create_video_export_session(app: AppHandle, scene_name: String) -> Result<VideoExportSession, String> {
    let timestamp = unix_timestamp_seconds()?;
    let sanitized_scene = sanitize_filename(&scene_name);
    let session_id = format!("{sanitized_scene}-{timestamp}");
    let directory = app
        .path()
        .app_cache_dir()
        .map_err(|error| error.to_string())?
        .join("video-exports")
        .join(&session_id);

    fs::create_dir_all(&directory).map_err(|error| error.to_string())?;

    let frame_pattern = directory.join("frame-%05d.png");
    let output_path = directory.join(format!("{sanitized_scene}.mp4"));

    Ok(VideoExportSession {
        session_id,
        directory: directory.to_string_lossy().to_string(),
        frame_pattern: frame_pattern.to_string_lossy().to_string(),
        output_path: output_path.to_string_lossy().to_string(),
    })
}

#[tauri::command(rename_all = "camelCase")]
fn write_video_export_frame(
    session_directory: String,
    frame_index: u32,
    png_data_url: String,
) -> Result<String, String> {
    if frame_index == 0 {
        return Err("frame_index must start at 1".to_string());
    }

    let directory = PathBuf::from(session_directory);
    fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
    let path = directory.join(format!("frame-{frame_index:05}.png"));
    let data = decode_png_data_url(&png_data_url)?;

    fs::write(&path, data).map_err(|error| error.to_string())?;
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
fn ffmpeg_available() -> bool {
    Command::new("ffmpeg")
        .arg("-version")
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
}

fn decode_png_data_url(data_url: &str) -> Result<Vec<u8>, String> {
    let Some(base64_data) = data_url.strip_prefix("data:image/png;base64,") else {
        return Err("Expected a PNG data URL".to_string());
    };

    general_purpose::STANDARD
        .decode(base64_data)
        .map_err(|error| error.to_string())
}

fn sanitize_filename(value: &str) -> String {
    let sanitized: String = value
        .chars()
        .map(|character| {
            if character.is_ascii_alphanumeric() || character == '-' || character == '_' {
                character.to_ascii_lowercase()
            } else {
                '-'
            }
        })
        .collect();
    let trimmed = sanitized.trim_matches('-');

    if trimmed.is_empty() {
        "mathscape-export".to_string()
    } else {
        trimmed.to_string()
    }
}

fn open_project_database(app: &AppHandle) -> Result<Connection, String> {
    let path = project_database_path(app)?;
    let connection = Connection::open(path).map_err(|error| error.to_string())?;

    connection
        .execute_batch(
            "create table if not exists projects (
               project_id text primary key,
               title text not null,
               json text not null,
               updated_at integer not null
             );",
        )
        .map_err(|error| error.to_string())?;

    Ok(connection)
}

fn project_database_path(app: &AppHandle) -> Result<PathBuf, String> {
    let directory = app.path().app_data_dir().map_err(|error| error.to_string())?;
    fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
    Ok(directory.join("projects.sqlite"))
}

fn unix_timestamp_seconds() -> Result<i64, String> {
    let duration = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| error.to_string())?;

    Ok(duration.as_secs() as i64)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            sample_expression,
            save_project_to_library,
            load_project_from_library,
            list_project_library,
            encode_png_sequence_to_mp4,
            create_video_export_session,
            write_video_export_frame,
            ffmpeg_available
        ])
        .run(tauri::generate_context!())
        .expect("error while running Mathscape");
}

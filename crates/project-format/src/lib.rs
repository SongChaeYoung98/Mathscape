use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectDocument {
    pub schema_version: u32,
    pub title: String,
    pub export_settings: ExportSettings,
    pub scenes: Vec<SceneDocument>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct ExportSettings {
    pub width: u32,
    pub height: u32,
    pub frame_count: u32,
    pub fps: u32,
    pub transparent_background: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SceneDocument {
    pub id: String,
    pub name: String,
    pub formula_latex: String,
    pub next_transform_latex: String,
    pub expression: String,
    pub plot_mode: String,
    pub complex_mode: String,
    pub parameters: MathscapeParameters,
    pub visual: SceneVisualSettings,
    pub annotation: SceneAnnotationSettings,
    pub overlay: SceneOverlaySettings,
    pub duration_seconds: f64,
    pub timeline: Vec<TimelineMarker>,
    pub derivation_steps: Vec<DerivationStep>,
    pub parameter_keyframes: Vec<ParameterKeyframe>,
    pub camera_keyframes: Vec<CameraKeyframe>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct MathscapeParameters {
    pub amplitude: f64,
    pub frequency: f64,
    pub phase: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SceneVisualSettings {
    pub color_map: String,
    pub line_weight: f64,
    pub show_axes: bool,
    pub three_mode: String,
    pub surface_style: String,
    pub rotation_speed: f64,
    pub surface_height_scale: f64,
    pub surface_resolution: u32,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct SceneAnnotationSettings {
    pub show_trace_point: bool,
    pub trace_x: f64,
    pub animate_trace_point: bool,
    pub show_tangent: bool,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct SceneOverlaySettings {
    pub enabled: bool,
    pub show_formula: bool,
    pub show_derivation: bool,
    pub formula_position: String,
    pub derivation_position: String,
    pub card_scale: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimelineMarker {
    pub id: String,
    pub label: String,
    pub time_seconds: f64,
    pub at_percent: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DerivationStep {
    pub id: String,
    pub label: String,
    pub time_seconds: f64,
    pub latex: String,
    pub note: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParameterKeyframe {
    pub id: String,
    pub label: String,
    pub time_seconds: f64,
    pub easing: String,
    pub parameters: MathscapeParameters,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct CameraPose {
    pub position: [f64; 3],
    pub target: [f64; 3],
    pub fov_degrees: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CameraKeyframe {
    pub id: String,
    pub label: String,
    pub time_seconds: f64,
    pub easing: String,
    pub camera: CameraPose,
}

impl ProjectDocument {
    pub fn empty(title: impl Into<String>) -> Self {
        Self {
            schema_version: 1,
            title: title.into(),
            export_settings: ExportSettings {
                width: 1920,
                height: 1080,
                frame_count: 48,
                fps: 24,
                transparent_background: false,
            },
            scenes: Vec::new(),
        }
    }
}

import { invoke } from '@tauri-apps/api/core';
import { isNativeRuntime } from './native-projects';

export type VideoExportResult = {
  output_path: string;
};

export type VideoExportSession = {
  session_id: string;
  directory: string;
  frame_pattern: string;
  output_path: string;
};

export async function ffmpegAvailable(): Promise<boolean> {
  if (!isNativeRuntime()) return false;

  return invoke<boolean>('ffmpeg_available');
}

export async function createVideoExportSession(sceneName: string): Promise<VideoExportSession | undefined> {
  if (!isNativeRuntime()) return undefined;

  return invoke<VideoExportSession>('create_video_export_session', { sceneName });
}

export async function writeVideoExportFrame(
  sessionDirectory: string,
  frameIndex: number,
  pngDataUrl: string
): Promise<string | undefined> {
  if (!isNativeRuntime()) return undefined;

  return invoke<string>('write_video_export_frame', {
    sessionDirectory,
    frameIndex,
    pngDataUrl
  });
}

export async function encodePngSequenceToMp4(
  framePattern: string,
  outputPath: string,
  fps: number
): Promise<VideoExportResult | undefined> {
  if (!isNativeRuntime()) return undefined;

  return invoke<VideoExportResult>('encode_png_sequence_to_mp4', {
    framePattern,
    outputPath,
    fps
  });
}

import type { CameraKeyframe, CameraPose, MathscapeParameters, ParameterKeyframe } from './project';

export function interpolateParameters(
  keyframes: ParameterKeyframe[],
  currentTime: number,
  fallback: MathscapeParameters
): MathscapeParameters {
  if (keyframes.length === 0) return fallback;

  const frames = [...keyframes].sort((left, right) => left.timeSeconds - right.timeSeconds);
  const first = frames[0];
  const last = frames[frames.length - 1];

  if (currentTime <= first.timeSeconds) return first.parameters;
  if (currentTime >= last.timeSeconds) return last.parameters;

  const nextIndex = frames.findIndex((frame) => frame.timeSeconds >= currentTime);
  const previous = frames[nextIndex - 1];
  const next = frames[nextIndex];
  const span = next.timeSeconds - previous.timeSeconds || 1;
  const rawT = (currentTime - previous.timeSeconds) / span;
  const t = next.easing === 'ease-in-out' ? easeInOut(rawT) : rawT;

  return {
    amplitude: lerp(previous.parameters.amplitude, next.parameters.amplitude, t),
    frequency: lerp(previous.parameters.frequency, next.parameters.frequency, t),
    phase: lerp(previous.parameters.phase, next.parameters.phase, t)
  };
}

export function timelinePercent(currentTime: number, durationSeconds: number): number {
  if (durationSeconds <= 0) return 0;
  return Math.max(0, Math.min(100, (currentTime / durationSeconds) * 100));
}

export function interpolateCamera(
  keyframes: CameraKeyframe[],
  currentTime: number,
  fallback: CameraPose
): CameraPose {
  if (keyframes.length === 0) return fallback;

  const frames = [...keyframes].sort((left, right) => left.timeSeconds - right.timeSeconds);
  const first = frames[0];
  const last = frames[frames.length - 1];

  if (currentTime <= first.timeSeconds) return first.camera;
  if (currentTime >= last.timeSeconds) return last.camera;

  const nextIndex = frames.findIndex((frame) => frame.timeSeconds >= currentTime);
  const previous = frames[nextIndex - 1];
  const next = frames[nextIndex];
  const span = next.timeSeconds - previous.timeSeconds || 1;
  const rawT = (currentTime - previous.timeSeconds) / span;
  const t = next.easing === 'ease-in-out' ? easeInOut(rawT) : rawT;

  return {
    position: interpolateVector(previous.camera.position, next.camera.position, t),
    target: interpolateVector(previous.camera.target, next.camera.target, t),
    fovDegrees: lerp(previous.camera.fovDegrees, next.camera.fovDegrees, t)
  };
}

export const defaultCameraPose: CameraPose = {
  position: [5.8, 4.2, 6.4],
  target: [0, 0, 0],
  fovDegrees: 45
};

function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

function interpolateVector(start: [number, number, number], end: [number, number, number], t: number) {
  return [lerp(start[0], end[0], t), lerp(start[1], end[1], t), lerp(start[2], end[2], t)] as [
    number,
    number,
    number
  ];
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

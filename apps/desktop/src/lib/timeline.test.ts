import { describe, expect, it } from 'vitest';
import { defaultCameraPose, interpolateCamera, interpolateParameters, timelinePercent } from './timeline';
import type { CameraKeyframe, MathscapeParameters, ParameterKeyframe } from './project';

const fallbackParameters: MathscapeParameters = {
  amplitude: 1,
  frequency: 1,
  phase: 0
};

const parameterKeyframes: ParameterKeyframe[] = [
  {
    id: 'end',
    label: 'End',
    timeSeconds: 10,
    easing: 'linear',
    parameters: { amplitude: 5, frequency: 9, phase: 4 }
  },
  {
    id: 'start',
    label: 'Start',
    timeSeconds: 0,
    easing: 'linear',
    parameters: { amplitude: 1, frequency: 1, phase: 0 }
  }
];

const cameraKeyframes: CameraKeyframe[] = [
  {
    id: 'cam-start',
    label: 'Start camera',
    timeSeconds: 0,
    easing: 'linear',
    camera: { position: [0, 2, 4], target: [0, 0, 0], fovDegrees: 40 }
  },
  {
    id: 'cam-end',
    label: 'End camera',
    timeSeconds: 8,
    easing: 'linear',
    camera: { position: [8, 6, 0], target: [2, 2, 2], fovDegrees: 56 }
  }
];

describe('interpolateParameters', () => {
  it('returns fallback parameters when no keyframes exist', () => {
    expect(interpolateParameters([], 3, fallbackParameters)).toEqual(fallbackParameters);
  });

  it('sorts keyframes and clamps outside the keyframe range', () => {
    expect(interpolateParameters(parameterKeyframes, -1, fallbackParameters)).toEqual({
      amplitude: 1,
      frequency: 1,
      phase: 0
    });
    expect(interpolateParameters(parameterKeyframes, 12, fallbackParameters)).toEqual({
      amplitude: 5,
      frequency: 9,
      phase: 4
    });
  });

  it('linearly interpolates parameter channels', () => {
    expect(interpolateParameters(parameterKeyframes, 2.5, fallbackParameters)).toEqual({
      amplitude: 2,
      frequency: 3,
      phase: 1
    });
  });

  it('applies ease-in-out from the next keyframe', () => {
    const easedFrames: ParameterKeyframe[] = [
      {
        id: 'start',
        label: 'Start',
        timeSeconds: 0,
        easing: 'linear',
        parameters: { amplitude: 0, frequency: 0, phase: 0 }
      },
      {
        id: 'end',
        label: 'End',
        timeSeconds: 10,
        easing: 'ease-in-out',
        parameters: { amplitude: 10, frequency: 10, phase: 10 }
      }
    ];

    expect(interpolateParameters(easedFrames, 2.5, fallbackParameters)).toEqual({
      amplitude: 1.25,
      frequency: 1.25,
      phase: 1.25
    });
  });
});

describe('interpolateCamera', () => {
  it('returns the default camera pose when no keyframes exist', () => {
    expect(interpolateCamera([], 2, defaultCameraPose)).toEqual(defaultCameraPose);
  });

  it('interpolates camera vectors and FOV', () => {
    expect(interpolateCamera(cameraKeyframes, 4, defaultCameraPose)).toEqual({
      position: [4, 4, 2],
      target: [1, 1, 1],
      fovDegrees: 48
    });
  });

  it('clamps before and after camera keyframes', () => {
    expect(interpolateCamera(cameraKeyframes, -1, defaultCameraPose)).toEqual(cameraKeyframes[0].camera);
    expect(interpolateCamera(cameraKeyframes, 9, defaultCameraPose)).toEqual(cameraKeyframes[1].camera);
  });
});

describe('timelinePercent', () => {
  it('converts time to a clamped timeline percentage', () => {
    expect(timelinePercent(5, 20)).toBe(25);
    expect(timelinePercent(-5, 20)).toBe(0);
    expect(timelinePercent(30, 20)).toBe(100);
    expect(timelinePercent(5, 0)).toBe(0);
  });
});

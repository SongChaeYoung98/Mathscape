import { describe, expect, it } from 'vitest';
import {
  createDefaultProject,
  defaultExportSettings,
  defaultSceneAnnotationSettings,
  defaultSceneOverlaySettings,
  defaultSceneVisualSettings,
  normalizeProject
} from './project';
import { parseProjectFile, serializeProject } from './project-file';

describe('normalizeProject', () => {
  it('fills project-level and scene-level defaults for older project files', () => {
    const normalized = normalizeProject({
      schemaVersion: 1,
      title: 'Legacy scene',
      activeSceneId: 'legacy',
      scenes: [
        {
          id: 'legacy',
          name: 'Legacy imported scene',
          formulaLatex: 'f(x)=x^2',
          nextTransformLatex: "f'(x)=2x",
          parameters: { amplitude: 2 },
          visual: { colorMap: 'fireline' },
          overlay: { enabled: false },
          durationSeconds: 0,
          timeline: undefined,
          derivationSteps: undefined,
          parameterKeyframes: undefined,
          cameraKeyframes: undefined
        } as never
      ]
    });

    expect(normalized.title).toBe('Legacy scene');
    expect(normalized.activeSceneId).toBe('legacy');
    expect(normalized.exportSettings).toEqual(defaultExportSettings);

    const scene = normalized.scenes[0];
    expect(scene.id).toBe('legacy');
    expect(scene.expression).toBe('a*sin(b*x+phi)');
    expect(scene.surfaceExpression).toBe('a*sin(b*sqrt(x^2+y^2)+phi)*exp(-sqrt(x^2+y^2)*0.18)');
    expect(scene.plotMode).toBe('sine');
    expect(scene.complexMode).toBe('quadratic');
    expect(scene.parameters).toEqual({ amplitude: 2, frequency: 1, phase: 0 });
    expect(scene.visual).toEqual({ ...defaultSceneVisualSettings, colorMap: 'fireline' });
    expect(scene.annotation).toEqual(defaultSceneAnnotationSettings);
    expect(scene.overlay).toEqual({ ...defaultSceneOverlaySettings, enabled: false });
    expect(scene.durationSeconds).toBe(8);
    expect(scene.timeline.length).toBeGreaterThan(0);
    expect(scene.derivationSteps.length).toBeGreaterThan(0);
    expect(scene.parameterKeyframes.length).toBeGreaterThan(0);
    expect(scene.cameraKeyframes.length).toBeGreaterThan(0);
  });

  it('preserves newer scene style, annotation, overlay, and export settings', () => {
    const normalized = normalizeProject({
      schemaVersion: 1,
      title: 'Modern scene',
      activeSceneId: 'modern',
      exportSettings: { width: 1280, height: 720, frameCount: 18, fps: 30, transparentBackground: true },
      scenes: [
        {
          ...createDefaultProject().scenes[0],
          id: 'modern',
          visual: {
            ...defaultSceneVisualSettings,
            colorMap: 'viridis',
            threeMode: 'curve',
            surfaceStyle: 'wireframe',
            rotationSpeed: 0.006,
            surfaceHeightScale: 1.8,
            surfaceResolution: 48
          },
          annotation: {
            ...defaultSceneAnnotationSettings,
            traceX: 1.4,
            animateTracePoint: false,
            showTangent: true
          },
          overlay: {
            ...defaultSceneOverlaySettings,
            formulaPosition: 'bottom-left',
            derivationPosition: 'top-right',
            cardScale: 1.2
          }
        }
      ]
    });

    expect(normalized.exportSettings).toEqual({
      width: 1280,
      height: 720,
      frameCount: 18,
      fps: 30,
      transparentBackground: true
    });
    expect(normalized.scenes[0].visual.surfaceStyle).toBe('wireframe');
    expect(normalized.scenes[0].visual.threeMode).toBe('curve');
    expect(normalized.scenes[0].visual.surfaceHeightScale).toBe(1.8);
    expect(normalized.scenes[0].visual.surfaceResolution).toBe(48);
    expect(normalized.scenes[0].annotation.showTangent).toBe(true);
    expect(normalized.scenes[0].overlay.formulaPosition).toBe('bottom-left');
    expect(normalized.scenes[0].overlay.cardScale).toBe(1.2);
  });

  it('falls back to a default project for invalid schema or empty scene lists', () => {
    expect(normalizeProject({ schemaVersion: 99 as 1 }).activeSceneId).toBe('scene-intro');
    expect(normalizeProject({ schemaVersion: 1, scenes: [] }).activeSceneId).toBe('scene-intro');
  });
});

describe('project-file serialization', () => {
  it('round-trips through the portable project file parser', () => {
    const project = createDefaultProject();
    const parsed = parseProjectFile(serializeProject(project));

    expect(parsed).toEqual(project);
  });
});

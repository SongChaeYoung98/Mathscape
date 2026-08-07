export type MathscapeParameters = {
  amplitude: number;
  frequency: number;
  phase: number;
};

export type MathscapeProject = {
  schemaVersion: 1;
  title: string;
  activeSceneId: string;
  exportSettings: ExportSettings;
  scenes: MathscapeScene[];
};

export type ExportSettings = {
  width: number;
  height: number;
  frameCount: number;
  fps: number;
  transparentBackground: boolean;
};

export type MathscapeScene = {
  id: string;
  name: string;
  formulaLatex: string;
  nextTransformLatex: string;
  expression: string;
  plotMode: PlotMode;
  complexMode: ComplexFunctionMode;
  parameters: MathscapeParameters;
  visual: SceneVisualSettings;
  annotation: SceneAnnotationSettings;
  overlay: SceneOverlaySettings;
  durationSeconds: number;
  timeline: TimelineMarker[];
  derivationSteps: DerivationStep[];
  parameterKeyframes: ParameterKeyframe[];
  cameraKeyframes: CameraKeyframe[];
};

export type ComplexFunctionMode = 'quadratic' | 'zeta';
export type PlotMode = 'sine' | 'fourier-square' | 'expression' | 'vector-field' | 'parametric' | 'linear-transform';
export type ColorMap = 'studio-blue' | 'fireline' | 'viridis';
export type SurfaceStyle = 'smooth' | 'wireframe';
export type ThreeRenderMode = 'surface' | 'curve';

export type SceneVisualSettings = {
  colorMap: ColorMap;
  lineWeight: number;
  showAxes: boolean;
  threeMode: ThreeRenderMode;
  surfaceStyle: SurfaceStyle;
  rotationSpeed: number;
  surfaceHeightScale: number;
  surfaceResolution: number;
};

export type SceneAnnotationSettings = {
  showTracePoint: boolean;
  traceX: number;
  animateTracePoint: boolean;
  showTangent: boolean;
};

export type SceneOverlaySettings = {
  enabled: boolean;
  showFormula: boolean;
  showDerivation: boolean;
  formulaPosition: OverlayPosition;
  derivationPosition: OverlayPosition;
  cardScale: number;
};

export type OverlayPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export type TimelineMarker = {
  id: string;
  label: string;
  timeSeconds: number;
  atPercent: number;
};

export type DerivationStep = {
  id: string;
  label: string;
  timeSeconds: number;
  latex: string;
  note: string;
};

export type ParameterKeyframe = {
  id: string;
  label: string;
  timeSeconds: number;
  easing: 'linear' | 'ease-in-out';
  parameters: MathscapeParameters;
};

export type CameraPose = {
  position: [number, number, number];
  target: [number, number, number];
  fovDegrees: number;
};

export type CameraKeyframe = {
  id: string;
  label: string;
  timeSeconds: number;
  easing: 'linear' | 'ease-in-out';
  camera: CameraPose;
};

export const projectStorageKey = 'mathscape.project.v1';

export const defaultExportSettings: ExportSettings = {
  width: 1920,
  height: 1080,
  frameCount: 48,
  fps: 24,
  transparentBackground: false
};

export const defaultSceneVisualSettings: SceneVisualSettings = {
  colorMap: 'studio-blue',
  lineWeight: 2.5,
  showAxes: true,
  threeMode: 'surface',
  surfaceStyle: 'smooth',
  rotationSpeed: 0.0025,
  surfaceHeightScale: 1,
  surfaceResolution: 96
};

export const defaultSceneAnnotationSettings: SceneAnnotationSettings = {
  showTracePoint: true,
  traceX: 0,
  animateTracePoint: true,
  showTangent: false
};

export const defaultSceneOverlaySettings: SceneOverlaySettings = {
  enabled: true,
  showFormula: true,
  showDerivation: true,
  formulaPosition: 'top-left',
  derivationPosition: 'bottom-right',
  cardScale: 1
};

export function createDefaultProject(): MathscapeProject {
  return {
    schemaVersion: 1,
    title: 'Untitled scene',
    activeSceneId: 'scene-intro',
    exportSettings: defaultExportSettings,
    scenes: [
      {
        id: 'scene-intro',
        name: 'Sine transformation',
        formulaLatex: 'f(x)=a\\sin(bx+\\phi)',
        nextTransformLatex: "f'(x)=ab\\cos(bx+\\phi)",
        expression: 'a*sin(b*x+phi)',
        plotMode: 'sine',
        complexMode: 'quadratic',
        parameters: {
          amplitude: 1,
          frequency: 1,
          phase: 0
        },
        visual: defaultSceneVisualSettings,
        annotation: defaultSceneAnnotationSettings,
        overlay: defaultSceneOverlaySettings,
        durationSeconds: 8,
        timeline: [
          { id: 'intro', label: 'Formula', timeSeconds: 0, atPercent: 0 },
          { id: 'modulate', label: 'Modulate', timeSeconds: 3, atPercent: 37.5 },
          { id: 'camera', label: 'Camera', timeSeconds: 6, atPercent: 75 }
        ],
        derivationSteps: [
          {
            id: 'derive-base',
            label: 'Define function',
            timeSeconds: 0,
            latex: 'f(x)=a\\sin(bx+\\phi)',
            note: 'Introduce the tunable sine expression.'
          },
          {
            id: 'derive-chain',
            label: 'Apply chain rule',
            timeSeconds: 2.4,
            latex: '\\frac{d}{dx}\\sin(bx+\\phi)=b\\cos(bx+\\phi)',
            note: 'Reveal where the frequency multiplier appears.'
          },
          {
            id: 'derive-result',
            label: 'Final derivative',
            timeSeconds: 5.8,
            latex: "f'(x)=ab\\cos(bx+\\phi)",
            note: 'Resolve the transformation into the derivative.'
          }
        ],
        parameterKeyframes: [
          {
            id: 'kf-start',
            label: 'Calm start',
            timeSeconds: 0,
            easing: 'ease-in-out',
            parameters: { amplitude: 0.75, frequency: 0.8, phase: 0 }
          },
          {
            id: 'kf-build',
            label: 'Build energy',
            timeSeconds: 3,
            easing: 'ease-in-out',
            parameters: { amplitude: 1.8, frequency: 2.4, phase: 1.1 }
          },
          {
            id: 'kf-resolve',
            label: 'Resolve',
            timeSeconds: 8,
            easing: 'ease-in-out',
            parameters: { amplitude: 1.15, frequency: 1.2, phase: 3.14 }
          }
        ],
        cameraKeyframes: [
          {
            id: 'cam-wide',
            label: 'Wide orbit',
            timeSeconds: 0,
            easing: 'ease-in-out',
            camera: { position: [5.8, 4.2, 6.4], target: [0, 0, 0], fovDegrees: 45 }
          },
          {
            id: 'cam-low',
            label: 'Low sweep',
            timeSeconds: 3.2,
            easing: 'ease-in-out',
            camera: { position: [-4.8, 2.3, 5.2], target: [0.4, 0, -0.2], fovDegrees: 38 }
          },
          {
            id: 'cam-detail',
            label: 'Detail pass',
            timeSeconds: 8,
            easing: 'ease-in-out',
            camera: { position: [3.2, 5.4, -5.8], target: [0, 0.1, 0], fovDegrees: 34 }
          }
        ]
      }
    ]
  };
}

export function getActiveScene(project: MathscapeProject): MathscapeScene {
  return project.scenes.find((scene) => scene.id === project.activeSceneId) ?? project.scenes[0];
}

export function updateActiveScene(
  project: MathscapeProject,
  update: (scene: MathscapeScene) => MathscapeScene
): MathscapeProject {
  return {
    ...project,
    scenes: project.scenes.map((scene) => (scene.id === project.activeSceneId ? update(scene) : scene))
  };
}

export function loadProject(): MathscapeProject {
  const fallback = createDefaultProject();

  try {
    const stored = localStorage.getItem(projectStorageKey);
    if (!stored) return fallback;

    return normalizeProject(JSON.parse(stored) as MathscapeProject);
  } catch {
    return fallback;
  }
}

export function saveProject(project: MathscapeProject): void {
  localStorage.setItem(projectStorageKey, JSON.stringify(project));
}

export function normalizeProject(project: Partial<MathscapeProject>): MathscapeProject {
  const fallback = createDefaultProject();

  if (project.schemaVersion !== 1 || !Array.isArray(project.scenes) || project.scenes.length === 0) {
    return fallback;
  }

  return {
    ...fallback,
    ...project,
    schemaVersion: 1,
    title: project.title || fallback.title,
    activeSceneId: project.activeSceneId || project.scenes[0].id,
    exportSettings: {
      ...fallback.exportSettings,
      ...project.exportSettings
    },
    scenes: project.scenes.map((scene) => ({
      ...fallback.scenes[0],
      ...scene,
      parameters: {
        ...fallback.scenes[0].parameters,
        ...scene.parameters
      },
      complexMode: scene.complexMode ?? fallback.scenes[0].complexMode,
      plotMode: scene.plotMode ?? fallback.scenes[0].plotMode,
      expression: scene.expression ?? fallback.scenes[0].expression,
      visual: {
        ...fallback.scenes[0].visual,
        ...scene.visual
      },
      annotation: {
        ...fallback.scenes[0].annotation,
        ...scene.annotation
      },
      overlay: {
        ...fallback.scenes[0].overlay,
        ...scene.overlay
      },
      durationSeconds: scene.durationSeconds || fallback.scenes[0].durationSeconds,
      timeline: scene.timeline ?? fallback.scenes[0].timeline,
      derivationSteps: scene.derivationSteps ?? fallback.scenes[0].derivationSteps,
      parameterKeyframes: scene.parameterKeyframes ?? fallback.scenes[0].parameterKeyframes,
      cameraKeyframes: scene.cameraKeyframes ?? fallback.scenes[0].cameraKeyframes
    }))
  };
}

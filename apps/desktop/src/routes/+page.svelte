<script lang="ts">
  import { onMount } from 'svelte';
  import ComplexDomain from '$lib/ComplexDomain.svelte';
  import FormulaMath from '$lib/FormulaMath.svelte';
  import ThreeSurface from '$lib/ThreeSurface.svelte';
  import {
    download2dSequence,
    download2dSvg,
    downloadCanvasPng,
    downloadCanvasPngFrame,
    downloadComplexSequence,
    render2dFrameDataUrl,
    renderComplexFrameDataUrl
  } from '$lib/export';
  import {
    createVideoExportSession,
    encodePngSequenceToMp4,
    ffmpegAvailable,
    writeVideoExportFrame
  } from '$lib/native-export';
  import {
    isNativeRuntime,
    listProjectLibrary,
    loadProjectFromLibrary,
    saveProjectToLibrary,
    type ProjectSummary
  } from '$lib/native-projects';
  import { validateExpression, validateSurfaceExpression } from '$lib/expression';
  import {
    createPlotFunction,
    drawLinearTransform,
    drawPlot,
    drawVectorField,
    sampleFunction,
    sampleLinearTransform,
    sampleParametricCurve,
    sampleVectorField,
    sampleVectorTrajectory
  } from '$lib/plot';
  import { downloadProject, readProjectFromFile } from '$lib/project-file';
  import { createProjectFromTemplate, sceneTemplates } from '$lib/templates';
  import { defaultCameraPose, interpolateCamera, interpolateParameters, timelinePercent } from '$lib/timeline';
  import {
    createDefaultProject,
    getActiveScene,
    loadProject,
    saveProject,
    updateActiveScene,
    type CameraKeyframe,
    type CameraPose,
    type ColorMap,
    type DerivationStep,
    type MathscapeProject,
    type OverlayPosition,
    type ParameterKeyframe,
    type SurfaceStyle,
    type ThreeRenderMode,
    type TimelineMarker
  } from '$lib/project';

  type ParameterName = 'amplitude' | 'frequency' | 'phase';
  type CameraVectorName = 'position' | 'target';
  type CameraAxisIndex = 0 | 1 | 2;
  type ExportSettingName = 'width' | 'height' | 'frameCount' | 'fps';
  type VisualSettingName =
    | 'colorMap'
    | 'lineWeight'
    | 'showAxes'
    | 'threeMode'
    | 'surfaceStyle'
    | 'rotationSpeed'
    | 'surfaceHeightScale'
    | 'surfaceResolution';
  type VisualSettingValue = ColorMap | SurfaceStyle | ThreeRenderMode | number | boolean;
  type AnnotationSettingName = 'showTracePoint' | 'traceX' | 'animateTracePoint' | 'showTangent';
  type AnnotationSettingValue = number | boolean;
  type OverlaySettingName =
    | 'enabled'
    | 'showFormula'
    | 'showDerivation'
    | 'formulaPosition'
    | 'derivationPosition'
    | 'cardScale';
  type OverlaySettingValue = boolean | number | OverlayPosition;
  type AnimationPresetName = 'explain-build-resolve' | 'pulse-and-zoom' | 'slow-orbit';
  const blackHoleHaloExpression =
    'A*exp(-((sqrt(x^2+y^2)-R)^2)/(sigma^2))*cos(k*sqrt(x^2+y^2)+phi)-M/sqrt(x^2+y^2+epsilon)';

  let canvas: HTMLCanvasElement;
  let threeCanvas: HTMLCanvasElement | undefined;
  let complexCanvas: HTMLCanvasElement | undefined;
  let projectFileInput: HTMLInputElement;
  let project: MathscapeProject = createDefaultProject();
  let mounted = false;
  let selectedPanel = '2D';
  let isPlaying = false;
  let currentTime = 0;
  let lastFrameTime = 0;
  let playbackFrame = 0;
  let projectStatus = 'Autosaved locally';
  let exportStatus = 'Ready';
  let exportPreviewUrl = '';
  let exportPreviewFrame = 1;
  let exportPreviewSize = '480x270';
  let exportPreviewRequest = 0;
  let nativeLibraryAvailable = false;
  let projectLibrary: ProjectSummary[] = [];

  $: activeScene = getActiveScene(project);
  $: amplitude = activeScene.parameters.amplitude;
  $: frequency = activeScene.parameters.frequency;
  $: phase = activeScene.parameters.phase;
  $: animatedParameters = interpolateParameters(activeScene.parameterKeyframes, currentTime, activeScene.parameters);
  $: isTimelinePreview = isPlaying || currentTime > 0;
  $: renderAmplitude = isTimelinePreview ? animatedParameters.amplitude : amplitude;
  $: renderFrequency = isTimelinePreview ? animatedParameters.frequency : frequency;
  $: renderPhase = isTimelinePreview ? animatedParameters.phase : phase;
  $: cameraPose = interpolateCamera(activeScene.cameraKeyframes, currentTime, defaultCameraPose);
  $: playheadPercent = timelinePercent(currentTime, activeScene.durationSeconds);
  $: activeDerivationStep =
    [...activeScene.derivationSteps]
      .sort((left, right) => left.timeSeconds - right.timeSeconds)
      .findLast((step) => step.timeSeconds <= currentTime) ?? activeScene.derivationSteps[0];
  $: expressionStatus =
    activeScene.plotMode === 'vector-field'
      ? { ok: true, message: 'Vector field mode' }
      : activeScene.plotMode === 'parametric'
        ? { ok: true, message: 'Parametric curve mode' }
        : activeScene.plotMode === 'linear-transform'
          ? { ok: true, message: 'Linear transform mode' }
      : validateExpression(activeScene.expression);
  $: surfaceExpressionStatus = validateSurfaceExpression(activeScene.surfaceExpression);
  $: graphEquationValue = selectedPanel === '3D' ? activeScene.surfaceExpression : activeScene.expression;
  $: graphEquationStatus = selectedPanel === '3D' ? surfaceExpressionStatus : expressionStatus;
  $: exportSettings = project.exportSettings;

  function setParameter(name: ParameterName, value: number) {
    isPlaying = false;
    currentTime = 0;
    project = updateActiveScene(project, (scene) => ({
      ...scene,
      parameters: {
        ...scene.parameters,
        [name]: value
      }
    }));
  }

  function updateParameterKeyframe(keyframeId: string, update: (keyframe: ParameterKeyframe) => ParameterKeyframe) {
    project = updateActiveScene(project, (scene) => ({
      ...scene,
      parameterKeyframes: scene.parameterKeyframes
        .map((keyframe) => (keyframe.id === keyframeId ? update(keyframe) : keyframe))
        .sort((left, right) => left.timeSeconds - right.timeSeconds)
    }));
  }

  function setParameterKeyframeValue(keyframeId: string, name: ParameterName, value: number) {
    updateParameterKeyframe(keyframeId, (keyframe) => ({
      ...keyframe,
      parameters: {
        ...keyframe.parameters,
        [name]: value
      }
    }));
  }

  function setParameterKeyframeTime(keyframeId: string, value: number) {
    updateParameterKeyframe(keyframeId, (keyframe) => ({
      ...keyframe,
      timeSeconds: Math.max(0, Math.min(activeScene.durationSeconds, value))
    }));
  }

  function setParameterKeyframeEasing(keyframeId: string, value: 'linear' | 'ease-in-out') {
    updateParameterKeyframe(keyframeId, (keyframe) => ({
      ...keyframe,
      easing: value
    }));
  }

  function captureParameterKeyframe() {
    const at = Math.max(0, Math.min(activeScene.durationSeconds, currentTime));
    const keyframe: ParameterKeyframe = {
      id: `kf-${Date.now()}`,
      label: `Key ${activeScene.parameterKeyframes.length + 1}`,
      timeSeconds: at,
      easing: 'ease-in-out',
      parameters: {
        amplitude: renderAmplitude,
        frequency: renderFrequency,
        phase: renderPhase
      }
    };

    project = updateActiveScene(project, (scene) => ({
      ...scene,
      parameterKeyframes: [...scene.parameterKeyframes, keyframe].sort(
        (left, right) => left.timeSeconds - right.timeSeconds
      )
    }));
    projectStatus = `Captured parameter keyframe at ${at.toFixed(2)}s`;
  }

  function updateCameraKeyframe(keyframeId: string, update: (keyframe: CameraKeyframe) => CameraKeyframe) {
    project = updateActiveScene(project, (scene) => ({
      ...scene,
      cameraKeyframes: scene.cameraKeyframes
        .map((keyframe) => (keyframe.id === keyframeId ? update(keyframe) : keyframe))
        .sort((left, right) => left.timeSeconds - right.timeSeconds)
    }));
  }

  function setCameraKeyframeTime(keyframeId: string, value: number) {
    updateCameraKeyframe(keyframeId, (keyframe) => ({
      ...keyframe,
      timeSeconds: Math.max(0, Math.min(activeScene.durationSeconds, value))
    }));
  }

  function setCameraKeyframeEasing(keyframeId: string, value: 'linear' | 'ease-in-out') {
    updateCameraKeyframe(keyframeId, (keyframe) => ({
      ...keyframe,
      easing: value
    }));
  }

  function setCameraKeyframeVectorValue(
    keyframeId: string,
    vectorName: CameraVectorName,
    axis: CameraAxisIndex,
    value: number
  ) {
    updateCameraKeyframe(keyframeId, (keyframe) => {
      const nextVector = [...keyframe.camera[vectorName]] as [number, number, number];
      nextVector[axis] = value;

      return {
        ...keyframe,
        camera: {
          ...keyframe.camera,
          [vectorName]: nextVector
        }
      };
    });
  }

  function setCameraKeyframeFov(keyframeId: string, value: number) {
    updateCameraKeyframe(keyframeId, (keyframe) => ({
      ...keyframe,
      camera: {
        ...keyframe.camera,
        fovDegrees: Math.max(18, Math.min(80, value))
      }
    }));
  }

  function captureCameraKeyframe() {
    const at = Math.max(0, Math.min(activeScene.durationSeconds, currentTime));
    const camera: CameraPose = {
      position: [...cameraPose.position],
      target: [...cameraPose.target],
      fovDegrees: cameraPose.fovDegrees
    };
    const keyframe: CameraKeyframe = {
      id: `cam-${Date.now()}`,
      label: `Camera ${activeScene.cameraKeyframes.length + 1}`,
      timeSeconds: at,
      easing: 'ease-in-out',
      camera
    };

    project = updateActiveScene(project, (scene) => ({
      ...scene,
      cameraKeyframes: [...scene.cameraKeyframes, keyframe].sort((left, right) => left.timeSeconds - right.timeSeconds)
    }));
    projectStatus = `Captured camera keyframe at ${at.toFixed(2)}s`;
  }

  function updateDerivationStep(stepId: string, update: (step: DerivationStep) => DerivationStep) {
    project = updateActiveScene(project, (scene) => ({
      ...scene,
      derivationSteps: scene.derivationSteps
        .map((step) => (step.id === stepId ? update(step) : step))
        .sort((left, right) => left.timeSeconds - right.timeSeconds)
    }));
  }

  function setDerivationStepField(stepId: string, field: 'label' | 'latex' | 'note', value: string) {
    updateDerivationStep(stepId, (step) => ({
      ...step,
      [field]: value
    }));
  }

  function setDerivationStepTime(stepId: string, value: number) {
    updateDerivationStep(stepId, (step) => ({
      ...step,
      timeSeconds: Math.max(0, Math.min(activeScene.durationSeconds, value))
    }));
  }

  function addDerivationStep() {
    const at = Math.max(0, Math.min(activeScene.durationSeconds, currentTime));
    const nextIndex = activeScene.derivationSteps.length + 1;
    const step: DerivationStep = {
      id: `derive-${Date.now()}`,
      label: `Step ${nextIndex}`,
      timeSeconds: at,
      latex: activeScene.nextTransformLatex,
      note: 'Describe the next visual reasoning beat.'
    };

    project = updateActiveScene(project, (scene) => ({
      ...scene,
      derivationSteps: [...scene.derivationSteps, step].sort((left, right) => left.timeSeconds - right.timeSeconds)
    }));
    projectStatus = `Added solution step at ${at.toFixed(2)}s`;
  }

  function deleteDerivationStep(stepId: string) {
    if (activeScene.derivationSteps.length <= 1) {
      projectStatus = 'Keep at least one solution step';
      return;
    }

    const removedStep = activeScene.derivationSteps.find((step) => step.id === stepId);
    project = updateActiveScene(project, (scene) => ({
      ...scene,
      derivationSteps: scene.derivationSteps.filter((step) => step.id !== stepId)
    }));
    projectStatus = `Deleted solution step ${removedStep?.label ?? ''}`.trim();
  }

  function markerWithPercent(marker: TimelineMarker, durationSeconds: number): TimelineMarker {
    return {
      ...marker,
      atPercent: timelinePercent(marker.timeSeconds, durationSeconds)
    };
  }

  function setSceneDuration(value: number) {
    const durationSeconds = Math.max(1, Math.min(60, value));
    currentTime = Math.min(currentTime, durationSeconds);
    project = updateActiveScene(project, (scene) => ({
      ...scene,
      durationSeconds,
      timeline: scene.timeline.map((marker) =>
        markerWithPercent(
          {
            ...marker,
            timeSeconds: Math.min(marker.timeSeconds, durationSeconds)
          },
          durationSeconds
        )
      ),
      derivationSteps: scene.derivationSteps.map((step) => ({
        ...step,
        timeSeconds: Math.min(step.timeSeconds, durationSeconds)
      })),
      parameterKeyframes: scene.parameterKeyframes.map((keyframe) => ({
        ...keyframe,
        timeSeconds: Math.min(keyframe.timeSeconds, durationSeconds)
      })),
      cameraKeyframes: scene.cameraKeyframes.map((keyframe) => ({
        ...keyframe,
        timeSeconds: Math.min(keyframe.timeSeconds, durationSeconds)
      }))
    }));
  }

  function updateTimelineMarker(markerId: string, update: (marker: TimelineMarker) => TimelineMarker) {
    project = updateActiveScene(project, (scene) => ({
      ...scene,
      timeline: scene.timeline
        .map((marker) =>
          marker.id === markerId ? markerWithPercent(update(marker), scene.durationSeconds) : markerWithPercent(marker, scene.durationSeconds)
        )
        .sort((left, right) => left.timeSeconds - right.timeSeconds)
    }));
  }

  function setTimelineMarkerLabel(markerId: string, value: string) {
    updateTimelineMarker(markerId, (marker) => ({
      ...marker,
      label: value
    }));
  }

  function setTimelineMarkerTime(markerId: string, value: number) {
    updateTimelineMarker(markerId, (marker) => ({
      ...marker,
      timeSeconds: Math.max(0, Math.min(activeScene.durationSeconds, value))
    }));
  }

  function addTimelineMarker() {
    const at = Math.max(0, Math.min(activeScene.durationSeconds, currentTime));
    const marker: TimelineMarker = markerWithPercent(
      {
        id: `marker-${Date.now()}`,
        label: `Marker ${activeScene.timeline.length + 1}`,
        timeSeconds: at,
        atPercent: 0
      },
      activeScene.durationSeconds
    );

    project = updateActiveScene(project, (scene) => ({
      ...scene,
      timeline: [...scene.timeline, marker].sort((left, right) => left.timeSeconds - right.timeSeconds)
    }));
    projectStatus = `Added timeline marker at ${at.toFixed(2)}s`;
  }

  function applyAnimationPreset(name: AnimationPresetName) {
    isPlaying = false;
    currentTime = 0;

    const durationSeconds = name === 'slow-orbit' ? 14 : name === 'pulse-and-zoom' ? 10 : 12;
    const presetLabels: Record<AnimationPresetName, string> = {
      'explain-build-resolve': 'Explain build resolve',
      'pulse-and-zoom': 'Pulse and zoom',
      'slow-orbit': 'Slow orbit'
    };

    const parameterPresets: Record<AnimationPresetName, ParameterKeyframe[]> = {
      'explain-build-resolve': [
        {
          id: 'preset-param-intro',
          label: 'Preset intro',
          timeSeconds: 0,
          easing: 'ease-in-out',
          parameters: { amplitude: 0.7, frequency: 0.8, phase: 0 }
        },
        {
          id: 'preset-param-build',
          label: 'Preset build',
          timeSeconds: durationSeconds * 0.42,
          easing: 'ease-in-out',
          parameters: { amplitude: 1.9, frequency: 2.6, phase: 1.2 }
        },
        {
          id: 'preset-param-resolve',
          label: 'Preset resolve',
          timeSeconds: durationSeconds,
          easing: 'ease-in-out',
          parameters: { amplitude: 1.15, frequency: 1.2, phase: 3.14 }
        }
      ],
      'pulse-and-zoom': [
        {
          id: 'preset-param-rest',
          label: 'Preset rest',
          timeSeconds: 0,
          easing: 'ease-in-out',
          parameters: { amplitude: 0.85, frequency: 1.1, phase: 0 }
        },
        {
          id: 'preset-param-pulse',
          label: 'Preset pulse',
          timeSeconds: durationSeconds * 0.5,
          easing: 'ease-in-out',
          parameters: { amplitude: 2.5, frequency: 3.2, phase: 1.8 }
        },
        {
          id: 'preset-param-return',
          label: 'Preset return',
          timeSeconds: durationSeconds,
          easing: 'ease-in-out',
          parameters: { amplitude: 1.05, frequency: 1.4, phase: 6.28 }
        }
      ],
      'slow-orbit': [
        {
          id: 'preset-param-calm',
          label: 'Preset calm',
          timeSeconds: 0,
          easing: 'linear',
          parameters: { amplitude: 1, frequency: 1, phase: 0 }
        },
        {
          id: 'preset-param-drift',
          label: 'Preset drift',
          timeSeconds: durationSeconds,
          easing: 'linear',
          parameters: { amplitude: 1.35, frequency: 1.7, phase: 6.28 }
        }
      ]
    };

    const cameraPresets: Record<AnimationPresetName, CameraKeyframe[]> = {
      'explain-build-resolve': [
        {
          id: 'preset-cam-wide',
          label: 'Preset wide',
          timeSeconds: 0,
          easing: 'ease-in-out',
          camera: { position: [5.8, 4.2, 6.4], target: [0, 0, 0], fovDegrees: 45 }
        },
        {
          id: 'preset-cam-focus',
          label: 'Preset focus',
          timeSeconds: durationSeconds * 0.55,
          easing: 'ease-in-out',
          camera: { position: [3.5, 3.4, 4.6], target: [0.2, 0, -0.1], fovDegrees: 34 }
        },
        {
          id: 'preset-cam-outro',
          label: 'Preset outro',
          timeSeconds: durationSeconds,
          easing: 'ease-in-out',
          camera: { position: [-5.4, 4.6, 5.8], target: [0, 0, 0], fovDegrees: 42 }
        }
      ],
      'pulse-and-zoom': [
        {
          id: 'preset-cam-open',
          label: 'Preset open',
          timeSeconds: 0,
          easing: 'ease-in-out',
          camera: { position: [6.4, 4.6, 6.8], target: [0, 0, 0], fovDegrees: 48 }
        },
        {
          id: 'preset-cam-punch',
          label: 'Preset punch',
          timeSeconds: durationSeconds * 0.5,
          easing: 'ease-in-out',
          camera: { position: [2.7, 2.1, 3.4], target: [0.3, 0.1, 0], fovDegrees: 30 }
        },
        {
          id: 'preset-cam-release',
          label: 'Preset release',
          timeSeconds: durationSeconds,
          easing: 'ease-in-out',
          camera: { position: [5.2, 3.8, -5.9], target: [0, 0, 0], fovDegrees: 44 }
        }
      ],
      'slow-orbit': [
        {
          id: 'preset-cam-north',
          label: 'Preset north',
          timeSeconds: 0,
          easing: 'linear',
          camera: { position: [6.8, 4.4, 0.8], target: [0, 0, 0], fovDegrees: 46 }
        },
        {
          id: 'preset-cam-east',
          label: 'Preset east',
          timeSeconds: durationSeconds * 0.33,
          easing: 'linear',
          camera: { position: [0.8, 4.4, 6.8], target: [0, 0, 0], fovDegrees: 44 }
        },
        {
          id: 'preset-cam-south',
          label: 'Preset south',
          timeSeconds: durationSeconds * 0.66,
          easing: 'linear',
          camera: { position: [-6.8, 4.4, -0.8], target: [0, 0, 0], fovDegrees: 44 }
        },
        {
          id: 'preset-cam-west',
          label: 'Preset west',
          timeSeconds: durationSeconds,
          easing: 'linear',
          camera: { position: [-0.8, 4.4, -6.8], target: [0, 0, 0], fovDegrees: 46 }
        }
      ]
    };

    const markers: TimelineMarker[] = [
      { id: 'preset-marker-intro', label: 'Intro', timeSeconds: 0, atPercent: 0 },
      markerWithPercent(
        { id: 'preset-marker-build', label: 'Build', timeSeconds: durationSeconds * 0.5, atPercent: 0 },
        durationSeconds
      ),
      { id: 'preset-marker-resolve', label: 'Resolve', timeSeconds: durationSeconds, atPercent: 100 }
    ];

    project = updateActiveScene(project, (scene) => ({
      ...scene,
      durationSeconds,
      timeline: markers,
      parameterKeyframes: parameterPresets[name],
      cameraKeyframes: cameraPresets[name]
    }));
    projectStatus = `${presetLabels[name]} preset applied`;
  }

  function resetProject() {
    isPlaying = false;
    currentTime = 0;
    project = createDefaultProject();
    selectedPanel = '2D';
    projectStatus = 'Reset to default scene';
  }

  async function refreshProjectLibrary() {
    if (!nativeLibraryAvailable) {
      projectLibrary = [];
      return;
    }

    try {
      projectLibrary = await listProjectLibrary();
    } catch {
      projectStatus = 'Native project library unavailable';
    }
  }

  async function saveNativeProject() {
    if (!nativeLibraryAvailable) {
      projectStatus = 'Native library is available in the Tauri app';
      return;
    }

    try {
      const summary = await saveProjectToLibrary(project);
      if (summary) {
        projectStatus = `Saved ${summary.title} to library`;
        await refreshProjectLibrary();
      }
    } catch {
      projectStatus = 'Could not save to native library';
    }
  }

  async function openNativeProject(projectId: string) {
    if (!nativeLibraryAvailable) return;

    try {
      const loadedProject = await loadProjectFromLibrary(projectId);
      if (!loadedProject) return;

      isPlaying = false;
      currentTime = 0;
      project = loadedProject;
      selectedPanel = loadedProject.scenes[0]?.complexMode === 'zeta' ? 'Complex' : '2D';
      projectStatus = `Opened ${loadedProject.title} from library`;
    } catch {
      projectStatus = 'Could not open native project';
    }
  }

  function applyTemplate(templateId: string) {
    const template = sceneTemplates.find((item) => item.id === templateId) ?? sceneTemplates[0];

    isPlaying = false;
    currentTime = 0;
    project = createProjectFromTemplate(template.id);
    selectedPanel = template.targetPanel;
    projectStatus = `${template.name} template loaded`;
    exportStatus = 'Ready';
  }

  function setComplexMode(mode: 'quadratic' | 'zeta') {
    isPlaying = false;
    currentTime = 0;
    selectedPanel = 'Complex';
    project = updateActiveScene(project, (scene) => ({
      ...scene,
      complexMode: mode,
      formulaLatex: mode === 'zeta' ? '\\zeta(s),\\quad s=\\frac{1}{2}+it' : 'f(x)=a\\sin(bx+\\phi)',
      nextTransformLatex:
        mode === 'zeta'
          ? '\\eta(s)=\\sum_{n=1}^{N}(-1)^{n-1}n^{-s},\\quad \\zeta(s)=\\eta(s)/(1-2^{1-s})'
          : "f'(x)=ab\\cos(bx+\\phi)"
    }));
    projectStatus = mode === 'zeta' ? 'Riemann zeta demo loaded' : 'Quadratic complex demo loaded';
  }

  function setFormula(field: 'formulaLatex' | 'nextTransformLatex', value: string) {
    project = updateActiveScene(project, (scene) => ({
      ...scene,
      [field]: value
    }));
  }

  function setExpression(value: string) {
    project = updateActiveScene(project, (scene) => ({
      ...scene,
      expression: value,
      plotMode: 'expression'
    }));
  }

  function setGraphEquation(value: string) {
    if (isSurfaceEquation(value)) {
      setSurfaceExpression(value);
      projectStatus = 'Rendering 3D surface equation';
      return;
    }

    selectedPanel = '2D';
    setExpression(value);
    projectStatus = 'Rendering 2D graph equation';
  }

  function isSurfaceEquation(value: string): boolean {
    const normalized = value.toLowerCase();
    return (
      normalized.includes('z(') ||
      normalized.includes('y') ||
      normalized.includes('sqrt(x^2+y^2') ||
      normalized.includes(' r ') ||
      normalized.includes('sigma') ||
      normalized.includes('epsilon')
    );
  }

  function setSurfaceExpression(value: string) {
    selectedPanel = '3D';
    project = updateActiveScene(project, (scene) => ({
      ...scene,
      surfaceExpression: value,
      visual: {
        ...scene.visual,
        threeMode: 'surface'
      }
    }));
  }

  function useBlackHoleHaloExpression() {
    setSurfaceExpression(blackHoleHaloExpression);
    project = updateActiveScene(project, (scene) => ({
      ...scene,
      name: 'Black hole halo',
      formulaLatex:
        'z(x,y)=Ae^{-((\\sqrt{x^2+y^2}-R)^2)/\\sigma^2}\\cos(k\\sqrt{x^2+y^2}+\\phi)-\\frac{M}{\\sqrt{x^2+y^2+\\epsilon}}',
      nextTransformLatex: 'r=\\sqrt{x^2+y^2},\\quad R=1.8,\\ \\sigma=0.42,\\ M=0.9,\\ \\epsilon=0.08'
    }));
    projectStatus = 'Black hole halo 3D equation loaded';
  }

  function setOverlaySetting(name: OverlaySettingName, value: OverlaySettingValue) {
    project = updateActiveScene(project, (scene) => ({
      ...scene,
      overlay: {
        ...scene.overlay,
        [name]: value
      }
    }));
  }

  function overlayClass(position: OverlayPosition): string {
    return `overlay-${position}`;
  }

  function setVisualSetting(name: VisualSettingName, value: VisualSettingValue) {
    project = updateActiveScene(project, (scene) => ({
      ...scene,
      visual: {
        ...scene.visual,
        [name]: value
      }
    }));
  }

  function setAnnotationSetting(name: AnnotationSettingName, value: AnnotationSettingValue) {
    project = updateActiveScene(project, (scene) => ({
      ...scene,
      annotation: {
        ...scene.annotation,
        [name]: value
      }
    }));
  }

  function setExportSetting(name: ExportSettingName, value: number) {
    const ranges: Record<ExportSettingName, [number, number]> = {
      width: [320, 3840],
      height: [240, 2160],
      frameCount: [1, 600],
      fps: [1, 120]
    };
    const [min, max] = ranges[name];
    const nextValue = Math.round(Math.max(min, Math.min(max, value)));

    project = {
      ...project,
      exportSettings: {
        ...project.exportSettings,
        [name]: nextValue
      }
    };
  }

  function setTransparentExport(value: boolean) {
    project = {
      ...project,
      exportSettings: {
        ...project.exportSettings,
        transparentBackground: value
      }
    };
  }

  function setExportResolution(width: number, height: number) {
    project = {
      ...project,
      exportSettings: {
        ...project.exportSettings,
        width,
        height
      }
    };
  }

  function updateExportPreview() {
    if (!mounted || !activeScene) return;

    const previewWidth = 480;
    const previewHeight = Math.max(180, Math.round((previewWidth * exportSettings.height) / exportSettings.width));
    const frameCount = Math.max(1, exportSettings.frameCount);
    const progress = Math.max(0, Math.min(1, currentTime / Math.max(1, activeScene.durationSeconds)));
    const frame = Math.round(progress * (frameCount - 1));

    exportPreviewUrl = render2dFrameDataUrl(
      activeScene,
      frame,
      frameCount,
      previewWidth,
      previewHeight,
      exportSettings.transparentBackground
    );
    exportPreviewFrame = frame + 1;
    exportPreviewSize = `${previewWidth}x${previewHeight}`;
  }

  function scheduleExportPreview() {
    if (!mounted || isPlaying) return;

    if (exportPreviewRequest) {
      cancelAnimationFrame(exportPreviewRequest);
    }

    exportPreviewRequest = requestAnimationFrame(() => {
      exportPreviewRequest = 0;
      updateExportPreview();
    });
  }

  function saveProjectFile() {
    downloadProject(project);
    projectStatus = 'Project file saved';
  }

  function openProjectFile() {
    projectFileInput?.click();
  }

  async function importProjectFile(file: File | undefined) {
    if (!file) return;

    try {
      isPlaying = false;
      currentTime = 0;
      project = await readProjectFromFile(file);
      projectStatus = `Opened ${file.name}`;
    } catch {
      projectStatus = 'Could not open project file';
    } finally {
      if (projectFileInput) {
        projectFileInput.value = '';
      }
    }
  }

  function getActiveCanvas() {
    if (selectedPanel === '2D') return canvas;
    if (selectedPanel === '3D') return threeCanvas;
    return complexCanvas;
  }

  function exportSnapshot() {
    const activeCanvas = getActiveCanvas();
    if (!activeCanvas) {
      exportStatus = 'No active viewport';
      return;
    }

    downloadCanvasPng(activeCanvas, `mathscape-${selectedPanel.toLowerCase()}-${Date.now()}.png`);
    exportStatus = `${selectedPanel} PNG saved`;
  }

  async function exportPngSequence() {
    isPlaying = false;
    if (selectedPanel === '3D') {
      await export3dPngSequence();
      return;
    }

    exportStatus = `Exporting ${exportSettings.frameCount} PNG frames`;

    if (selectedPanel === 'Complex') {
      await downloadComplexSequence(activeScene, exportSettings.frameCount, exportSettings.width, exportSettings.height);
      exportStatus = `${exportSettings.frameCount} Complex PNG frames saved at ${exportSettings.width}x${exportSettings.height}`;
      return;
    }

    await download2dSequence(
      activeScene,
      exportSettings.frameCount,
      exportSettings.width,
      exportSettings.height,
      exportSettings.transparentBackground
    );
    exportStatus = `${exportSettings.frameCount} 2D PNG frames saved at ${exportSettings.width}x${exportSettings.height}`;
  }

  async function export3dPngSequence() {
    if (!threeCanvas) {
      exportStatus = 'No 3D viewport';
      return;
    }

    const frameCount = Math.max(1, exportSettings.frameCount);
    exportStatus = `Exporting ${frameCount} 3D PNG frames`;

    for (let frame = 0; frame < frameCount; frame += 1) {
      currentTime = (activeScene.durationSeconds * frame) / Math.max(1, frameCount - 1);
      await nextRenderFrame();
      await nextRenderFrame();
      await downloadCanvasPngFrame(
        capture3dFrameCanvas(),
        `mathscape-3d-frame-${String(frame + 1).padStart(3, '0')}.png`
      );

      if ((frame + 1) % 4 === 0) {
        exportStatus = `Exported ${frame + 1}/${frameCount} 3D frames`;
      }
    }

    exportStatus = `${frameCount} 3D PNG frames saved from viewport`;
  }

  function nextRenderFrame(): Promise<void> {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
  }

  function exportSvg() {
    isPlaying = false;
    download2dSvg(
      activeScene,
      currentTime,
      exportSettings.width,
      exportSettings.height,
      exportSettings.transparentBackground
    );
    exportStatus = `2D SVG saved at ${exportSettings.width}x${exportSettings.height}`;
  }

  async function exportMp4() {
    isPlaying = false;

    if (!nativeLibraryAvailable) {
      exportStatus = 'MP4 export is available in the Tauri app';
      return;
    }

    if (!(await ffmpegAvailable())) {
      exportStatus = 'FFmpeg is not installed or not in PATH';
      return;
    }

    try {
      const frameCount = exportSettings.frameCount;
      const fps = exportSettings.fps;
      const session = await createVideoExportSession(activeScene.name);
      if (!session) {
        exportStatus = 'Could not create video export session';
        return;
      }

      exportStatus = 'Rendering MP4 frames';
      for (let frame = 0; frame < frameCount; frame += 1) {
        const dataUrl = await renderMp4Frame(frame, frameCount);
        await writeVideoExportFrame(session.directory, frame + 1, dataUrl);

        if ((frame + 1) % 12 === 0) {
          exportStatus = `Rendered ${frame + 1}/${frameCount} frames`;
          await new Promise((resolve) => requestAnimationFrame(resolve));
        }
      }

      exportStatus = 'Encoding MP4 with FFmpeg';
      const result = await encodePngSequenceToMp4(session.frame_pattern, session.output_path, fps);
      exportStatus = result ? `MP4 saved: ${result.output_path}` : 'MP4 export unavailable';
    } catch {
      exportStatus = 'Could not export MP4';
    }
  }

  async function renderMp4Frame(frame: number, frameCount: number): Promise<string> {
    if (selectedPanel === 'Complex') {
      return renderComplexFrameDataUrl(activeScene, frame, frameCount, exportSettings.width, exportSettings.height);
    }

    if (selectedPanel === '3D') {
      if (!threeCanvas) {
        throw new Error('No 3D viewport');
      }
      currentTime = (activeScene.durationSeconds * frame) / Math.max(1, frameCount - 1);
      await nextRenderFrame();
      await nextRenderFrame();
      return capture3dFrameCanvas().toDataURL('image/png');
    }

    return render2dFrameDataUrl(
      activeScene,
      frame,
      frameCount,
      exportSettings.width,
      exportSettings.height,
      exportSettings.transparentBackground
    );
  }

  function capture3dFrameCanvas(): HTMLCanvasElement {
    if (!threeCanvas) {
      throw new Error('No 3D viewport');
    }

    const captureCanvas = document.createElement('canvas');
    captureCanvas.width = exportSettings.width;
    captureCanvas.height = exportSettings.height;
    const context = captureCanvas.getContext('2d');
    if (!context) {
      throw new Error('Could not capture 3D viewport');
    }

    context.drawImage(threeCanvas, 0, 0, captureCanvas.width, captureCanvas.height);
    return captureCanvas;
  }

  function togglePlayback() {
    isPlaying = !isPlaying;
    lastFrameTime = performance.now();
  }

  function seek(value: number) {
    currentTime = value;
    isPlaying = false;
  }

  function stepPlayback(now: number) {
    if (isPlaying) {
      const deltaSeconds = Math.min(0.08, (now - lastFrameTime) / 1000);
      currentTime += deltaSeconds;
      if (currentTime >= activeScene.durationSeconds) {
        currentTime = 0;
      }
      lastFrameTime = now;
    } else {
      lastFrameTime = now;
    }

    playbackFrame = requestAnimationFrame(stepPlayback);
  }

  function updatePlot() {
    if (!canvas) return;
    if (activeScene.plotMode === 'vector-field') {
      const parameters = {
        amplitude: renderAmplitude,
        frequency: renderFrequency,
        phase: renderPhase
      };
      drawVectorField(
        canvas,
        sampleVectorField(parameters, 19, 4),
        activeScene.visual,
        {
          trajectory: sampleVectorTrajectory(parameters, 220, 0.035)
        }
      );
      return;
    }
    if (activeScene.plotMode === 'linear-transform') {
      drawLinearTransform(
        canvas,
        sampleLinearTransform({ amplitude: renderAmplitude, frequency: renderFrequency, phase: renderPhase }),
        activeScene.visual
      );
      return;
    }
    if (activeScene.plotMode === 'parametric') {
      drawPlot(canvas, sampleParametricCurve({ amplitude: renderAmplitude, frequency: renderFrequency, phase: renderPhase }, 720), activeScene.visual, {
        annotation: {
          ...activeScene.annotation,
          showTracePoint: false
        }
      });
      return;
    }

    const fn = createPlotFunction(
      activeScene.plotMode,
      {
        amplitude: renderAmplitude,
        frequency: renderFrequency,
        phase: renderPhase
      },
      activeScene.expression
    );
    const points = sampleFunction(fn, -Math.PI * 2, Math.PI * 2, 480);
    drawPlot(canvas, points, activeScene.visual, {
      annotation: activeScene.annotation,
      fn,
      progress: currentTime / Math.max(1, activeScene.durationSeconds)
    });
  }

  $: renderAmplitude,
    renderFrequency,
    renderPhase,
    currentTime,
    activeScene.plotMode,
    activeScene.expression,
    activeScene.visual,
    activeScene.annotation,
    updatePlot();
  $: if (mounted) {
    saveProject(project);
  }

  $: activeScene, currentTime, exportSettings, isPlaying, mounted, scheduleExportPreview();

  onMount(() => {
    project = loadProject();
    nativeLibraryAvailable = isNativeRuntime();
    mounted = true;
    updatePlot();
    void refreshProjectLibrary();
    const resizeObserver = new ResizeObserver(updatePlot);
    if (canvas) {
      resizeObserver.observe(canvas);
    }
    playbackFrame = requestAnimationFrame(stepPlayback);

    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(playbackFrame);
    };
  });
</script>

<svelte:head>
  <title>Mathscape</title>
</svelte:head>

<main class="workspace">
  <aside class="rail" aria-label="Workspace tools">
    <button aria-label="Select pointer tool" class="tool active">P</button>
    <button aria-label="Add formula" class="tool">F</button>
    <button aria-label="Add graph" class="tool">G</button>
    <button aria-label="Add keyframe" class="tool">K</button>
  </aside>

  <section class="left-panel" aria-label="Scene and formulas">
    <div class="app-title">
      <span>Mathscape</span>
      <small>{project.title}</small>
    </div>
    <div class="project-actions">
      <button on:click={openProjectFile}>Open</button>
      <button on:click={saveProjectFile}>Save</button>
      <button on:click={saveNativeProject}>Library Save</button>
      <button on:click={refreshProjectLibrary}>Refresh</button>
      <input
        bind:this={projectFileInput}
        aria-label="Project file input"
        type="file"
        accept=".mathscape.json,application/json"
        on:change={(event) => importProjectFile(event.currentTarget.files?.[0])}
      />
      <span>{projectStatus}</span>
    </div>

    <div class="section">
      <h2>Project Library</h2>
      <div class="library-list" aria-label="Native project library">
        {#if nativeLibraryAvailable && projectLibrary.length > 0}
          {#each projectLibrary as item}
            <button aria-label={`Open ${item.title} from library`} on:click={() => openNativeProject(item.project_id)}>
              <span>{item.title}</span>
              <small>{new Date(item.updated_at * 1000).toLocaleString()}</small>
            </button>
          {/each}
        {:else}
          <div class="library-empty">
            {nativeLibraryAvailable ? 'No native projects saved yet' : 'Native library available in Tauri'}
          </div>
        {/if}
      </div>
    </div>

    <div class="section">
      <h2>Starter Scenes</h2>
      <div class="template-list" aria-label="Scene templates">
        {#each sceneTemplates as template}
          <button
            class:active={activeScene.id === `scene-${template.id}`}
            aria-label={`Load ${template.name} template`}
            on:click={() => applyTemplate(template.id)}
          >
            <span>{template.name}</span>
            <small>{template.description}</small>
          </button>
        {/each}
      </div>
    </div>

    <div class="section">
      <h2>Formula Stack</h2>
      <div class="formula-card graph-equation-card">
        <div class="formula-card-head">
          <span class="formula-label">Graph equation</span>
          <button class="secondary-action compact-action" aria-label="Load black hole halo 3D equation" on:click={useBlackHoleHaloExpression}>
            Black hole halo
          </button>
        </div>
        <textarea
          class={`formula-input surface-expression-input ${graphEquationStatus.ok ? '' : 'expression-error'}`}
          aria-label="Graph equation"
          rows="3"
          value={graphEquationValue}
          on:input={(event) => setGraphEquation(event.currentTarget.value)}
        ></textarea>
        <span class={`expression-status ${graphEquationStatus.ok ? 'expression-status-ok' : 'expression-status-error'}`}>
          {selectedPanel === '3D' ? `3D surface: ${surfaceExpressionStatus.message}` : `2D graph: ${expressionStatus.message}`}
        </span>
        <code>2D: a*cos(b*x+phi). 3D: z(x,y)=A*exp(-((sqrt(x^2+y^2)-R)^2)/(sigma^2))*cos(k*sqrt(x^2+y^2)+phi)-M/sqrt(x^2+y^2+epsilon)</code>
      </div>
      <div class="formula-card">
        <span class="formula-label">Display formula LaTeX</span>
        <FormulaMath latex={activeScene.formulaLatex} displayMode />
        <input
          class="formula-input"
          aria-label="Active formula LaTeX"
          value={activeScene.formulaLatex}
          on:input={(event) => setFormula('formulaLatex', event.currentTarget.value)}
        />
        <code>{activeScene.formulaLatex}</code>
      </div>
      <div class="formula-card muted">
        <span class="formula-label">Next transform</span>
        <FormulaMath latex={activeScene.nextTransformLatex} />
        <input
          class="formula-input"
          aria-label="Next transform LaTeX"
          value={activeScene.nextTransformLatex}
          on:input={(event) => setFormula('nextTransformLatex', event.currentTarget.value)}
        />
        <code>{activeScene.nextTransformLatex}</code>
      </div>
      <div class="formula-card expression-card">
        <span class="formula-label">2D expression</span>
        <input
          class={`formula-input ${expressionStatus.ok ? '' : 'expression-error'}`}
          aria-label="2D expression"
          value={activeScene.expression}
          on:input={(event) => setExpression(event.currentTarget.value)}
        />
        <span
          class={`expression-status ${expressionStatus.ok ? 'expression-status-ok' : 'expression-status-error'}`}
        >
          {expressionStatus.message}
        </span>
        <code>{activeScene.plotMode === 'expression' ? 'Custom expression mode' : `Template mode: ${activeScene.plotMode}`}</code>
      </div>
      <div class="formula-card expression-card">
        <div class="formula-card-head">
          <span class="formula-label">3D surface z(x,y)</span>
        </div>
        <textarea
          class={`formula-input surface-expression-input ${surfaceExpressionStatus.ok ? '' : 'expression-error'}`}
          aria-label="3D surface expression"
          rows="3"
          value={activeScene.surfaceExpression}
          on:input={(event) => setSurfaceExpression(event.currentTarget.value)}
        ></textarea>
        <span
          class={`expression-status ${surfaceExpressionStatus.ok ? 'expression-status-ok' : 'expression-status-error'}`}
        >
          {surfaceExpressionStatus.message}
        </span>
        <code>Use x, y, r, a/A, b/k, phi, R, sigma, M, epsilon</code>
      </div>
    </div>

    <div class="section">
      <h2>Solution Steps</h2>
      <div class="derivation-list" aria-label="Timed solution steps">
        {#each activeScene.derivationSteps as step}
          <button
            class:active={activeDerivationStep?.id === step.id}
            aria-label={`Jump to solution step ${step.label}`}
            on:click={() => seek(step.timeSeconds)}
          >
            <span>{step.label}</span>
            <small>{step.timeSeconds.toFixed(1)}s</small>
            <FormulaMath latex={step.latex} />
            <em>{step.note}</em>
          </button>
        {/each}
      </div>
      <div class="step-editor-list" aria-label="Solution step editor">
        {#each activeScene.derivationSteps as step}
          <div class="step-editor-card">
            <div class="step-editor-head">
              <input
                aria-label={`Solution step ${step.label} label`}
                value={step.label}
                on:input={(event) => setDerivationStepField(step.id, 'label', event.currentTarget.value)}
              />
              <input
                aria-label={`Solution step ${step.label} time`}
                type="number"
                min="0"
                max={activeScene.durationSeconds}
                step="0.1"
                value={step.timeSeconds}
                on:input={(event) => setDerivationStepTime(step.id, Number(event.currentTarget.value))}
              />
              <button
                class="danger-action"
                aria-label={`Delete solution step ${step.label}`}
                disabled={activeScene.derivationSteps.length <= 1}
                on:click={() => deleteDerivationStep(step.id)}
              >
                Delete
              </button>
            </div>
            <input
              aria-label={`Solution step ${step.label} LaTeX`}
              value={step.latex}
              on:input={(event) => setDerivationStepField(step.id, 'latex', event.currentTarget.value)}
            />
            <textarea
              aria-label={`Solution step ${step.label} note`}
              rows="2"
              value={step.note}
              on:input={(event) => setDerivationStepField(step.id, 'note', event.currentTarget.value)}
            ></textarea>
          </div>
        {/each}
      </div>
      <button class="secondary-action" aria-label="Add solution step" on:click={addDerivationStep}>Add step</button>
    </div>

    <div class="section">
      <h2>Parameters</h2>
      <label>
        <span>a</span>
        <input
          type="range"
          min="0.2"
          max="3"
          step="0.05"
          value={amplitude}
          on:input={(event) => setParameter('amplitude', Number(event.currentTarget.value))}
        />
        <output>{amplitude.toFixed(2)}</output>
      </label>
      <label>
        <span>b</span>
        <input
          type="range"
          min="0.2"
          max="5"
          step="0.05"
          value={frequency}
          on:input={(event) => setParameter('frequency', Number(event.currentTarget.value))}
        />
        <output>{frequency.toFixed(2)}</output>
      </label>
      <label>
        <span>phi</span>
        <input
          type="range"
          min="-3.14"
          max="3.14"
          step="0.01"
          value={phase}
          on:input={(event) => setParameter('phase', Number(event.currentTarget.value))}
        />
        <output>{phase.toFixed(2)}</output>
      </label>
      <button class="secondary-action" on:click={resetProject}>Reset scene</button>
    </div>
  </section>

  <section class="stage" aria-label="Visualization stage">
    <header class="stage-header">
      <div class="tabs" role="tablist" aria-label="Visualization mode">
        {#each ['2D', '3D', 'Complex'] as tab}
          <button class:active={selectedPanel === tab} on:click={() => (selectedPanel = tab)}>{tab}</button>
        {/each}
      </div>
      <div class="export-actions">
        <button>Preview</button>
        <button class="primary" on:click={exportSnapshot}>Export</button>
      </div>
    </header>

    <div class="viewport">
      {#if selectedPanel === '2D'}
        <canvas bind:this={canvas} aria-label="2D sine graph preview"></canvas>
      {:else if selectedPanel === '3D'}
        <ThreeSurface
          amplitude={renderAmplitude}
          frequency={renderFrequency}
          phase={renderPhase}
          surfaceExpression={activeScene.surfaceExpression}
          visual={activeScene.visual}
          {cameraPose}
          on:ready={(event) => (threeCanvas = event.detail)}
        />
      {:else}
        <ComplexDomain
          amplitude={renderAmplitude}
          frequency={renderFrequency}
          phase={renderPhase}
          mode={activeScene.complexMode}
          on:ready={(event) => (complexCanvas = event.detail)}
        />
      {/if}
      {#if activeScene.overlay.enabled}
        <div class="stage-overlay" aria-label="Presentation overlay">
          {#if activeScene.overlay.showFormula}
            <div
              class={`overlay-card formula-overlay ${overlayClass(activeScene.overlay.formulaPosition)}`}
              style={`--overlay-scale: ${activeScene.overlay.cardScale}`}
            >
              <span>{activeScene.name}</span>
              <FormulaMath latex={activeScene.formulaLatex} />
            </div>
          {/if}
          {#if activeScene.overlay.showDerivation && activeDerivationStep}
            <div
              class={`overlay-card derivation-overlay ${overlayClass(activeScene.overlay.derivationPosition)}`}
              style={`--overlay-scale: ${activeScene.overlay.cardScale}`}
            >
              <strong>{activeDerivationStep.label}</strong>
              <FormulaMath latex={activeDerivationStep.latex} />
              <em>{activeDerivationStep.note}</em>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </section>

  <aside class="right-panel" aria-label="Inspector">
    <div class="section">
      <h2>Inspector</h2>
      <div class="mode-row" aria-label="Complex function presets">
        <button class:active={activeScene.complexMode === 'quadratic'} on:click={() => setComplexMode('quadratic')}>
          z^2
        </button>
        <button class:active={activeScene.complexMode === 'zeta'} on:click={() => setComplexMode('zeta')}>
          Zeta
        </button>
      </div>
      <label>
        <span>Color map</span>
        <select
          aria-label="2D color map"
          value={activeScene.visual.colorMap}
          on:change={(event) => setVisualSetting('colorMap', event.currentTarget.value as ColorMap)}
        >
          <option value="studio-blue">Studio blue</option>
          <option value="fireline">Fireline</option>
          <option value="viridis">Viridis</option>
        </select>
      </label>
      <label>
        <span>Line weight</span>
        <input
          aria-label="2D line weight"
          type="number"
          min="1"
          max="12"
          step="0.5"
          value={activeScene.visual.lineWeight}
          on:input={(event) => setVisualSetting('lineWeight', Number(event.currentTarget.value))}
        />
      </label>
      <label class="check">
        <input
          aria-label="Show 2D axes"
          type="checkbox"
          checked={activeScene.visual.showAxes}
          on:change={(event) => setVisualSetting('showAxes', event.currentTarget.checked)}
        />
        <span>Show axes</span>
      </label>
      <label class="check">
        <input
          aria-label="Show 2D trace point"
          type="checkbox"
          checked={activeScene.annotation.showTracePoint}
          on:change={(event) => setAnnotationSetting('showTracePoint', event.currentTarget.checked)}
        />
        <span>Trace point</span>
      </label>
      <label class="check">
        <input
          aria-label="Animate 2D trace point"
          type="checkbox"
          checked={activeScene.annotation.animateTracePoint}
          on:change={(event) => setAnnotationSetting('animateTracePoint', event.currentTarget.checked)}
        />
        <span>Trace motion</span>
      </label>
      <label>
        <span>Trace x</span>
        <input
          aria-label="2D trace x"
          type="number"
          min="-6.28"
          max="6.28"
          step="0.1"
          value={activeScene.annotation.traceX}
          on:input={(event) => setAnnotationSetting('traceX', Number(event.currentTarget.value))}
        />
      </label>
      <label class="check">
        <input
          aria-label="Show 2D tangent"
          type="checkbox"
          checked={activeScene.annotation.showTangent}
          on:change={(event) => setAnnotationSetting('showTangent', event.currentTarget.checked)}
        />
        <span>Tangent</span>
      </label>
      <label>
        <span>3D mode</span>
        <select
          aria-label="3D render mode"
          value={activeScene.visual.threeMode}
          on:change={(event) => setVisualSetting('threeMode', event.currentTarget.value as ThreeRenderMode)}
        >
          <option value="surface">Surface</option>
          <option value="curve">Curve</option>
        </select>
      </label>
      <label>
        <span>3D style</span>
        <select
          aria-label="3D surface style"
          value={activeScene.visual.surfaceStyle}
          on:change={(event) => setVisualSetting('surfaceStyle', event.currentTarget.value as SurfaceStyle)}
        >
          <option value="smooth">Smooth</option>
          <option value="wireframe">Wireframe</option>
        </select>
      </label>
      <label>
        <span>Orbit speed</span>
        <input
          aria-label="3D rotation speed"
          type="number"
          min="0"
          max="0.04"
          step="0.0005"
          value={activeScene.visual.rotationSpeed}
          on:input={(event) => setVisualSetting('rotationSpeed', Number(event.currentTarget.value))}
        />
      </label>
      <label>
        <span>Height scale</span>
        <input
          aria-label="3D height scale"
          type="number"
          min="0.2"
          max="3"
          step="0.1"
          value={activeScene.visual.surfaceHeightScale}
          on:input={(event) => setVisualSetting('surfaceHeightScale', Number(event.currentTarget.value))}
        />
      </label>
      <label>
        <span>Mesh density</span>
        <input
          aria-label="3D mesh density"
          type="number"
          min="24"
          max="160"
          step="8"
          value={activeScene.visual.surfaceResolution}
          on:input={(event) => setVisualSetting('surfaceResolution', Number(event.currentTarget.value))}
        />
      </label>
      <label class="check">
        <input
          aria-label="Show presentation overlay"
          type="checkbox"
          checked={activeScene.overlay.enabled}
          on:change={(event) => setOverlaySetting('enabled', event.currentTarget.checked)}
        />
        <span>Stage overlay</span>
      </label>
      <label class="check">
        <input
          aria-label="Show formula overlay"
          type="checkbox"
          checked={activeScene.overlay.showFormula}
          on:change={(event) => setOverlaySetting('showFormula', event.currentTarget.checked)}
        />
        <span>Formula card</span>
      </label>
      <label class="check">
        <input
          aria-label="Show derivation overlay"
          type="checkbox"
          checked={activeScene.overlay.showDerivation}
          on:change={(event) => setOverlaySetting('showDerivation', event.currentTarget.checked)}
        />
        <span>Step card</span>
      </label>
      <label>
        <span>Formula pos</span>
        <select
          aria-label="Formula overlay position"
          value={activeScene.overlay.formulaPosition}
          on:change={(event) => setOverlaySetting('formulaPosition', event.currentTarget.value as OverlayPosition)}
        >
          <option value="top-left">Top left</option>
          <option value="top-right">Top right</option>
          <option value="bottom-left">Bottom left</option>
          <option value="bottom-right">Bottom right</option>
        </select>
      </label>
      <label>
        <span>Step pos</span>
        <select
          aria-label="Derivation overlay position"
          value={activeScene.overlay.derivationPosition}
          on:change={(event) => setOverlaySetting('derivationPosition', event.currentTarget.value as OverlayPosition)}
        >
          <option value="top-left">Top left</option>
          <option value="top-right">Top right</option>
          <option value="bottom-left">Bottom left</option>
          <option value="bottom-right">Bottom right</option>
        </select>
      </label>
      <label>
        <span>Card scale</span>
        <input
          aria-label="Overlay card scale"
          type="number"
          min="0.7"
          max="1.4"
          step="0.05"
          value={activeScene.overlay.cardScale}
          on:input={(event) => setOverlaySetting('cardScale', Number(event.currentTarget.value))}
        />
      </label>
    </div>

    <div class="section">
      <h2>Timeline Setup</h2>
      <div class="preset-grid" aria-label="Animation presets">
        <button aria-label="Apply explain build resolve animation preset" on:click={() => applyAnimationPreset('explain-build-resolve')}>
          Explain
        </button>
        <button aria-label="Apply pulse and zoom animation preset" on:click={() => applyAnimationPreset('pulse-and-zoom')}>
          Pulse
        </button>
        <button aria-label="Apply slow orbit animation preset" on:click={() => applyAnimationPreset('slow-orbit')}>
          Orbit
        </button>
      </div>
      <label class="key-field">
        <span>Length</span>
        <input
          aria-label="Scene duration seconds"
          type="number"
          min="1"
          max="60"
          step="0.5"
          value={activeScene.durationSeconds}
          on:input={(event) => setSceneDuration(Number(event.currentTarget.value))}
        />
      </label>
      <div class="marker-list" aria-label="Timeline markers editor">
        {#each activeScene.timeline as marker}
          <div class="marker-card">
            <input
              aria-label={`Timeline marker ${marker.label} label`}
              value={marker.label}
              on:input={(event) => setTimelineMarkerLabel(marker.id, event.currentTarget.value)}
            />
            <input
              aria-label={`Timeline marker ${marker.label} time`}
              type="number"
              min="0"
              max={activeScene.durationSeconds}
              step="0.1"
              value={marker.timeSeconds}
              on:input={(event) => setTimelineMarkerTime(marker.id, Number(event.currentTarget.value))}
            />
          </div>
        {/each}
      </div>
      <button class="secondary-action" aria-label="Add timeline marker" on:click={addTimelineMarker}>Add marker</button>
    </div>

    <div class="section">
      <h2>Animation Keys</h2>
      <div class="keyframe-list" aria-label="Parameter keyframes">
        {#each activeScene.parameterKeyframes as keyframe}
          <div class="keyframe-card">
            <div class="keyframe-head">
              <strong>{keyframe.label}</strong>
              <small>{keyframe.timeSeconds.toFixed(2)}s</small>
            </div>
            <label class="key-field">
              <span>Time</span>
              <input
                aria-label={`Keyframe ${keyframe.label} time`}
                type="number"
                min="0"
                max={activeScene.durationSeconds}
                step="0.1"
                value={keyframe.timeSeconds}
                on:input={(event) => setParameterKeyframeTime(keyframe.id, Number(event.currentTarget.value))}
              />
            </label>
            <label class="key-field">
              <span>a</span>
              <input
                aria-label={`Keyframe ${keyframe.label} amplitude`}
                type="number"
                min="0.1"
                max="4"
                step="0.05"
                value={keyframe.parameters.amplitude}
                on:input={(event) =>
                  setParameterKeyframeValue(keyframe.id, 'amplitude', Number(event.currentTarget.value))}
              />
            </label>
            <label class="key-field">
              <span>b</span>
              <input
                aria-label={`Keyframe ${keyframe.label} frequency`}
                type="number"
                min="0.1"
                max="8"
                step="0.05"
                value={keyframe.parameters.frequency}
                on:input={(event) =>
                  setParameterKeyframeValue(keyframe.id, 'frequency', Number(event.currentTarget.value))}
              />
            </label>
            <label class="key-field">
              <span>phi</span>
              <input
                aria-label={`Keyframe ${keyframe.label} phase`}
                type="number"
                min="-6.28"
                max="6.28"
                step="0.01"
                value={keyframe.parameters.phase}
                on:input={(event) => setParameterKeyframeValue(keyframe.id, 'phase', Number(event.currentTarget.value))}
              />
            </label>
            <label class="key-field easing-field">
              <span>Ease</span>
              <select
                aria-label={`Keyframe ${keyframe.label} easing`}
                value={keyframe.easing}
                on:change={(event) =>
                  setParameterKeyframeEasing(
                    keyframe.id,
                    event.currentTarget.value === 'linear' ? 'linear' : 'ease-in-out'
                  )}
              >
                <option value="ease-in-out">Ease in/out</option>
                <option value="linear">Linear</option>
              </select>
            </label>
          </div>
        {/each}
      </div>
      <button class="secondary-action" aria-label="Capture parameter keyframe" on:click={captureParameterKeyframe}>
        Capture current
      </button>
    </div>

    <div class="section">
      <h2>Camera Keys</h2>
      <div class="keyframe-list" aria-label="Camera keyframes">
        {#each activeScene.cameraKeyframes as keyframe}
          <div class="keyframe-card">
            <div class="keyframe-head">
              <strong>{keyframe.label}</strong>
              <small>{keyframe.timeSeconds.toFixed(2)}s</small>
            </div>
            <label class="key-field">
              <span>Time</span>
              <input
                aria-label={`Camera keyframe ${keyframe.label} time`}
                type="number"
                min="0"
                max={activeScene.durationSeconds}
                step="0.1"
                value={keyframe.timeSeconds}
                on:input={(event) => setCameraKeyframeTime(keyframe.id, Number(event.currentTarget.value))}
              />
            </label>
            <label class="key-field">
              <span>FOV</span>
              <input
                aria-label={`Camera keyframe ${keyframe.label} fov`}
                type="number"
                min="18"
                max="80"
                step="1"
                value={keyframe.camera.fovDegrees}
                on:input={(event) => setCameraKeyframeFov(keyframe.id, Number(event.currentTarget.value))}
              />
            </label>
            <div class="vector-grid" aria-label={`Camera keyframe ${keyframe.label} position`}>
              <span>Pos</span>
              {#each [0, 1, 2] as axis}
                <input
                  aria-label={`Camera keyframe ${keyframe.label} position ${axis}`}
                  type="number"
                  min="-12"
                  max="12"
                  step="0.1"
                  value={keyframe.camera.position[axis]}
                  on:input={(event) =>
                    setCameraKeyframeVectorValue(
                      keyframe.id,
                      'position',
                      axis as CameraAxisIndex,
                      Number(event.currentTarget.value)
                    )}
                />
              {/each}
            </div>
            <div class="vector-grid" aria-label={`Camera keyframe ${keyframe.label} target`}>
              <span>Look</span>
              {#each [0, 1, 2] as axis}
                <input
                  aria-label={`Camera keyframe ${keyframe.label} target ${axis}`}
                  type="number"
                  min="-4"
                  max="4"
                  step="0.1"
                  value={keyframe.camera.target[axis]}
                  on:input={(event) =>
                    setCameraKeyframeVectorValue(
                      keyframe.id,
                      'target',
                      axis as CameraAxisIndex,
                      Number(event.currentTarget.value)
                    )}
                />
              {/each}
            </div>
            <label class="key-field easing-field">
              <span>Ease</span>
              <select
                aria-label={`Camera keyframe ${keyframe.label} easing`}
                value={keyframe.easing}
                on:change={(event) =>
                  setCameraKeyframeEasing(
                    keyframe.id,
                    event.currentTarget.value === 'linear' ? 'linear' : 'ease-in-out'
                  )}
              >
                <option value="ease-in-out">Ease in/out</option>
                <option value="linear">Linear</option>
              </select>
            </label>
          </div>
        {/each}
      </div>
      <button class="secondary-action" aria-label="Capture camera keyframe" on:click={captureCameraKeyframe}>
        Capture camera
      </button>
    </div>

    <div class="section">
      <h2>Export Preset</h2>
      <div class="preset-grid">
        <button on:click={() => setExportResolution(1920, 1080)}>1080p</button>
        <button on:click={() => setExportResolution(3840, 2160)}>4K</button>
        <button>GIF</button>
        <button on:click={exportSvg}>SVG</button>
        <button on:click={exportPngSequence}>PNG Seq</button>
        <button on:click={exportMp4}>MP4</button>
      </div>
      <div class="export-grid" aria-label="Export settings">
        <label>
          <span>W</span>
          <input
            aria-label="Export width"
            type="number"
            min="320"
            max="3840"
            step="1"
            value={exportSettings.width}
            on:input={(event) => setExportSetting('width', Number(event.currentTarget.value))}
          />
        </label>
        <label>
          <span>H</span>
          <input
            aria-label="Export height"
            type="number"
            min="240"
            max="2160"
            step="1"
            value={exportSettings.height}
            on:input={(event) => setExportSetting('height', Number(event.currentTarget.value))}
          />
        </label>
        <label>
          <span>Frames</span>
          <input
            aria-label="Export frame count"
            type="number"
            min="1"
            max="600"
            step="1"
            value={exportSettings.frameCount}
            on:input={(event) => setExportSetting('frameCount', Number(event.currentTarget.value))}
          />
        </label>
        <label>
          <span>FPS</span>
          <input
            aria-label="Export fps"
            type="number"
            min="1"
            max="120"
            step="1"
            value={exportSettings.fps}
            on:input={(event) => setExportSetting('fps', Number(event.currentTarget.value))}
          />
        </label>
        <label class="toggle-row">
          <span>Alpha</span>
          <input
            aria-label="Transparent export background"
            type="checkbox"
            checked={exportSettings.transparentBackground}
            on:change={(event) => setTransparentExport(event.currentTarget.checked)}
          />
        </label>
      </div>
      <div class="export-preview" aria-label="2D export preview">
        {#if exportPreviewUrl}
          <img src={exportPreviewUrl} alt="2D export frame preview" />
        {/if}
        <div>
          <span>Frame {exportPreviewFrame}/{exportSettings.frameCount}</span>
          <small>{exportPreviewSize} preview of {exportSettings.width}x{exportSettings.height}</small>
        </div>
      </div>
      <div class="export-status">{exportStatus}</div>
    </div>
  </aside>

  <section class="timeline" aria-label="Animation timeline">
    <div class="timeline-controls">
      <button class="play-button" aria-label="Toggle timeline playback" on:click={togglePlayback}>
        {isPlaying ? 'Pause' : 'Play'}
      </button>
      <div>
        <div class="track-title">Timeline</div>
        <div class="time-readout">{currentTime.toFixed(2)}s / {activeScene.durationSeconds.toFixed(2)}s</div>
      </div>
    </div>
    <div class="track-wrap">
      <input
        class="time-slider"
        aria-label="Timeline scrubber"
        type="range"
        min="0"
        max={activeScene.durationSeconds}
        step="0.01"
        value={currentTime}
        on:input={(event) => seek(Number(event.currentTarget.value))}
      />
      <div class="track">
        <i style={`left: ${playheadPercent}%`}></i>
      {#each activeScene.timeline as marker}
        <span style={`left: ${timelinePercent(marker.timeSeconds, activeScene.durationSeconds)}%`} title={marker.label}></span>
      {/each}
      {#each activeScene.parameterKeyframes as keyframe}
        <b
          style={`left: ${timelinePercent(keyframe.timeSeconds, activeScene.durationSeconds)}%`}
          title={keyframe.label}
        ></b>
      {/each}
      {#each activeScene.cameraKeyframes as keyframe}
        <em
          style={`left: ${timelinePercent(keyframe.timeSeconds, activeScene.durationSeconds)}%`}
          title={keyframe.label}
        ></em>
      {/each}
      </div>
    </div>
  </section>
</main>

<style>
  :global(*) {
    box-sizing: border-box;
  }

  :global(body) {
    margin: 0;
    min-width: 960px;
    color: #edf2f4;
    background: #11161d;
    font-family:
      Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  button,
  input,
  select {
    font: inherit;
  }

  button {
    border: 1px solid #334253;
    color: #edf2f4;
    background: #1b2530;
    border-radius: 6px;
    cursor: pointer;
  }

  .workspace {
    display: grid;
    grid-template-columns: 56px 300px minmax(420px, 1fr) 272px;
    grid-template-rows: minmax(0, 1fr) 132px;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
  }

  .rail {
    display: flex;
    grid-row: 1 / 3;
    flex-direction: column;
    gap: 10px;
    align-items: center;
    padding: 14px 8px;
    background: #0b0f14;
    border-right: 1px solid #26313c;
  }

  .tool {
    width: 38px;
    height: 38px;
    font-weight: 700;
  }

  .tool.active {
    color: #0b0f14;
    background: #e9c46a;
    border-color: #e9c46a;
  }

  .left-panel,
  .right-panel {
    min-width: 0;
    padding: 18px;
    background: #151b22;
    border-right: 1px solid #26313c;
    overflow: auto;
  }

  .right-panel {
    border-right: 0;
    border-left: 1px solid #26313c;
  }

  .app-title {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-bottom: 12px;
    font-weight: 800;
  }

  .app-title small,
  .formula-label,
  .project-actions span,
  .export-status {
    color: #aab7c4;
    font-size: 13px;
    font-weight: 500;
  }

  .project-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 24px;
  }

  .project-actions button {
    min-height: 32px;
  }

  .project-actions input {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
    pointer-events: none;
  }

  .project-actions span {
    grid-column: 1 / -1;
    min-height: 18px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .section {
    display: grid;
    gap: 12px;
    margin-bottom: 28px;
  }

  .template-list {
    display: grid;
    gap: 8px;
  }

  .derivation-list {
    display: grid;
    gap: 8px;
  }

  .derivation-list button {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 6px 10px;
    min-height: 86px;
    padding: 10px;
    text-align: left;
    background: #18212a;
  }

  .derivation-list button.active {
    color: #0b0f14;
    background: #e9c46a;
    border-color: #e9c46a;
  }

  .derivation-list button span {
    font-weight: 800;
  }

  .derivation-list button small {
    color: inherit;
    font-size: 12px;
    opacity: 0.7;
  }

  .derivation-list :global(.katex-display),
  .derivation-list :global(.katex) {
    grid-column: 1 / -1;
    max-width: 100%;
    overflow: hidden;
    font-size: 0.95em;
  }

  .derivation-list em {
    grid-column: 1 / -1;
    color: inherit;
    font-size: 12px;
    font-style: normal;
    line-height: 1.35;
    opacity: 0.76;
  }

  .step-editor-list {
    display: grid;
    gap: 8px;
  }

  .step-editor-card {
    display: grid;
    gap: 7px;
    padding: 10px;
    background: #101820;
    border: 1px solid #334253;
    border-radius: 8px;
  }

  .step-editor-head {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 72px 70px;
    gap: 7px;
  }

  .step-editor-card input,
  .step-editor-card textarea {
    min-width: 0;
    padding: 7px 8px;
    color: #edf2f4;
    background: #0f1419;
    border: 1px solid #334253;
    border-radius: 6px;
    font-size: 12px;
  }

  .step-editor-card textarea {
    min-height: 54px;
    line-height: 1.35;
    resize: vertical;
  }

  .danger-action {
    min-height: 32px;
    padding: 0 10px;
    color: #ffddd2;
    background: #3b1f26;
    border-color: #8d3f4d;
    font-size: 12px;
  }

  .danger-action:disabled {
    cursor: not-allowed;
    color: #6f7d8a;
    background: #161f28;
    border-color: #2b3948;
  }

  .template-list button,
  .library-list button {
    display: grid;
    gap: 4px;
    min-height: 58px;
    padding: 10px;
    text-align: left;
    background: #1b242d;
  }

  .template-list button.active {
    color: #0b0f14;
    background: #7cc7d8;
    border-color: #7cc7d8;
  }

  .template-list button span {
    font-weight: 800;
  }

  .template-list button small {
    color: inherit;
    font-size: 12px;
    line-height: 1.35;
    opacity: 0.78;
  }

  .library-list {
    display: grid;
    gap: 8px;
  }

  .library-list button span {
    overflow: hidden;
    font-weight: 800;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .library-list button small,
  .library-empty {
    color: #aab7c4;
    font-size: 12px;
  }

  .library-empty {
    padding: 10px;
    background: #10151b;
    border: 1px dashed #334253;
    border-radius: 8px;
  }

  h2 {
    margin: 0;
    color: #c9d6df;
    font-size: 13px;
    letter-spacing: 0;
    text-transform: uppercase;
  }

  .formula-card {
    display: grid;
    gap: 7px;
    padding: 12px;
    background: #202a34;
    border: 1px solid #354555;
    border-radius: 8px;
  }

  .formula-card.muted {
    opacity: 0.76;
  }

  .formula-card-head {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px;
    align-items: center;
  }

  code {
    color: #f4d35e;
    white-space: normal;
  }

  .formula-input {
    min-height: 32px;
    padding: 7px 9px;
    color: #edf2f4;
    background: #10151b;
    border: 1px solid #334253;
    border-radius: 6px;
  }

  .surface-expression-input {
    min-height: 72px;
    line-height: 1.35;
    resize: vertical;
  }

  .expression-error {
    border-color: #e76f51;
    box-shadow: 0 0 0 1px rgb(231 111 81 / 34%);
  }

  .expression-status {
    min-height: 17px;
    overflow: hidden;
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .expression-status-ok {
    color: #7cc7d8;
  }

  .expression-status-error {
    color: #f4a261;
  }

  label {
    display: grid;
    grid-template-columns: 34px 1fr 54px;
    gap: 10px;
    align-items: center;
    color: #d8e0e7;
  }

  label:has(select),
  label:has(input[type='number']) {
    grid-template-columns: 1fr;
  }

  input,
  select {
    width: 100%;
    min-width: 0;
  }

  input[type='range'] {
    accent-color: #8fbce6;
  }

  input[type='number'],
  select {
    padding: 8px 10px;
    color: #edf2f4;
    background: #0f1419;
    border: 1px solid #334253;
    border-radius: 6px;
  }

  output {
    color: #aab7c4;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  .stage {
    display: grid;
    grid-template-rows: 56px minmax(0, 1fr);
    min-width: 0;
    background: #11161d;
  }

  .stage-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    border-bottom: 1px solid #26313c;
  }

  .tabs,
  .export-actions,
  .preset-grid,
  .mode-row {
    display: flex;
    gap: 8px;
  }

  .tabs button,
  .export-actions button,
  .preset-grid button {
    min-height: 34px;
    padding: 0 12px;
  }

  .tabs button.active,
  button.primary,
  .mode-row button.active {
    color: #0b0f14;
    background: #8fbce6;
    border-color: #8fbce6;
  }

  .secondary-action {
    min-height: 34px;
  }

  .compact-action {
    min-height: 30px;
    padding: 0 10px;
    font-size: 12px;
    white-space: nowrap;
  }

  .viewport {
    position: relative;
    min-height: 0;
    padding: 18px;
  }

  .stage-overlay {
    position: absolute;
    inset: 34px 34px;
    pointer-events: none;
  }

  .overlay-card {
    position: absolute;
    width: min(calc(560px * var(--overlay-scale, 1)), calc(64% * var(--overlay-scale, 1)));
    max-width: calc(100% - 16px);
    padding: calc(12px * var(--overlay-scale, 1)) calc(14px * var(--overlay-scale, 1));
    color: #edf2f4;
    background: rgb(12 17 22 / 86%);
    border: 1px solid rgb(143 188 230 / 62%);
    border-radius: 8px;
    font-size: calc(16px * var(--overlay-scale, 1));
    box-shadow: 0 14px 36px rgb(0 0 0 / 24%);
  }

  .overlay-top-left {
    top: 0;
    left: 0;
  }

  .overlay-top-right {
    top: 0;
    right: 0;
  }

  .overlay-bottom-left {
    bottom: 0;
    left: 0;
  }

  .overlay-bottom-right {
    right: 0;
    bottom: 0;
  }

  .overlay-card span,
  .overlay-card strong {
    display: block;
    margin-bottom: calc(6px * var(--overlay-scale, 1));
    color: #e9c46a;
    font-size: calc(12px * var(--overlay-scale, 1));
    letter-spacing: 0;
    text-transform: uppercase;
  }

  .overlay-card em {
    display: block;
    margin-top: calc(6px * var(--overlay-scale, 1));
    color: #c9d6df;
    font-size: calc(13px * var(--overlay-scale, 1));
    font-style: normal;
  }

  .overlay-card :global(.katex) {
    max-width: 100%;
    overflow: hidden;
    font-size: 1.05em;
  }

  canvas {
    width: 100%;
    height: 100%;
    min-height: 320px;
    border: 1px solid #2d3a47;
    border-radius: 8px;
  }

  .check {
    grid-template-columns: 16px 1fr;
  }

  .keyframe-list {
    display: grid;
    gap: 10px;
  }

  .marker-list {
    display: grid;
    gap: 8px;
  }

  .marker-card {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 72px;
    gap: 7px;
    padding: 8px;
    background: #18212a;
    border: 1px solid #334253;
    border-radius: 8px;
  }

  .marker-card input {
    min-height: 30px;
    padding: 5px 7px;
    color: #edf2f4;
    background: #0f1419;
    border: 1px solid #334253;
    border-radius: 6px;
    font-size: 12px;
  }

  .keyframe-card {
    display: grid;
    gap: 8px;
    padding: 10px;
    background: #18212a;
    border: 1px solid #334253;
    border-radius: 8px;
  }

  .keyframe-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .keyframe-head strong {
    min-width: 0;
    overflow: hidden;
    color: #edf2f4;
    font-size: 13px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .keyframe-head small {
    color: #aab7c4;
    font-size: 12px;
    font-variant-numeric: tabular-nums;
  }

  .key-field {
    grid-template-columns: 42px minmax(0, 1fr);
    gap: 8px;
    color: #c9d6df;
    font-size: 12px;
  }

  .key-field input,
  .key-field select {
    min-height: 30px;
    padding: 5px 7px;
    font-size: 12px;
  }

  .easing-field {
    grid-template-columns: 42px minmax(0, 1fr);
  }

  .vector-grid {
    display: grid;
    grid-template-columns: 42px repeat(3, minmax(0, 1fr));
    gap: 6px;
    align-items: center;
    color: #c9d6df;
    font-size: 12px;
  }

  .vector-grid input {
    min-height: 30px;
    padding: 5px 6px;
    font-size: 12px;
  }

  .preset-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .export-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .export-grid label {
    grid-template-columns: 1fr;
    gap: 5px;
    color: #aab7c4;
    font-size: 12px;
  }

  .export-grid input {
    min-height: 30px;
    padding: 5px 7px;
    font-size: 12px;
  }

  .export-preview {
    display: grid;
    gap: 7px;
    padding: 8px;
    background: #101820;
    border: 1px solid #334253;
    border-radius: 8px;
  }

  .export-preview img {
    display: block;
    width: 100%;
    aspect-ratio: 16 / 9;
    object-fit: contain;
    background: #0f1419;
    border: 1px solid #26313c;
    border-radius: 6px;
  }

  .export-preview div {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    color: #c9d6df;
    font-size: 12px;
  }

  .export-preview small {
    color: #aab7c4;
    text-align: right;
  }

  .export-status {
    min-height: 18px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .timeline {
    display: grid;
    grid-column: 2 / 5;
    grid-template-columns: 180px minmax(0, 1fr);
    gap: 16px;
    align-items: center;
    padding: 18px;
    background: #10151b;
    border-top: 1px solid #26313c;
  }

  .timeline-controls {
    display: grid;
    grid-template-columns: 74px 1fr;
    gap: 12px;
    align-items: center;
  }

  .play-button {
    height: 38px;
    color: #0b0f14;
    background: #e9c46a;
    border-color: #e9c46a;
    font-weight: 800;
  }

  .track-title {
    color: #c9d6df;
    font-weight: 700;
  }

  .time-readout {
    margin-top: 3px;
    color: #aab7c4;
    font-size: 12px;
    font-variant-numeric: tabular-nums;
  }

  .track-wrap {
    display: grid;
    gap: 8px;
  }

  .time-slider {
    height: 12px;
  }

  .track {
    position: relative;
    height: 42px;
    background: #1a232d;
    border: 1px solid #334253;
    border-radius: 8px;
  }

  .track i,
  .track b,
  .track em,
  .track::before {
    position: absolute;
  }

  .track::before {
    top: 50%;
    right: 14px;
    left: 14px;
    height: 2px;
    content: '';
    background: #506172;
  }

  .track i {
    top: 6px;
    bottom: 6px;
    width: 2px;
    content: '';
    background: #edf2f4;
    box-shadow: 0 0 10px rgba(237, 242, 244, 0.7);
    transform: translateX(-50%);
  }

  .track span {
    position: absolute;
    top: 50%;
    width: 12px;
    height: 12px;
    background: #e9c46a;
    border-radius: 50%;
    transform: translate(-50%, -50%);
  }

  .track b {
    top: 50%;
    width: 14px;
    height: 14px;
    background: #8fbce6;
    border: 2px solid #10151b;
    transform: translate(-50%, -50%) rotate(45deg);
  }

  .track em {
    top: 50%;
    width: 16px;
    height: 10px;
    background: #f4a261;
    border: 2px solid #10151b;
    border-radius: 5px;
    transform: translate(-50%, 8px);
  }
</style>

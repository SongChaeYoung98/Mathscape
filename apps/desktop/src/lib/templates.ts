import {
  defaultExportSettings,
  defaultSceneAnnotationSettings,
  defaultSceneOverlaySettings,
  defaultSceneVisualSettings,
  type MathscapeProject,
  type MathscapeScene
} from './project';

export type SceneTemplate = {
  id: string;
  name: string;
  description: string;
  targetPanel: '2D' | '3D' | 'Complex';
  createScene: () => MathscapeScene;
};

function sceneProject(scene: MathscapeScene): MathscapeProject {
  return {
    schemaVersion: 1,
    title: scene.name,
    activeSceneId: scene.id,
    exportSettings: defaultExportSettings,
    scenes: [scene]
  };
}

export const sceneTemplates: SceneTemplate[] = [
  {
    id: 'sine-transform',
    name: 'Sine Transform',
    description: 'Parameter animation for amplitude, frequency, and phase.',
    targetPanel: '2D',
    createScene: () => ({
      id: 'scene-sine-transform',
      name: 'Sine transformation',
      formulaLatex: 'f(x)=a\\sin(bx+\\phi)',
      nextTransformLatex: "f'(x)=ab\\cos(bx+\\phi)",
      expression: 'a*sin(b*x+phi)',
      plotMode: 'sine',
      complexMode: 'quadratic',
      parameters: { amplitude: 1, frequency: 1, phase: 0 },
      visual: defaultSceneVisualSettings,
      annotation: defaultSceneAnnotationSettings,
      overlay: defaultSceneOverlaySettings,
      durationSeconds: 8,
      timeline: [
        { id: 'intro', label: 'Formula', timeSeconds: 0, atPercent: 0 },
        { id: 'modulate', label: 'Modulate', timeSeconds: 3, atPercent: 37.5 },
        { id: 'resolve', label: 'Resolve', timeSeconds: 8, atPercent: 100 }
      ],
      derivationSteps: [
        {
          id: 'sine-define',
          label: 'Define',
          timeSeconds: 0,
          latex: 'f(x)=a\\sin(bx+\\phi)',
          note: 'Start with the expression the viewer can manipulate.'
        },
        {
          id: 'sine-chain',
          label: 'Chain rule',
          timeSeconds: 2.8,
          latex: '\\frac{d}{dx}\\sin(bx+\\phi)=b\\cos(bx+\\phi)',
          note: 'Show how inner frequency changes the derivative.'
        },
        {
          id: 'sine-result',
          label: 'Resolve',
          timeSeconds: 6,
          latex: "f'(x)=ab\\cos(bx+\\phi)",
          note: 'Connect slider changes to the final derivative.'
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
          id: 'cam-detail',
          label: 'Detail pass',
          timeSeconds: 8,
          easing: 'ease-in-out',
          camera: { position: [3.2, 5.4, -5.8], target: [0, 0.1, 0], fovDegrees: 34 }
        }
      ]
    })
  },
  {
    id: 'fourier-build',
    name: 'Fourier Build',
    description: 'A staged series reveal for creator-friendly explainer videos.',
    targetPanel: '2D',
    createScene: () => ({
      id: 'scene-fourier-build',
      name: 'Fourier build-up',
      formulaLatex: 'S_N(x)=\\sum_{n=1}^{N}\\frac{4}{\\pi(2n-1)}\\sin((2n-1)x)',
      nextTransformLatex: '\\lim_{N\\to\\infty}S_N(x)=\\operatorname{square}(x)',
      expression: 'a*sin(b*x+phi)',
      plotMode: 'fourier-square',
      complexMode: 'quadratic',
      parameters: { amplitude: 1.1, frequency: 1, phase: 0 },
      visual: defaultSceneVisualSettings,
      annotation: defaultSceneAnnotationSettings,
      overlay: defaultSceneOverlaySettings,
      durationSeconds: 10,
      timeline: [
        { id: 'term-1', label: '1 term', timeSeconds: 0, atPercent: 0 },
        { id: 'term-3', label: '3 terms', timeSeconds: 3.2, atPercent: 32 },
        { id: 'term-9', label: '9 terms', timeSeconds: 7.2, atPercent: 72 },
        { id: 'limit', label: 'Limit', timeSeconds: 10, atPercent: 100 }
      ],
      derivationSteps: [
        {
          id: 'fourier-basis',
          label: 'Basis',
          timeSeconds: 0,
          latex: '\\sin x,\\ \\sin 3x,\\ \\sin 5x,\\ldots',
          note: 'Introduce odd harmonics as reusable visual layers.'
        },
        {
          id: 'fourier-partial',
          label: 'Partial sum',
          timeSeconds: 3.2,
          latex: 'S_N(x)=\\sum_{n=1}^{N}\\frac{4}{\\pi(2n-1)}\\sin((2n-1)x)',
          note: 'Scrub the timeline to show terms sharpening the curve.'
        },
        {
          id: 'fourier-limit',
          label: 'Limit',
          timeSeconds: 7.2,
          latex: '\\lim_{N\\to\\infty}S_N(x)=\\operatorname{square}(x)',
          note: 'Resolve the construction into the target waveform.'
        }
      ],
      parameterKeyframes: [
        {
          id: 'fourier-start',
          label: 'Fundamental',
          timeSeconds: 0,
          easing: 'linear',
          parameters: { amplitude: 0.85, frequency: 1, phase: 0 }
        },
        {
          id: 'fourier-mid',
          label: 'Harmonics enter',
          timeSeconds: 3.2,
          easing: 'ease-in-out',
          parameters: { amplitude: 1.3, frequency: 2.2, phase: 0.35 }
        },
        {
          id: 'fourier-end',
          label: 'Sharper edges',
          timeSeconds: 10,
          easing: 'ease-in-out',
          parameters: { amplitude: 1.8, frequency: 4.1, phase: -0.2 }
        }
      ],
      cameraKeyframes: [
        {
          id: 'fourier-cam-a',
          label: 'Board view',
          timeSeconds: 0,
          easing: 'ease-in-out',
          camera: { position: [5.6, 3.8, 6.2], target: [0, 0, 0], fovDegrees: 44 }
        },
        {
          id: 'fourier-cam-b',
          label: 'Graph detail',
          timeSeconds: 10,
          easing: 'ease-in-out',
          camera: { position: [-3.8, 4.6, 4.8], target: [0, 0.1, 0], fovDegrees: 35 }
        }
      ]
    })
  },
  {
    id: 'riemann-zeta',
    name: 'Zeta Critical Line',
    description: 'Domain coloring around s = 1/2 + it.',
    targetPanel: 'Complex',
    createScene: () => ({
      id: 'scene-riemann-zeta',
      name: 'Riemann zeta critical line',
      formulaLatex: '\\zeta(s),\\quad s=\\frac{1}{2}+it',
      nextTransformLatex: '\\eta(s)=\\sum_{n=1}^{N}(-1)^{n-1}n^{-s},\\quad \\zeta(s)=\\eta(s)/(1-2^{1-s})',
      expression: 'a*sin(b*x+phi)',
      plotMode: 'sine',
      complexMode: 'zeta',
      parameters: { amplitude: 1.2, frequency: 1.4, phase: 0.6 },
      visual: defaultSceneVisualSettings,
      annotation: defaultSceneAnnotationSettings,
      overlay: defaultSceneOverlaySettings,
      durationSeconds: 9,
      timeline: [
        { id: 'zeta-plane', label: 'Plane', timeSeconds: 0, atPercent: 0 },
        { id: 'zeta-line', label: 'Critical line', timeSeconds: 4.5, atPercent: 50 },
        { id: 'zeta-zeros', label: 'Zero search', timeSeconds: 9, atPercent: 100 }
      ],
      derivationSteps: [
        {
          id: 'zeta-domain',
          label: 'Complex input',
          timeSeconds: 0,
          latex: 's=\\sigma+it',
          note: 'Frame the visualization as movement over the complex plane.'
        },
        {
          id: 'zeta-critical',
          label: 'Critical line',
          timeSeconds: 4.5,
          latex: 's=\\frac{1}{2}+it',
          note: 'Highlight the line used in the Riemann hypothesis.'
        },
        {
          id: 'zeta-eta',
          label: 'Eta approximation',
          timeSeconds: 6.5,
          latex: '\\zeta(s)=\\frac{\\eta(s)}{1-2^{1-s}}',
          note: 'Use the eta-series approximation for the demo renderer.'
        }
      ],
      parameterKeyframes: [
        {
          id: 'zeta-start',
          label: 'Wide domain',
          timeSeconds: 0,
          easing: 'ease-in-out',
          parameters: { amplitude: 0.9, frequency: 0.9, phase: 0 }
        },
        {
          id: 'zeta-scan',
          label: 'Scan',
          timeSeconds: 4.5,
          easing: 'ease-in-out',
          parameters: { amplitude: 1.6, frequency: 1.9, phase: 1.2 }
        },
        {
          id: 'zeta-focus',
          label: 'Focus',
          timeSeconds: 9,
          easing: 'ease-in-out',
          parameters: { amplitude: 1.2, frequency: 2.8, phase: 2.4 }
        }
      ],
      cameraKeyframes: [
        {
          id: 'zeta-cam-a',
          label: 'Neutral',
          timeSeconds: 0,
          easing: 'ease-in-out',
          camera: { position: [5.8, 4.2, 6.4], target: [0, 0, 0], fovDegrees: 45 }
        },
        {
          id: 'zeta-cam-b',
          label: 'Sweep',
          timeSeconds: 9,
          easing: 'ease-in-out',
          camera: { position: [2.6, 5.4, -6.2], target: [0, 0, 0], fovDegrees: 34 }
        }
      ]
    })
  },
  {
    id: 'parametric-orbit',
    name: 'Parametric Orbit',
    description: 'A Lissajous-style parametric curve for periodic motion explainers.',
    targetPanel: '2D',
    createScene: () => ({
      id: 'scene-parametric-orbit',
      name: 'Parametric orbit',
      formulaLatex: '\\gamma(t)=(a\\sin(bt+\\phi),\\ a\\sin((b+1)t))',
      nextTransformLatex: '0\\le t\\le 2\\pi',
      expression: 'x(t)=a*sin(b*t+phi), y(t)=a*sin((b+1)*t)',
      plotMode: 'parametric',
      complexMode: 'quadratic',
      parameters: { amplitude: 1.4, frequency: 2, phase: 0.6 },
      visual: {
        ...defaultSceneVisualSettings,
        colorMap: 'fireline',
        lineWeight: 3.2
      },
      annotation: {
        ...defaultSceneAnnotationSettings,
        showTracePoint: false,
        animateTracePoint: false,
        showTangent: false
      },
      overlay: defaultSceneOverlaySettings,
      durationSeconds: 8,
      timeline: [
        { id: 'orbit-start', label: 'Parametrize', timeSeconds: 0, atPercent: 0 },
        { id: 'orbit-phase', label: 'Phase', timeSeconds: 3.4, atPercent: 42.5 },
        { id: 'orbit-close', label: 'Close curve', timeSeconds: 8, atPercent: 100 }
      ],
      derivationSteps: [
        {
          id: 'orbit-map',
          label: 'Map',
          timeSeconds: 0,
          latex: 't\\mapsto (x(t),y(t))',
          note: 'Use one parameter to draw a plane curve.'
        },
        {
          id: 'orbit-frequency',
          label: 'Frequencies',
          timeSeconds: 3.4,
          latex: 'x=a\\sin(bt+\\phi),\\quad y=a\\sin((b+1)t)',
          note: 'Changing b shifts the ratio between horizontal and vertical motion.'
        },
        {
          id: 'orbit-loop',
          label: 'Loop',
          timeSeconds: 6.4,
          latex: '0\\le t\\le 2\\pi',
          note: 'The full interval closes the animated orbit.'
        }
      ],
      parameterKeyframes: [
        {
          id: 'orbit-open',
          label: 'Open phase',
          timeSeconds: 0,
          easing: 'ease-in-out',
          parameters: { amplitude: 0.9, frequency: 2, phase: 0 }
        },
        {
          id: 'orbit-twist',
          label: 'Twist',
          timeSeconds: 3.4,
          easing: 'ease-in-out',
          parameters: { amplitude: 1.7, frequency: 3, phase: 1.2 }
        },
        {
          id: 'orbit-resolve',
          label: 'Resolve',
          timeSeconds: 8,
          easing: 'ease-in-out',
          parameters: { amplitude: 1.25, frequency: 2, phase: 2.4 }
        }
      ],
      cameraKeyframes: [
        {
          id: 'orbit-cam-a',
          label: 'Wide orbit',
          timeSeconds: 0,
          easing: 'ease-in-out',
          camera: { position: [5.8, 4.2, 6.4], target: [0, 0, 0], fovDegrees: 45 }
        },
        {
          id: 'orbit-cam-b',
          label: 'Detail pass',
          timeSeconds: 8,
          easing: 'ease-in-out',
          camera: { position: [3.2, 5.4, -5.8], target: [0, 0.1, 0], fovDegrees: 34 }
        }
      ]
    })
  },
  {
    id: 'eigen-transform',
    name: 'Eigen Transform',
    description: 'A transformed grid with basis vectors and eigen-direction guides.',
    targetPanel: '2D',
    createScene: () => ({
      id: 'scene-eigen-transform',
      name: 'Eigenvector linear transform',
      formulaLatex: 'A\\mathbf{x}=\\lambda\\mathbf{x}',
      nextTransformLatex: 'T(e_1),\\ T(e_2)\\text{ deform the grid while eigen-directions stay aligned}',
      expression: 'A*x = lambda*x',
      plotMode: 'linear-transform',
      complexMode: 'quadratic',
      parameters: { amplitude: 1.25, frequency: 1.6, phase: 0.25 },
      visual: {
        ...defaultSceneVisualSettings,
        colorMap: 'studio-blue',
        lineWeight: 3.5,
        showAxes: true
      },
      annotation: {
        ...defaultSceneAnnotationSettings,
        showTracePoint: false,
        animateTracePoint: false,
        showTangent: false
      },
      overlay: defaultSceneOverlaySettings,
      durationSeconds: 9,
      timeline: [
        { id: 'eigen-grid', label: 'Grid', timeSeconds: 0, atPercent: 0 },
        { id: 'eigen-basis', label: 'Basis', timeSeconds: 3.2, atPercent: 35.6 },
        { id: 'eigen-lines', label: 'Eigenlines', timeSeconds: 6.4, atPercent: 71.1 },
        { id: 'eigen-resolve', label: 'Resolve', timeSeconds: 9, atPercent: 100 }
      ],
      derivationSteps: [
        {
          id: 'eigen-map',
          label: 'Linear map',
          timeSeconds: 0,
          latex: 'T(\\mathbf{x})=A\\mathbf{x}',
          note: 'Show the whole plane moving as a transformed grid.'
        },
        {
          id: 'eigen-basis-step',
          label: 'Basis images',
          timeSeconds: 3.2,
          latex: 'A=[T(e_1)\\ T(e_2)]',
          note: 'The red and yellow arrows define the transformed coordinate frame.'
        },
        {
          id: 'eigen-direction-step',
          label: 'Eigen direction',
          timeSeconds: 6.4,
          latex: 'A\\mathbf{v}=\\lambda\\mathbf{v}',
          note: 'Dashed guide lines mark directions that keep their orientation.'
        }
      ],
      parameterKeyframes: [
        {
          id: 'eigen-start',
          label: 'Identity-like',
          timeSeconds: 0,
          easing: 'ease-in-out',
          parameters: { amplitude: 0.95, frequency: 1.05, phase: 0 }
        },
        {
          id: 'eigen-shear',
          label: 'Shear and stretch',
          timeSeconds: 3.2,
          easing: 'ease-in-out',
          parameters: { amplitude: 1.7, frequency: 1.9, phase: 0.55 }
        },
        {
          id: 'eigen-resolve-kf',
          label: 'Reveal eigenlines',
          timeSeconds: 9,
          easing: 'ease-in-out',
          parameters: { amplitude: 1.25, frequency: 1.45, phase: 0.25 }
        }
      ],
      cameraKeyframes: [
        {
          id: 'eigen-cam-a',
          label: 'Wide orbit',
          timeSeconds: 0,
          easing: 'ease-in-out',
          camera: { position: [5.8, 4.2, 6.4], target: [0, 0, 0], fovDegrees: 45 }
        },
        {
          id: 'eigen-cam-b',
          label: 'Detail pass',
          timeSeconds: 9,
          easing: 'ease-in-out',
          camera: { position: [3.2, 5.4, -5.8], target: [0, 0.1, 0], fovDegrees: 34 }
        }
      ]
    })
  },
  {
    id: 'phase-portrait',
    name: 'Phase Portrait',
    description: 'A damped oscillator vector field with trajectory tracing.',
    targetPanel: '2D',
    createScene: () => ({
      id: 'scene-phase-portrait',
      name: 'Damped oscillator phase portrait',
      formulaLatex: "\\begin{cases}x'=y\\\\y'=-a\\sin(x)-(b-1)y+\\frac{1}{4}\\sin(\\phi+x)\\end{cases}",
      nextTransformLatex: '\\dot{\\mathbf{x}}=F(x,y),\\quad \\mathbf{x}(t)=(x(t),y(t))',
      expression: "x'=y, y'=-a*sin(x)-(b-1)y",
      plotMode: 'vector-field',
      complexMode: 'quadratic',
      parameters: { amplitude: 1.2, frequency: 1.45, phase: 0.4 },
      visual: {
        ...defaultSceneVisualSettings,
        colorMap: 'viridis',
        lineWeight: 2.2
      },
      annotation: {
        ...defaultSceneAnnotationSettings,
        showTracePoint: false,
        animateTracePoint: false
      },
      overlay: defaultSceneOverlaySettings,
      durationSeconds: 9,
      timeline: [
        { id: 'field-start', label: 'Field', timeSeconds: 0, atPercent: 0 },
        { id: 'damping-rise', label: 'Damping', timeSeconds: 4, atPercent: 44.4 },
        { id: 'settle', label: 'Settle', timeSeconds: 9, atPercent: 100 }
      ],
      derivationSteps: [
        {
          id: 'phase-state',
          label: 'State',
          timeSeconds: 0,
          latex: '\\mathbf{x}(t)=(x(t),y(t))',
          note: 'Represent position and velocity as one point in phase space.'
        },
        {
          id: 'phase-field',
          label: 'Vector field',
          timeSeconds: 3.2,
          latex: "\\dot{\\mathbf{x}}=F(x,y)",
          note: 'Each arrow shows the local direction a trajectory would move.'
        },
        {
          id: 'phase-damping',
          label: 'Damping',
          timeSeconds: 7,
          latex: "y'=-a\\sin(x)-(b-1)y",
          note: 'Increase damping to show flow curling toward stable states.'
        }
      ],
      parameterKeyframes: [
        {
          id: 'phase-soft',
          label: 'Soft field',
          timeSeconds: 0,
          easing: 'ease-in-out',
          parameters: { amplitude: 0.8, frequency: 1.05, phase: 0 }
        },
        {
          id: 'phase-damped',
          label: 'Damped flow',
          timeSeconds: 4,
          easing: 'ease-in-out',
          parameters: { amplitude: 1.7, frequency: 1.9, phase: 1.1 }
        },
        {
          id: 'phase-resolve',
          label: 'Resolve',
          timeSeconds: 9,
          easing: 'ease-in-out',
          parameters: { amplitude: 1.2, frequency: 1.35, phase: 2.4 }
        }
      ],
      cameraKeyframes: [
        {
          id: 'phase-cam-a',
          label: 'Wide orbit',
          timeSeconds: 0,
          easing: 'ease-in-out',
          camera: { position: [5.8, 4.2, 6.4], target: [0, 0, 0], fovDegrees: 45 }
        },
        {
          id: 'phase-cam-b',
          label: 'Detail pass',
          timeSeconds: 9,
          easing: 'ease-in-out',
          camera: { position: [3.2, 5.4, -5.8], target: [0, 0.1, 0], fovDegrees: 34 }
        }
      ]
    })
  },
  {
    id: 'helix-curve',
    name: '3D Helix Curve',
    description: 'A camera-ready space curve for parametric motion and topology explainers.',
    targetPanel: '3D',
    createScene: () => ({
      id: 'scene-helix-curve',
      name: '3D helix curve',
      formulaLatex: '\\gamma(t)=(a\\cos(bt+\\phi),\\ ct,\\ a\\sin(bt+\\phi))',
      nextTransformLatex: '\\gamma^{\\prime}(t)=(-ab\\sin(bt+\\phi),\\ c,\\ ab\\cos(bt+\\phi))',
      expression: 'gamma(t)=(a*cos(b*t+phi), c*t, a*sin(b*t+phi))',
      plotMode: 'parametric',
      complexMode: 'quadratic',
      parameters: { amplitude: 1.35, frequency: 3, phase: 0.4 },
      visual: {
        ...defaultSceneVisualSettings,
        colorMap: 'fireline',
        lineWeight: 4,
        threeMode: 'curve',
        rotationSpeed: 0.004,
        surfaceHeightScale: 1.05,
        surfaceResolution: 120
      },
      annotation: {
        ...defaultSceneAnnotationSettings,
        showTracePoint: false,
        animateTracePoint: false,
        showTangent: false
      },
      overlay: defaultSceneOverlaySettings,
      durationSeconds: 10,
      timeline: [
        { id: 'helix-start', label: 'Parametrize', timeSeconds: 0, atPercent: 0 },
        { id: 'helix-twist', label: 'Twist', timeSeconds: 4, atPercent: 40 },
        { id: 'helix-velocity', label: 'Velocity', timeSeconds: 7.5, atPercent: 75 },
        { id: 'helix-resolve', label: 'Resolve', timeSeconds: 10, atPercent: 100 }
      ],
      derivationSteps: [
        {
          id: 'helix-map',
          label: 'Curve map',
          timeSeconds: 0,
          latex: 't\\mapsto \\gamma(t)\\in\\mathbb{R}^3',
          note: 'Treat one parameter as a path through space.'
        },
        {
          id: 'helix-components',
          label: 'Components',
          timeSeconds: 3.8,
          latex: 'x=a\\cos(bt+\\phi),\\quad z=a\\sin(bt+\\phi)',
          note: 'The x-z components rotate while y advances.'
        },
        {
          id: 'helix-derivative',
          label: 'Velocity',
          timeSeconds: 7.5,
          latex: '\\gamma^{\\prime}(t)=(-ab\\sin(bt+\\phi),\\ c,\\ ab\\cos(bt+\\phi))',
          note: 'The tangent vector explains speed and direction along the curve.'
        }
      ],
      parameterKeyframes: [
        {
          id: 'helix-open',
          label: 'Open spiral',
          timeSeconds: 0,
          easing: 'ease-in-out',
          parameters: { amplitude: 0.9, frequency: 2, phase: 0 }
        },
        {
          id: 'helix-tighten',
          label: 'Tighten turns',
          timeSeconds: 4,
          easing: 'ease-in-out',
          parameters: { amplitude: 1.55, frequency: 4, phase: 1.2 }
        },
        {
          id: 'helix-resolve-kf',
          label: 'Resolve',
          timeSeconds: 10,
          easing: 'ease-in-out',
          parameters: { amplitude: 1.25, frequency: 3, phase: 2.8 }
        }
      ],
      cameraKeyframes: [
        {
          id: 'helix-cam-wide',
          label: 'Wide spiral',
          timeSeconds: 0,
          easing: 'ease-in-out',
          camera: { position: [6.4, 4.9, 6.2], target: [0, 0, 0], fovDegrees: 43 }
        },
        {
          id: 'helix-cam-side',
          label: 'Side sweep',
          timeSeconds: 4,
          easing: 'ease-in-out',
          camera: { position: [-6.2, 2.8, 3.6], target: [0, 0.1, 0], fovDegrees: 36 }
        },
        {
          id: 'helix-cam-detail',
          label: 'Tangent detail',
          timeSeconds: 10,
          easing: 'ease-in-out',
          camera: { position: [2.8, 6.1, -4.8], target: [0, 0.2, 0], fovDegrees: 31 }
        }
      ]
    })
  },
  {
    id: 'surface-ripple',
    name: '3D Surface Ripple',
    description: 'Animated camera pass across a wave surface.',
    targetPanel: '3D',
    createScene: () => ({
      id: 'scene-surface-ripple',
      name: '3D surface ripple',
      formulaLatex: 'z=a\\sin(b\\sqrt{x^2+y^2}+\\phi)',
      nextTransformLatex: '\\nabla z=ab\\cos(br+\\phi)\\left(\\frac{x}{r},\\frac{y}{r}\\right)',
      expression: 'a*sin(b*x+phi)',
      plotMode: 'sine',
      complexMode: 'quadratic',
      parameters: { amplitude: 1.4, frequency: 1.8, phase: 0.25 },
      visual: defaultSceneVisualSettings,
      annotation: defaultSceneAnnotationSettings,
      overlay: defaultSceneOverlaySettings,
      durationSeconds: 11,
      timeline: [
        { id: 'surface-wide', label: 'Wide', timeSeconds: 0, atPercent: 0 },
        { id: 'surface-low', label: 'Low pass', timeSeconds: 4, atPercent: 36.4 },
        { id: 'surface-crest', label: 'Crest', timeSeconds: 8, atPercent: 72.7 },
        { id: 'surface-end', label: 'End', timeSeconds: 11, atPercent: 100 }
      ],
      derivationSteps: [
        {
          id: 'surface-radius',
          label: 'Radius',
          timeSeconds: 0,
          latex: 'r=\\sqrt{x^2+y^2}',
          note: 'Define radial distance before revealing the surface.'
        },
        {
          id: 'surface-height',
          label: 'Height field',
          timeSeconds: 3.6,
          latex: 'z=a\\sin(br+\\phi)',
          note: 'Turn the 2D expression into a 3D height field.'
        },
        {
          id: 'surface-gradient',
          label: 'Gradient',
          timeSeconds: 8,
          latex: '\\nabla z=ab\\cos(br+\\phi)\\left(\\frac{x}{r},\\frac{y}{r}\\right)',
          note: 'Use the camera pass to explain slope direction.'
        }
      ],
      parameterKeyframes: [
        {
          id: 'surface-start',
          label: 'Soft wave',
          timeSeconds: 0,
          easing: 'ease-in-out',
          parameters: { amplitude: 0.8, frequency: 1.1, phase: 0 }
        },
        {
          id: 'surface-crest-kf',
          label: 'Crest build',
          timeSeconds: 5.5,
          easing: 'ease-in-out',
          parameters: { amplitude: 2.2, frequency: 2.7, phase: 1.7 }
        },
        {
          id: 'surface-resolve',
          label: 'Settle',
          timeSeconds: 11,
          easing: 'ease-in-out',
          parameters: { amplitude: 1.25, frequency: 1.5, phase: 3.1 }
        }
      ],
      cameraKeyframes: [
        {
          id: 'surface-cam-wide',
          label: 'Wide orbit',
          timeSeconds: 0,
          easing: 'ease-in-out',
          camera: { position: [6.3, 4.8, 6.7], target: [0, 0, 0], fovDegrees: 45 }
        },
        {
          id: 'surface-cam-low',
          label: 'Low pass',
          timeSeconds: 4,
          easing: 'ease-in-out',
          camera: { position: [-5.4, 2.1, 3.8], target: [0.2, 0, -0.1], fovDegrees: 38 }
        },
        {
          id: 'surface-cam-close',
          label: 'Crest detail',
          timeSeconds: 11,
          easing: 'ease-in-out',
          camera: { position: [2.2, 5.9, -4.8], target: [0, 0.15, 0], fovDegrees: 32 }
        }
      ]
    })
  }
];

export function createProjectFromTemplate(templateId: string): MathscapeProject {
  const template = sceneTemplates.find((item) => item.id === templateId) ?? sceneTemplates[0];
  return sceneProject(template.createScene());
}

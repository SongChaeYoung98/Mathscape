# Mathscape Product Goal

## Product Positioning

Mathscape is a desktop-first advanced math visualization and solution-authoring tool for math educators, YouTubers, tutors, and STEM creators.

The product goal is:

> Desmos-like direct manipulation, Manim-like mathematical animation output, and Mathematica-like mathematical depth, packaged in a friendlier desktop authoring experience.

Mathscape should not be positioned as a generic graphing calculator. It should be positioned as a visual math production tool: users should be able to build explanations, interactively tune mathematical objects, animate transformations, and export polished media for teaching or publishing.

## Target Users

- Math YouTubers and STEM video creators
- University instructors and teaching assistants
- Advanced tutors and online course creators
- Students exploring advanced math visually
- Researchers who need clear explanatory visuals

## Core Product Promise

Users should be able to:

- Enter beautiful mathematical formulas with LaTeX-quality rendering.
- Manipulate variables, assumptions, and transformation steps directly.
- See 2D, 3D, and complex-plane visualizations update immediately.
- Build timeline-based explanations from formulas, graphs, camera movement, and visual effects.
- Export high-quality media for YouTube, lectures, and interactive documents.

## Recommended Technology Stack

### Desktop Shell

- Tauri 2
- Rust backend
- Cross-platform packaging for Windows, macOS, and Linux

### UI Layer

- TypeScript
- SvelteKit as the preferred UI framework
- React as an acceptable alternative if team familiarity strongly favors it

The UI should own:

- Formula editor
- Timeline editor
- Property panels
- Scene hierarchy
- Sliders and parameter controls
- Export dialogs
- Project navigation

### Math Engine

- Rust
- `num-complex` for complex values
- `nalgebra` for linear algebra
- `ndarray` for sampled grids
- `rayon` for CPU parallelism
- `serde` for data exchange and project serialization
- `chumsky` or `pest` for expression parsing

The math engine should own:

- Expression AST
- Numeric evaluation
- Complex function evaluation
- Adaptive sampling
- Root finding
- Mesh generation
- Formula transformation records
- Mathematical function library

### Rendering

Initial implementation:

- Three.js
- Canvas 2D
- WebGL shaders where useful

Later high-performance path:

- Rust `wgpu`
- Native GPU rendering
- GPU-assisted sampling or compute where needed

Rendering should support:

- 2D plots
- 3D surface plots
- Vector fields
- Parametric curves and surfaces
- Complex domain coloring
- Point clouds and zero sets
- Camera animation
- Creator-friendly color maps and visual presets

### Export

- FFmpeg integration for MP4 output
- PNG sequence export
- GIF export
- SVG export for selected 2D/math assets
- Transparent background export where possible
- 1080p and 4K presets

### Storage

- SQLite for local project metadata
- Versioned JSON project documents for portable project files
- Asset folder per project for exports, thumbnails, and imported media

### Scripting and Plugins

Long-term:

- JavaScript plugin API for UI-side extension
- Python bridge for SymPy-compatible symbolic experiments
- Optional Manim export or compatibility layer

Python should be treated as an extension and prototyping layer, not the main runtime.

## Proposed Repository Structure

```text
mathscape/
  apps/
    desktop/
      src-tauri/
        src/
          main.rs
          commands/
          project_io/
          export/
      src/
        app/
        components/
        formula-editor/
        panels/
        render-view/
        state/
        timeline/
        styles/

  crates/
    math-core/
      src/
        ast/
        complex/
        eval/
        functions/
        parser/
        sampling/
        symbolic/
        transforms/

    render-core/
      src/
        camera/
        color_maps/
        domain_coloring/
        mesh/
        scene_graph/

    animation-core/
      src/
        easing/
        keyframes/
        timeline/
        transitions/

    project-format/
      src/
        migrations/
        schema/
        serialize/

  packages/
    formula-editor/
    graph-presets/
    ui-kit/

  examples/
    complex-functions/
    differential-equations/
    fourier-series/
    linear-algebra/
    riemann-zeta/

  docs/
    architecture.md
    plugin-api.md
    product-goal.md
```

## MVP Roadmap

### MVP 1: Interactive 2D Authoring

- Desktop app shell
- Formula input and display
- 2D function plotting
- Sliders for parameters
- Project save/load
- Basic scene layout

### MVP 2: Creator Timeline

- Timeline panel
- Keyframes for formulas, parameters, camera, and graph visibility
- Basic transitions and easing
- Preview playback

### MVP 3: 3D Visualization

- 3D surface plots
- Parametric 3D curves
- Camera orbit and camera keyframes
- Preset lighting, grids, axes, and color maps

### MVP 4: Export Pipeline

- MP4 export through FFmpeg
- PNG sequence export
- YouTube-ready 1080p and 4K presets
- Project thumbnails

### MVP 5: Advanced Math Demonstrations

- Complex-plane domain coloring
- Fourier series templates
- Linear algebra/eigenvector templates
- Differential equation vector fields
- Riemann zeta demo with critical line and zero visualization

## Design Principles

- The first screen should be the actual authoring workspace, not a marketing page.
- Mathematical objects should be directly manipulable.
- Advanced controls should be discoverable but not visually overwhelming.
- Visual output should look publication-ready by default.
- Export quality matters as much as interactive quality.
- Avoid requiring code for common workflows.
- Keep scripting available for advanced users.

## Non-Goals

- Do not compete as a basic calculator-only product.
- Do not build a full Mathematica clone.
- Do not make Riemann hypothesis visualization the only product use case.
- Do not rely on cloud execution for core functionality.
- Do not require Python or notebooks for normal users.

## Initial Engineering Priorities

1. Scaffold the Tauri desktop application.
2. Add the TypeScript/SvelteKit workspace UI.
3. Create the Rust `math-core` crate with expression AST and numeric evaluation.
4. Add a minimal 2D graph renderer.
5. Add parameter sliders bound to formulas.
6. Add save/load project format.
7. Add a basic timeline data model.
8. Add Three.js 3D viewport.
9. Add FFmpeg-based export.
10. Build the first showcase example: Fourier series or complex domain coloring before the Riemann zeta demo.


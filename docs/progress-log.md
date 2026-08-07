# Mathscape Progress Log

Last updated: 2026-08-07

## Active Goal

Build Mathscape as a desktop-first advanced math visualization and solution-authoring tool for math YouTubers: a Tauri 2 app with TypeScript/SvelteKit UI, Rust math core, Three.js-first rendering with a path to wgpu, FFmpeg export, SQLite/project-file storage, and an MVP path covering 2D graphing, LaTeX formulas, sliders, 3D surfaces, camera animation, complex/domain-coloring demos, and a timeline for formula/graph animations.

## Current Implementation State

- Desktop-first SvelteKit/Tauri workspace is scaffolded.
- The first screen is the actual authoring workspace, not a landing page.
- Project model supports versioned JSON project files, localStorage autosave, scene templates, export settings, overlays, timeline markers, derivation steps, parameter keyframes, and camera keyframes.
- Native Tauri command layer includes SQLite-backed project library hooks and FFmpeg export bridge hooks.
- 2D rendering supports sine, Fourier square-wave preview, editable expression plots, parametric curves, vector fields with trajectory tracing, and linear-transform grids with basis vectors and eigen-direction guides.
- 3D rendering supports Three.js surface plots and 3D parametric curve rendering via a surface/curve render-mode switch.
- Complex rendering supports quadratic domain coloring and a zeta/eta-series approximation demo.
- Creator-oriented templates currently include:
  - Sine Transform
  - Fourier Build
  - Zeta Critical Line
  - Parametric Orbit
  - Eigen Transform
  - Phase Portrait
  - 3D Helix Curve
  - 3D Surface Ripple
- Export supports active viewport PNG snapshots, 2D SVG export, 2D PNG sequence export, transparent 2D export backgrounds, export frame preview, and a native MP4 path through Tauri/FFmpeg when FFmpeg is installed.
- Visual checks cover desktop and compact viewports, project save/load shape, templates, 2D/3D/complex rendering, styling controls, overlays, export settings, animation presets, and native MP4 browser fallback.

## Most Recent Completed Work

### 3D Parametric Curve Mode

- Added `ThreeRenderMode = 'surface' | 'curve'`.
- Added `visual.threeMode` to project state with default `surface`.
- Added Inspector control: `3D render mode`.
- Extended `ThreeSurface.svelte` to render either:
  - radial sine surface
  - tube-geometry helix/space curve
- Added `3D Helix Curve` creator template.
- Updated Rust project-format visual schema with `three_mode`.
- Added visual-check coverage for 3D curve rendering, mode switching, and saved `threeMode`.

### Linear Algebra / Eigen Transform

- Added `linear-transform` to `PlotMode`.
- Added `sampleLinearTransform()` and `drawLinearTransform()` in `plot.ts`.
- Live 2D canvas now renders transformed grid lines, transformed basis vectors, and estimated real eigen-directions.
- 2D export now supports linear-transform scenes for PNG/MP4 frame rendering and SVG output.
- Added `Eigen Transform` creator template.
- Added unit tests for linear-transform sampling and SVG export.
- Added visual-check coverage for template load, canvas rendering, and saved `plotMode`.

## Verified Commands

Latest known passing checks:

```bash
npm run test
npm run check
npm run build
npm run visual-check
npm audit --omit dev --omit optional
```

Latest observed results:

- `npm run test`: passed, 5 files / 39 tests.
- `npm run check`: passed, 0 Svelte diagnostics.
- `npm run build`: passed.
- `npm run visual-check`: passed.
- `npm audit --omit dev --omit optional`: passed, 0 vulnerabilities.

## Known Environment Gaps

These are local machine/toolchain gaps, not confirmed code failures:

- `cargo check` cannot run because `cargo` is not in PATH.
- `ffmpeg -version` cannot run because `ffmpeg` is not in PATH.
- Full native Tauri/Rust/FFmpeg validation should be repeated after installing Rust and FFmpeg.

Recommended local prerequisite commands:

```bash
rustup default stable
ffmpeg -version
cargo check
```

## Where To Resume

The interrupted next task was about improving the complex-plane / Riemann zeta demo so it feels more like a creator-facing advanced math explanation tool.

Start here:

1. Inspect `apps/desktop/src/lib/ComplexDomain.svelte`.
2. Add clearer zeta-specific visual affordances:
   - critical line emphasis
   - approximate zero markers
   - optional labels or timeline-aware highlights
3. Keep the interaction model consistent with existing parameters `a`, `b`, and `phi`.
4. Update `scripts/visual-check.mjs` to verify that zeta mode changes the canvas and that the new critical-line/zero-marker layer is present visually or semantically.
5. Update `README.md` after implementation.
6. Run:

```bash
npm run test
npm run check
npm run build
npm run visual-check
npm audit --omit dev --omit optional
cargo check
ffmpeg -version
```

Expect `cargo check` and `ffmpeg -version` to fail until Rust and FFmpeg are installed or added to PATH.

## Important Files

- `docs/product-goal.md`: product vision, stack, MVP roadmap.
- `README.md`: current status and local development commands.
- `apps/desktop/src/lib/project.ts`: project schema and scene model.
- `apps/desktop/src/lib/templates.ts`: creator starter scenes.
- `apps/desktop/src/lib/plot.ts`: 2D plot, parametric, vector-field, and linear-transform renderers.
- `apps/desktop/src/lib/export.ts`: SVG/PNG-sequence/native-MP4 frame rendering.
- `apps/desktop/src/lib/ThreeSurface.svelte`: 3D surface and 3D curve renderer.
- `apps/desktop/src/lib/ComplexDomain.svelte`: complex-domain renderer; this is the next best resume point.
- `apps/desktop/src/routes/+page.svelte`: main authoring workspace and Inspector.
- `scripts/visual-check.mjs`: Playwright visual smoke coverage.
- `crates/project-format/src/lib.rs`: Rust mirror of portable project format.


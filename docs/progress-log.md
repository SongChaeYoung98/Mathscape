# Mathscape Progress Log

Last updated: 2026-08-12

## Active Goal

Build Mathscape as a desktop-first advanced math visualization and solution-authoring tool for math YouTubers: a Tauri 2 app with TypeScript/SvelteKit UI, Rust math core, Three.js-first rendering with a path to wgpu, FFmpeg export, SQLite/project-file storage, and an MVP path covering 2D graphing, LaTeX formulas, sliders, 3D surfaces, camera animation, complex/domain-coloring demos, and a timeline for formula/graph animations.

## Current Implementation State

- Desktop-first SvelteKit/Tauri workspace is scaffolded.
- The first screen is the actual authoring workspace, not a landing page.
- Project model supports versioned JSON project files, localStorage autosave, scene templates, export settings, overlays, timeline markers, derivation steps, parameter keyframes, and camera keyframes.
- Solution-step editing supports timeline time, label, LaTeX, narration notes, add-at-playhead, and delete workflows.
- Native Tauri command layer includes SQLite-backed project library hooks and FFmpeg export bridge hooks.
- 2D rendering supports sine, Fourier square-wave preview, editable expression plots, parametric curves, vector fields with trajectory tracing, and linear-transform grids with basis vectors and eigen-direction guides.
- Formula Stack now starts with a single Graph Equation input that routes ordinary `x` expressions to 2D and `z(x,y)`/surface expressions to 3D.
- The stage overlay now shows only the active Graph Equation by default instead of template title/derivation narration cards.
- 3D rendering supports editable `z(x,y)` surface plots, a black-hole halo starter equation, and 3D parametric curve rendering via a surface/curve render-mode switch.
- Complex rendering supports quadratic domain coloring and a zeta/eta-series approximation demo with critical-line and zero-marker overlays.
- Creator-oriented templates currently include:
  - Sine Transform
  - Fourier Build
  - Zeta Critical Line
  - Parametric Orbit
  - Eigen Transform
  - Phase Portrait
  - 3D Helix Curve
  - 3D Surface Ripple
- Export supports active viewport PNG snapshots, 2D SVG export, 2D/complex/3D PNG sequence export, transparent 2D export backgrounds, export frame preview, and a native MP4 path through Tauri/FFmpeg when FFmpeg is installed.
- Complex-domain scenes can export animated PNG sequences through the same export settings used by the 2D pipeline.
- 3D scenes can export viewport PNG sequences from the live WebGL canvas at the configured export resolution with timeline/camera keyframes applied.
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

### Zeta Critical-Line Overlay

- Updated `ComplexDomain.svelte` so zeta mode centers the viewport near non-trivial zero heights.
- Added approximate zero markers for the first few known critical-line zeros.
- Updated the zeta canvas aria-label so visual checks can assert that the critical-line/zero-marker layer is active.
- Updated visual-check coverage to detect the zeta critical-line and zero-marker mode.

### Complex-Domain PNG Sequence Export

- Added `renderComplexFrameDataUrl()` and `downloadComplexSequence()` to the export pipeline.
- Reused scene duration, export resolution, frame count, and parameter keyframes for complex-domain animation frames.
- Updated the `PNG Seq` command so 2D exports 2D frames and Complex exports complex-domain frames.
- Added visual-check coverage for complex-domain PNG sequence downloads.

### 3D Viewport PNG Sequence Export

- Added an awaitable canvas PNG frame download helper.
- Updated the `PNG Seq` command so 3D advances the playhead frame-by-frame and captures the live Three.js/WebGL canvas.
- 3D sequence export now respects parameter interpolation, camera keyframes, and configured export resolution through the existing timeline state.
- Added visual-check coverage for 3D PNG sequence downloads.

### Multi-Renderer MP4 Frame Sources

- Updated the native MP4 frame rendering path so it chooses a frame source from the active panel.
- 2D uses the existing offscreen 2D renderer.
- Complex uses the complex-domain offscreen renderer.
- 3D advances the playhead and captures the live Three.js/WebGL canvas at the configured export resolution.
- The actual FFmpeg encode still requires the Tauri app plus FFmpeg in PATH.

### Solution Step Deletion

- Added a per-step delete action in the solution-step editor.
- Kept a one-step minimum guard so overlays and export frame selection always have a fallback derivation step.
- Added visual-check coverage that adds, deletes, and verifies the removed step is not saved.

### Editable 3D Surface Equations

- Added project-state storage for `surfaceExpression` with legacy project fallback.
- Extended the expression parser for 3D variables `x`, `y`, `r`, `a/A`, `b/k`, `phi`, plus black-hole halo constants `R`, `sigma`, `M`, and `epsilon`.
- Added a Formula Stack editor for `z(x,y)` so users can enter custom 3D height-field equations directly.
- Added a single Graph Equation input above display-only LaTeX fields so users can paste one expression and immediately see either a 2D or 3D graph.
- Added a one-click black-hole halo starter equation using `A*exp(-((sqrt(x^2+y^2)-R)^2)/(sigma^2))*cos(k*sqrt(x^2+y^2)+phi)-M/sqrt(x^2+y^2+epsilon)`.
- Added visual-check coverage for typing 2D graph expressions, typing 3D surface expressions, loading the black-hole halo equation, rendering, and saving the result.

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

The next best task is to validate and harden the native desktop toolchain.

Start here:

1. Read the "Expert Usability Review Standard" in `docs/product-goal.md` before making UX changes.
2. Install or locate Rust and FFmpeg on the machine.
3. Run `cargo check`, `npm run tauri dev`, and a real MP4 export from the Tauri app.
4. Review the chosen workflow as if a mathematician, engineering PhD, educator, and working STEM creator were testing it for real production use.
5. Keep timeline playback, overlay layout, and export settings consistent with the current 2D export pipeline.
6. Update `scripts/visual-check.mjs` to verify the chosen export workflow.
7. Update `README.md` and this progress log after implementation.
8. Run:

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

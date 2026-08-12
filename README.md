# Mathscape

[English](#mathscape) | [한국어](#mathscape-한국어)

Mathscape is a desktop-first advanced math visualization and solution-authoring tool for math educators, YouTubers, tutors, and STEM creators.

See [docs/product-goal.md](docs/product-goal.md) for the product direction, stack, and MVP roadmap.
See [docs/progress-log.md](docs/progress-log.md) for the current implementation state and next resume point.

## Local Development

The repository is scaffolded as a Tauri 2 desktop app with a SvelteKit UI and Rust workspace crates.

```bash
npm install
npm run dev
```

Frontend verification:

```bash
npm run check
npm run build
npm run visual-check
```

To run the native Tauri shell, install the Rust toolchain first, then run:

```bash
npm run tauri dev
```

## Current Status

- SvelteKit desktop workspace scaffold
- Initial creator-focused authoring screen
- Local project state foundation
- Rust workspace layout
- `math-core` crate with expression and sampling primitives
- Three.js 3D surface and parametric curve viewport
- 3D reference grid and labeled axes with color-map-aware surface/curve materials
- 3D viewport PNG sequence export from the live WebGL canvas at the configured export resolution
- Complex domain coloring viewport
- Playwright visual smoke check for 2D, 3D, and complex canvases
- Timeline playback with keyframed parameter interpolation
- Portable `.mathscape.json` project export/import
- PNG snapshot export for the active viewport
- SVG export for the current 2D frame as scalable vector artwork
- Initial PNG sequence export path for timeline frames
- Transparent background option for 2D PNG sequence, SVG, preview, and native MP4 frame rendering
- Complex-domain PNG sequence export for animated domain-coloring scenes
- Riemann zeta complex-domain demo preset using an eta-series approximation
- Zeta critical-line overlay with approximate non-trivial zero markers
- Timeline-driven 3D camera animation
- KaTeX-rendered editable formula cards
- Creator starter scenes for sine transforms, Fourier build-ups, eigenvector linear transforms, zeta domain coloring, 3D helix curves, and 3D surface ripples
- Scene-aware 2D plot functions, including a Fourier square-wave series preview
- Parametric curve renderer and Lissajous-style orbit starter scene for periodic-motion explainers
- 2D vector-field renderer with trajectory tracing and a phase-portrait starter scene for differential-equation explainers
- 2D linear-transform renderer with transformed grids, basis vectors, and eigen-direction guides for linear-algebra explainers
- Native Tauri project library commands backed by SQLite, with UI hooks for saving and reopening local projects
- Native FFmpeg command bridge for MP4 encoding from PNG frame sequences, with a guarded MP4 export entry point in the UI
- MP4 export pipeline renders 2D, complex-domain, or live 3D viewport frames, writes them to a native export session directory, and hands the frame pattern to FFmpeg in Tauri
- Project-level export settings for resolution, frame count, and FPS, shared by PNG sequence and native MP4 frame rendering
- Inspector-side 2D export frame preview that reflects the current playhead, overlay layout, annotations, and export aspect ratio
- Timed derivation steps for creator scripts, with LaTeX-rendered solution cards linked to the animation timeline
- Editable solution-step authoring for timeline time, step label, LaTeX, narration notes, add-at-playhead, and delete workflows
- Editable scene duration and timeline markers, with marker positions recomputed from timeline seconds for export-safe timing
- Scene-level 2D visual styling for color map, line weight, and axes visibility, shared by live canvas and export frames
- Scene-level 3D render-mode and styling controls for surfaces/curves, smooth/wireframe rendering, orbit speed, height scale, and mesh density
- Scene-level 2D graph annotations for timeline-aware trace points and tangent-line callouts, shared by live canvas and export frames
- Inspector-side parameter keyframe editing for timeline-controlled `a`, `b`, and `phi` animation values
- Inspector-side camera keyframe editing for 3D position, look target, FOV, easing, and capture-at-playhead workflows
- Presentation overlay controls for formula and derivation cards on the stage, also rendered into 2D PNG/MP4 frame exports
- Export-aware presentation overlay layout controls for formula/derivation card positions and card scale
- Editable 2D expression graphing with a constrained parser for `x`, `a`, `b`, `phi`, constants, elementary functions, and arithmetic operators
- Inline validation for editable 2D expressions, including parse and sample-evaluation errors before export/render workflows
- Unit coverage for expression parsing, 2D plot generation and sampling, shared timeline interpolation logic, and portable project normalization

## Native Prerequisites

Install Rust and FFmpeg before validating the full desktop and video-export path:

```bash
rustup default stable
ffmpeg -version
cargo check
```

---

# Mathscape 한국어

Mathscape는 수학 유튜버, 강의자, 튜터, STEM 크리에이터를 위한 데스크탑 우선 고급 수학 시각화 및 풀이 제작 도구입니다.

목표는 Desmos처럼 쉽게 조작하고, Mathematica보다 친절하게 고급 수학을 다루며, Manim처럼 영상 제작에 쓸 수 있는 결과물을 만드는 것입니다.

제품 방향, 기술 스택, MVP 로드맵은 [docs/product-goal.md](docs/product-goal.md)를 참고하세요.
현재 구현 상태와 다음 작업 재개 지점은 [docs/progress-log.md](docs/progress-log.md)에 기록되어 있습니다.

## 로컬 개발

이 저장소는 Tauri 2 데스크탑 앱, SvelteKit UI, Rust workspace crate 구조로 구성되어 있습니다.

```bash
npm install
npm run dev
```

프론트엔드 검증:

```bash
npm run test
npm run check
npm run build
npm run visual-check
```

네이티브 Tauri 앱 실행은 Rust toolchain 설치 후 가능합니다.

```bash
npm run tauri dev
```

## 현재 구현 상태

- SvelteKit 기반 데스크탑 저작 UI
- Tauri/Rust workspace 구조
- LaTeX 수식 카드와 풀이 단계 편집
- 파라미터 슬라이더와 timeline keyframe 애니메이션
- 2D 함수 그래프, Fourier, parametric curve, vector field, linear transform 렌더러
- Three.js 기반 3D surface 및 3D helix curve 렌더러
- 설정된 export 해상도를 따르는 live WebGL canvas 기반 3D viewport PNG sequence export
- 복소평면 domain coloring 및 zeta demo
- zeta critical line overlay와 approximate non-trivial zero marker
- complex-domain animation PNG sequence export
- PNG, SVG, PNG sequence export
- Tauri 환경에서 FFmpeg 기반 MP4 export 경로
- 2D, complex-domain, live 3D viewport frame을 FFmpeg bridge로 넘기는 MP4 export frame source
- SQLite 기반 native project library 명령
- Playwright visual smoke test와 unit test

## 네이티브 필수 도구

Rust와 FFmpeg를 설치해야 Tauri/Rust/MP4 export 경로를 완전히 검증할 수 있습니다.

```bash
rustup default stable
ffmpeg -version
cargo check
```

import {
  createPlotFunction,
  drawLinearTransform,
  drawPlot,
  drawVectorField,
  sampleFunction,
  sampleLinearTransform,
  sampleParametricCurve,
  sampleVectorField,
  sampleVectorTrajectory,
  type LinearTransformSample,
  type VectorFieldArrow,
  type VectorTrajectoryPoint
} from './plot';
import { interpolateParameters } from './timeline';
import type {
  ComplexFunctionMode,
  DerivationStep,
  MathscapeParameters,
  MathscapeScene,
  OverlayPosition,
  SceneVisualSettings
} from './project';

export type ExportMode = '2D' | '3D' | 'Complex';

export function downloadCanvasPng(canvas: HTMLCanvasElement, filename: string): void {
  canvas.toBlob((blob) => {
    if (!blob) return;
    downloadBlob(blob, filename);
  }, 'image/png');
}

export function downloadCanvasPngFrame(canvas: HTMLCanvasElement, filename: string): Promise<void> {
  return downloadCanvasFrame(canvas, filename);
}

export function download2dSvg(
  scene: MathscapeScene,
  timeSeconds: number,
  width = 1920,
  height = 1080,
  transparentBackground = false
): void {
  const svg = render2dFrameSvg(scene, timeSeconds, width, height, transparentBackground);
  downloadBlob(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), `mathscape-2d-${Date.now()}.svg`);
}

export function render2dFrameSvg(
  scene: MathscapeScene,
  timeSeconds: number,
  width = 1920,
  height = 1080,
  transparentBackground = false
): string {
  const parameters = interpolateParameters(scene.parameterKeyframes, timeSeconds, scene.parameters);
  const fn = createPlotFunction(scene.plotMode, parameters, scene.expression);
  const points =
    scene.plotMode === 'parametric'
      ? sampleParametricCurve(parameters, 960)
      : scene.plotMode === 'linear-transform'
        ? [
            { x: -1, y: -1 },
            { x: 1, y: 1 }
          ]
      : sampleFunction(fn, -Math.PI * 2, Math.PI * 2, 960);
  const padding = 56;
  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const minY = Math.min(-2, ...points.map((point) => point.y));
  const maxY = Math.max(2, ...points.map((point) => point.y));
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const toSvgX = (x: number) => padding + ((x - minX) / spanX) * (width - padding * 2);
  const toSvgY = (y: number) => height - padding - ((y - minY) / spanY) * (height - padding * 2);
  const path = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${round(toSvgX(point.x))} ${round(toSvgY(point.y))}`)
    .join(' ');
  const color = svgPlotColor(scene.visual.colorMap);
  const axis = svgAxisColor(scene.visual.colorMap);
  const grid = scene.visual.showAxes ? renderSvgGrid(width, height, padding, axis) : '';
  const graphContent =
    scene.plotMode === 'vector-field'
      ? [
          renderSvgVectorField(sampleVectorField(parameters, 19, 4), width, height, scene.visual),
          renderSvgVectorTrajectory(sampleVectorTrajectory(parameters, 220, 0.035), width, height, scene.visual)
        ].join('')
      : scene.plotMode === 'linear-transform'
        ? renderSvgLinearTransform(sampleLinearTransform(parameters, 9, 90), width, height, scene.visual)
      : [
          `<path d="${path}" fill="none" stroke="${svgGlowColor(scene.visual.colorMap, 0.42)}" stroke-width="${round(Math.max(1, Math.min(12, scene.visual.lineWeight)) * 4)}" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow)"/>`,
          `<path d="${path}" fill="none" stroke="${color}" stroke-width="${round(Math.max(1, Math.min(12, scene.visual.lineWeight)))}" stroke-linecap="round" stroke-linejoin="round"/>`,
          renderSvgAnnotations(scene, fn, minX, maxX, toSvgX, toSvgY, timeSeconds)
        ].join('');
  const overlay = renderSvgOverlay(scene, timeSeconds, width, height);
  const background = transparentBackground
    ? ''
    : `<rect width="100%" height="100%" fill="url(#bg)"/><circle cx="${width / 2}" cy="${height * 0.42}" r="${width * 0.38}" fill="${svgGlowColor(scene.visual.colorMap, 0.18)}"/>`;

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${escapeXml(scene.name)} 2D graph">`,
    `<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#101820"/><stop offset="52%" stop-color="${svgBackgroundMidColor(scene.visual.colorMap)}"/><stop offset="100%" stop-color="#0a1117"/></linearGradient><filter id="glow"><feGaussianBlur stdDeviation="8" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`,
    background,
    grid,
    graphContent,
    overlay,
    `</svg>`
  ]
    .filter(Boolean)
    .join('');
}

export function render2dFrameDataUrl(
  scene: MathscapeScene,
  frame: number,
  frameCount: number,
  width = 1920,
  height = 1080,
  transparentBackground = false
): string {
  const canvas = createExportCanvas(width, height);
  const time = (scene.durationSeconds * frame) / Math.max(1, frameCount - 1);
  const parameters = interpolateParameters(scene.parameterKeyframes, time, scene.parameters);
  if (scene.plotMode === 'vector-field') {
    drawVectorField(canvas, sampleVectorField(parameters, 19, 4), scene.visual, {
      transparentBackground,
      trajectory: sampleVectorTrajectory(parameters, 220, 0.035)
    });
  } else if (scene.plotMode === 'linear-transform') {
    drawLinearTransform(canvas, sampleLinearTransform(parameters, 9, 90), scene.visual, {
      transparentBackground
    });
  } else if (scene.plotMode === 'parametric') {
    drawPlot(canvas, sampleParametricCurve(parameters, 960), scene.visual, {
      annotation: {
        ...scene.annotation,
        showTracePoint: false
      },
      transparentBackground
    });
  } else {
    const fn = createPlotFunction(scene.plotMode, parameters, scene.expression);
    const points = sampleFunction(fn, -Math.PI * 2, Math.PI * 2, 960);

    drawPlot(canvas, points, scene.visual, {
      annotation: scene.annotation,
      fn,
      progress: time / Math.max(1, scene.durationSeconds),
      transparentBackground
    });
  }
  drawFrameOverlay(canvas, scene, time);
  return canvas.toDataURL('image/png');
}

export async function download2dSequence(
  scene: MathscapeScene,
  frameCount: number,
  width = 1920,
  height = 1080,
  transparentBackground = false
): Promise<void> {
  for (let frame = 0; frame < frameCount; frame += 1) {
    const canvas = await dataUrlToCanvas(
      render2dFrameDataUrl(scene, frame, frameCount, width, height, transparentBackground)
    );
    await downloadCanvasFrame(canvas, `mathscape-frame-${String(frame + 1).padStart(3, '0')}.png`);
    await nextFrame();
  }
}

export function renderComplexFrameDataUrl(
  scene: MathscapeScene,
  frame: number,
  frameCount: number,
  width = 1920,
  height = 1080
): string {
  const canvas = createExportCanvas(width, height);
  const time = (scene.durationSeconds * frame) / Math.max(1, frameCount - 1);
  const parameters = interpolateParameters(scene.parameterKeyframes, time, scene.parameters);
  drawComplexDomainFrame(canvas, scene.complexMode, parameters);
  drawFrameOverlay(canvas, scene, time);
  return canvas.toDataURL('image/png');
}

export async function downloadComplexSequence(
  scene: MathscapeScene,
  frameCount: number,
  width = 1920,
  height = 1080
): Promise<void> {
  for (let frame = 0; frame < frameCount; frame += 1) {
    const canvas = await dataUrlToCanvas(renderComplexFrameDataUrl(scene, frame, frameCount, width, height));
    await downloadCanvasFrame(canvas, `mathscape-complex-frame-${String(frame + 1).padStart(3, '0')}.png`);
    await nextFrame();
  }
}

function createExportCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  return canvas;
}

function drawComplexDomainFrame(
  canvas: HTMLCanvasElement,
  mode: ComplexFunctionMode,
  parameters: MathscapeParameters
): void {
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return;

  const width = canvas.width;
  const height = canvas.height;
  const image = context.createImageData(width, height);
  const span = mode === 'zeta' ? 2.4 : 3.2;
  const aspect = width / height;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const re = ((x / (width - 1)) * 2 - 1) * span * aspect;
      const im = (1 - (y / (height - 1)) * 2) * span;
      const value = evaluateComplexDomain(mode, parameters, re, im);
      const magnitude = Math.hypot(value.re, value.im);
      const angle = Math.atan2(value.im, value.re);
      const hue = angle / (Math.PI * 2) + 0.5;
      const contour = 0.72 + 0.16 * Math.sin(Math.log1p(magnitude) * 12);
      const brightness = Math.min(1, 0.34 + Math.log1p(magnitude) * 0.26) * contour;
      const saturation = Math.max(0.58, 1 - Math.exp(-magnitude * 1.4));
      const zeroGlow = Math.exp(-magnitude * 12);
      const [r, g, b] = hsvToRgb(hue, saturation, Math.max(0.08, brightness));
      const index = (y * width + x) * 4;

      image.data[index] = Math.min(255, r + zeroGlow * 255);
      image.data[index + 1] = Math.min(255, g + zeroGlow * 220);
      image.data[index + 2] = Math.min(255, b + zeroGlow * 90);
      image.data[index + 3] = 255;
    }
  }

  context.putImageData(image, 0, 0);
  drawComplexDomainOverlay(context, mode, parameters, span, width, height);
}

function evaluateComplexDomain(
  mode: ComplexFunctionMode,
  parameters: MathscapeParameters,
  re: number,
  im: number
): { re: number; im: number } {
  if (mode === 'zeta') {
    return zetaApprox(parameters, re, im);
  }

  const cRe = 0.18 * Math.cos(parameters.phase);
  const cIm = 0.18 * Math.sin(parameters.phase);
  const scaledRe = parameters.frequency * re;
  const scaledIm = parameters.frequency * im;

  return {
    re: parameters.amplitude * (scaledRe * scaledRe - scaledIm * scaledIm) + cRe,
    im: parameters.amplitude * (2 * scaledRe * scaledIm) + cIm
  };
}

function zetaApprox(parameters: MathscapeParameters, re: number, im: number): { re: number; im: number } {
  let etaRe = 0;
  let etaIm = 0;
  const terms = 42;
  const shiftedRe = 0.5 + re * 0.34;
  const shiftedIm = zetaCenterT(parameters.phase) + im * 4.8;
  const scale = 0.72 + parameters.amplitude * 0.18;

  for (let n = 1; n <= terms; n += 1) {
    const sign = n % 2 === 0 ? -1 : 1;
    const logN = Math.log(n);
    const magnitude = Math.exp(-shiftedRe * logN);
    const angle = -shiftedIm * logN;
    etaRe += sign * magnitude * Math.cos(angle);
    etaIm += sign * magnitude * Math.sin(angle);
  }

  const powAngle = -shiftedIm * Math.LN2;
  const powMagnitude = Math.exp((1 - shiftedRe) * Math.LN2);
  const denomRe = 1 - powMagnitude * Math.cos(powAngle);
  const denomIm = -powMagnitude * Math.sin(powAngle);
  const denomMag = denomRe * denomRe + denomIm * denomIm || 1;

  return {
    re: scale * ((etaRe * denomRe + etaIm * denomIm) / denomMag),
    im: scale * ((etaIm * denomRe - etaRe * denomIm) / denomMag)
  };
}

function drawComplexDomainOverlay(
  context: CanvasRenderingContext2D,
  mode: ComplexFunctionMode,
  parameters: MathscapeParameters,
  span: number,
  width: number,
  height: number
): void {
  const aspect = width / height;
  const criticalX = mode === 'zeta' ? width / 2 : width / 2 + (0.5 / (span * aspect)) * (width / 2);

  context.save();
  context.strokeStyle = 'rgba(237, 242, 244, 0.72)';
  context.lineWidth = Math.max(1.25, width / 1536);
  context.setLineDash([width / 320, width / 240]);
  context.beginPath();
  context.moveTo(criticalX, height * 0.035);
  context.lineTo(criticalX, height * 0.965);
  context.stroke();
  context.setLineDash([]);

  if (mode === 'zeta') {
    zetaZeros
      .map((zero) => ({ zero, y: zetaScreenY(zero, parameters.phase, span, height) }))
      .filter((entry): entry is { zero: number; y: number } => entry.y !== undefined)
      .forEach((entry, index) => {
        const pulse = 1 + 0.18 * Math.sin(parameters.phase + index);
        const radius = Math.max(7, width / 180) * pulse;
        context.shadowColor = 'rgba(244, 211, 94, 0.82)';
        context.shadowBlur = width / 100;
        context.fillStyle = 'rgba(244, 211, 94, 0.92)';
        context.strokeStyle = 'rgba(237, 242, 244, 0.96)';
        context.lineWidth = Math.max(2, width / 960);
        context.beginPath();
        context.arc(criticalX, entry.y, radius, 0, Math.PI * 2);
        context.fill();
        context.stroke();
      });
  }

  context.fillStyle = 'rgba(15, 20, 25, 0.74)';
  context.fillRect(width * 0.03, height * 0.04, width * 0.29, height * 0.11);
  context.strokeStyle = 'rgba(143, 188, 230, 0.6)';
  context.strokeRect(width * 0.03, height * 0.04, width * 0.29, height * 0.11);
  context.fillStyle = '#edf2f4';
  context.font = `600 ${Math.max(18, width / 72)}px Inter, Arial, sans-serif`;
  context.fillText(mode === 'zeta' ? 'zeta(s), critical line' : 'f(z)=a(zb)^2 + c(phi)', width * 0.05, height * 0.09);
  context.fillStyle = '#e9c46a';
  context.font = `${Math.max(15, width / 96)}px Inter, Arial, sans-serif`;
  context.fillText(mode === 'zeta' ? `zeros near t=${zetaCenterT(parameters.phase).toFixed(1)}` : 'phase = hue, magnitude = light', width * 0.05, height * 0.125);
  context.restore();
}

const zetaZeros = [14.134725, 21.02204, 25.010858, 30.424876, 32.935062];

function zetaCenterT(phase: number): number {
  return 18 + phase * 0.8;
}

function zetaScreenY(zeroT: number, phase: number, span: number, height: number): number | undefined {
  const im = (zeroT - zetaCenterT(phase)) / 4.8;
  if (im < -span || im > span) return undefined;
  return (1 - (im / span + 1) / 2) * height;
}

function hsvToRgb(hue: number, saturation: number, value: number): [number, number, number] {
  const h = ((hue % 1) + 1) % 1;
  const index = Math.floor(h * 6);
  const f = h * 6 - index;
  const p = value * (1 - saturation);
  const q = value * (1 - f * saturation);
  const t = value * (1 - (1 - f) * saturation);
  const channels = [
    [value, t, p],
    [q, value, p],
    [p, value, t],
    [p, q, value],
    [t, p, value],
    [value, p, q]
  ][index % 6];

  return channels.map((channel) => Math.round(channel * 255)) as [number, number, number];
}

function drawFrameOverlay(canvas: HTMLCanvasElement, scene: MathscapeScene, timeSeconds: number): void {
  if (!scene.overlay.enabled) return;

  const context = canvas.getContext('2d');
  if (!context) return;

  const scale = canvas.width / 1920;
  const margin = 56 * scale;
  const cardScale = Math.max(0.7, Math.min(1.4, scene.overlay.cardScale));
  const cardWidth = 650 * scale * cardScale;

  context.save();
  context.textBaseline = 'top';

  if (scene.overlay.showFormula) {
    const lines = [scene.expression];
    const metrics = overlayCardMetrics(context, lines, cardScale);
    const position = overlayCardPosition(canvas, scene.overlay.formulaPosition, cardWidth, metrics.height, margin);
    drawOverlayCard(context, {
      x: position.x,
      y: position.y,
      width: cardWidth,
      scale: cardScale,
      title: 'Graph equation',
      lines
    });
  }

  context.restore();
}

function renderSvgGrid(width: number, height: number, padding: number, axisColor: string): string {
  const lines: string[] = [];

  for (let index = 0; index <= 8; index += 1) {
    const x = padding + (index / 8) * (width - padding * 2);
    const y = padding + (index / 8) * (height - padding * 2);
    lines.push(`<line x1="${round(x)}" y1="${padding}" x2="${round(x)}" y2="${height - padding}" stroke="#253241" stroke-width="1"/>`);
    lines.push(`<line x1="${padding}" y1="${round(y)}" x2="${width - padding}" y2="${round(y)}" stroke="#253241" stroke-width="1"/>`);
  }

  lines.push(`<line x1="${padding}" y1="${height / 2}" x2="${width - padding}" y2="${height / 2}" stroke="${axisColor}" stroke-width="1.4"/>`);
  lines.push(`<line x1="${width / 2}" y1="${padding}" x2="${width / 2}" y2="${height - padding}" stroke="${axisColor}" stroke-width="1.4"/>`);

  return `<g aria-label="plot grid">${lines.join('')}</g>`;
}

function renderSvgVectorField(
  arrows: VectorFieldArrow[],
  width: number,
  height: number,
  visual: SceneVisualSettings
): string {
  const padding = 56;
  const span = 4;
  const toSvgX = (x: number) => padding + ((x + span) / (span * 2)) * (width - padding * 2);
  const toSvgY = (y: number) => height - padding - ((y + span) / (span * 2)) * (height - padding * 2);
  const cell = Math.min(width, height) / Math.sqrt(arrows.length);
  const maxMagnitude = Math.max(1, ...arrows.map((arrow) => arrow.magnitude));
  const stroke = svgGlowColor(visual.colorMap, 0.72);
  const fill = svgPlotColor(visual.colorMap);
  const strokeWidth = round(Math.max(1, visual.lineWeight * 0.55));

  const arrowShapes = arrows
    .map((arrow) => {
      const x = toSvgX(arrow.x);
      const y = toSvgY(arrow.y);
      const length = cell * (0.28 + 0.38 * Math.min(1, arrow.magnitude / maxMagnitude));
      const x2 = x + arrow.dx * length;
      const y2 = y - arrow.dy * length;
      const angle = Math.atan2(y2 - y, x2 - x);
      const head = Math.max(5, length * 0.22);
      const hx1 = x2 - head * Math.cos(angle - Math.PI / 6);
      const hy1 = y2 - head * Math.sin(angle - Math.PI / 6);
      const hx2 = x2 - head * Math.cos(angle + Math.PI / 6);
      const hy2 = y2 - head * Math.sin(angle + Math.PI / 6);

      return `<g><line x1="${round(x)}" y1="${round(y)}" x2="${round(x2)}" y2="${round(y2)}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round"/><path d="M ${round(x2)} ${round(y2)} L ${round(hx1)} ${round(hy1)} L ${round(hx2)} ${round(hy2)} Z" fill="${fill}"/></g>`;
    })
    .join('');

  return `<g aria-label="vector field">${arrowShapes}</g>`;
}

function renderSvgVectorTrajectory(
  points: VectorTrajectoryPoint[],
  width: number,
  height: number,
  visual: SceneVisualSettings
): string {
  if (points.length < 2) return '';

  const padding = 56;
  const span = 4;
  const toSvgX = (x: number) => padding + ((x + span) / (span * 2)) * (width - padding * 2);
  const toSvgY = (y: number) => height - padding - ((y + span) / (span * 2)) * (height - padding * 2);
  const path = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${round(toSvgX(point.x))} ${round(toSvgY(point.y))}`)
    .join(' ');
  const last = points[points.length - 1];

  return [
    `<g aria-label="vector trajectory">`,
    `<path d="${path}" fill="none" stroke="${svgGlowColor(visual.colorMap, 0.62)}" stroke-width="${round(Math.max(4, visual.lineWeight * 4))}" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow)"/>`,
    `<path d="${path}" fill="none" stroke="#edf2f4" stroke-width="${round(Math.max(2, visual.lineWeight * 1.25))}" stroke-linecap="round" stroke-linejoin="round"/>`,
    `<circle cx="${round(toSvgX(last.x))}" cy="${round(toSvgY(last.y))}" r="9" fill="${svgAxisColor(visual.colorMap)}" stroke="#edf2f4" stroke-width="3"/>`,
    `</g>`
  ].join('');
}

function renderSvgLinearTransform(
  sample: LinearTransformSample,
  width: number,
  height: number,
  visual: SceneVisualSettings
): string {
  const padding = 56;
  const bounds = svgLinearBounds(sample);
  const toSvgX = (x: number) => padding + ((x - bounds.minX) / (bounds.maxX - bounds.minX || 1)) * (width - padding * 2);
  const toSvgY = (y: number) => height - padding - ((y - bounds.minY) / (bounds.maxY - bounds.minY || 1)) * (height - padding * 2);
  const gridCount = sample.lines.length / 2;
  const grid = sample.lines
    .map((line) => {
      const path = line.points
        .map((point, index) => `${index === 0 ? 'M' : 'L'} ${round(toSvgX(point.x))} ${round(toSvgY(point.y))}`)
        .join(' ');
      const isCenter = line.index === Math.floor(gridCount / 2);
      const stroke = isCenter ? svgAxisColor(visual.colorMap) : line.axis === 'x' ? 'rgba(124, 199, 216, 0.36)' : 'rgba(233, 196, 106, 0.32)';
      return `<path d="${path}" fill="none" stroke="${stroke}" stroke-width="${isCenter ? 2 : 1}" stroke-linecap="round"/>`;
    })
    .join('');
  const basis = [
    renderSvgVector(sample.basis.i, 'T(e1)', '#f07167', toSvgX, toSvgY, visual.lineWeight),
    renderSvgVector(sample.basis.j, 'T(e2)', '#e9c46a', toSvgX, toSvgY, visual.lineWeight)
  ].join('');
  const eigen = sample.eigen
    .map(
      (direction) =>
        `<line x1="${round(toSvgX(-direction.x * 4))}" y1="${round(toSvgY(-direction.y * 4))}" x2="${round(toSvgX(direction.x * 4))}" y2="${round(toSvgY(direction.y * 4))}" stroke="${svgGlowColor(visual.colorMap, 0.86)}" stroke-width="3" stroke-dasharray="14 12"/>`
    )
    .join('');

  return `<g aria-label="linear transform">${grid}<g aria-label="eigen directions">${eigen}</g><g aria-label="transformed basis">${basis}</g></g>`;
}

function renderSvgVector(
  vector: { x: number; y: number },
  label: string,
  color: string,
  toSvgX: (x: number) => number,
  toSvgY: (y: number) => number,
  lineWeight: number
): string {
  const startX = toSvgX(0);
  const startY = toSvgY(0);
  const endX = toSvgX(vector.x);
  const endY = toSvgY(vector.y);
  const angle = Math.atan2(endY - startY, endX - startX);
  const head = 18;
  const hx1 = endX - head * Math.cos(angle - Math.PI / 6);
  const hy1 = endY - head * Math.sin(angle - Math.PI / 6);
  const hx2 = endX - head * Math.cos(angle + Math.PI / 6);
  const hy2 = endY - head * Math.sin(angle + Math.PI / 6);

  return [
    `<line x1="${round(startX)}" y1="${round(startY)}" x2="${round(endX)}" y2="${round(endY)}" stroke="${color}" stroke-width="${round(Math.max(2, lineWeight))}" stroke-linecap="round"/>`,
    `<path d="M ${round(endX)} ${round(endY)} L ${round(hx1)} ${round(hy1)} L ${round(hx2)} ${round(hy2)} Z" fill="${color}"/>`,
    `<text x="${round(endX + 16)}" y="${round(endY - 18)}" fill="${color}" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="700">${escapeXml(label)}</text>`
  ].join('');
}

function svgLinearBounds(sample: LinearTransformSample) {
  const points = [
    ...sample.lines.flatMap((line) => line.points),
    sample.basis.i,
    sample.basis.j,
    ...sample.eigen.flatMap((direction) => [
      { x: direction.x * 4, y: direction.y * 4 },
      { x: -direction.x * 4, y: -direction.y * 4 }
    ])
  ];
  const maxExtent = Math.max(3.5, ...points.map((point) => Math.max(Math.abs(point.x), Math.abs(point.y)))) * 1.08;

  return {
    minX: -maxExtent,
    maxX: maxExtent,
    minY: -maxExtent,
    maxY: maxExtent
  };
}

function renderSvgAnnotations(
  scene: MathscapeScene,
  fn: (x: number) => number,
  minX: number,
  maxX: number,
  toSvgX: (x: number) => number,
  toSvgY: (y: number) => number,
  timeSeconds: number
): string {
  const annotation = scene.annotation;
  if (!annotation.showTracePoint) return '';

  const domainSpan = maxX - minX || 1;
  const progress = Math.max(0, Math.min(1, timeSeconds / Math.max(1, scene.durationSeconds)));
  const traceX = annotation.animateTracePoint
    ? minX + domainSpan * progress
    : Math.max(minX, Math.min(maxX, annotation.traceX));
  const traceY = fn(traceX);
  if (!Number.isFinite(traceY)) return '';

  const screenX = toSvgX(traceX);
  const screenY = toSvgY(traceY);
  const pieces: string[] = [];

  if (annotation.showTangent) {
    const h = Math.max(0.0001, domainSpan / 3000);
    const leftY = fn(traceX - h);
    const rightY = fn(traceX + h);
    if (Number.isFinite(leftY) && Number.isFinite(rightY)) {
      const slope = (rightY - leftY) / (2 * h);
      const tangentHalfWidth = domainSpan * 0.18;
      const x1 = Math.max(minX, traceX - tangentHalfWidth);
      const x2 = Math.min(maxX, traceX + tangentHalfWidth);
      pieces.push(
        `<line x1="${round(toSvgX(x1))}" y1="${round(toSvgY(traceY + slope * (x1 - traceX)))}" x2="${round(toSvgX(x2))}" y2="${round(toSvgY(traceY + slope * (x2 - traceX)))}" stroke="rgba(233, 196, 106, 0.82)" stroke-width="3" stroke-dasharray="16 12"/>`
      );
    }
  }

  pieces.push(`<circle cx="${round(screenX)}" cy="${round(screenY)}" r="10" fill="${svgAxisColor(scene.visual.colorMap)}" stroke="#edf2f4" stroke-width="3"/>`);
  pieces.push(`<text x="${round(screenX + 18)}" y="${round(screenY - 20)}" fill="#edf2f4" font-family="Arial, sans-serif" font-size="18">x=${traceX.toFixed(2)}</text>`);

  return `<g aria-label="plot annotations">${pieces.join('')}</g>`;
}

function renderSvgOverlay(scene: MathscapeScene, timeSeconds: number, width: number, height: number): string {
  if (!scene.overlay.enabled) return '';

  const scale = width / 1920;
  const margin = 56 * scale;
  const cardScale = Math.max(0.7, Math.min(1.4, scene.overlay.cardScale));
  const cardWidth = 650 * scale * cardScale;
  const items: string[] = [];

  if (scene.overlay.showFormula) {
    const cardHeight = svgOverlayCardHeight(1, scale, cardScale);
    const position = svgOverlayPosition(width, height, scene.overlay.formulaPosition, cardWidth, cardHeight, margin);
    items.push(
      renderSvgOverlayCard(position.x, position.y, cardWidth, cardHeight, scale, cardScale, 'Graph equation', [
        scene.expression
      ])
    );
  }

  return `<g aria-label="presentation overlay">${items.join('')}</g>`;
}

function drawOverlayCard(
  context: CanvasRenderingContext2D,
  options: { x: number; y: number; width: number; scale: number; title: string; lines: string[] }
): void {
  const scale = context.canvas.width / 1920;
  const metrics = overlayCardMetrics(context, options.lines, options.scale);
  const padding = metrics.padding;
  const lineHeight = metrics.lineHeight;
  const height = metrics.height;

  context.fillStyle = 'rgba(12, 17, 22, 0.86)';
  roundRect(context, options.x, options.y, options.width, height, 14 * scale);
  context.fill();
  context.strokeStyle = 'rgba(143, 188, 230, 0.72)';
  context.lineWidth = 2 * scale;
  context.stroke();

  context.fillStyle = '#e9c46a';
  context.font = `700 ${18 * scale * options.scale}px Arial, sans-serif`;
  context.fillText(options.title.toUpperCase(), options.x + padding, options.y + padding);

  context.fillStyle = '#edf2f4';
  context.font = `500 ${27 * scale * options.scale}px Arial, sans-serif`;
  options.lines.forEach((line, index) => {
    context.fillText(line, options.x + padding, options.y + padding + 34 * scale * options.scale + index * lineHeight);
  });
}

function overlayCardMetrics(
  context: CanvasRenderingContext2D,
  lines: string[],
  cardScale: number
): { padding: number; lineHeight: number; height: number } {
  const scale = context.canvas.width / 1920;
  const padding = 22 * scale * cardScale;
  const lineHeight = 36 * scale * cardScale;
  const height = padding * 2 + 30 * scale * cardScale + lines.length * lineHeight;

  return { padding, lineHeight, height };
}

function overlayCardPosition(
  canvas: HTMLCanvasElement,
  position: OverlayPosition,
  width: number,
  height: number,
  margin: number
): { x: number; y: number } {
  const left = position.endsWith('left');
  const top = position.startsWith('top');

  return {
    x: left ? margin : canvas.width - margin - width,
    y: top ? margin : canvas.height - margin - height
  };
}

function svgOverlayCardHeight(lineCount: number, scale: number, cardScale: number): number {
  const padding = 22 * scale * cardScale;
  const lineHeight = 36 * scale * cardScale;
  return padding * 2 + 30 * scale * cardScale + lineCount * lineHeight;
}

function svgOverlayPosition(
  canvasWidth: number,
  canvasHeight: number,
  position: OverlayPosition,
  width: number,
  height: number,
  margin: number
): { x: number; y: number } {
  const left = position.endsWith('left');
  const top = position.startsWith('top');

  return {
    x: left ? margin : canvasWidth - margin - width,
    y: top ? margin : canvasHeight - margin - height
  };
}

function renderSvgOverlayCard(
  x: number,
  y: number,
  width: number,
  height: number,
  scale: number,
  cardScale: number,
  title: string,
  lines: string[]
): string {
  const padding = 22 * scale * cardScale;
  const titleSize = 18 * scale * cardScale;
  const bodySize = 27 * scale * cardScale;
  const lineHeight = 36 * scale * cardScale;
  const bodyTop = y + padding + 34 * scale * cardScale;
  const body = lines
    .map(
      (line, index) =>
        `<text x="${round(x + padding)}" y="${round(bodyTop + index * lineHeight)}" fill="#edf2f4" font-family="Arial, sans-serif" font-size="${round(bodySize)}">${escapeXml(line)}</text>`
    )
    .join('');

  return [
    `<g>`,
    `<rect x="${round(x)}" y="${round(y)}" width="${round(width)}" height="${round(height)}" rx="${round(14 * scale)}" fill="rgba(12, 17, 22, 0.86)" stroke="rgba(143, 188, 230, 0.72)" stroke-width="${round(2 * scale)}"/>`,
    `<text x="${round(x + padding)}" y="${round(y + padding)}" fill="#e9c46a" font-family="Arial, sans-serif" font-weight="700" font-size="${round(titleSize)}">${escapeXml(title.toUpperCase())}</text>`,
    body,
    `</g>`
  ].join('');
}

function roundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

function getActiveDerivationStep(scene: MathscapeScene, timeSeconds: number): DerivationStep | undefined {
  return (
    [...scene.derivationSteps]
      .sort((left, right) => left.timeSeconds - right.timeSeconds)
      .findLast((step) => step.timeSeconds <= timeSeconds) ?? scene.derivationSteps[0]
  );
}

function svgPlotColor(colorMap: MathscapeScene['visual']['colorMap']): string {
  if (colorMap === 'fireline') return '#f4a261';
  if (colorMap === 'viridis') return '#72d38b';
  return '#8fbce6';
}

function svgAxisColor(colorMap: MathscapeScene['visual']['colorMap']): string {
  if (colorMap === 'fireline') return '#f4d35e';
  if (colorMap === 'viridis') return '#7cc7d8';
  return '#e9c46a';
}

function svgBackgroundMidColor(colorMap: MathscapeScene['visual']['colorMap']): string {
  if (colorMap === 'fireline') return '#1b1713';
  if (colorMap === 'viridis') return '#0c1a16';
  return '#0d1822';
}

function svgGlowColor(colorMap: MathscapeScene['visual']['colorMap'], alpha: number): string {
  if (colorMap === 'fireline') return `rgba(244, 162, 97, ${alpha})`;
  if (colorMap === 'viridis') return `rgba(114, 211, 139, ${alpha})`;
  return `rgba(143, 188, 230, ${alpha})`;
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function dataUrlToCanvas(dataUrl: string): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = createExportCanvas(image.width, image.height);
      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('Could not create export canvas context'));
        return;
      }

      context.drawImage(image, 0, 0);
      resolve(canvas);
    };
    image.onerror = () => reject(new Error('Could not load rendered frame'));
    image.src = dataUrl;
  });
}

function downloadCanvasFrame(canvas: HTMLCanvasElement, filename: string): Promise<void> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        downloadBlob(blob, filename);
      }
      resolve();
    }, 'image/png');
  });
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

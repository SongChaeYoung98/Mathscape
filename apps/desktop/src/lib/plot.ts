import { compileExpression } from './expression';
import {
  defaultSceneAnnotationSettings,
  defaultSceneVisualSettings,
  type ColorMap,
  type MathscapeParameters,
  type PlotMode,
  type SceneAnnotationSettings,
  type SceneVisualSettings
} from './project';

export type PlotPoint = {
  x: number;
  y: number;
};

export type VectorFieldArrow = {
  x: number;
  y: number;
  dx: number;
  dy: number;
  magnitude: number;
};

export type VectorTrajectoryPoint = {
  x: number;
  y: number;
};

export type LinearTransformLine = {
  points: PlotPoint[];
  axis: 'x' | 'y';
  index: number;
};

export type LinearTransformSample = {
  lines: LinearTransformLine[];
  basis: {
    i: PlotPoint;
    j: PlotPoint;
  };
  eigen: PlotPoint[];
};

export type PlotFunction = (x: number) => number;

export type PlotAnnotationOptions = {
  annotation?: SceneAnnotationSettings;
  progress?: number;
  fn?: PlotFunction;
  transparentBackground?: boolean;
};

export type VectorFieldRenderOptions = {
  transparentBackground?: boolean;
  trajectory?: VectorTrajectoryPoint[];
};

export type LinearTransformRenderOptions = {
  transparentBackground?: boolean;
};

export function createPlotFunction(mode: PlotMode, parameters: MathscapeParameters, expression?: string): PlotFunction {
  if (mode === 'expression' && expression) {
    try {
      const compiled = compileExpression(expression);
      const fallback = createSineFunction(parameters);

      return (x) => {
        try {
          const value = compiled(x, parameters);
          return Number.isFinite(value) ? value : fallback(x);
        } catch {
          return fallback(x);
        }
      };
    } catch {
      return createSineFunction(parameters);
    }
  }

  if (mode === 'fourier-square') {
    const harmonicCount = Math.max(1, Math.min(21, Math.round(parameters.frequency * 5)));

    return (x) => {
      let sum = 0;

      for (let term = 1; term <= harmonicCount; term += 1) {
        const odd = term * 2 - 1;
        sum += Math.sin(odd * x + parameters.phase) / odd;
      }

      return parameters.amplitude * (4 / Math.PI) * sum;
    };
  }

  return createSineFunction(parameters);
}

function createSineFunction(parameters: MathscapeParameters): PlotFunction {
  return (x) => parameters.amplitude * Math.sin(parameters.frequency * x + parameters.phase);
}

export function sampleFunction(fn: PlotFunction, minX: number, maxX: number, samples: number): PlotPoint[] {
  const points: PlotPoint[] = [];
  const count = Math.max(2, samples);
  const step = (maxX - minX) / (count - 1);

  for (let index = 0; index < count; index += 1) {
    const x = minX + step * index;
    const y = fn(x);

    if (Number.isFinite(y)) {
      points.push({ x, y });
    }
  }

  return points;
}

export function sampleParametricCurve(
  parameters: MathscapeParameters,
  samples = 720,
  minT = 0,
  maxT = Math.PI * 2
): PlotPoint[] {
  const points: PlotPoint[] = [];
  const count = Math.max(16, Math.min(2400, Math.round(samples)));
  const step = (maxT - minT) / (count - 1 || 1);
  const scale = Math.max(0.2, parameters.amplitude);
  const ratio = Math.max(1, Math.round(parameters.frequency));
  const phase = parameters.phase;

  for (let index = 0; index < count; index += 1) {
    const t = minT + step * index;
    const x = scale * Math.sin(ratio * t + phase);
    const y = scale * Math.sin((ratio + 1) * t);

    if (Number.isFinite(x) && Number.isFinite(y)) {
      points.push({ x, y });
    }
  }

  return points;
}

export function sampleVectorField(parameters: MathscapeParameters, gridSize = 17, span = 4): VectorFieldArrow[] {
  const arrows: VectorFieldArrow[] = [];
  const count = Math.max(5, Math.min(31, Math.round(gridSize)));
  const step = (span * 2) / (count - 1);
  const stiffness = Math.max(0.05, parameters.amplitude);
  const damping = Math.max(0, parameters.frequency - 1);
  const drive = parameters.phase;

  for (let row = 0; row < count; row += 1) {
    for (let column = 0; column < count; column += 1) {
      const x = -span + column * step;
      const y = -span + row * step;
      const [rawDx, rawDy] = vectorFieldDerivative(x, y, stiffness, damping, drive);
      const magnitude = Math.hypot(rawDx, rawDy);
      if (!Number.isFinite(magnitude) || magnitude === 0) continue;

      arrows.push({
        x,
        y,
        dx: rawDx / magnitude,
        dy: rawDy / magnitude,
        magnitude
      });
    }
  }

  return arrows;
}

export function sampleVectorTrajectory(
  parameters: MathscapeParameters,
  steps = 220,
  stepSize = 0.035,
  initial: VectorTrajectoryPoint = { x: -2.8, y: 1.15 },
  span = 4
): VectorTrajectoryPoint[] {
  const points: VectorTrajectoryPoint[] = [{ ...initial }];
  const count = Math.max(2, Math.min(1000, Math.round(steps)));
  const stiffness = Math.max(0.05, parameters.amplitude);
  const damping = Math.max(0, parameters.frequency - 1);
  const drive = parameters.phase;
  let x = initial.x;
  let y = initial.y;

  for (let index = 1; index < count; index += 1) {
    const [k1x, k1y] = vectorFieldDerivative(x, y, stiffness, damping, drive);
    const [k2x, k2y] = vectorFieldDerivative(x + k1x * stepSize * 0.5, y + k1y * stepSize * 0.5, stiffness, damping, drive);
    const [k3x, k3y] = vectorFieldDerivative(x + k2x * stepSize * 0.5, y + k2y * stepSize * 0.5, stiffness, damping, drive);
    const [k4x, k4y] = vectorFieldDerivative(x + k3x * stepSize, y + k3y * stepSize, stiffness, damping, drive);

    x += (stepSize / 6) * (k1x + 2 * k2x + 2 * k3x + k4x);
    y += (stepSize / 6) * (k1y + 2 * k2y + 2 * k3y + k4y);

    if (!Number.isFinite(x) || !Number.isFinite(y)) break;
    points.push({
      x: Math.max(-span, Math.min(span, x)),
      y: Math.max(-span, Math.min(span, y))
    });
  }

  return points;
}

export function sampleLinearTransform(parameters: MathscapeParameters, gridSize = 9, samplesPerLine = 90): LinearTransformSample {
  const count = Math.max(5, Math.min(15, Math.round(gridSize)));
  const lineSamples = Math.max(12, Math.min(180, Math.round(samplesPerLine)));
  const span = 3;
  const step = (span * 2) / (count - 1);
  const lines: LinearTransformLine[] = [];
  const matrix = linearTransformMatrix(parameters);

  for (let index = 0; index < count; index += 1) {
    const coordinate = -span + index * step;
    const horizontal: PlotPoint[] = [];
    const vertical: PlotPoint[] = [];

    for (let sample = 0; sample < lineSamples; sample += 1) {
      const t = -span + (sample / (lineSamples - 1 || 1)) * span * 2;
      horizontal.push(applyMatrix(matrix, t, coordinate));
      vertical.push(applyMatrix(matrix, coordinate, t));
    }

    lines.push({ axis: 'x', index, points: horizontal });
    lines.push({ axis: 'y', index, points: vertical });
  }

  return {
    lines,
    basis: {
      i: applyMatrix(matrix, 1, 0),
      j: applyMatrix(matrix, 0, 1)
    },
    eigen: estimateEigenDirections(matrix)
  };
}

export function drawLinearTransform(
  canvas: HTMLCanvasElement,
  sample: LinearTransformSample,
  visual: SceneVisualSettings = defaultSceneVisualSettings,
  options: LinearTransformRenderOptions = {}
): void {
  const context = canvas.getContext('2d');
  if (!context || sample.lines.length === 0) return;

  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const width = rect.width || canvas.width / dpr || 720;
  const height = rect.height || canvas.height / dpr || 480;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, width, height);

  if (!options.transparentBackground) {
    const background = context.createLinearGradient(0, 0, width, height);
    background.addColorStop(0, '#101820');
    background.addColorStop(0.5, backgroundMidColor(visual.colorMap));
    background.addColorStop(1, '#0a1117');
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);
  }

  const bounds = transformedBounds(sample);
  const padding = 40;
  const toScreenX = (x: number) => padding + ((x - bounds.minX) / (bounds.maxX - bounds.minX || 1)) * (width - padding * 2);
  const toScreenY = (y: number) => height - padding - ((y - bounds.minY) / (bounds.maxY - bounds.minY || 1)) * (height - padding * 2);

  context.save();
  context.lineWidth = 1;
  const gridCount = sample.lines.length / 2;
  sample.lines.forEach((line) => {
    const centerLine = line.index === Math.floor(gridCount / 2);
    context.strokeStyle = centerLine ? axisColor(visual.colorMap) : line.axis === 'x' ? 'rgba(124, 199, 216, 0.3)' : 'rgba(233, 196, 106, 0.26)';
    context.shadowColor = centerLine ? glowColor(visual.colorMap, 0.42) : 'rgba(0, 0, 0, 0)';
    context.shadowBlur = centerLine ? 8 : 0;
    drawPlotPath(context, line.points, toScreenX, toScreenY);
    context.stroke();
  });
  context.restore();

  drawVector(context, toScreenX, toScreenY, sample.basis.i, '#f07167', 'T(e1)', visual.lineWeight);
  drawVector(context, toScreenX, toScreenY, sample.basis.j, '#e9c46a', 'T(e2)', visual.lineWeight);
  sample.eigen.forEach((direction) => drawEigenLine(context, toScreenX, toScreenY, direction, visual.colorMap));
}

function transformedBounds(sample: LinearTransformSample) {
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

function drawVector(
  context: CanvasRenderingContext2D,
  toScreenX: (x: number) => number,
  toScreenY: (y: number) => number,
  vector: PlotPoint,
  color: string,
  label: string,
  lineWeight: number
): void {
  const startX = toScreenX(0);
  const startY = toScreenY(0);
  const endX = toScreenX(vector.x);
  const endY = toScreenY(vector.y);
  const angle = Math.atan2(endY - startY, endX - startX);
  const head = 12;

  context.save();
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = Math.max(2, lineWeight);
  context.shadowColor = color;
  context.shadowBlur = 12;
  context.beginPath();
  context.moveTo(startX, startY);
  context.lineTo(endX, endY);
  context.stroke();
  context.beginPath();
  context.moveTo(endX, endY);
  context.lineTo(endX - head * Math.cos(angle - Math.PI / 6), endY - head * Math.sin(angle - Math.PI / 6));
  context.lineTo(endX - head * Math.cos(angle + Math.PI / 6), endY - head * Math.sin(angle + Math.PI / 6));
  context.closePath();
  context.fill();
  context.shadowBlur = 0;
  context.font = '700 12px Arial, sans-serif';
  context.fillText(label, endX + 10, endY - 14);
  context.restore();
}

function drawEigenLine(
  context: CanvasRenderingContext2D,
  toScreenX: (x: number) => number,
  toScreenY: (y: number) => number,
  direction: PlotPoint,
  colorMap: ColorMap
): void {
  context.save();
  context.strokeStyle = glowColor(colorMap, 0.86);
  context.lineWidth = 2;
  context.setLineDash([12, 10]);
  context.beginPath();
  context.moveTo(toScreenX(-direction.x * 4), toScreenY(-direction.y * 4));
  context.lineTo(toScreenX(direction.x * 4), toScreenY(direction.y * 4));
  context.stroke();
  context.restore();
}

function linearTransformMatrix(parameters: MathscapeParameters): [number, number, number, number] {
  const stretchX = Math.max(0.25, parameters.amplitude);
  const stretchY = Math.max(0.25, 2.2 - parameters.amplitude * 0.55);
  const shear = (parameters.frequency - 1) * 0.55;
  const angle = parameters.phase;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  return [
    cos * stretchX - sin * shear,
    cos * shear - sin * stretchY,
    sin * stretchX + cos * shear,
    sin * shear + cos * stretchY
  ];
}

function applyMatrix(matrix: [number, number, number, number], x: number, y: number): PlotPoint {
  return {
    x: matrix[0] * x + matrix[1] * y,
    y: matrix[2] * x + matrix[3] * y
  };
}

function estimateEigenDirections(matrix: [number, number, number, number]): PlotPoint[] {
  const [a, b, c, d] = matrix;
  const trace = a + d;
  const determinant = a * d - b * c;
  const discriminant = trace * trace - 4 * determinant;
  if (discriminant < 0) return [];

  return [0.5 * (trace + Math.sqrt(discriminant)), 0.5 * (trace - Math.sqrt(discriminant))]
    .map((lambda) => {
      const x = Math.abs(b) > Math.abs(c) ? b : lambda - d;
      const y = Math.abs(b) > Math.abs(c) ? lambda - a : c;
      const length = Math.hypot(x, y) || 1;
      return { x: x / length, y: y / length };
    })
    .filter((direction, index, directions) => index === 0 || Math.abs(direction.x * directions[0].y - direction.y * directions[0].x) > 0.08);
}

export function drawVectorField(
  canvas: HTMLCanvasElement,
  arrows: VectorFieldArrow[],
  visual: SceneVisualSettings = defaultSceneVisualSettings,
  options: VectorFieldRenderOptions = {}
): void {
  const context = canvas.getContext('2d');
  if (!context || arrows.length === 0) return;

  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const width = rect.width || canvas.width / dpr || 720;
  const height = rect.height || canvas.height / dpr || 480;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, width, height);

  if (!options.transparentBackground) {
    const background = context.createLinearGradient(0, 0, width, height);
    background.addColorStop(0, '#101820');
    background.addColorStop(0.52, backgroundMidColor(visual.colorMap));
    background.addColorStop(1, '#0a1117');
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);
  }

  const padding = 34;
  const span = 4;
  const toScreenX = (x: number) => padding + ((x + span) / (span * 2)) * (width - padding * 2);
  const toScreenY = (y: number) => height - padding - ((y + span) / (span * 2)) * (height - padding * 2);
  const cell = Math.min(width, height) / Math.sqrt(arrows.length);
  const maxMagnitude = Math.max(1, ...arrows.map((arrow) => arrow.magnitude));

  if (visual.showAxes) {
    context.strokeStyle = '#253241';
    context.lineWidth = 1;
    for (let index = 0; index <= 8; index += 1) {
      const x = padding + (index / 8) * (width - padding * 2);
      const y = padding + (index / 8) * (height - padding * 2);
      context.beginPath();
      context.moveTo(x, padding);
      context.lineTo(x, height - padding);
      context.moveTo(padding, y);
      context.lineTo(width - padding, y);
      context.stroke();
    }
  }

  arrows.forEach((arrow) => {
    const x = toScreenX(arrow.x);
    const y = toScreenY(arrow.y);
    const length = cell * (0.28 + 0.38 * Math.min(1, arrow.magnitude / maxMagnitude));
    const x2 = x + arrow.dx * length;
    const y2 = y - arrow.dy * length;
    const angle = Math.atan2(y2 - y, x2 - x);
    const head = Math.max(4, length * 0.22);

    context.save();
    context.strokeStyle = glowColor(visual.colorMap, 0.72);
    context.fillStyle = plotColor(visual.colorMap);
    context.lineWidth = Math.max(1, visual.lineWeight * 0.55);
    context.shadowColor = glowColor(visual.colorMap, 0.45);
    context.shadowBlur = 6;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x2, y2);
    context.stroke();
    context.beginPath();
    context.moveTo(x2, y2);
    context.lineTo(x2 - head * Math.cos(angle - Math.PI / 6), y2 - head * Math.sin(angle - Math.PI / 6));
    context.lineTo(x2 - head * Math.cos(angle + Math.PI / 6), y2 - head * Math.sin(angle + Math.PI / 6));
    context.closePath();
    context.fill();
    context.restore();
  });

  if (options.trajectory && options.trajectory.length > 1) {
    context.save();
    context.strokeStyle = '#edf2f4';
    context.lineWidth = Math.max(2, visual.lineWeight * 1.25);
    context.shadowColor = glowColor(visual.colorMap, 0.82);
    context.shadowBlur = 12;
    context.beginPath();
    options.trajectory.forEach((point, index) => {
      const x = toScreenX(point.x);
      const y = toScreenY(point.y);
      if (index === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    });
    context.stroke();

    const last = options.trajectory[options.trajectory.length - 1];
    context.fillStyle = axisColor(visual.colorMap);
    context.beginPath();
    context.arc(toScreenX(last.x), toScreenY(last.y), 7, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }
}

function vectorFieldDerivative(
  x: number,
  y: number,
  stiffness: number,
  damping: number,
  drive: number
): [number, number] {
  return [y, -stiffness * Math.sin(x) - damping * y + 0.25 * Math.sin(drive + x)];
}

export function drawPlot(
  canvas: HTMLCanvasElement,
  points: PlotPoint[],
  visual: SceneVisualSettings = defaultSceneVisualSettings,
  annotationOptions: PlotAnnotationOptions = {}
): void {
  const context = canvas.getContext('2d');
  if (!context || points.length < 2) return;

  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const width = rect.width || canvas.width / dpr || 720;
  const height = rect.height || canvas.height / dpr || 480;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  context.setTransform(dpr, 0, 0, dpr, 0, 0);

  const padding = 28;
  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const minY = Math.min(-2, ...points.map((point) => point.y));
  const maxY = Math.max(2, ...points.map((point) => point.y));
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;

  const toScreenX = (x: number) => padding + ((x - minX) / spanX) * (width - padding * 2);
  const toScreenY = (y: number) => height - padding - ((y - minY) / spanY) * (height - padding * 2);

  context.clearRect(0, 0, width, height);

  if (!annotationOptions.transparentBackground) {
    const background = context.createLinearGradient(0, 0, width, height);
    background.addColorStop(0, '#101820');
    background.addColorStop(0.52, backgroundMidColor(visual.colorMap));
    background.addColorStop(1, '#0a1117');
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);

    const fieldGlow = context.createRadialGradient(
      width * 0.5,
      height * 0.42,
      0,
      width * 0.5,
      height * 0.42,
      width * 0.72
    );
    fieldGlow.addColorStop(0, glowColor(visual.colorMap, 0.16));
    fieldGlow.addColorStop(1, 'rgba(10, 17, 23, 0)');
    context.fillStyle = fieldGlow;
    context.fillRect(0, 0, width, height);
  }

  if (visual.showAxes) {
    context.strokeStyle = '#253241';
    context.lineWidth = 1;
    for (let index = 0; index <= 8; index += 1) {
      const x = padding + (index / 8) * (width - padding * 2);
      const y = padding + (index / 8) * (height - padding * 2);
      context.beginPath();
      context.moveTo(x, padding);
      context.lineTo(x, height - padding);
      context.stroke();
      context.beginPath();
      context.moveTo(padding, y);
      context.lineTo(width - padding, y);
      context.stroke();
    }
  }

  const lineWidth = Math.max(1, Math.min(12, visual.lineWeight));
  context.save();
  context.strokeStyle = glowColor(visual.colorMap, 0.28);
  context.lineWidth = lineWidth * 4;
  context.shadowColor = glowColor(visual.colorMap, 0.62);
  context.shadowBlur = 18;
  drawPlotPath(context, points, toScreenX, toScreenY);
  context.stroke();
  context.restore();

  context.save();
  context.strokeStyle = plotColor(visual.colorMap);
  context.lineWidth = lineWidth;
  context.shadowColor = glowColor(visual.colorMap, 0.45);
  context.shadowBlur = 8;
  drawPlotPath(context, points, toScreenX, toScreenY);
  context.stroke();
  context.restore();

  drawAnnotations(context, {
    annotation: annotationOptions.annotation ?? defaultSceneAnnotationSettings,
    fn: annotationOptions.fn,
    minX,
    maxX,
    toScreenX,
    toScreenY,
    progress: annotationOptions.progress ?? 0,
    colorMap: visual.colorMap
  });

  if (visual.showAxes) {
    context.strokeStyle = axisColor(visual.colorMap);
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(padding, toScreenY(0));
    context.lineTo(width - padding, toScreenY(0));
    context.moveTo(toScreenX(0), padding);
    context.lineTo(toScreenX(0), height - padding);
    context.stroke();
  }
}

function drawPlotPath(
  context: CanvasRenderingContext2D,
  points: PlotPoint[],
  toScreenX: (x: number) => number,
  toScreenY: (y: number) => number
): void {
  context.beginPath();
  points.forEach((point, index) => {
    const x = toScreenX(point.x);
    const y = toScreenY(point.y);
    if (index === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  });
}

function drawAnnotations(
  context: CanvasRenderingContext2D,
  options: {
    annotation: SceneAnnotationSettings;
    fn?: PlotFunction;
    minX: number;
    maxX: number;
    toScreenX: (x: number) => number;
    toScreenY: (y: number) => number;
    progress: number;
    colorMap: ColorMap;
  }
): void {
  const { annotation, fn, minX, maxX, toScreenX, toScreenY, progress, colorMap } = options;
  if (!fn || !annotation.showTracePoint) return;

  const domainSpan = maxX - minX || 1;
  const traceX = annotation.animateTracePoint
    ? minX + domainSpan * Math.max(0, Math.min(1, progress))
    : Math.max(minX, Math.min(maxX, annotation.traceX));
  const traceY = fn(traceX);
  if (!Number.isFinite(traceY)) return;

  const screenX = toScreenX(traceX);
  const screenY = toScreenY(traceY);
  const accent = axisColor(colorMap);

  if (annotation.showTangent) {
    const h = Math.max(0.0001, domainSpan / 3000);
    const leftY = fn(traceX - h);
    const rightY = fn(traceX + h);

    if (Number.isFinite(leftY) && Number.isFinite(rightY)) {
      const slope = (rightY - leftY) / (2 * h);
      const tangentHalfWidth = domainSpan * 0.18;
      const x1 = Math.max(minX, traceX - tangentHalfWidth);
      const x2 = Math.min(maxX, traceX + tangentHalfWidth);
      const y1 = traceY + slope * (x1 - traceX);
      const y2 = traceY + slope * (x2 - traceX);

      context.save();
      context.strokeStyle = 'rgba(233, 196, 106, 0.82)';
      context.lineWidth = 2;
      context.setLineDash([10, 8]);
      context.beginPath();
      context.moveTo(toScreenX(x1), toScreenY(y1));
      context.lineTo(toScreenX(x2), toScreenY(y2));
      context.stroke();
      context.restore();
    }
  }

  context.save();
  context.strokeStyle = 'rgba(237, 242, 244, 0.92)';
  context.fillStyle = accent;
  context.lineWidth = 2;
  context.beginPath();
  context.arc(screenX, screenY, 7, 0, Math.PI * 2);
  context.fill();
  context.stroke();

  context.fillStyle = 'rgba(15, 20, 25, 0.84)';
  context.strokeStyle = 'rgba(143, 188, 230, 0.58)';
  roundRect(context, screenX + 12, screenY - 34, 104, 26, 7);
  context.fill();
  context.stroke();
  context.fillStyle = '#edf2f4';
  context.font = '12px Arial, sans-serif';
  context.fillText(`x=${traceX.toFixed(2)}`, screenX + 22, screenY - 17);
  context.restore();
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

function plotColor(colorMap: ColorMap): string {
  if (colorMap === 'fireline') return '#f4a261';
  if (colorMap === 'viridis') return '#72d38b';
  return '#8fbce6';
}

function backgroundMidColor(colorMap: ColorMap): string {
  if (colorMap === 'fireline') return '#1b1713';
  if (colorMap === 'viridis') return '#0c1a16';
  return '#0d1822';
}

function glowColor(colorMap: ColorMap, alpha: number): string {
  if (colorMap === 'fireline') return `rgba(244, 162, 97, ${alpha})`;
  if (colorMap === 'viridis') return `rgba(114, 211, 139, ${alpha})`;
  return `rgba(143, 188, 230, ${alpha})`;
}

function axisColor(colorMap: ColorMap): string {
  if (colorMap === 'fireline') return '#f4d35e';
  if (colorMap === 'viridis') return '#7cc7d8';
  return '#e9c46a';
}

import { describe, expect, it } from 'vitest';
import {
  createPlotFunction,
  sampleLinearTransform,
  sampleFunction,
  sampleParametricCurve,
  sampleVectorField,
  sampleVectorTrajectory
} from './plot';
import type { MathscapeParameters } from './project';

const baseParameters: MathscapeParameters = {
  amplitude: 2,
  frequency: 3,
  phase: 0.5
};

function expectClose(actual: number, expected: number): void {
  expect(actual).toBeCloseTo(expected, 10);
}

function fourierSquareExpected(x: number, parameters: MathscapeParameters, harmonicCount: number): number {
  let sum = 0;

  for (let term = 1; term <= harmonicCount; term += 1) {
    const odd = term * 2 - 1;
    sum += Math.sin(odd * x + parameters.phase) / odd;
  }

  return parameters.amplitude * (4 / Math.PI) * sum;
}

describe('createPlotFunction', () => {
  it('creates a sine graph function from scene parameters', () => {
    const fn = createPlotFunction('sine', baseParameters);

    expectClose(fn(0), baseParameters.amplitude * Math.sin(baseParameters.phase));
    expectClose(fn(Math.PI / 6), baseParameters.amplitude * Math.sin(baseParameters.frequency * (Math.PI / 6) + baseParameters.phase));
  });

  it('creates an editable expression graph function with x and parameter variables', () => {
    const fn = createPlotFunction('expression', baseParameters, 'a * cos(b * x + phi)');

    expectClose(fn(0), baseParameters.amplitude * Math.cos(baseParameters.frequency * 0 + baseParameters.phase));
    expectClose(fn(0.75), baseParameters.amplitude * Math.cos(baseParameters.frequency * 0.75 + baseParameters.phase));
  });

  it('falls back to sine output when an editable expression cannot be parsed', () => {
    const fn = createPlotFunction('expression', baseParameters, 'a *');
    const fallback = createPlotFunction('sine', baseParameters);

    expectClose(fn(0.25), fallback(0.25));
  });

  it('falls back per sample when an editable expression returns a non-finite value', () => {
    const fn = createPlotFunction('expression', baseParameters, 'sqrt(x - 2)');
    const fallback = createPlotFunction('sine', baseParameters);

    expectClose(fn(0), fallback(0));
    expectClose(fn(3), 1);
  });

  it('creates a Fourier square-wave approximation and clamps high harmonic counts', () => {
    const nominal = createPlotFunction('fourier-square', { amplitude: 1, frequency: 1, phase: 0 });
    const clamped = createPlotFunction('fourier-square', { amplitude: 1.5, frequency: 99, phase: 0.25 });

    expectClose(nominal(Math.PI / 2), fourierSquareExpected(Math.PI / 2, { amplitude: 1, frequency: 1, phase: 0 }, 5));
    expectClose(clamped(0.8), fourierSquareExpected(0.8, { amplitude: 1.5, frequency: 99, phase: 0.25 }, 21));
  });
});

describe('sampleFunction', () => {
  it('always samples at least the domain endpoints', () => {
    const points = sampleFunction((x) => x * 2, -1, 1, 1);

    expect(points).toEqual([
      { x: -1, y: -2 },
      { x: 1, y: 2 }
    ]);
  });

  it('filters non-finite sample values from the generated point list', () => {
    const points = sampleFunction((x) => (x === 0 ? Number.POSITIVE_INFINITY : x), -1, 1, 3);

    expect(points).toEqual([
      { x: -1, y: -1 },
      { x: 1, y: 1 }
    ]);
  });
});

describe('sampleParametricCurve', () => {
  it('samples a bounded Lissajous-style curve from scene parameters', () => {
    const points = sampleParametricCurve({ amplitude: 1.5, frequency: 2.4, phase: 0.7 }, 120);

    expect(points).toHaveLength(120);
    for (const point of points) {
      expect(point.x).toBeGreaterThanOrEqual(-1.5);
      expect(point.x).toBeLessThanOrEqual(1.5);
      expect(point.y).toBeGreaterThanOrEqual(-1.5);
      expect(point.y).toBeLessThanOrEqual(1.5);
    }
  });

  it('clamps parametric curve sample density to a practical range', () => {
    expect(sampleParametricCurve(baseParameters, 4).length).toBe(16);
    expect(sampleParametricCurve(baseParameters, 9999).length).toBe(2400);
  });
});

describe('sampleVectorField', () => {
  it('samples normalized vector-field arrows with source magnitudes', () => {
    const arrows = sampleVectorField({ amplitude: 1.2, frequency: 1.4, phase: 0.5 }, 9, 3);

    expect(arrows.length).toBeGreaterThan(70);
    expect(arrows.length).toBeLessThanOrEqual(81);
    for (const arrow of arrows) {
      expect(Number.isFinite(arrow.x)).toBe(true);
      expect(Number.isFinite(arrow.y)).toBe(true);
      expect(arrow.magnitude).toBeGreaterThan(0);
      expect(Math.hypot(arrow.dx, arrow.dy)).toBeCloseTo(1, 10);
    }
  });

  it('clamps vector-field grid density to a practical range', () => {
    expect(sampleVectorField(baseParameters, 2, 4).length).toBeGreaterThan(20);
    expect(sampleVectorField(baseParameters, 99, 4).length).toBeLessThanOrEqual(31 * 31);
  });
});

describe('sampleLinearTransform', () => {
  it('samples a transformed grid with basis vectors and eigen directions', () => {
    const sample = sampleLinearTransform({ amplitude: 1.4, frequency: 1.7, phase: 0 }, 9, 40);

    expect(sample.lines).toHaveLength(18);
    expect(sample.lines[0].points).toHaveLength(40);
    expect(Number.isFinite(sample.basis.i.x)).toBe(true);
    expect(Number.isFinite(sample.basis.j.y)).toBe(true);
    expect(sample.eigen.length).toBeGreaterThan(0);
  });

  it('clamps transformed grid density to a practical range', () => {
    expect(sampleLinearTransform(baseParameters, 2, 4).lines.length).toBe(10);
    expect(sampleLinearTransform(baseParameters, 99, 999).lines.length).toBe(30);
    expect(sampleLinearTransform(baseParameters, 99, 999).lines[0].points.length).toBe(180);
  });
});

describe('sampleVectorTrajectory', () => {
  it('integrates a finite phase-space trajectory within the visible domain', () => {
    const points = sampleVectorTrajectory({ amplitude: 1.2, frequency: 1.4, phase: 0.5 }, 120, 0.04);

    expect(points.length).toBe(120);
    for (const point of points) {
      expect(Number.isFinite(point.x)).toBe(true);
      expect(Number.isFinite(point.y)).toBe(true);
      expect(point.x).toBeGreaterThanOrEqual(-4);
      expect(point.x).toBeLessThanOrEqual(4);
      expect(point.y).toBeGreaterThanOrEqual(-4);
      expect(point.y).toBeLessThanOrEqual(4);
    }
  });
});

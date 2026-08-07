import { describe, expect, it } from 'vitest';
import { compileExpression, validateExpression } from './expression';
import type { MathscapeParameters } from './project';

const parameters: MathscapeParameters = {
  amplitude: 2,
  frequency: 3,
  phase: Math.PI / 4
};

function evaluate(expression: string, x: number) {
  return compileExpression(expression)(x, parameters);
}

describe('compileExpression', () => {
  it('evaluates variables, constants, arithmetic, and elementary functions', () => {
    expect(evaluate('a*sin(b*x+phi)', 0)).toBeCloseTo(Math.SQRT2);
    expect(evaluate('sqrt(4)+log(e)+abs(-3)', 0)).toBeCloseTo(6);
    expect(evaluate('cos(pi)+exp(0)', 0)).toBeCloseTo(0);
  });

  it('keeps exponentiation right-associative and unary minus lower than exponentiation', () => {
    expect(evaluate('2^3^2', 0)).toBe(512);
    expect(evaluate('-x^2', 2)).toBe(-4);
    expect(evaluate('(-x)^2', 2)).toBe(4);
  });

  it('supports scientific notation and whitespace', () => {
    expect(evaluate(' 1e-3 * x + 2 ', 500)).toBeCloseTo(2.5);
  });

  it('throws clear errors for malformed or unsupported expressions', () => {
    expect(() => evaluate('a*', 0)).toThrow('Missing operand');
    expect(() => evaluate('sin(', 0)).toThrow('Mismatched parentheses');
    expect(() => evaluate('theta + x', 1)).toThrow('Unknown variable: theta');
    expect(() => evaluate('x @ 2', 1)).toThrow('Unexpected character: @');
  });
});

describe('validateExpression', () => {
  it('accepts finite real expressions over the sample range', () => {
    expect(validateExpression('a*cos(b*x+phi)')).toEqual({ ok: true, message: 'Expression OK' });
  });

  it('rejects empty, malformed, and non-real sample-domain expressions', () => {
    expect(validateExpression('')).toEqual({ ok: false, message: 'Expression is empty' });
    expect(validateExpression('a*')).toEqual({ ok: false, message: 'Missing operand' });
    expect(validateExpression('sqrt(x-2)')).toEqual({
      ok: false,
      message: 'Expression is outside the visible real domain'
    });
  });
});

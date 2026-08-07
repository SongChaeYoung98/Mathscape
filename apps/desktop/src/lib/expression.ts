import type { MathscapeParameters } from './project';

type Token =
  | { type: 'number'; value: number }
  | { type: 'variable'; value: string }
  | { type: 'function'; value: string }
  | { type: 'operator'; value: Operator }
  | { type: 'left-paren' }
  | { type: 'right-paren' };

type Operator = '+' | '-' | '*' | '/' | '^' | 'neg';

const functions: Record<string, (value: number) => number> = {
  abs: Math.abs,
  cos: Math.cos,
  exp: Math.exp,
  log: Math.log,
  sin: Math.sin,
  sqrt: Math.sqrt,
  tan: Math.tan
};

const operators: Record<Operator, { precedence: number; rightAssociative: boolean; arity: 1 | 2 }> = {
  '+': { precedence: 1, rightAssociative: false, arity: 2 },
  '-': { precedence: 1, rightAssociative: false, arity: 2 },
  '*': { precedence: 2, rightAssociative: false, arity: 2 },
  '/': { precedence: 2, rightAssociative: false, arity: 2 },
  '^': { precedence: 4, rightAssociative: true, arity: 2 },
  neg: { precedence: 3, rightAssociative: true, arity: 1 }
};

export type CompiledExpression = (x: number, parameters: MathscapeParameters) => number;
export type ExpressionValidation = { ok: true; message: string } | { ok: false; message: string };

const sampleParameters: MathscapeParameters = {
  amplitude: 1,
  frequency: 1,
  phase: 0
};

export function compileExpression(expression: string): CompiledExpression {
  const rpn = toReversePolish(tokenize(expression));

  return (x, parameters) => evaluateReversePolish(rpn, x, parameters);
}

export function validateExpression(expression: string): ExpressionValidation {
  if (expression.trim().length === 0) {
    return { ok: false, message: 'Expression is empty' };
  }

  try {
    const compiled = compileExpression(expression);
    for (const x of [-1, 0, 1]) {
      const value = compiled(x, sampleParameters);
      if (!Number.isFinite(value)) {
        return { ok: false, message: 'Expression is outside the visible real domain' };
      }
    }
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Invalid expression' };
  }

  return { ok: true, message: 'Expression OK' };
}

function tokenize(expression: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  let previous: Token | undefined;

  while (index < expression.length) {
    const char = expression[index];

    if (/\s/.test(char)) {
      index += 1;
      continue;
    }

    if (/\d|\./.test(char)) {
      const start = index;
      index += 1;

      while (index < expression.length && /[\d.]/.test(expression[index])) {
        index += 1;
      }

      if (index < expression.length && /e/i.test(expression[index])) {
        index += 1;
        if (/[+-]/.test(expression[index])) index += 1;
        while (index < expression.length && /\d/.test(expression[index])) {
          index += 1;
        }
      }

      const value = Number(expression.slice(start, index));
      if (!Number.isFinite(value)) throw new Error('Invalid number');

      previous = { type: 'number', value };
      tokens.push(previous);
      continue;
    }

    if (/[a-z_]/i.test(char)) {
      const start = index;
      index += 1;

      while (index < expression.length && /[a-z0-9_]/i.test(expression[index])) {
        index += 1;
      }

      const value = expression.slice(start, index).toLowerCase();
      previous = value in functions ? { type: 'function', value } : { type: 'variable', value };
      tokens.push(previous);
      continue;
    }

    if (char === '(') {
      previous = { type: 'left-paren' };
      tokens.push(previous);
      index += 1;
      continue;
    }

    if (char === ')') {
      previous = { type: 'right-paren' };
      tokens.push(previous);
      index += 1;
      continue;
    }

    if ('+-*/^'.includes(char)) {
      const unaryMinus =
        char === '-' &&
        (!previous || previous.type === 'operator' || previous.type === 'left-paren' || previous.type === 'function');
      previous = { type: 'operator', value: unaryMinus ? 'neg' : (char as Operator) };
      tokens.push(previous);
      index += 1;
      continue;
    }

    throw new Error(`Unexpected character: ${char}`);
  }

  return tokens;
}

function toReversePolish(tokens: Token[]): Token[] {
  const output: Token[] = [];
  const stack: Token[] = [];

  for (const token of tokens) {
    if (token.type === 'number' || token.type === 'variable') {
      output.push(token);
      continue;
    }

    if (token.type === 'function') {
      stack.push(token);
      continue;
    }

    if (token.type === 'operator') {
      while (shouldPopOperator(token, stack.at(-1))) {
        output.push(stack.pop() as Token);
      }
      stack.push(token);
      continue;
    }

    if (token.type === 'left-paren') {
      stack.push(token);
      continue;
    }

    while (stack.length > 0 && stack.at(-1)?.type !== 'left-paren') {
      output.push(stack.pop() as Token);
    }

    if (stack.pop()?.type !== 'left-paren') throw new Error('Mismatched parentheses');
    if (stack.at(-1)?.type === 'function') output.push(stack.pop() as Token);
  }

  while (stack.length > 0) {
    const token = stack.pop() as Token;
    if (token.type === 'left-paren' || token.type === 'right-paren') throw new Error('Mismatched parentheses');
    output.push(token);
  }

  return output;
}

function shouldPopOperator(current: Extract<Token, { type: 'operator' }>, top: Token | undefined): boolean {
  if (!top || top.type !== 'operator') return false;

  const currentOperator = operators[current.value];
  const topOperator = operators[top.value];

  return currentOperator.rightAssociative
    ? currentOperator.precedence < topOperator.precedence
    : currentOperator.precedence <= topOperator.precedence;
}

function evaluateReversePolish(tokens: Token[], x: number, parameters: MathscapeParameters): number {
  const stack: number[] = [];

  for (const token of tokens) {
    if (token.type === 'number') {
      stack.push(token.value);
      continue;
    }

    if (token.type === 'variable') {
      stack.push(resolveVariable(token.value, x, parameters));
      continue;
    }

    if (token.type === 'function') {
      const value = stack.pop();
      if (value === undefined) throw new Error('Missing function argument');
      stack.push(functions[token.value](value));
      continue;
    }

    if (token.type === 'operator') {
      const operator = operators[token.value];

      if (operator.arity === 1) {
        const value = stack.pop();
        if (value === undefined) throw new Error('Missing operand');
        stack.push(-value);
        continue;
      }

      const right = stack.pop();
      const left = stack.pop();
      if (left === undefined || right === undefined) throw new Error('Missing operand');
      stack.push(applyOperator(token.value, left, right));
    }
  }

  if (stack.length !== 1) throw new Error('Invalid expression');
  return stack[0];
}

function resolveVariable(name: string, x: number, parameters: MathscapeParameters): number {
  if (name === 'x') return x;
  if (name === 'a') return parameters.amplitude;
  if (name === 'b') return parameters.frequency;
  if (name === 'phi') return parameters.phase;
  if (name === 'pi') return Math.PI;
  if (name === 'e') return Math.E;

  throw new Error(`Unknown variable: ${name}`);
}

function applyOperator(operator: Operator, left: number, right: number): number {
  if (operator === '+') return left + right;
  if (operator === '-') return left - right;
  if (operator === '*') return left * right;
  if (operator === '/') return left / right;
  if (operator === '^') return left ** right;

  throw new Error('Invalid operator');
}

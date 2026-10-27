import { describe, expect, it, vi } from 'vitest';
import { compileLambda } from '../safeExpression';
import { evalTextExpr, renderControlText } from '../controlText';

describe('compileLambda', () => {
  it('считает лямбды из примеров теории', () => {
    expect(compileLambda('({a}) => a')({ a: 2 })).toBe(2);
    expect(compileLambda('({a}) => a > 0 ? "вверх" : "вниз"')({ a: -1 })).toBe('вниз');
    expect(compileLambda('({a, b}) => (a * 2 + b) / 4')({ a: 3, b: 2 })).toBe(2);
    expect(compileLambda('({a}) => Math.sqrt(a).toFixed(2)')({ a: 2 })).toBe('1.41');
    expect(compileLambda('(s) => s.a ** 2 - 1')({ a: 3 })).toBe(8);
    expect(compileLambda('({a}) => `a = ${a}`')({ a: 5 })).toBe('a = 5');
    expect(compileLambda('({a, k = 10}) => a + k')({ a: 1 })).toBe(11);
    expect(compileLambda('({a}) => a === 0 ? "" : (a > 0 && "плюс") || "минус"')({ a: 0 })).toBe('');
    expect(compileLambda('({a}) => -a ?? 0')({ a: 4 })).toBe(-4);
    expect(compileLambda('({a}) => Math.abs(a) < Math.PI')({ a: -3 })).toBe(true);
    expect(compileLambda('({a}) => a?.toFixed(1)')({ a: 1.25 })).toBe('1.3');
  });

  it('не пускает к глобальным объектам и конструкторам', () => {
    const spy = vi.fn();
    globalThis.__leak = spy;
    const attempts = [
      '() => fetch("//evil")',
      '() => window.location',
      '() => globalThis.__leak()',
      '() => constructor.constructor("return this")()',
      '({a}) => a.constructor.constructor("alert(1)")()',
      '({a}) => a["constructor"]["constructor"]("return 1")()',
      '({a}) => a.__proto__',
      '() => Math.constructor',
      '() => "x".constructor.fromCharCode(65)',
      '() => [].constructor',
      '() => (() => 1)()',
      '() => { return 1 }',
      '() => this',
      '() => new Date()',
      '() => a = 1',
    ];
    attempts.forEach((source) => {
      const fn = compileLambda(source);
      if (!fn) return;
      let value;
      try {
        value = fn({ a: 1 });
      } catch {
        value = undefined;
      }
      expect(typeof value === 'function').toBe(false);
      expect(value === globalThis).toBe(false);
    });
    expect(spy).not.toHaveBeenCalled();
    delete globalThis.__leak;
  });

  it('видит только собственные поля значений', () => {
    expect(compileLambda('(s) => s.toString')({ a: 1 })).toBeUndefined();
    expect(compileLambda('(s) => s.hasOwnProperty')({ a: 1 })).toBeUndefined();
  });

  it('отвергает неподдерживаемый синтаксис', () => {
    expect(compileLambda('a => a')).toBeNull();
    expect(compileLambda('({a}) => a; alert(1)')).toBeNull();
    expect(compileLambda('({a}) => a +')).toBeNull();
    expect(compileLambda('x'.repeat(5000))).toBeNull();
  });

  it('ограничивает длину строк', () => {
    const out = compileLambda('() => "x".padStart(100000000, "y")')();
    expect(out.length).toBeLessThanOrEqual(10000);
  });
});

describe('controlText', () => {
  it('подставляет значения и прячет ошибки', () => {
    expect(evalTextExpr('({a}) => a / 3', { a: 1 })).toBe('0.333333');
    expect(evalTextExpr('({a}) => missing + a', { a: 1 })).toBe('');
    expect(evalTextExpr('({a}) => alert(a)', { a: 1 })).toBe('');
    const text = { parts: [{ type: 'md', value: '$a = ' }, { type: 'expr', source: '({a}) => a' }, { type: 'md', value: '$' }] };
    expect(renderControlText(text, { a: 7 })).toBe('$a = 7$');
  });
});

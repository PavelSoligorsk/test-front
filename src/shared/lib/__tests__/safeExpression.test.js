import { describe, expect, it, vi } from 'vitest';
import { compileLambda } from '../safeExpression';
import { evalTextExpr, renderControlText } from '../controlText';
import { parseBlocks } from '../theoryMarkup';

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

  it('считает блок с const, if и вложенными лямбдами', () => {
    const source = `({a, b, c}) => {
      const fmt = (v) => { const n = Math.round(v * 100) / 100; return Object.is(n, -0) ? "0" : String(n); };
      const M = (s) => "$$" + s + "$$";
      const aS = Math.abs(a) < 0.001 ? 0.001 : a;
      const D = b * b - 4 * aS * c;
      const xv = -b / (2 * aS);
      const yv = -D / (4 * aS);
      const parts = [M("D = " + fmt(D))];
      if (D > 0) {
        const r1 = (-b - Math.sqrt(D)) / (2 * aS), r2 = (-b + Math.sqrt(D)) / (2 * aS);
        parts.push(M("x_1 = " + fmt(Math.min(r1, r2))));
      } else if (Math.abs(D) < 1e-9) {
        parts.push(M("x = " + fmt(xv)));
      } else {
        parts.push(M("none"));
      }
      return parts.join("\\n");
    }`;
    const out = compileLambda(source)({ a: 1, b: -4, c: 3 });
    expect(out).toContain('D = 4');
    expect(out).toContain('x_1 = 1');
    const markup = `<GeoGebra height="440" setup="a = 1">
      <Slider name="a" min="-3" max="3" step="0.1" value="1" label="$a$" />
      <Text>
      {({a}) => {
        const fmt = (v) => String(Math.round(v * 100) / 100);
        if (a > 0) { return "вверх " + fmt(a); }
        return "вниз";
      }}
      </Text>
    </GeoGebra>`;
    const [block] = parseBlocks(markup);
    expect(block.type).toBe('geogebra');
    expect(block.texts).toHaveLength(1);
    expect(evalTextExpr(block.texts[0].parts[0].source, { a: 1 })).toBe('вверх 1');
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

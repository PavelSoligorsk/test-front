// Лямбды из теории вида `({a}) => a > 0 ? "вверх" : "вниз"` приходят из контента
// (теория, ИИ, объекты доски от любого участника). Поэтому они не идут в eval или
// new Function: свой разбор подмножества JS и вычисление по дереву. Доступны только
// параметры лямбды, Math и короткий список методов чисел, строк и массивов.

const PUNCTUATORS = ['===', '!==', '...', '**', '=>', '==', '!=', '<=', '>=', '&&', '||', '??', '?.',
  '+', '-', '*', '/', '%', '<', '>', '!', '?', ':', '(', ')', '[', ']', '{', '}', ',', '.', '='];

const LITERALS = { true: true, false: false, null: null, undefined, NaN, Infinity };

const MAX_SOURCE = 2000;
const MAX_STRING = 10000;
const MAX_DEPTH = 64;

class ExpressionError extends Error {}

function fail(message) {
  throw new ExpressionError(message);
}

function isIdentStart(ch) {
  return /[A-Za-z_$À-￿]/.test(ch);
}

function isIdentPart(ch) {
  return /[\w$À-￿]/.test(ch);
}

function readEscape(source, index) {
  const ch = source[index];
  const simple = { n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', v: '\v', 0: '\0' };
  if (ch in simple) return [simple[ch], index + 1];
  if (ch === 'u' && /^[0-9a-fA-F]{4}$/.test(source.slice(index + 1, index + 5))) {
    return [String.fromCharCode(parseInt(source.slice(index + 1, index + 5), 16)), index + 5];
  }
  return [ch ?? '', index + 1];
}

function tokenize(source) {
  const tokens = [];
  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }
    if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(source[i + 1] || ''))) {
      const match = /^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/.exec(source.slice(i));
      tokens.push({ type: 'num', value: Number(match[0]) });
      i += match[0].length;
      continue;
    }
    if (ch === '"' || ch === "'") {
      let value = '';
      let j = i + 1;
      while (j < source.length && source[j] !== ch) {
        if (source[j] === '\\') {
          const [text, next] = readEscape(source, j + 1);
          value += text;
          j = next;
        } else {
          value += source[j];
          j += 1;
        }
      }
      if (source[j] !== ch) fail('Незакрытая строка');
      tokens.push({ type: 'str', value });
      i = j + 1;
      continue;
    }
    if (ch === '`') {
      const quasis = [];
      const exprs = [];
      let text = '';
      let j = i + 1;
      while (j < source.length && source[j] !== '`') {
        if (source[j] === '\\') {
          const [escaped, next] = readEscape(source, j + 1);
          text += escaped;
          j = next;
          continue;
        }
        if (source[j] === '$' && source[j + 1] === '{') {
          let depth = 1;
          let k = j + 2;
          while (k < source.length && depth > 0) {
            if (source[k] === '{') depth += 1;
            else if (source[k] === '}') depth -= 1;
            if (depth > 0) k += 1;
          }
          if (depth !== 0) fail('Незакрытый ${ в шаблоне');
          quasis.push(text);
          text = '';
          exprs.push(source.slice(j + 2, k));
          j = k + 1;
          continue;
        }
        text += source[j];
        j += 1;
      }
      if (source[j] !== '`') fail('Незакрытый шаблон');
      quasis.push(text);
      tokens.push({ type: 'template', quasis, exprs });
      i = j + 1;
      continue;
    }
    if (isIdentStart(ch)) {
      let j = i + 1;
      while (j < source.length && isIdentPart(source[j])) j += 1;
      tokens.push({ type: 'ident', value: source.slice(i, j) });
      i = j;
      continue;
    }
    const punct = PUNCTUATORS.find((item) => source.startsWith(item, i));
    if (!punct) fail(`Недопустимый символ «${ch}»`);
    // `?.5` — тернарный оператор с числом, а не опциональная цепочка.
    if (punct === '?.' && /[0-9]/.test(source[i + 2] || '')) {
      tokens.push({ type: 'punct', value: '?' });
      i += 1;
      continue;
    }
    tokens.push({ type: 'punct', value: punct });
    i += punct.length;
  }
  tokens.push({ type: 'eof' });
  return tokens;
}

const BINARY_LEVELS = [
  ['??'],
  ['||'],
  ['&&'],
  ['===', '!==', '==', '!='],
  ['<', '<=', '>', '>='],
  ['+', '-'],
  ['*', '/', '%'],
];

class Parser {
  constructor(source) {
    this.tokens = tokenize(source);
    this.pos = 0;
    this.depth = 0;
  }

  peek(offset = 0) {
    return this.tokens[this.pos + offset];
  }

  next() {
    return this.tokens[this.pos++];
  }

  isPunct(value, offset = 0) {
    const token = this.peek(offset);
    return token.type === 'punct' && token.value === value;
  }

  expect(value) {
    if (!this.isPunct(value)) fail(`Ожидалось «${value}»`);
    return this.next();
  }

  enter() {
    this.depth += 1;
    if (this.depth > MAX_DEPTH) fail('Слишком глубокое выражение');
  }

  leave() {
    this.depth -= 1;
  }

  parseLambda() {
    this.expect('(');
    const params = [];
    if (!this.isPunct(')')) {
      if (params.length === 0 && this.isPunct('{')) {
        params.push(this.parsePattern());
      } else {
        params.push(this.parseIdentifierParam());
      }
      while (this.isPunct(',')) {
        this.next();
        params.push(this.isPunct('{') ? this.parsePattern() : this.parseIdentifierParam());
      }
    }
    this.expect(')');
    this.expect('=>');
    if (this.isPunct('{')) fail('Тело лямбды должно быть выражением');
    const body = this.parseExpression();
    if (this.peek().type !== 'eof') fail('Лишние символы после выражения');
    return { params, body };
  }

  parseIdentifierParam() {
    const token = this.next();
    if (token.type !== 'ident' || token.value in LITERALS) fail('Ожидалось имя параметра');
    return { kind: 'name', name: token.value };
  }

  parsePattern() {
    this.expect('{');
    const fields = [];
    while (!this.isPunct('}')) {
      const key = this.next();
      if (key.type !== 'ident') fail('Ожидалось имя поля');
      let local = key.value;
      if (this.isPunct(':')) {
        this.next();
        const alias = this.next();
        if (alias.type !== 'ident') fail('Ожидалось имя');
        local = alias.value;
      }
      let fallback = null;
      if (this.isPunct('=')) {
        this.next();
        fallback = this.parseConditional();
      }
      fields.push({ key: key.value, local, fallback });
      if (!this.isPunct(',')) break;
      this.next();
    }
    this.expect('}');
    return { kind: 'pattern', fields };
  }

  parseExpression() {
    return this.parseConditional();
  }

  parseConditional() {
    this.enter();
    const test = this.parseBinary(0);
    if (!this.isPunct('?')) {
      this.leave();
      return test;
    }
    this.next();
    const consequent = this.parseConditional();
    this.expect(':');
    const alternate = this.parseConditional();
    this.leave();
    return { type: 'cond', test, consequent, alternate };
  }

  parseBinary(level) {
    if (level >= BINARY_LEVELS.length) return this.parseExponent();
    let left = this.parseBinary(level + 1);
    for (;;) {
      const token = this.peek();
      if (token.type !== 'punct' || !BINARY_LEVELS[level].includes(token.value)) return left;
      this.next();
      this.enter();
      const right = this.parseBinary(level + 1);
      this.leave();
      left = { type: 'bin', op: token.value, left, right };
    }
  }

  parseExponent() {
    const base = this.parseUnary();
    if (!this.isPunct('**')) return base;
    this.next();
    this.enter();
    const exponent = this.parseExponent();
    this.leave();
    return { type: 'bin', op: '**', left: base, right: exponent };
  }

  parseUnary() {
    const token = this.peek();
    if (token.type === 'punct' && (token.value === '-' || token.value === '+' || token.value === '!')) {
      this.next();
      this.enter();
      const argument = this.parseUnary();
      this.leave();
      return { type: 'unary', op: token.value, argument };
    }
    if (token.type === 'ident' && token.value === 'typeof') {
      this.next();
      return { type: 'unary', op: 'typeof', argument: this.parseUnary() };
    }
    return this.parsePostfix();
  }

  parsePostfix() {
    let node = this.parsePrimary();
    for (;;) {
      if (this.isPunct('.') || this.isPunct('?.')) {
        const optional = this.next().value === '?.';
        if (optional && this.isPunct('(')) {
          node = { type: 'call', callee: node, args: this.parseArgs(), optional: true };
          continue;
        }
        if (optional && this.isPunct('[')) {
          this.next();
          const property = this.parseExpression();
          this.expect(']');
          node = { type: 'member', object: node, property, computed: true, optional: true };
          continue;
        }
        const name = this.next();
        if (name.type !== 'ident') fail('Ожидалось имя свойства');
        node = { type: 'member', object: node, property: name.value, computed: false, optional };
        continue;
      }
      if (this.isPunct('[')) {
        this.next();
        const property = this.parseExpression();
        this.expect(']');
        node = { type: 'member', object: node, property, computed: true, optional: false };
        continue;
      }
      if (this.isPunct('(')) {
        node = { type: 'call', callee: node, args: this.parseArgs(), optional: false };
        continue;
      }
      return node;
    }
  }

  parseArgs() {
    this.expect('(');
    const args = [];
    while (!this.isPunct(')')) {
      args.push(this.parseExpression());
      if (!this.isPunct(',')) break;
      this.next();
    }
    this.expect(')');
    return args;
  }

  parsePrimary() {
    const token = this.next();
    if (token.type === 'num' || token.type === 'str') return { type: 'lit', value: token.value };
    if (token.type === 'template') {
      return {
        type: 'template',
        quasis: token.quasis,
        exprs: token.exprs.map((source) => {
          const nested = new Parser(source);
          nested.depth = this.depth;
          const expr = nested.parseExpression();
          if (nested.peek().type !== 'eof') fail('Лишние символы в шаблоне');
          return expr;
        }),
      };
    }
    if (token.type === 'ident') {
      if (token.value in LITERALS) return { type: 'lit', value: LITERALS[token.value] };
      return { type: 'id', name: token.value };
    }
    if (token.type === 'punct' && token.value === '(') {
      this.enter();
      const expr = this.parseExpression();
      this.leave();
      this.expect(')');
      return expr;
    }
    if (token.type === 'punct' && token.value === '[') {
      const items = [];
      while (!this.isPunct(']')) {
        items.push(this.parseExpression());
        if (!this.isPunct(',')) break;
        this.next();
      }
      this.expect(']');
      return { type: 'array', items };
    }
    return fail('Неожиданный конец выражения');
  }
}

// ── Вычисление ───────────────────────────────────────────────

const BLOCKED_KEYS = new Set(['__proto__', 'prototype', 'constructor', '__defineGetter__', '__defineSetter__',
  '__lookupGetter__', '__lookupSetter__']);

const MATH_KEYS = ['abs', 'acos', 'acosh', 'asin', 'asinh', 'atan', 'atan2', 'atanh', 'cbrt', 'ceil', 'cos', 'cosh',
  'exp', 'expm1', 'floor', 'fround', 'hypot', 'log', 'log10', 'log1p', 'log2', 'max', 'min', 'pow', 'round', 'sign',
  'sin', 'sinh', 'sqrt', 'tan', 'tanh', 'trunc', 'E', 'LN10', 'LN2', 'LOG10E', 'LOG2E', 'PI', 'SQRT1_2', 'SQRT2'];

const SAFE_MATH = Object.freeze(Object.fromEntries(MATH_KEYS.map((key) => [key, Math[key]])));

function clampLength(value) {
  return Math.max(0, Math.min(MAX_STRING, Number(value) || 0));
}

function limitString(value) {
  return value.length > MAX_STRING ? value.slice(0, MAX_STRING) : value;
}

const SAFE_GLOBALS = Object.freeze({
  Math: SAFE_MATH,
  Number: (value) => Number(value),
  String: (value) => limitString(String(value)),
  Boolean: (value) => Boolean(value),
  isFinite: (value) => Number.isFinite(Number(value)),
  isNaN: (value) => Number.isNaN(Number(value)),
  parseFloat: (value) => parseFloat(value),
  parseInt: (value, radix) => parseInt(value, radix),
  abs: Math.abs,
  sqrt: Math.sqrt,
  round: Math.round,
});

const NUMBER_METHODS = {
  toFixed: (value, digits) => value.toFixed(Math.max(0, Math.min(20, Number(digits) || 0))),
  toPrecision: (value, digits) => (digits == null ? value.toPrecision() : value.toPrecision(Math.max(1, Math.min(21, Number(digits) || 1)))),
  toString: (value, radix) => value.toString(radix == null ? 10 : Math.max(2, Math.min(36, Number(radix) || 10))),
  toLocaleString: (value, locale, options) => value.toLocaleString(typeof locale === 'string' ? locale : 'ru-RU', options && typeof options === 'object' ? {
    minimumFractionDigits: options.minimumFractionDigits,
    maximumFractionDigits: options.maximumFractionDigits,
  } : undefined),
};

const STRING_METHODS = {
  toUpperCase: (value) => value.toUpperCase(),
  toLowerCase: (value) => value.toLowerCase(),
  trim: (value) => value.trim(),
  padStart: (value, length, fill) => value.padStart(clampLength(length), fill == null ? ' ' : String(fill)),
  padEnd: (value, length, fill) => value.padEnd(clampLength(length), fill == null ? ' ' : String(fill)),
  slice: (value, start, end) => value.slice(start, end),
  includes: (value, part) => value.includes(String(part)),
  startsWith: (value, part) => value.startsWith(String(part)),
  endsWith: (value, part) => value.endsWith(String(part)),
  replace: (value, from, to) => value.replace(String(from), String(to)),
  replaceAll: (value, from, to) => limitString(value.replaceAll(String(from), String(to))),
  toString: (value) => value,
};

const ARRAY_METHODS = {
  join: (value, separator) => limitString(value.join(separator == null ? ',' : String(separator))),
  includes: (value, item) => value.includes(item),
  indexOf: (value, item) => value.indexOf(item),
  slice: (value, start, end) => value.slice(start, end),
};

const SAFE_CALLABLES = new Set([
  ...Object.values(SAFE_GLOBALS).filter((value) => typeof value === 'function'),
  ...Object.values(SAFE_MATH).filter((value) => typeof value === 'function'),
]);

function boundMethod(receiver, method) {
  return { boundMethod: method, receiver };
}

function readMember(object, key) {
  if (object == null) fail('Обращение к свойству пустого значения');
  const name = typeof key === 'number' ? key : String(key);
  if (typeof name === 'string' && BLOCKED_KEYS.has(name)) fail(`Свойство ${name} недоступно`);
  if (object === SAFE_MATH) {
    return Object.prototype.hasOwnProperty.call(SAFE_MATH, name) ? SAFE_MATH[name] : undefined;
  }
  if (typeof object === 'number') {
    return Object.prototype.hasOwnProperty.call(NUMBER_METHODS, name) ? boundMethod(object, NUMBER_METHODS[name]) : undefined;
  }
  if (typeof object === 'string') {
    if (name === 'length') return object.length;
    if (typeof name === 'number' || /^\d+$/.test(name)) return object[Number(name)];
    return Object.prototype.hasOwnProperty.call(STRING_METHODS, name) ? boundMethod(object, STRING_METHODS[name]) : undefined;
  }
  if (Array.isArray(object)) {
    if (name === 'length') return object.length;
    if (typeof name === 'number' || /^\d+$/.test(name)) return object[Number(name)];
    return Object.prototype.hasOwnProperty.call(ARRAY_METHODS, name) ? boundMethod(object, ARRAY_METHODS[name]) : undefined;
  }
  if (typeof object === 'object') {
    // Обычные данные: только собственные поля, без прототипа.
    return Object.prototype.hasOwnProperty.call(object, name) ? object[name] : undefined;
  }
  return undefined;
}

function looseEquals(left, right) {
  // == без приведения объектов: только числа, строки, логические значения и пустые.
  if (left == null || right == null) return left == null && right == null;
  if (typeof left === 'object' || typeof right === 'object') return left === right;
  return left == right;
}

function primitive(value) {
  if (value !== null && typeof value === 'object') fail('Операция над объектом');
  if (typeof value === 'function') fail('Операция над функцией');
  return value;
}

function evaluate(node, env) {
  switch (node.type) {
    case 'lit':
      return node.value;
    case 'id':
      if (Object.prototype.hasOwnProperty.call(env, node.name)) return env[node.name];
      if (Object.prototype.hasOwnProperty.call(SAFE_GLOBALS, node.name)) return SAFE_GLOBALS[node.name];
      return fail(`Неизвестное имя ${node.name}`);
    case 'template': {
      let out = node.quasis[0];
      node.exprs.forEach((expr, index) => {
        out += String(primitive(evaluate(expr, env))) + node.quasis[index + 1];
      });
      return limitString(out);
    }
    case 'array':
      return node.items.map((item) => evaluate(item, env));
    case 'unary': {
      const value = evaluate(node.argument, env);
      if (node.op === '!') return !value;
      if (node.op === 'typeof') return value && value.boundMethod ? 'function' : typeof value;
      const number = primitive(value);
      return node.op === '-' ? -number : +number;
    }
    case 'cond':
      return evaluate(node.test, env) ? evaluate(node.consequent, env) : evaluate(node.alternate, env);
    case 'bin':
      return evaluateBinary(node, env);
    case 'member': {
      const object = evaluate(node.object, env);
      if (object == null && node.optional) return undefined;
      const key = node.computed ? primitive(evaluate(node.property, env)) : node.property;
      return readMember(object, key);
    }
    case 'call': {
      const callee = evaluate(node.callee, env);
      if (callee == null && node.optional) return undefined;
      const args = node.args.map((arg) => evaluate(arg, env));
      if (callee && callee.boundMethod) return callee.boundMethod(callee.receiver, ...args);
      if (typeof callee === 'function' && SAFE_CALLABLES.has(callee)) return callee(...args);
      return fail('Вызов недоступной функции');
    }
    default:
      return fail('Неизвестный узел');
  }
}

function evaluateBinary(node, env) {
  const { op } = node;
  if (op === '&&') return evaluate(node.left, env) && evaluate(node.right, env);
  if (op === '||') return evaluate(node.left, env) || evaluate(node.right, env);
  if (op === '??') return evaluate(node.left, env) ?? evaluate(node.right, env);
  const left = evaluate(node.left, env);
  const right = evaluate(node.right, env);
  if (op === '===') return left === right;
  if (op === '!==') return left !== right;
  if (op === '==') return looseEquals(left, right);
  if (op === '!=') return !looseEquals(left, right);
  const a = primitive(left);
  const b = primitive(right);
  switch (op) {
    case '+': {
      const sum = a + b;
      return typeof sum === 'string' ? limitString(sum) : sum;
    }
    case '-': return a - b;
    case '*': return a * b;
    case '/': return a / b;
    case '%': return a % b;
    case '**': return a ** b;
    case '<': return a < b;
    case '<=': return a <= b;
    case '>': return a > b;
    case '>=': return a >= b;
    default: return fail(`Оператор ${op} недоступен`);
  }
}

function bindParams(params, args) {
  const env = Object.create(null);
  params.forEach((param, index) => {
    const value = args[index];
    if (param.kind === 'name') {
      env[param.name] = value;
      return;
    }
    param.fields.forEach((field) => {
      const own = value != null && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, field.key)
        ? value[field.key]
        : undefined;
      env[field.local] = own === undefined && field.fallback ? evaluate(field.fallback, env) : own;
    });
  });
  return env;
}

/** Разбирает лямбду. Возвращает функцию от значений или null, если выражение не поддерживается. */
export function compileLambda(source) {
  const text = String(source || '').trim();
  if (!text || text.length > MAX_SOURCE) return null;
  let program;
  try {
    program = new Parser(text).parseLambda();
  } catch {
    return null;
  }
  return (...args) => {
    const env = bindParams(program.params, args);
    const result = evaluate(program.body, env);
    return result && result.boundMethod ? undefined : result;
  };
}


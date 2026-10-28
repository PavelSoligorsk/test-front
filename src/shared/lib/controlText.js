import { compileLambda } from './safeExpression';

// Ползунки, поля и тексты под чертежом GeoGebra: общие для теории и доски.

const MAX_CACHED = 500;
const compiled = new Map();

function lambdaFor(source) {
  if (compiled.has(source)) return compiled.get(source);
  const fn = compileLambda(source);
  if (compiled.size >= MAX_CACHED) compiled.delete(compiled.keys().next().value);
  compiled.set(source, fn);
  return fn;
}

export function formatExprValue(value) {
  if (value == null || value === '') return '';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return '';
    return String(Math.round(value * 1e6) / 1e6);
  }
  if (typeof value === 'boolean' || typeof value === 'string') return String(value);
  return '';
}

export function evalTextExpr(source, scope) {
  const fn = lambdaFor(source);
  if (!fn) return '';
  try {
    return formatExprValue(fn(scope));
  } catch {
    return '';
  }
}

/** Текст `<Text>` с подставленными значениями лямбд. */
export function renderControlText(text, scope) {
  return (text?.parts || []).map((part) => (
    part.type === 'expr' ? evalTextExpr(part.source, scope) : (part.value || '')
  )).join('');
}

export function controlScope(controls, values) {
  const scope = {};
  (controls || []).forEach((control, index) => {
    if (control?.name) scope[control.name] = values[index];
  });
  return scope;
}

function roundToStep(value, step) {
  if (!Number.isFinite(step) || step <= 0) return value;
  const places = (String(step).split('.')[1] || '').length;
  return Number((Math.round(value / step) * step).toFixed(places));
}

export function clampControl(value, control, snap) {
  let next = value;
  if (Number.isFinite(control.min)) next = Math.max(control.min, next);
  if (Number.isFinite(control.max)) next = Math.min(control.max, next);
  if (snap) next = roundToStep(next, control.step);
  return next;
}

/** Число из поля ввода: запятая как точка, NaN для мусора. */
export function parseControlNumber(raw) {
  return Number(String(raw ?? '').trim().replace(',', '.'));
}

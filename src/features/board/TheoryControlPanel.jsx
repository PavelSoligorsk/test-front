import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import { MathText } from '../../components/TheoryBlocks';
import { continueOrderedListNumbers, normalizeDisplayMath } from '../../components/theoryMath';

function clampControl(value, control, snap) {
  let next = value;
  if (Number.isFinite(control.min)) next = Math.max(control.min, next);
  if (Number.isFinite(control.max)) next = Math.min(control.max, next);
  if (snap && Number.isFinite(control.step) && control.step > 0) {
    const places = (String(control.step).split('.')[1] || '').length;
    next = Number((Math.round(next / control.step) * control.step).toFixed(places));
  }
  return next;
}

function formatExprValue(value) {
  if (value == null || value === '') return '';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return '';
    return String(Math.round(value * 1e6) / 1e6);
  }
  return String(value);
}

function evalTextExpr(source, scope, cache) {
  let fn = cache.get(source);
  if (fn === undefined) {
    try {
      const compiled = new Function(`return (${source})`)();
      fn = typeof compiled === 'function' ? compiled : null;
    } catch {
      fn = null;
    }
    cache.set(source, fn);
  }
  if (!fn) return '';
  try {
    return formatExprValue(fn(scope));
  } catch {
    return '';
  }
}

function renderText(text, scope, cache) {
  return (text.parts || []).map((part) => (
    part.type === 'expr' ? evalTextExpr(part.source, scope, cache) : (part.value || '')
  )).join('');
}

export default function TheoryControlPanel({ controls = [], texts = [], apiRef, onControls }) {
  const [values, setValues] = useState(() => controls.map((control) => control.value));
  const [drafts, setDrafts] = useState(() => controls.map((control) => String(control.value)));
  const valuesRef = useRef(values);
  const controlsRef = useRef(controls);
  const holdRef = useRef(false);
  const pendingRemoteRef = useRef(false);
  const exprCache = useRef(new Map());
  const remoteKey = controls.map((control) => `${control.name}:${control.value}`).join('|');
  controlsRef.current = controls;
  valuesRef.current = values;

  const adopt = (list) => {
    const next = list.map((control) => control.value);
    const current = valuesRef.current;
    if (next.length === current.length && next.every((value, index) => Object.is(value, current[index]))) return;
    valuesRef.current = next;
    setValues(next);
    setDrafts(next.map((value) => String(value)));
  };

  useEffect(() => {
    const next = controlsRef.current.map((control) => control.value);
    const current = valuesRef.current;
    const same = next.length === current.length && next.every((value, index) => Object.is(value, current[index]));
    if (same) {
      pendingRemoteRef.current = false;
      return;
    }
    if (holdRef.current) {
      pendingRemoteRef.current = true;
      return;
    }
    adopt(controlsRef.current);
  }, [remoteKey]);

  useEffect(() => {
    const release = () => {
      if (!holdRef.current) return;
      holdRef.current = false;
      if (!pendingRemoteRef.current) return;
      pendingRemoteRef.current = false;
      adopt(controlsRef.current);
    };
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    return () => {
      window.removeEventListener('pointerup', release);
      window.removeEventListener('pointercancel', release);
    };
  }, []);

  const setControl = (index, next) => {
    setValues((prev) => {
      const copy = [...prev];
      copy[index] = next;
      valuesRef.current = copy;
      return copy;
    });
    const control = controls[index];
    const api = apiRef.current;
    if (api && control?.name && Number.isFinite(next)) {
      try { api.setValue(control.name, next); } catch { /* объект ещё не создан */ }
    }
    if (!control) return;
    onControls?.(controls.map((item, itemIndex) => (
      itemIndex === index ? { ...item, value: next } : item
    )));
  };

  const commit = (index, raw, snap) => {
    const control = controls[index];
    if (!control) return;
    const parsed = Number(String(raw).trim().replace(',', '.'));
    if (!Number.isFinite(parsed)) {
      setDrafts((prev) => {
        const copy = [...prev];
        copy[index] = String(valuesRef.current[index] ?? '');
        return copy;
      });
      return;
    }
    const next = clampControl(parsed, control, snap);
    setDrafts((prev) => {
      const copy = [...prev];
      copy[index] = String(next);
      return copy;
    });
    setControl(index, next);
  };

  const scope = {};
  controls.forEach((control, index) => {
    scope[control.name] = values[index];
  });

  return (
    <div data-chrome="true" className="flex shrink-0 flex-col gap-2 border-t border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950">
      {controls.map((control, index) => (
        <div key={`${control.kind}-${control.name}-${index}`} className="flex items-start gap-2">
          <span className="w-28 shrink-0 text-xs leading-snug text-zinc-700 dark:text-zinc-300">
            <MathText text={control.label} />
          </span>
          {control.kind === 'slider' && (
            <input
              type="range"
              min={control.min}
              max={control.max}
              step={control.step}
              value={values[index] ?? control.value}
              aria-label={String(control.label || control.name).replace(/\$/g, '')}
              onPointerDown={(event) => {
                event.stopPropagation();
                holdRef.current = true;
              }}
              onChange={(event) => commit(index, event.target.value, true)}
              className="h-1.5 min-w-0 flex-1 accent-zinc-900"
            />
          )}
          <input
            type="number"
            inputMode="decimal"
            min={control.min}
            max={control.max}
            step={control.step || 'any'}
            value={drafts[index] ?? ''}
            aria-label={String(control.label || control.name).replace(/\$/g, '')}
            onPointerDown={(event) => event.stopPropagation()}
            onFocus={() => { holdRef.current = true; }}
            onBlur={(event) => {
              commit(index, event.target.value, control.kind === 'slider');
              holdRef.current = false;
              if (!pendingRemoteRef.current) return;
              pendingRemoteRef.current = false;
              adopt(controlsRef.current);
            }}
            onChange={(event) => {
              const raw = event.target.value;
              setDrafts((prev) => {
                const copy = [...prev];
                copy[index] = raw;
                return copy;
              });
              const parsed = Number(raw.trim().replace(',', '.'));
              if (!Number.isFinite(parsed)) return;
              if (Number.isFinite(control.min) && parsed < control.min) return;
              if (Number.isFinite(control.max) && parsed > control.max) return;
              setControl(index, parsed);
            }}
            className={`rounded-lg border border-zinc-200 bg-white px-2 py-1 text-sm text-zinc-900 outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 ${control.kind === 'slider' ? 'w-20 shrink-0' : 'min-w-0 flex-1'}`}
          />
        </div>
      ))}
      {texts.map((text, index) => (
        <div key={`text-${index}`} className="text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
          <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>
            {continueOrderedListNumbers(normalizeDisplayMath(renderText(text, scope, exprCache.current)))}
          </ReactMarkdown>
        </div>
      ))}
    </div>
  );
}

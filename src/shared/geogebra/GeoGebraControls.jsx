import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import MathText from '../../components/MathText';
import { continueOrderedListNumbers, normalizeDisplayMath } from '../../components/theoryMath';
import { clampControl, controlScope, parseControlNumber, renderControlText } from '../lib/controlText';

const REMARK = [remarkMath, remarkGfm];
const REHYPE = [rehypeKatex];

const STYLES = {
  page: {
    panel: 'flex flex-col gap-3 border-t border-zinc-200 bg-zinc-50/80 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950/40',
    row: 'flex min-w-0 flex-col gap-2',
    head: 'flex items-center justify-between gap-3',
    label: 'min-w-0 text-sm text-zinc-700 dark:text-zinc-300',
    number: 'w-24 shrink-0 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-600',
    slider: 'h-2 w-full accent-zinc-900 dark:accent-zinc-100',
    text: 'dynamic-markdown text-sm leading-relaxed text-zinc-700 dark:text-zinc-300 [&_p]:mb-2 [&_p:last-child]:mb-0',
  },
  board: {
    panel: 'flex shrink-0 flex-col gap-2 border-t border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950',
    row: 'flex items-start gap-2',
    head: 'contents',
    label: 'w-28 shrink-0 text-xs leading-snug text-zinc-700 dark:text-zinc-300',
    number: 'rounded-lg border border-zinc-200 bg-white px-2 py-1 text-sm text-zinc-900 outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100',
    slider: 'h-1.5 min-w-0 flex-1 accent-zinc-900',
    text: 'text-xs leading-relaxed text-zinc-700 dark:text-zinc-300',
  },
};

const ControlMarkdown = memo(function ControlMarkdown({ markdown, className }) {
  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={REMARK} rehypePlugins={REHYPE}>{markdown}</ReactMarkdown>
    </div>
  );
});

function sameValues(a, b) {
  return a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
}

/**
 * Ползунки, поля и тексты под чертежом. Одна реализация для теории (variant="page")
 * и доски (variant="board"). На доске значения приходят и от других участников:
 * пока человек тянет ползунок, чужое значение ждёт отпускания.
 */
export default function GeoGebraControls({ controls = [], texts = [], apiRef, apiReady = false, onControls, variant = 'page' }) {
  const look = STYLES[variant] || STYLES.page;
  const board = variant === 'board';
  const [values, setValues] = useState(() => controls.map((control) => control.value));
  const [drafts, setDrafts] = useState(() => controls.map((control) => String(control.value)));
  const valuesRef = useRef(values);
  const controlsRef = useRef(controls);
  const onControlsRef = useRef(onControls);
  const holdRef = useRef(false);
  const pendingRemoteRef = useRef(false);
  const publishRef = useRef(0);
  const remoteKey = controls.map((control) => `${control.name}:${control.value}`).join('|');

  useLayoutEffect(() => {
    controlsRef.current = controls;
    valuesRef.current = values;
    onControlsRef.current = onControls;
  });

  const adopt = (list) => {
    const next = list.map((control) => control.value);
    if (sameValues(next, valuesRef.current)) return;
    valuesRef.current = next;
    setValues(next);
    setDrafts(next.map((value) => String(value)));
  };
  const adoptRef = useRef(adopt);
  useLayoutEffect(() => {
    adoptRef.current = adopt;
  });

  useEffect(() => {
    const next = controlsRef.current.map((control) => control.value);
    if (sameValues(next, valuesRef.current)) {
      pendingRemoteRef.current = false;
      return;
    }
    if (holdRef.current) {
      pendingRemoteRef.current = true;
      return;
    }
    adoptRef.current(controlsRef.current);
  }, [remoteKey]);

  useEffect(() => {
    const release = () => {
      if (!holdRef.current) return;
      holdRef.current = false;
      if (!pendingRemoteRef.current) return;
      pendingRemoteRef.current = false;
      adoptRef.current(controlsRef.current);
    };
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    return () => {
      window.removeEventListener('pointerup', release);
      window.removeEventListener('pointercancel', release);
      window.cancelAnimationFrame(publishRef.current);
    };
  }, []);

  // Апплет готов: выставить в нём текущие значения панели.
  useEffect(() => {
    const api = apiRef?.current;
    if (!apiReady || !api) return;
    controlsRef.current.forEach((control, index) => {
      const value = valuesRef.current[index];
      if (!control?.name || !Number.isFinite(value)) return;
      try { api.setValue(control.name, value); } catch { /* объекта ещё нет */ }
    });
  }, [apiReady, apiRef]);

  // Наружу значения уходят не чаще кадра: ползунок шлёт input на каждый пиксель.
  const publish = () => {
    if (!onControlsRef.current || publishRef.current) return;
    publishRef.current = window.requestAnimationFrame(() => {
      publishRef.current = 0;
      const list = controlsRef.current.map((item, index) => ({ ...item, value: valuesRef.current[index] }));
      onControlsRef.current?.(list);
    });
  };

  const setControl = (index, next) => {
    const copy = valuesRef.current.slice();
    copy[index] = next;
    valuesRef.current = copy;
    setValues(copy);
    const control = controls[index];
    const api = apiRef?.current;
    if (api && control?.name && Number.isFinite(next)) {
      try { api.setValue(control.name, next); } catch { /* объект ещё не создан */ }
    }
    if (control) publish();
  };

  const setDraft = (index, raw) => {
    setDrafts((prev) => {
      const copy = [...prev];
      copy[index] = raw;
      return copy;
    });
  };

  const commit = (index, raw, snap) => {
    const control = controls[index];
    if (!control) return;
    const parsed = parseControlNumber(raw);
    if (!Number.isFinite(parsed)) {
      setDraft(index, String(valuesRef.current[index] ?? ''));
      return;
    }
    const next = clampControl(parsed, control, snap);
    setDraft(index, String(next));
    setControl(index, next);
  };

  const preview = (index, raw) => {
    const control = controls[index];
    const parsed = parseControlNumber(raw);
    if (!control || !Number.isFinite(parsed) || !/^-?\d+([.,]\d+)?$/.test(String(raw).trim())) return;
    if (Number.isFinite(control.min) && parsed < control.min) return;
    if (Number.isFinite(control.max) && parsed > control.max) return;
    setControl(index, parsed);
  };

  const markdowns = useMemo(() => {
    const scope = controlScope(controls, values);
    return texts.map((text) => continueOrderedListNumbers(normalizeDisplayMath(renderControlText(text, scope))));
  }, [controls, texts, values]);

  if (!controls.length && !texts.length) return null;
  const stop = board ? (event) => event.stopPropagation() : undefined;

  return (
    <div data-chrome={board ? 'true' : undefined} className={look.panel}>
      {controls.map((control, index) => {
        const label = String(control.label || control.name).replace(/\$/g, '');
        const slider = control.kind === 'slider' && (
          <input
            type="range"
            min={control.min}
            max={control.max}
            step={control.step}
            value={values[index] ?? control.value}
            aria-label={label}
            onPointerDown={(event) => {
              stop?.(event);
              holdRef.current = true;
            }}
            onChange={(event) => commit(index, event.target.value, true)}
            className={look.slider}
          />
        );
        const number = (
          <input
            type="number"
            inputMode="decimal"
            min={control.min}
            max={control.max}
            step={control.step || 'any'}
            value={drafts[index] ?? ''}
            aria-label={label}
            onPointerDown={stop}
            onFocus={() => { holdRef.current = true; }}
            onBlur={(event) => {
              commit(index, event.target.value, control.kind === 'slider');
              holdRef.current = false;
              if (!pendingRemoteRef.current) return;
              pendingRemoteRef.current = false;
              adopt(controlsRef.current);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur();
            }}
            onChange={(event) => {
              setDraft(index, event.target.value);
              preview(index, event.target.value);
            }}
            className={`${look.number} ${board ? (control.kind === 'slider' ? 'w-20 shrink-0' : 'min-w-0 flex-1') : ''}`}
          />
        );
        return (
          <div key={`${control.kind}-${control.name}-${index}`} className={look.row}>
            <div className={look.head}>
              <span className={look.label}><MathText text={control.label} /></span>
              {board && slider}
              {number}
            </div>
            {!board && slider}
          </div>
        );
      })}
      {markdowns.map((markdown, index) => (
        <ControlMarkdown
          key={`text-${index}`}
          markdown={markdown}
          className={`${look.text} ${!board && controls.length > 0 ? 'border-t border-zinc-200 pt-3 dark:border-zinc-800' : ''}`}
        />
      ))}
    </div>
  );
}

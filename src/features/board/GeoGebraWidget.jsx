import { useEffect, useRef, useState } from 'react';
import { loadGeoGebraScript, readConstructionTargets, runTheorySetup, sameConstruction, theoryPerspectiveCode } from './geogebraApi';
import TheoryControlPanel from './TheoryControlPanel';

function appletKind(appName) {
  if (appName === 'graphing' || appName === '3d') return appName;
  return 'geometry';
}

export default function GeoGebraWidget({
  appletId,
  appName,
  width,
  height,
  ggbBase64,
  ggbXml = '',
  ggbPerspective = '',
  ggbView = null,
  setup = '',
  controls = [],
  texts = [],
  interactive,
  onReady,
  onConstructionChange,
  onControls,
}) {
  const frameRef = useRef(null);
  const hostRef = useRef(null);
  const apiRef = useRef(null);
  const fileRef = useRef(ggbBase64 || '');
  const xmlRef = useRef(ggbXml || '');
  const perspectiveRef = useRef(ggbPerspective || '');
  const viewRef = useRef(ggbView || null);
  const perspectiveRestoredRef = useRef(false);
  const setupRef = useRef(setup || '');
  const controlsRef = useRef(controls || []);
  const appliedRef = useRef('');
  const appliedXmlRef = useRef('');
  const appliedPerspectiveRef = useRef('');
  const appliedControlsRef = useRef(new Map());
  const glideRef = useRef({ items: new Map(), raf: 0, last: 0 });
  const fitTimerRef = useRef(0);
  const sharpRef = useRef(null);
  const interactiveRef = useRef(interactive);
  const onReadyRef = useRef(onReady);
  const onChangeRef = useRef(onConstructionChange);
  const [status, setStatus] = useState('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    fileRef.current = ggbBase64 || '';
    xmlRef.current = ggbXml || '';
    perspectiveRef.current = ggbPerspective || '';
    viewRef.current = ggbView || null;
    setupRef.current = setup || '';
    controlsRef.current = controls || [];
  }, [ggbBase64, ggbXml, ggbPerspective, ggbView, setup, controls]);

  function frameBox() {
    const frame = frameRef.current;
    if (!frame) return null;
    const w = Math.round(frame.clientWidth);
    const h = Math.round(frame.clientHeight);
    if (w < 2 || h < 2) return null;
    return { w, h };
  }

  // Рамка объекта задаёт единственный размер апплета. Зум доски — это CSS-масштаб
  // предка, и GeoGebra не должна учитывать его: иначе картинка и панель
  // перестраиваются при каждом масштабе.
  function pinApplet() {
    const host = hostRef.current;
    const box = frameBox();
    if (!host || !box) return null;
    const pin = (node) => {
      if (!(node instanceof HTMLElement)) return;
      const style = node.style;
      if (style.getPropertyValue('width') !== '100%') style.setProperty('width', '100%', 'important');
      if (style.getPropertyValue('height') !== '100%') style.setProperty('height', '100%', 'important');
      if (style.getPropertyValue('max-width') !== 'none') style.setProperty('max-width', 'none', 'important');
      if (style.getPropertyValue('max-height') !== 'none') style.setProperty('max-height', 'none', 'important');
      if (style.getPropertyValue('transform') !== 'none') style.setProperty('transform', 'none', 'important');
    };
    pin(host.firstElementChild);
    host.querySelectorAll('.applet_scaler').forEach(pin);
    return box;
  }

  function fitToFrame(api) {
    const box = pinApplet();
    if (!box) return;
    const prev = sharpRef.current;
    if (prev && prev.w === box.w && prev.h === box.h) return;
    sharpRef.current = box;
    if (api && typeof api.setSize === 'function') {
      try {
        api.setSize(box.w, box.h);
      } catch {
        /* апплет ещё не готов к смене размера */
      }
    }
    window.clearTimeout(fitTimerRef.current);
    fitTimerRef.current = window.setTimeout(() => pinApplet(), 50);
  }

  function stopGlide() {
    const glide = glideRef.current;
    if (glide.raf) cancelAnimationFrame(glide.raf);
    glide.raf = 0;
    glide.items.clear();
    glide.view = null;
  }

  function writeView(api, view, blend) {
    if (!view || typeof api.getXmin !== 'function' || typeof api.setCoordSystem !== 'function') return true;
    const xmin = api.getXmin();
    const xmax = api.getXmax();
    const ymin = api.getYmin();
    const ymax = api.getYmax();
    if (![xmin, xmax, ymin, ymax].every((value) => typeof value === 'number' && Number.isFinite(value))) return true;
    const nextXmin = xmin + (view.xmin - xmin) * blend;
    const nextXmax = xmax + (view.xmax - xmax) * blend;
    const nextYmin = ymin + (view.ymin - ymin) * blend;
    const nextYmax = ymax + (view.ymax - ymax) * blend;
    const hasZ = Number.isFinite(view.zmin) && Number.isFinite(view.zmax) && typeof api.getZmin === 'function';
    const zmin = hasZ ? api.getZmin() : view.zmin;
    const zmax = hasZ ? api.getZmax() : view.zmax;
    const nextZmin = hasZ ? zmin + (view.zmin - zmin) * blend : view.zmin;
    const nextZmax = hasZ ? zmax + (view.zmax - zmax) * blend : view.zmax;
    const arrived = Math.abs(view.xmin - nextXmin) < 1e-3
      && Math.abs(view.xmax - nextXmax) < 1e-3
      && Math.abs(view.ymin - nextYmin) < 1e-3
      && Math.abs(view.ymax - nextYmax) < 1e-3
      && (!hasZ || (Math.abs(view.zmin - nextZmin) < 1e-3 && Math.abs(view.zmax - nextZmax) < 1e-3));
    const box = arrived
      ? [view.xmin, view.xmax, view.ymin, view.ymax]
      : [nextXmin, nextXmax, nextYmin, nextYmax];
    if (hasZ) box.push(arrived ? view.zmin : nextZmin, arrived ? view.zmax : nextZmax);
    try { api.setCoordSystem(...box); } catch { return true; }
    return arrived;
  }

  function kickGlide(api) {
    const glide = glideRef.current;
    glide.api = api;
    if (glide.raf) return;
    if (!glide.items.size && !glide.view) return;
    glide.last = performance.now();
    const tick = (now) => {
      const current = glide.api;
      if (!current) {
        glide.raf = 0;
        return;
      }
      const elapsed = Math.min(48, now - glide.last);
      glide.last = now;
      const blend = 1 - Math.exp(-elapsed / 90);
      let moving = false;
      glide.items.forEach((target, name) => {
        try {
          const arrived = writeGlideItem(current, target, blend);
          if (arrived) glide.items.delete(name);
          else moving = true;
        } catch {
          glide.items.delete(name);
        }
      });
      if (glide.view) {
        const arrived = writeView(current, glide.view, blend);
        if (arrived) glide.view = null;
        else moving = true;
      }
      glide.raf = moving ? requestAnimationFrame(tick) : 0;
    };
    glide.raf = requestAnimationFrame(tick);
  }

  function writeGlideItem(api, target, blend) {
    if (target.kind === 'number') {
      const current = api.getValue(target.name);
      const from = Number.isFinite(current) ? current : target.value;
      const next = from + (target.value - from) * blend;
      if (Math.abs(target.value - next) <= 1e-3) {
        api.setValue(target.name, target.value);
        return true;
      }
      api.setValue(target.name, next);
      return false;
    }
    const currentX = api.getXcoord(target.name);
    const currentY = api.getYcoord(target.name);
    const fromX = Number.isFinite(currentX) ? currentX : target.x;
    const fromY = Number.isFinite(currentY) ? currentY : target.y;
    const x = fromX + (target.x - fromX) * blend;
    const y = fromY + (target.y - fromY) * blend;
    if (target.kind === 'point3') {
      const currentZ = typeof api.getZcoord === 'function' ? api.getZcoord(target.name) : target.z;
      const fromZ = Number.isFinite(currentZ) ? currentZ : target.z;
      const z = fromZ + (target.z - fromZ) * blend;
      if (Math.hypot(target.x - x, target.y - y, target.z - z) <= 1e-3) {
        api.setCoords(target.name, target.x, target.y, target.z);
        return true;
      }
      api.setCoords(target.name, x, y, z);
      return false;
    }
    if (Math.hypot(target.x - x, target.y - y) <= 1e-3) {
      api.setCoords(target.name, target.x, target.y);
      return true;
    }
    api.setCoords(target.name, x, y);
    return false;
  }

  function glideToward(api, targets) {
    if (!api || !targets?.length) return;
    const glide = glideRef.current;
    targets.forEach((target) => {
      if (!target?.name) return;
      if (typeof api.exists === 'function' && !api.exists(target.name)) return;
      if (typeof api.isIndependent === 'function') {
        try {
          if (!api.isIndependent(target.name)) return;
        } catch {
          /* зависимое построение само пересчитается от свободных */
        }
      }
      glide.items.set(target.name, target);
    });
    kickGlide(api);
  }

  function glideView(api, view) {
    if (!api || !view || !Number.isFinite(view.xmin) || !Number.isFinite(view.xmax)) return;
    glideRef.current.view = view;
    kickGlide(api);
  }

  function restoreTheoryPerspective(api) {
    if (!api || perspectiveRestoredRef.current || interactiveRef.current) return;
    perspectiveRestoredRef.current = true;
    if (fileRef.current || xmlRef.current) return;
    const code = theoryPerspectiveCode(setupRef.current);
    if (!code || code.startsWith('<')) return;
    try { api.setPerspective(code); } catch { /* код вида из теории не применился */ }
  }

  function applyFile(api) {
    const file = fileRef.current;
    if (!file || file === appliedRef.current) return;
    if (interactiveRef.current) {
      appliedRef.current = file;
      return;
    }
    if (!api || typeof api.setBase64 !== 'function') return;
    appliedRef.current = file;
    try {
      api.setBase64(file, () => {
        fitToFrame(api);
        restoreTheoryPerspective(api);
      });
    } catch {
      appliedRef.current = '';
    }
  }

  function applyConstruction(api) {
    if (!api) return;
    const xml = xmlRef.current;
    if (interactiveRef.current) {
      if (xml) appliedXmlRef.current = xml;
      if (fileRef.current) appliedRef.current = fileRef.current;
      return;
    }
    const file = fileRef.current;
    if (xml && xml !== appliedXmlRef.current && typeof api.setXML === 'function') {
      const targets = readConstructionTargets(xml);
      const view = viewRef.current;
      if (sameConstruction(api, xml) && (targets.length || view)) {
        appliedXmlRef.current = xml;
        if (targets.length) glideToward(api, targets);
        if (view) glideView(api, view);
        return;
      }
      stopGlide();
      appliedXmlRef.current = xml;
      try {
        if (typeof api.setRepaintingActive === 'function') api.setRepaintingActive(false);
        api.setXML(xml);
        if (typeof api.setRepaintingActive === 'function') api.setRepaintingActive(true);
        if (view) glideView(api, view);
      } catch {
        appliedXmlRef.current = '';
      }
      return;
    }
    if (viewRef.current) {
      glideView(api, viewRef.current);
    }
    if (appliedXmlRef.current || !file) return;
    applyFile(api);
  }

  useEffect(() => {
    onReadyRef.current = onReady;
    onChangeRef.current = onConstructionChange;
  }, [onReady, onConstructionChange]);

  useEffect(() => {
    const frame = frameRef.current;
    const host = hostRef.current;
    if (!frame || !host) return;
    interactiveRef.current = interactive;
    host.inert = !interactive;
    host.style.pointerEvents = interactive ? 'auto' : 'none';
    if (!interactive && frame.contains(document.activeElement)) {
      document.activeElement.blur();
    }
  }, [interactive]);

  useEffect(() => {
    let cancelled = false;
    const host = hostRef.current;
    const frame = frameRef.current;
    const base64AtLoad = ggbBase64 || '';
        const kind = appletKind(appName);
        const sizeAtStart = {
      width: frame && frame.clientWidth > 2 ? frame.clientWidth : width,
      height: frame && frame.clientHeight > 2 ? frame.clientHeight : height,
    };

    (async () => {
      try {
        await loadGeoGebraScript();
        if (cancelled || !host || !window.GGBApplet) return;
        host.innerHTML = '';
        sharpRef.current = {
          w: Math.max(40, Math.round(sizeAtStart.width)),
          h: Math.max(40, Math.round(sizeAtStart.height)),
        };
        const fromTheory = Boolean(String(setupRef.current || '').trim()) && !base64AtLoad;
        const params = {
          id: appletId,
          ...(fromTheory ? {} : { appName: kind }),
          width: Math.max(40, Math.round(sizeAtStart.width)),
          height: Math.max(40, Math.round(sizeAtStart.height)),
          language: 'ru',
          showMenuBar: false,
          showToolBar: true,
          showAlgebraInput: fromTheory ? false : kind !== 'geometry',
          enable3d: fromTheory ? true : kind === '3d',
          showToolBarHelp: false,
          showResetIcon: true,
          enableLabelDrags: true,
          enableShiftDragZoom: true,
          enableRightClick: true,
          enableFileFeatures: false,
          errorDialogsActive: false,
          useBrowserForJS: false,
          borderColor: '#ffffff',
          scale: 1,
          disableAutoScale: true,
          appletOnLoad(api) {
            if (cancelled) return;
            apiRef.current = api;
            appliedRef.current = base64AtLoad;
            onReadyRef.current?.(api);
            host.inert = !interactiveRef.current;
            host.style.pointerEvents = interactiveRef.current ? 'auto' : 'none';
            if (typeof api.registerUpdateListener === 'function') {
              api.registerUpdateListener(() => {
                if (glideRef.current.raf) return;
                onChangeRef.current?.();
              });
            }
            fitToFrame(api);
            applyConstruction(api);
            if (setupRef.current && !fileRef.current && !xmlRef.current) {
              runTheorySetup(api, setupRef.current);
              controlsRef.current.forEach((control) => {
                if (control?.name == null || !Number.isFinite(control.value)) return;
                appliedControlsRef.current.set(control.name, control.value);
                try { api.setValue(control.name, control.value); } catch { /* значение ещё не к чему применить */ }
              });
            }
            restoreTheoryPerspective(api);
            pinApplet();
            setStatus('ready');
          },
        };
        if (base64AtLoad) params.ggbBase64 = base64AtLoad;
        const applet = new window.GGBApplet(params, true);
        applet.inject(host);
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
      stopGlide();
      apiRef.current = null;
      onReadyRef.current?.(null);
      if (host) host.innerHTML = '';
    };
    // Апплет создаётся один раз. Чужое построение приходит через setXML, размер — через ResizeObserver.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appletId, attempt, appName]);

  useEffect(() => {
    const api = apiRef.current;
    if (!api || status !== 'ready') return;
    controls.forEach((control) => {
      if (control?.name == null || !Number.isFinite(control.value)) return;
      if (appliedControlsRef.current.get(control.name) === control.value) return;
      appliedControlsRef.current.set(control.name, control.value);
      glideToward(api, [{ name: control.name, kind: 'number', value: control.value }]);
    });
  }, [controls, status]);

  useEffect(() => {
    try {
      applyConstruction(apiRef.current);
    } catch {
      /* чужое состояние не применилось */
    }
    // Ссылки на файл обновляются в эффекте выше, до этого применения.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ggbBase64, ggbXml, ggbPerspective, ggbView]);

  useEffect(() => {
    const frame = frameRef.current;
    const host = hostRef.current;
    if (!frame || !host) return undefined;
    const fit = () => fitToFrame(apiRef.current);
    fit();
    const resizeObserver = new ResizeObserver(fit);
    resizeObserver.observe(frame);
    let pinScheduled = false;
    const pinSoon = () => {
      if (pinScheduled) return;
      pinScheduled = true;
      requestAnimationFrame(() => {
        pinScheduled = false;
        pinApplet();
      });
    };
    const mutationObserver = new MutationObserver(pinSoon);
    mutationObserver.observe(host, { attributes: true, subtree: true, attributeFilter: ['style', 'class'] });
    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.clearTimeout(fitTimerRef.current);
    };
  }, [status]);

  const hasPanel = (controls?.length || 0) + (texts?.length || 0) > 0;

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
    <div
      ref={frameRef}
      data-geo-frame="true"
      className="relative min-h-0 w-full flex-1 overflow-hidden bg-white"
      data-geo-live={interactive ? 'true' : undefined}
    >
      <div ref={hostRef} className="absolute inset-0 z-0" />
      {!interactive && <div className="absolute inset-0 z-10" style={{ cursor: 'inherit' }} />}
      {status === 'loading' && (
        <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center bg-white text-xs font-medium text-zinc-400">
          Загрузка GeoGebra…
        </div>
      )}
      {status === 'error' && (
        <div className="absolute inset-0 z-20 grid place-items-center gap-2 bg-white p-4 text-center">
          <p className="text-sm text-zinc-600">GeoGebra не загрузилась</p>
          <button
            type="button"
            data-chrome="true"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => {
              setStatus('loading');
              setAttempt((value) => value + 1);
            }}
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white"
          >
            Повторить
          </button>
        </div>
      )}
    </div>
    {hasPanel && (
      <TheoryControlPanel controls={controls} texts={texts} apiRef={apiRef} onControls={onControls} />
    )}
    </div>
  );
}

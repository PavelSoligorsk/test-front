import { useEffect, useRef, useState } from 'react';
import { applyGeoGebraPerspective, loadGeoGebraScript, runTheorySetup } from './geogebraApi';
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
  setup = '',
  controls = [],
  texts = [],
  interactive,
  onReady,
  onConstructionChange,
}) {
  const frameRef = useRef(null);
  const hostRef = useRef(null);
  const apiRef = useRef(null);
  const fileRef = useRef(ggbBase64 || '');
  const xmlRef = useRef(ggbXml || '');
  const perspectiveRef = useRef(ggbPerspective || '');
  const setupRef = useRef(setup || '');
  const controlsRef = useRef(controls || []);
  const appliedRef = useRef('');
  const appliedXmlRef = useRef('');
  const appliedPerspectiveRef = useRef('');
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
    setupRef.current = setup || '';
    controlsRef.current = controls || [];
  }, [ggbBase64, ggbXml, ggbPerspective, setup, controls]);

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
        applyPerspective(api);
      });
    } catch {
      appliedRef.current = '';
    }
  }

  function applyPerspective(api) {
    const perspective = perspectiveRef.current;
    if (!api || !perspective || interactiveRef.current) return;
    if (perspective === appliedPerspectiveRef.current) return;
    if (applyGeoGebraPerspective(api, perspective)) {
      appliedPerspectiveRef.current = perspective;
    }
  }

  function applyConstruction(api) {
    if (!api) return;
    const xml = xmlRef.current;
    const perspective = perspectiveRef.current;
    if (interactiveRef.current) {
      if (xml) appliedXmlRef.current = xml;
      if (fileRef.current) appliedRef.current = fileRef.current;
      if (perspective) appliedPerspectiveRef.current = perspective;
      return;
    }
    const file = fileRef.current;
    if (perspective && perspective !== appliedPerspectiveRef.current && file && file !== appliedRef.current && typeof api.setBase64 === 'function') {
      appliedPerspectiveRef.current = perspective;
      appliedRef.current = file;
      appliedXmlRef.current = xml;
      try {
        api.setBase64(file, () => {
          fitToFrame(api);
          applyGeoGebraPerspective(api, perspective);
        });
      } catch {
        appliedRef.current = '';
        appliedPerspectiveRef.current = '';
      }
      return;
    }
    if (xml && xml !== appliedXmlRef.current && typeof api.setXML === 'function') {
      appliedXmlRef.current = xml;
      try {
        if (typeof api.setRepaintingActive === 'function') api.setRepaintingActive(false);
        api.setXML(xml);
        if (typeof api.setRepaintingActive === 'function') api.setRepaintingActive(true);
      } catch {
        appliedXmlRef.current = '';
      }
      return;
    }
    if (perspective && perspective !== appliedPerspectiveRef.current) {
      applyPerspective(api);
      return;
    }
    if (appliedXmlRef.current) return;
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
        const params = {
          id: appletId,
          appName: kind,
          width: Math.max(40, Math.round(sizeAtStart.width)),
          height: Math.max(40, Math.round(sizeAtStart.height)),
          language: 'ru',
          showMenuBar: false,
          showToolBar: true,
          showAlgebraInput: kind !== 'geometry',
          enable3d: kind === '3d',
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
              api.registerUpdateListener(() => onChangeRef.current?.());
            }
            fitToFrame(api);
            applyConstruction(api);
            if (setupRef.current && !fileRef.current && !xmlRef.current) {
              runTheorySetup(api, setupRef.current);
              controlsRef.current.forEach((control) => {
                if (control?.name == null || !Number.isFinite(control.value)) return;
                try { api.setValue(control.name, control.value); } catch { /* значение ещё не к чему применить */ }
              });
            }
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
      apiRef.current = null;
      onReadyRef.current?.(null);
      if (host) host.innerHTML = '';
    };
    // Апплет создаётся один раз. Чужое построение приходит через setXML, размер — через ResizeObserver.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appletId, attempt, appName]);

  useEffect(() => {
    applyConstruction(apiRef.current);
    // Ссылки на файл обновляются в эффекте выше, до этого применения.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ggbBase64, ggbXml, ggbPerspective]);

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
      <TheoryControlPanel controls={controls} texts={texts} apiRef={apiRef} />
    )}
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { loadGeoGebraScript } from './geogebraApi';

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
  interactive,
  onReady,
  onConstructionChange,
}) {
  const frameRef = useRef(null);
  const hostRef = useRef(null);
  const apiRef = useRef(null);
  const fileRef = useRef(ggbBase64 || '');
  const xmlRef = useRef(ggbXml || '');
  const appliedRef = useRef('');
  const appliedXmlRef = useRef('');
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
  }, [ggbBase64, ggbXml]);

  function fitToFrame(api) {
    const frame = frameRef.current;
    const host = hostRef.current;
    if (!frame || !host) return;
    const layoutW = Math.round(frame.clientWidth);
    const layoutH = Math.round(frame.clientHeight);
    if (layoutW < 2 || layoutH < 2) return;
    // Растр модели должен совпасть с экраном. Холст потом ещё масштабируется,
    // поэтому апплет рисуется в видимом размере и обратно ужимается в рамку.
    const rect = frame.getBoundingClientRect();
    const viewScale = rect.width > 1 ? rect.width / layoutW : 1;
    const ratio = Math.round(Math.min(3, Math.max(0.35, viewScale)) * 20) / 20;
    const sharpW = Math.max(40, Math.round(layoutW * ratio));
    const sharpH = Math.max(40, Math.round(layoutH * ratio));
    const prev = sharpRef.current;
    if (prev && prev.w === sharpW && prev.h === sharpH) return;
    sharpRef.current = { w: sharpW, h: sharpH };
    const fit = layoutW / sharpW;
    host.style.left = '0px';
    host.style.top = '0px';
    host.style.right = 'auto';
    host.style.bottom = 'auto';
    host.style.width = `${sharpW}px`;
    host.style.height = `${sharpH}px`;
    host.style.transformOrigin = '0 0';
    host.style.transform = `scale(${fit})`;
    const appletRoot = host.firstElementChild;
    if (appletRoot instanceof HTMLElement) {
      appletRoot.style.width = `${sharpW}px`;
      appletRoot.style.height = `${sharpH}px`;
      appletRoot.style.maxWidth = 'none';
      appletRoot.style.maxHeight = 'none';
      appletRoot.style.transform = 'none';
    }
    if (api && typeof api.setSize === 'function') {
      try {
        api.setSize(sharpW, sharpH);
      } catch {
        /* апплет ещё не готов к смене размера */
      }
    }
    window.clearTimeout(fitTimerRef.current);
    fitTimerRef.current = window.setTimeout(() => {
      const root = hostRef.current?.firstElementChild;
      const want = sharpRef.current;
      if (!(root instanceof HTMLElement) || !want) return;
      if (root.offsetWidth === want.w && root.offsetHeight === want.h) return;
      sharpRef.current = null;
      fitToFrame(apiRef.current);
    }, 200);
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
      api.setBase64(file, () => fitToFrame(api));
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
    const base64AtLoad = ggbBase64 || '';
    const kind = appletKind(appName);
    const sizeAtStart = { width, height };

    (async () => {
      try {
        await loadGeoGebraScript();
        if (cancelled || !host || !window.GGBApplet) return;
        host.innerHTML = '';
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
            applyConstruction(api);
            fitToFrame(api);
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
  }, [ggbBase64, ggbXml]);

  useEffect(() => {
    const frame = frameRef.current;
    const host = hostRef.current;
    if (!frame || !host) return undefined;
    const fit = () => fitToFrame(apiRef.current);
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(frame);
    window.addEventListener('edu-board-camera', fit);
    return () => {
      observer.disconnect();
      window.removeEventListener('edu-board-camera', fit);
      window.clearTimeout(fitTimerRef.current);
    };
  }, [status]);

  return (
    <div
      ref={frameRef}
      data-geo-frame="true"
      className="relative h-full w-full bg-white"
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
  );
}

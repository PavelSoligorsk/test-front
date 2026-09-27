import { useEffect, useRef, useState } from 'react';
import { loadGeoGebraScript } from './geogebraApi';

export default function GeoGebraWidget({
  appletId,
  appName,
  width,
  height,
  ggbBase64,
  interactive,
  onReady,
  onConstructionChange,
}) {
  const frameRef = useRef(null);
  const hostRef = useRef(null);
  const apiRef = useRef(null);
  const sizeRef = useRef({ width, height });
  const interactiveRef = useRef(interactive);
  const onReadyRef = useRef(onReady);
  const onChangeRef = useRef(onConstructionChange);
  const [status, setStatus] = useState('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    sizeRef.current = { width, height };
    const api = apiRef.current;
    if (!api || typeof api.setSize !== 'function') return;
    try {
      api.setSize(Math.max(200, Math.round(width)), Math.max(160, Math.round(height)));
    } catch {
      /* апплет ещё не готов к смене размера */
    }
  }, [width, height]);

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
    const sizeAtStart = { width, height };

    (async () => {
      try {
        await loadGeoGebraScript();
        if (cancelled || !host || !window.GGBApplet) return;
        host.innerHTML = '';
        const params = {
          id: appletId,
          appName: appName === 'graphing' ? 'graphing' : 'geometry',
          width: Math.max(200, Math.round(sizeAtStart.width)),
          height: Math.max(160, Math.round(sizeAtStart.height)),
          language: 'ru',
          showMenuBar: false,
          showToolBar: true,
          showAlgebraInput: appName === 'graphing',
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
            onReadyRef.current?.(api);
            host.inert = !interactiveRef.current;
            host.style.pointerEvents = interactiveRef.current ? 'auto' : 'none';
            if (typeof api.registerUpdateListener === 'function') {
              api.registerUpdateListener(() => onChangeRef.current?.());
            }
            if (typeof api.setSize === 'function') {
              try {
                const size = sizeRef.current;
                api.setSize(Math.max(200, Math.round(size.width)), Math.max(160, Math.round(size.height)));
              } catch {
                /* размер применится следующим эффектом */
              }
            }
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
    // Построение подхватывается при монтировании. Повторный base64 при автосохранении не перезагружает апплет.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appletId, attempt, appName]);

  return (
    <div
      ref={frameRef}
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

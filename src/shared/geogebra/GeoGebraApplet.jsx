import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { loadGeoGebra } from './loader';
import { appletParams, nextAppletId, removeApplet } from './params';
import { runCommands, runSetup } from './setup';
import { fitUniformGeoGebraView, isGeoGebraView, readGeoGebraView } from './view';

/**
 * Чертёж GeoGebra для теории и AI-подсказок.
 * Создаётся, только когда подъезжает к экрану; при ресайзе держит тот же кадр
 * чертежа; при размонтировании снимается целиком.
 */
export default function GeoGebraApplet({
  appName = '',
  materialId = '',
  setup = '',
  commands = null,
  height = 400,
  sizeFor = null,
  toolbar = false,
  className = '',
  onReady,
}) {
  const boxRef = useRef(null);
  const hostRef = useRef(null);
  const apiRef = useRef(null);
  const onReadyRef = useRef(onReady);
  const sizeRef = useRef({ w: 0, h: 0 });
  const [visible, setVisible] = useState(() => typeof IntersectionObserver !== 'function');
  const [width, setWidth] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState({ key: '', failed: false });

  const frame = sizeFor ? sizeFor(width) : { width, height: Number(height) || 400 };
  const frameHeight = Math.max(120, Math.round(frame.height));
  const frameWidth = Math.max(1, Math.round(frame.width || width));
  const commandKey = Array.isArray(commands) ? commands.join('\n') : '';
  const ready = visible && width > 0;
  const contentKey = [attempt, appName, materialId, setup, commandKey, toolbar].join('\u0001');
  const status = loaded.key !== contentKey ? 'loading' : loaded.failed ? 'error' : 'ready';

  useLayoutEffect(() => {
    onReadyRef.current = onReady;
    sizeRef.current = { w: frameWidth, h: frameHeight };
  });

  useEffect(() => {
    const box = boxRef.current;
    if (!box || typeof IntersectionObserver !== 'function') return undefined;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      setVisible(true);
      observer.disconnect();
    }, { rootMargin: '400px 0px' });
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return undefined;
    const measure = () => setWidth(Math.round(box.clientWidth));
    measure();
    if (typeof ResizeObserver !== 'function') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!ready) return undefined;
    const host = hostRef.current;
    const id = nextAppletId();
    const lines = commandKey ? commandKey.split('\n') : null;
    let cancelled = false;
    let applet = null;
    let cancelStyles = () => {};
    loadGeoGebra()
      .then((GGBApplet) => {
        if (cancelled || !host) return;
        const size = sizeRef.current;
        applet = new GGBApplet(appletParams({
          id,
          width: size.w,
          height: size.h,
          appName,
          materialId,
          toolbar,
          appletOnLoad(api) {
            if (cancelled) return;
            apiRef.current = api;
            if (lines?.length) runCommands(api, lines);
            else cancelStyles = runSetup(api, setup, { material: Boolean(materialId) });
            setLoaded({ key: contentKey, failed: false });
            onReadyRef.current?.(api);
          },
        }), true);
        applet.inject(host);
      })
      .catch(() => {
        if (!cancelled) setLoaded({ key: contentKey, failed: true });
      });
    return () => {
      cancelled = true;
      cancelStyles();
      if (apiRef.current) onReadyRef.current?.(null);
      apiRef.current = null;
      removeApplet(applet, id, host);
    };
  }, [ready, appName, materialId, setup, commandKey, toolbar, attempt, contentKey]);

  useEffect(() => {
    const api = apiRef.current;
    if (!api || status !== 'ready' || typeof api.setSize !== 'function') return;
    const view = readGeoGebraView(api);
    try {
      api.setSize(frameWidth, frameHeight);
      if (isGeoGebraView(view)) fitUniformGeoGebraView(api, view);
    } catch {
      /* апплет ещё меняет размер */
    }
  }, [frameWidth, frameHeight, status]);

  return (
    <div ref={boxRef} className={`relative w-full overflow-hidden ${className}`} style={{ height: frameHeight }}>
      <div ref={hostRef} className="h-full w-full" />
      {status !== 'ready' && (
        <div className="absolute inset-0 grid place-items-center bg-zinc-50 text-xs font-medium text-zinc-400 dark:bg-zinc-900/40">
          {status === 'error' ? (
            <div className="grid place-items-center gap-2 text-center">
              <p className="text-sm text-zinc-600 dark:text-zinc-300">GeoGebra не загрузилась</p>
              <button
                type="button"
                onClick={() => setAttempt((value) => value + 1)}
                className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white dark:bg-white dark:text-zinc-950"
              >
                Повторить
              </button>
            </div>
          ) : 'Загрузка GeoGebra…'}
        </div>
      )}
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import {
  angleGap,
  elementStates,
  graphStructure,
  fitUniformGeoGebraView,
  isGeoGebraView,
  geoPixelScale,
  layoutSignature,
  loadGeoGebraScript,
  readCamera3d,
  readConstructionTargets,
  readGeoGebraCamera,
  readGeoGebraPerspective,
  readGeoGebraView,
  readGeoGebraXml,
  runTheorySetup,
  sameCamera,
  sameConstruction,
  sameGeoGebraView,
  theoryPerspectiveCode,
  writeGeoGebraCamera,
  writeGeoGebraView,
} from './geogebraApi';
import TheoryControlPanel from './TheoryControlPanel';
import { penActive } from './penLock';

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
  ggbLayout = '',
  setup = '',
  controls = [],
  texts = [],
  zoom = 1,
  interactive,
  onReady,
  onConstructionChange,
  onLayoutChange,
  onControls,
}) {
  const frameRef = useRef(null);
  const hostRef = useRef(null);
  const apiRef = useRef(null);
  const fileRef = useRef(ggbBase64 || '');
  const xmlRef = useRef(ggbXml || '');
  const perspectiveRef = useRef(ggbPerspective || '');
  const viewRef = useRef(ggbView || null);
  const layoutRef = useRef(ggbLayout || '');
  const appliedLayoutRef = useRef(ggbLayout || '');
  const menuHoldRef = useRef(false);
  const menuPendingRef = useRef('');
  const menuStillRef = useRef(0);
  const layoutSeenRef = useRef('');
  const appliedStatesRef = useRef(new Map());
  const perspectiveRestoredRef = useRef(false);
  const setupRef = useRef(setup || '');
  const controlsRef = useRef(controls || []);
  const appliedRef = useRef('');
  const appliedXmlRef = useRef('');
  const appliedStructureRef = useRef('');
  const appliedControlsRef = useRef(new Map());
  const glideRef = useRef({
    items: new Map(),
    raf: 0,
    last: 0,
    view: null,
    camera: { now: null, to: null, fit: 0, half: 0, check: 0 },
  });
  const fitTimerRef = useRef(0);
  const sharpRef = useRef(null);
  const appletObjRef = useRef(null);
  const zoomRef = useRef(zoom || 1);
  zoomRef.current = zoom || 1;
  const interactiveRef = useRef(interactive);
  const onReadyRef = useRef(onReady);
  const onChangeRef = useRef(onConstructionChange);
  const onLayoutRef = useRef(onLayoutChange);
  const [status, setStatus] = useState('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    fileRef.current = ggbBase64 || '';
    xmlRef.current = ggbXml || '';
    perspectiveRef.current = ggbPerspective || '';
    viewRef.current = ggbView || null;
    layoutRef.current = ggbLayout || '';
    setupRef.current = setup || '';
    controlsRef.current = controls || [];
  }, [ggbBase64, ggbXml, ggbPerspective, ggbView, ggbLayout, setup, controls]);

  function frameBox() {
    const frame = frameRef.current;
    if (!frame) return null;
    const w = Math.round(frame.clientWidth);
    const h = Math.round(frame.clientHeight);
    if (w < 2 || h < 2) return null;
    return { w, h };
  }

  // Холст рисуется в zoom × плотность экрана. Скейлер уменьшает его обратно в рамку,
  // поэтому зум доски не растягивает график как картинку.
  function pinApplet() {
    const host = hostRef.current;
    const box = frameBox();
    if (!host || !box) return null;
    const scale = geoPixelScale(zoomRef.current);
    const pin = (node) => {
      if (!(node instanceof HTMLElement) || node.classList.contains('applet_scaler')) return;
      const style = node.style;
      if (style.getPropertyValue('width') !== '100%') style.setProperty('width', '100%', 'important');
      if (style.getPropertyValue('height') !== '100%') style.setProperty('height', '100%', 'important');
      if (style.getPropertyValue('max-width') !== 'none') style.setProperty('max-width', 'none', 'important');
      if (style.getPropertyValue('max-height') !== 'none') style.setProperty('max-height', 'none', 'important');
      if (style.getPropertyValue('transform') !== 'none') style.setProperty('transform', 'none', 'important');
    };
    pin(host.firstElementChild);
    const mark = String(scale);
    const width = `${Math.round(box.w * scale)}px`;
    const height = `${Math.round(box.h * scale)}px`;
    const transform = `scale(${1 / scale})`;
    host.querySelectorAll('.applet_scaler').forEach((node) => {
      const current = node.style.getPropertyValue('transform');
      if (node.dataset.sharp === mark && current && current !== 'none') return;
      node.dataset.sharp = mark;
      node.style.setProperty('width', width, 'important');
      node.style.setProperty('height', height, 'important');
      node.style.setProperty('max-width', 'none', 'important');
      node.style.setProperty('max-height', 'none', 'important');
      node.style.setProperty('transform', transform, 'important');
      node.style.setProperty('transform-origin', '0 0', 'important');
    });
    if (appletObjRef.current) appletObjRef.current.scale = scale;
    return box;
  }

  function fitToFrame(api) {
    const box = frameBox();
    if (!box) return;
    const scale = geoPixelScale(zoomRef.current);
    const prev = sharpRef.current;
    const same = prev && prev.w === box.w && prev.h === box.h && prev.scale === scale;
    pinApplet();
    if (same) return;
    sharpRef.current = { w: box.w, h: box.h, scale };
    glideRef.current.camera.fit = 0;
    const flatAnchor = appName === '3d'
      ? null
      : (isGeoGebraView(viewRef.current) ? viewRef.current : readGeoGebraView(api));
    if (api && typeof api.setSize === 'function') {
      try {
        api.setSize(Math.round(box.w * scale), Math.round(box.h * scale));
      } catch {
        /* апплет ещё не готов к смене размера */
      }
    }
    const fitFlat = () => {
      if (!flatAnchor) return;
      try { fitUniformGeoGebraView(apiRef.current, flatAnchor); } catch { /* вид догонит следующим кадром */ }
    };
    fitFlat();
    window.clearTimeout(fitTimerRef.current);
    fitTimerRef.current = window.setTimeout(() => {
      pinApplet();
      fitFlat();
    }, 50);
  }

  function stopGlide() {
    const glide = glideRef.current;
    if (glide.raf) cancelAnimationFrame(glide.raf);
    glide.raf = 0;
    glide.items.clear();
    glide.view = null;
    glide.camera.to = null;
    window.clearTimeout(glide.camera.check);
  }

  function cameraFit() {
    const camera = glideRef.current.camera;
    if (camera.fit > 0) return camera.fit;
    const box = frameBox() || sharpRef.current || { w: width, h: height };
    return Math.max(40, Math.min(box.w, box.h)) / 3.1;
  }

  function stepCamera(api, blend) {
    const camera = glideRef.current.camera;
    const from = camera.now;
    const to = camera.to;
    if (!from || !to) return true;
    const next = {
      xZero: from.xZero + (to.xZero - from.xZero) * blend,
      yZero: from.yZero + (to.yZero - from.yZero) * blend,
      zZero: from.zZero + (to.zZero - from.zZero) * blend,
      scale: from.scale * (to.scale / from.scale) ** blend,
      xAngle: from.xAngle + angleGap(from.xAngle, to.xAngle) * blend,
      zAngle: from.zAngle + angleGap(from.zAngle, to.zAngle) * blend,
    };
    const arrived = sameCamera(next, to, 0.01);
    const value = arrived ? to : next;
    camera.half = writeGeoGebraCamera(api, value, cameraFit());
    camera.now = value;
    if (!arrived) return false;
    camera.to = null;
    checkCamera(api, 0);
    return true;
  }

  // Камера применяется со следующей перерисовкой GeoGebra, поэтому сверка идёт
  // с паузой: совпали углы и центр — уточняем коэффициент масштаба и доводим.
  function checkCamera(api, tries) {
    const camera = glideRef.current.camera;
    window.clearTimeout(camera.check);
    camera.check = window.setTimeout(() => {
      if (camera.to || apiRef.current !== api || interactiveRef.current) return;
      const expected = camera.now;
      const actual = readGeoGebraCamera(api);
      if (!expected || !actual) return;
      const placed = Math.abs(angleGap(actual.xAngle, expected.xAngle)) < 0.5
        && Math.abs(angleGap(actual.zAngle, expected.zAngle)) < 0.5
        && ['xZero', 'yZero', 'zZero'].every((key) => Math.abs(actual[key] - expected[key]) < 0.01 * Math.max(1, Math.abs(expected[key])));
      if (!placed) {
        if (tries < 4) checkCamera(api, tries + 1);
        return;
      }
      if (Math.abs(actual.scale / expected.scale - 1) < 0.005 || !(camera.half > 0)) return;
      camera.fit = actual.scale * camera.half;
      camera.now = actual;
      camera.to = expected;
      kickGlide(api);
    }, 450);
  }

  function glideCamera(api, target) {
    if (!api || !target) return;
    const camera = glideRef.current.camera;
    if (!camera.now) camera.now = readGeoGebraCamera(api);
    if (!camera.now) return;
    if (sameCamera(camera.to || camera.now, target)) return;
    if (sameCamera(camera.now, target)) {
      camera.to = null;
      return;
    }
    camera.to = target;
    kickGlide(api);
  }

  // Центр сдвигается линейно, масштаб — в геометрической прогрессии, чтобы
  // приближение и отдаление шли с одинаковой скоростью.
  function writeView(api, view, blend) {
    const now = readGeoGebraView(api);
    if (!now) return true;
    if (!Number.isFinite(view.wx) || !Number.isFinite(now.wx) || !(view.wx > 0) || !(now.wx > 0)) {
      try { writeGeoGebraView(api, view); } catch { /* вид не применился */ }
      return true;
    }
    const next = {
      cx: now.cx + (view.cx - now.cx) * blend,
      cy: now.cy + (view.cy - now.cy) * blend,
      wx: now.wx * (view.wx / now.wx) ** blend,
      wy: now.wy * (view.wy / now.wy) ** blend,
    };
    const arrived = Math.abs(view.cx - next.cx) < Math.max(now.wx, view.wx) * 0.002
      && Math.abs(view.cy - next.cy) < Math.max(now.wy, view.wy) * 0.002
      && Math.abs(next.wx / view.wx - 1) < 1e-3
      && Math.abs(next.wy / view.wy - 1) < 1e-3;
    try {
      writeGeoGebraView(api, arrived ? view : next);
    } catch {
      return true;
    }
    return arrived;
  }

  function kickGlide(api) {
    const glide = glideRef.current;
    glide.api = api;
    if (glide.raf) return;
    if (!glide.items.size && !glide.view && !glide.camera.to) return;
    glide.last = performance.now();
    const tick = (now) => {
      const current = glide.api;
      if (!current) {
        glide.raf = 0;
        return;
      }
      const elapsed = Math.min(48, now - glide.last);
      glide.last = now;
      const blend = 1 - Math.exp(-elapsed / 110);
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
      if (glide.camera.to) {
        let arrived = true;
        try {
          arrived = stepCamera(current, blend);
        } catch {
          glide.camera.to = null;
        }
        if (!arrived) moving = true;
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

  // Свободные объекты и точки на пути двигаются сами, остальное GeoGebra
  // пересчитывает от них.
  function isMovable(api, name) {
    try {
      if (typeof api.isIndependent === 'function' && api.isIndependent(name)) return true;
      if (typeof api.isMoveable === 'function' && api.isMoveable(name)) return true;
      return typeof api.isIndependent !== 'function';
    } catch {
      return false;
    }
  }

  function glideToward(api, targets) {
    if (!api || !targets?.length) return;
    const glide = glideRef.current;
    targets.forEach((target) => {
      if (!target?.name) return;
      if (typeof api.exists === 'function' && !api.exists(target.name)) return;
      if (!isMovable(api, target.name)) return;
      glide.items.set(target.name, target);
    });
    kickGlide(api);
  }

  // Что изменилось у свободных объектов: точки и числа доводятся плавно, а
  // свободная прямая, вектор или коника без числового представления — только
  // полной заменой построения (null).
  function glidePlan(api, xml, states) {
    if (!sameConstruction(api, xml)) return null;
    const prev = appliedStatesRef.current;
    const targets = new Map(readConstructionTargets(xml).map((target) => [target.name, target]));
    const moves = [];
    for (const [label, state] of states) {
      if (prev.get(label) === state) continue;
      if (!isMovable(api, label)) continue;
      const target = targets.get(label);
      if (!target) return null;
      moves.push(target);
    }
    return moves;
  }

  function rememberApplied(xml) {
    appliedXmlRef.current = xml;
    appliedStructureRef.current = xml ? graphStructure(xml) : '';
    appliedStatesRef.current = xml ? elementStates(xml) : new Map();
  }

  function graphicsVisible(api) {
    const perspective = readGeoGebraPerspective(api);
    const tag = /<view\b[^>]*\bid="1"[^>]*\/?>/.exec(perspective)?.[0] || '';
    if (!tag) return true;
    return !/visible="false"/.test(tag);
  }

  function reloadLayout(api) {
    const file = fileRef.current;
    appliedLayoutRef.current = layoutRef.current;
    if (!file || typeof api.setBase64 !== 'function') return;
    appliedRef.current = file;
    stopGlide();
    try {
      api.setBase64(file, () => {
        // Файл уже содержит и построение, и панели. Повторный setXML
        // оставляет у планиметрии одну алгебру без чертежа.
        rememberApplied(readGeoGebraXml(api) || xmlRef.current);
        const view = appName === '3d' ? null : readGeoGebraView(api);
        sharpRef.current = null;
        fitToFrame(api);
        if (view) {
          try { writeGeoGebraView(api, view); } catch { /* окно чертежа остаётся из файла */ }
        }
        glideRef.current.camera.now = null;
      });
    } catch {
      appliedRef.current = '';
    }
  }

  function glideView(api, view) {
    if (!api || !isGeoGebraView(view)) return;
    if (sameGeoGebraView(readGeoGebraView(api), view)) {
      glideRef.current.view = null;
      return;
    }
    glideRef.current.view = view;
    kickGlide(api);
  }

  function restoreTheoryPerspective(api) {
    if (!api || perspectiveRestoredRef.current || interactiveRef.current) return;
    perspectiveRestoredRef.current = true;
    if (fileRef.current) return;
    const code = theoryPerspectiveCode(setupRef.current);
    if (!code || code.startsWith('<')) return;
    try { api.setPerspective(code); } catch { /* код вида из теории не применился */ }
  }

  // В файле записан размер холста того, кто сохранил построение. Без этой
  // вырезки setXML сжимает чертёж, и под ним остаётся пустая полоса.
  function xmlWithoutViewSize(xml) {
    return String(xml || '').replace(
      /(<euclidianView\b[^>]*>[\s\S]*?<\/euclidianView>|<euclidianView3D\b[^>]*>[\s\S]*?<\/euclidianView3D>)/g,
      (block) => block.replace(/<size\b[^>]*\/>/g, ''),
    );
  }

  function refillFrame(api, kept) {
    if (!api || interactiveRef.current) return;
    sharpRef.current = null;
    fitToFrame(api);
    if (!kept) return;
    if (kept.camera) {
      try { writeGeoGebraCamera(api, kept.camera, cameraFit()); } catch { /* свой вид 3D остаётся */ }
    }
    if (kept.view) {
      try { writeGeoGebraView(api, kept.view); } catch { /* свой масштаб 3D остаётся */ }
    }
    glideRef.current.camera.now = kept.camera || glideRef.current.camera.now;
  }

  function publishMenu() {
    if (appName === '3d') return;
    const layout = layoutSignature(apiRef.current);
    if (!layout || layout === layoutSeenRef.current) return;
    layoutSeenRef.current = layout;
    onLayoutRef.current?.();
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
        refillFrame(api);
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
      if (xml) rememberApplied(xml);
      if (fileRef.current) appliedRef.current = fileRef.current;
      appliedLayoutRef.current = layoutRef.current;
      glideRef.current.camera.now = null;
      return;
    }
    const file = fileRef.current;
    if (file && layoutRef.current && layoutRef.current !== appliedLayoutRef.current) {
      reloadLayout(api);
      return;
    }
    if (xml && xml !== appliedXmlRef.current && typeof api.setXML === 'function') {
      const view = appName === '3d' ? null : viewRef.current;
      const structure = graphStructure(xml);
      const states = elementStates(xml);
      const plan = appName === '3d' ? null : (structure === appliedStructureRef.current ? glidePlan(api, xml, states) : null);
      if (plan) {
        rememberApplied(xml);
        glideToward(api, plan);
        if (view) glideView(api, view);
        glideCamera(api, readCamera3d(xml));
        return;
      }
      const keptCamera = appName === '3d' ? readGeoGebraCamera(api) : null;
      const keptView = appName === '3d' ? readGeoGebraView(api) : null;
      stopGlide();
      try {
        if (typeof api.setRepaintingActive === 'function') api.setRepaintingActive(false);
        api.setXML(xmlWithoutViewSize(xml));
      } catch {
        rememberApplied('');
        return;
      } finally {
        if (typeof api.setRepaintingActive === 'function') api.setRepaintingActive(true);
      }
      rememberApplied(xml);
      if (appName !== '3d' && !graphicsVisible(api)) {
        try { api.setPerspective('AG'); } catch { /* чертёж рядом с алгеброй не открылся */ }
      }
      const kept = appName === '3d' ? { camera: keptCamera, view: keptView } : null;
      refillFrame(api, kept);
      window.setTimeout(() => refillFrame(api, kept), 80);
      glideRef.current.camera.now = appName === '3d' ? keptCamera : readCamera3d(xml);
      if (view) glideView(api, view);
      return;
    }
    if (appName !== '3d' && viewRef.current) {
      glideView(api, viewRef.current);
    }
    if (appliedXmlRef.current || !file) return;
    applyFile(api);
  }

  useEffect(() => {
    onReadyRef.current = onReady;
    onChangeRef.current = onConstructionChange;
    onLayoutRef.current = onLayoutChange;
  }, [onReady, onConstructionChange, onLayoutChange]);

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
        const pixelScale = geoPixelScale(zoomRef.current);
        sharpRef.current = {
          w: Math.max(40, Math.round(sizeAtStart.width)),
          h: Math.max(40, Math.round(sizeAtStart.height)),
          scale: pixelScale,
        };
        // Набор панелей зависит только от объекта, а не от того, успел ли
        // сохраниться файл: иначе у участников разные инструменты.
        const fromTheory = Boolean(String(setupRef.current || '').trim());
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
            const notifyChange = () => {
              if (glideRef.current.raf) return;
              onChangeRef.current?.();
            };
            if (typeof api.registerUpdateListener === 'function') {
              api.registerUpdateListener(notifyChange);
            }
            if (typeof api.registerClientListener === 'function') {
              api.registerClientListener((event) => {
                const type = event?.type;
                if (type === 'viewChanged2D' || type === 'viewChanged3D' || type === 'movingGeos' || type === 'movedGeos' || type === 'dragEnd') {
                  notifyChange();
                }
              });
            }
            fitToFrame(api);
            if (setupRef.current && !fileRef.current && !xmlRef.current) {
              runTheorySetup(api, setupRef.current);
              controlsRef.current.forEach((control) => {
                if (control?.name == null || !Number.isFinite(control.value)) return;
                appliedControlsRef.current.set(control.name, control.value);
                try { api.setValue(control.name, control.value); } catch { /* значение ещё не к чему применить */ }
              });
            } else {
              restoreTheoryPerspective(api);
              applyConstruction(api);
            }
            pinApplet();
            setStatus('ready');
          },
        };
        if (base64AtLoad) params.ggbBase64 = base64AtLoad;
        const applet = new window.GGBApplet(params, true);
        appletObjRef.current = applet;
        applet.inject(host);
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
      stopGlide();
      apiRef.current = null;
      appletObjRef.current = null;
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
  }, [ggbBase64, ggbXml, ggbPerspective, ggbView, ggbLayout]);

  // Не все действия GeoGebra сообщают о себе событиями (поворот 3D, стили,
  // панели), поэтому у редактирующего построение сверяется по таймеру.
  useEffect(() => {
    if (!interactive || status !== 'ready') return undefined;
    const api = apiRef.current;
    if (!api) return undefined;
    let lastXml = readGeoGebraXml(api);
    let lastLayout = layoutSignature(api);
    const timer = window.setInterval(() => {
      // Пока на доске ведут кисть, опрос построения её тормозит.
      if (penActive()) return;
      const current = apiRef.current;
      if (!current) return;
      const xml = readGeoGebraXml(current);
      if (xml && xml !== lastXml) {
        lastXml = xml;
        onChangeRef.current?.();
      }
      const layout = layoutSignature(current);
      if (appName !== '3d' && menuHoldRef.current) {
        if (layout !== menuPendingRef.current) {
          menuPendingRef.current = layout;
          menuStillRef.current = 0;
        } else {
          menuStillRef.current += 150;
        }
        if (menuStillRef.current < 240) return;
        menuHoldRef.current = false;
      }
      if (layout !== lastLayout) {
        lastLayout = layout;
        if (appName === '3d') onLayoutRef.current?.();
        else publishMenu();
      }
    }, 150);
    return () => window.clearInterval(timer);
  }, [interactive, status]);

  useEffect(() => {
    if (!interactive || status !== 'ready' || appName === '3d') return undefined;
    const host = hostRef.current;
    if (!host) return undefined;
    const mark = (event) => {
      const target = event.target;
      if (!(target instanceof Node) || !host.contains(target)) return;
      menuHoldRef.current = true;
      menuStillRef.current = 0;
    };
    const release = () => {
      if (!menuHoldRef.current) return;
      menuHoldRef.current = false;
      requestAnimationFrame(() => publishMenu());
    };
    const hold = () => {
      menuHoldRef.current = true;
      menuStillRef.current = 0;
    };
    const docs = new Set();
    const bindDoc = (doc) => {
      if (!doc || docs.has(doc)) return;
      docs.add(doc);
      doc.addEventListener('pointerdown', hold, true);
      doc.addEventListener('mousedown', hold, true);
      doc.addEventListener('pointerup', release, true);
      doc.addEventListener('pointercancel', release, true);
      doc.addEventListener('mouseup', release, true);
    };
    host.querySelectorAll('iframe').forEach((frame) => {
      try { bindDoc(frame.contentDocument); } catch { /* чужой фрейм */ }
    });
    window.addEventListener('pointerdown', mark, true);
    window.addEventListener('mousedown', mark, true);
    window.addEventListener('pointerup', release, true);
    window.addEventListener('pointercancel', release, true);
    window.addEventListener('mouseup', release, true);
    return () => {
      docs.forEach((doc) => {
        doc.removeEventListener('pointerdown', hold, true);
        doc.removeEventListener('mousedown', hold, true);
        doc.removeEventListener('pointerup', release, true);
        doc.removeEventListener('pointercancel', release, true);
        doc.removeEventListener('mouseup', release, true);
      });
      window.removeEventListener('pointerdown', mark, true);
      window.removeEventListener('mousedown', mark, true);
      window.removeEventListener('pointerup', release, true);
      window.removeEventListener('pointercancel', release, true);
      window.removeEventListener('mouseup', release, true);
    };
    // publishMenu читает только ref-ы и зовётся в момент отпускания.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interactive, status, appName]);

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

  const pixelScale = geoPixelScale(zoom || 1);
  useEffect(() => {
    if (status !== 'ready') return;
    fitToFrame(apiRef.current);
    // Размер холста зависит только от шага pixelScale, не от каждого промежуточного зума.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pixelScale, status]);

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

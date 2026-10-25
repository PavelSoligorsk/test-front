import { useEffect, useRef, useState } from 'react';
import {
  angleGap,
  elementStates,
  graphStructure,
  applyMenuValue,
  fitUniformGeoGebraView,
  isGeoGebraView,
  readGeoGebraUnit,
  readMenuValue,
  writeUniformUnit,
  geoPixelScale,
  layoutSignature,
  loadGeoGebraScript,
  readCamera3d,
  readConstructionTargets,
  cameraFromWire,
  cameraToWire,
  readGeoGebraCamera,
  readGeoGebraPerspective,
  readGeoGebraView,
  readGeoGebraXml,
  runTheorySetup,
  sameCamera,
  sameConstruction,
  sameGeoGebraView,
  stripCamera,
  withCamera,
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
  ggbMenu = '',
  setup = '',
  controls = [],
  texts = [],
  zoom = 1,
  interactive,
  onReady,
  onConstructionChange,
  onLayoutChange,
  onControls,
  boardObjectId = '',
  onCamera,
  onCamBind,
  onInput,
  onInputBind,
}) {
  const frameRef = useRef(null);
  const hostRef = useRef(null);
  const apiRef = useRef(null);
  const fileRef = useRef(ggbBase64 || '');
  const xmlRef = useRef(ggbXml || '');
  const perspectiveRef = useRef(ggbPerspective || '');
  const viewRef = useRef(ggbView || null);
  const layoutRef = useRef(ggbLayout || '');
  const menuRef = useRef(ggbMenu || '');
  const appliedLayoutRef = useRef(ggbLayout || '');
  const menuHoldRef = useRef(false);
  const menuDragRef = useRef(false);
  const menuScaleRef = useRef(null);
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
    camera: {
      now: null, to: null, fit: 0, half: 0, check: 0, live: false, tau: 0,
      shown: null, from: null, t0: 0, dur: 0, lastPacket: 0, lastWrite: 0, writeCost: 0, raf: 0,
    },
  });
  const fitTimerRef = useRef(0);
  const zoomTimerRef = useRef(0);
  const wrapRef = useRef(null);
  const sharpRef = useRef(null);
  const appletObjRef = useRef(null);
  const zoomRef = useRef(zoom || 1);
  zoomRef.current = zoom || 1;
  const interactiveRef = useRef(interactive);
  const wasInteractiveRef = useRef(interactive);
  const quietUntilRef = useRef(0);
  const camSeenRef = useRef(0);
  const camTimerRef = useRef(0);
  const camHeldRef = useRef(false);
  const camReadCostRef = useRef(8);
  const lastSentRef = useRef(0);
  const camQuietRef = useRef(0);
  const camPollRef = useRef(0);
  const camSizeRef = useRef(null);
  const camBufRef = useRef({ q: [], offset: null, delay: 120, raf: 0, last: 0 });
  const lastWireRef = useRef(null);
  const lastCamRef = useRef(null);
  const followRef = useRef(true);
  const [follow, setFollow] = useState(true);
  const onCameraRef = useRef(onCamera);
  const onInputRef = useRef(onInput);
  const replayRef = useRef({
    on: false, b: 0, q: [], offset: null, delay: 70, cur: null,
    lastRecv: 0, lastAt: 0, raf: 0, fx: NaN, fy: NaN, frameRect: null,
  });
  const ghostRef = useRef(null);
  const ghostTimerRef = useRef(0);
  const canvasRef = useRef(null);
  onCameraRef.current = onCamera;
  onInputRef.current = onInput;
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
    menuRef.current = ggbMenu || '';
    setupRef.current = setup || '';
    controlsRef.current = controls || [];
  }, [ggbBase64, ggbXml, ggbPerspective, ggbView, ggbLayout, ggbMenu, setup, controls]);

  function frameBox() {
    const frame = frameRef.current;
    if (!frame) return null;
    const w = Math.round(frame.clientWidth);
    const h = Math.round(frame.clientHeight);
    if (w < 2 || h < 2) return null;
    return { w, h };
  }

  // Своя обёртка: апплет рисуется в пикселях экрана и уменьшается в рамку.
  // Внутренний scaler GeoGebra не трогаем.
  function sharpRatio(box) {
    return geoPixelScale(zoomRef.current || 1, box, appName === '3d' ? 1.25 : 0);
  }

  function applyWrap(box, ratio) {
    const wrap = wrapRef.current;
    if (!wrap || !box || !(ratio > 0)) return null;
    const w = Math.max(1, Math.round(box.w * ratio));
    const h = Math.max(1, Math.round(box.h * ratio));
    wrap.style.width = `${w}px`;
    wrap.style.height = `${h}px`;
    wrap.style.transform = `scale(${box.w / w}, ${box.h / h})`;
    wrap.style.transformOrigin = '0 0';
    return { w, h };
  }

  function fitToFrame(api) {
    const box = frameBox();
    if (!box) return;
    camSizeRef.current = null;
    replayRef.current.frameRect = null;
    const scale = sharpRatio(box);
    const sized = applyWrap(box, scale);
    const prev = sharpRef.current;
    const same = prev && prev.w === box.w && prev.h === box.h && Math.abs((prev.scale || 1) - scale) < 0.001;
    if (same) {
      if (appName !== '3d' && !menuHoldRef.current && applyMenuValue(hostRef.current, menuRef.current)) {
        const anchor = isGeoGebraView(viewRef.current) ? viewRef.current : null;
        if (anchor) {
          try { fitUniformGeoGebraView(apiRef.current, anchor); } catch { /* вид догонит следующим кадром */ }
        }
      }
      return;
    }
    sharpRef.current = { w: box.w, h: box.h, scale };
    camSizeRef.current = null;
    glideRef.current.camera.fit = 0;
    const flatAnchor = appName === '3d'
      ? null
      : (isGeoGebraView(viewRef.current) ? viewRef.current : readGeoGebraView(api));
    const fitFlat = () => {
      if (appName !== '3d' && menuRef.current && !menuHoldRef.current) {
        applyMenuValue(hostRef.current, menuRef.current);
      }
      if (flatAnchor) {
        try { fitUniformGeoGebraView(apiRef.current, flatAnchor); } catch { /* вид догонит следующим кадром */ }
      }
    };
    if (api && sized && typeof api.setSize === 'function') {
      try { api.setRepaintingActive?.(false); } catch { /* старая сборка без этого метода */ }
      try {
        api.setSize(sized.w, sized.h);
        fitFlat();
      } catch {
        /* апплет ещё не готов к смене размера */
      } finally {
        try { api.setRepaintingActive?.(true); } catch { /* перерисовка включится сама */ }
      }
    } else {
      fitFlat();
    }
    const gen = fitTimerRef.current + 1;
    fitTimerRef.current = gen;
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (fitTimerRef.current !== gen || apiRef.current !== api) return;
        const nextBox = frameBox();
        if (nextBox) applyWrap(nextBox, sharpRatio(nextBox));
        fitFlat();
      });
    });
  }

  function stopGlide() {
    const glide = glideRef.current;
    if (glide.raf) cancelAnimationFrame(glide.raf);
    glide.raf = 0;
    glide.items.clear();
    glide.view = null;
    const camera = glide.camera;
    if (camera.raf) cancelAnimationFrame(camera.raf);
    camera.raf = 0;
    camera.to = null;
    camera.from = null;
    camera.shown = null;
    window.clearTimeout(camera.check);
    const buf = camBufRef.current;
    if (buf.raf) cancelAnimationFrame(buf.raf);
    buf.raf = 0;
    buf.q = [];
  }

  function cameraFit() {
    const camera = glideRef.current.camera;
    if (camera.fit > 0) return camera.fit;
    const box = frameBox() || sharpRef.current || { w: width, h: height };
    const ratio = sharpRef.current?.scale || geoPixelScale(zoomRef.current || 1);
    const canvas = Math.min(box.w, box.h) * ratio;
    return Math.max(40, canvas) / 3.1;
  }

  function stepCamera(api, blend) {
    const camera = glideRef.current.camera;
    const from = camera.now;
    const to = camera.to;
    if (!from || !to) return true;
    const nearPole = Math.min(Math.abs(Math.abs(from.xAngle) - 90), Math.abs(Math.abs(to.xAngle) - 90)) < 12;
    const next = {
      xZero: from.xZero + (to.xZero - from.xZero) * blend,
      yZero: from.yZero + (to.yZero - from.yZero) * blend,
      zZero: from.zZero + (to.zZero - from.zZero) * blend,
      scale: from.scale * (to.scale / from.scale) ** blend,
      xAngle: from.xAngle + angleGap(from.xAngle, to.xAngle) * blend,
      zAngle: nearPole ? from.zAngle : from.zAngle + angleGap(from.zAngle, to.zAngle) * blend,
    };
    const arrived = sameCamera(nearPole ? { ...next, zAngle: to.zAngle } : next, to, 0.01);
    const value = arrived ? to : next;
    camera.half = writeGeoGebraCamera(api, value, cameraFit());
    camera.now = value;
    if (!arrived) return false;
    camera.to = null;
    if (!camera.live) checkCamera(api, 0);
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

  function glideCamera(api, target, live = false) {
    if (!api || !target) return;
    const camera = glideRef.current.camera;
    if (!camera.now) camera.now = readGeoGebraCamera(api);
    if (!camera.now) return;
    camera.live = live;
    camera.tau = live ? 65 : 0;
    if (sameCamera(camera.to || camera.now, target, live ? 1e-3 : 1e-3)) return;
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
          const tau = glide.camera.tau || 110;
          const camBlend = 1 - Math.exp(-elapsed / tau);
          arrived = stepCamera(current, camBlend);
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

  function splitterTarget(target) {
    return target instanceof Element
      && Boolean(target.closest('.gwt-SplitLayoutPanel-HDragger, .gwt-SplitLayoutPanel-VDragger'));
  }

  function rememberMenuScale() {
    if (menuScaleRef.current) return;
    const api = apiRef.current;
    const view = readGeoGebraView(api);
    const unit = readGeoGebraUnit(api);
    if (!view || !(unit > 0)) return;
    menuScaleRef.current = { view, unit, menu: readMenuValue(api) };
  }

  function sameWire(a, b) {
    return a && b
      && Math.abs(a.az - b.az) < 0.05 && Math.abs(a.el - b.el) < 0.05
      && Math.abs(a.z / b.z - 1) < 1e-3
      && a.c.every((value, index) => Math.abs(value - b.c[index]) < 1e-3 * Math.max(1, Math.abs(value)));
  }

  function viewSize3d() {
    const sharp = sharpRef.current;
    if (sharp?.w > 0 && sharp?.h > 0 && sharp.scale > 0) {
      return { w: sharp.w * sharp.scale, h: sharp.h * sharp.scale };
    }
    const box = frameBox();
    if (!box) return null;
    const ratio = sharpRatio(box);
    return { w: box.w * ratio, h: box.h * ratio };
  }

  function publishCamera(api, force = false) {
    camTimerRef.current = 0;
    if ((!force && !interactiveRef.current) || !api || apiRef.current !== api) return;
    const started = performance.now();
    const xml = readGeoGebraXml(api);
    camReadCostRef.current = camReadCostRef.current * 0.8 + (performance.now() - started) * 0.2;
    const cam = readCamera3d(xml);
    const size = viewSize3d();
    if (!cam || !size) return;
    camSizeRef.current = size;
    const wire = cameraToWire(cam, size);
    if (!wire || sameWire(lastWireRef.current, wire)) return;
    lastWireRef.current = wire;
    lastSentRef.current = performance.now();
    onCameraRef.current?.({ seq: Math.floor(performance.timeOrigin + performance.now()), ...wire });
  }

  function scheduleCamera(api, force = false) {
    if (!force) followRef.current = false;
    const wait = Math.max(50, camReadCostRef.current * 3);
    const now = performance.now();
    window.clearTimeout(camTimerRef.current);
    if (force || now - lastSentRef.current >= wait) {
      camTimerRef.current = 0;
      publishCamera(api, force);
      return;
    }
    camTimerRef.current = window.setTimeout(() => publishCamera(api), wait - (now - lastSentRef.current));
  }

  function applyLiveCamera(api, value) {
    const camera = glideRef.current.camera;
    const prev = camera.shown;
    const angles = !prev
      || Math.abs(angleGap(prev.xAngle, value.xAngle)) > 0.05
      || Math.abs(angleGap(prev.zAngle, value.zAngle)) > 0.05;
    const place = !prev
      || Math.abs(prev.scale / value.scale - 1) > 1e-3
      || Math.hypot(prev.xZero - value.xZero, prev.yZero - value.yZero, prev.zZero - value.zZero) > 1e-3;
    if (!angles && !place) {
      camera.shown = value;
      return;
    }
    const half = cameraFit() / value.scale;
    const x = -value.xZero;
    const y = -value.yZero;
    const z = -value.zZero;
    try { api.setRepaintingActive?.(false); } catch { /* старая сборка рисует сразу */ }
    try {
      if (angles) {
        const azimuth = value.zAngle + 180;
        const elevation = -value.xAngle;
        api.evalCommand(`SetViewDirection(Vector((1; ${azimuth.toFixed(4)}°; ${elevation.toFixed(4)}°)), false)`);
      }
      if (place || angles) {
        api.setCoordSystem(x - half, x + half, y - half, y + half, z - half, z + half);
      }
      camera.half = half;
    } finally {
      try { api.setRepaintingActive?.(true); } catch { /* перерисовка включится сама */ }
    }
    camera.shown = value;
  }

  function settleCamera(api, expected) {
    const camera = glideRef.current.camera;
    window.clearTimeout(camera.check);
    camera.check = window.setTimeout(() => {
      if (apiRef.current !== api || interactiveRef.current || replayRef.current.on) return;
      const actual = readGeoGebraCamera(api);
      if (!actual || !(camera.half > 0)) return;
      if (Math.abs(actual.scale / expected.scale - 1) <= 0.005) return;
      camera.fit = actual.scale * camera.half;
      camera.half = cameraFit() / expected.scale;
      camera.shown = null;
      applyLiveCamera(api, expected);
    }, 450);
  }

  function tickCam(api) {
    const buf = camBufRef.current;
    buf.raf = 0;
    if (apiRef.current !== api || interactiveRef.current || replayRef.current.on || !buf.q.length) return;
    const play = performance.now() - buf.delay;
    while (buf.q.length > 1 && buf.q[1].at <= play) buf.q.shift();
    const [from, to] = buf.q;
    if (play < from.at) {
      buf.raf = requestAnimationFrame(() => tickCam(api));
      return;
    }
    const span = to ? to.at - from.at : 1;
    const k = to ? Math.min(1, Math.max(0, (play - from.at) / Math.max(1, span))) : 1;
    const value = to ? lerpCamera(from.cam, to.cam, k) : from.cam;
    try {
      applyLiveCamera(api, value);
    } catch {
      buf.q.length = 0;
      return;
    }
    if (to) buf.raf = requestAnimationFrame(() => tickCam(api));
    else settleCamera(api, value);
  }

  function pushCamSample(api, cam, sentWallMs) {
    const buf = camBufRef.current;
    const recv = performance.now();
    const sent = sentWallMs - performance.timeOrigin;
    const skew = recv - sent;
    buf.offset = buf.offset == null || skew < buf.offset ? skew : buf.offset + (skew - buf.offset) * 0.002;
    const at = Math.max(buf.last, sent + buf.offset);
    buf.last = at;
    buf.q.push({ cam, at });
    if (buf.q.length > 60) buf.q.splice(0, buf.q.length - 30);
    window.clearTimeout(glideRef.current.camera.check);
    if (!buf.raf) buf.raf = requestAnimationFrame(() => tickCam(api));
  }

  function lerpCamera(from, to, k) {
    const mix = (a, b) => a + (b - a) * k;
    return {
      xZero: mix(from.xZero, to.xZero),
      yZero: mix(from.yZero, to.yZero),
      zZero: mix(from.zZero, to.zZero),
      scale: from.scale * (to.scale / from.scale) ** k,
      xAngle: from.xAngle + angleGap(from.xAngle, to.xAngle) * k,
      zAngle: from.zAngle + angleGap(from.zAngle, to.zAngle) * k,
    };
  }

  function takeGeoCam(message) {
    lastCamRef.current = message;
    if (interactiveRef.current || !followRef.current) return;
    const api = apiRef.current;
    if (!api) return;
    const size = viewSize3d();
    const cam = size && cameraFromWire(message, size);
    if (!cam) return;
    if (replayRef.current.on) return;
    const sent = Number.isFinite(message.seq) ? message.seq : performance.timeOrigin + performance.now();
    pushCamSample(api, cam, sent);
  }

  function canvas3d() {
    const cached = canvasRef.current;
    if (cached?.isConnected) return cached;
    let best = null;
    hostRef.current?.querySelectorAll('canvas').forEach((canvas) => {
      if (!best || canvas.width * canvas.height > best.width * best.height) best = canvas;
    });
    canvasRef.current = best;
    return best;
  }

  function pxOf(u, v, rect) {
    if (!Number.isFinite(u) || !Number.isFinite(v)) return null;
    const span = Math.min(rect.width, rect.height);
    if (!(span > 0)) return null;
    const k = Math.min(
      1,
      (rect.width / 2 / span) / Math.max(Math.abs(u), 1e-6),
      (rect.height / 2 / span) / Math.max(Math.abs(v), 1e-6),
    );
    return {
      x: rect.left + rect.width / 2 + u * k * span,
      y: rect.top + rect.height / 2 + v * k * span,
    };
  }

  function resetReplay() {
    const state = replayRef.current;
    if (state.raf) cancelAnimationFrame(state.raf);
    Object.assign(state, { on: false, q: [], cur: null, raf: 0, fx: NaN, fy: NaN, offset: null });
    paintGhost(0, 0, false);
  }

  function firePointer(type, x, y, movementX = 0, movementY = 0) {
    const canvas = canvas3d();
    const state = replayRef.current;
    if (!canvas) return;
    const buttons = type === 'pointerup' || !state.on ? 0 : (state.b === 2 ? 2 : 1);
    const mouseType = type === 'pointerdown' ? 'mousedown' : type === 'pointerup' ? 'mouseup' : 'mousemove';
    canvas.dispatchEvent(new MouseEvent(mouseType, {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: x,
      clientY: y,
      movementX,
      movementY,
      button: state.b,
      buttons,
      detail: 97,
    }));
  }

  function paintGhost(x, y, show) {
    const ghost = ghostRef.current;
    const frame = frameRef.current;
    if (!ghost || !frame) return;
    window.clearTimeout(ghostTimerRef.current);
    if (!show) {
      ghost.style.display = 'none';
      return;
    }
    const frameRect = replayRef.current.frameRect;
    if (!frameRect) return;
    const zoom = zoomRef.current || 1;
    ghost.style.display = 'block';
    ghost.style.transform = `translate(${(x - frameRect.left) / zoom}px, ${(y - frameRect.top) / zoom}px) scale(${1 / zoom})`;
    ghostTimerRef.current = window.setTimeout(() => {
      if (ghostRef.current) ghostRef.current.style.display = 'none';
    }, 2000);
  }

  function enqueueInput(message) {
    if (interactiveRef.current || appName !== '3d') return;
    const state = replayRef.current;
    const recv = performance.now();
    if (recv - state.lastRecv > 3000) state.offset = null;
    state.lastRecv = recv;
    if (Number.isFinite(message.t)) {
      const skew = recv - message.t;
      state.offset = state.offset == null || skew < state.offset ? skew : state.offset + (skew - state.offset) * 0.002;
    }
    const at = Math.max(
      state.lastAt,
      Number.isFinite(message.t) && state.offset != null ? message.t + state.offset : recv,
    );
    state.lastAt = at;
    state.q.push({ ...message, at });
    if (state.q.length > 600) state.q.splice(0, state.q.length - 300);
    pumpCursor();
  }

  function moveTo(u, v, rect) {
    const state = replayRef.current;
    const point = pxOf(u, v, rect);
    if (!point) return;
    const dx = point.x - (Number.isFinite(state.fx) ? state.fx : point.x);
    const dy = point.y - (Number.isFinite(state.fy) ? state.fy : point.y);
    if (Math.hypot(dx, dy) >= 0.25) {
      firePointer('pointermove', point.x, point.y, dx, dy);
      state.fx = point.x;
      state.fy = point.y;
    }
    paintGhost(point.x, point.y, true);
  }

  function playEvent(message, rect) {
    const state = replayRef.current;
    const point = pxOf(message.u, message.v, rect);
    if (!point) return;
    state.cur = { u: message.u, v: message.v, at: message.at };
    if (message.ev === 'down') {
      const cam = glideRef.current.camera;
      if (cam.raf) cancelAnimationFrame(cam.raf);
      cam.raf = 0;
      cam.to = null;
      cam.from = null;
      cam.shown = null;
      window.clearTimeout(cam.check);
      const buf = camBufRef.current;
      if (buf.raf) cancelAnimationFrame(buf.raf);
      buf.raf = 0;
      buf.q = [];
      state.on = true;
      state.b = message.b === 2 ? 2 : 0;
      state.fx = point.x;
      state.fy = point.y;
      firePointer('pointerdown', point.x, point.y);
    } else if (message.ev === 'up') {
      moveTo(message.u, message.v, rect);
      firePointer('pointerup', point.x, point.y);
      state.on = false;
      window.setTimeout(() => {
        try { applyConstruction(apiRef.current); } catch { /* построение догонит следующим сообщением */ }
        if (lastCamRef.current && !replayRef.current.on) takeGeoCam(lastCamRef.current);
      }, 120);
    } else if (message.ev === 'wheel') {
      canvas3d()?.dispatchEvent(new WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        deltaY: message.dy || 0,
        clientX: point.x,
        clientY: point.y,
        detail: 97,
      }));
    }
  }

  function pumpCursor() {
    const state = replayRef.current;
    if (state.raf) return;
    const step = (now) => {
      state.raf = 0;
      const canvas = canvas3d();
      if (!canvas || interactiveRef.current) {
        state.q.length = 0;
        return;
      }
      const rect = canvas.getBoundingClientRect();
      state.frameRect = frameRef.current?.getBoundingClientRect() || state.frameRect;
      const playT = now - state.delay;
      while (state.q.length && state.q[0].at <= playT) playEvent(state.q.shift(), rect);
      if (state.cur) {
        let { u, v } = state.cur;
        const next = state.q.find((item) => item.ev !== 'wheel');
        if (next) {
          const span = next.at - state.cur.at;
          const k = span > 0 ? Math.min(1, Math.max(0, (playT - state.cur.at) / span)) : 1;
          u += (next.u - u) * k;
          v += (next.v - v) * k;
        }
        moveTo(u, v, rect);
      }
      if (state.q.length) state.raf = requestAnimationFrame(step);
    };
    state.raf = requestAnimationFrame(step);
  }

  function followLeader() {
    followRef.current = true;
    setFollow(true);
    const message = lastCamRef.current;
    if (!message) return;
    camSeenRef.current = 0;
    takeGeoCam(message);
  }

  function publishMenu() {
    if (appName === '3d') return;
    const layout = layoutSignature(apiRef.current);
    const menu = readMenuValue(apiRef.current);
    const menuChanged = Boolean(menu) && menu !== (menuRef.current || '');
    if ((!layout || layout === layoutSeenRef.current) && !menuChanged) return;
    if (layout) layoutSeenRef.current = layout;
    if (menu) menuRef.current = menu;
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
    if (appName === '3d' && replayRef.current.on) return;
    const xml = xmlRef.current;
    if (interactiveRef.current) {
      if (xml) rememberApplied(appName === '3d' ? stripCamera(xml) : xml);
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
    const comparable = appName === '3d' ? stripCamera(xml) : xml;
    if (comparable && comparable !== appliedXmlRef.current && typeof api.setXML === 'function') {
      const view = appName === '3d' ? null : viewRef.current;
      const structure = graphStructure(comparable);
      const states = elementStates(xml);
      const plan = structure === appliedStructureRef.current ? glidePlan(api, xml, states) : null;
      if (plan) {
        rememberApplied(comparable);
        glideToward(api, plan);
        if (view) glideView(api, view);
        if (appName !== '3d') glideCamera(api, readCamera3d(xml));
        return;
      }
      const keptCamera = appName === '3d' ? readGeoGebraCamera(api) : null;
      const keptView = appName === '3d' ? readGeoGebraView(api) : null;
      stopGlide();
      const painted = appName === '3d'
        ? withCamera(xmlWithoutViewSize(xml), keptCamera)
        : xmlWithoutViewSize(xml);
      try {
        if (typeof api.setRepaintingActive === 'function') api.setRepaintingActive(false);
        api.setXML(painted);
      } catch {
        rememberApplied('');
        return;
      } finally {
        if (typeof api.setRepaintingActive === 'function') api.setRepaintingActive(true);
      }
      rememberApplied(comparable);
      if (appName !== '3d' && !graphicsVisible(api)) {
        try { api.setPerspective('AG'); } catch { /* чертёж рядом с алгеброй не открылся */ }
      }
      if (appName !== '3d') {
        refillFrame(api, keptView ? { view: keptView } : null);
        window.setTimeout(() => refillFrame(api, keptView ? { view: keptView } : null), 80);
        glideRef.current.camera.now = readCamera3d(xml);
        if (view) glideView(api, view);
      } else {
        camSizeRef.current = null;
        glideRef.current.camera.now = keptCamera;
      }
      return;
    }
    if (appName !== '3d' && viewRef.current) {
      glideView(api, viewRef.current);
    }
    if (appliedXmlRef.current || !file) return;
    applyFile(api);
  }

  useEffect(() => {
    if (!interactive || status !== 'ready' || appName !== '3d') return undefined;
    const host = hostRef.current;
    if (!host) return undefined;
    let pressed = false;
    let button = 0;
    let lastSent = 0;
    let pending = null;
    let timer = 0;
    let wheelAcc = 0;
    let wheelEvent = null;
    let wheelTimer = 0;
    const place = (event) => {
      const canvas = canvas3d();
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const span = Math.min(rect.width, rect.height);
      if (!(span > 0)) return null;
      return {
        u: (event.clientX - rect.left - rect.width / 2) / span,
        v: (event.clientY - rect.top - rect.height / 2) / span,
      };
    };
    const send = (ev, event, extra) => {
      const point = place(event);
      if (!point) return;
      const t = event.timeStamp > 0 && event.timeStamp < 1e11 ? event.timeStamp : performance.now();
      onInputRef.current?.({ ev, b: button, t, ...point, ...extra });
    };
    const tick = () => {
      timer = 0;
      if (!pending) return;
      send(pressed ? 'move' : 'hover', pending);
      pending = null;
      lastSent = performance.now();
    };
    const down = (event) => {
      const canvas = canvas3d();
      if (!canvas || !(event.target instanceof Node) || !canvas.contains(event.target)) return;
      pressed = true;
      button = (event.button === 2 || event.ctrlKey) ? 2 : 0;
      send('down', event);
    };
    const move = (event) => {
      const canvas = canvas3d();
      if (!pressed && !(canvas && event.target instanceof Node && canvas.contains(event.target))) return;
      const samples = event.getCoalescedEvents?.();
      pending = samples?.length ? samples[samples.length - 1] : event;
      if (!timer) timer = window.requestAnimationFrame(tick);
    };
    const up = (event) => {
      if (!pressed) return;
      pressed = false;
      pending = null;
      send('up', event);
    };
    const wheel = (event) => {
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
      wheelAcc += event.deltaY * unit;
      wheelEvent = event;
      if (!wheelTimer) {
        wheelTimer = window.setTimeout(() => {
          wheelTimer = 0;
          if (!wheelAcc || !wheelEvent) return;
          send('wheel', wheelEvent, { dy: wheelAcc });
          wheelAcc = 0;
        }, 33);
      }
    };
    host.addEventListener('pointerdown', down, true);
    host.addEventListener('wheel', wheel, true);
    window.addEventListener('pointermove', move, true);
    window.addEventListener('pointerup', up, true);
    window.addEventListener('pointercancel', up, true);
    return () => {
      window.cancelAnimationFrame(timer);
      window.clearTimeout(wheelTimer);
      host.removeEventListener('pointerdown', down, true);
      host.removeEventListener('wheel', wheel, true);
      window.removeEventListener('pointermove', move, true);
      window.removeEventListener('pointerup', up, true);
      window.removeEventListener('pointercancel', up, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interactive, status, appName]);

  useEffect(() => {
    if (status !== 'ready' || appName !== '3d' || !onInputBind || !boardObjectId) return undefined;
    onInputBind(boardObjectId, (message) => enqueueInput(message));
    return () => onInputBind(boardObjectId, null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, appName, boardObjectId, onInputBind]);

  useEffect(() => {
    if (!interactive || status !== 'ready' || appName !== '3d') return undefined;
    const host = hostRef.current;
    if (!host) return undefined;
    let held = false;
    const down = () => {
      held = true;
      camHeldRef.current = true;
      followRef.current = false;
      window.clearTimeout(camQuietRef.current);
      camQuietRef.current = window.setTimeout(() => {
        if (!camHeldRef.current || camPollRef.current) return;
        camPollRef.current = window.setInterval(() => publishCamera(apiRef.current), 450);
      }, 200);
    };
    const up = () => {
      if (!held) return;
      held = false;
      camHeldRef.current = false;
      window.clearTimeout(camQuietRef.current);
      window.clearInterval(camPollRef.current);
      camPollRef.current = 0;
      window.setTimeout(() => scheduleCamera(apiRef.current, true), 60);
      if (!followRef.current) setFollow(false);
    };
    const wheel = () => {
      if (!interactiveRef.current) return;
      window.clearTimeout(camTimerRef.current);
      camTimerRef.current = window.setTimeout(() => publishCamera(apiRef.current), 150);
    };
    host.addEventListener('pointerdown', down, true);
    host.addEventListener('wheel', wheel, true);
    window.addEventListener('pointerup', up, true);
    window.addEventListener('pointercancel', up, true);
    return () => {
      window.clearTimeout(camQuietRef.current);
      window.clearInterval(camPollRef.current);
      camPollRef.current = 0;
      host.removeEventListener('pointerdown', down, true);
      host.removeEventListener('wheel', wheel, true);
      window.removeEventListener('pointerup', up, true);
      window.removeEventListener('pointercancel', up, true);
    };
    // scheduleCamera читает только ref-ы.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interactive, status, appName]);

  useEffect(() => {
    if (status !== 'ready' || appName !== '3d' || !onCamBind || !boardObjectId) return undefined;
    let camWait = 0;
    onCamBind(boardObjectId, (message) => {
      const state = replayRef.current;
      if (!(state.on || state.q.length)) {
        takeGeoCam(message);
        return;
      }
      lastCamRef.current = message;
      window.clearTimeout(camWait);
      camWait = window.setTimeout(() => takeGeoCam(message), state.delay);
    });
    return () => {
      window.clearTimeout(camWait);
      onCamBind(boardObjectId, null);
    };
    // takeGeoCam читает только ref-ы.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, appName, boardObjectId, onCamBind]);

  useEffect(() => {
    onReadyRef.current = onReady;
    onChangeRef.current = onConstructionChange;
    onLayoutRef.current = onLayoutChange;
  }, [onReady, onConstructionChange, onLayoutChange]);

  useEffect(() => {
    const frame = frameRef.current;
    const host = hostRef.current;
    if (!frame || !host) return;
    const was = wasInteractiveRef.current;
    wasInteractiveRef.current = interactive;
    if (was && !interactive && status === 'ready' && appName === '3d') {
      scheduleCamera(apiRef.current, true);
    }
    interactiveRef.current = interactive;
    if (interactive && !was) {
      stopGlide();
      glideRef.current.camera.shown = null;
      resetReplay();
      quietUntilRef.current = performance.now() + 300;
    }
    host.inert = !interactive;
    host.style.pointerEvents = interactive ? 'auto' : 'none';
    if (!interactive && frame.contains(document.activeElement)) {
      document.activeElement.blur();
    }
    if (was && !interactive && status === 'ready') {
      const resume = followRef.current;
      followRef.current = true;
      setFollow(true);
      if (resume && appName === '3d' && lastCamRef.current) {
        camSeenRef.current = 0;
        takeGeoCam(lastCamRef.current);
      }
      quietUntilRef.current = performance.now() + 300;
      appliedXmlRef.current = '';
      try { applyConstruction(apiRef.current); } catch { /* чужое построение догонит следующим сообщением */ }
    }
  }, [interactive, status]);

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
        const pixelScale = sharpRatio({
          w: Math.max(40, Math.round(sizeAtStart.width)),
          h: Math.max(40, Math.round(sizeAtStart.height)),
        });
        applyWrap(
          { w: Math.max(40, Math.round(sizeAtStart.width)), h: Math.max(40, Math.round(sizeAtStart.height)) },
          pixelScale,
        );
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
          width: Math.max(40, Math.round(sizeAtStart.width * pixelScale)),
          height: Math.max(40, Math.round(sizeAtStart.height * pixelScale)),
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
              if (!interactiveRef.current) return;
              if (performance.now() < quietUntilRef.current) return;
              if (menuDragRef.current || glideRef.current.raf) return;
              onChangeRef.current?.();
            };
            if (typeof api.registerUpdateListener === 'function') {
              api.registerUpdateListener(notifyChange);
            }
            if (typeof api.registerClientListener === 'function') {
              api.registerClientListener((event) => {
                const type = event?.type;
                if (appName === '3d' && type && type !== 'viewChanged3D' && type !== 'movingGeos' && type !== 'movedGeos' && type !== 'dragEnd') {
                  camSizeRef.current = null;
                }
                if (type === 'viewChanged3D') {
                  if (appName === '3d' && interactiveRef.current && !camHeldRef.current) {
                    window.clearTimeout(camTimerRef.current);
                    camTimerRef.current = window.setTimeout(() => publishCamera(api), 150);
                  }
                  return;
                }
                if (type === 'viewChanged2D' || type === 'movingGeos' || type === 'movedGeos' || type === 'dragEnd') {
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
      const dying = appletObjRef.current;
      try { dying?.removeExistingApplet?.(appletId, false); } catch { /* апплет уже снят */ }
      try { window[appletId]?.remove?.(); } catch { /* веб-контекст уже закрыт */ }
      try { delete window[appletId]; } catch { /* имя апплета занято */ }
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
    let lastXml = appName === '3d' ? stripCamera(readGeoGebraXml(api)) : readGeoGebraXml(api);
    let lastLayout = layoutSignature(api);
    const timer = window.setInterval(() => {
      // Пока на доске ведут кисть, опрос построения её тормозит.
      if (penActive() || camHeldRef.current) return;
      if (performance.now() < quietUntilRef.current) return;
      const current = apiRef.current;
      if (!current) return;
      if (appName !== '3d' && menuHoldRef.current) return;
      const xml = readGeoGebraXml(current);
      const comparable = appName === '3d' ? stripCamera(xml) : xml;
      if (comparable && comparable !== lastXml) {
        lastXml = comparable;
        onChangeRef.current?.();
      }
      const layout = layoutSignature(current);
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
    const arm = (target) => {
      menuHoldRef.current = true;
      if (!splitterTarget(target)) return;
      menuDragRef.current = true;
      rememberMenuScale();
    };
    const mark = (event) => {
      const target = event.target;
      if (!(target instanceof Node) || !host.contains(target)) return;
      arm(target);
    };
    let releaseTimer = 0;
    const release = () => {
      if (!menuHoldRef.current) return;
      window.clearTimeout(releaseTimer);
      releaseTimer = window.setTimeout(() => {
        const api = apiRef.current;
        const snap = menuScaleRef.current;
        const menu = api ? readMenuValue(api) : '';
        const changed = Boolean(snap && menu && menu !== snap.menu);
        if (changed) {
          try { writeUniformUnit(api, snap.view, snap.unit); } catch { /* масштаб остаётся как до сдвига меню */ }
        }
        menuScaleRef.current = null;
        menuDragRef.current = false;
        menuHoldRef.current = false;
        if (changed) publishMenu();
        onChangeRef.current?.();
      }, 40);
    };
    const hold = (event) => {
      arm(event.target);
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
      window.clearTimeout(releaseTimer);
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
    return () => {
      resizeObserver.disconnect();
      fitTimerRef.current += 1;
    };
  }, [status]);

  useEffect(() => {
    if (status !== 'ready') return undefined;
    window.clearTimeout(zoomTimerRef.current);
    zoomTimerRef.current = window.setTimeout(() => {
      const box = frameBox();
      const need = sharpRatio(box);
      const have = sharpRef.current?.scale || 1;
      if (need > have * 1.02 || need < have * 0.6) fitToFrame(apiRef.current);
    }, 150);
    return () => window.clearTimeout(zoomTimerRef.current);
    // Пока доску зумят, её CSS просто растягивает холст. Резкость догоняется после жеста.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, status, appName]);

  useEffect(() => {
    if (status !== 'ready') return undefined;
    let mq;
    const onChange = () => {
      bind();
      sharpRef.current = null;
      fitToFrame(apiRef.current);
    };
    const bind = () => {
      mq?.removeEventListener('change', onChange);
      mq = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      mq.addEventListener('change', onChange);
    };
    bind();
    return () => mq?.removeEventListener('change', onChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      <div ref={wrapRef} className="absolute left-0 top-0 z-0">
        <div ref={hostRef} className="h-full w-full" />
      </div>
      {!interactive && <div className="absolute inset-0 z-10" style={{ cursor: 'inherit' }} />}
      <div ref={ghostRef} className="pointer-events-none absolute left-0 top-0 z-20" style={{ display: 'none' }}>
        <svg width="18" height="18" viewBox="0 0 18 18">
          <path d="M2 1.5 L15 8.5 L9 10 L6.5 16 Z" fill="#2563eb" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      </div>
      {appName === '3d' && !interactive && !follow && (
        <button
          type="button"
          data-chrome="true"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            followLeader();
          }}
          className="absolute right-2 top-2 z-30 rounded-md bg-zinc-900 px-2 py-1 text-[11px] font-semibold text-white"
        >
          К виду ведущего
        </button>
      )}
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

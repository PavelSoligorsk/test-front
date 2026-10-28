import { useEffect, useEffectEvent, useRef, useState } from 'react';
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
  readCamera3d,
  readConstructionTargets,
  cameraFromWire,
  cameraToWire,
  readGeoGebraCamera,
  readGeoGebraPerspective,
  readGeoGebraView,
  readGeoGebraXml,
  sameCamera,
  sameConstruction,
  sameGeoGebraView,
  stripCamera,
  withCamera,
  writeGeoGebraCamera,
  writeGeoGebraView,
} from './geogebraApi';
import GeoGebraControls from '../../shared/geogebra/GeoGebraControls';
import { createClockSync, createPlayback, createPlaybackGroup } from '../../shared/lib/playback';
import { loadGeoGebra } from '../../shared/geogebra/loader';
import { appletParams, removeApplet } from '../../shared/geogebra/params';
import { runSetup, theoryPerspectiveCode } from '../../shared/geogebra/setup';
import { penActive } from './penLock';

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
  materialId = '',
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
  onMove,
  onMoveBind,
  onInput,
  onInputBind,
}) {
  const frameRef = useRef(null);
  const onInputRef = useRef(onInput);
  const [viewCursor, setViewCursor] = useState(null);
  const hostRef = useRef(null);
  const apiRef = useRef(null);
  const fileRef = useRef(ggbBase64 || '');
  const xmlRef = useRef(ggbXml || '');
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
  // Точки, числа и окно чертежа у зрителя доезжают до цели через общий буфер
  // воспроизведения; камера 3D — через свой буфер с той же схемой.
  const playRef = useRef(null);
  const deltaAtRef = useRef(new Map());
  const moveQueueRef = useRef({ moves: new Map(), timer: 0 });
  const moveClockRef = useRef(createClockSync());
  const camClockRef = useRef(createClockSync());
  const camPlayRef = useRef({ playback: createPlayback({ delay: 120, lerp: lerpCamera, adaptive: true }), raf: 0 });
  const glideRef = useRef({
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
  const lastWireRef = useRef(null);
  const lastCamRef = useRef(null);
  const followRef = useRef(true);
  const [follow, setFollow] = useState(true);
  const onCameraRef = useRef(onCamera);
  const onMoveRef = useRef(onMove);
  onCameraRef.current = onCamera;
  onMoveRef.current = onMove;
  const onReadyRef = useRef(onReady);
  const onChangeRef = useRef(onConstructionChange);
  const onLayoutRef = useRef(onLayoutChange);
  const [status, setStatus] = useState('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    fileRef.current = ggbBase64 || '';
    xmlRef.current = ggbXml || '';
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

  function playback() {
    if (!playRef.current) {
      playRef.current = {
        elements: createPlaybackGroup({
          delay: 100,
          interval: 100,
          adaptive: true,
          onFrame: (name, value) => writeElement(apiRef.current, name, value),
        }),
        view: createPlaybackGroup({
          delay: 60,
          interval: 120,
          onFrame: (_, value) => {
            try { writeGeoGebraView(apiRef.current, value); } catch { /* вид не применился */ }
          },
        }),
      };
    }
    return playRef.current;
  }

  function stopGlide() {
    playRef.current?.elements.clear();
    playRef.current?.view.clear();
    const camera = glideRef.current.camera;
    if (camera.raf) cancelAnimationFrame(camera.raf);
    camera.raf = 0;
    camera.to = null;
    camera.from = null;
    camera.shown = null;
    window.clearTimeout(camera.check);
    stopCamPlayback();
  }

  function stopCamPlayback() {
    const cam = camPlayRef.current;
    if (cam.raf) cancelAnimationFrame(cam.raf);
    cam.raf = 0;
    cam.playback.clear();
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

  function kickGlide(api) {
    const glide = glideRef.current;
    glide.api = api;
    if (glide.raf) return;
    if (!glide.camera.to) return;
    glide.last = performance.now();
    const tick = (now) => {
      const current = glide.api;
      if (!current) {
        glide.raf = 0;
        return;
      }
      const elapsed = Math.min(48, now - glide.last);
      glide.last = now;
      let moving = false;
      if (glide.camera.to) {
        let arrived = true;
        try {
          const tau = glide.camera.tau || 110;
          arrived = stepCamera(current, 1 - Math.exp(-elapsed / tau));
        } catch {
          glide.camera.to = null;
        }
        if (!arrived) moving = true;
      }
      glide.raf = moving ? requestAnimationFrame(tick) : 0;
    };
    glide.raf = requestAnimationFrame(tick);
  }

  function readElement(api, name, size) {
    if (size === 1) {
      const value = api.getValue(name);
      return Number.isFinite(value) ? [value] : null;
    }
    const x = api.getXcoord(name);
    const y = api.getYcoord(name);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    if (size === 2) return [x, y];
    const z = typeof api.getZcoord === 'function' ? api.getZcoord(name) : 0;
    return [x, y, Number.isFinite(z) ? z : 0];
  }

  function writeElement(api, name, value) {
    if (!api) return;
    try {
      if (value.length === 1) api.setValue(name, value[0]);
      else if (value.length === 2) api.setCoords(name, value[0], value[1]);
      else api.setCoords(name, value[0], value[1], value[2]);
    } catch {
      playRef.current?.elements.cancel(name);
    }
  }

  function targetValue(target) {
    if (target.kind === 'number') return [target.value];
    if (target.kind === 'point3') return [target.x, target.y, target.z];
    return [target.x, target.y];
  }

  function playElement(api, name, value, at = performance.now()) {
    const from = readElement(api, name, value.length) || value;
    playback().elements.push(name, value, from, at);
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
    const now = performance.now();
    targets.forEach((target) => {
      if (!target?.name) return;
      if (typeof api.exists === 'function' && !api.exists(target.name)) return;
      if (!isMovable(api, target.name)) return;
      // Свежие дельты от чертящего уже ведут эту точку — снимок XML их догоняет.
      if (now - (deltaAtRef.current.get(target.name) || -Infinity) < 1500) return;
      playElement(api, target.name, targetValue(target), now);
    });
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
    const now = readGeoGebraView(api);
    if (!now || sameGeoGebraView(now, view)) return;
    playback().view.push('view', view, now);
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
      if (apiRef.current !== api || interactiveRef.current) return;
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
    const cam = camPlayRef.current;
    cam.raf = 0;
    if (apiRef.current !== api || interactiveRef.current) return;
    const sample = cam.playback.sample(performance.now());
    if (!sample) return;
    try {
      applyLiveCamera(api, sample.value);
    } catch {
      cam.playback.clear();
      return;
    }
    if (sample.done) settleCamera(api, sample.value);
    else cam.raf = requestAnimationFrame(() => tickCam(api));
  }

  function pushCamSample(api, value, sentWallMs) {
    const cam = camPlayRef.current;
    cam.playback.push(value, camClockRef.current(sentWallMs));
    window.clearTimeout(glideRef.current.camera.check);
    if (!cam.raf) cam.raf = requestAnimationFrame(() => tickCam(api));
  }

  function takeGeoCam(message) {
    lastCamRef.current = message;
    if (interactiveRef.current || !followRef.current) return;
    const api = apiRef.current;
    if (!api) return;
    const size = viewSize3d();
    const cam = size && cameraFromWire(message, size);
    if (!cam) return;
    pushCamSample(api, cam, Number.isFinite(message.seq) ? message.seq : NaN);
  }

  // Чертящий шлёт изменения свободных точек и чисел дельтами не чаще 30 раз в
  // секунду. Полный XML уходит реже и остаётся источником правды для новичков.
  function queueMove(api, name) {
    if (!interactiveRef.current || !onMoveRef.current || !name || !isMovable(api, name)) return false;
    let size = 0;
    try {
      const type = String(api.getObjectType(name) || '').toLowerCase();
      if (type === 'point') size = appName === '3d' ? 3 : 2;
      else if (type === 'numeric' || type === 'angle') size = 1;
    } catch {
      return false;
    }
    if (!size) return false;
    const value = readElement(api, name, size);
    if (!value) return false;
    const queue = moveQueueRef.current;
    queue.moves.set(name, value.map((item) => Math.round(item * 1e6) / 1e6));
    if (!queue.timer) queue.timer = window.setTimeout(flushMoves, 33);
    return true;
  }

  function flushMoves() {
    const queue = moveQueueRef.current;
    window.clearTimeout(queue.timer);
    queue.timer = 0;
    if (!queue.moves.size) return;
    const moves = [...queue.moves].slice(0, 64).map(([n, v]) => ({ n, v }));
    queue.moves.clear();
    onMoveRef.current?.({ t: Date.now(), moves });
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

  // Эффекты зовут помощников выше, но перезапускаться из-за них не должны: помощники работают
  // с ref-ами апплета и последними пропсами. useEffectEvent отдаёт свежую версию без перезапуска,
  // в том числе колбэкам GeoGebra, которые живут дольше одного рендера.
  const onPublishCamera = useEffectEvent((...args) => publishCamera(...args));
  const onScheduleCamera = useEffectEvent((...args) => scheduleCamera(...args));
  const onTakeGeoCam = useEffectEvent((...args) => takeGeoCam(...args));
  const onPlayElement = useEffectEvent((...args) => playElement(...args));
  const onApplyConstruction = useEffectEvent((...args) => applyConstruction(...args));
  const onStopGlide = useEffectEvent((...args) => stopGlide(...args));
  const onFitToFrame = useEffectEvent((...args) => fitToFrame(...args));
  const onQueueMove = useEffectEvent((...args) => queueMove(...args));
  const onSharpRatio = useEffectEvent((...args) => sharpRatio(...args));
  const onGlideToward = useEffectEvent((...args) => glideToward(...args));
  const onPublishMenu = useEffectEvent((...args) => publishMenu(...args));
  // Апплет создаётся один раз: файл и размер берутся на момент создания, дальше их догоняют
  // setXML и ResizeObserver.
  const readLoadProps = useEffectEvent(() => ({ base64: ggbBase64 || '', width, height }));

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
      // Пока камеру крутят, вид уходит так часто, как позволяет цена чтения XML:
      // у зрителя кадры между отсчётами дорисовывает буфер воспроизведения.
      const poll = () => {
        if (!camHeldRef.current) {
          camPollRef.current = 0;
          return;
        }
        onPublishCamera(apiRef.current);
        camPollRef.current = window.setTimeout(poll, Math.max(60, camReadCostRef.current * 3));
      };
      camQuietRef.current = window.setTimeout(() => {
        if (!camHeldRef.current || camPollRef.current) return;
        poll();
      }, 60);
    };
    const up = () => {
      if (!held) return;
      held = false;
      camHeldRef.current = false;
      window.clearTimeout(camQuietRef.current);
      window.clearTimeout(camPollRef.current);
      camPollRef.current = 0;
      window.setTimeout(() => onScheduleCamera(apiRef.current, true), 60);
      if (!followRef.current) setFollow(false);
    };
    const wheel = () => {
      if (!interactiveRef.current) return;
      window.clearTimeout(camTimerRef.current);
      camTimerRef.current = window.setTimeout(() => onPublishCamera(apiRef.current), 150);
    };
    host.addEventListener('pointerdown', down, true);
    host.addEventListener('wheel', wheel, true);
    window.addEventListener('pointerup', up, true);
    window.addEventListener('pointercancel', up, true);
    return () => {
      window.clearTimeout(camQuietRef.current);
      window.clearTimeout(camPollRef.current);
      camPollRef.current = 0;
      host.removeEventListener('pointerdown', down, true);
      host.removeEventListener('wheel', wheel, true);
      window.removeEventListener('pointerup', up, true);
      window.removeEventListener('pointercancel', up, true);
    };
  }, [interactive, status, appName]);

  useEffect(() => {
    if (status !== 'ready' || appName !== '3d' || !onCamBind || !boardObjectId) return undefined;
    onCamBind(boardObjectId, (message) => onTakeGeoCam(message));
    return () => onCamBind(boardObjectId, null);
  }, [status, appName, boardObjectId, onCamBind]);

  // Дельты чертящего: свободные точки и числа едут к новым значениям плавно.
  useEffect(() => {
    if (status !== 'ready' || !onMoveBind || !boardObjectId) return undefined;
    onMoveBind(boardObjectId, (message) => {
      const api = apiRef.current;
      if (!api || interactiveRef.current || !Array.isArray(message?.moves)) return;
      const at = moveClockRef.current(message.t);
      const now = performance.now();
      message.moves.forEach((move) => {
        if (!move?.n || !Array.isArray(move.v)) return;
        if (typeof api.exists === 'function' && !api.exists(move.n)) return;
        deltaAtRef.current.set(move.n, now);
        onPlayElement(api, move.n, move.v, at);
      });
    });
    return () => onMoveBind(boardObjectId, null);
  }, [status, boardObjectId, onMoveBind]);

  // В планиметрии и графиках зритель видит курсор ведущего, без передачи нажатий.
  useEffect(() => {
    if (!interactive || status !== 'ready' || appName === '3d') return undefined;
    const host = hostRef.current;
    if (!host) return undefined;
    let timer = 0;
    let pending = null;
    const place = (event) => {
      const canvas = host.querySelector('canvas');
      const rect = (canvas || host).getBoundingClientRect();
      const span = Math.min(rect.width, rect.height);
      if (!(span > 0)) return null;
      return {
        u: (event.clientX - rect.left - rect.width / 2) / span,
        v: (event.clientY - rect.top - rect.height / 2) / span,
      };
    };
    const tick = () => {
      timer = 0;
      if (!pending) return;
      const point = place(pending);
      pending = null;
      if (!point) return;
      onInputRef.current?.({ ev: 'hover', b: 0, t: performance.now(), ...point });
    };
    const move = (event) => {
      if (!(event.target instanceof Node) || !host.contains(event.target)) return;
      pending = event;
      if (!timer) timer = window.requestAnimationFrame(tick);
    };
    host.addEventListener('pointermove', move);
    return () => {
      window.cancelAnimationFrame(timer);
      host.removeEventListener('pointermove', move);
    };
  }, [interactive, status, appName]);

  useEffect(() => {
    if (status !== 'ready' || !onInputBind || !boardObjectId) return undefined;
    onInputBind(boardObjectId, (message) => {
      if (interactiveRef.current || appName === '3d') return;
      if (message?.ev && message.ev !== 'hover') return;
      if (!Number.isFinite(message?.u) || !Number.isFinite(message?.v)) return;
      const frame = frameRef.current;
      const host = hostRef.current;
      const canvas = host?.querySelector('canvas');
      const rect = (canvas || frame)?.getBoundingClientRect();
      const frameRect = frame?.getBoundingClientRect();
      if (!rect || !frameRect) return;
      const span = Math.min(rect.width, rect.height);
      setViewCursor({
        x: rect.left + rect.width / 2 + message.u * span - frameRect.left,
        y: rect.top + rect.height / 2 + message.v * span - frameRect.top,
      });
    });
    return () => {
      onInputBind(boardObjectId, null);
      setViewCursor(null);
    };
  }, [status, appName, boardObjectId, onInputBind]);

  useEffect(() => {
    onReadyRef.current = onReady;
    onChangeRef.current = onConstructionChange;
    onLayoutRef.current = onLayoutChange;
    onInputRef.current = onInput;
  }, [onReady, onConstructionChange, onLayoutChange, onInput]);

  useEffect(() => {
    const frame = frameRef.current;
    const host = hostRef.current;
    if (!frame || !host) return;
    const was = wasInteractiveRef.current;
    wasInteractiveRef.current = interactive;
    if (was && !interactive && status === 'ready' && appName === '3d') {
      onScheduleCamera(apiRef.current, true);
    }
    interactiveRef.current = interactive;
    if (interactive && !was) {
      onStopGlide();
      glideRef.current.camera.shown = null;
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
        onTakeGeoCam(lastCamRef.current);
      }
      quietUntilRef.current = performance.now() + 300;
      appliedXmlRef.current = '';
      try { onApplyConstruction(apiRef.current); } catch { /* чужое построение догонит следующим сообщением */ }
    }
  }, [interactive, status, appName]);

  useEffect(() => {
    let cancelled = false;
    const host = hostRef.current;
    const frame = frameRef.current;
    const atLoad = readLoadProps();
    const base64AtLoad = atLoad.base64;
    const kind = appletKind(appName);
    const sizeAtStart = {
      width: frame && frame.clientWidth > 2 ? frame.clientWidth : atLoad.width,
      height: frame && frame.clientHeight > 2 ? frame.clientHeight : atLoad.height,
    };

    let cancelStyles = () => {};
    (async () => {
      try {
        const GGBApplet = await loadGeoGebra();
        if (cancelled || !host) return;
        host.innerHTML = '';
        const box = {
          w: Math.max(40, Math.round(sizeAtStart.width)),
          h: Math.max(40, Math.round(sizeAtStart.height)),
        };
        const pixelScale = onSharpRatio(box);
        applyWrap(box, pixelScale);
        sharpRef.current = { ...box, scale: pixelScale };
        // Набор панелей зависит только от объекта, а не от того, успел ли
        // сохраниться файл: иначе у участников разные инструменты.
        const fromTheory = Boolean(String(setupRef.current || '').trim()) || Boolean(materialId);
        const params = appletParams({
          id: appletId,
          appName: fromTheory ? '' : kind,
          materialId: base64AtLoad ? '' : materialId,
          width: box.w * pixelScale,
          height: box.h * pixelScale,
          toolbar: true,
          algebraInput: fromTheory ? false : kind !== 'geometry',
          enable3d: fromTheory ? true : kind === '3d',
          enableLabelDrags: true,
          enableRightClick: true,
          appletOnLoad(api) {
            if (cancelled) return;
            apiRef.current = api;
            appliedRef.current = base64AtLoad;
            onReadyRef.current?.(api);
            host.inert = !interactiveRef.current;
            host.style.pointerEvents = interactiveRef.current ? 'auto' : 'none';
            const notifyChange = (info) => {
              if (!interactiveRef.current) return;
              if (performance.now() < quietUntilRef.current) return;
              if (menuDragRef.current || glideRef.current.raf || playRef.current?.elements.active()) return;
              onChangeRef.current?.(info);
            };
            if (typeof api.registerUpdateListener === 'function') {
              api.registerUpdateListener((name) => {
                const moved = onQueueMove(api, name);
                notifyChange(moved ? { moving: true } : undefined);
              });
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
                    camTimerRef.current = window.setTimeout(() => onPublishCamera(api), 150);
                  }
                  return;
                }
                if (type === 'dragEnd' || type === 'movedGeos') {
                  flushMoves();
                  notifyChange({ settled: true });
                  return;
                }
                if (type === 'viewChanged2D' || type === 'movingGeos') notifyChange();
              });
            }
            onFitToFrame(api);
            if ((setupRef.current || materialId) && !fileRef.current && !xmlRef.current) {
              cancelStyles = runSetup(api, setupRef.current, { material: Boolean(materialId) });
              controlsRef.current.forEach((control) => {
                if (control?.name == null || !Number.isFinite(control.value)) return;
                appliedControlsRef.current.set(control.name, control.value);
                try { api.setValue(control.name, control.value); } catch { /* значение ещё не к чему применить */ }
              });
            } else {
              restoreTheoryPerspective(api);
              onApplyConstruction(api);
            }
            setStatus('ready');
          },
        });
        if (base64AtLoad) params.ggbBase64 = base64AtLoad;
        const applet = new GGBApplet(params, true);
        appletObjRef.current = applet;
        applet.inject(host);
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
      cancelStyles();
      onStopGlide();
      removeApplet(appletObjRef.current, appletId, host);
      apiRef.current = null;
      appletObjRef.current = null;
      onReadyRef.current?.(null);
    };
  }, [appletId, attempt, appName, materialId]);

  useEffect(() => {
    const api = apiRef.current;
    if (!api || status !== 'ready') return;
    controls.forEach((control) => {
      if (control?.name == null || !Number.isFinite(control.value)) return;
      if (appliedControlsRef.current.get(control.name) === control.value) return;
      appliedControlsRef.current.set(control.name, control.value);
      onGlideToward(api, [{ name: control.name, kind: 'number', value: control.value }]);
    });
  }, [controls, status]);

  useEffect(() => {
    try {
      onApplyConstruction(apiRef.current);
    } catch {
      /* чужое состояние не применилось */
    }
    // Ссылки на файл обновляются в эффекте выше, до этого применения.
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
        else onPublishMenu();
      }
    }, 150);
    return () => window.clearInterval(timer);
  }, [interactive, status, appName]);

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
        if (changed) onPublishMenu();
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
  }, [interactive, status, appName]);

  useEffect(() => {
    const frame = frameRef.current;
    const host = hostRef.current;
    if (!frame || !host) return undefined;
    const fit = () => onFitToFrame(apiRef.current);
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
      const need = onSharpRatio(box);
      const have = sharpRef.current?.scale || 1;
      if (Math.abs(need - have) > 1e-3) onFitToFrame(apiRef.current);
    }, 150);
    return () => window.clearTimeout(zoomTimerRef.current);
    // Пока доску зумят, её CSS просто растягивает холст. Резкость догоняется после жеста.
  }, [zoom, status, appName]);

  useEffect(() => {
    if (status !== 'ready') return undefined;
    let mq;
    const onChange = () => {
      bind();
      sharpRef.current = null;
      onFitToFrame(apiRef.current);
    };
    const bind = () => {
      mq?.removeEventListener('change', onChange);
      mq = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      mq.addEventListener('change', onChange);
    };
    bind();
    return () => mq?.removeEventListener('change', onChange);
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
      {viewCursor && !interactive && appName !== '3d' && (
        <span
          className="pointer-events-none absolute z-20 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-blue-600 shadow"
          style={{ left: viewCursor.x, top: viewCursor.y }}
        />
      )}
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
      <GeoGebraControls
        controls={controls}
        texts={texts}
        apiRef={apiRef}
        apiReady={status === 'ready'}
        onControls={onControls}
        variant="board"
      />
    )}
    </div>
  );
}

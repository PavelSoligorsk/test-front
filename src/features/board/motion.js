import { useCallback, useSyncExternalStore } from 'react';
import { createPlaybackGroup } from '../../shared/lib/playback';

// Чужие перемещения и изменения размера объектов показываются плавно: модель уже
// стоит в новом месте (попадания, выделение, отправка правок идут по ней), а на
// экране объект доезжает до неё через общий буфер воспроизведения.

const SEND_MS = 50;

function poseOf(obj) {
  const pose = { x: obj.x, y: obj.y, w: obj.w, h: obj.h };
  if (obj.type === 'shape') pose.depth = Number(obj.props?.depth) || 0;
  if (obj.type === 'arrow') {
    pose.x1 = obj.props.x1;
    pose.y1 = obj.props.y1;
    pose.x2 = obj.props.x2;
    pose.y2 = obj.props.y2;
  }
  return pose;
}

function samePose(a, b) {
  return Object.keys(a).every((key) => Math.abs(a[key] - b[key]) < 0.01);
}

export function posedObject(obj, pose) {
  if (!pose) return obj;
  const next = { ...obj, x: pose.x, y: pose.y, w: pose.w, h: pose.h };
  if (obj.type === 'shape' && Number.isFinite(pose.depth)) next.props = { ...obj.props, depth: pose.depth };
  if (obj.type === 'arrow') next.props = { ...obj.props, x1: pose.x1, y1: pose.y1, x2: pose.x2, y2: pose.y2 };
  return next;
}

export function createMotion() {
  const poses = new Map();
  const listeners = new Map();
  const emit = (id) => listeners.get(id)?.forEach((fn) => fn());
  const group = createPlaybackGroup({
    delay: SEND_MS * 2,
    interval: SEND_MS,
    onFrame: (id, pose, done) => {
      if (done) poses.delete(id);
      else poses.set(id, pose);
      emit(id);
    },
  });

  return {
    /** Объект поменялся извне: показать путь от прежнего вида к новому. */
    note(prev, next) {
      if (!prev || !next || prev.type !== next.type) return;
      if (next.type === 'shape' && prev.props?.shape !== next.props?.shape) return;
      const target = poseOf(next);
      const from = poses.get(next.id) || poseOf(prev);
      if (samePose(from, target) && !group.has(next.id)) return;
      group.push(next.id, target, from);
      // Первый кадр показывает исходную позу, а не сразу новую модель.
      if (!poses.has(next.id)) {
        poses.set(next.id, from);
        emit(next.id);
      }
    },
    cancel(id) {
      group.cancel(id);
      if (poses.delete(id)) emit(id);
    },
    get: (id) => poses.get(id) || null,
    subscribe(id, fn) {
      let set = listeners.get(id);
      if (!set) {
        set = new Set();
        listeners.set(id, set);
      }
      set.add(fn);
      return () => {
        set.delete(fn);
        if (!set.size) listeners.delete(id);
      };
    },
    dispose() {
      group.clear();
      poses.clear();
      listeners.clear();
    },
  };
}

export function useMotionPose(motion, id) {
  const subscribe = useCallback((fn) => motion.subscribe(id, fn), [motion, id]);
  return useSyncExternalStore(subscribe, () => motion.get(id));
}

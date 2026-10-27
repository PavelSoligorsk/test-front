import { memo, useCallback, useMemo } from 'react';
import BoardObject from './BoardObject';
import { cullingRect, visibleIds } from './culling';
import { posedObject, useMotionPose } from './motion';
import { incomingJoints, jointsKey } from './shapes';
import { sameIdList, useBoardObject, useStoreSelector } from './store';

// Входящие привязки считаются один раз на версию документа, а не на каждый объект.
const jointsByList = new WeakMap();

function jointsOf(objects) {
  let joints = jointsByList.get(objects);
  if (!joints) {
    joints = incomingJoints(objects);
    jointsByList.set(objects, joints);
  }
  return joints;
}

function sameJoints(a, b) {
  return jointsKey(a) === jointsKey(b);
}

function lockLabel(obj, selfId, peerIds) {
  const editor = obj?.type === 'geogebra' ? obj.props?.editor : null;
  if (!editor?.clientId || editor.clientId === selfId || !peerIds.has(editor.clientId)) return null;
  return editor.name || 'участник';
}

const StoreObject = memo(function StoreObject({ store, motion, id, selfId, peerIds, ...rest }) {
  const obj = useBoardObject(store, id);
  const pose = useMotionPose(motion, id);
  const selectJoints = useCallback((objects) => jointsOf(objects).get(id), [id]);
  const incoming = useStoreSelector(store, selectJoints, sameJoints);
  if (!obj) return null;
  return (
    <BoardObject
      obj={posedObject(obj, pose)}
      incoming={incoming}
      incomingKey={jointsKey(incoming)}
      lockedBy={lockLabel(obj, selfId, peerIds)}
      {...rest}
    />
  );
});

/**
 * Объекты холста. Сам слой перерисовывается, только когда меняется набор видимых
 * объектов или выделение; каждый объект подписан на себя.
 */
function ObjectLayer({ store, motion, camera, viewSize, selectedIds, editingId, teacher, selfId, peers, callbacks }) {
  const peerIds = useMemo(() => new Set((peers || []).map((peer) => peer.clientId)), [peers]);
  const keep = useMemo(() => new Set(editingId ? [...selectedIds, editingId] : selectedIds), [selectedIds, editingId]);
  const rect = useMemo(() => cullingRect(camera, viewSize), [camera, viewSize]);
  const selectIds = useCallback((objects) => visibleIds(objects, rect, keep), [rect, keep]);
  const ids = useStoreSelector(store, selectIds, sameIdList);
  const single = selectedIds.length === 1;
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
  return ids.map((id) => (
    <StoreObject
      key={id}
      store={store}
      motion={motion}
      id={id}
      zoom={camera.zoom}
      teacher={teacher}
      selected={selected.has(id)}
      handles={single && selected.has(id)}
      editing={id === editingId}
      selfId={selfId}
      peerIds={peerIds}
      {...callbacks}
    />
  ));
}

export default memo(ObjectLayer);

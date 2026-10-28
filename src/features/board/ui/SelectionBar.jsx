import { useCallback, useLayoutEffect } from 'react';
import SelectionToolbar from '../SelectionToolbar';
import { sameIdList, useStoreSelector } from '../store';

// Панель выделения подписана на выделенные объекты сама: при их правке не
// перерисовывается весь редактор. Пока идёт жест, она скрыта и не обновляется.
export default function SelectionBar({ store, selectedIds, editingId, frozen, onRendered, onToggleGeo, ...actions }) {
  const selectObjects = useCallback((objects) => {
    const ids = new Set(selectedIds);
    return objects.filter((obj) => ids.has(obj.id));
  }, [selectedIds]);
  const isEqual = useCallback((a, b) => sameIdList(a, b) || frozen(), [frozen]);
  const objects = useStoreSelector(store, selectObjects, isEqual);
  useLayoutEffect(() => {
    onRendered?.();
  });
  if (!objects.length) return null;
  const first = objects[0];
  const geoEditing = objects.length === 1 && editingId === first.id && first.type === 'geogebra';
  return (
    <SelectionToolbar
      objects={objects}
      geoEditing={geoEditing}
      onToggleGeo={() => onToggleGeo(first.id)}
      {...actions}
    />
  );
}

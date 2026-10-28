import { describe, expect, it } from 'vitest';
import { applyHistory, createdOnly, historyEntry } from '../history';

const geo = { id: 'g', type: 'geogebra', x: 0, y: 0, w: 400, h: 300, rotation: 0, props: { ggbXml: 'v1', appName: 'geometry' } };
const note = { id: 'n', type: 'sticky', x: 10, y: 10, w: 200, h: 200, rotation: 0, props: { text: 'a' } };

describe('история', () => {
  it('отмена сдвига не откатывает построение апплета', () => {
    const before = [geo];
    const moved = [{ ...geo, x: 100 }];
    const entry = historyEntry(before, moved);
    const drawn = [{ ...moved[0], props: { ...moved[0].props, ggbXml: 'v2' } }];
    const undone = applyHistory(drawn, entry, 'undo');
    expect(undone[0].x).toBe(0);
    expect(undone[0].props.ggbXml).toBe('v2');
    const redone = applyHistory(undone, entry, 'redo');
    expect(redone[0].x).toBe(100);
    expect(redone[0].props.ggbXml).toBe('v2');
  });

  it('отмена правки текста не трогает чужой сдвиг', () => {
    const entry = historyEntry([note], [{ ...note, props: { text: 'b' } }]);
    const remote = [{ ...note, x: 500, props: { text: 'b' } }];
    const undone = applyHistory(remote, entry, 'undo');
    expect(undone[0]).toMatchObject({ x: 500, props: { text: 'a' } });
  });

  it('удалённое поле props возвращается и снова удаляется', () => {
    const locked = { ...note, props: { text: 'a', locked: true } };
    const entry = historyEntry([locked], [note]);
    expect(applyHistory([note], entry, 'undo')[0].props.locked).toBe(true);
    expect('locked' in applyHistory([locked], entry, 'redo')[0].props).toBe(false);
  });

  it('создание и удаление', () => {
    const created = historyEntry([note], [note, geo]);
    expect(createdOnly(created, 'g')).toBe(true);
    expect(applyHistory([note, geo], created, 'undo')).toEqual([note]);
    expect(applyHistory([note], created, 'redo').map((obj) => obj.id)).toEqual(['n', 'g']);

    const removed = historyEntry([note, geo], [geo]);
    expect(createdOnly(removed, 'n')).toBe(false);
    expect(applyHistory([geo], removed, 'undo').map((obj) => obj.id)).toEqual(['n', 'g']);
  });

  it('порядок отрисовки', () => {
    const entry = historyEntry([note, geo], [geo, note]);
    expect(applyHistory([geo, note], entry, 'undo').map((obj) => obj.id)).toEqual(['n', 'g']);
  });

  it('пустая правка не создаёт шаг', () => {
    expect(historyEntry([note], [{ ...note }])).toBeNull();
  });
});

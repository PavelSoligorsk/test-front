import { describe, expect, it } from 'vitest';
import { dragKindForHandle, followMoved, gestureStep, handleIndex, settleGesture, squareFrom } from '../tools/gestures';
import { arrowBounds } from '../geometry';
import { bindFromHit, snapFigurePoint } from '../shapes';

const env = { zoom: 1, alt: false, shift: false, aim: (point) => ({ point, dist: Infinity }) };

function shape(id, x, kind = 'rect', extra = {}) {
  return { id, type: 'shape', x, y: 0, w: 100, h: 100, rotation: 0, props: { shape: kind, fill: 'none', ...extra } };
}

describe('жесты', () => {
  it('ручки ведут к своим жестам', () => {
    expect(dragKindForHandle('se')).toBe('resize');
    expect(dragKindForHandle('start')).toBe('arrow-end');
    expect(dragKindForHandle('lean')).toBe('shape-knob');
    expect(dragKindForHandle('poly-3')).toBe('poly-point');
    expect(handleIndex('base-2')).toBe(2);
    expect(handleIndex('se')).toBe(-1);
  });

  it('перемещение липнет к краю соседа и тянет привязанный отрезок', () => {
    const host = shape('h', 0);
    const hit = snapFigurePoint({ x: 50, y: 17 }, [host], 1);
    const arrow = { id: 'a', type: 'arrow', ...arrowBounds({ x: 50, y: -200 }, hit.point, { bind2: bindFromHit(hit) }), rotation: 0 };
    const other = shape('o', 300);
    const objects = [host, arrow, other];
    const drag = {
      kind: 'move', start: { x: 0, y: 0 }, starts: new Map([['h', host]]),
      bounds: { x: 0, y: 0, w: 100, h: 100 }, others: [{ x: 300, y: 0, w: 100, h: 100 }],
    };
    const step = gestureStep(drag, { x: 197, y: 40 }, objects, env);
    const moved = step.next.find((obj) => obj.id === 'h');
    expect(moved.x).toBe(200);
    expect(step.guides).toHaveLength(1);
    const pulled = step.changed.find((obj) => obj.id === 'a');
    expect(pulled.y + pulled.props.y2).toBeCloseTo(56, 5);
  });

  it('круг тянется квадратом, Shift это отменяет', () => {
    const circle = shape('c', 0, 'circle');
    const drag = { kind: 'resize', obj: circle, id: 'c', handle: 'se', start: { x: 100, y: 100 } };
    const square = gestureStep(drag, { x: 300, y: 150 }, [circle], env).changed[0];
    expect(square.w).toBe(square.h);
    const free = gestureStep(drag, { x: 300, y: 150 }, [circle], { ...env, shift: true }).changed[0];
    expect(free.w).not.toBe(free.h);
  });

  it('сдвиг отрезка без его хоста отпускает привязку', () => {
    const host = shape('h', 0);
    const arrow = { id: 'a', type: 'arrow', ...arrowBounds({ x: 0, y: -100 }, { x: 50, y: 16 }, { bind2: { id: 'h', edge: 0, t: 0.5 } }), rotation: 0 };
    const next = followMoved([host, { ...arrow, x: arrow.x + 10 }], ['a']);
    expect(next[1].props.bind2).toBeNull();
  });

  it('отпущенный конец отрезка садится на фигуру, с Alt — нет', () => {
    const host = shape('h', 0);
    const arrow = { id: 'a', type: 'arrow', ...arrowBounds({ x: -100, y: -100 }, { x: 52, y: 18 }, {}), rotation: 0 };
    const drag = { kind: 'arrow-end', id: 'a', dirty: true };
    expect(settleGesture(drag, [host, arrow], { zoom: 1, alt: false })[1].props.bind2).toMatchObject({ id: 'h' });
    expect(settleGesture(drag, [host, arrow], { zoom: 1, alt: true })[1]).toBe(arrow);
  });

  it('рамка новой правильной фигуры — квадрат в сторону указателя', () => {
    expect(squareFrom({ x: 100, y: 100 }, { x: 40, y: 160 }, true)).toEqual({ x: 40, y: 100, w: 60, h: 60 });
    expect(squareFrom({ x: 0, y: 0 }, { x: 40, y: 10 }, false)).toEqual({ x: 0, y: 0, w: 40, h: 16 });
  });
});

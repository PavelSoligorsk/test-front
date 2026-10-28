import { describe, expect, it } from 'vitest';
import { boundsOf, eraseStrokes, hitObject, intersects, objectBounds, strokeBounds } from '../geometry';

const legacy = {
  id: 's', type: 'draw', x: 100, y: 100, w: 12, h: 12, rotation: 0,
  props: { width: 2, points: [{ x: 0, y: 0 }, { x: 200, y: 50 }, { x: -40, y: 120 }] },
};

describe('границы штриха', () => {
  it('новый штрих хранит настоящую рамку', () => {
    const frame = strokeBounds([{ x: 10, y: 20 }, { x: 110, y: 70 }], 4);
    expect(frame).toMatchObject({ x: 6, y: 16, w: 108, h: 58 });
    expect(frame.points[0]).toEqual({ x: 4, y: 4 });
  });

  it('у старого штриха рамка считается по точкам', () => {
    const box = objectBounds(legacy);
    expect(box.x).toBeCloseTo(57);
    expect(box.y).toBeCloseTo(97);
    expect(box.w).toBeCloseTo(246);
    expect(box.h).toBeCloseTo(126);
    expect(boundsOf([legacy])).toEqual(box);
  });

  it('рамка выделения ловит штрих не только у первой точки', () => {
    expect(intersects({ x: 250, y: 120, w: 60, h: 40 }, legacy)).toBe(true);
    expect(intersects({ x: 400, y: 400, w: 10, h: 10 }, legacy)).toBe(false);
  });

  it('попадание и ластик', () => {
    expect(hitObject(legacy, { x: 300, y: 150 }, 1)).toBe(true);
    expect(hitObject(legacy, { x: 300, y: 300 }, 1)).toBe(false);
    const list = [legacy];
    expect(eraseStrokes(list, { x: 900, y: 900 }, 16)).toBe(list);
    expect(eraseStrokes(list, { x: 200, y: 125 }, 16)).toEqual([]);
  });
});

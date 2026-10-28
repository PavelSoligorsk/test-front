import { describe, expect, it } from 'vitest';
import {
  bindArrowEnds,
  bindFromHit,
  boundPoint,
  dropBindsTo,
  hitShape,
  incomingJoints,
  isKnobHandle,
  isRegularShape,
  retargetBound,
  snapFigurePoint,
} from '../shapes';
import { cloneObjects } from '../clipboard';
import { arrowBounds } from '../geometry';

const rect = (id, x, extra = {}) => ({
  id, type: 'shape', x, y: 0, w: 100, h: 100, rotation: 0,
  props: { shape: 'rect', fill: 'none', stroke: '#000', ...extra },
});

function arrowTo(id, host, point) {
  const hit = snapFigurePoint(point, [host], 1);
  return {
    id, type: 'arrow', ...arrowBounds({ x: -200, y: -200 }, hit.point, { bind1: null, bind2: bindFromHit(hit) }), rotation: 0,
  };
}

describe('привязки', () => {
  it('точка на ребре хранится в отрезке, хост не меняется', () => {
    const host = rect('h', 0);
    const hit = snapFigurePoint({ x: 50, y: 17 }, [host], 1);
    expect(bindFromHit(hit)).toMatchObject({ id: 'h', edge: 0 });
    const a = arrowTo('a', host, { x: 50, y: 17 });
    expect(host.props.joints).toBeUndefined();
    expect(boundPoint(a.props.bind2, [host, a])).toEqual({ x: a.x + a.props.x2, y: a.y + a.props.y2 });
  });

  it('двое привязываются к одной фигуре одновременно — обе привязки живы', () => {
    const host = rect('h', 0);
    const a = arrowTo('a', host, { x: 30, y: 17 });
    const b = arrowTo('b', host, { x: 70, y: 83 });
    const moved = { ...host, x: 300 };
    const next = retargetBound([moved, a, b], ['h']);
    const [, na, nb] = next;
    expect(na.x + na.props.x2).toBeCloseTo(330, 0);
    expect(nb.x + nb.props.x2).toBeCloseTo(370, 0);
    expect(incomingJoints(next).get('h')).toHaveLength(2);
  });

  it('старая привязка через joints читается и переводится в новый формат', () => {
    const host = rect('h', 0, { joints: [{ id: 'j1', edge: 0, t: 0.5 }] });
    const arrow = { id: 'a', type: 'arrow', ...arrowBounds({ x: -100, y: -100 }, { x: 50, y: 16 }, { bind2: { id: 'h', joint: 'j1' } }), rotation: 0 };
    expect(boundPoint(arrow.props.bind2, [host, arrow])).toEqual({ x: 50, y: 16 });
    const next = retargetBound([{ ...host, x: 10 }, arrow], ['h']);
    expect(next[1].props.bind2).toEqual({ id: 'h', edge: 0, t: 0.5 });
    expect(next[0].props.joints).toEqual([]);
  });

  it('смена вида хоста снимает привязки', () => {
    const host = rect('h', 0);
    const a = arrowTo('a', host, { x: 50, y: 17 });
    expect(dropBindsTo([host, a], ['h'])[1].props.bind2).toBeNull();
  });

  it('bindArrowEnds не трогает хост', () => {
    const host = rect('h', 0);
    const arrow = { id: 'a', type: 'arrow', ...arrowBounds({ x: -100, y: -100 }, { x: 52, y: 18 }, {}), rotation: 0 };
    const next = bindArrowEnds([host, arrow], 'a', 1);
    expect(next[0]).toBe(host);
    expect(next[1].props.bind2).toMatchObject({ id: 'h', edge: 0 });
  });

  it('копия отрезка с фигурой привязана к копии фигуры', () => {
    const host = rect('h', 0);
    const a = arrowTo('a', host, { x: 50, y: 17 });
    const [copyHost, copyArrow] = cloneObjects([host, a], { dx: 10 });
    expect(copyArrow.props.bind2.id).toBe(copyHost.id);
    const [alone] = cloneObjects([a], { dx: 10 });
    expect(alone.props.bind2).toBeNull();
  });
});

describe('фигуры', () => {
  it('залитую фигуру можно выбрать кликом внутрь', () => {
    expect(hitShape(rect('h', 0), { x: 50, y: 50 }, 1)).toBe(false);
    expect(hitShape(rect('h', 0, { fill: '#fff' }), { x: 50, y: 50 }, 1)).toBe(true);
    expect(hitShape(rect('h', 0, { fill: '#fff' }), { x: 150, y: 50 }, 1)).toBe(false);
  });

  it('правильные фигуры и ручки формы', () => {
    expect(isRegularShape('circle')).toBe(true);
    expect(isRegularShape('rect')).toBe(false);
    expect(isKnobHandle('lean')).toBe(true);
    expect(isKnobHandle('se')).toBe(false);
  });
});

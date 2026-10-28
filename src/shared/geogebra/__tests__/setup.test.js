import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseSetup, runSetup, theoryAppKind, theoryPerspectiveCode } from '../setup';

function fakeApi() {
  const calls = [];
  const record = (name) => (...args) => calls.push([name, ...args]);
  return {
    calls,
    setAxesVisible: record('axes'),
    setGridVisible: record('grid'),
    setCoordSystem: record('coords'),
    setPerspective: record('perspective'),
    evalCommand: record('eval'),
    setColor: record('color'),
    setPointSize: record('size'),
    setCaption: record('caption'),
    setVisible: record('visible'),
    getViewProperties: () => null,
  };
}

describe('setup GeoGebra', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const SETUP = `
    // комментарий
    A = (0, 0)
    view:-5,5,-4,4,grid
    perspective:G
    ZoomIn(-2, -2, 2, 2)
    color:A,#ff0000
    f(x) = x^2
  `;

  it('разбирает строки по видам', () => {
    expect(parseSetup(SETUP)).toEqual({
      views: [['-5', '5', '-4', '4', 'grid']],
      perspective: 'G',
      commands: ['A = (0, 0)', 'ZoomIn(-2, -2, 2, 2)', 'f(x) = x^2'],
      styles: ['color:A,#ff0000'],
    });
  });

  it('порядок как на странице теории, оформление после паузы', () => {
    const api = fakeApi();
    runSetup(api, SETUP);
    expect(api.calls).toEqual([
      ['axes', true, true],
      ['grid', true],
      ['coords', -5, 5, -4, 4],
      ['grid', true],
      ['perspective', 'G'],
      ['eval', 'A = (0, 0)'],
      ['coords', -2, 2, -2, 2],
      ['eval', 'f(x) = x^2'],
    ]);
    vi.advanceTimersByTime(250);
    expect(api.calls.at(-1)).toEqual(['color', 'A', 255, 0, 0]);
  });

  it('материал geogebra.org не получает оси и сетку по умолчанию', () => {
    const api = fakeApi();
    runSetup(api, 'B = (1, 1)', { material: true });
    expect(api.calls).toEqual([['eval', 'B = (1, 1)']]);
  });

  it('отмена снимает отложенное оформление', () => {
    const api = fakeApi();
    const cancel = runSetup(api, 'color:A,#00ff00');
    cancel();
    vi.advanceTimersByTime(500);
    expect(api.calls.some(([name]) => name === 'color')).toBe(false);
  });

  it('вид чертежа и приложение', () => {
    expect(theoryPerspectiveCode('SetPerspective("T")')).toBe('T');
    expect(theoryAppKind('Cube((0,0,0),(1,0,0))')).toBe('3d');
    expect(theoryAppKind('f(x) = x^2')).toBe('graphing');
    expect(theoryAppKind('A = (1, 2)')).toBe('geometry');
  });
});

export const PAGES_MARK = 'board-pages';

export function isPagesMeta(obj) {
  return obj?.props?.system === PAGES_MARK;
}


export const PAGES_MARK = 'board-pages';

export function isPagesMeta(obj) {
  return obj?.props?.system === PAGES_MARK;
}

export function pageOf(obj) {
  return obj?.props?.page || '1';
}

export function boardPages(objects) {
  const meta = (objects || []).find(isPagesMeta);
  const pages = meta?.props?.pages;
  if (Array.isArray(pages) && pages.length) {
    return pages.filter((page) => page && typeof page.id === 'string' && page.id);
  }
  return [{ id: '1', title: 'Страница' }];
}

export function onPage(obj, pageId) {
  if (!obj || isPagesMeta(obj)) return false;
  return pageOf(obj) === (pageId || '1');
}

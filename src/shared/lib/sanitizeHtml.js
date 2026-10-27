import DOMPurify from 'dompurify';

// Сырой HTML из теории и с доски: таблицы, схемы, svg. Скрипты, обработчики
// событий, формы, фреймы и <style> вырезаются.
const FORBID_TAGS = ['style', 'form', 'input', 'button', 'textarea', 'select', 'option', 'iframe', 'frame',
  'object', 'embed', 'link', 'meta', 'base', 'template'];

let hooked = false;

function ensureHooks() {
  if (hooked) return;
  hooked = true;
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A' && node.hasAttribute('href')) {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
    }
  });
}

export function sanitizeHtml(html) {
  ensureHooks();
  return DOMPurify.sanitize(String(html || ''), {
    USE_PROFILES: { html: true, svg: true, svgFilters: true },
    FORBID_TAGS,
    FORBID_ATTR: ['srcdoc', 'formaction'],
    ADD_ATTR: ['target'],
  });
}

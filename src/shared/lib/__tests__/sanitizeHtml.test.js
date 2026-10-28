// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { sanitizeHtml } from '../sanitizeHtml';

describe('sanitizeHtml', () => {
  it('убирает скрипты и обработчики', () => {
    const out = sanitizeHtml('<img src="x" onerror="alert(1)"><script>alert(2)</script><a href="javascript:alert(3)">x</a>');
    expect(out).not.toMatch(/onerror|<script|javascript:/i);
  });

  it('оставляет таблицы и svg из теории', () => {
    const out = sanitizeHtml('<table><tr><td style="color:red">1</td></tr></table><svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>');
    expect(out).toContain('<table>');
    expect(out).toContain('<circle');
    expect(out).toContain('style="color:red"');
  });

  it('вырезает style, формы и фреймы', () => {
    const out = sanitizeHtml('<style>body{display:none}</style><form><input></form><iframe src="//x"></iframe><svg><foreignObject><img src=x onerror=1></foreignObject></svg>');
    expect(out).not.toMatch(/<style|<form|<input|<iframe|onerror/i);
  });

  it('ссылки открываются в новой вкладке без opener', () => {
    const out = sanitizeHtml('<a href="https://example.com">x</a>');
    expect(out).toContain('rel="noopener noreferrer"');
  });
});

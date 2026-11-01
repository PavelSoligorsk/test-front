// Границы заданий в YAML — строки верхнего уровня, начинающиеся с "- ".
export function taskStartLines(text) {
  const lines = text.split('\n');
  const starts = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('- ')) starts.push(i);
  }
  return starts;
}

export function caretTaskPosition(value, selectionStart, starts) {
  if (!starts.length) return null;
  const line = value.slice(0, selectionStart).split('\n').length - 1;
  let index = 0;
  for (let i = 0; i < starts.length; i++) {
    if (starts[i] <= line) index = i;
    else break;
  }
  const startLine = starts[index];
  const endLine = index + 1 < starts.length ? starts[index + 1] : value.split('\n').length;
  const span = Math.max(1, endLine - startLine);
  return {
    index,
    fraction: Math.min(1, Math.max(0, (line - startLine) / span)),
  };
}

export function positionFromOffset(y, tops, end) {
  if (!tops.length) return null;
  let index = 0;
  for (let i = 0; i < tops.length; i++) {
    if (tops[i] <= y + 1) index = i;
    else break;
  }
  const start = tops[index];
  const next = index + 1 < tops.length ? tops[index + 1] : end;
  const span = Math.max(1, next - start);
  return {
    index,
    fraction: Math.min(1, Math.max(0, (y - start) / span)),
  };
}

export function offsetFromPosition(index, fraction, tops, end) {
  if (!tops.length || index < 0 || index >= tops.length) return null;
  const start = tops[index];
  const next = index + 1 < tops.length ? tops[index + 1] : end;
  return start + Math.min(1, Math.max(0, fraction)) * Math.max(1, next - start);
}

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

let measureCache = { key: '', tops: [], end: 0 };

// Верх каждого задания в координатах scrollTop, с учётом переноса длинных строк.
export function measureTaskBounds(textarea, starts) {
  if (!textarea || !starts.length || textarea.clientWidth === 0) return null;
  const key = `${textarea.clientWidth}\0${textarea.value}`;
  if (measureCache.key === key) return measureCache;

  const cs = getComputedStyle(textarea);
  const mirror = document.createElement('div');
  const style = mirror.style;
  style.position = 'fixed';
  style.left = '-9999px';
  style.top = '0';
  style.visibility = 'hidden';
  style.boxSizing = 'border-box';
  style.width = `${textarea.clientWidth}px`;
  style.whiteSpace = 'pre-wrap';
  style.overflowWrap = cs.overflowWrap || 'break-word';
  style.wordBreak = cs.wordBreak;
  style.fontFamily = cs.fontFamily;
  style.fontSize = cs.fontSize;
  style.fontWeight = cs.fontWeight;
  style.fontStyle = cs.fontStyle;
  style.lineHeight = cs.lineHeight;
  style.letterSpacing = cs.letterSpacing;
  style.padding = `${cs.paddingTop} ${cs.paddingRight} ${cs.paddingBottom} ${cs.paddingLeft}`;
  style.tabSize = cs.tabSize;

  const marks = new Set(starts);
  const lines = textarea.value.split('\n');
  let html = '';
  for (let i = 0; i < lines.length; i++) {
    if (marks.has(i)) html += `<span data-m="${i}">\u200b</span>`;
    html += escapeHtml(lines[i]);
    if (i !== lines.length - 1) html += '\n';
  }
  mirror.innerHTML = html;
  document.body.appendChild(mirror);
  const tops = starts.map((line) => mirror.querySelector(`[data-m="${line}"]`)?.offsetTop ?? 0);
  const padBottom = parseFloat(cs.paddingBottom) || 0;
  const end = Math.max((tops[tops.length - 1] ?? 0) + 1, mirror.offsetHeight - padBottom);
  mirror.remove();

  measureCache = { key, tops, end };
  return measureCache;
}

export function readTextareaPosition(textarea) {
  const starts = taskStartLines(textarea.value);
  const bounds = measureTaskBounds(textarea, starts);
  if (!bounds) return null;
  return positionFromOffset(textarea.scrollTop, bounds.tops, bounds.end);
}

export function scrollTextareaTo(textarea, index, fraction) {
  const starts = taskStartLines(textarea.value);
  const bounds = measureTaskBounds(textarea, starts);
  if (!bounds) return;
  const y = offsetFromPosition(index, fraction, bounds.tops, bounds.end);
  if (y == null || Math.abs(textarea.scrollTop - y) < 2) return;
  textarea.scrollTop = y;
}

export function readPreviewPosition(container) {
  const cards = [...container.querySelectorAll('[data-batch-index]')];
  if (!cards.length) return null;
  const origin = container.getBoundingClientRect().top;
  let index = Number(cards[0].dataset.batchIndex);
  let fraction = 0;
  for (let i = 0; i < cards.length; i++) {
    const rect = cards[i].getBoundingClientRect();
    if (rect.top > origin + 1) break;
    const nextTop = i + 1 < cards.length
      ? cards[i + 1].getBoundingClientRect().top
      : rect.bottom;
    index = Number(cards[i].dataset.batchIndex);
    const span = Math.max(1, nextTop - rect.top);
    fraction = Math.min(1, Math.max(0, (origin - rect.top) / span));
  }
  return { index, fraction };
}

export function scrollPreviewTo(container, index, fraction) {
  const card = container.querySelector(`[data-batch-index="${index}"]`);
  if (!card) return;
  const cards = [...container.querySelectorAll('[data-batch-index]')];
  const at = cards.indexOf(card);
  const next = at >= 0 ? cards[at + 1] : null;
  const origin = container.getBoundingClientRect().top;
  const rect = card.getBoundingClientRect();
  const nextTop = next ? next.getBoundingClientRect().top : rect.bottom;
  const span = Math.max(1, nextTop - rect.top);
  const delta = rect.top + Math.min(1, Math.max(0, fraction)) * span - origin;
  if (Math.abs(delta) < 2) return;
  container.scrollTop += delta;
}

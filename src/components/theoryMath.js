function dedentBlock(value) {
  const text = String(value || '').replace(/^\n/, '').replace(/\s+$/, '');
  const lines = text.split('\n');
  const indents = lines.filter((line) => line.trim()).map((line) => line.match(/^[ \t]*/)[0].length);
  const min = indents.length ? Math.min(...indents) : 0;
  if (!min) return text;
  return lines.map((line) => (line.trim() ? line.slice(min) : line)).join('\n');
}

function isTableRow(line) {
  const trimmed = line.trim();
  return trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.split('|').length >= 3;
}

function isTableSeparator(line) {
  return /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line.trim());
}

// Строки таблицы в JSX часто стоят с отступом и становятся блоком кода.
function unindentMarkdownTables(markdown) {
  const lines = String(markdown || '').split('\n');
  const out = [];
  let index = 0;
  while (index < lines.length) {
    const header = lines[index];
    const separator = lines[index + 1];
    if (isTableRow(header) && separator != null && isTableSeparator(separator)) {
      const start = index;
      index += 2;
      while (index < lines.length && isTableRow(lines[index])) index += 1;
      const block = lines.slice(start, index);
      const pad = Math.min(...block.filter((line) => line.trim()).map((line) => line.match(/^[ \t]*/)[0].length));
      block.forEach((line) => out.push(pad ? line.slice(pad) : line));
      continue;
    }
    out.push(lines[index]);
    index += 1;
  }
  return out.join('\n');
}

export function prepareTheoryMarkdown(markdown) {
  return continueOrderedListNumbers(normalizeDisplayMath(unindentMarkdownTables(dedentBlock(markdown))));
}

/** Turn same-line `$$formula$$` into a display-math fence. Multiline fences stay as they are. */
export function normalizeDisplayMath(markdown) {
  if (!markdown || !markdown.includes('$$')) return markdown;
  const parts = String(markdown).split(/(```[\s\S]*?```)/g);
  return parts.map((part, index) => (index % 2 === 1 ? part : expandInlineDisplayMath(part))).join('');
}

function expandInlineDisplayMath(text) {
  return text.replace(/(^|[^\\])\$\$([^\n]*?)\$\$/g, (full, prefix, formula) => {
    if (!formula.trim()) return full;
    return `${prefix}\n\n$$\n${formula.trim()}\n$$\n\n`;
  });
}

const ORDERED_ITEM = /^(\d+)[.)]\s+\S/;
const LIST_BREAK = /^(#{1,6}\s|---\s*$|\*\*\*\s*$)/;

/** Keep 1, 2, 3 across paragraphs and formulas that split a markdown list into separate <ol>. */
export function continueOrderedListNumbers(markdown) {
  if (!markdown) return markdown;
  const parts = String(markdown).split(/(```[\s\S]*?```)/g);
  return parts.map((part, index) => (index % 2 === 1 ? part : renumberListRun(part))).join('');
}

function renumberListRun(text) {
  let next = 1;
  return text.split('\n').map((line) => {
    if (LIST_BREAK.test(line)) {
      next = 1;
      return line;
    }
    if (!ORDERED_ITEM.test(line)) return line;
    return line.replace(/^(\d+)([.)]\s+)/, (_match, _num, marker) => `${next++}${marker}`);
  }).join('\n');
}

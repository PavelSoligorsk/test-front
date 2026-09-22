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

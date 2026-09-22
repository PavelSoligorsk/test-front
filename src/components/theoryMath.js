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

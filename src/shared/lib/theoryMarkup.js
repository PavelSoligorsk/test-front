const convertMarkdownLists = (content) => {
  if (!content) return content;
  
  content = content.replace(
    /^([ \t]*)([-*])\s+(.+)$/gm,
    (match, indent, marker, text) => {
      const level = Math.floor(indent.length / 2);
      const prefix = '  '.repeat(level);
      return `${prefix}- ${text}`;
    }
  );
  
  content = content.replace(
    /^([ \t]*)(\d+)[.)]\s+(.+)$/gm,
    (match, indent, number, text) => {
      const level = Math.floor(indent.length / 2);
      const prefix = '  '.repeat(level);
      return `${prefix}${number}. ${text}`;
    }
  );
  
  return content;
};

const THEORY_TAG_NAMES = ['Explanation', 'Important', 'Formula', 'Collapsible', 'Algorithm', 'GeoGebra', 'Steps', 'Card', 'Grid', 'Html', 'Def', 'Ex'];

function readMarkupAttr(attrs, name) {
  const match = String(attrs || '').match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`));
  if (!match) return undefined;
  return match[1] ?? match[2];
}

function readMarkupNumber(attrs, name) {
  const raw = readMarkupAttr(attrs, name);
  if (raw == null || raw.trim() === '') return undefined;
  const value = Number(raw.replace(',', '.'));
  return Number.isFinite(value) ? value : undefined;
}

function dedentMarkup(value) {
  const text = String(value || '').replace(/^\n/, '').replace(/\s+$/, '');
  const lines = text.split('\n');
  const indents = lines.filter((line) => line.trim()).map((line) => line.match(/^[ \t]*/)[0].length);
  const min = indents.length ? Math.min(...indents) : 0;
  if (!min) return text;
  return lines.map((line) => line.slice(min)).join('\n');
}

function scanJsGroup(source, openIndex) {
  const closeOf = { '{': '}', '(': ')', '[': ']' };
  const open = source[openIndex];
  const close = closeOf[open];
  if (!close) return -1;
  let depth = 0;
  let quote = null;
  for (let i = openIndex; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (ch === '\\') {
        i += 1;
        continue;
      }
      if (quote === '`' && ch === '$' && source[i + 1] === '{') {
        const nested = scanJsGroup(source, i + 1);
        if (nested < 0) return -1;
        i = nested;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '/' && source[i + 1] === '/') {
      i += 2;
      while (i < source.length && source[i] !== '\n') i += 1;
      continue;
    }
    if (ch === '/' && source[i + 1] === '*') {
      i += 2;
      while (i < source.length && !(source[i] === '*' && source[i + 1] === '/')) i += 1;
      i += 1;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '{' || ch === '(' || ch === '[') {
      depth += 1;
      continue;
    }
    if (ch === '}' || ch === ')' || ch === ']') {
      depth -= 1;
      if (depth === 0 && ch === close) return i;
    }
  }
  return -1;
}

function matchTextLambda(source, braceIndex) {
  if (source[braceIndex] !== '{') return -1;
  let cursor = braceIndex + 1;
  while (cursor < source.length && /\s/.test(source[cursor])) cursor += 1;
  if (source[cursor] !== '(') return -1;
  const parenEnd = scanJsGroup(source, cursor);
  if (parenEnd < 0) return -1;
  cursor = parenEnd + 1;
  while (cursor < source.length && /\s/.test(source[cursor])) cursor += 1;
  if (source.slice(cursor, cursor + 2) !== '=>') return -1;
  return scanJsGroup(source, braceIndex);
}

function splitTextLambdas(source) {
  const parts = [];
  let textStart = 0;
  for (let i = 0; i < source.length; i += 1) {
    if (source[i] !== '{') continue;
    const end = matchTextLambda(source, i);
    if (end < 0) continue;
    if (i > textStart) parts.push({ type: 'md', value: source.slice(textStart, i) });
    parts.push({ type: 'expr', source: source.slice(i + 1, end).trim() });
    i = end;
    textStart = end + 1;
  }
  if (textStart < source.length) parts.push({ type: 'md', value: source.slice(textStart) });
  return parts;
}

function parseGeoGebraControl(tag, attrs) {
  const name = readMarkupAttr(attrs, 'name');
  if (!name) return null;
  const kind = tag.toLowerCase() === 'slider' ? 'slider' : 'input';
  const min = readMarkupNumber(attrs, 'min');
  const max = readMarkupNumber(attrs, 'max');
  const step = readMarkupNumber(attrs, 'step');
  let value = readMarkupNumber(attrs, 'value') ?? 0;
  const resolvedMin = min ?? (kind === 'slider' ? -10 : undefined);
  const resolvedMax = max ?? (kind === 'slider' ? 10 : undefined);
  if (Number.isFinite(resolvedMin)) value = Math.max(resolvedMin, value);
  if (Number.isFinite(resolvedMax)) value = Math.min(resolvedMax, value);
  return {
    kind,
    name,
    label: readMarkupAttr(attrs, 'label') || name,
    min: resolvedMin,
    max: resolvedMax,
    step: step ?? (kind === 'slider' ? 0.1 : undefined),
    value,
  };
}

function parseGeoGebraInner(innerContent) {
  const controls = [];
  const texts = [];
  if (!innerContent) return { controls, texts };
  const tagRe = /<(Slider|Input|Text)\b/gi;
  let match;
  while ((match = tagRe.exec(innerContent)) !== null) {
    const scanned = scanTagClose(innerContent, match.index + match[0].length);
    if (!scanned) break;
    const tag = match[1];
    if (tag.toLowerCase() === 'text') {
      if (scanned.selfClosing) {
        tagRe.lastIndex = scanned.end;
        continue;
      }
      const closeRe = /<\/Text\s*>/gi;
      closeRe.lastIndex = scanned.end;
      const close = closeRe.exec(innerContent);
      if (!close) break;
      const body = dedentMarkup(innerContent.slice(scanned.end, close.index));
      if (body) texts.push({ parts: splitTextLambdas(body) });
      tagRe.lastIndex = closeRe.lastIndex;
      continue;
    }
    const attrs = innerContent.slice(match.index + match[0].length, scanned.selfClosing ? scanned.end - 2 : scanned.end - 1);
    const control = parseGeoGebraControl(tag, attrs);
    if (control) controls.push(control);
    tagRe.lastIndex = scanned.end;
  }
  return { controls, texts };
}

function scanTagClose(content, from) {
  let quote = null;
  let brace = 0;
  for (let i = from; i < content.length; i += 1) {
    const ch = content[i];
    if (quote) {
      if (ch === '\\') {
        i += 1;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '{') {
      brace += 1;
      continue;
    }
    if (ch === '}') {
      if (brace > 0) brace -= 1;
      continue;
    }
    if (ch === '>' && brace === 0) {
      return { end: i + 1, selfClosing: content[i - 1] === '/' };
    }
  }
  return null;
}

const findNextTag = (content, startIndex = 0) => {
  const startRe = new RegExp(`<(${THEORY_TAG_NAMES.join('|')})(?=[\\s/>])`, 'g');
  startRe.lastIndex = startIndex;
  const match = startRe.exec(content);
  if (!match) return null;

  const tagName = match[1];
  const index = match.index;
  const scanned = scanTagClose(content, index + match[0].length);
  if (!scanned) return null;

  const attrs = content.slice(index + match[0].length, scanned.selfClosing ? scanned.end - 2 : scanned.end - 1);

  if (scanned.selfClosing) {
    return {
      tagName,
      attrs,
      isSelfClosing: true,
      startIndex: index,
      endIndex: scanned.end,
      innerContent: '',
    };
  }

  let depth = 1;
  const nestedRe = new RegExp(`<(/)?${tagName}(?=[\\s/>])`, 'g');
  nestedRe.lastIndex = scanned.end;

  let nested;
  while ((nested = nestedRe.exec(content)) !== null) {
    const nestedStart = nested.index;
    const nestedScanned = scanTagClose(content, nestedStart + nested[0].length);
    if (!nestedScanned) return null;
    nestedRe.lastIndex = nestedScanned.end;

    if (nested[1]) {
      depth -= 1;
      if (depth === 0) {
        return {
          tagName,
          attrs,
          isSelfClosing: false,
          startIndex: index,
          endIndex: nestedScanned.end,
          innerContent: content.slice(scanned.end, nestedStart),
        };
      }
    } else if (!nestedScanned.selfClosing) {
      depth += 1;
    }
  }

  return null;
};

function extractDivSteps(innerContent) {
  const tagged = /<Step[^>]*>([\s\S]*?)<\/Step>/gi;
  const fromStep = [];
  let taggedMatch;
  while ((taggedMatch = tagged.exec(innerContent)) !== null) {
    const stepText = taggedMatch[1].trim();
    if (stepText) fromStep.push(stepText);
  }
  if (fromStep.length) return fromStep;

  const stepRegex = /<div[^>]*>([\s\S]*?)<\/div>/g;
  const stepContents = [];
  let stepMatch;
  while ((stepMatch = stepRegex.exec(innerContent)) !== null) {
    const stepText = stepMatch[1].trim();
    if (stepText) stepContents.push(stepText);
  }
  if (stepContents.length === 0) {
    const trimmed = innerContent.trim();
    if (trimmed) stepContents.push(trimmed);
  }
  return stepContents;
}

export const parseBlocks = (content) => {
  if (!content) return [];
  
  const blocks = [];
  let pointer = 0;

  while (pointer < content.length) {
    const tagMatch = findNextTag(content, pointer);

    if (!tagMatch) {
      const remainingText = content.substring(pointer).trim();
      if (remainingText) {
        blocks.push({ type: 'text', content: convertMarkdownLists(remainingText) });
      }
      break;
    }

    if (tagMatch.startIndex > pointer) {
      const textBefore = content.substring(pointer, tagMatch.startIndex).trim();
      if (textBefore) {
        blocks.push({ type: 'text', content: convertMarkdownLists(textBefore) });
      }
    }

    const { tagName, attrs, innerContent } = tagMatch;

    if (tagName === 'Def') {
      const titleMatch = attrs.match(/title="([^"]+)"/);
      blocks.push({
        type: 'def',
        title: titleMatch ? titleMatch[1] : 'Определение',
        blocks: parseBlocks(innerContent) // Рекурсивный парсинг вложенных блоков
      });
    } else if (tagName === 'Ex') {
      const titleMatch = attrs.match(/title="([^"]+)"/);
      const isHard = attrs.includes('isHard');
      blocks.push({
        type: 'ex',
        title: titleMatch ? titleMatch[1] : null,
        isHard,
        blocks: parseBlocks(innerContent) // Рекурсивный парсинг вложенных блоков
      });
    } else if (tagName === 'Explanation') {
      blocks.push({
        type: 'explanation',
        blocks: parseBlocks(innerContent) // Рекурсивный парсинг вложенных блоков
      });
    } else if (tagName === 'Important') {
      const titleMatch = attrs.match(/title="([^"]+)"/);
      blocks.push({
        type: 'important',
        title: titleMatch ? titleMatch[1] : 'Важно',
        blocks: parseBlocks(innerContent)
      });
    } else if (tagName === 'Formula') {
      const titleMatch = attrs.match(/title="([^"]+)"/);
      blocks.push({
        type: 'formula',
        title: titleMatch ? titleMatch[1] : null,
        blocks: parseBlocks(innerContent)
      });
    } else if (tagName === 'Collapsible') {
      const titleMatch = attrs.match(/title="([^"]+)"/);
      blocks.push({
        type: 'collapsible',
        title: titleMatch ? titleMatch[1] : 'Доказательство',
        blocks: parseBlocks(innerContent)
      });
    } else if (tagName === 'Grid') {
      const colsMatch = attrs.match(/cols="?(\d+)"?/);
      blocks.push({
        type: 'grid',
        cols: colsMatch ? parseInt(colsMatch[1], 10) : 2,
        blocks: parseBlocks(innerContent)
      });
    } else if (tagName === 'Card') {
      const titleMatch = attrs.match(/title="([^"]+)"/);
      blocks.push({
        type: 'card',
        title: titleMatch ? titleMatch[1] : null,
        blocks: parseBlocks(innerContent)
      });
    } else if (tagName === 'Steps' || tagName === 'Algorithm') {
      blocks.push({
        type: 'steps',
        steps: extractDivSteps(innerContent)
      });
    } else if (tagName === 'GeoGebra') {
      const idMatch = attrs.match(/id="([^"]+)"/);
      const heightMatch = attrs.match(/height="([^"]+)"/);
      const setupMatch = attrs.match(/setup=\{`([\s\S]*?)`\}/) || attrs.match(/setup="([^"]*)"/) || attrs.match(/setup='([^']*)'/);

      const geogebraInner = parseGeoGebraInner(innerContent);
      blocks.push({
        type: 'geogebra',
        id: idMatch ? idMatch[1] : null,
        height: heightMatch ? heightMatch[1] : "400",
        setup: setupMatch ? setupMatch[1] : null,
        controls: geogebraInner.controls,
        texts: geogebraInner.texts,
      });
    } else if (tagName === 'Html') {
      const htmlMatch = attrs.match(/html="([^"]*)"/);
      blocks.push({
        type: 'html',
        html: htmlMatch ? htmlMatch[1] : innerContent,
      });
    }

    pointer = tagMatch.endIndex;
  }

  return blocks;
};

export function parseTheorySections(content) {
  const sections = [];
  const openRe = /<Section(?=[\s/>])/g;
  const opens = [];
  let open;
  while ((open = openRe.exec(content)) !== null) opens.push(open.index);

  for (let index = 0; index < opens.length; index += 1) {
    const start = opens[index];
    const scanned = scanTagClose(content, start + '<Section'.length);
    if (!scanned || scanned.selfClosing) continue;

    const attrs = content.slice(start + '<Section'.length, scanned.end - 1);
    const id = readMarkupAttr(attrs, 'id');
    if (!id) continue;

    const nextOpen = opens[index + 1] ?? content.length;
    const closeAt = content.indexOf('</Section>', scanned.end);
    const hasClose = closeAt !== -1 && closeAt < nextOpen;
    const bodyEnd = hasClose ? closeAt : nextOpen;

    sections.push({
      id,
      title: readMarkupAttr(attrs, 'title') || '',
      isHard: /\bisHard\b/.test(attrs),
      orderedBlocks: parseBlocks(content.slice(scanned.end, bodyEnd)),
    });
  }

  return sections;
}

export function cloneBoardBlock(block) {
  if (!block || block.type === 'geogebra') return null;
  if (block.type === 'text') return block.content ? { type: 'text', content: block.content } : null;
  if (block.type === 'html') return block.html ? { type: 'html', html: block.html } : null;
  if (block.type === 'steps') {
    const steps = (block.steps || []).map((step) => String(step || '').trim()).filter(Boolean);
    return steps.length ? { type: 'steps', steps } : null;
  }
  const blocks = (block.blocks || []).map(cloneBoardBlock).filter(Boolean);
  if (!blocks.length) return null;
  const copy = { type: block.type, blocks };
  if (block.title) copy.title = block.title;
  if (block.isHard) copy.isHard = true;
  if (block.cols) copy.cols = block.cols;
  return copy;
}

export function theoryCopyPayload(block) {
  if (!block) return null;
  if (block.type === 'geogebra') {
    return {
      kind: 'geogebra',
      setup: block.setup || '',
      materialId: block.id ? String(block.id) : '',
      controls: block.controls || [],
      texts: block.texts || [],
      height: block.height || '400',
    };
  }
  const copy = cloneBoardBlock(block);
  if (!copy) return null;
  return { kind: 'theory', block: copy };
}


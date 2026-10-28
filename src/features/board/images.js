const IMAGE_PUBLIC_URL = 'https://pub-2b7cf8fddd9747b69e66cdac8a86c7fd.r2.dev';
const BOARD_FILE = /\/boards\/([^/?#\s)]+)\.(?:png|jpe?g|webp|gif)/gi;

function idsInText(text, into) {
  const source = String(text || '');
  BOARD_FILE.lastIndex = 0;
  let match = BOARD_FILE.exec(source);
  while (match) {
    into.add(decodeURIComponent(match[1]));
    match = BOARD_FILE.exec(source);
  }
}

export function imageFileIds(obj) {
  const ids = new Set();
  const props = obj?.props || {};
  (Array.isArray(props.imageIds) ? props.imageIds : []).forEach((id) => {
    if (id) ids.add(String(id));
  });
  if (obj?.type === 'image' && props.fileId) ids.add(String(props.fileId));
  const chunks = [props.content, props.text, props.teacherOnly?.solution, props.teacherOnly?.answer];
  if (Array.isArray(props.options)) chunks.push(...props.options);
  chunks.forEach((chunk) => idsInText(chunk, ids));
  return ids;
}

export function unusedImageIds(removed, remaining) {
  const stay = new Set();
  (remaining || []).forEach((obj) => imageFileIds(obj).forEach((id) => stay.add(id)));
  const gone = new Set();
  (removed || []).forEach((obj) => imageFileIds(obj).forEach((id) => {
    if (!stay.has(id)) gone.add(id);
  }));
  return [...gone];
}

export function boardImageSrc(props = {}) {
  const src = typeof props.src === 'string' ? props.src : '';
  if (src.startsWith('blob:') || src.startsWith('data:')) return src;
  if (src) {
    try {
      return `${IMAGE_PUBLIC_URL}${new URL(src).pathname}`;
    } catch {
      return `${IMAGE_PUBLIC_URL}/${src.replace(/^\/+/, '')}`;
    }
  }
  if (props.fileId) return `${IMAGE_PUBLIC_URL}/boards/${props.fileId}.png`;
  return '';
}

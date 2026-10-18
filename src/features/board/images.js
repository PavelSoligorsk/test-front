const IMAGE_PUBLIC_URL = 'https://pub-2b7cf8fddd9747b69e66cdac8a86c7fd.r2.dev';

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

// Ответ каждого ученика лежит в своём поле карточки: сервер сливает props
// по верхним ключам, поэтому общий массив затирался бы чужим выбором.
export const PRACTICE_PREFIX = 'pa:';

export function practiceKey(who) {
  return `${PRACTICE_PREFIX}${who}`;
}

export function isPracticeKey(key) {
  return typeof key === 'string' && key.startsWith(PRACTICE_PREFIX) && key.length > PRACTICE_PREFIX.length;
}

export function practiceEntries(props) {
  const source = props || {};
  const byWho = new Map();
  const legacy = Array.isArray(source.practiceAnswers) ? source.practiceAnswers : [];
  legacy.forEach((item) => {
    if (!item?.who || !String(item.answer ?? '').trim()) return;
    byWho.set(item.who, item);
  });
  Object.keys(source).forEach((key) => {
    if (!isPracticeKey(key)) return;
    const item = source[key];
    if (!item || typeof item !== 'object' || !String(item.answer ?? '').trim()) return;
    const who = item.who || key.slice(PRACTICE_PREFIX.length);
    byWho.set(who, { ...item, who });
  });
  return [...byWho.values()].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ru'));
}

export function clearPracticePatch(props) {
  const patch = { practiceAnswers: [], practiceShown: false };
  Object.keys(props || {}).forEach((key) => {
    if (isPracticeKey(key)) patch[key] = null;
  });
  return patch;
}

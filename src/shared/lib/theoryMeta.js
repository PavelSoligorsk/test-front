export const THEORY_CLASSES = [5, 6, 7, 8, 9, 10, 11];

export function classKey(value) {
  return String(value ?? '');
}

function sectionCount(sections) {
  if (Array.isArray(sections)) return sections.length;
  return Object.keys(sections || {}).length;
}

export function topicsInClass(meta, theoryClass) {
  const bucket = meta?.[classKey(theoryClass)] || {};
  return Object.entries(bucket)
    .map(([topic, data]) => ({
      topic,
      priority: Number(data?.priority) || 0,
      sections: data?.sections ?? (Array.isArray(data?.sections) ? data.sections : {}),
    }))
    .sort((a, b) => a.priority - b.priority || a.topic.localeCompare(b.topic, 'ru'));
}

export function flattenTopicsByPriority(meta) {
  const map = new Map();
  Object.entries(meta || {}).forEach(([theoryClass, topics]) => {
    Object.entries(topics || {}).forEach(([topic, data]) => {
      const count = sectionCount(data?.sections);
      const prev = map.get(topic);
      map.set(topic, {
        topic,
        priority: Math.min(prev?.priority ?? Number.POSITIVE_INFINITY, Number(data?.priority) || 0),
        sections_count: (prev?.sections_count || 0) + count,
        classes: [...(prev?.classes || []), Number(theoryClass)],
      });
    });
  });
  return [...map.values()].sort((a, b) => a.priority - b.priority || a.topic.localeCompare(b.topic, 'ru'));
}

export function sectionsForTopic(meta, topic, theoryClass = null) {
  const rows = [];
  const classes = theoryClass != null
    ? [classKey(theoryClass)]
    : Object.keys(meta || {}).sort((a, b) => Number(a) - Number(b));

  classes.forEach((cls) => {
    const data = meta?.[cls]?.[topic];
    if (!data) return;
    const sections = data.sections;
    const names = Array.isArray(sections) ? sections : Object.keys(sections || {});
    names.forEach((section) => {
      rows.push({
        section,
        theoryClass: Number(cls),
        id: Array.isArray(sections) ? null : sections[section],
      });
    });
  });
  return rows;
}

export function topicPriority(meta, theoryClass, topic) {
  const value = meta?.[classKey(theoryClass)]?.[topic]?.priority;
  return value == null ? null : Number(value);
}

export function nextTopicPriority(meta, theoryClass) {
  const topics = topicsInClass(meta, theoryClass);
  if (!topics.length) return 0;
  return Math.max(...topics.map((item) => item.priority)) + 1;
}

export function articleIdsForTopic(meta, theoryClass, topic) {
  const sections = meta?.[classKey(theoryClass)]?.[topic]?.sections;
  if (!sections || Array.isArray(sections)) return [];
  return Object.values(sections).filter((id) => id != null);
}

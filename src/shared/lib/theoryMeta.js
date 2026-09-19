export const THEORY_CLASSES = [5, 6, 7, 8, 9, 10, 11];

export function classKey(value) {
  return String(value ?? '');
}

export function isTheoryClass(value) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 5 && n <= 11;
}

function sectionCount(sections) {
  if (Array.isArray(sections)) return sections.length;
  return Object.keys(sections || {}).length;
}

function sectionNames(sections) {
  if (Array.isArray(sections)) {
    return sections.map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object') return item.section || item.name || item.title || null;
      return null;
    }).filter(Boolean);
  }
  if (sections && typeof sections === 'object') return Object.keys(sections);
  return [];
}

function mergeSections(a, b) {
  const aObj = a && typeof a === 'object' && !Array.isArray(a);
  const bObj = b && typeof b === 'object' && !Array.isArray(b);
  if (aObj && bObj) return { ...a, ...b };
  if (aObj && sectionNames(b).length === 0) return a;
  if (bObj && sectionNames(a).length === 0) return b;
  return [...new Set([...sectionNames(a), ...sectionNames(b)])];
}

function topicRecord(topic, data, fallbackPriority = 0) {
  if (typeof data === 'string') {
    return { topic: data, priority: fallbackPriority, sections: [] };
  }
  if (Array.isArray(data)) {
    return { topic, priority: fallbackPriority, sections: sectionNames(data) };
  }
  if (data && typeof data === 'object') {
    const name = data.topic || data.key || topic;
    const priority = data.priority == null ? fallbackPriority : Number(data.priority) || 0;
    let sections = data.sections;
    if (sections == null && data.section) sections = [data.section];
    if (sections == null) sections = [];
    return { topic: name, priority, sections };
  }
  return { topic, priority: fallbackPriority, sections: [] };
}

function addRecord(out, cls, rec) {
  if (!rec?.topic) return;
  const bucket = out[cls] || (out[cls] = {});
  const prev = bucket[rec.topic];
  if (!prev) {
    bucket[rec.topic] = { priority: rec.priority, sections: rec.sections };
    return;
  }
  prev.priority = Math.min(Number(prev.priority) || 0, Number(rec.priority) || 0);
  prev.sections = mergeSections(prev.sections, rec.sections);
}

function recordsFromBucket(bucket) {
  if (Array.isArray(bucket)) {
    return bucket.flatMap((item, i) => {
      if (Array.isArray(item) && item.length >= 1) {
        return [topicRecord(item[0], item[1] ?? {}, i)];
      }
      return [topicRecord(item?.topic || item?.key, item, i)];
    });
  }
  if (bucket && typeof bucket === 'object') {
    return Object.entries(bucket).map(([topic, data]) => topicRecord(topic, data, 0));
  }
  return [];
}

export function normalizeTheoryMeta(raw) {
  if (!raw || typeof raw !== 'object') return {};

  const source = !Array.isArray(raw) && (raw.meta || raw.data) && typeof (raw.meta || raw.data) === 'object'
    ? (raw.meta || raw.data)
    : raw;

  if (Array.isArray(source)) {
    const out = {};
    source.forEach((item, i) => {
      const cls = isTheoryClass(item?.theory_class) ? classKey(item.theory_class) : '5';
      addRecord(out, cls, topicRecord(item?.topic, item, i));
    });
    return out;
  }

  const keys = Object.keys(source);
  const classKeyed = keys.length > 0 && keys.every((key) => isTheoryClass(key));

  if (classKeyed) {
    const out = {};
    keys.forEach((cls) => {
      recordsFromBucket(source[cls]).forEach((rec) => addRecord(out, cls, rec));
    });
    return out;
  }

  const out = {};
  recordsFromBucket(source).forEach((rec) => {
    const cls = isTheoryClass(rec.theory_class) ? classKey(rec.theory_class) : '5';
    addRecord(out, cls, rec);
  });
  return out;
}

export function topicsInClass(meta, theoryClass) {
  const bucket = normalizeTheoryMeta(meta)[classKey(theoryClass)] || {};
  return Object.entries(bucket)
    .map(([topic, data]) => ({
      topic,
      priority: Number(data?.priority) || 0,
      sections: data?.sections ?? {},
    }))
    .sort((a, b) => a.priority - b.priority || a.topic.localeCompare(b.topic, 'ru'));
}

export function flattenTopicsByPriority(meta) {
  const normalized = normalizeTheoryMeta(meta);
  const map = new Map();
  Object.entries(normalized).forEach(([theoryClass, topics]) => {
    Object.entries(topics || {}).forEach(([topic, data]) => {
      const count = sectionCount(data?.sections);
      const prev = map.get(topic);
      map.set(topic, {
        topic,
        priority: Math.min(prev?.priority ?? Number.POSITIVE_INFINITY, Number(data?.priority) || 0),
        sections_count: (prev?.sections_count || 0) + count,
        classes: [...(prev?.classes || []), Number(theoryClass)].filter((cls) => isTheoryClass(cls)),
      });
    });
  });
  return [...map.values()].sort((a, b) => a.priority - b.priority || a.topic.localeCompare(b.topic, 'ru'));
}

export function sectionsForTopic(meta, topic, theoryClass = null) {
  const normalized = normalizeTheoryMeta(meta);
  const classes = theoryClass != null
    ? [classKey(theoryClass)]
    : Object.keys(normalized).sort((a, b) => Number(a) - Number(b));

  return classes.flatMap((cls) => (
    sectionsInClass(normalized, cls, topic).map((row) => ({
      section: row.section,
      theoryClass: Number(cls),
      id: row.id ?? null,
    }))
  ));
}

export function topicPriority(meta, theoryClass, topic) {
  const value = normalizeTheoryMeta(meta)?.[classKey(theoryClass)]?.[topic]?.priority;
  return value == null ? null : Number(value);
}

export function nextTopicPriority(meta, theoryClass) {
  const topics = topicsInClass(meta, theoryClass);
  if (!topics.length) return 0;
  return Math.max(...topics.map((item) => item.priority)) + 1;
}

export function articleIdsForTopic(meta, theoryClass, topic) {
  const sections = normalizeTheoryMeta(meta)?.[classKey(theoryClass)]?.[topic]?.sections;
  if (!sections || Array.isArray(sections)) return [];
  return Object.values(sections).filter((id) => id != null);
}

function sectionRows(sections, topic, topicPriority = 0) {
  if (Array.isArray(sections)) {
    return sections.map((item, index) => {
      if (typeof item === 'string') {
        return { topic, section: item, id: null, priority: topicPriority * 1000 + index };
      }
      if (item && typeof item === 'object') {
        return {
          topic: item.topic || topic,
          section: item.section || item.name || item.title,
          id: item.id ?? item.theory_id ?? null,
          priority: item.priority == null ? topicPriority * 1000 + index : Number(item.priority) || 0,
        };
      }
      return null;
    }).filter((row) => row?.section);
  }
  if (sections && typeof sections === 'object') {
    return Object.entries(sections).map(([section, value], index) => {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return {
          topic: value.topic || topic,
          section: value.section || section,
          id: value.id ?? value.theory_id ?? null,
          priority: value.priority == null ? topicPriority * 1000 + index : Number(value.priority) || 0,
        };
      }
      return {
        topic,
        section,
        id: value ?? null,
        priority: topicPriority * 1000 + index,
      };
    });
  }
  return [];
}

export function sectionRowKey(row) {
  return row?.id != null ? `id:${row.id}` : `${row.topic}::${row.section}`;
}

export function sectionsInClass(meta, theoryClass, topic = null) {
  const rows = [];
  topicsInClass(meta, theoryClass).forEach((item) => {
    if (topic != null && item.topic !== topic) return;
    rows.push(...sectionRows(item.sections, item.topic, item.priority));
  });
  return rows.sort((a, b) => a.priority - b.priority || a.topic.localeCompare(b.topic, 'ru') || a.section.localeCompare(b.section, 'ru'));
}

export function nextArticlePriority(meta, theoryClass) {
  const rows = sectionsInClass(meta, theoryClass);
  if (!rows.length) return 0;
  return Math.max(...rows.map((row) => Number(row.priority) || 0)) + 1;
}

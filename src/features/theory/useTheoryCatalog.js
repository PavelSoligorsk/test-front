import { useEffect, useMemo, useRef, useState } from 'react';
import { flattenTopicsByPriority, sectionsForTopic, topicsInClass } from '../../shared/lib/theoryMeta';
import { fetchStudentTheoryArticle, fetchStudentTheoryMeta } from './api';

function topicRows(meta, group, theoryClass) {
  if (!meta) return [];
  if (group === 'class') {
    if (theoryClass == null) return [];
    return topicsInClass(meta, theoryClass).map((item) => ({
      topic: item.topic,
      sections_count: Array.isArray(item.sections) ? item.sections.length : Object.keys(item.sections || {}).length,
      hint: `${theoryClass} класс`,
      theoryClass,
    }));
  }
  return flattenTopicsByPriority(meta);
}

export function useTheoryCatalog({
  group,
  theoryClass,
  topicKey,
  sectionKey,
  sectionClass = null,
  onOpenOnlySection,
  warmMs = 0,
}) {
  const [meta, setMeta] = useState(null);
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [warming, setWarming] = useState(false);
  const [error, setError] = useState(null);

  const openOnlyRef = useRef(onOpenOnlySection);
  openOnlyRef.current = onOpenOnlySection;

  const topics = useMemo(() => topicRows(meta, group, theoryClass), [meta, group, theoryClass]);
  const sections = useMemo(() => {
    if (!meta || !topicKey) return [];
    return sectionsForTopic(meta, topicKey, group === 'class' ? theoryClass : null);
  }, [meta, topicKey, group, theoryClass]);

  useEffect(() => {
    let cancelled = false;
    fetchStudentTheoryMeta()
      .then((data) => { if (!cancelled) setMeta(data || {}); })
      .catch(() => { if (!cancelled) setMeta({}); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (meta == null) return undefined;
    let cancelled = false;

    const load = async () => {
      setWarming(false);
      setError(null);
      setContent(null);

      if (!topicKey) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const sectionList = sectionsForTopic(meta, topicKey, group === 'class' ? theoryClass : null);
        if (!sectionKey) {
          if (sectionList.length === 1 && openOnlyRef.current) {
            const stayLoading = openOnlyRef.current(sectionList[0]) !== false;
            if (stayLoading) return;
          }
          setLoading(false);
          return;
        }

        const prefer = sectionClass != null ? sectionClass : theoryClass;
        const row = sectionList.find((item) => item.section === sectionKey && (prefer == null || item.theoryClass === prefer))
          || sectionList.find((item) => item.section === sectionKey);
        const data = await fetchStudentTheoryArticle(topicKey, sectionKey, row?.theoryClass ?? sectionClass ?? theoryClass);
        if (cancelled) return;
        setContent(data);
        setLoading(false);
        if (warmMs > 0) {
          setWarming(true);
          await new Promise((resolve) => setTimeout(resolve, warmMs));
          if (cancelled) return;
          setWarming(false);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err.response?.data?.detail || 'Не удалось открыть материал');
        setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [meta, topicKey, sectionKey, sectionClass, group, theoryClass, warmMs]);

  return { meta, topics, sections, content, loading, warming, error };
}

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Library } from 'lucide-react';
import { TheoryViewer } from '../../components/Theory';
import { ArticleBodySkeleton } from '../../pages/StudentDashboardPage/StudentPageLoading';
import { fetchTheoryMeta, fetchTheoryByTopicSection } from '../../pages/StudentDashboardPage/api';
import TheoryGroupToggle from '../../pages/StudentDashboardPage/TheoryGroupToggle';
import { MAIN_TOPICS, THEORY_CLASSES } from '../../pages/AdminDashboardPage/constants';
import { flattenTopicsByPriority, sectionsForTopic, topicsInClass } from '../../shared/lib/theoryMeta';

export default function BoardTheoryPane({ onCopy }) {
  const [meta, setMeta] = useState(null);
  const [group, setGroup] = useState('topics');
  const [theoryClass, setTheoryClass] = useState(null);
  const [topicKey, setTopicKey] = useState(null);
  const [sectionKey, setSectionKey] = useState(null);
  const [sectionClass, setSectionClass] = useState(null);
  const [theoryContent, setTheoryContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const topics = useMemo(() => {
    if (!meta) return [];
    if (group === 'class') {
      if (theoryClass == null) return [];
      return topicsInClass(meta, theoryClass).map((item) => ({
        topic: item.topic,
        sections_count: Array.isArray(item.sections) ? item.sections.length : Object.keys(item.sections || {}).length,
        theoryClass,
      }));
    }
    return flattenTopicsByPriority(meta);
  }, [meta, group, theoryClass]);

  const sections = useMemo(() => {
    if (!meta || !topicKey) return [];
    return sectionsForTopic(meta, topicKey, group === 'class' ? theoryClass : null);
  }, [meta, topicKey, group, theoryClass]);

  const selectedTopic = topics.find((item) => item.topic === topicKey) || (topicKey ? { topic: topicKey } : null);
  const title = selectedTopic
    ? (MAIN_TOPICS[selectedTopic.topic] || selectedTopic.label || selectedTopic.topic)
    : 'Теория';

  useEffect(() => {
    let cancelled = false;
    fetchTheoryMeta()
      .then((data) => { if (!cancelled) setMeta(data || {}); })
      .catch(() => { if (!cancelled) setMeta({}); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (meta == null) return undefined;
    let cancelled = false;
    const load = async () => {
      setError(null);
      setTheoryContent(null);
      if (!topicKey) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const sectionList = sectionsForTopic(meta, topicKey, group === 'class' ? theoryClass : null);
        if (!sectionKey) {
          if (sectionList.length === 1) {
            setSectionKey(sectionList[0].section);
            setSectionClass(sectionList[0].theoryClass);
          }
          setLoading(false);
          return;
        }
        const row = sectionList.find((item) => item.section === sectionKey && (sectionClass == null || item.theoryClass === sectionClass))
          || sectionList.find((item) => item.section === sectionKey);
        const data = await fetchTheoryByTopicSection(topicKey, sectionKey, row?.theoryClass ?? sectionClass ?? theoryClass);
        if (cancelled) return;
        setTheoryContent(data);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(err.response?.data?.detail || 'Не удалось открыть материал');
        setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [meta, topicKey, sectionKey, sectionClass, group, theoryClass]);

  const back = () => {
    if (sectionKey && sections.length > 1) {
      setSectionKey(null);
      setSectionClass(null);
      setTheoryContent(null);
      return;
    }
    if (topicKey) {
      setTopicKey(null);
      setSectionKey(null);
      setSectionClass(null);
      return;
    }
    if (group === 'class' && theoryClass != null) setTheoryClass(null);
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#fafafa] dark:bg-[#09090b]">
      <div className="flex items-center gap-2 border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
        {(topicKey || sectionKey || (group === 'class' && theoryClass != null)) ? (
          <button type="button" onClick={back} aria-label="Назад" className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900">
            <ArrowLeft size={16} />
          </button>
        ) : (
          <span className="flex h-9 w-9 items-center justify-center text-zinc-400"><Library size={16} /></span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</p>
          <p className="truncate text-xs text-zinc-500">{sectionKey || (topicKey ? 'Выберите раздел' : 'Материалы')}</p>
        </div>
        {!topicKey && <TheoryGroupToggle value={group} onChange={(next) => { setGroup(next); setTheoryClass(null); setTopicKey(null); setSectionKey(null); }} />}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {loading && <ArticleBodySkeleton />}
        {error && <p className="px-2 py-8 text-center text-sm text-zinc-500">{error}</p>}
        {!loading && !error && !topicKey && group === 'class' && theoryClass == null && (
          <div className="grid grid-cols-2 gap-2">
            {THEORY_CLASSES.map((cls) => (
              <button key={cls} type="button" onClick={() => setTheoryClass(cls)} className="rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm font-semibold text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100">
                {cls} класс
              </button>
            ))}
          </div>
        )}
        {!loading && !error && !topicKey && (group === 'topics' || theoryClass != null) && (
          topics.length ? (
            <div className="space-y-1">
              {topics.map((topic) => (
                <button
                  key={`${topic.topic}-${topic.theoryClass || 'all'}`}
                  type="button"
                  onClick={() => { setTopicKey(topic.topic); setSectionKey(null); setSectionClass(topic.theoryClass ?? null); }}
                  className="block w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-zinc-800 hover:bg-white dark:text-zinc-200 dark:hover:bg-zinc-900"
                >
                  {MAIN_TOPICS[topic.topic] || topic.label || topic.topic}
                </button>
              ))}
            </div>
          ) : <p className="px-2 py-8 text-center text-sm text-zinc-500">Теория пока не добавлена</p>
        )}
        {!loading && !error && topicKey && !sectionKey && sections.length > 1 && (
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
            {sections.map((item) => (
              <button
                key={`${item.theoryClass}-${item.section}`}
                type="button"
                onClick={() => { setSectionKey(item.section); setSectionClass(item.theoryClass); }}
                className="block w-full border-b border-zinc-100 px-3 py-3 text-left text-sm font-medium text-zinc-800 last:border-0 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-900"
              >
                {item.section}
              </button>
            ))}
          </div>
        )}
        {!loading && !error && topicKey && !sectionKey && sections.length === 0 && (
          <p className="px-2 py-8 text-center text-sm text-zinc-500">В этой теме пока нет разделов</p>
        )}
        {!loading && !error && sectionKey && theoryContent && (
          <div className="rounded-2xl border border-zinc-200 bg-white px-3 py-4 dark:border-zinc-800 dark:bg-zinc-950">
            <TheoryViewer content={theoryContent.content || ''} embedded isFullWidth onCopyBlock={onCopy} />
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Library } from 'lucide-react';
import { TheoryViewer } from '../../components/Theory';
import TheoryAIChat from '../../components/TheoryAIChat';
import TopicCard from './TopicCard';
import StudentPageLoading, { ArticleBodySkeleton } from './StudentPageLoading';
import { fetchTheoryMeta, fetchTheoryByTopicSection } from './api';
import { theoryArticlePath, theoryTopicPath, STUDENT_PATHS } from './studentPaths';
import { MAIN_TOPICS, THEORY_CLASSES } from '../AdminDashboardPage/constants';
import { flattenTopicsByPriority, sectionsForTopic, topicsInClass } from '../../shared/lib/theoryMeta';
import TheoryGroupToggle from './TheoryGroupToggle';

function EmptyTheory({ text = 'Теория пока не добавлена' }) {
  return (
    <div className="bg-white dark:bg-[#09090b] rounded-3xl border border-zinc-200 dark:border-zinc-800/60 shadow-sm py-16 px-6 flex flex-col items-center text-center gap-4">
      <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 text-zinc-400">
        <Library size={24} strokeWidth={1.5} />
      </div>
      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{text}</p>
    </div>
  );
}

function linkOpts(group, theoryClass) {
  return {
    ...(group === 'class' ? { group: 'class' } : {}),
    ...(theoryClass != null && theoryClass !== '' ? { theoryClass } : {}),
  };
}

export default function TheoryPage() {
  const { topic: topicParam, section: sectionParam } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [meta, setMeta] = useState(null);
  const [theoryContent, setTheoryContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [warming, setWarming] = useState(false);
  const [error, setError] = useState(null);

  const topicKey = topicParam || null;
  const sectionKey = sectionParam || null;
  const group = searchParams.get('group') === 'class' ? 'class' : 'topics';
  const classParam = searchParams.get('class');
  const theoryClass = classParam != null && classParam !== '' ? Number(classParam) : null;

  const topics = useMemo(() => {
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
  }, [meta, group, theoryClass]);

  const sections = useMemo(() => {
    if (!meta || !topicKey) return [];
    return sectionsForTopic(meta, topicKey, group === 'class' ? theoryClass : null);
  }, [meta, topicKey, group, theoryClass]);

  const selectedTopic = topics.find((t) => t.topic === topicKey) || (topicKey ? { topic: topicKey, label: topicKey } : null);

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
      setWarming(false);
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
            navigate(theoryArticlePath(topicKey, sectionList[0].section, linkOpts(group, sectionList[0].theoryClass)), { replace: true });
            return;
          }
          setLoading(false);
          return;
        }

        const row = sectionList.find((item) => item.section === sectionKey && (theoryClass == null || item.theoryClass === theoryClass))
          || sectionList.find((item) => item.section === sectionKey);
        const data = await fetchTheoryByTopicSection(topicKey, sectionKey, row?.theoryClass ?? theoryClass);
        if (cancelled) return;
        setTheoryContent(data);
        setLoading(false);
        setWarming(true);
        await new Promise((resolve) => setTimeout(resolve, 1500));
        if (cancelled) return;
        setWarming(false);
      } catch (err) {
        if (cancelled) return;
        setError(err.response?.data?.detail || 'Не удалось открыть материал');
        setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [meta, topicKey, sectionKey, navigate, group, theoryClass]);

  const theoryRootSearch = (nextGroup, nextClass) => {
    const nextParams = new URLSearchParams();
    if (nextGroup === 'class') nextParams.set('group', 'class');
    if (nextGroup === 'class' && nextClass != null) nextParams.set('class', String(nextClass));
    const qs = nextParams.toString();
    return { pathname: STUDENT_PATHS.theory, search: qs ? `?${qs}` : '' };
  };

  const setGroup = (next) => {
    navigate(theoryRootSearch(next, null));
  };

  const setClass = (cls) => {
    navigate(theoryRootSearch('class', cls));
  };

  const handleBack = () => {
    if (sectionKey && sections.length > 1) {
      navigate(theoryTopicPath(topicKey, linkOpts(group, group === 'class' ? theoryClass : null)));
      return;
    }
    if (topicKey) {
      navigate(theoryRootSearch(group, group === 'class' ? theoryClass : null));
      return;
    }
    navigate(theoryRootSearch('class', null));
  };

  const handleTopicClick = (topic) => {
    navigate(theoryTopicPath(topic.topic, linkOpts(group, topic.theoryClass ?? (group === 'class' ? theoryClass : null))));
  };

  const title = selectedTopic
    ? (MAIN_TOPICS[selectedTopic.topic] || selectedTopic.label || selectedTopic.topic)
    : 'Теоретический материал';
  const loadingVariant = sectionKey ? 'theoryArticle' : topicKey ? 'theorySections' : 'theory';
  const catalogHint = group === 'class'
    ? (theoryClass != null ? `${theoryClass} класс` : 'Выберите класс')
    : 'Материалы по темам';
  const loadingHint = sectionKey
    ? sectionKey
    : topicKey
      ? 'Выберите раздел'
      : catalogHint;

  if (loading) {
    return <StudentPageLoading variant={loadingVariant} title={title} hint={loadingHint} />;
  }

  return (
    <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
      <div className="bg-white dark:bg-[#09090b] rounded-3xl border border-zinc-200 dark:border-zinc-800/60 shadow-sm p-6 md:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4 min-w-0">
            {(topicKey || sectionKey || (group === 'class' && theoryClass != null)) ? (
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center justify-center w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                title="Назад"
              >
                <ArrowLeft size={18} strokeWidth={2} />
              </button>
            ) : (
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm">
                <Library size={18} strokeWidth={2} />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">{title}</h1>
              {sectionKey ? (
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">{sectionKey}</p>
              ) : topicKey ? (
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Выберите раздел</p>
              ) : (
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">{catalogHint}</p>
              )}
            </div>
          </div>
          {!topicKey && <TheoryGroupToggle value={group} onChange={setGroup} />}
        </div>
      </div>

      {error && (
        <div className="bg-white dark:bg-[#09090b] rounded-3xl border border-zinc-200 dark:border-zinc-800/60 shadow-sm py-16 px-6 text-center">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Материал не открылся</p>
          <p className="text-sm text-zinc-500 mt-1">{error}</p>
        </div>
      )}

      {!error && !topicKey && group === 'class' && theoryClass == null && (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
          {THEORY_CLASSES.map((cls) => (
            <button
              key={cls}
              type="button"
              onClick={() => setClass(cls)}
              className="rounded-2xl border border-zinc-200 bg-white px-3 py-4 text-sm font-semibold text-zinc-900 shadow-sm hover:border-zinc-300 dark:border-zinc-800/60 dark:bg-[#09090b] dark:text-zinc-100 dark:hover:border-zinc-700"
            >
              {cls} класс
            </button>
          ))}
        </div>
      )}

      {!error && !topicKey && (group === 'topics' || theoryClass != null) && (
        topics.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {topics.map((topic, index) => (
              <TopicCard key={`${topic.topic}-${topic.theoryClass || 'all'}`} topic={topic} onClick={handleTopicClick} index={index} />
            ))}
          </div>
        ) : (
          <EmptyTheory />
        )
      )}

      {!error && topicKey && !sectionKey && sections.length > 1 && (
        <div className="bg-white dark:bg-[#09090b] rounded-3xl border border-zinc-200 dark:border-zinc-800/60 shadow-sm overflow-hidden">
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
            {sections.map((item) => (
              <li key={`${item.theoryClass}-${item.section}`}>
                <button
                  type="button"
                  onClick={() => navigate(theoryArticlePath(topicKey, item.section, linkOpts(group, item.theoryClass)))}
                  className="w-full text-left px-6 md:px-8 py-4 text-sm font-medium text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors"
                >
                  {item.section}
                  {group === 'topics' && new Set(sections.map((row) => row.theoryClass)).size > 1 ? (
                    <span className="ml-2 text-xs font-normal text-zinc-400">{item.theoryClass} класс</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!error && topicKey && !sectionKey && sections.length === 0 && (
        <EmptyTheory text="В этой теме пока нет разделов" />
      )}

      {!error && sectionKey && theoryContent && (
        <div className="student-theory relative bg-white dark:bg-[#09090b] rounded-3xl border border-zinc-200 dark:border-zinc-800/60 shadow-sm overflow-hidden">
          {warming && (
            <div className="absolute inset-0 z-10 bg-white dark:bg-[#09090b] px-4 md:px-8 py-6 md:py-8">
              <ArticleBodySkeleton />
            </div>
          )}
          <div
            className="px-4 md:px-8 py-6 md:py-8"
            aria-hidden={warming}
            inert={warming || undefined}
          >
            <TheoryViewer content={theoryContent.content || ''} embedded />
          </div>
          {!warming && (
            <TheoryAIChat
              theoryContent={theoryContent.content}
              topic={selectedTopic?.label || selectedTopic?.topic}
              section={sectionKey}
              theoryId={theoryContent?.id}
            />
          )}
        </div>
      )}
    </main>
  );
}

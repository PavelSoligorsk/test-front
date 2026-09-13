import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Library } from 'lucide-react';
import { TheoryViewer } from '../../components/Theory';
import TheoryAIChat from '../../components/TheoryAIChat';
import TopicCard from './TopicCard';
import StudentPageLoading, { ArticleBodySkeleton } from './StudentPageLoading';
import { fetchTheoryTopics, fetchTheorySections, fetchTheoryByTopicSection } from './api';
import { theoryArticlePath, theoryTopicPath, STUDENT_PATHS } from './studentPaths';
import { MAIN_TOPICS } from '../AdminDashboardPage/constants';

export default function TheoryPage() {
  const { topic: topicParam, section: sectionParam } = useParams();
  const navigate = useNavigate();
  const [topics, setTopics] = useState([]);
  const [sections, setSections] = useState([]);
  const [theoryContent, setTheoryContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [warming, setWarming] = useState(false);
  const [error, setError] = useState(null);

  const topicKey = topicParam || null;
  const sectionKey = sectionParam || null;
  const selectedTopic = topics.find(t => t.topic === topicKey) || (topicKey ? { topic: topicKey, label: topicKey } : null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setWarming(false);
    setError(null);
    setTheoryContent(null);

    const load = async () => {
      try {
        const topicList = await fetchTheoryTopics().catch(() => []);
        if (cancelled) return;
        setTopics(topicList);

        if (!topicKey) {
          setSections([]);
          setLoading(false);
          return;
        }

        const sectionList = await fetchTheorySections(topicKey).catch(() => []);
        if (cancelled) return;
        setSections(sectionList);

        if (!sectionKey) {
          if (sectionList.length === 1) {
            navigate(theoryArticlePath(topicKey, sectionList[0].section), { replace: true });
            return;
          }
          setLoading(false);
          return;
        }

        const data = await fetchTheoryByTopicSection(topicKey, sectionKey);
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
  }, [topicKey, sectionKey, navigate]);

  const handleTopicClick = (topic) => {
    navigate(theoryTopicPath(topic.topic));
  };

  const title = selectedTopic
    ? (MAIN_TOPICS[selectedTopic.topic] || selectedTopic.label || selectedTopic.topic)
    : 'Теоретический материал';
  const loadingVariant = sectionKey ? 'theoryArticle' : topicKey ? 'theorySections' : 'theory';
  const loadingHint = sectionKey
    ? sectionKey
    : topicKey
      ? 'Выберите раздел'
      : 'Материалы по темам';

  if (loading) {
    return <StudentPageLoading variant={loadingVariant} title={title} hint={loadingHint} />;
  }

  return (
    <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
      <div className="bg-white dark:bg-[#09090b] rounded-3xl border border-zinc-200 dark:border-zinc-800/60 shadow-sm p-6 md:p-8">
        <div className="flex items-center gap-4">
          {(topicKey || sectionKey) ? (
            <button
              type="button"
              onClick={() => navigate(sectionKey && sections.length > 1 ? theoryTopicPath(topicKey) : STUDENT_PATHS.theory)}
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
            ) : topicKey && !sectionKey ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Выберите раздел</p>
            ) : (
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Материалы по темам</p>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-white dark:bg-[#09090b] rounded-3xl border border-zinc-200 dark:border-zinc-800/60 shadow-sm py-16 px-6 text-center">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Материал не открылся</p>
          <p className="text-sm text-zinc-500 mt-1">{error}</p>
        </div>
      )}

      {!error && !topicKey && (
        topics.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {topics.map(topic => (
              <TopicCard key={topic.topic} topic={topic} onClick={handleTopicClick} />
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-[#09090b] rounded-3xl border border-zinc-200 dark:border-zinc-800/60 shadow-sm py-16 px-6 flex flex-col items-center text-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 text-zinc-400">
              <Library size={24} strokeWidth={1.5} />
            </div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Теория пока не добавлена</p>
          </div>
        )
      )}

      {!error && topicKey && !sectionKey && sections.length > 1 && (
        <div className="bg-white dark:bg-[#09090b] rounded-3xl border border-zinc-200 dark:border-zinc-800/60 shadow-sm overflow-hidden">
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
            {sections.map((item) => (
              <li key={item.section}>
                <button
                  type="button"
                  onClick={() => navigate(theoryArticlePath(topicKey, item.section))}
                  className="w-full text-left px-6 md:px-8 py-4 text-sm font-medium text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors"
                >
                  {item.section}
                </button>
              </li>
            ))}
          </ul>
        </div>
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

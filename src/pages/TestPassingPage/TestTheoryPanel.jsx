import { useEffect, useState } from 'react';
import { ArrowLeft, Library } from 'lucide-react';
import { TheoryViewer } from '../../components/Theory';
import TheoryAIChat from '../../components/TheoryAIChat';
import TopicCard from '../StudentDashboardPage/TopicCard';
import { ArticleBodySkeleton } from '../StudentDashboardPage/StudentPageLoading';
import { fetchTheoryTopics, fetchTheorySections, fetchTheoryByTopicSection } from '../StudentDashboardPage/api';
import { MAIN_TOPICS } from '../AdminDashboardPage/constants';

function Well({ children, as: Tag = 'div', onClick, title }) {
  return (
    <Tag
      type={Tag === 'button' ? 'button' : undefined}
      onClick={onClick}
      title={title}
      className="flex items-center justify-center w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm shrink-0 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-white disabled:opacity-40"
    >
      {children}
    </Tag>
  );
}

export default function TestTheoryPanel() {
  const [topics, setTopics] = useState([]);
  const [sections, setSections] = useState([]);
  const [theoryContent, setTheoryContent] = useState(null);
  const [topicKey, setTopicKey] = useState(null);
  const [sectionKey, setSectionKey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [warming, setWarming] = useState(false);
  const [error, setError] = useState(null);

  const selectedTopic = topics.find((t) => t.topic === topicKey) || (topicKey ? { topic: topicKey, label: topicKey } : null);
  const title = selectedTopic
    ? (MAIN_TOPICS[selectedTopic.topic] || selectedTopic.label || selectedTopic.topic)
    : 'Теория';

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setWarming(false);
    setError(null);
    setTheoryContent(null);

    const load = async () => {
      try {
        if (!topicKey) {
          const topicList = await fetchTheoryTopics().catch(() => []);
          if (cancelled) return;
          setTopics(topicList);
          setSections([]);
          setLoading(false);
          return;
        }

        const sectionList = await fetchTheorySections(topicKey).catch(() => []);
        if (cancelled) return;
        setSections(sectionList);

        if (!sectionKey) {
          if (sectionList.length === 1) {
            setSectionKey(sectionList[0].section);
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
        await new Promise((resolve) => setTimeout(resolve, 800));
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
  }, [topicKey, sectionKey]);

  const handleBack = () => {
    if (sectionKey && sections.length > 1) {
      setSectionKey(null);
      setTheoryContent(null);
      return;
    }
    setTopicKey(null);
    setSectionKey(null);
    setSections([]);
    setTheoryContent(null);
  };

  const hint = sectionKey
    ? sectionKey
    : topicKey
      ? 'Выберите раздел'
      : 'Материалы по темам. Тест на паузе не стоит — таймер идёт.';

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white dark:bg-[#09090b] rounded-3xl border border-zinc-200 dark:border-zinc-800/60 shadow-sm p-6 md:p-8">
        <div className="flex items-center gap-4">
          {topicKey || sectionKey ? (
            <Well as="button" onClick={handleBack} title="Назад">
              <ArrowLeft size={18} strokeWidth={2} />
            </Well>
          ) : (
            <Well>
              <Library size={18} strokeWidth={2} />
            </Well>
          )}
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">{title}</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">{hint}</p>
          </div>
        </div>
      </div>

      {loading && (
        <div className="bg-white dark:bg-[#09090b] rounded-3xl border border-zinc-200 dark:border-zinc-800/60 shadow-sm p-6 md:p-8">
          {sectionKey ? <ArticleBodySkeleton /> : (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-[3px] border-zinc-200 dark:border-zinc-800 border-t-zinc-900 dark:border-t-zinc-100 rounded-full animate-spin" />
            </div>
          )}
        </div>
      )}

      {!loading && error && (
        <div className="bg-white dark:bg-[#09090b] rounded-3xl border border-zinc-200 dark:border-zinc-800/60 shadow-sm py-16 px-6 text-center">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Материал не открылся</p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{error}</p>
        </div>
      )}

      {!loading && !error && !topicKey && (
        topics.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {topics.map((topic, index) => (
              <TopicCard key={topic.topic} topic={topic} onClick={(item) => setTopicKey(item.topic)} index={index} />
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-[#09090b] rounded-3xl border border-zinc-200 dark:border-zinc-800/60 shadow-sm py-16 px-6 flex flex-col items-center text-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 text-zinc-400">
              <Library size={24} strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Теория пока не добавлена</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Вернитесь к тесту кнопкой слева.</p>
            </div>
          </div>
        )
      )}

      {!loading && !error && topicKey && !sectionKey && sections.length > 1 && (
        <div className="bg-white dark:bg-[#09090b] rounded-3xl border border-zinc-200 dark:border-zinc-800/60 shadow-sm overflow-hidden">
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
            {sections.map((item) => (
              <li key={item.section}>
                <button
                  type="button"
                  onClick={() => setSectionKey(item.section)}
                  className="w-full text-left px-6 md:px-8 py-4 text-sm font-medium text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors focus:outline-none focus-visible:bg-zinc-50 dark:focus-visible:bg-zinc-900/40"
                >
                  {item.section}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!loading && !error && sectionKey && theoryContent && (
        <div className="student-theory relative bg-white dark:bg-[#09090b] rounded-3xl border border-zinc-200 dark:border-zinc-800/60 shadow-sm overflow-hidden">
          {warming && (
            <div className="absolute inset-0 z-10 bg-white dark:bg-[#09090b] px-4 md:px-8 py-6 md:py-8">
              <ArticleBodySkeleton />
            </div>
          )}
          <div className="px-4 md:px-8 py-6 md:py-8" aria-hidden={warming} inert={warming || undefined}>
            <TheoryViewer content={theoryContent.content || ''} embedded isFullWidth />
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
    </div>
  );
}

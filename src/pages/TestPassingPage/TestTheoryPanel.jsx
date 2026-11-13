import { useState } from 'react';
import TheoryAIChat from '../../components/TheoryAIChat';
import TopicCard from '../StudentDashboardPage/TopicCard';
import { ArticleBodySkeleton } from '../StudentDashboardPage/StudentPageLoading';
import TheoryBrowser from '../../features/theory/TheoryBrowser';
import { useTheoryCatalog } from '../../features/theory/useTheoryCatalog';
import { topicLabel } from '../../features/theory/topics';
import { Sheet } from '../../shared/ui/Sheet';

export default function TestTheoryPanel() {
  const [group, setGroup] = useState('topics');
  const [theoryClass, setTheoryClass] = useState(null);
  const [topicKey, setTopicKey] = useState(null);
  const [sectionKey, setSectionKey] = useState(null);
  const [sectionClass, setSectionClass] = useState(null);

  const { topics, sections, content, loading, warming, error } = useTheoryCatalog({
    group,
    theoryClass,
    topicKey,
    sectionKey,
    sectionClass,
    warmMs: 800,
    onOpenOnlySection: (row) => {
      setSectionKey(row.section);
      setSectionClass(row.theoryClass);
    },
  });

  const selectedTopic = topics.find((item) => item.topic === topicKey) || (topicKey ? { topic: topicKey, label: topicKey } : null);
  const title = selectedTopic ? topicLabel(selectedTopic) : 'Теория';
  const catalogHint = group === 'class'
    ? (theoryClass != null ? `${theoryClass} класс` : 'Выберите класс')
    : 'Материалы по темам. Тест на паузе не стоит — таймер идёт.';
  const hint = sectionKey ? sectionKey : topicKey ? 'Выберите раздел' : catalogHint;
  const showBack = Boolean(topicKey || sectionKey || (group === 'class' && theoryClass != null));

  const handleBack = () => {
    if (sectionKey && sections.length > 1) {
      setSectionKey(null);
      setSectionClass(null);
      return;
    }
    if (topicKey) {
      setTopicKey(null);
      setSectionKey(null);
      setSectionClass(null);
      return;
    }
    setTheoryClass(null);
  };

  return (
    <div className="animate-in fade-in duration-500">
      <TheoryBrowser
        title={title}
        hint={hint}
        onBack={showBack ? handleBack : undefined}
        group={group}
        onGroup={(next) => {
          setGroup(next);
          setTheoryClass(null);
          setTopicKey(null);
          setSectionKey(null);
          setSectionClass(null);
        }}
        topicKey={topicKey}
        sectionKey={sectionKey}
        topics={topics}
        sections={sections}
        showClasses={!loading && group === 'class' && theoryClass == null && !topicKey}
        onClass={setTheoryClass}
        renderTopic={(topic, index) => (
          <TopicCard
            key={`${topic.topic}-${topic.theoryClass || 'all'}`}
            topic={topic}
            index={index}
            onClick={(item) => {
              setTopicKey(item.topic);
              setSectionKey(null);
              setSectionClass(null);
            }}
          />
        )}
        onSection={(item) => {
          setSectionKey(item.section);
          setSectionClass(item.theoryClass);
        }}
        showSectionClass={group === 'topics' && new Set(sections.map((row) => row.theoryClass)).size > 1}
        error={error}
        loading={loading}
        loadingFallback={(
          <Sheet className="p-6 md:p-8">
            {sectionKey ? <ArticleBodySkeleton /> : (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-[3px] border-zinc-200 dark:border-zinc-800 border-t-zinc-900 dark:border-t-zinc-100 rounded-full animate-spin" />
              </div>
            )}
          </Sheet>
        )}
        warming={warming}
        content={content}
        viewerFullWidth
        skeleton={<ArticleBodySkeleton />}
        emptyHint="Вернитесь к тесту кнопкой слева."
        articleExtra={(
          <TheoryAIChat
            theoryContent={content?.content}
            topic={selectedTopic ? topicLabel(selectedTopic) : undefined}
            section={sectionKey}
            theoryId={content?.id}
          />
        )}
      />
    </div>
  );
}

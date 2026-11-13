import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import TheoryAIChat from '../../components/TheoryAIChat';
import TopicCard from './TopicCard';
import StudentPageLoading, { ArticleBodySkeleton } from './StudentPageLoading';
import { theoryArticlePath, theoryTopicPath, STUDENT_PATHS } from './studentPaths';
import { PageShell } from '../../shared/ui/Sheet';
import TheoryBrowser from '../../features/theory/TheoryBrowser';
import { useTheoryCatalog } from '../../features/theory/useTheoryCatalog';
import { topicLabel } from '../../features/theory/topics';

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

  const topicKey = topicParam || null;
  const sectionKey = sectionParam || null;
  const group = searchParams.get('group') === 'class' ? 'class' : 'topics';
  const classParam = searchParams.get('class');
  const theoryClass = classParam != null && classParam !== '' ? Number(classParam) : null;

  const { topics, sections, content, loading, warming, error } = useTheoryCatalog({
    group,
    theoryClass,
    topicKey,
    sectionKey,
    warmMs: 1500,
    onOpenOnlySection: (row) => {
      navigate(theoryArticlePath(topicKey, row.section, linkOpts(group, row.theoryClass)), { replace: true });
    },
  });

  const selectedTopic = topics.find((item) => item.topic === topicKey) || (topicKey ? { topic: topicKey, label: topicKey } : null);
  const title = selectedTopic ? topicLabel(selectedTopic) : 'Теоретический материал';
  const loadingVariant = sectionKey ? 'theoryArticle' : topicKey ? 'theorySections' : 'theory';
  const catalogHint = group === 'class'
    ? (theoryClass != null ? `${theoryClass} класс` : 'Выберите класс')
    : 'Материалы по темам';
  const hint = sectionKey ? sectionKey : topicKey ? 'Выберите раздел' : catalogHint;

  const theoryRootSearch = (nextGroup, nextClass) => {
    const nextParams = new URLSearchParams();
    if (nextGroup === 'class') nextParams.set('group', 'class');
    if (nextGroup === 'class' && nextClass != null) nextParams.set('class', String(nextClass));
    const qs = nextParams.toString();
    return { pathname: STUDENT_PATHS.theory, search: qs ? `?${qs}` : '' };
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

  const showBack = Boolean(topicKey || sectionKey || (group === 'class' && theoryClass != null));

  if (loading) {
    return <StudentPageLoading variant={loadingVariant} title={title} hint={hint} />;
  }

  return (
    <PageShell className="space-y-6">
      <TheoryBrowser
        title={title}
        hint={hint}
        onBack={showBack ? handleBack : undefined}
        group={group}
        onGroup={(next) => navigate(theoryRootSearch(next, null))}
        topicKey={topicKey}
        sectionKey={sectionKey}
        topics={topics}
        sections={sections}
        showClasses={group === 'class' && theoryClass == null && !topicKey}
        onClass={(cls) => navigate(theoryRootSearch('class', cls))}
        renderTopic={(topic, index) => (
          <TopicCard
            key={`${topic.topic}-${topic.theoryClass || 'all'}`}
            topic={topic}
            index={index}
            onClick={(item) => navigate(theoryTopicPath(item.topic, linkOpts(group, item.theoryClass ?? (group === 'class' ? theoryClass : null))))}
          />
        )}
        onSection={(item) => navigate(theoryArticlePath(topicKey, item.section, linkOpts(group, item.theoryClass)))}
        showSectionClass={group === 'topics' && new Set(sections.map((row) => row.theoryClass)).size > 1}
        error={error}
        warming={warming}
        content={content}
        skeleton={<ArticleBodySkeleton />}
        articleExtra={(
          <TheoryAIChat
            theoryContent={content?.content}
            topic={selectedTopic ? topicLabel(selectedTopic) : undefined}
            section={sectionKey}
            theoryId={content?.id}
          />
        )}
      />
    </PageShell>
  );
}

import { Library } from 'lucide-react';
import { TheoryViewer } from '../../shared/ui/TheoryViewer';
import EmptyState from '../../shared/ui/EmptyState';
import { PageHeading } from '../../shared/ui/HeadingBlock';
import { Sheet } from '../../shared/ui/Sheet';
import { THEORY_CLASSES } from '../../shared/lib/theoryMeta';
import TheoryGroupToggle from './TheoryGroupToggle';

export default function TheoryBrowser({
  title,
  hint,
  onBack,
  group,
  onGroup,
  topicKey,
  sectionKey,
  topics,
  sections,
  showClasses = false,
  onClass,
  renderTopic,
  onSection,
  error,
  loading = false,
  loadingFallback = null,
  warming = false,
  content,
  articleExtra = null,
  viewerFullWidth = false,
  onCopyBlock = null,
  skeleton = null,
  emptyTitle = 'Теория пока не добавлена',
  emptyHint = null,
  showSectionClass = false,
  missingSectionsTitle = 'В этой теме пока нет разделов',
}) {
  return (
    <div className="space-y-6">
      <PageHeading
        icon={<Library size={18} strokeWidth={2} />}
        title={title}
        hint={hint}
        onBack={onBack}
        extra={!topicKey && onGroup ? <TheoryGroupToggle value={group} onChange={onGroup} /> : null}
      />

      {loading ? loadingFallback : null}

      {!loading && error ? <EmptyState title="Материал не открылся" hint={error} /> : null}

      {!loading && !error && showClasses ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {THEORY_CLASSES.map((cls) => (
            <button
              key={cls}
              type="button"
              onClick={() => onClass(cls)}
              className="min-h-16 rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm font-semibold text-zinc-900 hover:border-zinc-300 dark:border-zinc-800/60 dark:bg-[#09090b] dark:text-zinc-100 dark:hover:border-zinc-700"
            >
              {cls} класс
            </button>
          ))}
        </div>
      ) : null}

      {!loading && !error && !showClasses && !topicKey && topics.length > 0 ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 items-stretch">
          {topics.map((topic, index) => (
            <div key={`${topic.topic}-${topic.theoryClass || 'all'}`} className="contents">
              {renderTopic(topic, index)}
            </div>
          ))}
        </div>
      ) : null}

      {!loading && !error && !showClasses && !topicKey && topics.length === 0 ? (
        <EmptyState icon={<Library size={24} strokeWidth={1.5} />} title={emptyTitle} hint={emptyHint} />
      ) : null}

      {!loading && !error && topicKey && !sectionKey && sections.length > 1 ? (
        <Sheet className="overflow-hidden">
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
            {sections.map((item) => (
              <li key={`${item.theoryClass}-${item.section}`}>
                <button
                  type="button"
                  onClick={() => onSection(item)}
                  className="w-full text-left px-6 md:px-8 py-4 text-sm font-medium text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors focus:outline-none focus-visible:bg-zinc-50 dark:focus-visible:bg-zinc-900/40"
                >
                  {item.section}
                  {showSectionClass ? (
                    <span className="mt-0.5 block text-xs font-normal text-zinc-400">{item.theoryClass} класс</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </Sheet>
      ) : null}

      {!loading && !error && topicKey && !sectionKey && sections.length === 0 ? (
        <EmptyState icon={<Library size={24} strokeWidth={1.5} />} title={missingSectionsTitle} />
      ) : null}

      {!loading && !error && sectionKey && content ? (
        <div className="student-theory relative rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800/60 dark:bg-[#09090b]">
          {warming && skeleton ? (
            <div className="absolute inset-0 z-10 rounded-xl bg-white px-4 py-6 dark:bg-[#09090b] md:px-8 md:py-8">
              {skeleton}
            </div>
          ) : null}
          <div className="min-w-0 px-4 py-6 pb-24 md:px-8 md:py-8" aria-hidden={warming || undefined} inert={warming || undefined}>
            <TheoryViewer
              content={content.content || ''}
              embedded
              isFullWidth={viewerFullWidth}
              onCopyBlock={onCopyBlock}
              aside={warming ? null : articleExtra}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

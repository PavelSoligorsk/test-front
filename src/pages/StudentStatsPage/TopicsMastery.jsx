import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Histogram } from './charts';
import { MAIN_TOPICS } from '../AdminDashboardPage/constants';

const DIFFICULTY_LABELS = { 1: 'Уровень 1', 2: 'Уровень 2', 3: 'Уровень 3', 4: 'Уровень 4', 5: 'Уровень 5' };

function topicLabel(key) {
  return MAIN_TOPICS[key] || key;
}

function presentDifficulties(list) {
  return [...(list || [])]
    .filter((item) => (item.total_tasks || 0) > 0)
    .sort((a, b) => (a.difficulty || 0) - (b.difficulty || 0));
}

function fillDifficultyLevels(list) {
  return [1, 2, 3, 4, 5].map((level) => {
    const found = (list || []).find((d) => d.difficulty === level);
    return found || { difficulty: level, total_tasks: 0, correct_tasks: 0, mastery_percent: 0 };
  });
}

function difficultyChartItems(list) {
  return fillDifficultyLevels(list).map((item) => ({
    id: item.difficulty,
    label: DIFFICULTY_LABELS[item.difficulty],
    axis: `${item.difficulty} ур.`,
    value: item.mastery_percent || 0,
    meta: item.total_tasks > 0 ? `${item.correct_tasks}/${item.total_tasks}` : 'нет задач',
    empty: item.total_tasks === 0,
  }));
}

export default function TopicsMastery({ topics }) {
  const [expandedTopics, setExpandedTopics] = useState({});
  const [expandedSections, setExpandedSections] = useState({});
  const toggleTopic = (index) => setExpandedTopics((prev) => ({ ...prev, [index]: !prev[index] }));
  const toggleSection = (topicIndex, sectionIndex) => {
    const key = `${topicIndex}-${sectionIndex}`;
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };
  return (
                <section className="bg-white dark:bg-[#09090b] rounded-xl border border-zinc-200 dark:border-zinc-800/60 shadow-sm overflow-hidden">
                  <div className="p-6 md:p-8 pb-4">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">Темы</h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Тема → раздел → уровень, слабые сверху
                    </p>
                  </div>
                  <ScaleRuler />
                  <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                    {topics.map((topic, index) => {
                      const sections = [...(topic.sections || [])].sort(
                        (a, b) => (a.mastery_percent || 0) - (b.mastery_percent || 0)
                      );
                      const topicDiffs = presentDifficulties(topic.difficulties);
                      const hasChildren = sections.length > 0 || topicDiffs.length > 0;
                      const open = !!expandedTopics[index];
                      return (
                        <li key={`${topic.topic}-${index}`}>
                          <div
                            role={hasChildren ? 'button' : undefined}
                            tabIndex={hasChildren ? 0 : undefined}
                            aria-expanded={hasChildren ? open : undefined}
                            onClick={() => hasChildren && toggleTopic(index)}
                            onKeyDown={(e) => {
                              if (hasChildren && (e.key === 'Enter' || e.key === ' ')) {
                                e.preventDefault();
                                toggleTopic(index);
                              }
                            }}
                            className={`px-6 md:px-8 py-4 ${
                              hasChildren
                                ? 'cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900/40 focus:outline-none focus-visible:bg-zinc-50 dark:focus-visible:bg-zinc-900/40'
                                : ''
                            }`}
                          >
                            <MasteryRow
                              label={topicLabel(topic.topic)}
                              meta={`${topic.correct_tasks} из ${topic.total_tasks}`}
                              percent={topic.mastery_percent}
                              trailing={
                                hasChildren ? (
                                  open ? (
                                    <ChevronDown size={16} className="text-zinc-400 shrink-0" />
                                  ) : (
                                    <ChevronRight size={16} className="text-zinc-400 shrink-0" />
                                  )
                                ) : null
                              }
                            />
                          </div>
                          {open && hasChildren && (
                            <div className="pb-3">
                              {sections.length === 0 && topicDiffs.length > 0 && (
                                <DifficultyChart items={topicDiffs} indent="topic" label={topicLabel(topic.topic)} />
                              )}
                              {sections.map((section, j) => {
                                const sectionKey = `${index}-${j}`;
                                const sectionDiffs = presentDifficulties(section.difficulties);
                                const canOpenSection = sectionDiffs.length > 0;
                                const sectionOpen = !!expandedSections[sectionKey];
                                return (
                                  <div key={`${section.section}-${j}`}>
                                    <div
                                      role={canOpenSection ? 'button' : undefined}
                                      tabIndex={canOpenSection ? 0 : undefined}
                                      aria-expanded={canOpenSection ? sectionOpen : undefined}
                                      onClick={(e) => {
                                        if (!canOpenSection) return;
                                        e.stopPropagation();
                                        toggleSection(index, j);
                                      }}
                                      onKeyDown={(e) => {
                                        if (canOpenSection && (e.key === 'Enter' || e.key === ' ')) {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          toggleSection(index, j);
                                        }
                                      }}
                                      className={`px-6 md:px-8 pl-10 md:pl-14 py-2.5 ${
                                        canOpenSection
                                          ? 'cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900/40 focus:outline-none focus-visible:bg-zinc-50 dark:focus-visible:bg-zinc-900/40'
                                          : ''
                                      }`}
                                    >
                                      <MasteryRow
                                        compact
                                        label={section.section}
                                        meta={`${section.correct_tasks}/${section.total_tasks}`}
                                        percent={section.mastery_percent}
                                        trailing={
                                          canOpenSection ? (
                                            sectionOpen ? (
                                              <ChevronDown size={14} className="text-zinc-400 shrink-0" />
                                            ) : (
                                              <ChevronRight size={14} className="text-zinc-400 shrink-0" />
                                            )
                                          ) : null
                                        }
                                      />
                                    </div>
                                    {sectionOpen && canOpenSection && (
                                      <DifficultyChart items={sectionDiffs} indent="section" label={section.section} />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>
  );
}

function ScaleRuler() {
  return (
    <div className="px-6 md:px-8 pb-3 flex justify-between text-[11px] tabular-nums text-zinc-400 dark:text-zinc-500">
      <span>0%</span>
      <span>50</span>
      <span>100</span>
    </div>
  );
}

function DifficultyChart({ items, indent, label }) {
  const pad = indent === 'section'
    ? 'px-6 md:px-8 pl-14 md:pl-20'
    : 'px-6 md:px-8 pl-10 md:pl-14';
  return (
    <div className={`${pad} pb-4 pt-1`} onClick={(e) => e.stopPropagation()}>
      <Histogram
        compact
        items={difficultyChartItems(items)}
        ariaLabel={`Сложность: ${label}`}
      />
    </div>
  );
}

function MasteryRow({ label, meta, percent, empty, compact, trailing }) {
  const p = empty ? 0 : Math.min(100, Math.max(0, Number(percent) || 0));
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 min-w-0">
        <p className={`min-w-0 flex-1 truncate ${compact ? 'text-sm text-zinc-600 dark:text-zinc-400' : 'text-sm font-medium text-zinc-900 dark:text-zinc-200'}`}>
          {label}
        </p>
        <span className={`shrink-0 tabular-nums ${compact ? 'text-xs text-zinc-400' : 'text-xs text-zinc-500'}`}>
          {meta}
        </span>
        <span className={`w-12 text-right shrink-0 tabular-nums ${
          empty
            ? 'text-sm text-zinc-300 dark:text-zinc-600'
            : compact
              ? 'text-xs font-medium text-zinc-600 dark:text-zinc-300'
              : 'text-sm font-semibold text-zinc-900 dark:text-zinc-100'
        }`}>
          {empty ? '—' : `${Math.round(p)}%`}
        </span>
        {trailing}
      </div>
      <div className="h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
        <div
          className="h-full rounded-full bg-zinc-900 dark:bg-zinc-100"
          style={{ width: `${p}%` }}
        />
      </div>
    </div>
  );
}

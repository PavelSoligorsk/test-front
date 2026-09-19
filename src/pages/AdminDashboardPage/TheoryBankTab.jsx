import React, { useEffect, useMemo, useState } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import { BookOpen, PlusCircle, Edit3, Trash2, Inbox, GripVertical, ArrowLeft } from 'lucide-react';
import { TheoryViewer } from '../../components/Theory';
import { MAIN_TOPICS, THEORY_CLASSES } from './constants';
import { fetchTheory, updateTheory } from './api';
import { sectionRowKey, sectionsInClass, topicsInClass } from '../../shared/lib/theoryMeta';
import { Sheet, IconWell, primaryBtnClass, secondaryBtnClass, formatApiDetail } from '../../shared/ui';

function TopicRow({ topicKey, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-xl p-3 text-left text-sm font-medium transition-colors ${
        selected
          ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950'
          : 'border border-zinc-200 bg-white text-zinc-600 dark:border-zinc-800 dark:bg-[#09090b] dark:text-zinc-400'
      }`}
    >
      {MAIN_TOPICS[topicKey] || topicKey}
    </button>
  );
}

function SectionCard({ row, dragControls, onOpen }) {
  return (
    <div className="flex items-stretch gap-2">
      <button
        type="button"
        aria-label="Перетащить раздел"
        className="flex shrink-0 cursor-grab items-center rounded-2xl border border-zinc-200 px-2 text-zinc-400 active:cursor-grabbing touch-none dark:border-zinc-800"
        onPointerDown={(event) => dragControls.start(event)}
      >
        <GripVertical size={16} />
      </button>
      <button
        type="button"
        onClick={onOpen}
        className="w-full text-left p-5 md:p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-[#09090b] hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
      >
        <div className="flex justify-between items-start gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">{row.section}</h3>
            <p className="mt-1 text-sm text-zinc-400">{MAIN_TOPICS[row.topic] || row.topic}</p>
          </div>
          {row.id != null && (
            <span className="text-xs font-medium text-zinc-500 bg-zinc-100 dark:bg-zinc-900 px-2 py-1 rounded-lg tabular-nums">
              ID: {row.id}
            </span>
          )}
        </div>
      </button>
    </div>
  );
}

function DraggableSection({ row, onOpen, onDragEnd }) {
  const dragControls = useDragControls();
  return (
    <Reorder.Item
      value={sectionRowKey(row)}
      dragListener={false}
      dragControls={dragControls}
      onDragEnd={onDragEnd}
      className="list-none"
    >
      <SectionCard row={row} dragControls={dragControls} onOpen={onOpen} />
    </Reorder.Item>
  );
}

export default function TheoryBankTab({
  theoryMeta = {},
  selectedTheoryClass,
  setSelectedTheoryClass,
  selectedTopic,
  setSelectedTopic,
  selectedSection,
  setSelectedSection,
  onEditTheory,
  onDeleteTheory,
  onAddNew,
  onMetaRefresh,
}) {
  const [article, setArticle] = useState(null);
  const [loadingArticle, setLoadingArticle] = useState(false);
  const [articleError, setArticleError] = useState(null);
  const [savingOrder, setSavingOrder] = useState(false);

  const classTopics = useMemo(
    () => topicsInClass(theoryMeta, selectedTheoryClass),
    [theoryMeta, selectedTheoryClass],
  );
  const classSections = useMemo(
    () => sectionsInClass(theoryMeta, selectedTheoryClass),
    [theoryMeta, selectedTheoryClass],
  );
  const visibleSections = useMemo(
    () => (selectedTopic ? classSections.filter((row) => row.topic === selectedTopic) : classSections),
    [classSections, selectedTopic],
  );
  const sectionSignature = visibleSections.map((row) => `${sectionRowKey(row)}:${row.priority}`).join('|');
  const [sectionOrder, setSectionOrder] = useState(visibleSections.map(sectionRowKey));
  const sectionOrderRef = React.useRef(sectionOrder);
  sectionOrderRef.current = sectionOrder;

  useEffect(() => {
    setSectionOrder(visibleSections.map(sectionRowKey));
  }, [sectionSignature]);

  const sectionsByKey = useMemo(() => {
    const map = new Map();
    visibleSections.forEach((row) => map.set(sectionRowKey(row), row));
    return map;
  }, [visibleSections]);

  const selectedTopicData = classTopics.find((item) => item.topic === selectedTopic);
  const theoryId = classSections.find((row) => row.topic === selectedTopic && row.section === selectedSection)?.id
    ?? selectedTopicData?.sections?.[selectedSection];

  useEffect(() => {
    if (!theoryId) {
      setArticle(null);
      setArticleError(null);
      setLoadingArticle(false);
      return undefined;
    }

    let cancelled = false;
    setLoadingArticle(true);
    setArticleError(null);
    fetchTheory(theoryId)
      .then((data) => {
        if (!cancelled) setArticle(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setArticle(null);
          setArticleError(formatApiDetail(err?.response?.data?.detail, 'Не удалось загрузить теорию'));
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingArticle(false);
      });

    return () => {
      cancelled = true;
    };
  }, [theoryId]);

  const persistOrder = async (nextVisibleKeys) => {
    const current = visibleSections.map(sectionRowKey);
    if (current.join('\0') === nextVisibleKeys.join('\0')) return;

    const visibleIds = new Set(visibleSections.map((row) => row.id).filter((id) => id != null));
    const nextVisibleIds = nextVisibleKeys
      .map((key) => sectionsByKey.get(key)?.id)
      .filter((id) => id != null);
    if (nextVisibleIds.length !== visibleIds.size) return;

    const queue = [...nextVisibleIds];
    const merged = classSections.map((row) => {
      if (row.id != null && visibleIds.has(row.id)) return queue.shift();
      return row.id;
    }).filter((id) => id != null);

    setSavingOrder(true);
    try {
      await Promise.all(merged.map((id, priority) => updateTheory(id, { priority })));
      await onMetaRefresh?.();
    } catch (err) {
      setSectionOrder(visibleSections.map(sectionRowKey));
      console.error(err);
    } finally {
      setSavingOrder(false);
    }
  };

  const changeClass = (nextClass) => {
    setSelectedTheoryClass(Number(nextClass));
    setSelectedTopic(null);
    setSelectedSection(null);
  };

  const openSection = (row) => {
    setSelectedTopic(row.topic);
    setSelectedSection(row.section);
  };

  return (
    <Sheet className="overflow-hidden min-h-[600px] flex flex-col md:flex-row animate-in fade-in slide-in-from-bottom-4 duration-500">
      <aside className="w-full md:w-80 bg-zinc-50 dark:bg-zinc-900/40 border-b md:border-b-0 md:border-r border-zinc-100 dark:border-zinc-800/60 p-4 md:p-6 flex flex-col gap-6">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Класс</span>
          <select
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-[#09090b] dark:text-zinc-100"
            value={selectedTheoryClass}
            onChange={(event) => changeClass(event.target.value)}
          >
            {THEORY_CLASSES.map((cls) => (
              <option key={cls} value={cls}>{cls} класс</option>
            ))}
          </select>
        </label>
        <div>
          <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-3">Темы</h3>
          {classTopics.length > 0 ? (
            <div className="flex flex-col gap-2">
              {classTopics.map((item) => (
                <TopicRow
                  key={item.topic}
                  topicKey={item.topic}
                  selected={selectedTopic === item.topic}
                  onSelect={() => {
                    setSelectedTopic(selectedTopic === item.topic ? null : item.topic);
                    setSelectedSection(null);
                  }}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-400">В этом классе пока нет тем</p>
          )}
        </div>
      </aside>
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        {!selectedSection ? (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <div className="flex items-center gap-4">
                <IconWell><BookOpen size={18} strokeWidth={2} /></IconWell>
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                    {selectedTopic ? (MAIN_TOPICS[selectedTopic] || selectedTopic) : `${selectedTheoryClass} класс`}
                  </h2>
                  <p className="text-sm text-zinc-400 mt-0.5">Перетащите разделы за ручку — так задаётся порядок в программе</p>
                </div>
              </div>
              <button type="button" onClick={onAddNew} className={primaryBtnClass}>
                <PlusCircle size={16} /> Добавить теорию
              </button>
            </div>
            {visibleSections.length > 0 ? (
              <Reorder.Group
                axis="y"
                values={sectionOrder}
                onReorder={setSectionOrder}
                className="flex flex-col gap-3"
              >
                {sectionOrder.map((key) => {
                  const row = sectionsByKey.get(key);
                  if (!row) return null;
                  return (
                    <DraggableSection
                      key={key}
                      row={row}
                      onOpen={() => openSection(row)}
                      onDragEnd={() => persistOrder(sectionOrderRef.current)}
                    />
                  );
                })}
              </Reorder.Group>
            ) : (
              <div className="flex flex-col items-center gap-3 py-16 text-zinc-400">
                <div className="w-12 h-12 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-center">
                  <Inbox size={20} />
                </div>
                <p className="text-sm font-medium text-zinc-500">Нет материалов</p>
              </div>
            )}
            {savingOrder && (
              <p className="text-sm text-zinc-400">Сохраняю порядок…</p>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-2">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setSelectedSection(null)}
                  className="flex items-center justify-center w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                  title="К разделам"
                >
                  <ArrowLeft size={18} strokeWidth={2} />
                </button>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">{selectedSection}</h2>
              </div>
              {article && (
                <div className="flex gap-2">
                  <button type="button" onClick={() => onEditTheory(article)} className={secondaryBtnClass}>
                    <Edit3 size={16} />
                  </button>
                  <button type="button" onClick={() => onDeleteTheory(article.id)}
                    className="p-2.5 rounded-xl text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
            {loadingArticle && (
              <p className="text-sm text-zinc-400">Загрузка материала…</p>
            )}
            {articleError && (
              <p className="text-sm text-red-600 dark:text-red-400">{articleError}</p>
            )}
            {!loadingArticle && !articleError && article && (
              <div className="p-6 md:p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900/30">
                <div className="flex justify-between items-start mb-6">
                  <span className="text-xs font-medium text-zinc-500 bg-zinc-100 dark:bg-zinc-900 px-3 py-1.5 rounded-xl tabular-nums">
                    ID {article.id} · {article.theory_class} класс
                  </span>
                </div>
                <div className="[&_.max-w-3xl]:max-w-full [&_.max-w-3xl]:w-full [&_.mx-auto]:ml-0 [&_.mx-auto]:mr-0">
                  <TheoryViewer content={article.content} />
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </Sheet>
  );
}

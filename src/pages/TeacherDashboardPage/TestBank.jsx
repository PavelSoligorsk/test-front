import apiClient from '../../shared/api';
import { useState, useEffect, useMemo } from 'react';
import { ChevronRight, GraduationCap } from 'lucide-react';
import { NavTile, SearchField } from '../../shared/ui';
import PickerTaskCard from '../../features/tasks/PickerTaskCard';
import { fetchTeacherTasksByClass } from '../../features/tasks/api';

const EXAM_KEYWORDS = ['ЦТ', 'ЦЭ', 'РЦЭ', 'ДРТ', 'РТ'];

const hasExamKeyword = (text) => {
  if (!text) return false;
  return EXAM_KEYWORDS.some((kw) => text.includes(kw));
};

export default function TestBank({ onTaskToggle, selectedTasks, openSolutions, openHints, onToggleSolution, onToggleHint }) {
  const [meta, setMeta] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [classSearch, setClassSearch] = useState('');
  const [topicSearch, setTopicSearch] = useState('');
  const [taskSearch, setTaskSearch] = useState('');
  const [examFilter, setExamFilter] = useState(false);
  const [examCache, setExamCache] = useState({});  // { "class::topic": true/false }
  const [loadingExamCache, setLoadingExamCache] = useState(false);

  useEffect(() => {
    apiClient.get(`/teacher/tasks-meta`)
      .then(res => setMeta(res.data))
      .catch(console.error);
  }, []);

  // При включении фильтра загружаем задания для всех class/topic, чтобы знать где есть ЦТ/ЦЭ/РТ
  useEffect(() => {
    if (!examFilter || !meta) return;
    let cancelled = false;
    const fetchExamData = async () => {
      setLoadingExamCache(true);
      const cache = {};
      const entries = [];
      for (const cls of Object.keys(meta)) {
        const classMeta = meta[cls];
        for (const topic of Object.keys(classMeta)) {
          entries.push({ cls, topic });
        }
      }
      // Загружаем пачками по 5
      const BATCH = 5;
      for (let i = 0; i < entries.length; i += BATCH) {
        if (cancelled) break;
        const batch = entries.slice(i, i + BATCH);
        const results = await Promise.allSettled(
          batch.map(({ cls, topic }) =>
            fetchTeacherTasksByClass(cls, topic).then((data) => ({ data }))
          )
        );
        results.forEach((r, idx) => {
          const { cls, topic } = batch[idx];
          const key = `${cls}::${topic}`;
          cache[key] = r.status === 'fulfilled'
            ? r.value.data.some(t => hasExamKeyword(t.content))
            : false;
        });
      }
      if (!cancelled) {
        setExamCache(cache);
        setLoadingExamCache(false);
      }
    };
    fetchExamData();
    return () => { cancelled = true; };
  }, [examFilter, meta]);

  const classes = useMemo(() => {
    if (!meta) return [];
    return Object.keys(meta).sort((a, b) => {
      const aN = parseInt(a), bN = parseInt(b);
      if (!isNaN(aN) && !isNaN(bN)) return aN - bN;
      return a.localeCompare(b);
    });
  }, [meta]);

  const filteredClasses = useMemo(() => {
    let result = classes.filter(cls =>
      cls.toLowerCase().includes(classSearch.toLowerCase())
    );
    if (examFilter) {
      if (Object.keys(examCache).length === 0) return result;
      result = result.filter(cls => {
        const classMeta = meta?.[cls];
        if (!classMeta) return false;
        return Object.keys(classMeta).some(topic => examCache[`${cls}::${topic}`]);
      });
    }
    return result;
  }, [classes, classSearch, examFilter, examCache, meta]);

  const topics = useMemo(() => {
    if (!meta || !selectedClass) return [];
    const classMeta = meta[selectedClass];
    if (!classMeta) return [];
    return Object.keys(classMeta).sort();
  }, [meta, selectedClass]);

  const filteredTopics = useMemo(() => {
    let result = topics.filter(topic =>
      topic.toLowerCase().includes(topicSearch.toLowerCase())
    );
    if (examFilter && Object.keys(examCache).length > 0) {
      result = result.filter(topic => examCache[`${selectedClass}::${topic}`]);
    }
    return result;
  }, [topics, topicSearch, examFilter, examCache, selectedClass]);

  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (taskSearch) {
      const q = taskSearch.toLowerCase();
      result = result.filter(t =>
        t.content?.toLowerCase().includes(q) ||
        t.answer?.toLowerCase().includes(q) ||
        t.id?.toString().includes(q)
      );
    }
    if (examFilter) {
      result = result.filter(t => hasExamKeyword(t.content));
    }
    return result;
  }, [tasks, taskSearch, examFilter]);

  const handleSelectClass = (cls) => {
    setSelectedClass(cls);
    setSelectedTopic(null);
    setTasks([]);
    setTopicSearch('');
  };

  const handleSelectTopic = async (cls, topic) => {
    setSelectedTopic(topic);
    setTaskSearch('');
    setLoading(true);
    try {
      setTasks(await fetchTeacherTasksByClass(cls, topic));
    } catch (e) {
      console.error(e);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const tasksCountByTopic = (cls, topic) => {
    if (!meta?.[cls]?.[topic]) return 0;
    const sections = meta[cls][topic];
    if (typeof sections === 'object') {
      return Object.values(sections).reduce((sum, count) => sum + count, 0);
    }
    return sections;
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
      <div className="bg-white dark:bg-[#09090b] rounded-3xl p-5 md:p-6 shadow-sm border border-zinc-200 dark:border-zinc-800/60">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-zinc-900 dark:bg-white rounded-xl flex items-center justify-center">
              <GraduationCap size={20} className="text-white dark:text-zinc-950" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-semibold text-zinc-900 dark:text-white tracking-tight">Банк заданий</h2>
              <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 tracking-tight mt-1">
                {selectedClass
                  ? `${selectedClass} раздел${selectedTopic ? ` → ${selectedTopic}` : ' → выберите подраздел'}`
                  : `${classes.length} разделов доступно`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setExamFilter(!examFilter)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${ examFilter ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 shadow-lg" : "bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-500/50" }`}
            >
              {examFilter ? "✓ Экзамен" : "ЦТ/ЦЭ/РТ"}
            </button>
            {(selectedClass || selectedTopic) && (
              <button onClick={() => {
                if (selectedTopic) { setSelectedTopic(null); setTasks([]); setTaskSearch(''); setExamFilter(false); }
                else { setSelectedClass(null); setClassSearch(''); }
              }}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-300 transition-all">
                <ChevronRight size={14} className="rotate-180" />
                {selectedTopic ? 'К подразделам' : 'Ко всем разделам'}
              </button>
            )}
          </div>
        </div>
      </div>

      {!selectedClass && (
        <div className="space-y-4">
          <SearchField value={classSearch} onChange={setClassSearch} placeholder="Поиск раздела..." />
          {examFilter && loadingExamCache ? (
            <div className="text-center py-16 space-y-3">
              <div className="w-10 h-10 border-4 border-zinc-200 dark:border-zinc-700 border-t-zinc-500 rounded-full animate-spin mx-auto" />
              <p className="font-semibold text-zinc-400 dark:text-zinc-500 text-xs">Анализ заданий...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClasses.map(cls => {
              const topicsCount = meta?.[cls] ? Object.keys(meta[cls]).length : 0;
              const totalTasks = meta?.[cls]
                ? Object.values(meta[cls]).reduce((sum, t) => {
                    if (typeof t === 'object') return sum + Object.values(t).reduce((a, b) => a + b, 0);
                    return sum + t;
                  }, 0)
                : 0;
              return (
                <NavTile
                  key={cls}
                  title={`${cls} раздел`}
                  meta={`${topicsCount} подразделов · ${totalTasks} заданий`}
                  onClick={() => handleSelectClass(cls)}
                />
              );
            })}
          </div>
          )}
        </div>
      )}

      {selectedClass && !selectedTopic && (
        <div className="space-y-4">
          <SearchField value={topicSearch} onChange={setTopicSearch} placeholder="Поиск подраздела..." />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredTopics.map((topic, index) => {
              const count = tasksCountByTopic(selectedClass, topic);
              return (
                <NavTile
                  key={topic}
                  index={index + 1}
                  title={topic}
                  meta={`${count} заданий`}
                  onClick={() => handleSelectTopic(selectedClass, topic)}
                />
              );
            })}
          </div>
        </div>
      )}

      {selectedClass && selectedTopic && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <SearchField className="flex-1" value={taskSearch} onChange={setTaskSearch} placeholder="Поиск по тексту задания..." />
            <button
              onClick={() => setExamFilter(!examFilter)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${ examFilter ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 shadow-lg" : "bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-500/50" }`}
            >
              {examFilter ? "✓ Экзамен" : "ЦТ/ЦЭ/РТ"}
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-500 dark:text-zinc-500">
              {taskSearch ? `Найдено: ${filteredTasks.length} из ${tasks.length}` : `${tasks.length} заданий`}
            </span>
          </div>
          <div className="space-y-4">
            {filteredTasks.map((task, index) => (
              <PickerTaskCard
                key={task.id}
                task={task}
                index={index}
                selected={selectedTasks.some((item) => item.id === task.id)}
                hintOpen={!!openHints[task.id]}
                solutionOpen={!!openSolutions[task.id]}
                onToggleHint={onToggleHint}
                onToggleSolution={onToggleSolution}
                onToggle={onTaskToggle}
              />
            ))}
          </div>
          {!loading && tasks.length === 0 && (
            <div className="text-center py-16 space-y-3">
              <p className="font-semibold text-zinc-400 dark:text-zinc-500">Нет заданий</p>
            </div>
          )}
          {loading && (
            <div className="text-center py-16 space-y-3">
              <p className="font-semibold text-zinc-400 dark:text-zinc-500">Загрузка...</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
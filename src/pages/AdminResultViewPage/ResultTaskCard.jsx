import { useNavigate } from 'react-router-dom';
import { Edit3 } from 'lucide-react';
import { ResultTask } from '../../shared/ui/TaskView';

export default function ResultTaskCard({ item, index }) {
  const navigate = useNavigate();

  const handleEditTask = (taskId) => {
    sessionStorage.setItem('adminReturnContext', JSON.stringify({
      sourceTab: 'result',
      resultId: window.location.pathname.split('/').pop(),
      scrollPosition: window.scrollY,
    }));
    sessionStorage.setItem('editTaskId', taskId);
    navigate('/admin');
  };

  return (
    <ResultTask
      item={item}
      index={index}
      match="text"
      showPoints
      optionsLabel="Варианты в тесте"
      userLabel="Ответ студента"
      correctLabel="Эталонный ответ"
      solutionShowLabel="Показать решение студенту"
      solutionHideLabel="Скрыть разбор"
      solutionCaption="Полный текст решения"
      headerExtra={(
        <button
          type="button"
          onClick={() => handleEditTask(item.task_id)}
          className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 rounded-xl text-xs font-medium transition-all border border-zinc-200 dark:border-zinc-800"
          title="Редактировать задание"
        >
          <Edit3 size={14} /> <span className="hidden sm:inline">Ред.</span>
        </button>
      )}
    />
  );
}

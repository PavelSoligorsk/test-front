import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { QuestionMap } from '../../shared/ui';

export default function TestProgressBar({ test, currentIdx, userAnswers, onNavigate }) {
  const navigate = useNavigate();

  return (
    <header className="flex justify-between items-center bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm">
      <div className="flex items-center gap-6">
        <div className="flex flex-col">
          <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Вопрос</span>
          <span className="text-lg font-black italic">
            {currentIdx + 1}
            <span className="text-slate-200 font-medium not-italic mx-1">/</span>
            {test?.tasks?.length}
          </span>
        </div>
        <QuestionMap
          mode="test"
          tasks={test?.tasks}
          userAnswers={userAnswers}
          currentIdx={currentIdx}
          onNavigate={onNavigate}
        />
      </div>
      <button onClick={() => navigate(-1)} className="p-3 bg-slate-50 rounded-2xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all">
        <X size={20} />
      </button>
    </header>
  );
}

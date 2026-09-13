import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import StudentNav from './StudentNav';
import AiModal from './AiModal';
import { fetchStudentMe, generateAiTest } from './api';
import { STUDENT_PATHS, studentTabFromPath } from './studentPaths';

export default function StudentLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiTaskCount, setAiTaskCount] = useState('10');
  const [aiDifficulty, setAiDifficulty] = useState('none');
  const [aiExcludeWeeks, setAiExcludeWeeks] = useState(0);
  const [aiUseStats, setAiUseStats] = useState(false);

  const activeKey = studentTabFromPath(location.pathname);
  const isTheory = location.pathname.startsWith('/student/theory');

  useEffect(() => {
    fetchStudentMe().then(setProfile).catch(() => {});
  }, []);

  const handleGenerateAiTest = async () => {
    if (!aiPrompt.trim()) return;
    setAiGenerating(true);
    try {
      const selectedClass = sessionStorage.getItem('student_selected_class') || null;
      const newTest = await generateAiTest(aiPrompt, aiTaskCount, aiDifficulty, selectedClass, aiExcludeWeeks, aiUseStats);
      setShowAiModal(false);
      setAiPrompt('');
      navigate(`/test/${newTest.id}?type=ai`);
    } catch (err) {
      alert('Не удалось сгенерировать тест. Попробуйте другой запрос.');
    } finally {
      setAiGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 font-sans selection:bg-zinc-200 dark:selection:bg-zinc-800">
      <StudentNav
        displayName={`${profile?.user?.first_name || ''} ${profile?.user?.last_name || ''}`.trim()}
        activeKey={activeKey}
        onSelect={(key) => navigate(STUDENT_PATHS[key] || STUDENT_PATHS.tests)}
      />

      <Outlet />

      {!isTheory && (
        <button
          type="button"
          onClick={() => setShowAiModal(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-12 h-12 md:w-14 md:h-14 bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 rounded-full shadow-lg shadow-zinc-900/10 dark:shadow-white/10 border border-zinc-800 dark:border-zinc-200 hover:scale-105 active:scale-95 transition-all group focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-white dark:focus-visible:ring-offset-[#09090b]"
          aria-label="Сгенерировать AI-тест"
        >
          <Sparkles size={22} className="group-hover:rotate-12 transition-transform" strokeWidth={1.5} />
        </button>
      )}

      <AiModal
        showAiModal={showAiModal}
        setShowAiModal={setShowAiModal}
        aiPrompt={aiPrompt}
        setAiPrompt={setAiPrompt}
        aiTaskCount={aiTaskCount}
        setAiTaskCount={setAiTaskCount}
        aiDifficulty={aiDifficulty}
        setAiDifficulty={setAiDifficulty}
        aiExcludeWeeks={aiExcludeWeeks}
        setAiExcludeWeeks={setAiExcludeWeeks}
        aiUseStats={aiUseStats}
        setAiUseStats={setAiUseStats}
        aiGenerating={aiGenerating}
        handleGenerateAiTest={handleGenerateAiTest}
      />
    </div>
  );
}

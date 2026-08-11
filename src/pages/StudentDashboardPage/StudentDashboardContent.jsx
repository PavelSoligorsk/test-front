import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GraduationCap, Search, History, User as UserIcon, Filter, ChevronRight, XCircle, PlusCircle, BookOpen, RefreshCw, Sparkles, Clock, LayoutGrid, Target, ArrowRight, AlertCircle, Check, BarChart3 } from 'lucide-react';
import { fetchStudentTestsMeta, fetchMyAssignmentsMeta, fetchAiTests, fetchStudentMe, updateStudentProfile, fetchStudentHistory } from './api';
import { generateAiTest } from './api';
import { retakeTest } from './api';
import TestsTab from './TestsTab';
import HistoryTab from './HistoryTab';
import ProfileTab from './ProfileTab';
import TheoryTab from './TheoryTab';
import StatsTab from './StatsTab';
import AiModal from './AiModal';
import { fetchTheoryTopics, fetchTheorySections, fetchTheoryByTopicSection } from './api';

export default function StudentDashboardContent() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const scrollPositions = useRef({});

  const [activeTab, setActiveTabState] = useState(() => {
    const urlTab = searchParams.get('tab');
    if (urlTab) { localStorage.setItem('student_tab', urlTab); return urlTab; }
    return localStorage.getItem('student_tab') || 'tests';
  });

  useEffect(() => {
    const handleScroll = () => { scrollPositions.current[activeTab] = window.scrollY; };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeTab]);

  useEffect(() => {
    return () => {
      scrollPositions.current[activeTab] = window.scrollY;
      localStorage.setItem('student_tab', activeTab);
      localStorage.setItem('student_scroll_positions', JSON.stringify(scrollPositions.current));
    };
  }, [activeTab]);

  useEffect(() => {
    const savedPosition = scrollPositions.current[activeTab] || 0;
    const timer = setTimeout(() => window.scrollTo({ top: savedPosition, behavior: 'instant' }), 100);
    return () => clearTimeout(timer);
  }, [activeTab]);

  const setActiveTab = (tabId) => {
    if (tabId === activeTab) return;
    scrollPositions.current[activeTab] = window.scrollY;
    setActiveTabState(tabId);
    localStorage.setItem('student_tab', tabId);
    localStorage.setItem('student_scroll_positions', JSON.stringify(scrollPositions.current));
    setSearchParams({ tab: tabId }, { replace: true });
  };

  const [staticTests, setStaticTests] = useState([]);
  const [customTests, setCustomTests] = useState([]);
  const [aiTests, setAiTests] = useState([]);
  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [testTypeFilter, setTestTypeFilter] = useState('all');
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState('Все');
  const [classSearch, setClassSearch] = useState('');
  const [testSearch, setTestSearch] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [examFilter, setExamFilter] = useState(false);
  const [editForm, setEditForm] = useState({ first_name: '', last_name: '', phone: '', telegram: '' });
  const [saving, setSaving] = useState(false);

  const [theoryTopics, setTheoryTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  const [theoryContent, setTheoryContent] = useState(null);
  const [theoryLoading, setTheoryLoading] = useState(false);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [sectionsForModal, setSectionsForModal] = useState([]);

  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiTaskCount, setAiTaskCount] = useState('10');
  const [aiDifficulty, setAiDifficulty] = useState('none');
  const [aiExcludeWeeks, setAiExcludeWeeks] = useState(0);
  const [aiUseStats, setAiUseStats] = useState(false);

  useEffect(() => {
    const sessionData = localStorage.getItem('edu_session');
    if (!sessionData) return navigate('/login');
    const parsed = JSON.parse(sessionData);
    const token = parsed?.token || parsed?.access_token;
    if (!token) return navigate('/login');

    Promise.all([
      fetchStudentTestsMeta().catch(() => []),
      fetchMyAssignmentsMeta().catch(() => []),
      fetchAiTests().catch(() => []),
      fetchStudentMe(),
      fetchStudentHistory().catch(() => []),
    ])
    .then(([testsRes, assignmentsRes, aiRes, profileRes, historyRes]) => {
      setStaticTests(testsRes);
      const customTestsData = (assignmentsRes || []).map(a => ({
        id: a.test_id, title: a.test_title, target_class: a.target_class || '',
        target_topic: a.target_topic || '', subject: a.subject || '', tasks: a.tasks || [],
        is_assigned: true, due_date: a.due_date, is_completed: a.is_completed,
        assignment_id: a.assignment_id, is_autocompile: a.is_autocompile,
        time_limit_minutes: a.time_limit_minutes ?? null, max_attempts: a.max_attempts ?? null,
        allow_interruptions: a.allow_interruptions ?? true,
        exam_start: a.exam_start || null, exam_end: a.exam_end || null,
      }));
      setCustomTests(customTestsData);
      setAiTests((aiRes || []).map(t => ({ ...t, is_ai: true })));
      setProfile(profileRes); setHistory(historyRes);
      setEditForm({ first_name: profileRes.user.first_name || '', last_name: profileRes.user.last_name || '',
        phone: profileRes.user.phone || '', telegram: profileRes.user.tg_username || '' });
      setLoading(false);
    }).catch(err => { if (err.response?.status === 401 && window.location.pathname !== '/login') navigate('/login'); });
  }, [navigate]);

  useEffect(() => { if (activeTab === 'theory') fetchTheoryTopics().then(setTheoryTopics).catch(console.error); }, [activeTab]);

  const handleLogout = () => { localStorage.clear(); sessionStorage.clear(); navigate('/login', { replace: true }); };
  const handleUpdateProfile = async (e) => { e.preventDefault(); setSaving(true); try { const res = await updateStudentProfile({ first_name: editForm.first_name, last_name: editForm.last_name, phone: editForm.phone, tg_username: editForm.telegram }); setProfile(prev => ({ ...prev, user: res })); alert('Данные сохранены!'); } catch (err) { alert('Ошибка при сохранении'); } finally { setSaving(false); } };
  const handleStartTest = (test) => { if (test.is_ai) navigate(`/test/${test.id}?type=ai`); else if (test.assignment_id) navigate(`/test/${test.id}?assignment=${test.assignment_id}`); else navigate(`/test/${test.id}`); };
  const handleRetake = async (resultId, testIdOverride) => { try { const retakeData = await retakeTest(resultId); navigate(`/test/${testIdOverride || retakeData.test_id || resultId}?retake=1`, { state: { startData: retakeData } }); } catch (err) { alert(err.response?.data?.detail || 'Не удалось начать пересдачу. Проверьте лимит попыток.'); } };
  const handleGenerateAiTest = async () => { if (!aiPrompt.trim()) return; setAiGenerating(true); try { const newTest = await generateAiTest(aiPrompt, aiTaskCount, aiDifficulty, selectedClass, aiExcludeWeeks, aiUseStats); setShowAiModal(false); setAiPrompt(''); navigate(`/test/${newTest.id}?type=ai`); } catch (err) { alert('Не удалось сгенерировать тест. Попробуйте другой запрос.'); } finally { setAiGenerating(false); } };
  const handleTopicClickInternal = async (topic) => { const sections = await fetchTheorySections(topic.topic).catch(() => []); if (sections.length === 1) { fetchTheoryByTopicSection(topic.topic, sections[0].section).then(setTheoryContent).catch(console.error); setSelectedTopic(topic); setSelectedSection(sections[0].section); } else if (sections.length > 1) { setSectionsForModal(sections); setSelectedTopic(topic); setShowSectionModal(true); } };
  const handleBackToTopics = () => { setSelectedSection(null); setTheoryContent(null); setSelectedTopic(null); };
  const handleFetchTheory = (topic, section) => { fetchTheoryByTopicSection(topic, section).then(data => { setTheoryContent(data); setSelectedSection(section); }).catch(console.error); };

  const publicStaticTests = staticTests.filter(t => t.is_autocompile !== false);
  const teacherTests = [...customTests.map(t => ({ ...t, type: 'custom' })), ...staticTests.filter(t => t.is_autocompile === false).map(t => ({ ...t, type: 'custom' }))];
  const aiTestsMapped = aiTests.map(t => ({ ...t, type: 'ai' }));
  const allTests = [...publicStaticTests.map(t => ({ ...t, type: 'static' })), ...teacherTests, ...aiTestsMapped];
  const typeFilteredTests = testTypeFilter === 'all' ? allTests : testTypeFilter === 'public' ? publicStaticTests.map(t => ({ ...t, type: 'static' })) : testTypeFilter === 'teacher' ? teacherTests : aiTestsMapped;
  const uniqueClasses = [...new Set(typeFilteredTests.map(t => t.target_class || 'Общие'))].sort((a, b) => { const aNum = parseInt(a), bNum = parseInt(b); if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum; if (!isNaN(aNum)) return -1; if (!isNaN(bNum)) return 1; return a.localeCompare(b); }).filter(cls => cls.toString().toLowerCase().includes(classSearch.toLowerCase()));
  const classTests = selectedClass ? typeFilteredTests.filter(t => (t.target_class || 'Общие') === selectedClass) : [];
  const subjects = selectedClass ? ['Все', ...new Set(classTests.map(t => t.subject || t.target_topic || 'Общее').filter(Boolean))] : [];
  const displayTests = (selectedSubject === 'Все' || !selectedSubject) ? classTests : classTests.filter(t => (t.subject || t.target_topic || 'Общее') === selectedSubject);
  const hasExamKeyword = (title) => ['ЦТ','ЦЭ','РЦЭ','ДРТ','РТ'].some(kw => (title || '').includes(kw));
  const searchedTests = (() => { let result = testSearch.trim() ? displayTests.filter(t => t.title?.toLowerCase().includes(testSearch.toLowerCase()) || t.subject?.toLowerCase().includes(testSearch.toLowerCase())) : displayTests; if (examFilter) result = result.filter(t => hasExamKeyword(t.title)); return result; })();
  const filteredHistory = history.filter(item => item.test_title?.toLowerCase().includes(searchTerm.toLowerCase()));

  if (loading) return (<div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900"><div className="text-center space-y-4"><div className="w-16 h-16 border-8 border-slate-200 dark:border-slate-700 border-t-blue-600 rounded-full animate-spin mx-auto" /><p className="font-black uppercase tracking-widest text-slate-400 text-[10px]">Загрузка тестов...</p></div></div>);

  const TABS = [
    { key: 'theory', label: 'Теория', icon: null },
    { key: 'tests', label: 'Тесты', icon: null },
    { key: 'stats', label: 'Статистика', icon: BarChart3 },
    { key: 'history', label: 'История', icon: null },
    { key: 'profile', label: 'Профиль', icon: null },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-900">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100 dark:bg-slate-900/80 dark:border-slate-800 py-2">
        <div className="max-w-7xl mx-auto px-3 md:px-8 flex items-center gap-2 md:gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <GraduationCap size={18} className="text-blue-600" />
            <span className="text-xs font-black uppercase text-slate-800 dark:text-white hidden sm:inline whitespace-nowrap">{profile?.user.first_name} {profile?.user.last_name}</span>
          </div>
          {/* Адаптивные табы: скролл на телефонах, справа на десктопе */}
          <div className="overflow-x-auto scrollbar-none ml-auto">
            <div className="flex items-center gap-1 md:gap-1.5 bg-slate-50 dark:bg-slate-800 p-1 rounded-2xl border border-slate-100 dark:border-slate-700 min-w-max">
              {TABS.map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={`relative px-2.5 md:px-5 py-1.5 md:py-2 rounded-xl text-[8px] md:text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all duration-300 ${activeTab === tab.key ? 'text-white' : 'text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/50 dark:hover:bg-slate-700/50'}`}>
                  {activeTab === tab.key && <div className="absolute inset-0 bg-blue-600 rounded-xl shadow-lg shadow-blue-200 animate-in fade-in zoom-in duration-300" />}
                  <span className="relative z-10 flex items-center gap-1">{tab.icon ? <tab.icon size={10} className="md:w-[11px] md:h-[11px]" /> : null}{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
        {activeTab === 'tests' && <TestsTab allTests={allTests} publicStaticTests={publicStaticTests} teacherTests={teacherTests} aiTestsMapped={aiTestsMapped} testTypeFilter={testTypeFilter} setTestTypeFilter={setTestTypeFilter} uniqueClasses={uniqueClasses} selectedClass={selectedClass} setSelectedClass={setSelectedClass} classSearch={classSearch} setClassSearch={setClassSearch} selectedSubject={selectedSubject} setSelectedSubject={setSelectedSubject} subjects={subjects} searchedTests={searchedTests} testSearch={testSearch} setTestSearch={setTestSearch} handleStartTest={handleStartTest} typeFilteredTests={typeFilteredTests} examFilter={examFilter} setExamFilter={setExamFilter} />}
        {activeTab === 'stats' && <StatsTab />}
        {activeTab === 'history' && <HistoryTab filteredHistory={filteredHistory} searchTerm={searchTerm} setSearchTerm={setSearchTerm} onRetake={handleRetake} />}
        {activeTab === 'profile' && <ProfileTab profile={profile} editForm={editForm} setEditForm={setEditForm} handleUpdateProfile={handleUpdateProfile} saving={saving} />}
        {activeTab === 'theory' && <TheoryTab theoryTopics={theoryTopics} theoryLoading={theoryLoading} selectedTopic={selectedTopic} selectedSection={selectedSection} theoryContent={theoryContent} showSectionModal={showSectionModal} sectionsForModal={sectionsForModal} loadingTheoryByTopicSection={theoryLoading} handleTopicClick={handleTopicClickInternal} handleBackToTopics={handleBackToTopics} setShowSectionModal={setShowSectionModal} fetchTheoryByTopicSection={handleFetchTheory} setSelectedTopic={setSelectedTopic} />}
      </main>

      {activeTab !== 'theory' && <button onClick={() => setShowAiModal(true)} className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-full shadow-2xl shadow-purple-200 flex items-center justify-center hover:scale-105 transition-all active:scale-95 group"><Sparkles size={24} className="group-hover:rotate-12 transition-transform" /></button>}

      <AiModal showAiModal={showAiModal} setShowAiModal={setShowAiModal} aiPrompt={aiPrompt} setAiPrompt={setAiPrompt} aiTaskCount={aiTaskCount} setAiTaskCount={setAiTaskCount} aiDifficulty={aiDifficulty} setAiDifficulty={setAiDifficulty} aiExcludeWeeks={aiExcludeWeeks} setAiExcludeWeeks={setAiExcludeWeeks} aiUseStats={aiUseStats} setAiUseStats={setAiUseStats} aiGenerating={aiGenerating} handleGenerateAiTest={handleGenerateAiTest} />
    </div>
  );
}
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { fetchStudentTestsMeta, fetchMyAssignmentsMeta, fetchAiTests, fetchStudentMe, updateStudentProfile, fetchStudentHistory } from './api';
import { generateAiTest } from './api';
import { retakeTest } from './api';
import TestsTab from './TestsTab';
import HistoryTab from './HistoryTab';
import ProfileTab from './ProfileTab';
import TheoryTab from './TheoryTab';
import StudentNav from './StudentNav';
import AiModal from './AiModal';
import { fetchTheoryTopics, fetchTheorySections, fetchTheoryByTopicSection } from './api';

export default function StudentDashboardContent() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const scrollPositions = useRef({});

  const [activeTab, setActiveTabState] = useState(() => {
    const urlTab = searchParams.get('tab');
    if (urlTab && urlTab !== 'stats') {
      localStorage.setItem('student_tab', urlTab);
      return urlTab;
    }
    const stored = localStorage.getItem('student_tab');
    return stored && stored !== 'stats' ? stored : 'tests';
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
    if (tabId === 'stats') {
      navigate('/student/stats');
      return;
    }
    if (tabId === activeTab) return;
    scrollPositions.current[activeTab] = window.scrollY;
    setActiveTabState(tabId);
    localStorage.setItem('student_tab', tabId);
    localStorage.setItem('student_scroll_positions', JSON.stringify(scrollPositions.current));
    setSearchParams({ tab: tabId }, { replace: true });
  };

  useEffect(() => {
    if (searchParams.get('tab') === 'stats') {
      navigate('/student/stats', { replace: true });
    }
  }, [navigate, searchParams]);

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

  const handleUpdateProfile = async (e) => { 
    e.preventDefault(); 
    setSaving(true); 
    try { 
      const res = await updateStudentProfile({ first_name: editForm.first_name, last_name: editForm.last_name, phone: editForm.phone, tg_username: editForm.telegram }); 
      setProfile(prev => ({ ...prev, user: res })); 
      alert('Данные сохранены!'); 
    } catch (err) { 
      alert('Ошибка при сохранении'); 
    } finally { 
      setSaving(false); 
    } 
  };
  
  const handleStartTest = (test) => { 
    if (test.is_ai) navigate(`/test/${test.id}?type=ai`); 
    else if (test.assignment_id) navigate(`/test/${test.id}?assignment=${test.assignment_id}`); 
    else navigate(`/test/${test.id}`); 
  };
  
  const handleRetake = async (resultId, testIdOverride) => { 
    try { 
      const retakeData = await retakeTest(resultId); 
      navigate(`/test/${testIdOverride || retakeData.test_id || resultId}?retake=1`, { state: { startData: retakeData } }); 
    } catch (err) { 
      alert(err.response?.data?.detail || 'Не удалось начать пересдачу. Проверьте лимит попыток.'); 
    } 
  };
  
  const handleGenerateAiTest = async () => { 
    if (!aiPrompt.trim()) return; 
    setAiGenerating(true); 
    try { 
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

  const handleTopicClickInternal = async (topic) => { 
    const sections = await fetchTheorySections(topic.topic).catch(() => []); 
    if (sections.length === 1) { 
      fetchTheoryByTopicSection(topic.topic, sections[0].section).then(setTheoryContent).catch(console.error); 
      setSelectedTopic(topic); 
      setSelectedSection(sections[0].section); 
    } else if (sections.length > 1) { 
      setSectionsForModal(sections); 
      setSelectedTopic(topic); 
      setShowSectionModal(true); 
    } 
  };
  
  const handleBackToTopics = () => { setSelectedSection(null); setTheoryContent(null); setSelectedTopic(null); };
  
  const handleFetchTheory = (topic, section) => { 
    fetchTheoryByTopicSection(topic, section).then(data => { setTheoryContent(data); setSelectedSection(section); }).catch(console.error); 
  };

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

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-[#09090b]">
        <div className="w-8 h-8 border-[3px] border-zinc-200 dark:border-zinc-800 border-t-zinc-900 dark:border-t-zinc-100 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 font-sans selection:bg-zinc-200 dark:selection:bg-zinc-800">
      <StudentNav
        displayName={`${profile?.user.first_name || ''} ${profile?.user.last_name || ''}`.trim()}
        activeKey={activeTab}
        onSelect={setActiveTab}
      />

      <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
        {activeTab === 'tests' && <TestsTab allTests={allTests} publicStaticTests={publicStaticTests} teacherTests={teacherTests} aiTestsMapped={aiTestsMapped} testTypeFilter={testTypeFilter} setTestTypeFilter={setTestTypeFilter} uniqueClasses={uniqueClasses} selectedClass={selectedClass} setSelectedClass={setSelectedClass} classSearch={classSearch} setClassSearch={setClassSearch} selectedSubject={selectedSubject} setSelectedSubject={setSelectedSubject} subjects={subjects} searchedTests={searchedTests} testSearch={testSearch} setTestSearch={setTestSearch} handleStartTest={handleStartTest} typeFilteredTests={typeFilteredTests} examFilter={examFilter} setExamFilter={setExamFilter} />}
        {activeTab === 'history' && <HistoryTab filteredHistory={filteredHistory} searchTerm={searchTerm} setSearchTerm={setSearchTerm} onRetake={handleRetake} />}
        {activeTab === 'profile' && <ProfileTab profile={profile} editForm={editForm} setEditForm={setEditForm} handleUpdateProfile={handleUpdateProfile} saving={saving} />}
        {activeTab === 'theory' && <TheoryTab theoryTopics={theoryTopics} theoryLoading={theoryLoading} selectedTopic={selectedTopic} selectedSection={selectedSection} theoryContent={theoryContent} showSectionModal={showSectionModal} sectionsForModal={sectionsForModal} loadingTheoryByTopicSection={theoryLoading} handleTopicClick={handleTopicClickInternal} handleBackToTopics={handleBackToTopics} setShowSectionModal={setShowSectionModal} fetchTheoryByTopicSection={handleFetchTheory} setSelectedTopic={setSelectedTopic} />}
      </main>

      {/* Кнопка вызова ИИ */}
      {activeTab !== 'theory' && (
        <button 
          onClick={() => setShowAiModal(true)} 
          className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-12 h-12 md:w-14 md:h-14 bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 rounded-full shadow-lg shadow-zinc-900/10 dark:shadow-white/10 border border-zinc-800 dark:border-zinc-200 hover:scale-105 active:scale-95 transition-all group focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-white dark:focus-visible:ring-offset-[#09090b]"
          aria-label="Сгенерировать AI-тест"
        >
          <Sparkles size={22} className="group-hover:rotate-12 transition-transform" strokeWidth={1.5} />
        </button>
      )}

      <AiModal showAiModal={showAiModal} setShowAiModal={setShowAiModal} aiPrompt={aiPrompt} setAiPrompt={setAiPrompt} aiTaskCount={aiTaskCount} setAiTaskCount={setAiTaskCount} aiDifficulty={aiDifficulty} setAiDifficulty={setAiDifficulty} aiExcludeWeeks={aiExcludeWeeks} setAiExcludeWeeks={setAiExcludeWeeks} aiUseStats={aiUseStats} setAiUseStats={setAiUseStats} aiGenerating={aiGenerating} handleGenerateAiTest={handleGenerateAiTest} />
    </div>
  );
}
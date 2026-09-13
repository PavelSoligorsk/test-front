import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchStudentTestsMeta, fetchMyAssignmentsMeta, fetchAiTests } from './api';
import TestsTab from './TestsTab';
import StudentPageLoading from './StudentPageLoading';

export default function TestsPage() {
  const navigate = useNavigate();
  const [staticTests, setStaticTests] = useState([]);
  const [customTests, setCustomTests] = useState([]);
  const [aiTests, setAiTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [testTypeFilter, setTestTypeFilter] = useState('all');
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState('Все');
  const [classSearch, setClassSearch] = useState('');
  const [testSearch, setTestSearch] = useState('');
  const [examFilter, setExamFilter] = useState(false);

  useEffect(() => {
    Promise.all([
      fetchStudentTestsMeta().catch(() => []),
      fetchMyAssignmentsMeta().catch(() => []),
      fetchAiTests().catch(() => []),
    ])
      .then(([testsRes, assignmentsRes, aiRes]) => {
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
        setLoading(false);
      })
      .catch(err => {
        if (err.response?.status === 401 && window.location.pathname !== '/login') navigate('/login');
      });
  }, [navigate]);

  useEffect(() => {
    if (selectedClass) sessionStorage.setItem('student_selected_class', selectedClass);
  }, [selectedClass]);

  const handleStartTest = (test) => {
    if (test.is_ai) navigate(`/test/${test.id}?type=ai`);
    else if (test.assignment_id) navigate(`/test/${test.id}?assignment=${test.assignment_id}`);
    else navigate(`/test/${test.id}`);
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

  if (loading) return <StudentPageLoading variant="tests" />;

  return (
    <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
      <TestsTab
        allTests={allTests}
        publicStaticTests={publicStaticTests}
        teacherTests={teacherTests}
        aiTestsMapped={aiTestsMapped}
        testTypeFilter={testTypeFilter}
        setTestTypeFilter={setTestTypeFilter}
        uniqueClasses={uniqueClasses}
        selectedClass={selectedClass}
        setSelectedClass={setSelectedClass}
        classSearch={classSearch}
        setClassSearch={setClassSearch}
        selectedSubject={selectedSubject}
        setSelectedSubject={setSelectedSubject}
        subjects={subjects}
        searchedTests={searchedTests}
        testSearch={testSearch}
        setTestSearch={setTestSearch}
        handleStartTest={handleStartTest}
        typeFilteredTests={typeFilteredTests}
        examFilter={examFilter}
        setExamFilter={setExamFilter}
      />
    </main>
  );
}

import React, { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";
import { API_BASE } from "../../shared/api";
import { restoreSession, saveSession } from "../../shared/lib/session";
import {
  Database,
  Users,
  LayoutDashboard,
  Search,
  BookOpen,
  ClipboardList,
  GraduationCap,
  PlusCircle,
  Calendar,
  FileText,
  User as UserIcon,
  Settings,
} from "lucide-react";

// Импортируем подкомпоненты
import TheoryBank from "./TheoryBank";
import TestBank from "./TestBank";
import TestConstructor from "./TestConstructor";
import StudentsTab from "./StudentsTab";
import TestsListTab from "./TestsListTab";
import GroupsTab from "./GroupsTab";
import TestManageModal from "./TestManageModal";
import GroupStudentsModal from "./GroupStudentsModal";
import AssignTestToGroupModal from "./AssignTestToGroupModal";
import GroupDetailModal from "./GroupDetailModal";
import CreateGroupModal from "./CreateGroupModal";
import AiTestGeneratorModal from "./AiTestGeneratorModal";
import CalendarTab from "./CalendarTab";
import TheoryGeneratorTab from "./TheoryGeneratorTab";
import { teacherApi } from "../../features/teacher/api";

const TABS = [
  { id: "calendar", icon: Calendar, label: "Календарь" },
  { id: "bank", icon: Database, label: "Банк заданий" },
  { id: "sections", icon: BookOpen, label: "Банк заданий" },
  { id: "constructor", icon: ClipboardList, label: "Конструктор" },
  { id: "students", icon: Users, label: "Ученики" },
  { id: "tests_list", icon: BookOpen, label: "Тесты" },
  { id: "groups", icon: LayoutDashboard, label: "Группы" },
  { id: "theory_generator", icon: FileText, label: "Теория" },
];

export default function TeacherDashboardContent() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const scrollPositions = useRef({});

  // Active tab
  const [activeTab, setActiveTabState] = useState(() => {
    const urlTab = searchParams.get("tab");
    return urlTab || localStorage.getItem("teacher_tab") || "bank";
  });

  const activeTabRef = useRef(activeTab);
  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);

  const setActiveTab = (tabId) => {
    scrollPositions.current[activeTab] = window.scrollY;
    setActiveTabState(tabId);
    localStorage.setItem("teacher_tab", tabId);
    localStorage.setItem("teacher_scroll_positions", JSON.stringify(scrollPositions.current));
    setSearchParams({ tab: tabId }, { replace: true });
  };

  // Данные
  const [tests, setTests] = useState([]);
  const [students, setStudents] = useState([]);
  const [groups, setGroups] = useState([]);
  const [topicSectionMeta, setTopicSectionMeta] = useState({});
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [manageTestModal, setManageTestModal] = useState(null);
  const [groupStudentsModal, setGroupStudentsModal] = useState(null);
  const [assignGroupModal, setAssignGroupModal] = useState(null);
  const [groupDetailModal, setGroupDetailModal] = useState(null);
  const [groupCreateModal, setGroupCreateModal] = useState(null); // null | { id, name, description, students? }
  const [aiGeneratorModal, setAiGeneratorModal] = useState(false);
  const [openSolutions, setOpenSolutions] = useState({});
  const [openHints, setOpenHints] = useState({});
  const [editingTest, setEditingTest] = useState(null); // данные редактируемого теста

  // --- Profile edit ---
  const [profileModal, setProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({ first_name: '', last_name: '', phone: '', tg_username: '' });
  const [profileSaving, setProfileSaving] = useState(false);

  const openProfileModal = () => {
    const user = restoreSession();
    setProfileForm({
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      phone: user?.phone || '',
      tg_username: user?.tg_username || '',
    });
    setProfileModal(true);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      const res = await teacherApi.updateProfile(profileForm);
      // Update session with new data
      const user = restoreSession();
      if (user) {
        saveSession({ ...user, ...res.data });
      }
      setProfileModal(false);
      alert('Профиль обновлён!');
    } catch (e) {
      alert(e.response?.data?.detail || 'Ошибка при сохранении');
    } finally { setProfileSaving(false); }
  };

  const getAuthHeaders = () => {
    const user = restoreSession();
    const token = user?.token || user?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchTests = async () => {
    try {
      const res = await axios.get(`${API_BASE}/teacher/tests`, { headers: getAuthHeaders() });
      setTests(res.data);
    } catch (e) { console.error("Ошибка загрузки тестов:", e); }
  };

  const fetchStudents = async () => {
    try {
      const res = await axios.get(`${API_BASE}/teacher/students`, { headers: getAuthHeaders() });
      setStudents(res.data);
    } catch (e) { console.error("Ошибка загрузки учеников:", e); }
  };

  const fetchGroups = async () => {
    try {
      const res = await axios.get(`${API_BASE}/teacher/groups/`, { headers: getAuthHeaders() });
      setGroups(res.data);
    } catch (e) { console.error("Ошибка загрузки групп:", e); }
  };

  const fetchTopicSectionMeta = async () => {
    try {
      const res = await axios.get(`${API_BASE}/teacher/tasks-meta-by-topic-section`, { headers: getAuthHeaders() });
      setTopicSectionMeta(res.data);
    } catch (e) { console.error("Ошибка загрузки метаданных:", e); }
  };

  useEffect(() => {
    fetchTests();
    fetchStudents();
    fetchGroups();
    fetchTopicSectionMeta();
  }, []);

  // CRUD группы
  const handleSaveGroupFromModal = async (data) => {
    try {
      let groupId = data.id;
      if (data.id) {
        // Редактирование
        await axios.put(`${API_BASE}/teacher/groups/${data.id}`, { name: data.name, description: data.description }, { headers: getAuthHeaders() });
      } else {
        // Создание
        const res = await axios.post(`${API_BASE}/teacher/groups/`, { name: data.name, description: data.description }, { headers: getAuthHeaders() });
        groupId = res.data.id;
      }
      // Добавляем студентов если выбраны
      if (data.student_ids && data.student_ids.length > 0 && groupId) {
        await axios.post(`${API_BASE}/teacher/groups/${groupId}/students`, { student_ids: data.student_ids }, { headers: getAuthHeaders() });
      }
      setGroupCreateModal(null);
      fetchGroups();
    } catch (e) {
      alert(e.response?.data?.detail || "Ошибка при сохранении группы");
      throw e;
    }
  };

  const handleDeleteGroup = async (groupId, groupName) => {
    if (!confirm(`Удалить группу "${groupName || groupId}"? Это действие нельзя отменить.`)) return;
    try {
      await axios.delete(`${API_BASE}/teacher/groups/${groupId}`, { headers: getAuthHeaders() });
      fetchGroups();
    } catch (e) { alert("Ошибка при удалении группы"); }
  };

  const handleAddStudentsToGroup = async (groupId, studentIds) => {
    try {
      await axios.post(`${API_BASE}/teacher/groups/${groupId}/students`, { student_ids: studentIds }, { headers: getAuthHeaders() });
      fetchGroups();
      setGroupStudentsModal(null);
    } catch (e) { alert("Ошибка при добавлении студентов"); }
  };

  const handleRemoveStudentFromGroup = async (groupId, studentId) => {
    try {
      await axios.delete(`${API_BASE}/teacher/groups/${groupId}/students/${studentId}`, { headers: getAuthHeaders() });
      await fetchGroups();
      return true;
    } catch (e) { console.error(e); throw e; }
  };

  const handleAssignTestToGroup = async (testId, groupId) => {
    try {
      await axios.post(`${API_BASE}/teacher/assign-test-to-group`, { test_id: testId, group_id: groupId }, { headers: getAuthHeaders() });
      setAssignGroupModal(null);
    } catch (e) {
      console.error('Ошибка назначения теста группе:', e);
      alert('Ошибка при назначении теста');
    }
  };

  const handleAssignTest = async (data) => {
    try {
      await axios.post(`${API_BASE}/teacher/assign-test`, data, { headers: getAuthHeaders() });
    } catch (e) { 
      console.error('Ошибка назначения теста:', e);
      throw e; 
    }
  };

  const handleGenerateAiTest = async (aiParams) => {
    try {
      const res = await axios.post(
        `${API_BASE}/teacher/generate-test`,
        aiParams,
        { headers: getAuthHeaders() }
      );
      const generatedTest = res.data;

      // Auto-populate the constructor with generated tasks
      if (generatedTest.tasks && generatedTest.tasks.length > 0) {
        setSelectedTasks(generatedTest.tasks);
        setEditingTest({
          id: generatedTest.id,
          title: generatedTest.title || '',
          target_class: generatedTest.target_class || '',
          target_topic: generatedTest.target_topic || '',
          is_autocompile: false,
          task_ids: generatedTest.tasks.map((t) => t.id),
          is_active: true,
          max_attempts: generatedTest.max_attempts ?? null,
          time_limit_minutes: generatedTest.time_limit_minutes ?? null,
          allow_interruptions: generatedTest.allow_interruptions ?? true,
          exam_start: generatedTest.exam_start || '',
          exam_end: generatedTest.exam_end || '',
        });
      }

      setAiGeneratorModal(false);
      setActiveTab("constructor");
      fetchTests();
    } catch (e) {
      const detail = e.response?.data?.detail;
      alert(typeof detail === 'string' ? detail : 'Ошибка при генерации теста. Попробуйте другой запрос.');
      throw e;
    }
  };

  const toggleTaskSelection = (task) => {
    setSelectedTasks((prev) => {
      const exists = prev.find((t) => t.id === task.id);
      return exists ? prev.filter((t) => t.id !== task.id) : [...prev, task];
    });
  };

  const handleEditTest = async (test) => {
    // Загружаем полные данные теста и переходим в конструктор
    try {
      const res = await axios.get(`${API_BASE}/teacher/tests/${test.id}`, { headers: getAuthHeaders() });
      const fullTest = res.data;
      setSelectedTasks(fullTest.tasks || []);
      setEditingTest(fullTest); // сохраняем данные теста для автозаполнения формы
      setActiveTab("constructor");
    } catch (e) {
      console.error("Ошибка загрузки теста для редактирования:", e);
      alert("Не удалось загрузить тест для редактирования");
    }
  };

  const handleDeleteTest = async (testId) => {
    if (!confirm('Удалить тест? Это действие нельзя отменить.')) return;
    try {
      await axios.delete(`${API_BASE}/teacher/tests/${testId}`, { headers: getAuthHeaders() });
      fetchTests();
    } catch (e) {
      alert('Ошибка при удалении теста');
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans pb-20">
      {/* HEADER */}
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] shadow-xl dark:shadow-2xl flex flex-col gap-6 border-b-4 border-emerald-500 dark:border-emerald-500/30">
          <div className="flex justify-between items-center gap-4 flex-wrap">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="p-3 md:p-4 bg-emerald-500/20 rounded-2xl md:rounded-3xl text-emerald-500 dark:text-emerald-400 backdrop-blur-sm">
                <GraduationCap size={24} className="md:w-7 md:h-7" />
              </div>
              <div>
                <h1 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white italic tracking-tighter uppercase">
                  Учительская
                </h1>
                <p className="text-emerald-600/70 dark:text-emerald-300/70 text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em]">
                  Банк заданий и конструктор тестов
                </p>
              </div>
            </div>
            <button onClick={openProfileModal}
              className="p-3 bg-slate-100 hover:bg-slate-200 rounded-2xl text-slate-600 hover:text-slate-800 transition-all flex items-center gap-2"
              title="Редактировать профиль">
              <Settings size={16} />
              <span className="text-[10px] font-black uppercase hidden sm:inline">Профиль</span>
            </button>
          </div>

          <nav className="grid grid-cols-4 md:grid-cols-8 gap-1.5 bg-slate-100 dark:bg-slate-800/50 backdrop-blur-sm p-1.5 rounded-2xl w-full">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center gap-1 px-1 py-2 rounded-xl font-black text-[9px] transition-all md:px-3 md:py-2.5 md:text-xs md:rounded-2xl ${
                  activeTab === tab.id
                    ? "bg-emerald-500 text-white shadow-lg scale-[0.97] md:scale-105"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800"
                }`}
              >
                <tab.icon size={12} className="md:w-4 md:h-4 flex-shrink-0" />
                <span className="truncate">{tab.id === "bank" ? "Тесты" : tab.id === "sections" ? "Темы" : tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 md:px-6 space-y-6">
        {activeTab === "calendar" && (
          <CalendarTab
            students={students}
            groups={groups}
            onRefresh={() => { fetchStudents(); fetchGroups(); }}
          />
        )}

        {activeTab === "sections" && (
          <TheoryBank
            tasksMeta={topicSectionMeta}
            onTaskToggle={toggleTaskSelection}
            selectedTasks={selectedTasks}
            openSolutions={openSolutions}
            openHints={openHints}
            onToggleSolution={(id) => setOpenSolutions((p) => ({ ...p, [id]: !p[id] }))}
            onToggleHint={(id) => setOpenHints((p) => ({ ...p, [id]: !p[id] }))}
          />
        )}

        {activeTab === "bank" && (
          <TestBank
            onTaskToggle={toggleTaskSelection}
            selectedTasks={selectedTasks}
            openSolutions={openSolutions}
            openHints={openHints}
            onToggleSolution={(id) => setOpenSolutions((p) => ({ ...p, [id]: !p[id] }))}
            onToggleHint={(id) => setOpenHints((p) => ({ ...p, [id]: !p[id] }))}
          />
        )}

        {activeTab === "constructor" && (
          <TestConstructor
            selectedTasks={selectedTasks}
            onTaskToggle={toggleTaskSelection}
            openSolutions={openSolutions}
            openHints={openHints}
            onToggleSolution={(id) => setOpenSolutions((p) => ({ ...p, [id]: !p[id] }))}
            onToggleHint={(id) => setOpenHints((p) => ({ ...p, [id]: !p[id] }))}
            onTestsUpdate={fetchTests}
            onNavigateToBank={() => setActiveTab("bank")}
            onNavigateToTests={() => setActiveTab("tests_list")}
            editingTest={editingTest}
            onClearEditing={() => setEditingTest(null)}
            onClearTasks={() => setSelectedTasks([])}
            onOpenAiGenerator={() => setAiGeneratorModal(true)}
          />
        )}

        {activeTab === "students" && (
          <StudentsTab students={students} navigate={navigate} />
        )}

        {activeTab === "tests_list" && (
          <TestsListTab
            tests={tests}
            onEdit={handleEditTest}
            onDelete={handleDeleteTest}
            onManage={(test) => setManageTestModal(test)}
            onCreateClick={() => setActiveTab("constructor")}
          />
        )}

        {activeTab === "groups" && (
          <GroupsTab
            groups={groups}
            onOpenCreate={() => setGroupCreateModal({ id: null, name: '', description: '', students: [] })}
            onEdit={(g) => setGroupCreateModal(g)}
            onDelete={handleDeleteGroup}
            onManageStudents={(g) => setGroupStudentsModal(g)}
            onAssignTest={(g) => setAssignGroupModal(g)}
            onDetail={(g) => setGroupDetailModal(g)}
            navigate={navigate}
          />
        )}

        {activeTab === "theory_generator" && (
          <TheoryGeneratorTab />
        )}
      </main>

      {manageTestModal && (
        <TestManageModal
          test={manageTestModal}
          students={students}
          groups={groups}
          onClose={() => setManageTestModal(null)}
          onAssign={handleAssignTest}
          onAssignToGroup={handleAssignTestToGroup}
        />
      )}

      {groupStudentsModal && (
        <GroupStudentsModal
          group={groupStudentsModal}
          allStudents={students}
          onClose={() => setGroupStudentsModal(null)}
          onAdd={handleAddStudentsToGroup}
          onRemove={handleRemoveStudentFromGroup}
          navigate={navigate}
        />
      )}

      {assignGroupModal && (
        <AssignTestToGroupModal
          group={assignGroupModal}
          tests={tests}
          onClose={() => setAssignGroupModal(null)}
          onAssign={handleAssignTestToGroup}
          navigate={navigate}
        />
      )}

      {groupDetailModal && (
        <GroupDetailModal
          group={groupDetailModal}
          tests={tests}
          students={students}
          onClose={() => setGroupDetailModal(null)}
          onRemoveStudent={handleRemoveStudentFromGroup}
          navigate={navigate}
        />
      )}

      {groupCreateModal !== null && (
        <CreateGroupModal
          groupForm={groupCreateModal}
          allStudents={students}
          onClose={() => setGroupCreateModal(null)}
          onSave={handleSaveGroupFromModal}
          navigate={navigate}
        />
      )}

      {aiGeneratorModal && (
        <AiTestGeneratorModal
          groups={groups}
          allStudents={students}
          onClose={() => setAiGeneratorModal(false)}
          onGenerate={handleGenerateAiTest}
        />
      )}

      {/* Profile edit modal */}
      {profileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-500">
                  <UserIcon size={18} />
                </div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase">Профиль</h2>
              </div>
              <button onClick={() => setProfileModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={handleSaveProfile} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Имя</label>
                <input type="text" value={profileForm.first_name}
                  onChange={e => setProfileForm(f => ({ ...f, first_name: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-bold text-slate-900 focus:bg-white focus:border-emerald-500 outline-none transition-all text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Фамилия</label>
                <input type="text" value={profileForm.last_name}
                  onChange={e => setProfileForm(f => ({ ...f, last_name: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-bold text-slate-900 focus:bg-white focus:border-emerald-500 outline-none transition-all text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Телефон</label>
                <input type="tel" value={profileForm.phone}
                  onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-bold text-slate-900 focus:bg-white focus:border-emerald-500 outline-none transition-all text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Telegram</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-emerald-500">@</span>
                  <input type="text" value={profileForm.tg_username}
                    onChange={e => setProfileForm(f => ({ ...f, tg_username: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-bold text-slate-900 focus:bg-white focus:border-emerald-500 outline-none transition-all text-sm" />
                </div>
              </div>
              <div className="pt-2 flex gap-2">
                <button type="button" onClick={() => setProfileModal(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-black text-xs uppercase hover:bg-slate-200 transition-all">Отмена</button>
                <button type="submit" disabled={profileSaving}
                  className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-black text-xs uppercase hover:bg-emerald-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                  {profileSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Сохранить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating indicator */}
      {selectedTasks.length > 0 && activeTab !== "constructor" && (
        <div className="fixed bottom-6 right-6 z-40">
          <button onClick={() => setActiveTab("constructor")}
            className="flex items-center gap-2 px-5 py-3 bg-emerald-500 dark:bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-2xl hover:bg-emerald-600 dark:hover:bg-emerald-700 transition-all">
            <ClipboardList size={14} /> Тест: {selectedTasks.length} заданий
          </button>
        </div>
      )}
    </div>
  );
}

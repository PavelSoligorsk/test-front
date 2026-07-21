import React, { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";
import { API_BASE } from "../../shared/api";
import { restoreSession } from "../../shared/lib/session";
import {
  Database,
  Users,
  LayoutDashboard,
  Search,
  BookOpen,
  ClipboardList,
  GraduationCap,
  PlusCircle,
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

const TABS = [
  { id: "bank", icon: Database, label: "Банк заданий" },
  { id: "sections", icon: BookOpen, label: "Банк заданий" },
  { id: "constructor", icon: ClipboardList, label: "Конструктор" },
  { id: "students", icon: Users, label: "Ученики" },
  { id: "tests_list", icon: BookOpen, label: "Тесты" },
  { id: "groups", icon: LayoutDashboard, label: "Группы" },
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
  const [groupForm, setGroupForm] = useState({ id: null, name: "", description: "" });
  const [openSolutions, setOpenSolutions] = useState({});
  const [openHints, setOpenHints] = useState({});

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
  const handleCreateGroup = async (e) => {
    e.preventDefault();
    try {
      if (groupForm.id) {
        await axios.put(`${API_BASE}/teacher/groups/${groupForm.id}`, { name: groupForm.name, description: groupForm.description }, { headers: getAuthHeaders() });
      } else {
        await axios.post(`${API_BASE}/teacher/groups/`, { name: groupForm.name, description: groupForm.description }, { headers: getAuthHeaders() });
      }
      setGroupForm({ id: null, name: "", description: "" });
      fetchGroups();
    } catch (e) { alert(e.response?.data?.detail || "Ошибка при сохранении группы"); }
  };

  const handleDeleteGroup = async (groupId) => {
    if (!confirm("Удалить группу?")) return;
    try {
      await axios.delete(`${API_BASE}/teacher/groups/${groupId}`, { headers: getAuthHeaders() });
      fetchGroups();
    } catch (e) { alert("Ошибка при удалении группы"); }
  };

  const handleEditGroup = (group) => {
    setGroupForm({ id: group.id, name: group.name, description: group.description || "" });
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
    } catch (e) { alert("Ошибка при назначении теста"); }
  };

  const handleAssignTest = async (data) => {
    try {
      await axios.post(`${API_BASE}/teacher/assign-test`, data, { headers: getAuthHeaders() });
    } catch (e) { throw e; }
  };

  const toggleTaskSelection = (task) => {
    setSelectedTasks((prev) => {
      const exists = prev.find((t) => t.id === task.id);
      return exists ? prev.filter((t) => t.id !== task.id) : [...prev, task];
    });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans pb-20">
      {/* HEADER */}
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <div className="bg-gradient-to-br from-emerald-700 to-teal-800 p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] shadow-2xl flex flex-col gap-6 border-b-4 border-emerald-400">
          <div className="flex justify-between items-center gap-4 flex-wrap">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="p-3 md:p-4 bg-white/20 rounded-2xl md:rounded-3xl text-white backdrop-blur-sm">
                <GraduationCap size={24} className="md:w-7 md:h-7" />
              </div>
              <div>
                <h1 className="text-xl md:text-3xl font-black text-white italic tracking-tighter uppercase">
                  Учительская
                </h1>
                <p className="text-emerald-200 text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em]">
                  Банк заданий и конструктор тестов
                </p>
              </div>
            </div>
          </div>

          <nav className="flex flex-wrap gap-1.5 bg-white/10 backdrop-blur-sm p-1.5 rounded-2xl w-full">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center gap-1 px-1 py-1.5 rounded-xl font-black text-[9px] transition-all flex-[1_0_calc(33.333%-0.5rem)] sm:flex-1 sm:px-3 sm:py-2 sm:text-xs sm:rounded-2xl ${
                  activeTab === tab.id
                    ? "bg-white text-emerald-700 shadow-lg scale-[0.97] sm:scale-105"
                    : "text-white/70 hover:text-white"
                }`}
              >
                <tab.icon size={12} className="sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate max-w-[40px] sm:max-w-none sm:inline">{tab.id === "bank" ? "Тесты" : tab.id === "sections" ? "Темы" : tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 md:px-6 space-y-6">
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
          />
        )}

        {activeTab === "students" && (
          <StudentsTab students={students} navigate={navigate} />
        )}

        {activeTab === "tests_list" && (
          <TestsListTab
            tests={tests}
            onEdit={(test) => {}}
            onDelete={(id) => {}}
            onManage={(test) => setManageTestModal(test)}
            onCreateClick={() => setActiveTab("constructor")}
          />
        )}

        {activeTab === "groups" && (
          <GroupsTab
            groups={groups}
            groupForm={groupForm}
            setGroupForm={setGroupForm}
            onSubmit={handleCreateGroup}
            onEdit={handleEditGroup}
            onDelete={handleDeleteGroup}
            onManageStudents={(g) => setGroupStudentsModal(g)}
            onAssignTest={(g) => setAssignGroupModal(g)}
            onDetail={(g) => setGroupDetailModal(g)}
            navigate={navigate}
          />
        )}
      </main>

      {manageTestModal && (
        <TestManageModal
          test={manageTestModal}
          students={students}
          onClose={() => setManageTestModal(null)}
          onAssign={handleAssignTest}
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

      {/* Floating indicator */}
      {selectedTasks.length > 0 && activeTab !== "constructor" && (
        <div className="fixed bottom-6 right-6 z-40">
          <button onClick={() => setActiveTab("constructor")}
            className="flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-2xl hover:bg-emerald-700 transition-all">
            <ClipboardList size={14} /> Тест: {selectedTasks.length} заданий
          </button>
        </div>
      )}
    </div>
  );
}

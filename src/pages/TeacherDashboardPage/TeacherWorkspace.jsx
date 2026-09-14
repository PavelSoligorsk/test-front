import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../../shared/api';
import { restoreSession } from '../../shared/lib/session';
import { formatApiDetail } from '../../shared/ui';
import { TEACHER_PATHS } from './teacherPaths';

const TeacherWorkspaceContext = createContext(null);

function authHeaders() {
  const user = restoreSession();
  const token = user?.token || user?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function TeacherWorkspaceProvider({ children }) {
  const navigate = useNavigate();
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tests, setTests] = useState([]);
  const [students, setStudents] = useState([]);
  const [groups, setGroups] = useState([]);
  const [topicSectionMeta, setTopicSectionMeta] = useState({});
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [manageTestModal, setManageTestModal] = useState(null);
  const [groupStudentsModal, setGroupStudentsModal] = useState(null);
  const [assignGroupModal, setAssignGroupModal] = useState(null);
  const [groupDetailModal, setGroupDetailModal] = useState(null);
  const [groupCreateModal, setGroupCreateModal] = useState(null);
  const [aiGeneratorModal, setAiGeneratorModal] = useState(false);
  const [openSolutions, setOpenSolutions] = useState({});
  const [openHints, setOpenHints] = useState({});
  const [editingTest, setEditingTest] = useState(null);

  const showError = useCallback((err, fallback) => {
    setNotice({ tone: 'error', text: formatApiDetail(err?.response?.data?.detail, fallback) });
  }, []);
  const showSuccess = useCallback((text) => setNotice({ tone: 'success', text }), []);
  const clearNotice = useCallback(() => setNotice(null), []);

  const fetchTests = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/teacher/tests`, { headers: authHeaders() });
      setTests(res.data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchStudents = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/teacher/students`, { headers: authHeaders() });
      setStudents(res.data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchGroups = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/teacher/groups/`, { headers: authHeaders() });
      setGroups(res.data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchTopicSectionMeta = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/teacher/tasks-meta-by-topic-section`, { headers: authHeaders() });
      setTopicSectionMeta(res.data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchTests(), fetchStudents(), fetchGroups(), fetchTopicSectionMeta()])
      .finally(() => setLoading(false));
  }, [fetchTests, fetchStudents, fetchGroups, fetchTopicSectionMeta]);

  const toggleTaskSelection = useCallback((task) => {
    setSelectedTasks((prev) => {
      const exists = prev.find((t) => t.id === task.id);
      return exists ? prev.filter((t) => t.id !== task.id) : [...prev, task];
    });
  }, []);

  const handleSaveGroupFromModal = async (data) => {
    try {
      let groupId = data.id;
      if (data.id) {
        await axios.put(`${API_BASE}/teacher/groups/${data.id}`, { name: data.name, description: data.description }, { headers: authHeaders() });
      } else {
        const res = await axios.post(`${API_BASE}/teacher/groups/`, { name: data.name, description: data.description }, { headers: authHeaders() });
        groupId = res.data.id;
      }
      if (data.student_ids?.length && groupId) {
        await axios.post(`${API_BASE}/teacher/groups/${groupId}/students`, { student_ids: data.student_ids }, { headers: authHeaders() });
      }
      setGroupCreateModal(null);
      fetchGroups();
      showSuccess('Группа сохранена');
    } catch (e) {
      showError(e, 'Ошибка при сохранении группы');
      throw e;
    }
  };

  const handleDeleteGroup = async (groupId, groupName) => {
    if (!confirm(`Удалить группу "${groupName || groupId}"? Это действие нельзя отменить.`)) return;
    try {
      await axios.delete(`${API_BASE}/teacher/groups/${groupId}`, { headers: authHeaders() });
      fetchGroups();
    } catch (e) {
      showError(e, 'Ошибка при удалении группы');
    }
  };

  const handleAddStudentsToGroup = async (groupId, studentIds) => {
    try {
      await axios.post(`${API_BASE}/teacher/groups/${groupId}/students`, { student_ids: studentIds }, { headers: authHeaders() });
      fetchGroups();
      setGroupStudentsModal(null);
    } catch (e) {
      showError(e, 'Ошибка при добавлении студентов');
    }
  };

  const handleRemoveStudentFromGroup = async (groupId, studentId) => {
    try {
      await axios.delete(`${API_BASE}/teacher/groups/${groupId}/students/${studentId}`, { headers: authHeaders() });
      await fetchGroups();
      return true;
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const handleAssignTestToGroup = async (testId, groupId) => {
    try {
      await axios.post(`${API_BASE}/teacher/assign-test-to-group`, { test_id: testId, group_id: groupId }, { headers: authHeaders() });
      setAssignGroupModal(null);
      showSuccess('Тест назначен группе');
    } catch (e) {
      showError(e, 'Ошибка при назначении теста');
    }
  };

  const handleAssignTest = async (data) => {
    try {
      await axios.post(`${API_BASE}/teacher/assign-test`, data, { headers: authHeaders() });
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const handleGenerateAiTest = async (aiParams) => {
    try {
      const res = await axios.post(`${API_BASE}/teacher/generate-test`, aiParams, { headers: authHeaders() });
      const generated = res.data;
      if (generated.tasks?.length) {
        setSelectedTasks(generated.tasks);
        setEditingTest({
          id: generated.id,
          title: generated.title || '',
          target_class: generated.target_class || '',
          target_topic: generated.target_topic || '',
          is_autocompile: false,
          task_ids: generated.tasks.map((t) => t.id),
          is_active: true,
          max_attempts: generated.max_attempts ?? null,
          time_limit_minutes: generated.time_limit_minutes ?? null,
          allow_interruptions: generated.allow_interruptions ?? true,
          exam_start: generated.exam_start || '',
          exam_end: generated.exam_end || '',
        });
      }
      setAiGeneratorModal(false);
      navigate(TEACHER_PATHS.constructor);
      fetchTests();
    } catch (e) {
      showError(e, 'Ошибка при генерации теста. Попробуйте другой запрос.');
      throw e;
    }
  };

  const handleEditTest = async (test) => {
    try {
      const res = await axios.get(`${API_BASE}/teacher/tests/${test.id}`, { headers: authHeaders() });
      setSelectedTasks(res.data.tasks || []);
      setEditingTest(res.data);
      navigate(TEACHER_PATHS.constructor);
    } catch (e) {
      showError(e, 'Не удалось загрузить тест для редактирования');
    }
  };

  const handleDeleteTest = async (testId) => {
    if (!confirm('Удалить тест? Это действие нельзя отменить.')) return;
    try {
      await axios.delete(`${API_BASE}/teacher/tests/${testId}`, { headers: authHeaders() });
      fetchTests();
    } catch (e) {
      showError(e, 'Ошибка при удалении теста');
    }
  };

  const value = useMemo(() => ({
    notice,
    clearNotice,
    showError,
    showSuccess,
    loading,
    tests,
    students,
    groups,
    topicSectionMeta,
    selectedTasks,
    setSelectedTasks,
    manageTestModal,
    setManageTestModal,
    groupStudentsModal,
    setGroupStudentsModal,
    assignGroupModal,
    setAssignGroupModal,
    groupDetailModal,
    setGroupDetailModal,
    groupCreateModal,
    setGroupCreateModal,
    aiGeneratorModal,
    setAiGeneratorModal,
    openSolutions,
    openHints,
    editingTest,
    setEditingTest,
    fetchTests,
    fetchStudents,
    fetchGroups,
    toggleTaskSelection,
    onToggleSolution: (id) => setOpenSolutions((p) => ({ ...p, [id]: !p[id] })),
    onToggleHint: (id) => setOpenHints((p) => ({ ...p, [id]: !p[id] })),
    handleSaveGroupFromModal,
    handleDeleteGroup,
    handleAddStudentsToGroup,
    handleRemoveStudentFromGroup,
    handleAssignTestToGroup,
    handleAssignTest,
    handleGenerateAiTest,
    handleEditTest,
    handleDeleteTest,
  }), [
    notice, loading, tests, students, groups, topicSectionMeta, selectedTasks,
    manageTestModal, groupStudentsModal, assignGroupModal, groupDetailModal,
    groupCreateModal, aiGeneratorModal, openSolutions, openHints, editingTest,
    clearNotice, showError, showSuccess, fetchTests, fetchStudents, fetchGroups,
    toggleTaskSelection,
  ]);

  return (
    <TeacherWorkspaceContext.Provider value={value}>
      {children}
    </TeacherWorkspaceContext.Provider>
  );
}

export function useTeacherWorkspace() {
  const ctx = useContext(TeacherWorkspaceContext);
  if (!ctx) throw new Error('useTeacherWorkspace must be used within TeacherWorkspaceProvider');
  return ctx;
}

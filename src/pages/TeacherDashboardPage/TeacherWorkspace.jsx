import { useCallback, useEffect, useState } from 'react';
import apiClient from '../../shared/api';
import { useNavigate } from 'react-router-dom';
import { formatApiDetail, useConfirm } from '../../shared/ui';
import { TEACHER_PATHS } from './teacherPaths';
import { TeacherWorkspaceContext } from './teacherWorkspaceContext';

function getTeacher(path) {
  return apiClient.get(`/teacher/${path}`).then((res) => res.data);
}

export function TeacherWorkspaceProvider({ children }) {
  const confirm = useConfirm();
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

  // Списки кабинета. Ошибка только в консоль — на экране остаётся прежний список.
  const fetchTests = useCallback(() => getTeacher('tests').then(setTests, console.error), []);
  const fetchStudents = useCallback(() => getTeacher('students').then(setStudents, console.error), []);
  const fetchGroups = useCallback(() => getTeacher('groups/').then(setGroups, console.error), []);
  const fetchTopicSectionMeta = useCallback(
    () => getTeacher('tasks-meta-by-topic-section').then(setTopicSectionMeta, console.error),
    [],
  );

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
        await apiClient.put(`/teacher/groups/${data.id}`, { name: data.name, description: data.description });
      } else {
        const res = await apiClient.post(`/teacher/groups/`, { name: data.name, description: data.description });
        groupId = res.data.id;
      }
      if (data.student_ids?.length && groupId) {
        await apiClient.post(`/teacher/groups/${groupId}/students`, { student_ids: data.student_ids });
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
    if (!(await confirm(`Удалить группу "${groupName || groupId}"? Это действие нельзя отменить.`, { danger: true, confirmLabel: 'Удалить' }))) return;
    try {
      await apiClient.delete(`/teacher/groups/${groupId}`);
      fetchGroups();
    } catch (e) {
      showError(e, 'Ошибка при удалении группы');
    }
  };

  const handleAddStudentsToGroup = async (groupId, studentIds) => {
    try {
      await apiClient.post(`/teacher/groups/${groupId}/students`, { student_ids: studentIds });
      fetchGroups();
      setGroupStudentsModal(null);
    } catch (e) {
      showError(e, 'Ошибка при добавлении студентов');
    }
  };

  const handleRemoveStudentFromGroup = async (groupId, studentId) => {
    try {
      await apiClient.delete(`/teacher/groups/${groupId}/students/${studentId}`);
      await fetchGroups();
      return true;
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const handleAssignTestToGroup = async (testId, groupId) => {
    try {
      await apiClient.post(`/teacher/assign-test-to-group`, { test_id: testId, group_id: groupId });
      showSuccess('Тест назначен группе');
    } catch (e) {
      showError(e, 'Ошибка при назначении теста');
      throw e;
    }
  };

  const handleAssignTest = async (data) => {
    try {
      await apiClient.post(`/teacher/assign-test`, data);
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const handleGenerateAiTest = async (aiParams) => {
    try {
      const res = await apiClient.post(`/teacher/generate-test`, aiParams);
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
      const res = await apiClient.get(`/teacher/tests/${test.id}`);
      setSelectedTasks(res.data.tasks || []);
      setEditingTest(res.data);
      navigate(TEACHER_PATHS.constructor);
    } catch (e) {
      showError(e, 'Не удалось загрузить тест для редактирования');
    }
  };

  const handleDeleteTest = async (testId) => {
    if (!(await confirm('Удалить тест? Это действие нельзя отменить.', { danger: true, confirmLabel: 'Удалить' }))) return;
    try {
      await apiClient.delete(`/teacher/tests/${testId}`);
      fetchTests();
    } catch (e) {
      showError(e, 'Ошибка при удалении теста');
    }
  };

  // Обработчики пересоздаются на каждый рендер — useMemo с неполным списком зависимостей тут не нужен.
  const value = {
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
  };

  return (
    <TeacherWorkspaceContext.Provider value={value}>
      {children}
    </TeacherWorkspaceContext.Provider>
  );
}

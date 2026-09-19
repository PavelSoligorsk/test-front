import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { INITIAL_TASK_STATE } from './constants';
import {
  fetchUsers, fetchTasks, fetchTasksMeta, fetchAllowedEmails, fetchTheoryMeta,
  createTask, updateTask, createTheory, updateTheory, deleteTheory,
  addAllowedEmail, deleteAllowedEmail, rebuildStaticTests,
} from './api';
import { formatApiDetail } from '../../shared/ui';
import { ADMIN_PATHS } from './adminPaths';
import { nextArticlePriority } from '../../shared/lib/theoryMeta';

const AdminWorkspaceContext = createContext(null);

export function AdminWorkspaceProvider({ children }) {
  const navigate = useNavigate();
  const [notice, setNotice] = useState(null);
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [tasksMeta, setTasksMeta] = useState(null);
  const [allowedEmails, setAllowedEmails] = useState([]);
  const [newEmail, setNewEmail] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [taskData, setTaskData] = useState(INITIAL_TASK_STATE);
  const [returnContext, setReturnContext] = useState({
    sourceTab: null, bankClass: null, bankTopic: null, bankSection: null, scrollPosition: 0, resultId: null,
  });
  const [bankClass, setBankClass] = useState(null);
  const [bankTopic, setBankTopic] = useState(null);
  const [theoryMeta, setTheoryMeta] = useState({});
  const [theoryData, setTheoryData] = useState({
    id: null, topic: '', section: '', content: '', theory_class: 5, priority: 0,
  });
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  const [selectedTheoryClass, setSelectedTheoryClass] = useState(5);
  const [loading, setLoading] = useState(true);

  const showError = useCallback((err, fallback) => {
    setNotice({ tone: 'error', text: formatApiDetail(err?.response?.data?.detail, fallback) });
  }, []);
  const showSuccess = useCallback((text) => setNotice({ tone: 'success', text }), []);
  const clearNotice = useCallback(() => setNotice(null), []);

  useEffect(() => {
    (async () => {
      try {
        const [usersData, tasksMetaData, emailsData, theoryMetaData] = await Promise.all([
          fetchUsers(), fetchTasksMeta(), fetchAllowedEmails(), fetchTheoryMeta(),
        ]);
        setUsers(usersData);
        setTasksMeta(tasksMetaData);
        setAllowedEmails(emailsData);
        setTheoryMeta(theoryMetaData || {});
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const editTaskId = sessionStorage.getItem('editTaskId');
    if (editTaskId) {
      sessionStorage.removeItem('editTaskId');
      const task = tasks.find((t) => t.id === parseInt(editTaskId, 10));
      if (task) {
        setTaskData({
          ...task,
          options: task.options
            ? (Array.isArray(task.options) ? task.options.join('; ') : task.options)
            : '',
        });
        navigate(ADMIN_PATHS.create);
      }
    }
    const savedContext = sessionStorage.getItem('adminReturnContext');
    if (savedContext) {
      setReturnContext(JSON.parse(savedContext));
      sessionStorage.removeItem('adminReturnContext');
    }
  }, [tasks, navigate]);

  const availableClasses = useMemo(() => {
    if (!tasksMeta) return [];
    return Object.keys(tasksMeta).sort((a, b) => {
      const numA = parseInt(a, 10);
      const numB = parseInt(b, 10);
      if (!Number.isNaN(numA) && !Number.isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    });
  }, [tasksMeta]);

  const filteredUsers = users.filter((u) => {
    const match = (`${u.first_name}${u.last_name}${u.username}`).toLowerCase().includes(userSearch.toLowerCase());
    const role = userRoleFilter === 'all' || u.role === userRoleFilter;
    return match && role;
  });

  const refreshTheoryMeta = useCallback(async () => {
    setTheoryMeta((await fetchTheoryMeta()) || {});
  }, []);

  const handleTheorySubmit = async (e, draft) => {
    e.preventDefault();
    const data = draft || theoryData;
    const theoryClass = Number(data.theory_class);
    const payload = {
      topic: data.topic,
      section: data.section,
      content: data.content,
      theory_class: theoryClass,
    };
    if (!data.id) payload.priority = nextArticlePriority(theoryMeta, theoryClass);
    try {
      if (data.id) {
        await updateTheory(data.id, payload);
        showSuccess('Теория обновлена');
      } else {
        await createTheory(payload);
        showSuccess('Теория создана');
      }
      setTheoryData({ id: null, topic: '', section: '', content: '', theory_class: theoryClass, priority: 0 });
      await refreshTheoryMeta();
    } catch (err) {
      showError(err, 'Ошибка при сохранении');
    }
  };

  const handleDeleteTheory = async (id) => {
    if (!confirm('Удалить теоретический материал?')) return;
    try {
      await deleteTheory(id);
      const classKey = String(selectedTheoryClass);
      if (
        selectedTopic
        && selectedSection
        && theoryMeta?.[classKey]?.[selectedTopic]?.sections?.[selectedSection] === id
      ) {
        setSelectedSection(null);
      }
      await refreshTheoryMeta();
    } catch (err) {
      showError(err, 'Ошибка при удалении');
    }
  };

  const handleTaskSubmit = async (e) => {
    e.preventDefault();
    const finalTask = {
      ...taskData,
      task_class: String(taskData.task_class),
      topic_number: String(taskData.topic_number),
      options: taskData.is_open_answer
        ? null
        : (typeof taskData.options === 'string' ? taskData.options.split(';').map((s) => s.trim()) : taskData.options),
    };
    try {
      if (taskData.id) {
        await updateTask(taskData.id, finalTask);
        showSuccess('Задание обновлено');
        if (returnContext.sourceTab === 'result' && returnContext.resultId) {
          const taskId = taskData.id;
          setReturnContext({ sourceTab: null, bankClass: null, bankTopic: null, bankSection: null, scrollPosition: 0, resultId: null });
          setTaskData(INITIAL_TASK_STATE);
          navigate(`/admin/results/${returnContext.resultId}`);
          setTimeout(() => {
            const el = document.querySelector(`[data-task-id="${taskId}"]`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 500);
          return;
        }
        if (returnContext.sourceTab === 'bank' && returnContext.bankTopic && returnContext.bankClass) {
          setBankClass(returnContext.bankClass);
          setBankTopic(returnContext.bankTopic);
          navigate(ADMIN_PATHS.bank);
          setTimeout(() => { window.scrollTo({ top: returnContext.scrollPosition, behavior: 'smooth' }); }, 500);
        }
        setReturnContext({ sourceTab: null, bankClass: null, bankTopic: null, bankSection: null, scrollPosition: 0, resultId: null });
        setTaskData(INITIAL_TASK_STATE);
      } else {
        await createTask(finalTask);
        showSuccess('Задание создано');
        setTaskData({
          ...INITIAL_TASK_STATE,
          task_class: taskData.task_class,
          topic: taskData.topic,
          section: taskData.section,
          topic_number: taskData.topic_number,
          difficulty: taskData.difficulty,
          is_open_answer: taskData.is_open_answer,
        });
      }
      const tasksData = await fetchTasks();
      setTasks(tasksData);
    } catch (err) {
      showError(err, 'Ошибка при сохранении');
    }
  };

  const handleEditTask = (task) => {
    setReturnContext({ sourceTab: 'bank', bankClass, bankTopic, scrollPosition: window.scrollY, resultId: null });
    setTaskData({
      ...task,
      options: task.options
        ? (Array.isArray(task.options) ? task.options.join('; ') : task.options)
        : '',
    });
    navigate(ADMIN_PATHS.create);
  };

  const handleCancelEdit = () => {
    if (returnContext.sourceTab === 'bank' && returnContext.bankTopic && returnContext.bankClass) {
      setBankClass(returnContext.bankClass);
      setBankTopic(returnContext.bankTopic);
      navigate(ADMIN_PATHS.bank);
      setTimeout(() => window.scrollTo({ top: returnContext.scrollPosition, behavior: 'smooth' }), 300);
      setReturnContext({ sourceTab: null, bankClass: null, bankTopic: null, bankSection: null, scrollPosition: 0, resultId: null });
    }
    setTaskData(INITIAL_TASK_STATE);
  };

  const handleAddEmail = async (e) => {
    e.preventDefault();
    try {
      const res = await addAllowedEmail(newEmail);
      setAllowedEmails([...allowedEmails, res]);
      setNewEmail('');
      showSuccess('Email добавлен');
    } catch (err) {
      showError(err, 'Ошибка при добавлении');
    }
  };

  const handleDeleteEmail = async (emailString) => {
    if (!confirm(`Удалить ${emailString} из списка?`)) return;
    try {
      await deleteAllowedEmail(emailString);
      setAllowedEmails((prev) => prev.filter((item) => item.email !== emailString));
    } catch (err) {
      showError(err, 'Ошибка при удалении');
    }
  };

  const handleGlobalSync = async () => {
    if (!confirm('Запустить пересборку статики?')) return;
    try {
      await rebuildStaticTests();
      showSuccess('Синхронизация завершена');
    } catch (err) {
      showError(err, 'Ошибка синхронизации');
    }
  };

  const handleUsersUpdate = async () => {
    setUsers(await fetchUsers());
  };

  const refreshTasksMeta = async () => {
    setTasksMeta(await fetchTasksMeta());
  };

  const value = useMemo(() => ({
    notice, clearNotice, showError, showSuccess, loading,
    users, tasks, tasksMeta, allowedEmails, newEmail, setNewEmail,
    userSearch, setUserSearch, userRoleFilter, setUserRoleFilter,
    taskData, setTaskData, bankClass, setBankClass, bankTopic, setBankTopic,
    theoryMeta, theoryData, setTheoryData, selectedTopic, setSelectedTopic,
    selectedSection, setSelectedSection, selectedTheoryClass, setSelectedTheoryClass, availableClasses, filteredUsers,
    handleTaskSubmit, handleEditTask, handleCancelEdit,
    handleAddEmail, handleDeleteEmail, handleGlobalSync,
    handleTheorySubmit, handleDeleteTheory, handleUsersUpdate, refreshTasksMeta, refreshTheoryMeta,
  }), [
    notice, loading, users, tasks, tasksMeta, allowedEmails, newEmail,
    userSearch, userRoleFilter, taskData, bankClass, bankTopic, theoryMeta,
    theoryData, selectedTopic, selectedSection, selectedTheoryClass, availableClasses, filteredUsers,
    clearNotice, showError, showSuccess, refreshTheoryMeta,
  ]);

  return (
    <AdminWorkspaceContext.Provider value={value}>
      {children}
    </AdminWorkspaceContext.Provider>
  );
}

export function useAdminWorkspace() {
  const ctx = useContext(AdminWorkspaceContext);
  if (!ctx) throw new Error('useAdminWorkspace must be used within AdminWorkspaceProvider');
  return ctx;
}

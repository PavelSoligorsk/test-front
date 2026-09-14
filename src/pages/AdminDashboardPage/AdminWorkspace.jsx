import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { INITIAL_TASK_STATE } from './constants';
import {
  fetchUsers, fetchTasks, fetchTasksMeta, fetchAllowedEmails, fetchTheoryList,
  createTask, updateTask, createTheory, updateTheory, deleteTheory,
  addAllowedEmail, deleteAllowedEmail, rebuildStaticTests,
} from './api';
import { formatApiDetail } from '../../shared/ui';
import { ADMIN_PATHS } from './adminPaths';

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
  const [theoryList, setTheoryList] = useState([]);
  const [theoryData, setTheoryData] = useState({ id: null, topic: '', section: '', content: '' });
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  const [loading, setLoading] = useState(true);

  const showError = useCallback((err, fallback) => {
    setNotice({ tone: 'error', text: formatApiDetail(err?.response?.data?.detail, fallback) });
  }, []);
  const showSuccess = useCallback((text) => setNotice({ tone: 'success', text }), []);
  const clearNotice = useCallback(() => setNotice(null), []);

  useEffect(() => {
    (async () => {
      try {
        const [usersData, tasksMetaData, emailsData, theoryDataList] = await Promise.all([
          fetchUsers(), fetchTasksMeta(), fetchAllowedEmails(), fetchTheoryList(),
        ]);
        setUsers(usersData);
        setTasksMeta(tasksMetaData);
        setAllowedEmails(emailsData);
        setTheoryList(theoryDataList);
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

  const groupedTheory = useMemo(() => theoryList.reduce((acc, theory) => {
    if (!acc[theory.topic]) acc[theory.topic] = {};
    if (!acc[theory.topic][theory.section]) acc[theory.topic][theory.section] = [];
    acc[theory.topic][theory.section].push(theory);
    return acc;
  }, {}), [theoryList]);

  const filteredTheory = useMemo(() => {
    if (!selectedTopic) return [];
    if (!selectedSection) {
      return Object.keys(groupedTheory[selectedTopic] || {}).map((section) => ({
        section,
        theories: groupedTheory[selectedTopic][section],
      }));
    }
    return groupedTheory[selectedTopic]?.[selectedSection] || [];
  }, [groupedTheory, selectedTopic, selectedSection]);

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

  const handleTheorySubmit = async (e) => {
    e.preventDefault();
    try {
      if (theoryData.id) {
        await updateTheory(theoryData.id, { topic: theoryData.topic, section: theoryData.section, content: theoryData.content });
        showSuccess('Теория обновлена');
      } else {
        await createTheory({ topic: theoryData.topic, section: theoryData.section, content: theoryData.content });
        showSuccess('Теория создана');
      }
      setTheoryData({ id: null, topic: '', section: '', content: '' });
      setTheoryList(await fetchTheoryList());
    } catch (err) {
      showError(err, 'Ошибка при сохранении');
    }
  };

  const handleDeleteTheory = async (id) => {
    if (!confirm('Удалить теоретический материал?')) return;
    try {
      await deleteTheory(id);
      setTheoryList(await fetchTheoryList());
    } catch (err) {
      showError(err, 'Ошибка при удалении');
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
    theoryList, theoryData, setTheoryData, selectedTopic, setSelectedTopic,
    selectedSection, setSelectedSection, availableClasses, filteredUsers,
    groupedTheory, filteredTheory,
    handleTaskSubmit, handleEditTask, handleCancelEdit,
    handleAddEmail, handleDeleteEmail, handleGlobalSync,
    handleTheorySubmit, handleDeleteTheory, handleUsersUpdate, refreshTasksMeta,
  }), [
    notice, loading, users, tasks, tasksMeta, allowedEmails, newEmail,
    userSearch, userRoleFilter, taskData, bankClass, bankTopic, theoryList,
    theoryData, selectedTopic, selectedSection, availableClasses, filteredUsers,
    groupedTheory, filteredTheory, clearNotice, showError, showSuccess,
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

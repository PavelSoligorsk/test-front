import axios from 'axios';
import { API_BASE } from '../../shared/api';
import { restoreSession } from '../../shared/lib/session';

function auth() {
  const user = restoreSession();
  const token = user?.token || user?.access_token;
  return { headers: token ? { Authorization: `Bearer ${token}` } : {} };
}

async function get(path, params) {
  const res = await axios.get(`${API_BASE}${path}`, { ...auth(), ...(params ? { params } : {}) });
  return res.data;
}

export const fetchTasksMetaByClass = () => get('/teacher/tasks-meta');
export const fetchTasksMetaByTopic = () => get('/teacher/tasks-meta-by-topic-section');
export const fetchTasksByClass = (taskClass, topicNumber) => get('/teacher/tasks/by-class/', { task_class: taskClass, topic_number: topicNumber });
export const fetchTasksByTopic = (topic, section) => get(`/teacher/tasks/by-topic/${encodeURIComponent(topic)}/section/${encodeURIComponent(section)}`);
export const fetchTests = () => get('/teacher/tests');
export const fetchTest = (id) => get(`/teacher/tests/${id}`);

export function taskOptions(task) {
  const raw = task?.options;
  if (Array.isArray(raw)) return raw.map((item) => String(item ?? '')).filter((item) => item.trim());
  if (typeof raw === 'string' && raw.trim()) return raw.split(';').map((item) => item.trim()).filter(Boolean);
  return [];
}

export function metaCount(value) {
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object') return Object.values(value).reduce((sum, item) => sum + metaCount(item), 0);
  return 0;
}

export function sortKeys(keys) {
  return [...keys].sort((a, b) => {
    const left = parseInt(a, 10);
    const right = parseInt(b, 10);
    if (!Number.isNaN(left) && !Number.isNaN(right) && left !== right) return left - right;
    return String(a).localeCompare(String(b), 'ru');
  });
}

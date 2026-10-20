import axios from 'axios';
import { API_BASE } from '../../shared/api';
import { restoreSession } from '../../shared/lib/session';

function auth() {
  const user = restoreSession();
  const token = user?.token || user?.access_token;
  return { headers: token ? { Authorization: `Bearer ${token}` } : {} };
}

async function get(path) {
  const res = await axios.get(`${API_BASE}${path}`, auth());
  return res.data;
}

export const fetchStudents = () => get('/teacher/students');
export const fetchGroupStudents = (groupId) => get(`/teacher/groups/${groupId}/students`);
export const fetchGroupAssignments = (groupId) => get(`/teacher/groups/${groupId}/assignments`);
export const fetchGroupReview = (groupId, testId) => get(`/teacher/groups/${groupId}/tests/${testId}/review`);
export const fetchStudentAssignments = (studentId) => get(`/teacher/student/${studentId}/assignments`);
export const fetchStudentHistory = (studentId) => get(`/teacher/students-history/${studentId}`);
export const fetchResult = (resultId) => get(`/teacher/results/${resultId}`);

export const NO_ANSWER = 'Нет ответа';

export function studentName(student) {
  if (!student) return '';
  const full = [student.last_name, student.first_name].filter(Boolean).join(' ').trim();
  return full || student.student_name || student.username || `Ученик ${student.id ?? student.student_id ?? ''}`;
}

export function optionList(raw) {
  if (Array.isArray(raw)) return raw.map((item) => String(item ?? '').trim()).filter(Boolean);
  if (typeof raw === 'string' && raw.trim()) return raw.split(';').map((item) => item.trim()).filter(Boolean);
  return [];
}

// Ответ на задание с вариантами хранится номерами через запятую.
export function answerText(raw, options) {
  const text = String(raw ?? '').trim();
  if (!text || text === NO_ANSWER) return '';
  const parts = text.split(',').map((part) => part.trim()).filter(Boolean);
  if (options.length && parts.every((part) => /^\d+$/.test(part) && Number(part) >= 1 && Number(part) <= options.length)) {
    return parts.map((part) => `${part}. ${options[Number(part) - 1]}`).join('; ');
  }
  return text;
}

export function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function percentOf(points, max) {
  if (!Number.isFinite(points) || !Number.isFinite(max) || max <= 0) return null;
  return Math.round((points / max) * 100);
}

import axios from 'axios';
import { API_BASE } from './constants';

export const getAuthHeaders = () => {
  try {
    const sessionStr = localStorage.getItem('edu_session');
    if (!sessionStr) return {};
    const session = JSON.parse(sessionStr);
    const token = session?.token || session?.access_token;
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  } catch (e) {
    console.error('Ошибка чтения сессии:', e);
    return {};
  }
};

// Users
export const fetchUsers = async () => {
  const res = await axios.get(`${API_BASE}/admin/users`);
  return res.data;
};

export const changeUserRole = async (userId, newRole) => {
  await axios.patch(`${API_BASE}/admin/users/${userId}/role?new_role=${newRole}`);
};

export const deleteUser = async (userId) => {
  await axios.delete(`${API_BASE}/admin/users/${userId}`);
};

export const assignStudentToTeacher = async (teacherId, studentId) => {
  await axios.post(`${API_BASE}/admin/assign-student-to-teacher`, { teacher_id: teacherId, student_id: studentId }, { headers: getAuthHeaders() });
};

export const removeStudentFromTeacher = async (studentId) => {
  await axios.delete(`${API_BASE}/admin/remove-student-from-teacher/${studentId}`, { headers: getAuthHeaders() });
};

// Tasks
export const fetchTasks = async () => {
  const res = await axios.get(`${API_BASE}/admin/`);
  return res.data;
};

export const fetchTask = async (taskId) => {
  const res = await axios.get(`${API_BASE}/admin/${taskId}`);
  return res.data;
};

export const createTask = async (taskData) => {
  await axios.post(`${API_BASE}/admin/tasks`, taskData);
};

export const updateTask = async (taskId, taskData) => {
  await axios.put(`${API_BASE}/admin/tasks/${taskId}`, taskData);
};

export const deleteTask = async (taskId) => {
  await axios.delete(`${API_BASE}/admin/tasks/${taskId}`);
};

export const sendTaskToTelegram = async (taskId) => {
  const targetChatId = '-1003969044702';
  await axios.post(`${API_BASE}/admin/tasks/${taskId}/send-to-tg?chat_id=${encodeURIComponent(targetChatId)}`);
};

// Email access
export const fetchAllowedEmails = async () => {
  const res = await axios.get(`${API_BASE}/admin/allowed/emails`, { headers: getAuthHeaders() });
  return res.data;
};

export const addAllowedEmail = async (email) => {
  const res = await axios.post(`${API_BASE}/admin/allowed-emails`, { email });
  return res.data;
};

export const deleteAllowedEmail = async (emailString) => {
  await axios.delete(`${API_BASE}/admin/allowed-emails/${emailString}`);
};

// Theory
export const fetchTheoryList = async () => {
  const res = await axios.get(`${API_BASE}/admin/theory/getall`, { headers: getAuthHeaders() });
  return res.data;
};

export const createTheory = async (data) => {
  await axios.post(`${API_BASE}/admin/theory`, data, { headers: getAuthHeaders() });
};

export const updateTheory = async (id, data) => {
  await axios.put(`${API_BASE}/admin/theory/${id}`, data, { headers: getAuthHeaders() });
};

export const deleteTheory = async (id) => {
  await axios.delete(`${API_BASE}/admin/theory/${id}`, { headers: getAuthHeaders() });
};

// Global
export const rebuildStaticTests = async () => {
  await axios.post(`${API_BASE}/admin/rebuild-all-static-tests`);
};

// Image upload
export const uploadImage = async (base64) => {
  const res = await fetch(`${API_BASE}/admin/upload-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ image: base64 }),
  });
  if (!res.ok) throw new Error('Upload failed');
  const data = await res.json();
  return 'https://pub-2b7cf8fddd9747b69e66cdac8a86c7fd.r2.dev/' + data.filename;
};

// Results
export const fetchAdminResult = async (resultId) => {
  const token = JSON.parse(localStorage.getItem('edu_session'))?.token;
  const res = await axios.get(`${API_BASE}/admin/results/${resultId}`, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
};

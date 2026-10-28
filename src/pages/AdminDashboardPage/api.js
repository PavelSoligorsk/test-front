import apiClient from '../../shared/api';

// Users
export const fetchUsers = async () => {
  const res = await apiClient.get(`/admin/users`);
  return res.data;
};

export const changeUserRole = async (userId, newRole) => {
  await apiClient.patch(`/admin/users/${userId}/role?new_role=${newRole}`);
};

export const deleteUser = async (userId) => {
  await apiClient.delete(`/admin/users/${userId}`);
};

export const assignStudentToTeacher = async (teacherId, studentId) => {
  await apiClient.post(`/admin/assign-student-to-teacher`, { teacher_id: teacherId, student_id: studentId });
};

export const removeStudentFromTeacher = async (studentId) => {
  await apiClient.delete(`/admin/remove-student-from-teacher/${studentId}`);
};

// Tasks
export const fetchTasks = async () => {
  const res = await apiClient.get(`/admin/`);
  return res.data;
};

export const fetchTasksMeta = async () => {
  const res = await apiClient.get(`/admin/tasks-meta`);
  return res.data;
};

export const fetchTasksMetaByTopicSection = async () => {
  const res = await apiClient.get(`/admin/tasks-meta-by-topic-section`);
  return res.data;
};

export const fetchTasksByClassTopic = async (taskClass, topicNumber) => {
  const res = await apiClient.get(`/admin/tasks/by-class/`, {
    params: { task_class: taskClass, topic_number: topicNumber },
  });
  return res.data;
};

export const fetchTasksByTopicSection = async (topic, section) => {
  const res = await apiClient.get(`/admin/tasks/by-topic/${encodeURIComponent(topic)}/section/${encodeURIComponent(section)}`);
  return res.data;
};

export const fetchTask = async (taskId) => {
  const res = await apiClient.get(`/admin/${taskId}`);
  return res.data;
};

export const createTask = async (taskData) => {
  await apiClient.post(`/admin/tasks`, taskData);
};

export const updateTask = async (taskId, taskData) => {
  await apiClient.put(`/admin/tasks/${taskId}`, taskData);
};

export const deleteTask = async (taskId) => {
  await apiClient.delete(`/admin/tasks/${taskId}`);
};

// Batch operations
export const createTasksBatch = async (tasks) => {
  const res = await apiClient.post(`/admin/tasks/batch`, { tasks });
  return res.data;
};

export const updateTasksBatch = async (tasks) => {
  const res = await apiClient.put(`/admin/tasks/batch`, { tasks });
  return res.data;
};

export const deleteTasksBatch = async (ids) => {
  const res = await apiClient.delete(`/admin/tasks/batch`, { data: { ids } });
  return res.data;
};

export const sendTaskToTelegram = async (taskId) => {
  const targetChatId = '-1003969044702';
  await apiClient.post(`/admin/tasks/${taskId}/send-to-tg?chat_id=${encodeURIComponent(targetChatId)}`);
};

// Email access
export const fetchAllowedEmails = async () => {
  const res = await apiClient.get(`/admin/allowed/emails`);
  return res.data;
};

export const addAllowedEmail = async (email) => {
  const res = await apiClient.post(`/admin/allowed-emails`, { email });
  return res.data;
};

export const deleteAllowedEmail = async (emailString) => {
  await apiClient.delete(`/admin/allowed-emails/${emailString}`);
};

// Theory
export const fetchTheoryMeta = async () => {
  const res = await apiClient.get(`/admin/theory-meta`);
  return res.data || {};
};

export const fetchTheory = async (id) => {
  const res = await apiClient.get(`/admin/theory/${id}`);
  return res.data;
};

export const createTheory = async (data) => {
  const res = await apiClient.post(`/admin/theory`, data);
  return res.data;
};

export const updateTheory = async (id, data) => {
  const res = await apiClient.put(`/admin/theory/${id}`, data);
  return res.data;
};

export const deleteTheory = async (id) => {
  const res = await apiClient.delete(`/admin/theory/${id}`);
  return res.data;
};

// Classify
export const classifyTasks = async (payload = {}) => {
  // payload: { task_ids: [...], all_tasks: bool }
  const res = await apiClient.post(`/admin/classify-tasks`, payload);
  return res.data;
};

// Global
export const rebuildStaticTests = async () => {
  await apiClient.post(`/admin/rebuild-all-static-tests`);
};

// Image upload
export const uploadImage = async (base64) => {
  const res = await apiClient.post('/admin/upload-image', { image: base64 });
  return 'https://pub-2b7cf8fddd9747b69e66cdac8a86c7fd.r2.dev/' + res.data.filename;
};

// Results
export const fetchAdminResult = async (resultId) => {
  const res = await apiClient.get(`/admin/results/${resultId}`);
  return res.data;
};

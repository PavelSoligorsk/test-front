import apiClient from '../../shared/api';

// Tests
export const fetchStudentTestsMeta = async () => {
  const res = await apiClient.get(`/student/tests-meta`);
  return res.data;
};

export const fetchMyAssignmentsMeta = async () => {
  const res = await apiClient.get(`/student/my-assignments-meta`);
  return res.data;
};

export const fetchAiTests = async () => {
  const res = await apiClient.get(`/student/ai-tests`);
  return res.data;
};

// Profile
export const fetchStudentMe = async () => {
  const res = await apiClient.get(`/student/me`);
  return res.data;
};

export const updateStudentProfile = async (data) => {
  const res = await apiClient.put(`/student/me`, data);
  return res.data;
};

// History
export const fetchStudentHistory = async () => {
  const res = await apiClient.get(`/student/history`);
  return res.data;
};

// Detailed Stats
export const fetchMyDetailedStats = async (period = 'all') => {
  const res = await apiClient.get(`/student/me/stats?period=${period}`);
  return res.data;
};

export const fetchUserDetailedStats = async (userId, period = 'all', role = 'admin') => {
  const path = role === 'teacher'
    ? `/teacher/students/${userId}/stats?period=${period}`
    : `/admin/users/${userId}/stats?period=${period}`;
  const res = await apiClient.get(path);
  return res.data;
};

// Theory
export const fetchTheoryMeta = async () => {
  const res = await apiClient.get(`/student/theory/meta`);
  return res.data || {};
};

export const fetchTheoryTopics = async () => {
  const res = await apiClient.get(`/student/theory/topics`);
  return res.data;
};

export const fetchTheorySections = async (topic) => {
  const res = await apiClient.get(`/student/theory/sections/${topic}`);
  return res.data;
};

export const fetchTheoryByTopicSection = async (topic, section, theoryClass) => {
  const res = await apiClient.get(`/student/theory/by-topic/${encodeURIComponent(topic)}/section/${encodeURIComponent(section)}`,
    {
      params: theoryClass != null && theoryClass !== '' ? { theory_class: theoryClass } : {},
    },
  );
  return res.data;
};

// AI generate
export const generateAiTest = async (prompt, taskCount, difficulty, targetClass, excludeWeeks, useStats) => {
  const res = await apiClient.post(`/student/generate-test`,
    {
      prompt,
      task_count: parseInt(taskCount) || 10,
      difficulty: difficulty === 'none' ? null : difficulty,
      target_class: targetClass !== 'Все' ? targetClass : null,
      exclude_recent_weeks: parseFloat(excludeWeeks) || 0,
      use_stats: !!useStats,
    }
  );
  return res.data;
};

// Start test
export const startAssignedTest = async (testId) => {
  const res = await apiClient.post(`/student/start-test/${testId}`, {});
  return res.data;
};

export const startAiTest = async (testId) => {
  const res = await apiClient.post(`/student/start-ai-test/${testId}`, {});
  return res.data;
};

// Retake
export const retakeTest = async (resultId) => {
  const res = await apiClient.post(`/student/retake/${resultId}`, {});
  return res.data;
};

// Result (timer sync)
export const fetchTestResult = async (resultId) => {
  const res = await apiClient.get(`/student/results/${resultId}`);
  return res.data;
};


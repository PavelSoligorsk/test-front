import axios from 'axios';
import { API_URL } from '../../shared/config';

const API_BASE = API_URL;
const getToken = () => {
  const session = localStorage.getItem('edu_session');
  return session ? JSON.parse(session)?.token : null;
};

const authConfig = () => ({
  headers: { Authorization: `Bearer ${getToken()}` },
});

// Tests
export const fetchStudentTestsMeta = async () => {
  const res = await axios.get(`${API_BASE}/student/tests-meta`, authConfig());
  return res.data;
};

export const fetchMyAssignmentsMeta = async () => {
  const res = await axios.get(`${API_BASE}/student/my-assignments-meta`, authConfig());
  return res.data;
};

export const fetchAiTests = async () => {
  const res = await axios.get(`${API_BASE}/student/ai-tests`, authConfig());
  return res.data;
};

// Profile
export const fetchStudentMe = async () => {
  const res = await axios.get(`${API_BASE}/student/me`, authConfig());
  return res.data;
};

export const updateStudentProfile = async (data) => {
  const res = await axios.put(`${API_BASE}/student/me`, data, authConfig());
  return res.data;
};

// History
export const fetchStudentHistory = async () => {
  const res = await axios.get(`${API_BASE}/student/history`, authConfig());
  return res.data;
};

// Theory
export const fetchTheoryTopics = async () => {
  const res = await axios.get(`${API_BASE}/student/theory/topics`, authConfig());
  return res.data;
};

export const fetchTheorySections = async (topic) => {
  const res = await axios.get(`${API_BASE}/student/theory/sections/${topic}`, authConfig());
  return res.data;
};

export const fetchTheoryByTopicSection = async (topic, section) => {
  const res = await axios.get(`${API_BASE}/student/theory/by-topic/${topic}/section/${section}`, authConfig());
  return res.data;
};

// AI generate
export const generateAiTest = async (prompt, taskCount, difficulty, targetClass) => {
  const res = await axios.post(
    `${API_BASE}/student/generate-test`,
    { prompt, task_count: parseInt(taskCount), difficulty: difficulty === 'none' ? null : difficulty, target_class: targetClass !== 'Все' ? targetClass : null },
    authConfig()
  );
  return res.data;
};


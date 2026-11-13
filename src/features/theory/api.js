import apiClient from '../../shared/api';

export const fetchStudentTheoryMeta = async () => {
  const res = await apiClient.get('/student/theory/meta');
  return res.data || {};
};

export const fetchStudentTheoryArticle = async (topic, section, theoryClass) => {
  const res = await apiClient.get(
    `/student/theory/by-topic/${encodeURIComponent(topic)}/section/${encodeURIComponent(section)}`,
    {
      params: theoryClass != null && theoryClass !== '' ? { theory_class: theoryClass } : {},
    },
  );
  return res.data;
};

export const fetchAdminTheoryMeta = async () => {
  const res = await apiClient.get('/admin/theory-meta');
  return res.data || {};
};

export const fetchAdminTheory = async (id) => {
  const res = await apiClient.get(`/admin/theory/${id}`);
  return res.data;
};

export const createTheory = async (data) => {
  const res = await apiClient.post('/admin/theory', data);
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

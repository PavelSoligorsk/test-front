import { useState, useCallback } from 'react';

export function useTeacher() {
  const [tests, setTests] = useState([]);
  const [groups, setGroups] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTests = useCallback(async () => {
    setLoading(true);
    try {
      const { teacherApi } = await import('../api');
      const response = await teacherApi.getTests();
      setTests(response.data);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка загрузки тестов');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const { teacherApi } = await import('../api');
      const response = await teacherApi.getGroups();
      setGroups(response.data);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка загрузки групп');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const { teacherApi } = await import('../api');
      const response = await teacherApi.getStudents();
      setStudents(response.data);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка загрузки учеников');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    tests,
    groups,
    students,
    loading,
    error,
    fetchTests,
    fetchGroups,
    fetchStudents,
  };
}

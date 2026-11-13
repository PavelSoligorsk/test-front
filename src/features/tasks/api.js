import apiClient from '../../shared/api';

export async function fetchTeacherTasksByClass(taskClass, topicNumber) {
  const res = await apiClient.get('/teacher/tasks/by-class/', {
    params: { task_class: taskClass, topic_number: topicNumber },
  });
  return res.data;
}

export async function fetchTeacherTasksBySection(topic, section) {
  const res = await apiClient.get(
    `/teacher/tasks/by-topic/${encodeURIComponent(topic)}/section/${encodeURIComponent(section)}`,
  );
  return res.data;
}

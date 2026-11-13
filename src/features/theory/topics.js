export const MAIN_TOPICS = {
  numbers: 'Числа и вычисления',
  expressions: 'Выражения и их преобразования',
  equations: 'Уравнения',
  inequalities: 'Неравенства',
  functions: 'Координаты и функции',
  text: 'Текстовые задачи',
  planim: 'Планиметрия',
  stereo: 'Стереометрия',
};

export function topicLabel(topic) {
  if (!topic) return '';
  return MAIN_TOPICS[topic.topic] || topic.label || topic.topic;
}

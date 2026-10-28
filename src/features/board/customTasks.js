import { parse as parseYaml } from 'yaml';
import { imageFileIds } from './images';

function fileIdsOf(task) {
  const ids = new Set();
  imageFileIds({
    props: {
      content: task.content,
      options: task.options,
      teacherOnly: { solution: task.solution, answer: task.answer },
    },
  }).forEach((id) => ids.add(id));
  return [...ids];
}

export function parseCustomTasks(text) {
  if (!String(text || '').trim()) throw new Error('Пустой ввод');
  const parsed = parseYaml(text);
  if (!Array.isArray(parsed)) throw new Error('Должен быть список заданий: каждый блок начинается с «-»');
  if (!parsed.length) throw new Error('Список не может быть пустым');
  if (parsed.length > 50) throw new Error(`За раз можно поставить не больше 50 заданий, у вас ${parsed.length}`);
  return parsed.map((item, index) => {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      throw new Error(`Элемент ${index + 1}: должен быть объектом с полями`);
    }
    if (!item.task_class || !String(item.task_class).trim()) throw new Error(`Элемент ${index + 1}: нет task_class`);
    if (!item.topic_number || !String(item.topic_number).trim()) throw new Error(`Элемент ${index + 1}: нет topic_number`);
    if (!item.content || !String(item.content).trim()) throw new Error(`Элемент ${index + 1}: нет content`);
    if (item.answer === undefined || item.answer === null || String(item.answer).trim() === '') {
      throw new Error(`Элемент ${index + 1}: нет answer`);
    }
    const open = item.is_open_answer !== false;
    const options = Array.isArray(item.options) ? item.options.map((option) => String(option)) : [];
    if (!open && !options.length) throw new Error(`Элемент ${index + 1}: для закрытого задания нужен options`);
    if (item.difficulty != null && (Number(item.difficulty) < 1 || Number(item.difficulty) > 5)) {
      throw new Error(`Элемент ${index + 1}: difficulty должно быть от 1 до 5`);
    }
    return {
      content: String(item.content),
      answer: String(item.answer),
      solution: item.solution ? String(item.solution) : '',
      is_open_answer: open,
      options,
      imageIds: fileIdsOf({
        content: item.content,
        options,
        solution: item.solution,
        answer: item.answer,
      }),
    };
  });
}

export const CUSTOM_TASK_EXAMPLE = `- task_class: "10"
  topic_number: "1"
  content: |
    Найдите значение $2+2$.
  answer: "4"
  is_open_answer: true
  difficulty: 1

- task_class: "10"
  topic_number: "1"
  content: Сколько корней у $x^2+1=0$?
  options:
    - "0"
    - "1"
    - "2"
  answer: "0"
  is_open_answer: false
  difficulty: 1`;

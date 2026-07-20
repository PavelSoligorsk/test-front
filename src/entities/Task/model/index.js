/**
 * Проверка типа задания
 */
export function isMultipleChoice(task) {
  return task?.type === 'multiple' || (task?.options && task.options.length > 1);
}

export function isSingleChoice(task) {
  return task?.type === 'single' || (task?.options && !task.options.some(o => o.includes(',')));
}

export function isTextInput(task) {
  return task?.type === 'text' || !task?.options;
}

export function isDrawing(task) {
  return task?.type === 'drawing';
}

function isClosedExamTask(task) {
  if (task?.is_open_answer === true) return false;
  if (task?.is_open_answer === false) return true;
  return Array.isArray(task?.options) && task.options.length > 0;
}

function examTaskId(task) {
  const id = Number(task?.id ?? task?.task_id);
  return Number.isFinite(id) ? id : 0;
}

export function compareExamTasks(a, b) {
  if (isClosedExamTask(a) !== isClosedExamTask(b)) return isClosedExamTask(a) ? -1 : 1;
  const diff = (Number(a?.difficulty) || 0) - (Number(b?.difficulty) || 0);
  if (diff) return diff;
  return examTaskId(a) - examTaskId(b);
}

export function sortExamTasks(tasks) {
  return [...(tasks || [])].sort(compareExamTasks);
}

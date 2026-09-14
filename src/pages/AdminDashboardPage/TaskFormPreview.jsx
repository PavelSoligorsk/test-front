import React from 'react';
import { MarkdownPreview } from './MarkdownPreview';

export default function TaskFormPreview({ taskData }) {
  return (
    <div className="space-y-4 sticky top-6 overflow-y-auto max-h-[calc(100vh-100px)] animate-in fade-in slide-in-from-bottom-4 duration-500">
      <MarkdownPreview text={taskData.content} title="Предпросмотр" />
      {!taskData.is_open_answer && taskData.options && (
        <MarkdownPreview title="Варианты ответа"
          text={(typeof taskData.options === 'string' ? taskData.options.split(';') : Array.isArray(taskData.options) ? taskData.options : [])
            .map(opt => opt.trim()).filter(opt => opt.length > 0).map((opt, i) => `**${i + 1}.** ${opt}`).join('\n\n')} />
      )}
      {taskData.hint && <MarkdownPreview text={`> **Подсказка:** ${taskData.hint}`} title="Подсказка" type="hint" />}
      {taskData.solution && <MarkdownPreview text={taskData.solution} title="Решение" type="solution" />}
    </div>
  );
}

import React from 'react';
import { MarkdownPreview } from './MarkdownPreview';

export default function TaskFormPreview({ taskData }) {
  return (
    <div className="space-y-6 sticky top-6 overflow-y-auto max-h-[calc(100vh-100px)]">
      <MarkdownPreview text={taskData.content} title="ПРЕДПРОСМОТР" />
      {!taskData.is_open_answer && taskData.options && (
        <MarkdownPreview title="ВАРИАНТЫ ОТВЕТА"
          text={(typeof taskData.options === 'string' ? taskData.options.split(';') : Array.isArray(taskData.options) ? taskData.options : [])
            .map(opt => opt.trim()).filter(opt => opt.length > 0).map((opt, i) => `**${i + 1}.** ${opt}`).join('\n\n')} />
      )}
      {taskData.hint && <MarkdownPreview text={`> **Подсказка:** ${taskData.hint}`} title="HINT" type="hint" />}
      {taskData.solution && <MarkdownPreview text={taskData.solution} title="РЕШЕНИЕ" type="solution" />}
    </div>
  );
}

import React from 'react';
import { X, Clipboard, Check } from 'lucide-react';

const SYSTEM_PROMPT = `You are a strict classifier of math problems. Output valid JSON only, no markdown.`;

const USER_PROMPT_TEMPLATE = `Classify this math task by topic, section, and difficulty.
Output ONLY a JSON object: {"topic": "...", "section": "...", "difficulty": N}

=== TASK INFO ===
Type: {task_type}
Current difficulty: {difficulty}/5
Problem:
{content}

=== AVAILABLE TOPICS & SECTIONS (choose ONLY from these) ===
{available_topics}

=== CLASSIFICATION GUIDELINES ===
- topic MUST be one of the listed topics above.
- section MUST be one of the listed sections under that topic (or "" if none listed or none applies).
- difficulty - integer from 1 (easiest) to 5 (hardest), based on number of solution steps and math level required
- Choose the most specific match. If nothing fits, pick the closest topic from the list.
- Do NOT invent topics or sections that are not in the list above.`;

export default function PromptModal({ tasks, topicsMeta, onClose, copied, onCopy }) {
  // Build available topics string from meta
  const availableTopicsStr = Object.keys(topicsMeta).length > 0
    ? Object.entries(topicsMeta)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([topic, sections]) => {
          const secs = Object.keys(sections).sort();
          if (secs.length === 0) return `  - "${topic}" (без разделов)`;
          return `  - "${topic}": разделы: ${secs.map(s => `"${s}"`).join(', ')}`;
        })
        .join('\n')
    : '  - (база тем пуста — AI классифицирует свободно)';

  // Generate example with first task
  const firstTask = tasks[0];
  const example = firstTask
    ? USER_PROMPT_TEMPLATE
        .replace('{task_type}', firstTask.is_open_answer ? 'open answer' : 'multiple choice')
        .replace('{difficulty}', String(firstTask.difficulty || 'not set'))
        .replace('{content}', firstTask.content?.slice(0, 600) || '')
        .replace('{available_topics}', availableTopicsStr)
    : USER_PROMPT_TEMPLATE
        .replace('{task_type}', 'open answer')
        .replace('{difficulty}', 'not set')
        .replace('{content}', '(задача не загружена)')
        .replace('{available_topics}', availableTopicsStr);

  const template = USER_PROMPT_TEMPLATE
    .replace('{task_type}', '[task_type]')
    .replace('{difficulty}', '[difficulty]')
    .replace('{content}', '[content]')
    .replace('{available_topics}', availableTopicsStr);

  const copyText = (text) => {
    navigator.clipboard.writeText(text).then(() => onCopy()).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      onCopy();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-3xl max-h-[90vh] bg-white rounded-[2.5rem] shadow-2xl border border-violet-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-violet-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-purple-600 rounded-xl flex items-center justify-center">
              <Clipboard size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 uppercase italic">AI-промпт классификации</h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                Копируй и вставляй в ChatGPT / DeepSeek API / консоль
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => copyText(SYSTEM_PROMPT + '\n\n---\n\n' + example)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
                copied
                  ? 'bg-emerald-500 text-white'
                  : 'bg-violet-600 text-white hover:bg-violet-700 shadow-lg'
              }`}
            >
              {copied ? <Check size={14} /> : <Clipboard size={14} />}
              {copied ? 'Скопировано' : 'Копировать пример'}
            </button>
            <button onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* System Prompt */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System Prompt</h4>
              <button
                onClick={() => copyText(SYSTEM_PROMPT)}
                className="flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-[9px] font-bold text-slate-500 transition-all">
                <Clipboard size={10} /> Копировать
              </button>
            </div>
            <div className="rounded-2xl bg-slate-900 p-4 font-mono text-xs text-emerald-300 leading-relaxed whitespace-pre-wrap">
              {SYSTEM_PROMPT}
            </div>
          </div>

          {/* User Prompt Template */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">User Prompt (шаблон)</h4>
              <button
                onClick={() => copyText(template)}
                className="flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-[9px] font-bold text-slate-500 transition-all">
                <Clipboard size={10} /> Копировать
              </button>
            </div>
            <div className="rounded-2xl bg-slate-900 p-4 font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
              {template}
            </div>
          </div>

          {/* Example with first task */}
          {firstTask && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Пример (задача #{firstTask.id})
                </h4>
                <button
                  onClick={() => copyText(example)}
                  className="flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-[9px] font-bold text-slate-500 transition-all">
                  <Clipboard size={10} /> Копировать
                </button>
              </div>
              <div className="rounded-2xl bg-slate-900 p-4 font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">
                {example}
              </div>
            </div>
          )}

          {/* Available Topics Summary */}
          <div>
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
              Тем в базе: {Object.keys(topicsMeta).length}
            </h4>
            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 font-mono text-xs text-slate-600 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
              {availableTopicsStr}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
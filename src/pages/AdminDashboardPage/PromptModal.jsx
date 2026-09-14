import React from 'react';
import { X, Clipboard, Check } from 'lucide-react';
import { IconWell, primaryBtnClass, secondaryBtnClass } from '../../shared/ui';

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
      <div onClick={e => e.stopPropagation()}
        className="w-full max-w-3xl max-h-[90vh] bg-white dark:bg-[#09090b] rounded-3xl shadow-sm border border-zinc-200 dark:border-zinc-800/60 overflow-hidden flex flex-col">
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between shrink-0 gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <IconWell><Clipboard size={18} strokeWidth={2} /></IconWell>
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">AI-промпт классификации</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                Копируй и вставляй в ChatGPT / DeepSeek API / консоль
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => copyText(SYSTEM_PROMPT + '\n\n---\n\n' + example)}
              className={primaryBtnClass}
            >
              {copied ? <Check size={14} /> : <Clipboard size={14} />}
              {copied ? 'Скопировано' : 'Копировать пример'}
            </button>
            <button type="button" onClick={onClose}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl transition-colors text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">System Prompt</h4>
              <button type="button" onClick={() => copyText(SYSTEM_PROMPT)} className={secondaryBtnClass + ' !px-2 !py-1 text-xs'}>
                <Clipboard size={10} /> Копировать
              </button>
            </div>
            <div className="rounded-xl bg-zinc-900 p-4 font-mono text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">
              {SYSTEM_PROMPT}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">User Prompt (шаблон)</h4>
              <button type="button" onClick={() => copyText(template)} className={secondaryBtnClass + ' !px-2 !py-1 text-xs'}>
                <Clipboard size={10} /> Копировать
              </button>
            </div>
            <div className="rounded-xl bg-zinc-900 p-4 font-mono text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">
              {template}
            </div>
          </div>

          {firstTask && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  Пример (задача #{firstTask.id})
                </h4>
                <button type="button" onClick={() => copyText(example)} className={secondaryBtnClass + ' !px-2 !py-1 text-xs'}>
                  <Clipboard size={10} /> Копировать
                </button>
              </div>
              <div className="rounded-xl bg-zinc-900 p-4 font-mono text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">
                {example}
              </div>
            </div>
          )}

          <div>
            <h4 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
              Тем в базе: {Object.keys(topicsMeta).length}
            </h4>
            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-4 font-mono text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
              {availableTopicsStr}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

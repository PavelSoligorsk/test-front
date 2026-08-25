import React, { useState } from 'react';
import { X, Clipboard, Check, Upload, Edit3, Trash2 } from 'lucide-react';
import { stringify } from 'yaml';

const CREATE_EXAMPLE = [
  {
    task_class: "10",
    topic_number: "1.1",
    content: "Решите уравнение \\\\(x^2 - 5x + 6 = 0\\\\)",
    answer: "2; 3",
    is_open_answer: true,
    difficulty: 2,
    topic: "Алгебра",
    section: "Квадратные уравнения",
  },
  {
    task_class: "10",
    topic_number: "1.1",
    content: "Сколько корней имеет уравнение \\\\(x^2 + 1 = 0\\\\)?",
    options: ["0", "1", "2", "бесконечно"],
    answer: "0",
    is_open_answer: false,
    difficulty: 1,
  },
];

const UPDATE_EXAMPLE = [
  { id: 1, difficulty: 3, topic: "Алгебра", section: "Квадратные уравнения" },
  { id: 2, answer: "4", hint: "Подумайте о дискриминанте" },
];

const DELETE_EXAMPLE = [1, 2, 3, 4, 5];

const CREATE_RULES = [
  "Ввод в YAML: каждый блок задания начинается с \"-\" на новой строке, поля — с отступом (см. пример ниже)",
  "task_class — обязательное поле (строка, например \"10\", \"Планиметрия\")",
  "topic_number — обязательное поле (строка, например \"1.1\", \"Трапеция\")",
  "content — обязательное поле (текст задачи, LaTeX через \\\\(...\\\\) для inline и \\\\[...\\\\] для display)",
  "answer — обязательное поле (строка, правильный ответ)",
  "is_open_answer — true = открытый ответ, false = тест с вариантами (по умолчанию true)",
  "options — массив строк с вариантами ответа (обязателен только если is_open_answer: false)",
  "difficulty — целое число 1-5 (необязательно, по умолчанию без сложности)",
  "topic — тема (необязательно, например \"Алгебра\")",
  "section — раздел темы (необязательно, например \"Квадратные уравнения\")",
  "hint — подсказка (необязательно)",
  "solution — решение (необязательно)",
];

const UPDATE_RULES = [
  "id — обязательное поле (целое число, ID существующего задания)",
  "Все остальные поля — опциональны. Если поле не указано, оно не изменится.",
  "Чтобы очистить поле, передайте пустую строку \"\".",
  "difficulty — целое 1-5",
  "options — если передано, то проверяется что не пустой для закрытых заданий",
];

export default function BatchPromptModal({ onClose }) {
  const [activeTab, setActiveTab] = useState('create');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const data = activeTab === 'create'
      ? CREATE_EXAMPLE
      : activeTab === 'update'
        ? UPDATE_EXAMPLE
        : DELETE_EXAMPLE;

    const text = stringify(data);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleCopyPayload = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const tabs = [
    { id: 'create', icon: Upload, label: 'Создать', color: 'from-emerald-600 to-teal-600', borderColor: 'border-emerald-200', bgColor: 'bg-emerald-50' },
    { id: 'update', icon: Edit3, label: 'Обновить', color: 'from-amber-600 to-orange-600', borderColor: 'border-amber-200', bgColor: 'bg-amber-50' },
    { id: 'delete', icon: Trash2, label: 'Удалить', color: 'from-red-600 to-rose-600', borderColor: 'border-red-200', bgColor: 'bg-red-50' },
  ];

  const active = tabs.find(t => t.id === activeTab) || tabs[0];

  const getPayloadExample = () => {
    if (activeTab === 'create') return JSON.stringify(CREATE_EXAMPLE, null, 2);
    if (activeTab === 'update') return JSON.stringify(UPDATE_EXAMPLE, null, 2);
    return JSON.stringify(DELETE_EXAMPLE, null, 2);
  };

  const getEndpointExample = () => {
    if (activeTab === 'create') {
      return `POST /admin/tasks/batch
Content-Type: application/json
Authorization: Bearer <token>

${JSON.stringify({ tasks: CREATE_EXAMPLE }, null, 2)}`;
    }
    if (activeTab === 'update') {
      return `PUT /admin/tasks/batch
Content-Type: application/json
Authorization: Bearer <token>

${JSON.stringify({ tasks: UPDATE_EXAMPLE }, null, 2)}`;
    }
    return `DELETE /admin/tasks/batch
Content-Type: application/json
Authorization: Bearer <token>

${JSON.stringify({ ids: DELETE_EXAMPLE }, null, 2)}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-3xl max-h-[90vh] bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-purple-600 rounded-xl flex items-center justify-center">
              <Clipboard size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 uppercase italic">Формат YAML для пакетных операций</h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                Копируй шаблон (YAML), вставляй в текстовое поле и меняй данные. На сервер уходит JSON.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
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

        {/* Tab switcher */}
        <div className="px-6 pt-4 flex gap-1 bg-slate-50 border-b border-slate-100 shrink-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-xl text-[10px] font-black uppercase transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-slate-900 border-t border-l border-r border-slate-200'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Rules */}
          <div>
            <h4 className={`text-[10px] font-black uppercase tracking-widest mb-2 text-slate-400`}>
              Правила валидации — {active.label}
            </h4>
            <div className={`rounded-2xl ${active.bgColor} border ${active.borderColor} p-4`}>
              <ul className="space-y-1.5">
                {(activeTab === 'create' ? CREATE_RULES : UPDATE_RULES).map((rule, i) => (
                  <li key={i} className="text-xs font-bold text-slate-700 flex items-start gap-2">
                    <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>
                    {rule}
                  </li>
                ))}
                {activeTab === 'delete' && (
                  <li className="text-xs font-bold text-slate-700 flex items-start gap-2">
                    <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>
                    Массив целых положительных чисел (ID заданий). До 500 за раз.
                  </li>
                )}
              </ul>
            </div>
          </div>

          {/* Example data (just the array) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Отправляется на сервер (JSON)
              </h4>
              <button
                onClick={() => handleCopyPayload(getPayloadExample())}
                className="flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-[9px] font-bold text-slate-500 transition-all">
                <Clipboard size={10} /> Копировать
              </button>
            </div>
            <div className="rounded-2xl bg-slate-900 p-4 font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
              {getPayloadExample()}
            </div>
          </div>

          {/* Full request */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Полный HTTP-запрос
              </h4>
              <button
                onClick={() => handleCopyPayload(getEndpointExample())}
                className="flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-[9px] font-bold text-slate-500 transition-all">
                <Clipboard size={10} /> Копировать
              </button>
            </div>
            <div className="rounded-2xl bg-slate-900 p-4 font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
              {getEndpointExample()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
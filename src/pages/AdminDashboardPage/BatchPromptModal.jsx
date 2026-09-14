import React, { useState } from 'react';
import { X, Clipboard, Check, Upload, Edit3, Trash2 } from 'lucide-react';
import { stringify } from 'yaml';
import { IconWell, primaryBtnClass, secondaryBtnClass } from '../../shared/ui';

const CREATE_EXAMPLE = [
  {
    task_class: "10",
    topic_number: "1.1",
    content: "Решите уравнение $x^2 - 5x + 6 = 0$",
    answer: "2; 3",
    is_open_answer: true,
    difficulty: 2,
    topic: "Алгебра",
    section: "Квадратные уравнения",
  },
  {
    task_class: "10",
    topic_number: "1.1",
    content: "Сколько корней имеет уравнение $x^2 + 1 = 0$?",
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
  "content — обязательное поле (текст задачи, LaTeX через $...$ для inline и $$...$$ (на отдельной строке) для display)",
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

const STEPS = {
  create: [
    "Переключи режим вкладки на «Создать» (кнопка вверху).",
    "Нажми «Загрузить пример» — или впиши задания вручную. Каждое задание — блок, начинающийся с «-», поля — с отступом в 2 пробела.",
    "Обязательные поля: task_class, topic_number, content, answer. Остальные — опциональны.",
    "Тест с вариантами: укажи is_open_answer: false и options — список вариантов (каждый с новой строки с «-»).",
    "Картинка: поставь курсор после «content: » (или в любое место) и вставь её — Ctrl+V, перетащи мышкой или кнопкой загрузки. Появится ![имя](url) без кавычек; если значение пустое, строка станет content: |.",
    "Справа живой предпросмотр: количество заданий и ошибки видны сразу.",
    "Нажми «Создать задания» — задания добавятся в банк.",
  ],
  update: [
    "Переключи режим вкладки на «Обновить» (кнопка вверху).",
    "В каждом блоке обязателен id существующего задания. Остальные поля — только те, что меняешь.",
    "Поля, которые не указал, не изменятся. Чтобы очистить поле — передай пустую строку: answer: \"\".",
    "В предпросмотре подтянутся текущие данные задания, а изменённые поля будут помечены.",
    "Нажми «Обновить задания» — изменения применятся.",
  ],
  delete: [
    "Переключи режим вкладки на «Удалить» (кнопка вверху).",
    "Впиши ID заданий по одному в строку: - 123 (можно несколько строк: - 123, - 456).",
    "В предпросмотре увидишь, какие задания будут удалены.",
    "Нажми «Удалить задания». Действие необратимо!",
  ],
};

const GENERAL_NOTES = [
  "Перенос строки в тексте: просто Enter + пустая строка. Не пиши «\\n» буквами.",
  "Многострочный текст в YAML — блок content: | и строки с отступом (пустые строки сохранятся).",
  "Формулы: инлайн — $x$, блочная — $$ (на своей строке) … формула … $$ (на своей строке). Пример ниже.",
  "Картинки вставляются без кавычек: ![имя](url) (Ctrl+V / drag&drop / кнопка загрузки).",
  "JSON тоже подойдёт — он совместим с YAML.",
  "До 500 заданий за раз.",
];

const AI_PROMPT = `Ты — помощник по созданию учебных заданий для образовательной платформы.

Это система ПАКЕТНЫХ ОПЕРАЦИЙ с заданиями: ввод в формате YAML, на сервер уходит JSON. Есть 3 режима.

## 1) СОЗДАТЬ (добавить новые задания)
Каждое задание — блок с "-", поля с отступом в 2 пробела:
- task_class: "10"
  topic_number: "1.1"
  content: Текст задания
  answer: Правильный ответ
  is_open_answer: true
  difficulty: 2
  topic: Тема
  section: Раздел
  hint: Подсказка
  solution: Решение
  options:
    - Вариант А
    - Вариант Б
Обязательные поля: task_class, topic_number, content, answer.
Если is_open_answer: false (тест с вариантами) — обязателен список options.
difficulty — целое число 1-5. topic, section, hint, solution, options — необязательные.

## 2) ОБНОВИТЬ
Блок с обязательным id существующего задания и только теми полями, что меняем:
- id: 123
  difficulty: 3
  answer: 5
Неуказанные поля не изменятся. Очистить поле — пустой строкой: answer: ""

## 3) УДАЛИТЬ
Список ID заданий по одному в строке:
- 123
- 456

## ПРИМЕР МНОГОСТРОЧНОГО ЗАДАНИЯ
- task_class: "10"
  topic_number: "1.1"
  content: |
    Сколько корней имеет уравнение

    $$
    y = 2x
    $$
  answer: 1

## ТЕКСТ, ФОРМУЛЫ, КАРТИНКИ
- Перенос строки: Enter + пустая строка. НЕ писать буквально \\n.
- Многострочный текст — блочный скаляр content: | и строки с отступом.
- Формулы LaTeX/KaTeX:
  * инлайн — $x^2$
  * блочная — $$ на своей строке, формула, $$ на своей строке:

$$
x^2 + y^2 = 1
$$

- Картинки — markdown без кавычек: ![описание](https://...)

Верни ТОЛЬКО готовый YAML без пояснений.`;

export default function BatchPromptModal({ onClose }) {
  const [activeTab, setActiveTab] = useState('create');
  const [copied, setCopied] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);

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

  const handleCopyPrompt = () => {
    const text = AI_PROMPT;
    navigator.clipboard.writeText(text).then(() => {
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2000);
    }).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2000);
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
    { id: 'create', icon: Upload, label: 'Создать' },
    { id: 'update', icon: Edit3, label: 'Обновить' },
    { id: 'delete', icon: Trash2, label: 'Удалить' },
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
      <div onClick={e => e.stopPropagation()}
        className="w-full max-w-3xl max-h-[90vh] bg-white dark:bg-[#09090b] rounded-3xl shadow-sm border border-zinc-200 dark:border-zinc-800/60 overflow-hidden flex flex-col">
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between shrink-0 gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <IconWell><Clipboard size={18} strokeWidth={2} /></IconWell>
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">Формат YAML для пакетных операций</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                Копируй шаблон, вставляй в поле и меняй данные. На сервер уходит JSON.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button type="button" onClick={handleCopy} className={primaryBtnClass}>
              {copied ? <Check size={14} /> : <Clipboard size={14} />}
              {copied ? 'Скопировано' : 'Копировать пример'}
            </button>
            <button type="button" onClick={onClose}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl transition-colors text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="px-6 pt-4 flex gap-1 bg-zinc-50 dark:bg-zinc-900/40 border-b border-zinc-100 dark:border-zinc-800/60 shrink-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-xl text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 border-t border-l border-r border-zinc-200 dark:border-zinc-800'
                  : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <h4 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
              Пошаговая инструкция — {active.label}
            </h4>
            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-4">
              <ol className="space-y-2.5">
                {STEPS[activeTab].map((step, i) => (
                  <li key={i} className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-start gap-2.5">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 text-xs font-semibold flex items-center justify-center mt-0.5 tabular-nums">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">Полезно знать</h4>
            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-4">
              <ul className="space-y-1.5">
                {GENERAL_NOTES.map((note, i) => (
                  <li key={i} className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-start gap-2">
                    <span className="text-zinc-400 mt-0.5 shrink-0">•</span>
                    {note}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Промт для ИИ (скопируй и отправь нейросети)
              </h4>
              <button type="button" onClick={handleCopyPrompt} className={secondaryBtnClass + ' !px-2 !py-1 text-xs'}>
                <Clipboard size={10} /> {promptCopied ? 'Скопировано' : 'Копировать'}
              </button>
            </div>
            <div className="rounded-xl bg-zinc-900 p-4 font-mono text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap max-h-56 overflow-y-auto">
              {AI_PROMPT}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
              Формулы (LaTeX) — как записывать
            </h4>
            <div className="rounded-xl bg-zinc-900 p-4 font-mono text-xs text-zinc-300 leading-relaxed">
              <div className="text-zinc-400 text-xs font-medium mb-1">Блочная — на отдельной строке (центрируется):</div>
              <pre className="whitespace-pre-wrap">{'$$\nформула\n$$'}</pre>
              <div className="text-zinc-400 text-xs font-medium mt-3 mb-1">Инлайн — внутри текста:</div>
              <pre className="whitespace-pre-wrap">{'$x^2$ — например: корень $x$ в квадрате'}</pre>
              <div className="text-zinc-500 text-xs font-medium mt-3 mb-1">В YAML для многострочной формулы используй блок content: |</div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
              Многострочный текст (блок content: |)
            </h4>
            <div className="rounded-xl bg-zinc-900 p-4 font-mono text-xs text-zinc-300 leading-relaxed">
              <div className="text-zinc-400 text-xs font-medium mb-1">Пример — вопрос + пустая строка + блочная формула:</div>
              <pre className="whitespace-pre-wrap">{`- task_class: "10"
  topic_number: "1.1"
  content: |
    Сколько корней имеет уравнение

    $$
    y = 2x
    $$
  answer: 1`}</pre>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
              Правила валидации — {active.label}
            </h4>
            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-4">
              <ul className="space-y-1.5">
                {(activeTab === 'create' ? CREATE_RULES : UPDATE_RULES).map((rule, i) => (
                  <li key={i} className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-start gap-2">
                    <span className="text-zinc-400 mt-0.5 shrink-0">•</span>
                    {rule}
                  </li>
                ))}
                {activeTab === 'delete' && (
                  <li className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-start gap-2">
                    <span className="text-zinc-400 mt-0.5 shrink-0">•</span>
                    Массив целых положительных чисел (ID заданий). До 500 за раз.
                  </li>
                )}
              </ul>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Отправляется на сервер (JSON)
              </h4>
              <button type="button" onClick={() => handleCopyPayload(getPayloadExample())} className={secondaryBtnClass + ' !px-2 !py-1 text-xs'}>
                <Clipboard size={10} /> Копировать
              </button>
            </div>
            <div className="rounded-xl bg-zinc-900 p-4 font-mono text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
              {getPayloadExample()}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Полный HTTP-запрос
              </h4>
              <button type="button" onClick={() => handleCopyPayload(getEndpointExample())} className={secondaryBtnClass + ' !px-2 !py-1 text-xs'}>
                <Clipboard size={10} /> Копировать
              </button>
            </div>
            <div className="rounded-xl bg-zinc-900 p-4 font-mono text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
              {getEndpointExample()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

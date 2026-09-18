import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Send, Sparkles, Copy, Check, X, Eye } from 'lucide-react';
import ImageAwareTextarea from './ImageAwareTextarea';
import { TheoryViewer } from '../../components/Theory';
import { MAIN_TOPICS, SECTIONS_BY_TOPIC } from './constants';
import { Sheet, IconWell, fieldClass, labelClass, primaryBtnClass, secondaryBtnClass } from '../../shared/ui';

// ========== ПРОМПТ ДЛЯ AI-ГЕНЕРАЦИИ ТЕОРИИ ==========

export const THEORY_GENERATION_PROMPT = `Ты — эксперт по подготовке к ЦТ/ЦЭ по математике. Напиши подробный теоретический материал по теме на русском языке.

## ФОРМАТ ОТВЕТА

Верни строго HTML-разметку с компонентами (БЕЗ Markdown-заголовков и без пояснений):

<Section id="sec1" title="Название раздела">

  <Def title="Определение">
    Текст определения с формулами $f(x)$, $$\\lim_{x \\to a} f(x) = L$$ в формате KaTeX.
  </Def>

  <Important title="Обратите внимание">
    Ключевой нюанс, подвох или частный случай, который часто упускают.
  </Important>

  <Formula title="Основное тождество">
    $\\sin^2 x + \\cos^2 x = 1$
  </Formula>

  <Ex title="Пример">
    Разбор примера с пошаговым решением и формулами.
  </Ex>

  <Explanation>
    Пояснение, почему работает метод / откуда берётся формула.
  </Explanation>

  <Grid cols="2">
    <Card title="Свойство 1">
      Описание свойства.
    </Card>
    <Card title="Свойство 2">
      Описание свойства.
    </Card>
  </Grid>

  <Steps>
    <div>Шаг 1: описание действия с формулой $f'(x)$.</div>
    <div>Шаг 2: описание действия.</div>
    <div>Шаг 3: описание действия.</div>
  </Steps>

  <Collapsible title="Доказательство / Вывод">
    Длинное доказательство или вывод формулы, скрытое для компактности.
  </Collapsible>

  <Html>
    <table>
      <thead>
        <tr>
          <th>Функция</th>
          <th>Область определения</th>
          <th>Нули</th>
          <th>Чётность</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>y = x²</td>
          <td>все действительные</td>
          <td>x = 0</td>
          <td>чётная</td>
        </tr>
        <tr>
          <td>y = 1/x</td>
          <td>x ≠ 0</td>
          <td>нет</td>
          <td>нечётная</td>
        </tr>
        <tr>
          <td>y = √x</td>
          <td>x ≥ 0</td>
          <td>x = 0</td>
          <td>общего вида</td>
        </tr>
      </tbody>
    </table>
  </Html>

</Section>

<Section id="sec2" title="Название второго раздела" isHard>
  ... аналогичная структура ...
</Section>

## ПРАВИЛА ИСПОЛЬЗОВАНИЯ КОМПОНЕНТОВ

1. **Section** — обязательный контейнер раздела. Атрибуты: id="sec{N}", title="Название". Можно добавить isHard для повышенной сложности.
2. **Def** — для определений. Атрибут title="Название определения".
3. **Ex** — для примеров. Атрибуты: title="Название", можно isHard.
4. **Explanation** — для пояснений и интуиции.
5. **Important** — для критических предупреждений и подвохов. title="Заголовок".
6. **Formula** — для ключевых тождеств, теорем, формул. Атрибут title="Название формулы".
7. **Collapsible** — для длинных доказательств, выводов формул, скрытых ответов. title="Заголовок".
8. **Grid** — сетка карточек. Атрибут cols="2" или cols="3".
9. **Card** — карточка внутри Grid. Атрибут title="Заголовок карточки".
10. **Steps** — разбор конкретного примера по шагам. Каждый шаг в <div>...</div>.
11. **GeoGebra** — интерактивный график (используй только при необходимости):
    <GeoGebra setup="view:-10,10,-6,6,grid
      f(x) = x^2 - 4
      color:f,#ff0000" height="400" />
12. **Html** — сырой HTML, когда нужна своя вёрстка: сравнительная таблица, схема, svg. Внутри только HTML, без Markdown, без $формул$ KaTeX и без Def/Ex. Формулы пиши символами HTML/Unicode (x², √x, ≥). Пример:

    <Html>
      <table>
        <thead>
          <tr>
            <th>Уравнение</th>
            <th>Корни</th>
            <th>ОДЗ</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>(x − 2)/(x + 1) = 0</td>
            <td>x = 2</td>
            <td>x ≠ −1</td>
          </tr>
          <tr>
            <td>√(x − 1) = 2</td>
            <td>x = 5</td>
            <td>x ≥ 1</td>
          </tr>
        </tbody>
      </table>
    </Html>

## ПРАВИЛА ФОРМУЛ

- Все математические формулы оборачивай в $...$ (inline) или $$...$$ (display) — стандартный KaTeX.
- Буквы греческого алфавита: $\\alpha$, $\\beta$, $\\gamma$, $\\Delta$.
- Дроби: $\\frac{a}{b}$.
- Корни: $\\sqrt{x}$, $\\sqrt[3]{x}$.
- Степени и индексы: $x^2$, $x_1$, $a^{2} + b^{2}$.
- Пределы: $\\lim_{x \\to \\infty} f(x)$.
- Интегралы: $\\int_{a}^{b} f(x) \\, dx$.
- Векторы: $\\vec{AB}$.
- Сравнение: $\\leq$, $\\geq$, $\\neq$, $\\approx$, $\\equiv$.
- Логика: $\\in$, $\\notin$, $\\subset$, $\\cup$, $\\cap$, $\\forall$, $\\exists$.
- Стрелки: $\\to$, $\\rightarrow$, $\\Rightarrow$, $\\Leftrightarrow$.
- Точки: $\\ldots$, $\\cdots$, $\\vdots$.

## ТРЕБОВАНИЯ К СОДЕРЖИМОМУ

- Материал должен быть полным и структурированным: 3–6 разделов.
- Каждый раздел должен содержать минимум: определение + формулу + пример.
- Используй Important для частых ошибок и подводных камней.
- Линейный разбор примера — в Steps.
- Используй Grid/Card для кратких карточек свойств.
- Используй Html для настоящих HTML-таблиц, схем и svg, когда Grid/Card не хватает.
- Доказательства и длинные выводы — в Collapsible.
- Не используй Markdown-заголовки (##, ###) внутри Section — только компоненты.
- Обычный текст и списки Markdown можно использовать внутри компонентов.
- Пиши на русском, используй академический, но доступный стиль.`;

export default function TheoryConstructorTab({ theoryData, setTheoryData, onSubmit }) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [copied, setCopied] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  const [editorKey, setEditorKey] = useState(0);
  const contentRef = useRef(theoryData.content || '');

  useEffect(() => {
    contentRef.current = theoryData.content || '';
    setPreviewContent('');
    if (!theoryData.id && !theoryData.content) {
      setEditorKey((key) => key + 1);
    }
  }, [theoryData.id, theoryData.content]);

  const handlePreview = useCallback(() => {
    setPreviewContent(contentRef.current || '');
  }, []);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const next = { ...theoryData, content: contentRef.current };
    setTheoryData(next);
    onSubmit(e, next);
  };

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(THEORY_GENERATION_PROMPT);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Ошибка копирования:', err);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Sheet className="p-6 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <IconWell><Send size={18} strokeWidth={2} /></IconWell>
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                {theoryData.id ? `Редактор теории #${theoryData.id}` : 'Конструктор теории'}
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Markdown и MDX-компоненты</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowPrompt(true)}
            className={secondaryBtnClass}
            title="Показать AI-промпт генерации теории"
          >
            <Sparkles size={14} /> AI-промпт
          </button>
        </div>
        <form onSubmit={handleFormSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block space-y-1.5">
              <span className={labelClass}>Тема</span>
              <select className={fieldClass}
                value={theoryData.topic} onChange={e => setTheoryData({ ...theoryData, topic: e.target.value, section: '' })} required>
                <option value="">— Выберите тему —</option>
                {Object.entries(MAIN_TOPICS).map(([key, label]) => (<option key={key} value={key}>{label}</option>))}
              </select>
            </label>
            <label className="block space-y-1.5">
              <span className={labelClass}>Раздел</span>
              <select className={`${fieldClass} disabled:opacity-50`}
                value={theoryData.section} onChange={e => setTheoryData({ ...theoryData, section: e.target.value })} disabled={!theoryData.topic} required>
                <option value="">— Выберите раздел —</option>
                {theoryData.topic && SECTIONS_BY_TOPIC[theoryData.topic]?.map(section => (<option key={section} value={section}>{section}</option>))}
              </select>
            </label>
          </div>
          <label className="block space-y-1.5">
            <span className={labelClass}>Содержание (Markdown + MDX компоненты)</span>
            <ImageAwareTextarea
              key={`${theoryData.id ?? 'new'}-${editorKey}`}
              defaultValue={theoryData.content || ''}
              onChange={(value) => { contentRef.current = value; }}
              placeholder={`# Заголовок\n\n<Section id="sec1" title="Основные понятия">\n  <Def>Здесь будет определение...</Def>\n  <Important title="Обратите внимание">Ключевой нюанс...</Important>\n  <Formula title="Основное тождество">$\\sin^2 x + \\cos^2 x = 1$</Formula>\n  <Ex>Пример...</Ex>\n  <Explanation>Пояснение...</Explanation>\n  <Grid cols="2">\n    <Card title="Свойство 1">...</Card>\n    <Card title="Свойство 2">...</Card>\n  </Grid>\n  <Steps>\n    <div>Шаг 1...</div>\n    <div>Шаг 2...</div>\n  </Steps>\n  <Collapsible title="Доказательство">...</Collapsible>\n  <Html><p>Произвольный HTML</p></Html>\n</Section>`}
              className={`${fieldClass} min-h-[400px] font-mono resize-y`}
              rows={15}
            />
          </label>
          <button type="submit" className={`${primaryBtnClass} w-full py-3`}>
            <Send size={16} /> {theoryData.id ? 'Обновить теорию' : 'Создать теорию'}
          </button>
        </form>
      </Sheet>
      <div className="sticky top-6 overflow-y-auto max-h-[calc(100vh-100px)]">
        <Sheet className="p-6 md:p-8">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Предпросмотр теории</h3>
            <button
              type="button"
              onClick={handlePreview}
              className={secondaryBtnClass}
            >
              <Eye size={14} />
              Предпросмотр
            </button>
          </div>
          {previewContent ? (
              <TheoryViewer content={previewContent} />
          ) : (
            <p className="text-sm text-zinc-400">Нажмите «Предпросмотр», чтобы собрать материал.</p>
          )}
        </Sheet>
      </div>

      {showPrompt && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowPrompt(false)}>
          <div
            className="bg-white dark:bg-[#09090b] rounded-3xl border border-zinc-200 dark:border-zinc-800/60 shadow-sm w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-800/60 shrink-0">
              <div className="flex items-center gap-3">
                <IconWell><Sparkles size={18} strokeWidth={2} /></IconWell>
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">AI-промпт генерации теории</h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Вставьте в ChatGPT / Claude / YandexGPT
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={handleCopyPrompt} className={primaryBtnClass}>
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Скопировано' : 'Копировать'}
                </button>
                <button type="button" onClick={() => setShowPrompt(false)}
                  className="p-2.5 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl transition-colors">
                  <X size={18} className="text-zinc-400" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <pre className="bg-zinc-900 text-zinc-100 p-5 rounded-xl font-mono text-xs leading-relaxed whitespace-pre-wrap max-h-[60vh] overflow-y-auto">
{THEORY_GENERATION_PROMPT}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

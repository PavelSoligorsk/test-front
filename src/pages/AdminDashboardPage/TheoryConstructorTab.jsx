import React, { useState } from 'react';
import { Send, Sparkles, Copy, CheckCircle2, X } from 'lucide-react';
import ImageAwareTextarea from './ImageAwareTextarea';
import { TheoryViewer } from '../../components/Theory';
import { MAIN_TOPICS, SECTIONS_BY_TOPIC } from './constants';

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
10. **Steps** — пошаговый алгоритм. Каждый шаг оборачивается в <div>...</div>.
11. **GeoGebra** — интерактивный график (используй только при необходимости):
    <GeoGebra setup="view:-10,10,-6,6,grid
      f(x) = x^2 - 4
      color:f,#ff0000" height="400" />

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
- Используй Steps для алгоритмов решения типовых задач.
- Используй Grid/Card для таблиц свойств, сводок формул, сравнений.
- Доказательства и длинные выводы — в Collapsible.
- Не используй Markdown-заголовки (##, ###) внутри Section — только компоненты.
- Обычный текст и списки Markdown можно использовать внутри компонентов.
- Пиши на русском, используй академический, но доступный стиль.`;

export default function TheoryConstructorTab({ theoryData, setTheoryData, onSubmit }) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [copied, setCopied] = useState(false);

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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
      <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-black text-slate-800 uppercase italic">
            {theoryData.id ? `Редактор теории #${theoryData.id}` : 'Конструктор теории'}
          </h2>
          <button
            onClick={() => setShowPrompt(true)}
            className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-violet-600 to-purple-700 text-white rounded-2xl font-black text-[10px] uppercase hover:shadow-lg hover:shadow-violet-200 transition-all active:scale-95"
            title="Показать AI-промпт генерации теории"
          >
            <Sparkles size={14} /> AI-промпт
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <label className="block space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase ml-2">Тема</span>
              <select className="w-full p-3 bg-slate-50 border-none rounded-xl font-bold text-sm"
                value={theoryData.topic} onChange={e => setTheoryData({ ...theoryData, topic: e.target.value, section: '' })} required>
                <option value="">— Выберите тему —</option>
                {Object.entries(MAIN_TOPICS).map(([key, label]) => (<option key={key} value={key}>{label}</option>))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase ml-2">Раздел</span>
              <select className="w-full p-3 bg-slate-50 border-none rounded-xl font-bold text-sm"
                value={theoryData.section} onChange={e => setTheoryData({ ...theoryData, section: e.target.value })} disabled={!theoryData.topic} required>
                <option value="">— Выберите раздел —</option>
                {theoryData.topic && SECTIONS_BY_TOPIC[theoryData.topic]?.map(section => (<option key={section} value={section}>{section}</option>))}
              </select>
            </label>
          </div>
          <label className="block space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase ml-2">Содержание (Markdown + MDX компоненты)</span>
            <ImageAwareTextarea value={theoryData.content}
              onChange={(value) => setTheoryData({ ...theoryData, content: value })}
              placeholder={`# Заголовок\n\n<Section id="sec1" title="Основные понятия">\n  <Def>Здесь будет определение...</Def>\n  <Important title="Обратите внимание">Ключевой нюанс...</Important>\n  <Formula title="Основное тождество">$\\sin^2 x + \\cos^2 x = 1$</Formula>\n  <Ex>Пример...</Ex>\n  <Explanation>Пояснение...</Explanation>\n  <Grid cols="2">\n    <Card title="Свойство 1">...</Card>\n    <Card title="Свойство 2">...</Card>\n  </Grid>\n  <Steps>\n    <div>Шаг 1...</div>\n    <div>Шаг 2...</div>\n  </Steps>\n  <Collapsible title="Доказательство">...</Collapsible>\n</Section>`}
              className="w-full p-6 bg-slate-50 border-none rounded-[2rem] min-h-[400px] font-mono text-sm resize-y" rows={15} />
          </label>
          <button type="submit" className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black hover:bg-black transition-all shadow-2xl flex items-center justify-center gap-3">
            <Send size={20} /> {theoryData.id ? 'ОБНОВИТЬ ТЕОРИЮ' : 'СОЗДАТЬ ТЕОРИЮ'}
          </button>
        </form>
      </div>
      <div className="space-y-6 sticky top-6 overflow-y-auto max-h-[calc(100vh-100px)]">
        <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">ПРЕДПРОСМОТР ТЕОРИИ</h3>
          <TheoryViewer content={theoryData.content} />
        </div>
      </div>

      {/* ========== МОДАЛЬНОЕ ОКНО AI-ПРОМПТА ========== */}
      {showPrompt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-6 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-violet-600 to-purple-700 rounded-2xl text-white shadow-lg shadow-violet-200">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 uppercase italic">AI-промпт генерации теории</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                    Вставьте в ChatGPT / Claude / YandexGPT
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyPrompt}
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase hover:bg-black transition-all"
                >
                  {copied ? <CheckCircle2 size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  {copied ? 'Скопировано' : 'Копировать'}
                </button>
                <button onClick={() => setShowPrompt(false)} className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors">
                  <X size={18} className="text-slate-400" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 pb-6">
              <pre className="bg-slate-900 text-slate-100 p-6 rounded-2xl font-mono text-xs leading-relaxed whitespace-pre-wrap max-h-[60vh] overflow-y-auto">
{THEORY_GENERATION_PROMPT}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
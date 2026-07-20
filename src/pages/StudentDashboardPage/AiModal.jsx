import React from 'react';
import { Sparkles, XCircle, AlertCircle, Zap, RefreshCw } from 'lucide-react';

export default function AiModal({
  showAiModal, setShowAiModal,
  aiPrompt, setAiPrompt,
  aiTaskCount, setAiTaskCount,
  aiDifficulty, setAiDifficulty,
  aiGenerating, handleGenerateAiTest,
}) {
  if (!showAiModal) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="bg-gradient-to-r from-purple-600 to-violet-600 p-6 text-white">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm"><Sparkles size={24} /></div>
              <div>
                <h3 className="text-xl font-black uppercase">AI Генерация теста</h3>
                <p className="text-purple-200 text-[10px] font-bold uppercase mt-1">Создайте уникальный тест с помощью ИИ</p>
              </div>
            </div>
            <button onClick={() => setShowAiModal(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all"><XCircle size={20} /></button>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Опишите тему теста</label>
            <textarea value={aiPrompt} onChange={e => setAiPrompt(e.target.value)}
              placeholder="Например: квадратные уравнения для 8 класса, задачи на движение, тригонометрия..."
              className="w-full p-4 bg-slate-50 rounded-2xl font-medium text-sm h-32 resize-none outline-none focus:ring-2 focus:ring-purple-400 transition-all" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Количество задач (1-30)</label>
              <input type="number" min="1" max="30" value={aiTaskCount}
                onChange={e => {
                  const val = e.target.value;
                  if (val === '') { setAiTaskCount(''); return; }
                  const num = Number(val);
                  if (isNaN(num)) return;
                  if (num < 1) setAiTaskCount(1);
                  else if (num > 30) setAiTaskCount(30);
                  else setAiTaskCount(num);
                }}
                onBlur={() => { if (aiTaskCount === '' || isNaN(aiTaskCount) || aiTaskCount < 1) setAiTaskCount(10); }}
                className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-purple-400 transition-all" />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Сложность</label>
              <select value={aiDifficulty} onChange={e => setAiDifficulty(e.target.value)}
                className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm outline-none">
                <option value="easy">Лёгкий</option>
                <option value="medium">Средний</option>
                <option value="hard">Сложный</option>
                <option value="none">🍲 Рататуй (любая)</option>
              </select>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-start gap-3">
            <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[10px] font-bold text-amber-700 uppercase">AI может допускать ошибки. Проверяйте сгенерированные задания.</p>
          </div>
        </div>
        <div className="p-6 bg-slate-50 flex gap-3">
          <button onClick={() => setShowAiModal(false)}
            className="flex-1 p-4 bg-white text-slate-600 rounded-2xl font-black text-sm hover:bg-slate-100 transition-all border border-slate-200">ОТМЕНА</button>
          <button onClick={handleGenerateAiTest} disabled={!aiPrompt.trim() || aiGenerating}
            className="flex-1 p-4 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-2xl font-black text-sm hover:shadow-xl hover:shadow-purple-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {aiGenerating ? (<><RefreshCw size={16} className="animate-spin" />ГЕНЕРАЦИЯ...</>) : (<><Zap size={16} />СОЗДАТЬ ТЕСТ</>)}
          </button>
        </div>
      </div>
    </div>
  );
}

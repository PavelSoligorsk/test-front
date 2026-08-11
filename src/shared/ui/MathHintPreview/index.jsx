import { XCircle } from 'lucide-react';
import MarkdownWithGeoGebra, { GeoGebraEmbed } from '../MarkdownWithGeoGebra';

/**
 * Компонент отображения AI-подсказки
 * Используется в TestPassing и TestResultDetail
 * Поддерживает рендеринг GeoGebra блоков в тексте + отдельный объект geogebra из ответа сервера
 */
export default function MathHintPreview({ text, geogebra, title = "💡 AI-ПОДСКАЗКА", isLoading = false, error = null, onClose = null }) {
  if (isLoading) {
    return (
      <div className="relative p-6 rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        {onClose && (
          <button onClick={onClose} className="absolute top-4 right-4 p-1 hover:bg-slate-100 rounded-full">
            <XCircle size={18} className="text-slate-400" />
          </button>
        )}
        {title && <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">{title}</h4>}
        <div className="flex items-center space-x-3 py-4">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-slate-200 border-t-blue-500" />
          <p className="text-sm text-slate-500">Генерирую подсказку...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative p-6 rounded-[2rem] border border-red-200 bg-red-50 shadow-sm">
        {onClose && (
          <button onClick={onClose} className="absolute top-4 right-4 p-1 hover:bg-red-100 rounded-full">
            <XCircle size={18} className="text-red-400" />
          </button>
        )}
        {title && <h4 className="text-[10px] font-black uppercase text-red-400 tracking-widest mb-4">{title}</h4>}
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  // Защищаем GeoGebra-теги от форматирования: заменяем на placeholders,
  // форматируем остальной текст, возвращаем теги обратно
  let formattedText;
  if (text) {
    const geoBlocks = [];
    const protectedText = text.replace(/<GeoGebra[\s\S]*?\/>/g, (match) => {
      geoBlocks.push(match);
      return `__GEOBLOCK_${geoBlocks.length - 1}__`;
    });
    const formatted = protectedText.replace(/\\n/g, '  \n').replace(/\n/g, '  \n');
    formattedText = formatted.replace(/__GEOBLOCK_(\d+)__/g, (_, i) => geoBlocks[parseInt(i)]);
  } else {
    formattedText = "*Подсказка появится здесь...*";
  }

  return (
    <div className="relative p-6 rounded-[2rem] border border-slate-200 bg-white shadow-sm">
      {onClose && (
        <button onClick={onClose} className="absolute top-4 right-4 p-1 hover:bg-slate-100 rounded-full z-10">
          <XCircle size={18} className="text-slate-400 hover:text-slate-600" />
        </button>
      )}
      {title && <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 pr-6">{title}</h4>}
      <div className="text-slate-700 text-sm md:text-base leading-relaxed">
        <MarkdownWithGeoGebra
          markdownComponents={{
            inlineMath: ({ children }) => <span className="inline justify-center text-blue-600">{children}</span>,
            math: ({ children }) => <div className="my-4 flex justify-center overflow-x-auto">{children}</div>,
          }}
        >
          {formattedText}
        </MarkdownWithGeoGebra>
      </div>
      {/* GeoGebra из отдельного поля ответа сервера — рендерим напрямую */}
      {geogebra && geogebra.setup && (
        <GeoGebraEmbed setup={geogebra.setup} height={geogebra.height || "400"} />
      )}
      {text && text !== "*Подсказка появится здесь..." && (
        <div className="mt-4 pt-3 border-t border-slate-100 text-left">
          <p className="text-xs text-slate-400">Ответ сгенерирован с помощью ИИ. Возможны ошибки</p>
        </div>
      )}
    </div>
  );
}
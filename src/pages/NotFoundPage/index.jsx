import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="text-center space-y-8 max-w-md">
        <div className="text-[150px] font-black italic leading-none text-slate-200 select-none">
          404
        </div>
        <h1 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900">
          Страница не найдена
        </h1>
        <p className="text-sm font-bold text-slate-400">
          Такого маршрута не существует. Возможно, ссылка устарела или вы ошиблись в адресе.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            to="/"
            className="flex items-center gap-3 px-8 py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-[0.15em] hover:bg-slate-800 active:scale-[0.98] transition-all shadow-xl"
          >
            <Home size={16} />
            На главную
          </Link>
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-3 px-8 py-5 bg-slate-50 text-slate-600 rounded-2xl font-black uppercase text-xs tracking-[0.15em] hover:bg-slate-100 active:scale-[0.98] transition-all"
          >
            <ArrowLeft size={16} />
            Назад
          </button>
        </div>
      </div>
    </div>
  );
}

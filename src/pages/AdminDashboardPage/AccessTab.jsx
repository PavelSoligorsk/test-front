import React from 'react';
import { PlusCircle, MailCheck, Trash2 } from 'lucide-react';

export default function AccessTab({ allowedEmails, newEmail, setNewEmail, onAddEmail, onDeleteEmail }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100">
          <h2 className="text-2xl font-black text-slate-800 uppercase italic mb-6">Добавить доступ</h2>
          <form onSubmit={onAddEmail} className="space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase ml-2">Email адрес</span>
              <input required type="email" className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-blue-500/20"
                placeholder="example@mail.com" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
            </div>
            <button className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black hover:bg-blue-700 transition-all shadow-lg flex items-center justify-center gap-3">
              <PlusCircle size={18} /> РАЗРЕШИТЬ
            </button>
          </form>
        </div>
      </div>
      <div className="lg:col-span-2">
        <div className="bg-white rounded-[3rem] shadow-xl border border-slate-200 overflow-hidden">
          <div className="p-8 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-xl font-black italic uppercase text-slate-900">Белый список почт</h3>
            <span className="bg-emerald-100 text-emerald-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase">Всего: {allowedEmails.length}</span>
          </div>
          <div className="max-h-[600px] overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-50 shadow-sm z-10">
                <tr className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
                  <th className="p-4 sm:p-8">Разрешенный Email</th>
                  <th className="p-4 sm:p-8">Пользователь</th>
                  <th className="p-4 sm:p-8 text-right">Действие</th>
                </tr>
              </thead>
              <tbody>
                {allowedEmails.length === 0 ? (
                  <tr><td colSpan="3" className="p-20 text-center text-slate-300 italic font-black uppercase text-xs tracking-widest">Список пуст</td></tr>
                ) : allowedEmails.map(item => (
                  <tr key={item.id} className="border-t border-slate-50 hover:bg-slate-50/80 transition-all group">
                    <td className="p-4 sm:p-8">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="p-2 sm:p-3 bg-emerald-50 text-emerald-500 rounded-xl group-hover:scale-110 transition-transform shrink-0"><MailCheck size={18} /></div>
                        <span className="font-bold text-slate-700 text-sm break-all">{item.email}</span>
                      </div>
                    </td>
                    <td className="p-4 sm:p-8">
                      {item.first_name ? (
                        <div className="space-y-0.5">
                          <div className="font-black text-slate-800 text-sm">{item.first_name} {item.last_name || ''}</div>
                          {item.tg_username && <div className="text-[10px] text-blue-500 font-bold">{item.tg_username}</div>}
                        </div>
                      ) : <span className="text-[10px] text-slate-300 font-bold uppercase">Не зарегистрирован</span>}
                    </td>
                    <td className="p-4 sm:p-8 text-right">
                      <button onClick={() => onDeleteEmail(item.email)} className="p-3 sm:p-4 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all">
                        <Trash2 size={18} className="sm:w-5 sm:h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

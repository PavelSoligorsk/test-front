import React from 'react';
import { PlusCircle, MailCheck, Trash2 } from 'lucide-react';
import { Sheet, IconWell, fieldClass, labelClass, primaryBtnClass } from '../../shared/ui';

export default function AccessTab({ allowedEmails, newEmail, setNewEmail, onAddEmail, onDeleteEmail }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="lg:col-span-1">
        <Sheet className="p-6 md:p-8">
          <div className="flex items-center gap-4 mb-6">
            <IconWell><PlusCircle size={18} strokeWidth={2} /></IconWell>
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">Добавить доступ</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Разрешить email</p>
            </div>
          </div>
          <form onSubmit={onAddEmail} className="space-y-4">
            <div className="space-y-1.5">
              <label className={labelClass} htmlFor="access-email">Email адрес</label>
              <input id="access-email" required type="email" className={fieldClass}
                placeholder="example@mail.com" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
            </div>
            <button type="submit" className={`${primaryBtnClass} w-full`}>
              <PlusCircle size={16} /> Разрешить
            </button>
          </form>
        </Sheet>
      </div>
      <div className="lg:col-span-2">
        <Sheet className="overflow-hidden">
          <div className="p-6 md:p-8 border-b border-zinc-100 dark:border-zinc-800/60 flex justify-between items-center gap-4">
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">Белый список почт</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Всего: {allowedEmails.length}</p>
            </div>
          </div>
          <div className="max-h-[600px] overflow-y-auto">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-white dark:bg-[#09090b] z-10 border-b border-zinc-100 dark:border-zinc-800/60">
                <tr className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  <th className="px-6 md:px-8 py-3">Разрешённый email</th>
                  <th className="px-6 md:px-8 py-3">Пользователь</th>
                  <th className="px-6 md:px-8 py-3 text-right">Действие</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                {allowedEmails.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-3 text-zinc-400">
                        <div className="w-12 h-12 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-center">
                          <MailCheck size={20} />
                        </div>
                        <p className="text-sm font-medium text-zinc-500">Список пуст</p>
                        <p className="text-sm text-zinc-400">Добавьте email слева</p>
                      </div>
                    </td>
                  </tr>
                ) : allowedEmails.map(item => (
                  <tr key={item.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors group">
                    <td className="px-6 md:px-8 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl shrink-0">
                          <MailCheck size={16} />
                        </div>
                        <span className="font-medium text-sm text-zinc-800 dark:text-zinc-200 break-all">{item.email}</span>
                      </div>
                    </td>
                    <td className="px-6 md:px-8 py-4">
                      {item.first_name ? (
                        <div className="space-y-0.5">
                          <div className="font-medium text-sm text-zinc-900 dark:text-zinc-100">
                            {item.first_name} {item.last_name || ''}
                          </div>
                          {item.tg_username && (
                            <div className="text-xs text-zinc-500">{item.tg_username}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-zinc-400">Не зарегистрирован</span>
                      )}
                    </td>
                    <td className="px-6 md:px-8 py-4 text-right">
                      <button type="button" onClick={() => onDeleteEmail(item.email)}
                        className="p-2 text-zinc-300 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Sheet>
      </div>
    </div>
  );
}

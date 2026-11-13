import { Check } from 'lucide-react';
import { Sheet, fieldClass, primaryBtnClass } from '../../shared/ui/Sheet';

export default function ProfileTab({ profile, editForm, setEditForm, handleUpdateProfile, saving }) {
  return (
    <div className="mx-auto max-w-3xl animate-in fade-in duration-500">
      <Sheet className="overflow-hidden">
        <div className="border-b border-zinc-100 px-5 py-5 dark:border-zinc-800/60 sm:px-6 sm:py-6 md:px-8">
          <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            {profile?.user.first_name} {profile?.user.last_name}
          </h2>
          <p className="mt-1 text-sm tabular-nums text-zinc-500">ID {profile?.user.id || '001'}</p>
        </div>

        <div className="grid grid-cols-2 divide-x divide-zinc-100 border-b border-zinc-100 dark:divide-zinc-800/60 dark:border-zinc-800/60">
          <figure className="px-5 py-5 sm:px-6 md:px-8">
            <p className="text-lg font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-100">
              {profile?.stats.total_attempts}
            </p>
            <figcaption className="mt-1 text-sm text-zinc-500">Сдано тестов</figcaption>
          </figure>
          <figure className="px-5 py-5 sm:px-6 md:px-8">
            <p className="text-lg font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-100">
              {profile?.stats.avg_score}%
            </p>
            <figcaption className="mt-1 text-sm text-zinc-500">Средний результат</figcaption>
          </figure>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-4 px-5 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Имя</span>
              <input
                type="text"
                value={editForm.first_name}
                onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                className={fieldClass}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Фамилия</span>
              <input
                type="text"
                value={editForm.last_name}
                onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                className={fieldClass}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Телефон</span>
              <input
                type="tel"
                placeholder="+375(xx)xxxxxxx"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                className={fieldClass}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Telegram</span>
              <input
                type="text"
                placeholder="username"
                value={editForm.telegram}
                onChange={(e) => setEditForm({ ...editForm, telegram: e.target.value })}
                className={fieldClass}
              />
            </label>
          </div>
          <button type="submit" disabled={saving} className={`${primaryBtnClass} w-full sm:w-auto`}>
            {saving ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white dark:border-zinc-950/30 dark:border-t-zinc-950" />
            ) : (
              <>
                <Check size={16} />
                Сохранить
              </>
            )}
          </button>
        </form>
      </Sheet>
    </div>
  );
}

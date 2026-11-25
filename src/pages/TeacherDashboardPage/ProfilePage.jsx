import { useState } from 'react';
import { Check } from 'lucide-react';
import { teacherApi } from '../../features/teacher/api';
import { restoreSession, saveSession } from '../../shared/lib/session';
import {
  PageShell, Sheet, InlineNotice, formatApiDetail, fieldClass, primaryBtnClass,
} from '../../shared/ui';

export default function ProfilePage() {
  const user = restoreSession();
  const [form, setForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    phone: user?.phone || '',
    tg_username: user?.tg_username || '',
  });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [savedName, setSavedName] = useState(
    [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.username || 'Профиль'
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      const res = await teacherApi.updateProfile(form);
      const session = restoreSession();
      if (session) saveSession({ ...session, ...res.data });
      setSavedName([form.first_name, form.last_name].filter(Boolean).join(' ') || user?.username || 'Профиль');
      setNotice({ tone: 'success', text: 'Профиль обновлён' });
    } catch (err) {
      setNotice({ tone: 'error', text: formatApiDetail(err.response?.data?.detail, 'Ошибка при сохранении') });
    } finally {
      setSaving(false);
    }
  };

  const set = (key) => (e) => setForm((current) => ({ ...current, [key]: e.target.value }));

  return (
    <PageShell>
      <div className="mx-auto max-w-3xl animate-in fade-in duration-500">
        <Sheet className="overflow-hidden">
          <div className="border-b border-zinc-100 px-5 py-5 dark:border-zinc-800/60 sm:px-6 sm:py-6 md:px-8">
            <h1 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{savedName}</h1>
            <p className="mt-1 text-sm text-zinc-500">Контакты и имя</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8">
            {notice ? <InlineNotice tone={notice.tone}>{notice.text}</InlineNotice> : null}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Имя</span>
                <input className={fieldClass} value={form.first_name} onChange={set('first_name')} />
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Фамилия</span>
                <input className={fieldClass} value={form.last_name} onChange={set('last_name')} />
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Телефон</span>
                <input type="tel" className={fieldClass} value={form.phone} onChange={set('phone')} />
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Telegram</span>
                <input className={fieldClass} value={form.tg_username} onChange={set('tg_username')} placeholder="username" />
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
    </PageShell>
  );
}

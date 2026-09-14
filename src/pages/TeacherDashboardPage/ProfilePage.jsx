import { useState } from 'react';
import { User as UserIcon } from 'lucide-react';
import { teacherApi } from '../../features/teacher/api';
import { restoreSession, saveSession } from '../../shared/lib/session';
import {
  PageShell, Sheet, IconWell, InlineNotice, formatApiDetail,
  fieldClass, labelClass, primaryBtnClass, secondaryBtnClass,
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      const res = await teacherApi.updateProfile(form);
      const session = restoreSession();
      if (session) saveSession({ ...session, ...res.data });
      setNotice({ tone: 'success', text: 'Профиль обновлён' });
    } catch (err) {
      setNotice({ tone: 'error', text: formatApiDetail(err.response?.data?.detail, 'Ошибка при сохранении') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell>
      <Sheet className="max-w-lg overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="p-6 md:p-8 border-b border-zinc-100 dark:border-zinc-800/60 flex items-center gap-4">
          <IconWell><UserIcon size={18} strokeWidth={2} /></IconWell>
          <div>
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">Профиль</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Контакты и имя</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-4">
          {notice ? <InlineNotice tone={notice.tone}>{notice.text}</InlineNotice> : null}
          <div className="space-y-1.5">
            <label className={labelClass} htmlFor="t-first">Имя</label>
            <input id="t-first" className={fieldClass} value={form.first_name}
              onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <label className={labelClass} htmlFor="t-last">Фамилия</label>
            <input id="t-last" className={fieldClass} value={form.last_name}
              onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <label className={labelClass} htmlFor="t-phone">Телефон</label>
            <input id="t-phone" type="tel" className={fieldClass} value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <label className={labelClass} htmlFor="t-tg">Telegram</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">@</span>
              <input id="t-tg" className={`${fieldClass} pl-8`} value={form.tg_username}
                onChange={(e) => setForm((f) => ({ ...f, tg_username: e.target.value }))} />
            </div>
          </div>
          <div className="pt-2 flex gap-2">
            <button type="submit" disabled={saving} className={`${primaryBtnClass} flex-1`}>
              {saving ? 'Сохраняем…' : 'Сохранить'}
            </button>
          </div>
        </form>
      </Sheet>
    </PageShell>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { Link2, Loader2, Pencil, Phone, PlusCircle, Trash2, Unlink } from 'lucide-react';
import { teacherApi } from '../../../features/teacher/api';
import { useConfirm } from '../../../shared/ui';
import Section from './Section';
import { apiError } from './lessonFormat';

const emptyParentForm = { name: '', phone: '', tg_username: '', comment: '' };

/** Родители ученика: привязка существующего, создание, правка, отвязка. */
export default function ParentsSection({ student, onError, onSuccess, onUpdated }) {
  const confirm = useConfirm();
  const studentId = student?.id;
  const [parents, setParents] = useState([]);
  const [parentLoading, setParentLoading] = useState(() => Boolean(studentId));
  const [showParentForm, setShowParentForm] = useState(false);
  const [editingParentId, setEditingParentId] = useState(null);
  const [parentForm, setParentForm] = useState(emptyParentForm);
  const [allParents, setAllParents] = useState([]);
  const [parentsLoading, setParentsLoading] = useState(true);
  const [showParentPicker, setShowParentPicker] = useState(false);
  const [parentSearch, setParentSearch] = useState('');
  const [busy, setBusy] = useState(false);

  const fetchParent = useCallback(() => {
    if (!studentId) return Promise.resolve();
    return teacherApi.getStudentParents(studentId)
      .then((res) => setParents(res.data || []))
      .catch(() => { /* ignore */ })
      .finally(() => setParentLoading(false));
  }, [studentId]);

  const fetchAllParents = useCallback(() => teacherApi.getParents()
    .then((res) => setAllParents(res.data || []))
    .catch(() => { /* ignore */ })
    .finally(() => setParentsLoading(false)), []);

  useEffect(() => {
    fetchParent();
    fetchAllParents();
  }, [fetchParent, fetchAllParents]);

  const handleLinkExistingParent = async (p) => {
    setBusy(true); onError(null);
    try {
      await teacherApi.linkStudentToParent(p.id, student.id);
      setParents((prev) => [...prev, p]);
      setShowParentPicker(false);
      onSuccess('Родитель привязан');
      onUpdated?.();
    } catch (e) { onError(apiError(e, 'Ошибка при привязке родителя')); }
    finally { setBusy(false); }
  };

  const handleCreateParent = async () => {
    if (!parentForm.name.trim()) { onError('Укажите имя родителя'); return; }
    setBusy(true); onError(null);
    try {
      const res = await teacherApi.createParent({ ...parentForm, student_ids: [student.id] });
      setParents((prev) => [...prev, res.data]);
      setShowParentForm(false);
      onSuccess('Родитель создан и привязан');
      onUpdated?.();
    } catch (e) { onError(apiError(e, 'Ошибка при создании родителя')); }
    finally { setBusy(false); }
  };

  const handleEditParent = async (parentId) => {
    setBusy(true); onError(null);
    try {
      const res = await teacherApi.updateParent(parentId, parentForm);
      setParents((prev) => prev.map((p) => p.id === parentId ? res.data : p));
      setEditingParentId(null);
      onSuccess('Родитель обновлён');
    } catch (e) { onError(apiError(e, 'Ошибка при редактировании родителя')); }
    finally { setBusy(false); }
  };

  const handleDeleteParent = async (parentId) => {
    if (!(await confirm('Удалить родителя? Студент останется без привязки.', { danger: true, confirmLabel: 'Удалить' }))) return;
    setBusy(true); onError(null);
    try {
      await teacherApi.deleteParent(parentId);
      setParents((prev) => prev.filter((p) => p.id !== parentId));
      onSuccess('Родитель удалён');
      onUpdated?.();
    } catch (e) { onError(apiError(e, 'Ошибка при удалении родителя')); }
    finally { setBusy(false); }
  };

  const handleUnlinkParent = async (parentId) => {
    setBusy(true); onError(null);
    try {
      await teacherApi.unlinkStudentFromParent(student.id);
      setParents((prev) => prev.filter((p) => p.id !== parentId));
      onSuccess('Родитель отвязан');
      onUpdated?.();
    } catch (e) { onError(apiError(e, 'Ошибка при отвязке родителя')); }
    finally { setBusy(false); }
  };

  return (
    <Section icon={Phone} title="Родители" badge={
      parentLoading ? <Loader2 size={12} className="animate-spin text-zinc-400 ml-1" /> :
      parents.length > 0 ? <span className="ml-1 px-2 py-0.5 rounded-full text-[8px] font-semibold bg-zinc-100 text-zinc-700">{parents.length}</span> : null
    }>
      {parentLoading ? (
        <div className="text-xs text-zinc-400 py-2 flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Загрузка...</div>
      ) : parents.length > 0 ? (
        <div className="space-y-2">
          {parents.map((p) => (
            <div key={p.id} className="p-2 bg-zinc-50 rounded-xl border border-zinc-200 space-y-1.5">
              {editingParentId === p.id ? (
                <div className="space-y-2">
                  <input type="text" placeholder="Имя *" value={parentForm.name} onChange={(e) => setParentForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full p-2 bg-white border border-zinc-200 rounded-xl text-xs font-bold outline-none" />
                  <input type="text" placeholder="Телефон" value={parentForm.phone} onChange={(e) => setParentForm((f) => ({ ...f, phone: e.target.value }))}
                    className="w-full p-2 bg-white border border-zinc-200 rounded-xl text-xs outline-none" />
                  <input type="text" placeholder="TG username" value={parentForm.tg_username} onChange={(e) => setParentForm((f) => ({ ...f, tg_username: e.target.value }))}
                    className="w-full p-2 bg-white border border-zinc-200 rounded-xl text-xs outline-none" />
                  <input type="text" placeholder="Комментарий" value={parentForm.comment} onChange={(e) => setParentForm((f) => ({ ...f, comment: e.target.value }))}
                    className="w-full p-2 bg-white border border-zinc-200 rounded-xl text-xs outline-none" />
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingParentId(null); onError(null); }} className="flex-1 p-2 bg-zinc-100 rounded-xl text-xs font-semibold text-zinc-500">Отмена</button>
                    <button onClick={() => handleEditParent(p.id)} disabled={busy || !parentForm.name.trim()}
                      className="flex-1 p-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 rounded-xl text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 flex items-center justify-center gap-1">
                      {busy ? <Loader2 size={12} className="animate-spin" /> : null} Сохранить
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-xs text-zinc-500 space-y-0.5">
                    <div className="font-bold text-zinc-700">{p.name}</div>
                    {p.phone && <div>📞 {p.phone}</div>}
                    {p.tg_username && <div className="text-zinc-500">{p.tg_username}</div>}
                    {p.comment && <div className="text-[10px]">{p.comment}</div>}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => { setParentForm({ name: p.name, phone: p.phone || '', tg_username: p.tg_username || '', comment: p.comment || '' }); setEditingParentId(p.id); onError(null); }}
                      className="px-3 py-1.5 bg-zinc-200 hover:bg-zinc-300 rounded-xl text-[10px] font-semibold text-zinc-600 flex items-center gap-1">
                      <Pencil size={10} /> Ред.
                    </button>
                    <button onClick={() => handleUnlinkParent(p.id)} disabled={busy}
                      className="px-3 py-1.5 bg-zinc-200 hover:bg-zinc-300 rounded-xl text-[10px] font-semibold text-zinc-600 flex items-center gap-1 disabled:opacity-50">
                      <Unlink size={10} /> Отвязать
                    </button>
                    <button onClick={() => handleDeleteParent(p.id)} disabled={busy}
                      className="px-3 py-1.5 bg-red-50 hover:bg-red-100 rounded-xl text-[10px] font-semibold text-red-600 flex items-center gap-1 disabled:opacity-50">
                      <Trash2 size={10} /> Удалить
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      ) : showParentForm ? (
        <div className="space-y-2">
          <input type="text" placeholder="Имя родителя *" value={parentForm.name} onChange={(e) => setParentForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full p-2 bg-white border border-zinc-200 rounded-xl text-xs font-bold outline-none" />
          <input type="text" placeholder="Телефон" value={parentForm.phone} onChange={(e) => setParentForm((f) => ({ ...f, phone: e.target.value }))}
            className="w-full p-2 bg-white border border-zinc-200 rounded-xl text-xs outline-none" />
          <input type="text" placeholder="TG username" value={parentForm.tg_username} onChange={(e) => setParentForm((f) => ({ ...f, tg_username: e.target.value }))}
            className="w-full p-2 bg-white border border-zinc-200 rounded-xl text-xs outline-none" />
          <input type="text" placeholder="Комментарий" value={parentForm.comment} onChange={(e) => setParentForm((f) => ({ ...f, comment: e.target.value }))}
            className="w-full p-2 bg-white border border-zinc-200 rounded-xl text-xs outline-none" />
          <div className="flex gap-2">
            <button onClick={() => { setShowParentForm(false); onError(null); }} className="flex-1 p-2 bg-zinc-100 rounded-xl text-xs font-semibold text-zinc-500">Отмена</button>
            <button onClick={handleCreateParent} disabled={busy || !parentForm.name.trim()}
              className="flex-1 p-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 rounded-xl text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 flex items-center justify-center gap-1">
              {busy ? <Loader2 size={12} className="animate-spin" /> : <Link2 size={12} />} Создать и привязать
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-xs text-zinc-400 py-2">Не указаны</div>
          <div className="flex gap-2">
            <button onClick={() => { setShowParentForm(true); setParentForm(emptyParentForm); onError(null); }}
              className="flex-1 p-2 bg-zinc-200 hover:bg-zinc-300 rounded-xl text-[10px] font-semibold text-zinc-600 flex items-center justify-center gap-1">
              <PlusCircle size={12} /> Создать
            </button>
            <button onClick={() => { setShowParentPicker(true); setParentSearch(''); onError(null); }}
              className="flex-1 p-2 bg-zinc-200 hover:bg-zinc-300 rounded-xl text-[10px] font-semibold text-zinc-600 flex items-center justify-center gap-1">
              <Link2 size={12} /> Привязать
            </button>
          </div>

          {/* Existing parent picker */}
          {showParentPicker && (
            <div className="space-y-2 mt-2 p-3 bg-zinc-50 rounded-xl border border-zinc-200">
              <input
                type="text" placeholder="Поиск по имени или телефону…" value={parentSearch}
                onChange={(e) => setParentSearch(e.target.value)}
                className="w-full p-2 bg-white border border-zinc-200 rounded-xl text-xs outline-none" />
              {parentsLoading ? (
                <div className="text-xs text-zinc-400 py-2 flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Загрузка...</div>
              ) : (() => {
                const filtered = allParents.filter((p) =>
                  !parentSearch || (p.name || '').toLowerCase().includes(parentSearch.toLowerCase()) || (p.phone || '').includes(parentSearch));
                return filtered.length === 0 ? (
                  <div className="text-xs text-zinc-400 py-2">Ничего не найдено</div>
                ) : (
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {filtered.map((p) => {
                      const linkedCount = (p.student_ids || []).length;
                      return (
                      <button key={p.id}
                        onClick={() => handleLinkExistingParent(p)}
                        disabled={busy}
                        className="w-full p-2 bg-white hover:bg-zinc-50 rounded-lg text-xs text-left flex items-center justify-between transition-all border border-transparent hover:border-zinc-200 disabled:opacity-50">
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-zinc-700 truncate">{p.name}</div>
                          <div className="text-zinc-400 text-[10px] flex items-center gap-2">
                            <span>{p.phone || '—'}</span>
                            {linkedCount > 0 && (
                              <span className="px-1.5 py-0.5 rounded-full bg-zinc-200 text-zinc-500 text-[9px] font-bold">
                                {linkedCount} уч.
                              </span>
                            )}
                          </div>
                        </div>
                        <Link2 size={12} className="text-zinc-500 shrink-0 ml-2" />
                      </button>
                    );})}
                  </div>
                );
              })()}
              <button onClick={() => { setShowParentPicker(false); onError(null); }}
                className="w-full p-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-600">Отмена</button>
            </div>
          )}
        </div>
      )}
    </Section>
  );
}

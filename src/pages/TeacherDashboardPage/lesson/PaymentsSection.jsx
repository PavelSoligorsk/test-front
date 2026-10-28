import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, CreditCard, Loader2, Pencil, PlusCircle, Trash2, Wallet } from 'lucide-react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { teacherApi } from '../../../features/teacher/api';
import { useConfirm } from '../../../shared/ui';
import Section from './Section';
import { PAYMENT_STATUS_MAP, apiError, formatBalance } from './lessonFormat';

dayjs.extend(utc);

const emptyPayForm = (lessonId) => ({ payment_type: 'per_lesson', amount: '', comment: '', lesson_id: lessonId, package_total: '', valid_from: '', valid_until: '' });

/**
 * Баланс и оплаты ученика. refreshKey меняет окно занятия после своих действий
 * (завершение, смена статуса), чтобы список подтянулся заново без потери форм.
 */
export default function PaymentsSection({ lessonId, studentId, studentBalance, refreshKey, onError, onSuccess, onUpdated }) {
  const confirm = useConfirm();
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [showPayForm, setShowPayForm] = useState(false);
  const [payForm, setPayForm] = useState(() => emptyPayForm(lessonId));
  const [payStats, setPayStats] = useState(null);
  const [editingPaymentId, setEditingPaymentId] = useState(null);
  const [editPayForm, setEditPayForm] = useState({ payment_type: 'per_lesson', amount: '', comment: '', package_total: '', valid_from: '', valid_until: '' });
  const [busy, setBusy] = useState(null);

  const fetchPayments = useCallback(() => Promise.all([
    teacherApi.getPayments(studentId),
    teacherApi.getPaymentsStats(null, null, studentId),
  ])
    .then(([payRes, statsRes]) => {
      setPayments(payRes.data || []);
      setPayStats(statsRes.data);
    })
    .catch(() => { /* ignore */ })
    .finally(() => setPaymentsLoading(false)), [studentId]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments, refreshKey]);

  const handleCreatePayment = async () => {
    if (!payForm.amount) { onError('Укажите сумму'); return; }
    setBusy('payment'); onError(null);
    try {
      const body = {
        student_id: studentId,
        payment_type: 'per_lesson',
        amount: Number(payForm.amount),
        comment: payForm.comment || undefined,
        lesson_id: payForm.lesson_id || lessonId,
      };
      await teacherApi.createPayment(body);
      onSuccess('Платёж создан');
      setShowPayForm(false);
      resetPayForm();
      fetchPayments();
      onUpdated?.();
    } catch (e) { onError(apiError(e, 'Ошибка при создании платежа')); }
    finally { setBusy(null); }
  };

  const handleMarkPaid = async (pid) => {
    setBusy(`pay-${pid}`); onError(null);
    try {
      await teacherApi.markPaymentPaid(pid);
      onSuccess('Оплата отмечена');
      fetchPayments();
      onUpdated?.();
    } catch (e) { onError(apiError(e, 'Ошибка')); }
    finally { setBusy(null); }
  };

  const handleCancelPayment = async (pid) => {
    setBusy(`pay-${pid}`); onError(null);
    try {
      await teacherApi.cancelPayment(pid);
      onSuccess('Платёж отменён');
      fetchPayments();
      onUpdated?.();
    } catch (e) { onError(apiError(e, 'Ошибка')); }
    finally { setBusy(null); }
  };

  const resetPayForm = () => setPayForm(emptyPayForm(lessonId));

  const paymentToForm = (p) => ({
    payment_type: p.payment_type || 'per_lesson',
    amount: String(p.amount || ''),
    comment: p.comment || '',
    package_total: p.package_total != null ? String(p.package_total) : '',
    valid_from: p.valid_from ? dayjs.utc(p.valid_from).format('YYYY-MM-DDTHH:mm') : '',
    valid_until: p.valid_until ? dayjs.utc(p.valid_until).format('YYYY-MM-DDTHH:mm') : '',
  });

  const handleEditPayment = async (pid) => {
    if (!editPayForm.amount) { onError('Укажите сумму'); return; }
    setBusy(`pay-${pid}`); onError(null);
    try {
      const body = {
        payment_type: 'per_lesson',
        amount: Number(editPayForm.amount),
        comment: editPayForm.comment || undefined,
      };
      await teacherApi.updatePayment(pid, body);
      onSuccess('Платёж обновлён');
      setEditingPaymentId(null);
      fetchPayments();
      onUpdated?.();
    } catch (e) { onError(apiError(e, 'Ошибка при обновлении платежа')); }
    finally { setBusy(null); }
  };

  const handleDeletePayment = async (pid) => {
    if (!(await confirm('Удалить этот платёж? Действие необратимо.', { danger: true, confirmLabel: 'Удалить' }))) return;
    setBusy(`pay-${pid}`); onError(null);
    try {
      await teacherApi.deletePayment(pid);
      onSuccess('Платёж удалён');
      fetchPayments();
      onUpdated?.();
    } catch (e) { onError(apiError(e, 'Ошибка при удалении платежа')); }
    finally { setBusy(null); }
  };

  return (
    <>
      {/* --- 4. Student Balance --- */}
      <Section icon={Wallet} title="Баланс ученика" badge={
        studentBalance != null && (
          <span className={`ml-1 text-xs font-medium ${studentBalance >= 0 ? 'text-zinc-600' : 'text-red-600'}`}>
            {formatBalance(studentBalance*100)}
          </span>
        )
      }>
        <div className="grid grid-cols-1 gap-2 text-center">
          <div className={`rounded-xl p-3 ${studentBalance != null ? (studentBalance >= 0 ? 'bg-zinc-50' : 'bg-red-50') : 'bg-zinc-50'}`}>
            <div className="text-[9px] text-zinc-400 font-bold mb-1">Текущий баланс</div>
            <div className={`text-lg font-semibold ${studentBalance != null ? (studentBalance >= 0 ? 'text-zinc-600' : 'text-red-600') : 'text-zinc-400'}`}>
              {studentBalance != null ? formatBalance(studentBalance) : '—'}
            </div>
          </div>
        </div>
        {studentBalance != null && studentBalance < 0 && (
          <div className="bg-red-50 rounded-xl p-2 flex items-center gap-2">
            <AlertTriangle size={14} className="text-red-500 shrink-0" />
            <span className="text-[10px] font-bold text-red-600">Баланс отрицательный — пополните счёт ученика</span>
          </div>
        )}
      </Section>

      {/* --- 5. Payments section --- */}
      <Section icon={CreditCard} title="Оплаты" badge={
        payStats ? <span className="ml-1 text-xs font-medium text-zinc-600">{payStats.total || 0} ₽</span> : null
      }>
        {paymentsLoading ? (
          <div className="text-xs text-zinc-400 py-2 flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Загрузка...</div>
        ) : (
          <>
            {/* Stats with per-type breakdown */}
            {payStats && (
              <div className="space-y-1.5">
                <div className="grid grid-cols-3 gap-1.5 text-center">
                  <div className="bg-white rounded-xl p-1.5">
                    <div className="text-[8px] text-zinc-400 font-bold">Всего</div>
                    <div className="text-xs font-semibold text-zinc-600">{payStats.total || 0} ₽</div>
                  </div>
                  <div className="bg-white rounded-xl p-1.5">
                    <div className="text-[8px] text-zinc-400 font-bold">Платежей</div>
                    <div className="text-xs font-semibold text-zinc-700">{payStats.count || 0}</div>
                  </div>
                  <div className="bg-white rounded-xl p-1.5">
                    <div className="text-[8px] text-zinc-400 font-bold">Баланс</div>
                    <div className={`text-xs font-semibold ${(studentBalance >= 0) ? 'text-zinc-600' : 'text-red-600'}`}>
                      {studentBalance != null ? formatBalance(studentBalance) : '—'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Payment list */}
            {payments.length === 0 ? (
              <div className="text-xs text-zinc-400 py-2">Нет платежей</div>
            ) : (
              <div className="space-y-1.5 max-h-52 overflow-y-auto">
                {payments.map((p) => {
                  const isCancelled = p.status === 'cancelled';
                  const isEditing = editingPaymentId === p.id;

                  if (isEditing) {
                    return (
                      <div key={p.id} className="bg-white rounded-xl p-2 border border-zinc-200 space-y-1.5">
                        <input type="number" placeholder="Сумма *" value={editPayForm.amount} onChange={(e) => setEditPayForm((f) => ({ ...f, amount: e.target.value }))}
                          className="w-full p-1.5 bg-zinc-50 rounded-lg text-[10px] font-bold outline-none" />
                        <input type="text" placeholder="Комментарий" value={editPayForm.comment} onChange={(e) => setEditPayForm((f) => ({ ...f, comment: e.target.value }))}
                          className="w-full p-1.5 bg-zinc-50 rounded-lg text-[10px] outline-none" />
                        <div className="flex gap-1">
                          <button onClick={() => { setEditingPaymentId(null); onError(null); }}
                            className="flex-1 p-1.5 bg-zinc-100 rounded-lg text-xs font-medium text-zinc-500">Отмена</button>
                          <button onClick={() => handleEditPayment(p.id)} disabled={busy === `pay-${p.id}` || !editPayForm.amount}
                            className="flex-1 p-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 rounded-lg text-xs font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 flex items-center justify-center gap-1">
                            {busy === `pay-${p.id}` ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle2 size={10} />} Сохранить
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={p.id} className={`bg-white rounded-xl p-2 border ${isCancelled ? 'border-gray-200 opacity-50' : 'border-zinc-100'}`}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-1.5 py-0.5 rounded-full text-[7px] font-semibold ${PAYMENT_STATUS_MAP[p.status]?.color || 'bg-gray-100 text-gray-700'}`}>
                              {PAYMENT_STATUS_MAP[p.status]?.label || p.status}
                            </span>
                          </div>
                          {p.comment && (
                            <div className="text-[9px] text-zinc-600 mt-0.5 truncate">{p.comment}</div>
                          )}
                          {p.paid_at && (
                            <div className="text-[7px] text-zinc-400 mt-0.5">{dayjs.utc(p.paid_at).format('DD.MM.YYYY HH:mm')}</div>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs font-semibold text-zinc-800">{p.amount} ₽</div>
                          <div className="flex gap-1 mt-0.5">
                            {/* Edit / Delete buttons */}
                            <button onClick={() => { setEditingPaymentId(p.id); setEditPayForm(paymentToForm(p)); onError(null); }}
                              className="text-[7px] font-semibold text-zinc-500 hover:text-zinc-700 bg-zinc-100 px-1 py-0.5 rounded-lg">
                              <Pencil size={9} />
                            </button>
                            <button onClick={() => handleDeletePayment(p.id)} disabled={busy === `pay-${p.id}`}
                              className="text-[7px] font-semibold text-red-500 hover:text-red-600 bg-red-50 px-1 py-0.5 rounded-lg">
                              <Trash2 size={9} />
                            </button>
                            {p.status === 'pending' && (
                              <button onClick={() => handleMarkPaid(p.id)} disabled={busy === `pay-${p.id}`}
                                className="text-[7px] font-semibold text-zinc-600 hover:text-zinc-700 bg-zinc-50 px-1.5 py-0.5 rounded-lg">
                                {busy === `pay-${p.id}` ? <Loader2 size={10} className="animate-spin" /> : 'Оплатить'}
                              </button>
                            )}
                            {p.status === 'paid' && (
                              <button onClick={() => handleCancelPayment(p.id)} disabled={busy === `pay-${p.id}`}
                                className="text-[7px] font-semibold text-red-500 hover:text-red-600 bg-red-50 px-1.5 py-0.5 rounded-lg">
                                {busy === `pay-${p.id}` ? <Loader2 size={10} className="animate-spin" /> : 'Отменить'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Create payment */}
            {!showPayForm ? (
              <button onClick={() => { setShowPayForm(true); onError(null); }}
                className="w-full p-2 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 rounded-xl text-[10px] font-semibold flex items-center justify-center gap-1">
                <PlusCircle size={12} /> Пополнить баланс
              </button>
            ) : (
              <div className="space-y-2 bg-white rounded-xl p-3 border border-zinc-200">
                <input type="number" placeholder="Сумма (BYN) *" value={payForm.amount} onChange={(e) => setPayForm((f) => ({ ...f, amount: e.target.value }))}
                  className="w-full p-2 bg-zinc-50 rounded-xl text-xs font-bold outline-none" />
                <input type="text" placeholder="Комментарий" value={payForm.comment} onChange={(e) => setPayForm((f) => ({ ...f, comment: e.target.value }))}
                  className="w-full p-2 bg-zinc-50 rounded-xl text-xs outline-none" />
                <div className="flex gap-2">
                  <button onClick={() => setShowPayForm(false)} className="flex-1 p-2 bg-zinc-100 rounded-xl text-xs font-semibold text-zinc-500">Отмена</button>
                  <button onClick={handleCreatePayment} disabled={busy === 'payment' || !payForm.amount}
                    className="flex-1 p-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 rounded-xl text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 flex items-center justify-center gap-1 shadow-sm">
                    {busy === 'payment' ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Пополнить
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </Section>
    </>
  );
}

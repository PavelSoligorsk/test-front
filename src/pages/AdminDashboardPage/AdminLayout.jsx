import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { RoleNav, InlineNotice, PageShell, Sheet, primaryBtnClass } from '../../shared/ui';
import { restoreSession } from '../../shared/lib/session';
import { AdminWorkspaceProvider, useAdminWorkspace } from './AdminWorkspace';
import { ADMIN_PATHS, ADMIN_TABS, adminTabFromPath } from './adminPaths';

function AdminChrome() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = restoreSession();
  const displayName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.username || 'Админ';
  const activeKey = adminTabFromPath(location.pathname);
  const ws = useAdminWorkspace();

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 font-sans selection:bg-zinc-200 dark:selection:bg-zinc-800 pb-24">
      <RoleNav
        tabs={ADMIN_TABS}
        activeKey={activeKey}
        onSelect={(key) => navigate(ADMIN_PATHS[key] || ADMIN_PATHS.create)}
        displayName={displayName}
        subtitle="Админ"
      />

      {ws.notice ? (
        <PageShell className="!pb-0 !pt-4">
          <div className="flex items-start justify-between gap-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090b] px-4 py-3 shadow-sm">
            <InlineNotice tone={ws.notice.tone}>{ws.notice.text}</InlineNotice>
            <button type="button" onClick={ws.clearNotice} className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
              Закрыть
            </button>
          </div>
        </PageShell>
      ) : null}

      <Outlet />

      <PageShell className="!pt-0">
        <Sheet className="p-6 md:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">Глобальная синхронизация</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Обновить структуру тестов</p>
          </div>
          <button type="button" onClick={ws.handleGlobalSync} className={primaryBtnClass}>
            Запустить итератор
          </button>
        </Sheet>
      </PageShell>
    </div>
  );
}

export default function AdminLayout() {
  return (
    <AdminWorkspaceProvider>
      <AdminChrome />
    </AdminWorkspaceProvider>
  );
}

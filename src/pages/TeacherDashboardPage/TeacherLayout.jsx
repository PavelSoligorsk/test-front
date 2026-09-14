import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ClipboardList, GraduationCap } from 'lucide-react';
import { RoleNav, InlineNotice, PageShell } from '../../shared/ui';
import { restoreSession } from '../../shared/lib/session';
import { TeacherWorkspaceProvider, useTeacherWorkspace } from './TeacherWorkspace';
import { TEACHER_PATHS, TEACHER_TABS, teacherTabFromPath } from './teacherPaths';
import TestManageModal from './TestManageModal';
import GroupStudentsModal from './GroupStudentsModal';
import AssignTestToGroupModal from './AssignTestToGroupModal';
import CreateGroupModal from './CreateGroupModal';
import AiTestGeneratorModal from './AiTestGeneratorModal';

function TeacherChrome() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = restoreSession();
  const displayName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.username || '';
  const activeKey = teacherTabFromPath(location.pathname);
  const ws = useTeacherWorkspace();

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 font-sans selection:bg-zinc-200 dark:selection:bg-zinc-800 pb-24">
      <RoleNav
        tabs={TEACHER_TABS}
        activeKey={activeKey === 'profile' ? null : activeKey}
        onSelect={(key) => navigate(TEACHER_PATHS[key] || TEACHER_PATHS.bank)}
        displayName={displayName || 'Учитель'}
        subtitle="Учитель"
        icon={<GraduationCap size={16} strokeWidth={2} />}
        onBrandClick={() => navigate(TEACHER_PATHS.profile)}
      />

      {ws.notice ? (
        <PageShell className="!pb-0 !pt-4">
          <div className="flex items-start justify-between gap-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090b] px-4 py-3 shadow-sm">
            <InlineNotice tone={ws.notice.tone}>{ws.notice.text}</InlineNotice>
            <button
              type="button"
              onClick={ws.clearNotice}
              className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              Закрыть
            </button>
          </div>
        </PageShell>
      ) : null}

      <Outlet />

      {ws.manageTestModal && (
        <TestManageModal
          test={ws.manageTestModal}
          students={ws.students}
          groups={ws.groups}
          onClose={() => ws.setManageTestModal(null)}
          onAssign={ws.handleAssignTest}
          onAssignToGroup={ws.handleAssignTestToGroup}
        />
      )}

      {ws.groupStudentsModal && (
        <GroupStudentsModal
          group={ws.groupStudentsModal}
          allStudents={ws.students}
          onClose={() => ws.setGroupStudentsModal(null)}
          onAdd={ws.handleAddStudentsToGroup}
          onRemove={ws.handleRemoveStudentFromGroup}
          navigate={navigate}
        />
      )}

      {ws.assignGroupModal && (
        <AssignTestToGroupModal
          group={ws.assignGroupModal}
          tests={ws.tests}
          onClose={() => ws.setAssignGroupModal(null)}
          onAssign={ws.handleAssignTestToGroup}
          navigate={navigate}
        />
      )}

      {ws.groupCreateModal != null && (
        <CreateGroupModal
          groupForm={ws.groupCreateModal}
          allStudents={ws.students}
          onClose={() => ws.setGroupCreateModal(null)}
          onSave={ws.handleSaveGroupFromModal}
          navigate={navigate}
        />
      )}

      {ws.aiGeneratorModal && (
        <AiTestGeneratorModal
          groups={ws.groups}
          allStudents={ws.students}
          onClose={() => ws.setAiGeneratorModal(false)}
          onGenerate={ws.handleGenerateAiTest}
        />
      )}

      {ws.selectedTasks.length > 0 && activeKey !== 'constructor' && (
        <div className="fixed bottom-6 right-6 z-40">
          <button
            type="button"
            onClick={() => navigate(TEACHER_PATHS.constructor)}
            className="flex items-center gap-2 px-4 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 rounded-xl text-sm font-medium shadow-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-white"
          >
            <ClipboardList size={16} />
            Тест: {ws.selectedTasks.length} заданий
          </button>
        </div>
      )}
    </div>
  );
}

export default function TeacherLayout() {
  return (
    <TeacherWorkspaceProvider>
      <TeacherChrome />
    </TeacherWorkspaceProvider>
  );
}

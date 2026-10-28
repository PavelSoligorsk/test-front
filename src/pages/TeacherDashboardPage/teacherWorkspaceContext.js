import { createContext, useContext } from 'react';

export const TeacherWorkspaceContext = createContext(null);

export function useTeacherWorkspace() {
  const ctx = useContext(TeacherWorkspaceContext);
  if (!ctx) throw new Error('useTeacherWorkspace must be used within TeacherWorkspaceProvider');
  return ctx;
}

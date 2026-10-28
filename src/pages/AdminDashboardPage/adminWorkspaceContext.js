import { createContext, useContext } from 'react';

export const AdminWorkspaceContext = createContext(null);

export function useAdminWorkspace() {
  const ctx = useContext(AdminWorkspaceContext);
  if (!ctx) throw new Error('useAdminWorkspace must be used within AdminWorkspaceProvider');
  return ctx;
}

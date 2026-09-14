import { Navigate, useSearchParams } from 'react-router-dom';
import { ADMIN_PATHS, ADMIN_TAB_ALIASES } from './adminPaths';

export default function AdminIndexRedirect() {
  const [params] = useSearchParams();
  const tab = params.get('tab');
  if (tab && ADMIN_TAB_ALIASES[tab]) {
    return <Navigate to={ADMIN_PATHS[ADMIN_TAB_ALIASES[tab]]} replace />;
  }
  if (tab && ADMIN_PATHS[tab]) return <Navigate to={ADMIN_PATHS[tab]} replace />;
  return <Navigate to={ADMIN_PATHS.create} replace />;
}

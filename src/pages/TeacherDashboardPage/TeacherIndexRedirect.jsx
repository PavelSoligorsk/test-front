import { Navigate, useSearchParams } from 'react-router-dom';
import { TEACHER_PATHS, TEACHER_TAB_ALIASES } from './teacherPaths';

export default function TeacherIndexRedirect() {
  const [params] = useSearchParams();
  const tab = params.get('tab');
  if (tab && TEACHER_TAB_ALIASES[tab]) {
    const key = TEACHER_TAB_ALIASES[tab];
    return <Navigate to={TEACHER_PATHS[key]} replace />;
  }
  if (tab && TEACHER_PATHS[tab]) return <Navigate to={TEACHER_PATHS[tab]} replace />;
  return <Navigate to={TEACHER_PATHS.bank} replace />;
}

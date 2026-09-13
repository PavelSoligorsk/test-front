import { Navigate, useSearchParams } from 'react-router-dom';
import { STUDENT_PATHS } from './studentPaths';

export default function StudentIndexRedirect() {
  const [params] = useSearchParams();
  const tab = params.get('tab');
  if (tab && STUDENT_PATHS[tab]) return <Navigate to={STUDENT_PATHS[tab]} replace />;
  return <Navigate to={STUDENT_PATHS.tests} replace />;
}

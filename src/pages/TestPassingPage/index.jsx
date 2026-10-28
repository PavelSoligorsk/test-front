import { useLocation } from 'react-router-dom';
import TestPassingContent from './TestPassingContent';

// Пересдача ведёт на тот же адрес с новыми данными старта: каждый переход — новая попытка
// с чистым состоянием, а не продолжение прежней.
export default function TestPassingPage() {
  const location = useLocation();
  return <TestPassingContent key={location.key} />;
}

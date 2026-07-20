import { TestReport } from '../../components/TestReport';

export default function TestResultReport({ test, userAnswers, drawings, onBack }) {
  return <TestReport test={test} userAnswers={userAnswers} drawings={drawings} onBack={onBack} />;
}

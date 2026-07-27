import { TestReport } from '../../components/TestReport';

export default function TestResultReport({ test, userAnswers, drawings, onBack, testId, resultId, onRetake }) {
  return <TestReport test={test} userAnswers={userAnswers} drawings={drawings} onBack={onBack} testId={testId} userId={resultId} onRetake={onRetake} />;
}

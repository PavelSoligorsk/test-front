import { useState, useCallback } from 'react';

export function useTestPassing() {
  const [currentTest, setCurrentTest] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const startTest = useCallback((test) => {
    setCurrentTest(test);
    setCurrentQuestion(0);
    setAnswers({});
    setResult(null);
    setError(null);
  }, []);

  const setAnswer = useCallback((questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  }, []);

  const nextQuestion = useCallback(() => {
    if (currentTest && currentQuestion < currentTest.tasks?.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    }
  }, [currentTest, currentQuestion]);

  const prevQuestion = useCallback(() => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  }, [currentQuestion]);

  const submitTest = useCallback(async () => {
    if (!currentTest) return;
    setLoading(true);
    setError(null);
    try {
      const { testPassingApi } = await import('../api');
      const response = await testPassingApi.submitTest(currentTest.id, answers);
      setResult(response.data);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка при отправке теста');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentTest, answers]);

  const resetTest = useCallback(() => {
    setCurrentTest(null);
    setCurrentQuestion(0);
    setAnswers({});
    setResult(null);
    setError(null);
  }, []);

  return {
    currentTest,
    currentQuestion,
    answers,
    loading,
    result,
    error,
    startTest,
    setAnswer,
    nextQuestion,
    prevQuestion,
    submitTest,
    resetTest,
  };
}

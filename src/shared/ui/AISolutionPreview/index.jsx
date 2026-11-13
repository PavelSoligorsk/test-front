import AiReply from '../AiReply';

export default function AISolutionPreview({ data, isLoading = false, error = null, onClose = null, framed = true }) {
  if (isLoading) {
    return <AiReply title="AI-решение" isLoading loadingText="Генерирую решение..." onClose={onClose} framed={framed} disclaimer={false} />;
  }

  if (error) {
    return <AiReply title="AI-решение" error={error} onClose={onClose} framed={framed} disclaimer={false} />;
  }

  if (!data) return null;

  const hasSolution = data.ai_solution && data.ai_solution.trim().length > 0;
  const isSuccess = data.success !== false;
  if (!isSuccess || !hasSolution) {
    return (
      <AiReply
        title="AI-решение"
        text={data.message || 'Не удалось получить решение от ИИ.'}
        onClose={onClose}
        framed={framed}
        disclaimer={false}
      />
    );
  }

  return (
    <AiReply
      title="AI-решение"
      text={data.ai_solution.replace(/===\s*ОТВЕТ\s*===/gi, '\n\n**Ответ**\n\n')}
      figures={Array.isArray(data.geogebra) ? data.geogebra : null}
      onClose={onClose}
      framed={framed}
    />
  );
}

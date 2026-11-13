import AiReply from '../AiReply';

export default function MathHintPreview({
  text,
  geogebra,
  title = 'AI-подсказка',
  isLoading = false,
  error = null,
  onClose = null,
  framed = true,
}) {
  const hintText = typeof text === 'object' && text != null
    ? (text.hint || '')
    : (text || '');
  const figures = Array.isArray(geogebra)
    ? geogebra
    : (Array.isArray(text?.geogebra) ? text.geogebra : null);

  return (
    <AiReply
      title={title}
      text={hintText || (isLoading || error ? '' : '*Подсказка появится здесь...*')}
      figures={figures}
      isLoading={isLoading}
      loadingText="Генерирую подсказку..."
      error={error}
      onClose={onClose}
      framed={framed}
      disclaimer={Boolean(hintText) && hintText !== '*Подсказка появится здесь...*'}
    />
  );
}

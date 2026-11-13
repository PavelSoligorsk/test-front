import { Histogram } from '../StudentStatsPage/charts';

function chartItems(difficultyStats) {
  return [1, 2, 3, 4, 5].map((level) => {
    const stat = difficultyStats?.[level] || difficultyStats?.[String(level)] || {};
    const total = Number(stat.total) || 0;
    const correct = Number(stat.correct) || 0;
    return {
      id: level,
      label: `Уровень ${level}`,
      axis: `${level} ур.`,
      value: total ? Math.round((correct / total) * 100) : 0,
      meta: total > 0 ? `${correct}/${total}` : 'нет задач',
      empty: total === 0,
    };
  });
}

export default function DifficultyStats({ difficultyStats }) {
  if (!difficultyStats || !Object.values(difficultyStats).some((stat) => stat.total > 0)) return null;

  return (
    <Histogram
      height={150}
      items={chartItems(difficultyStats)}
      ariaLabel="Доля верных ответов по уровням сложности"
    />
  );
}

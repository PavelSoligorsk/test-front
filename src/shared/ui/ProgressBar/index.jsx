export default function ProgressBar({
  value = 0,
  max = 100,
  size = 'md',
  color = 'blue',
  showLabel = true,
  className = '',
}) {
  const percent = Math.min(Math.max((value / max) * 100, 0), 100);

  const sizes = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  const colors = {
    blue: 'bg-blue-500',
    green: 'bg-emerald-500',
    red: 'bg-red-500',
    yellow: 'bg-amber-500',
    purple: 'bg-purple-500',
    gradient: 'bg-gradient-to-r from-blue-500 to-purple-500',
  };

  return (
    <div className={`w-full ${className}`}>
      <div className={`w-full bg-slate-100 rounded-full overflow-hidden ${sizes[size] || sizes.md}`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ${colors[color] || colors.blue}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      {showLabel && (
        <p className="text-xs text-slate-500 font-medium mt-1 text-right">
          {Math.round(percent)}%
        </p>
      )}
    </div>
  );
}

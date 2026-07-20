export default function Card({
  children,
  className = '',
  padding = true,
  hover = false,
  onClick,
}) {
  const base = 'bg-white rounded-2xl border border-slate-100 shadow-sm';
  const hoverClass = hover ? 'hover:shadow-md hover:border-slate-200 transition-all duration-200 cursor-pointer' : '';
  const paddingClass = padding ? 'p-6' : '';

  return (
    <div
      className={`${base} ${hoverClass} ${paddingClass} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

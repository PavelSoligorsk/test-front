export default function Spinner({ size = 'md', text = 'Загрузка...' }) {
  
  const sizeMap = {
    sm: 'w-6 h-6 border-2',
    md: 'w-10 h-10 border-3',
    lg: 'w-16 h-16 border-4',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className={`${sizeMap[size] || sizeMap.md} border-slate-200 border-t-blue-600 rounded-full animate-spin`} />
      {text && (
        <p className="font-black uppercase tracking-widest text-slate-400 text-[10px]">
          {text}
        </p>
      )}
    </div>
  );
}

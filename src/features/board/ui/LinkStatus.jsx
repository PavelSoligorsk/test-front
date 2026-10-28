import { WifiOff } from 'lucide-react';

export default function LinkStatus({ link }) {
  if (link.state !== 'offline') return null;
  const base = 'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2 text-[11px] font-medium';
  const text = link.pending ? `Потеряно соединение · ${link.pending} в очереди` : 'Потеряно соединение';
  return (
    <span className={`${base} text-amber-600`} title="Правки отправятся после переподключения">
      <WifiOff size={13} />
      <span className="hidden sm:inline">{text}</span>
    </span>
  );
}

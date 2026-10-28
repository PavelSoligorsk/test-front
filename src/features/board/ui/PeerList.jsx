import { initials, peerColor, peerName } from './peers';

export default function PeerList({ peers, compact = false }) {
  if (!peers.length) return null;
  const shown = peers.slice(0, 4);
  const rest = peers.length - shown.length;
  return (
    <div
      className={`flex shrink-0 items-center ${compact ? 'pr-1' : 'rounded-2xl border border-zinc-200/80 bg-white/90 py-1 pl-1 pr-2 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/90'}`}
      title={peers.map(peerName).join(', ')}
    >
      <div className="flex -space-x-1.5">
        {shown.map((peer) => (
          <span
            key={peer.clientId}
            className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold text-white ring-2 ring-white dark:ring-zinc-950"
            style={{ background: peerColor(peer.clientId) }}
          >
            {initials(peerName(peer))}
          </span>
        ))}
      </div>
      {rest > 0 && <span className="ml-1.5 text-[11px] font-medium text-zinc-500">+{rest}</span>}
    </div>
  );
}

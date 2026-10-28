import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

// --- Section wrapper (collapsible) ---
export default function Section({ icon: Icon, title, badge, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-zinc-50 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full p-4 flex items-center justify-between hover:bg-zinc-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon size={16} className="text-zinc-400" />
          <span className="text-xs font-semibold text-zinc-400">{title}</span>
          {badge}
        </div>
        {open ? <ChevronUp size={14} className="text-zinc-400" /> : <ChevronDown size={14} className="text-zinc-400" />}
      </button>
      {open && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  );
}

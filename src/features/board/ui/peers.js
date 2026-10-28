// Участники доски: цвет, подпись, инициалы.

const PEER_COLORS = ['#e11d48', '#2563eb', '#16a34a', '#d97706', '#9333ea', '#0891b2', '#db2777', '#4f46e5'];

export function peerColor(clientId) {
  let hash = 0;
  for (const char of String(clientId || '')) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return PEER_COLORS[Math.abs(hash) % PEER_COLORS.length];
}

export function peerName(peer) {
  return peer?.name || (peer?.role === 'teacher' ? 'Учитель' : 'Ученик');
}

export function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : (parts[0] || '?').slice(0, 2)).toUpperCase();
}

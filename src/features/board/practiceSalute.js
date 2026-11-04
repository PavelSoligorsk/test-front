const COLORS = ['#18181b', '#f59e0b', '#10b981', '#e11d48', '#fafafa'];

function tone(ctx, freq, when, dur, type, peak) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, when);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(peak, when + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(when);
  osc.stop(when + dur + 0.02);
}

function crackle(ctx, when) {
  const length = Math.floor(ctx.sampleRate * 0.25);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const noise = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  noise.buffer = buffer;
  filter.type = 'highpass';
  filter.frequency.value = 1200;
  gain.gain.setValueAtTime(0.18, when);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.25);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  noise.start(when);
  noise.stop(when + 0.26);
}

function poopSound(ctx, when) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(180, when);
  osc.frequency.exponentialRampToValueAtTime(55, when + 0.28);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(0.08, when + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.34);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(when);
  osc.stop(when + 0.36);
  const length = Math.floor(ctx.sampleRate * 0.22);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 2;
  const noise = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const noiseGain = ctx.createGain();
  noise.buffer = buffer;
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(400, when);
  filter.frequency.exponentialRampToValueAtTime(80, when + 0.2);
  noiseGain.gain.setValueAtTime(0.2, when);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, when + 0.22);
  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noise.start(when);
  noise.stop(when + 0.24);
}

function playSound(verdict) {
  const Context = window.AudioContext || window.webkitAudioContext;
  if (!Context) return;
  const ctx = new Context();
  const now = ctx.currentTime;
  if (verdict === 'right') {
    crackle(ctx, now);
    [523, 659, 784, 1047].forEach((freq, index) => {
      tone(ctx, freq, now + index * 0.07, 0.28, 'triangle', 0.11);
    });
  } else {
    poopSound(ctx, now);
    poopSound(ctx, now + 0.22);
  }
  window.setTimeout(() => ctx.close().catch(() => {}), 1200);
}

function burst(host) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !host) return;
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  const width = Math.max(host.offsetWidth, 160);
  const height = Math.max(host.offsetHeight, 80);
  const pad = Math.max(width, height, 220);
  canvas.width = width + pad * 2;
  canvas.height = height + pad * 2;
  canvas.style.cssText = `position:absolute;left:${-pad}px;top:${-pad}px;width:${canvas.width}px;height:${canvas.height}px;pointer-events:none;z-index:40`;
  host.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const originX = pad + width / 2;
  const originY = pad + height / 2;
  const pieces = Array.from({ length: 90 }, () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 6;
    return {
      x: originX,
      y: originY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 3,
      w: 4 + Math.random() * 5,
      h: 2 + Math.random() * 3,
      spin: Math.random() * 0.3,
      rot: Math.random() * 6,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    };
  });
  const started = performance.now();
  let frame = 0;
  const tick = (now) => {
    const t = (now - started) / 1400;
    if (t >= 1) {
      canvas.remove();
      return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach((piece) => {
      piece.x += piece.vx;
      piece.y += piece.vy;
      piece.vy += 0.16;
      piece.vx *= 0.99;
      piece.rot += piece.spin;
      ctx.save();
      ctx.globalAlpha = 1 - t;
      ctx.translate(piece.x, piece.y);
      ctx.rotate(piece.rot);
      ctx.fillStyle = piece.color;
      ctx.fillRect(-piece.w / 2, -piece.h / 2, piece.w, piece.h);
      ctx.restore();
    });
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
  window.setTimeout(() => {
    cancelAnimationFrame(frame);
    canvas.remove();
  }, 1600);
}

const STICKERS = ['💩', '🤢', '🪰', '🚽', '💩'];

function stickerRain(host) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !host) return;
  const layer = document.createElement('div');
  layer.setAttribute('aria-hidden', 'true');
  layer.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:40;overflow:visible';
  for (let i = 0; i < 16; i += 1) {
    const sticker = document.createElement('span');
    sticker.textContent = STICKERS[i % STICKERS.length];
    const size = 22 + Math.round(Math.random() * 26);
    const left = Math.random() * 80;
    const delay = Math.random() * 0.25;
    const duration = 0.9 + Math.random() * 0.6;
    sticker.style.cssText = `position:absolute;top:-2.2rem;left:${left}%;font-size:${size}px;animation:poop-fall ${duration}s ${delay}s ease-in forwards`;
    layer.appendChild(sticker);
  }
  const style = document.createElement('style');
  style.textContent = '@keyframes poop-fall{to{transform:translateY(18rem) rotate(30deg);opacity:.15}}';
  layer.appendChild(style);
  host.appendChild(layer);
  window.setTimeout(() => layer.remove(), 2200);
}

export function playPracticeSalute(verdict, host) {
  const target = host || document.body;
  playSound(verdict);
  if (verdict === 'right') burst(target);
  else stickerRain(target);
}

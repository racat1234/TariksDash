const colors = ['#ff3b30', '#ffcc00', '#34c759', '#00c7ff', '#5856d6', '#ff2d92', '#ff9500'];

export function fireConfetti(origin?: { x: number; y: number }) {
  if (typeof document === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const burst = document.createElement('div');
  burst.className = 'confetti-burst';
  burst.style.left = `${origin?.x ?? window.innerWidth / 2}px`;
  burst.style.top = `${origin?.y ?? Math.min(window.innerHeight * 0.42, 360)}px`;
  for (let index = 0; index < 54; index += 1) {
    const piece = document.createElement('i');
    const angle = (Math.PI * 2 * index) / 54 + Math.random() * 0.3;
    const distance = 95 + Math.random() * 210;
    piece.style.setProperty('--x', `${Math.cos(angle) * distance}px`);
    piece.style.setProperty('--y', `${Math.sin(angle) * distance + 100}px`);
    piece.style.setProperty('--r', `${360 + Math.random() * 900}deg`);
    piece.style.setProperty('--delay', `${Math.random() * 90}ms`);
    piece.style.setProperty('--color', colors[index % colors.length]);
    piece.className = index % 4 === 0 ? 'confetti-piece confetti-round' : 'confetti-piece';
    burst.appendChild(piece);
  }
  document.body.appendChild(burst);
  window.setTimeout(() => burst.remove(), 1900);
}

export function rnd(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Plausible Distraktoren um eine Antwort herum (vermeidet 0/Negativ). */
export function wrongChoices(answer: number, count: number, span = 10): number[] {
  const wrongs = new Set<number>();
  const offsets = shuffle(
    Array.from({ length: span * 2 }, (_, i) => i - span).filter((o) => o !== 0),
  );
  for (const o of offsets) {
    const w = answer + o;
    if (w > 0 && w !== answer) wrongs.add(w);
    if (wrongs.size >= count) break;
  }
  while (wrongs.size < count) wrongs.add(answer + wrongs.size + 1);
  return [...wrongs].slice(0, count);
}

/** Hat eine Addition im Zahlenraum einen Zehnerübergang? */
export function hasCarry(a: number, b: number): boolean {
  return Math.floor(a / 10) !== Math.floor((a + b) / 10);
}

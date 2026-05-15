import type kaplay from "kaplay";

export interface StepLadderOptions {
  x: number;
  y: number;
  a: number;     // Startwert
  b: number;     // Summand
  z?: number;
}

export interface StepLadderHandle {
  destroy: () => void;
}

/**
 * Schritt-für-Schritt-Leiste für den Zehnerübergang.
 * Beispiel: 38 + 15 → "+2 → 40 → +13 → 53"
 */
export function createStepLadder(
  k: ReturnType<typeof kaplay>,
  opts: StepLadderOptions,
): StepLadderHandle {
  const { a, b } = opts;
  const nextTen = Math.ceil(a / 10) * 10;
  const firstStep = nextTen === a ? 0 : nextTen - a;
  const secondStep = b - firstStep;
  const result = a + b;
  const z = opts.z ?? 30;

  const root = k.add([
    k.pos(opts.x, opts.y),
    k.anchor("center"),
    k.z(z),
  ]);

  const W = 360, H = 88;
  root.add([
    k.rect(W, H, { radius: 8 }),
    k.pos(0, 0),
    k.anchor("center"),
    k.color(255, 250, 240),
    k.outline(2, k.rgb(120, 80, 40)),
  ]);
  root.add([
    k.text("Mit Zehner-Trick:", { size: 12 }),
    k.pos(0, -H / 2 + 12),
    k.anchor("center"),
    k.color(80, 50, 20),
  ]);

  const segW = W / 5;
  const labels: Array<{ pos: number; main: string; sub?: string; color: [number, number, number] }> = [
    { pos: -2, main: `${a}`, color: [60, 130, 220] },
    { pos: -1, main: `+${firstStep}`, sub: "→", color: [80, 160, 80] },
    { pos: 0,  main: `${nextTen}`, color: [255, 180, 50] },
    { pos: 1,  main: `+${secondStep}`, sub: "→", color: [80, 160, 80] },
    { pos: 2,  main: `?`, color: [180, 100, 180] },
  ];

  for (const lbl of labels) {
    const cx = lbl.pos * segW;
    root.add([
      k.text(lbl.main, { size: 22 }),
      k.pos(cx, 8),
      k.anchor("center"),
      k.color(lbl.color[0], lbl.color[1], lbl.color[2]),
    ]);
    if (lbl.sub) {
      root.add([
        k.text(lbl.sub, { size: 14 }),
        k.pos(cx, 28),
        k.anchor("center"),
        k.color(120, 100, 60),
      ]);
    }
  }

  return { destroy: () => k.destroy(root) };
}

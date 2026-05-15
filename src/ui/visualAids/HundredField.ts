import type kaplay from "kaplay";

export interface HundredFieldOptions {
  x: number;
  y: number;
  highlight?: number[];   // Zahlen, die markiert werden (1–100)
  pathFrom?: number;      // Startwert für Lauf-Animation
  pathTo?: number;        // Zielwert
  size?: number;          // Kantenlänge in px (default 220)
  z?: number;
}

export interface HundredFieldHandle {
  destroy: () => void;
  highlight: (numbers: number[], color?: [number, number, number]) => void;
}

/**
 * 10×10 Hundertertafel. Zehnerreihen sind dezent farblich abgesetzt.
 * Markierte Zahlen werden farbig hervorgehoben.
 */
export function createHundredField(
  k: ReturnType<typeof kaplay>,
  opts: HundredFieldOptions,
): HundredFieldHandle {
  const size = opts.size ?? 220;
  const cell = size / 10;
  const z = opts.z ?? 30;

  const root = k.add([
    k.pos(opts.x, opts.y),
    k.anchor("center"),
    k.z(z),
  ]);

  // Hintergrund
  root.add([
    k.rect(size + 12, size + 28, { radius: 8 }),
    k.pos(0, 4),
    k.anchor("center"),
    k.color(255, 250, 240),
    k.outline(2, k.rgb(120, 80, 40)),
  ]);
  root.add([
    k.text("Hundertertafel", { size: 12 }),
    k.pos(0, -size / 2 - 4),
    k.anchor("center"),
    k.color(80, 50, 20),
  ]);

  const cellObjs = new Map<number, any>();

  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 10; col++) {
      const n = row * 10 + col + 1;
      const cx = -size / 2 + col * cell + cell / 2;
      const cy = -size / 2 + row * cell + cell / 2 + 2;
      // Zehnerreihen leicht hervorheben
      const isTen = (n % 10 === 0) || (col === 0);
      const bg = isTen ? [240, 220, 255] : [255, 255, 255];
      const cellObj = root.add([
        k.rect(cell - 1, cell - 1, { radius: 2 }),
        k.pos(cx, cy),
        k.anchor("center"),
        k.color(bg[0], bg[1], bg[2]),
        k.outline(1, k.rgb(180, 160, 200)),
      ]);
      cellObj.add([
        k.text(`${n}`, { size: Math.max(8, Math.floor(cell * 0.45)) }),
        k.anchor("center"),
        k.color(60, 40, 90),
      ]);
      cellObjs.set(n, cellObj);
    }
  }

  function highlight(numbers: number[], color: [number, number, number] = [120, 220, 120]) {
    for (const n of numbers) {
      const c = cellObjs.get(n);
      if (c) c.color = k.rgb(color[0], color[1], color[2]);
    }
  }

  if (opts.highlight) highlight(opts.highlight, [255, 220, 80]);
  if (opts.pathFrom != null && opts.pathTo != null && opts.pathTo > opts.pathFrom) {
    const path: number[] = [];
    for (let n = opts.pathFrom; n <= opts.pathTo; n++) path.push(n);
    highlight([opts.pathFrom], [80, 180, 255]);
    highlight(path.slice(1, -1), [180, 240, 180]);
    highlight([opts.pathTo], [255, 180, 80]);
  }

  return {
    destroy: () => k.destroy(root),
    highlight,
  };
}

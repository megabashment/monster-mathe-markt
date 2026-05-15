import type kaplay from "kaplay";

export interface PyramidBlocksOptions {
  x: number;
  y: number;
  base: [number | null | false, number | null | false, number | null | false];
  middle: [number | null | false, number | null | false];
  top: number | null | false;
  z?: number;
}

export interface PyramidBlocksHandle {
  destroy: () => void;
}

/**
 * Zahlenmauer-Visualisierung nach Lernblatt-Vorbild:
 * Steine bündig aufeinander gestapelt, keine Lücken.
 * null = leerer Stein (gesuchter Wert, Fragezeichen).
 *
 *      [ top  ]
 *    [ m0 ][ m1 ]
 *  [ b0 ][ b1 ][ b2 ]
 */
export function createPyramidBlocks(
  k: ReturnType<typeof kaplay>,
  opts: PyramidBlocksOptions,
): PyramidBlocksHandle {
  const z = opts.z ?? 30;

  // Stein-Maße — breite Basis wie im Lernblatt
  const bw = 56, bh = 44;

  const root = k.add([k.pos(opts.x, opts.y), k.anchor("center"), k.z(z)]);

  // Basis (3 Steine): unterste Reihe
  // Mitte (2 Steine): versetzt, je Stein sitzt auf zwei Basissteinen
  // Spitze (1 Stein): sitzt auf den zwei Mittelsteinen
  //
  // Horizontale Mitte der Pyramide = 0
  // Basis-Steine: x = -bw, 0, +bw (nebeneinander, kein gap)
  // Mittel-Steine: x = -bw/2, +bw/2 (versetzt um halbe Breite)
  // Spitze: x = 0

  const rowH = bh; // Stockwerke direkt aufeinander
  const baseY = rowH;        // unterste Reihe
  const midY  = 0;           // mittlere Reihe
  const topY  = -rowH;       // Spitze

  const positions = {
    base: [
      { x: -bw,  y: baseY, val: opts.base[0] },
      { x:  0,   y: baseY, val: opts.base[1] },
      { x:  bw,  y: baseY, val: opts.base[2] },
    ],
    middle: [
      { x: -bw / 2, y: midY, val: opts.middle[0] },
      { x:  bw / 2, y: midY, val: opts.middle[1] },
    ],
    top: { x: 0, y: topY, val: opts.top },
  };

  // Farben: bekannte Steine = weiß mit dunklem Rand (wie Lernblatt)
  //         unbekannte Steine (null) = hellgrau mit gestricheltem Rand
  const drawStone = (x: number, y: number, val: number | null | false) => {
    if (val === false) return;
    const isBlank = val === null;
    root.add([
      k.rect(bw - 2, bh - 2),
      k.pos(x, y),
      k.anchor("center"),
      k.color(isBlank ? 230 : 255, isBlank ? 230 : 255, isBlank ? 235 : 255),
      k.outline(isBlank ? 2 : 3, k.rgb(isBlank ? 160 : 40, isBlank ? 160 : 40, isBlank ? 175 : 50)),
    ]);

    root.add([
      k.text(isBlank ? "?" : `${val}`, { size: 17, font: "bubble" }),
      k.pos(x, y),
      k.anchor("center"),
      k.color(isBlank ? 160 : 30, isBlank ? 160 : 30, isBlank ? 180 : 30),
    ]);
  };

  positions.base.forEach(({ x, y, val }) => drawStone(x, y, val));
  positions.middle.forEach(({ x, y, val }) => drawStone(x, y, val));
  drawStone(positions.top.x, positions.top.y, positions.top.val);

  return { destroy: () => k.destroy(root) };
}

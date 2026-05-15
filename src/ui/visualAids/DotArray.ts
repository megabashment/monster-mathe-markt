import type kaplay from "kaplay";

export interface DotArrayOptions {
  x: number;
  y: number;
  rows: number;
  cols: number;
  subtrahend?: number;
  z?: number;
}

export interface DotArrayHandle {
  destroy: () => void;
}

// Maximale Punkte-Anzahl für ikonische Darstellung.
// Darüber: symbolische Kacheln.
const DOT_LIMIT = 100;

// Dot-Größe anhand Gesamtpunktzahl wählen
function dotSize(total: number): { dot: number; gap: number } {
  if (total <= 20)  return { dot: 14, gap: 5 };
  if (total <= 50)  return { dot: 11, gap: 4 };
  if (total <= 100) return { dot:  8, gap: 3 };
  return { dot: 6, gap: 2 };
}

/**
 * Punktefeld für Multiplikation/Division.
 *
 * Bis 100 Punkte: klassisches ikonisches Punktefeld (blau/rot, 10er-Gruppen).
 * Ab 101 Punkte: symbolische Kacheln — jede Kachel steht für eine Gruppe der
 * Größe `cols`, beschriftet mit der Zahl. Pädagogisch sinnvoller als 1000 Punkte.
 */
export function createDotArray(
  k: ReturnType<typeof kaplay>,
  opts: DotArrayOptions,
): DotArrayHandle {
  const { rows, cols, subtrahend = 0 } = opts;
  const z = opts.z ?? 30;
  const total = rows * cols;

  const root = k.add([k.pos(opts.x, opts.y), k.anchor("center"), k.z(z)]);

  if (total > DOT_LIMIT) {
    drawSymbolic(k, root, rows, cols);
  } else {
    drawDots(k, root, rows, cols, subtrahend);
  }

  return { destroy: () => k.destroy(root) };
}

// ── Symbolische Kacheln ───────────────────────────────────────────────────────

function drawSymbolic(
  k: ReturnType<typeof kaplay>,
  root: ReturnType<ReturnType<typeof kaplay>["add"]>,
  rows: number,
  cols: number,
) {
  // Kacheln pro Zeile: max 5, dann umbrechen
  const TILES_PER_ROW = Math.min(rows, 5);
  const tileW = 52, tileH = 44, tileGap = 8;
  const rowCount = Math.ceil(rows / TILES_PER_ROW);

  const boxW = TILES_PER_ROW * (tileW + tileGap) - tileGap + 40;
  const boxH = rowCount * (tileH + tileGap) - tileGap + 70;

  // Hintergrund
  root.add([
    k.rect(boxW, boxH, { radius: 8 }),
    k.pos(0, 0), k.anchor("center"),
    k.color(245, 235, 220),
    k.outline(2, k.rgb(110, 80, 50)),
  ]);

  // Titel
  root.add([
    k.text(`${cols} × ${rows}`, { size: 13 }),
    k.pos(0, -boxH / 2 + 13),
    k.anchor("center"),
    k.color(60, 40, 0),
  ]);

  // Legende
  root.add([
    k.text(`= ${rows} Gruppen à ${cols}`, { size: 10 }),
    k.pos(0, -boxH / 2 + 27),
    k.anchor("center"),
    k.color(100, 70, 30),
  ]);

  const tileColors: Array<[number,number,number]> = [
    [60, 130, 220],
    [220, 60,  60],
  ];

  const startX = -boxW / 2 + 20 + tileW / 2;
  const startY = -boxH / 2 + 45 + tileH / 2;

  for (let i = 0; i < rows; i++) {
    const col = i % TILES_PER_ROW;
    const row = Math.floor(i / TILES_PER_ROW);
    const tx = startX + col * (tileW + tileGap);
    const ty = startY + row * (tileH + tileGap);
    const [r, g, b] = tileColors[i % 2];

    root.add([
      k.rect(tileW, tileH, { radius: 5 }),
      k.pos(tx, ty), k.anchor("center"),
      k.color(r, g, b),
      k.outline(1, k.rgb(Math.max(0, r - 60), Math.max(0, g - 60), Math.max(0, b - 60))),
    ]);
    root.add([
      k.text(`${cols}`, { size: 14 }),
      k.pos(tx, ty), k.anchor("center"),
      k.color(255, 255, 255),
    ]);
  }
}

// ── Klassisches Punktefeld ────────────────────────────────────────────────────

function drawDots(
  k: ReturnType<typeof kaplay>,
  root: ReturnType<ReturnType<typeof kaplay>["add"]>,
  rows: number,
  cols: number,
  subtrahend: number,
) {
  const total = rows * cols;
  const { dot, gap } = dotSize(total);
  const tenGap = gap + 4;
  const padX = 14, padY = 18;

  const tenWidth = 10;
  const numTensH = Math.ceil(cols / tenWidth);
  const tenBlockW = tenWidth * (dot + gap) - gap + 4;
  const totalH = rows * (dot + gap) - gap + 4;

  const totalW = numTensH * tenBlockW + (numTensH - 1) * tenGap + padX * 2;
  const subtrahendH = subtrahend > 0 ? dot + gap + 8 : 0;
  const boxH = totalH + subtrahendH + padY * 2 + 18;

  root.add([
    k.rect(totalW, boxH, { radius: 8 }),
    k.pos(0, 0), k.anchor("center"),
    k.color(245, 235, 220),
    k.outline(2, k.rgb(110, 80, 50)),
  ]);
  root.add([
    k.text(`${cols} × ${rows} = ?`, { size: 12 }),
    k.pos(0, -boxH / 2 + 11),
    k.anchor("center"),
    k.color(60, 40, 0),
  ]);

  const tenColors: Array<[number,number,number]> = [
    [60, 130, 220],
    [220, 60,  60],
  ];

  const startY = -boxH / 2 + padY + 18;

  for (let r = 0; r < rows; r++) {
    const cy = startY + r * (dot + gap);
    for (let c = 0; c < cols; c++) {
      const tenIdx = Math.floor(c / tenWidth);
      const posInTen = c % tenWidth;
      const [rc, gc, bc] = tenColors[tenIdx % 2];
      const tenX = -totalW / 2 + padX + tenIdx * (tenBlockW + tenGap);
      const cx = tenX + posInTen * (dot + gap) + dot / 2 + 2;
      root.add([
        k.circle(dot / 2),
        k.pos(cx, cy), k.anchor("center"),
        k.color(rc, gc, bc),
        k.outline(1, k.rgb(Math.max(0, rc - 60), Math.max(0, gc - 60), Math.max(0, bc - 60))),
      ]);
    }
  }

  if (subtrahend > 0) {
    const sy = startY + rows * (dot + gap) + tenGap;
    const sx = -totalW / 2 + padX;
    for (let s = 0; s < subtrahend; s++) {
      const tenIdx = Math.floor(s / tenWidth);
      const posInTen = s % tenWidth;
      const tenX = sx + tenIdx * (tenBlockW + tenGap);
      const cx = tenX + posInTen * (dot + gap) + dot / 2 + 2;
      root.add([
        k.circle(dot / 2),
        k.pos(cx, sy), k.anchor("center"),
        k.color(100, 200, 80),
        k.outline(1, k.rgb(40, 140, 20)),
      ]);
    }
  }
}

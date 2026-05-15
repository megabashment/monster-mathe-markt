import type kaplay from "kaplay";

export interface DienesOptions {
  x: number;
  y: number;
  /** Einfache Darstellung (eine Zahl) */
  value?: number;
  /** Zwei-Zahlen-Modus: erste Zahl (Minuend oder erster Summand) */
  minuend?: number;
  /** Zwei-Zahlen-Modus: zweite Zahl (Subtrahend oder zweiter Summand) */
  subtrahend?: number;
  z?: number;
  /** Pixel pro Einerwürfel-Seite (default 10) */
  unit?: number;
  /** Legende einblenden (default true) */
  showLegend?: boolean;
}

export interface DienesHandle {
  destroy: () => void;
}

// ─── Farben ───────────────────────────────────────────────────────────────────
const COL_H   = { fill: [60,  160,  80] as [number,number,number], line: [20,  100,  40] as [number,number,number] };
const COL_Z   = { fill: [220,  60,  60] as [number,number,number], line: [140,  20,  20] as [number,number,number] };
const COL_E   = { fill: [60,  130, 220] as [number,number,number], line: [20,   50, 140] as [number,number,number] };
const COL_BG  = [245, 235, 220] as [number,number,number];
const COL_OUT = [110,  80,  50] as [number,number,number];
const COL_DIV = [150, 120,  90] as [number,number,number];
const COL_TXT = [60,   40,   0] as [number,number,number];
const COL_LAB = [80,   50,  20] as [number,number,number];

// Hunderterplatte: 5 Spalten × 10 Zeilen, gleiche Höhe wie Zehnerstange.
// Breite = unit * 5, Höhe = unit * 10. Gitterzelle = unit × unit.
const H_COLS = 5;
const H_ROWS = 10;

// ─── Hilfsfunktionen ──────────────────────────────────────────────────────────

function decompose(n: number) {
  const thousands = Math.min(9, Math.floor(n / 1000));
  const rem3      = n - thousands * 1000;
  const hundreds  = Math.min(9, Math.floor(rem3 / 100));
  const rem2      = rem3 - hundreds * 100;
  const tens      = Math.min(9, Math.floor(rem2 / 10));
  const ones      = rem2 - tens * 10;
  return { thousands, hundreds, tens, ones };
}

// Alle draw*-Funktionen: leftX = linke Kante, centerY = vertikale Mitte der Zehnerstangen-Höhe.

function drawOnes(
  root: ReturnType<ReturnType<typeof kaplay>["add"]>,
  k: ReturnType<typeof kaplay>,
  count: number,
  leftX: number,
  centerY: number,
  unit: number,
): number {
  if (count === 0) return 0;
  const cx = leftX + unit / 2;
  // Oberkante der Zehnerstange: centerY - unit*5 (anchor center, Höhe unit*10)
  // Würfel o liegt bei Oberkante + o*unit + unit/2 (Mittelpunkt des Würfels)
  const topY = centerY - unit * 5;
  for (let o = 0; o < count; o++) {
    root.add([
      k.rect(unit, unit, { radius: 1 }),
      k.pos(cx, topY + o * unit + unit / 2),
      k.anchor("center"),
      k.color(...COL_E.fill),
      k.outline(1, k.rgb(...COL_E.line)),
    ]);
  }
  return unit;
}

function drawTens(
  root: ReturnType<ReturnType<typeof kaplay>["add"]>,
  k: ReturnType<typeof kaplay>,
  count: number,
  leftX: number,
  centerY: number,
  unit: number,
): number {
  if (count === 0) return 0;
  const spacing = unit + 2;
  for (let t = 0; t < count; t++) {
    const cx = leftX + t * spacing + unit / 2;
    root.add([
      k.rect(unit, unit * 10, { radius: 1 }),
      k.pos(cx, centerY),
      k.anchor("center"),
      k.color(...COL_Z.fill),
      k.outline(1, k.rgb(...COL_Z.line)),
    ]);
    for (let i = 1; i < 10; i++) {
      root.add([
        k.rect(unit, 1),
        k.pos(cx, centerY - unit * 5 + i * unit),
        k.anchor("center"),
        k.color(...COL_Z.line),
      ]);
    }
  }
  return count * spacing;
}

/**
 * Hunderterplatten: 5 Spalten × 10 Zeilen, Zellgröße = unit.
 * Höhe = unit*10 (gleich wie Zehnerstange), Breite = unit*5.
 * leftX = linke Kante der ersten Platte.
 */
function drawHundreds(
  root: ReturnType<ReturnType<typeof kaplay>["add"]>,
  k: ReturnType<typeof kaplay>,
  count: number,
  leftX: number,
  centerY: number,
  unit: number,
): number {
  if (count === 0) return 0;
  const plateW  = unit * H_COLS;
  const plateH  = unit * H_ROWS;
  const spacing = plateW + 4;

  for (let h = 0; h < count; h++) {
    const cx = leftX + h * spacing + plateW / 2;
    root.add([
      k.rect(plateW, plateH, { radius: 1 }),
      k.pos(cx, centerY),
      k.anchor("center"),
      k.color(...COL_H.fill),
      k.outline(1, k.rgb(...COL_H.line)),
    ]);
    for (let col = 1; col < H_COLS; col++) {
      root.add([
        k.rect(1, plateH),
        k.pos(cx - plateW / 2 + col * unit, centerY),
        k.anchor("center"),
        k.color(...COL_H.line),
        k.opacity(0.6),
      ]);
    }
    for (let row = 1; row < H_ROWS; row++) {
      root.add([
        k.rect(plateW, 1),
        k.pos(cx, centerY - plateH / 2 + row * unit),
        k.anchor("center"),
        k.color(...COL_H.line),
        k.opacity(0.6),
      ]);
    }
  }
  return count * spacing;
}

function hPlateW(unit: number): number { return unit * H_COLS + 4; }

function blockWidth(d: ReturnType<typeof decompose>, unit: number): number {
  const hSpacing = hPlateW(unit);
  const zSpacing = unit + 2;
  let w = 0;
  if (d.hundreds > 0) w += d.hundreds * hSpacing;
  if (d.tens     > 0) { if (w > 0) w += 6; w += d.tens * zSpacing; }
  if (d.ones     > 0) { if (w > 0) w += 6; w += unit; }
  if (w === 0) w = unit;
  return w;
}

function drawHZE(
  root: ReturnType<ReturnType<typeof kaplay>["add"]>,
  k: ReturnType<typeof kaplay>,
  d: ReturnType<typeof decompose>,
  startX: number,
  centerY: number,
  unit: number,
) {
  const hSpacing = hPlateW(unit);
  const zSpacing = unit + 2;
  let cursor = startX;

  if (d.hundreds > 0) {
    drawHundreds(root, k, d.hundreds, cursor, centerY, unit);
    cursor += d.hundreds * hSpacing + 6;
  }
  if (d.tens > 0) {
    drawTens(root, k, d.tens, cursor, centerY, unit);
    cursor += d.tens * zSpacing + 6;
  }
  if (d.ones > 0) {
    drawOnes(root, k, d.ones, cursor, centerY, unit);
  }
}

// ─── Legende ──────────────────────────────────────────────────────────────────

function drawLegend(
  root: ReturnType<ReturnType<typeof kaplay>["add"]>,
  k: ReturnType<typeof kaplay>,
  containerH: number,
  showHundreds: boolean,
) {
  const legendY  = containerH / 2 - 13;
  const iconSize = 10;
  const gap      = 4;
  const fontSize = 10;

  const items: { color: [number,number,number]; label: string }[] = [];
  if (showHundreds) items.push({ color: COL_H.fill, label: "= 100" });
  items.push({ color: COL_Z.fill, label: "= 10" });
  items.push({ color: COL_E.fill, label: "= 1" });

  const itemW  = iconSize + gap + 32;
  const totalW = items.length * (itemW + 8);
  let lx       = -totalW / 2 + itemW / 2;

  for (const item of items) {
    root.add([
      k.rect(iconSize, iconSize, { radius: 1 }),
      k.pos(lx, legendY),
      k.anchor("center"),
      k.color(...item.color),
      k.outline(1, k.rgb(0, 0, 0)),
      k.opacity(0.9),
    ]);
    root.add([
      k.text(item.label, { size: fontSize }),
      k.pos(lx + iconSize / 2 + gap, legendY),
      k.anchor("left"),
      k.color(...COL_LAB),
    ]);
    lx += itemW + 8;
  }
}

// ─── Haupt-Export ─────────────────────────────────────────────────────────────

export function createDienesBlocks(
  k: ReturnType<typeof kaplay>,
  opts: DienesOptions,
): DienesHandle {
  const unit    = opts.unit ?? 10;
  const z       = opts.z ?? 30;
  const showLeg = opts.showLegend !== false;

  const root = k.add([k.pos(opts.x, opts.y), k.anchor("center"), k.z(z)]);

  const PAD     = 14;
  const legendH = showLeg ? 22 : 0;
  const blockH  = unit * 10; // Höhe einer Zehnerstange = Referenzhöhe

  // ── Zwei-Zahlen-Modus (Subtraktion ODER Addition mit beiden Operanden) ───────
  if (opts.minuend != null && opts.subtrahend != null) {
    const dA = decompose(opts.minuend);
    const dB = decompose(opts.subtrahend);
    const showH = dA.hundreds > 0 || dB.hundreds > 0;

    const wA     = blockWidth(dA, unit);
    const wB     = blockWidth(dB, unit);
    const gapMid = 24;
    const totalW = wA + gapMid + wB + PAD * 2;
    const totalH = blockH + legendH + PAD * 2;

    root.add([
      k.rect(totalW, totalH, { radius: 8 }),
      k.pos(0, 0), k.anchor("center"),
      k.color(...COL_BG),
      k.outline(2, k.rgb(...COL_OUT)),
    ]);

    // Zahlen-Label oben links / oben rechts (kompakt, kein "Minuend"-Text)
    root.add([
      k.text(`${opts.minuend}`, { size: 13 }),
      k.pos(-totalW / 2 + PAD, -totalH / 2 + 10),
      k.anchor("left"),
      k.color(...COL_TXT),
    ]);
    root.add([
      k.text(`${opts.subtrahend}`, { size: 13 }),
      k.pos(totalW / 2 - PAD, -totalH / 2 + 10),
      k.anchor("right"),
      k.color(...COL_TXT),
    ]);

    const centerY = (-legendH + 18) / 2; // leicht nach oben, Platz für Legende unten

    drawHZE(root, k, dA, -totalW / 2 + PAD, centerY, unit);
    drawHZE(root, k, dB,  totalW / 2 - PAD - wB, centerY, unit);

    // Trennlinie
    root.add([
      k.rect(2, blockH - 8, { radius: 1 }),
      k.pos(0, centerY), k.anchor("center"),
      k.color(...COL_DIV),
      k.opacity(0.5),
    ]);

    if (showLeg) drawLegend(root, k, totalH, showH);
    return { destroy: () => k.destroy(root) };
  }

  // ── Einfachmodus (eine Zahl) ──────────────────────────────────────────────────
  const value  = opts.value ?? 0;
  const d      = decompose(value);
  const showH  = d.hundreds > 0;
  const w      = blockWidth(d, unit);
  const totalW = Math.max(w + PAD * 2, 80);
  const totalH = blockH + legendH + PAD * 2;

  root.add([
    k.rect(totalW, totalH, { radius: 6 }),
    k.pos(0, 0), k.anchor("center"),
    k.color(...COL_BG),
    k.outline(2, k.rgb(...COL_OUT)),
  ]);
  root.add([
    k.text(`${value}`, { size: 13 }),
    k.pos(-totalW / 2 + PAD, -totalH / 2 + 10),
    k.anchor("left"),
    k.color(...COL_TXT),
  ]);

  const centerY = (-legendH + 18) / 2;
  drawHZE(root, k, d, -totalW / 2 + PAD, centerY, unit);

  if (showLeg) drawLegend(root, k, totalH, showH);
  return { destroy: () => k.destroy(root) };
}

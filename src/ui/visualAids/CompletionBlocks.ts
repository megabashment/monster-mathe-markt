import type kaplay from "kaplay";

export interface CompletionBlocksOptions {
  x: number;
  y: number;
  start: number;
  target: number;
  answer: number;
  attemptCount: number;
  z?: number;
}

export interface CompletionBlocksHandle {
  destroy: () => void;
}

/**
 * Dienes-Visualisierung für X + _ = Z.
 *
 * Raster-Prinzip: jede Zahl wird als Spalten dargestellt.
 * Jede Spalte ist CELL×10 hoch, CELL breit.
 * Zehnerstange = volle Spalte (10 Zellen gefüllt).
 * Einerwürfel   = Teilspalte (n Zellen von unten gefüllt).
 * 100           = 10 volle Spalten nebeneinander.
 *
 * Raster-Linien immer schwarz, Füllung nach Farbe.
 */
export function createCompletionBlocks(
  k: ReturnType<typeof kaplay>,
  opts: CompletionBlocksOptions,
): CompletionBlocksHandle {
  const CELL = 9;       // Pixel pro Zelle
  const ROWS = 10;      // Zellen pro Spalte
  const COL_W = CELL;   // Spaltenbreite
  const COL_H = CELL * ROWS; // Spaltenhöhe
  const GAP = 2;        // Abstand zwischen Spalten
  const z = opts.z ?? 30;

  const root = k.add([k.pos(opts.x, opts.y), k.anchor("center"), k.z(z)]);

  // Zeichnet ein Raster: cols Spalten, jede Spalte hat filledRows gefüllte Zellen (von unten)
  // Gibt genutzte Breite zurück
  const drawRaster = (
    ox: number,           // linke Kante (relativ zu root)
    oy: number,           // obere Kante (relativ zu root)
    cols: number,
    filledRows: number,   // wie viele Zellen von unten gefüllt (10 = volle Stange)
    fill: [number, number, number],
  ): number => {
    const totalW = cols * (COL_W + GAP) - GAP;

    // Hintergrund (leer, weiß)
    root.add([
      k.rect(totalW, COL_H),
      k.pos(ox + totalW / 2, oy + COL_H / 2),
      k.anchor("center"),
      k.color(240, 240, 240),
      k.outline(1, k.rgb(60, 60, 60)),
    ]);

    // Gefüllte Zellen von unten
    const filledH = filledRows * CELL;
    if (filledH > 0) {
      root.add([
        k.rect(totalW, filledH),
        k.pos(ox + totalW / 2, oy + COL_H - filledH / 2),
        k.anchor("center"),
        k.color(fill[0], fill[1], fill[2]),
      ]);
    }

    // Gitternetz: horizontale Linien
    for (let r = 1; r < ROWS; r++) {
      root.add([
        k.rect(totalW, 1),
        k.pos(ox + totalW / 2, oy + r * CELL),
        k.anchor("center"),
        k.color(60, 60, 60),
        k.opacity(0.35),
      ]);
    }

    // Gitternetz: vertikale Linien (Spaltentrenner)
    for (let c = 1; c < cols; c++) {
      root.add([
        k.rect(1, COL_H),
        k.pos(ox + c * (COL_W + GAP) - GAP / 2, oy + COL_H / 2),
        k.anchor("center"),
        k.color(60, 60, 60),
        k.opacity(0.35),
      ]);
    }

    // Außenrahmen
    root.add([
      k.rect(totalW, COL_H, { radius: 2 }),
      k.pos(ox + totalW / 2, oy + COL_H / 2),
      k.anchor("center"),
      k.color(245, 235, 220),
      k.opacity(0),
      k.outline(2, k.rgb(40, 40, 40)),
    ]);

    return totalW;
  };

  // Berechnet cols + filledRows für eine Zahl
  const layout = (n: number): { cols: number; filledRows: number } => {
    if (n >= 100) return { cols: 10, filledRows: 10 };
    const tens = Math.floor(n / 10);
    const ones = n % 10;
    // Volle Zehnerstangen + ggf. Einerspalte
    const cols = tens + (ones > 0 ? 1 : 0);
    // filledRows: volle Stangen haben 10, Einerspalte hat ones Zellen
    // Wir zeichnen jede Stange als eigene Spalte mit 10 gefüllten Zellen
    // und die Einerspalte mit ones. drawRaster füllt alle cols gleich —
    // das stimmt nicht für Mischzahlen. Deshalb zeichnen wir getrennt:
    return { cols, filledRows: 10 }; // wird unten durch drawMixed ersetzt
  };

  // Zeichnet eine Zahl als Dienes-Blöcke korrekt
  const drawNumber = (
    ox: number, oy: number,
    n: number,
    fill: [number, number, number],
  ): number => {
    if (n <= 0) return 0;
    if (n >= 100) {
      return drawRaster(ox, oy, 10, 10, fill);
    }
    const tens = Math.floor(n / 10);
    const ones = n % 10;
    let usedW = 0;

    // Zehnerstangen (volle Spalten)
    if (tens > 0) {
      const w = drawRaster(ox, oy, tens, 10, fill);
      usedW += w + GAP;
    }

    // Einerwürfel (Teilspalte)
    if (ones > 0) {
      const w = drawRaster(ox + usedW, oy, 1, ones, fill);
      usedW += w;
    } else {
      usedW -= GAP; // kein trailing gap
    }

    return usedW;
  };

  const opW = 22;
  const padding = 16;
  const topY = -COL_H / 2 - 10;

  // Berechne Gesamtbreite für Container
  const wStart  = opts.start  >= 100 ? 10 * (COL_W + GAP) - GAP
                : Math.floor(opts.start / 10) * (COL_W + GAP) + (opts.start % 10 > 0 ? COL_W : -GAP);
  const wAnswer = opts.answer >= 100 ? 10 * (COL_W + GAP) - GAP
                : Math.floor(opts.answer / 10) * (COL_W + GAP) + (opts.answer % 10 > 0 ? COL_W : -GAP);
  const wTarget = opts.target >= 100 ? 10 * (COL_W + GAP) - GAP
                : Math.floor(opts.target / 10) * (COL_W + GAP) + (opts.target % 10 > 0 ? COL_W : -GAP);

  const totalW = wStart + opW + wAnswer + opW + wTarget + padding * 2;
  const containerW = Math.max(totalW, 240);
  const containerH = COL_H + 36;

  root.add([
    k.rect(containerW, containerH, { radius: 8 }),
    k.pos(0, 0),
    k.anchor("center"),
    k.color(245, 235, 220),
    k.outline(2, k.rgb(110, 80, 50)),
  ]);

  // Operator-Label
  const drawOp = (cx: number, sym: string) => {
    root.add([
      k.text(sym, { size: 20, font: "bubble" }),
      k.pos(cx, 0),
      k.anchor("center"),
      k.color(50, 30, 0),
    ]);
  };

  // Inhalt zentrieren: Startpunkt so wählen dass totalW in containerW mittig sitzt
  const contentW = wStart + opW + wAnswer + opW + wTarget;
  let curX = -contentW / 2;

  // Start (rot)
  const sw = drawNumber(curX, topY, opts.start, [210, 55, 55]);
  curX += sw + GAP;

  // +
  drawOp(curX + opW / 2, "+");
  curX += opW;

  // Antwort (blau)
  const aw = drawNumber(curX, topY, opts.answer, [65, 125, 215]);
  curX += aw + GAP;

  // =
  drawOp(curX + opW / 2, "=");
  curX += opW;

  // Target (grün)
  drawNumber(curX, topY, opts.target, [50, 165, 80]);

  // unused warning fix
  void layout;

  return { destroy: () => k.destroy(root) };
}

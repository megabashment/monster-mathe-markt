import type kaplay from "kaplay";

export interface CountTriangleVisualizationOptions {
  x: number;
  y: number;
  corners: [number, number, number]; // oben-links, oben-rechts, unten-mitte
  sides: [number, number, number];   // [0]=oben(c0+c1), [1]=rechts(c1+c2), [2]=links(c2+c0)
  hiddenSideIndex: number;           // -1 wenn Ecke gesucht
  hiddenCornerIndex: number;         // -1 wenn Schenkel gesucht
  attemptCount: number;
  z?: number;
}

export interface CountTriangleVisualizationHandle {
  destroy: () => void;
}

/**
 * Klassisches Rechendreieck:
 *
 *   [c0]---[s0]---[c1]
 *      \         /
 *      [s2]   [s1]
 *        \   /
 *        [c2]
 *
 * Ecken (blau) = Summanden, immer sichtbar
 * Schenkel-Mitte (gelb/grau) = Summe zweier Eckzahlen, eine davon gesucht
 */
export function createCountTriangleVisualization(
  k: ReturnType<typeof kaplay>,
  opts: CountTriangleVisualizationOptions,
): CountTriangleVisualizationHandle {
  const z = opts.z ?? 30;
  const showAnswer = opts.attemptCount >= 2;

  // Dreieck-Eckpunkte (absolut, nicht relativ zu root)
  // Damit drawLine korrekt in root-lokalen Koordinaten arbeitet
  const maxVal = Math.max(...opts.corners, ...opts.sides);
  const digits = maxVal.toString().length;
  const scale = 1 + Math.max(0, digits - 2) * 0.18; // ab 3 Stellen: +18% pro Stelle
  const W = Math.round(160 * scale);
  const H = Math.round(140 * scale);

  // Ecken relativ zur Panel-Mitte (root ist bei opts.x, opts.y)
  const topLeft  = { x: -W / 2, y: -H / 2 };  // c0
  const topRight = { x:  W / 2, y: -H / 2 };  // c1
  const bottom   = { x:  0,     y:  H / 2 };  // c2

  // Schwerpunkt des Dreiecks
  const centroid = {
    x: (topLeft.x + topRight.x + bottom.x) / 3,
    y: (topLeft.y + topRight.y + bottom.y) / 3,
  };

  // Schenkel-Mittelpunkte nach außen verschoben (weg vom Schwerpunkt)
  const pushOut = (mid: { x: number; y: number }, dist: number) => {
    const dx = mid.x - centroid.x;
    const dy = mid.y - centroid.y;
    const len = Math.hypot(dx, dy);
    return { x: mid.x + (dx / len) * dist, y: mid.y + (dy / len) * dist };
  };

  const OFFSET = 28;
  const midTop   = pushOut({ x: (topLeft.x + topRight.x) / 2, y: (topLeft.y + topRight.y) / 2 }, OFFSET); // s0
  const midRight = pushOut({ x: (topRight.x + bottom.x)  / 2, y: (topRight.y + bottom.y)  / 2 }, OFFSET); // s1
  const midLeft  = pushOut({ x: (topLeft.x  + bottom.x)  / 2, y: (topLeft.y  + bottom.y)  / 2 }, OFFSET); // s2

  const root = k.add([
    k.pos(opts.x, opts.y),
    k.anchor("center"),
    k.z(z),
  ]);

  // Panel
  root.add([
    k.rect(W + 100, H + 100, { radius: 10 }),
    k.pos(0, 0),
    k.anchor("center"),
    k.color(250, 242, 228),
    k.outline(3, k.rgb(100, 70, 40)),
  ]);

  // ─── Dreieck-Linien ───
  const drawLine = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    root.add([
      k.rect(len, 4),
      k.pos((a.x + b.x) / 2, (a.y + b.y) / 2),
      k.anchor("center"),
      k.rotate(angle),
      k.color(80, 55, 30),
    ]);
  };

  drawLine(topLeft, topRight);
  drawLine(topRight, bottom);
  drawLine(bottom, topLeft);

  // ─── Felder zeichnen (Kreise über den Linien) ───
  // Radius und Schriftgröße skalieren mit der Ziffernanzahl des größten Werts im Dreieck
  // Radius: ab 3 Stellen wächst der Kreis um je 6px pro extra Stelle
  const CORNER_R = Math.max(22, 22 + (digits - 2) * 6);
  const SIDE_R   = Math.max(18, 18 + (digits - 2) * 6);
  // Schriftgröße: ab 3 Stellen schrumpft sie um je 2px pro extra Stelle
  const CORNER_FS = Math.max(9, 17 - Math.max(0, digits - 2) * 2);
  const SIDE_FS   = Math.max(8, 14 - Math.max(0, digits - 2) * 2);

  const drawField = (
    pos: { x: number; y: number },
    value: number,
    isHidden: boolean,
    isCorner: boolean,
  ) => {
    const r = isCorner ? CORNER_R : SIDE_R;
    const revealed = showAnswer && isHidden;

    const bg = revealed
      ? k.rgb(100, 210, 100)
      : isHidden
        ? k.rgb(200, 200, 215)
        : isCorner
          ? k.rgb(80, 140, 220)
          : k.rgb(240, 165, 50);

    const outline = revealed
      ? k.rgb(40, 160, 40)
      : isCorner
        ? k.rgb(40, 90, 180)
        : k.rgb(190, 120, 10);

    root.add([k.circle(r), k.pos(pos.x, pos.y), k.anchor("center"), k.color(bg), k.outline(3, outline)]);

    const label = (!isHidden || revealed) ? `${value}` : "?";
    const col = (!isHidden || revealed) ? k.rgb(255, 255, 255) : k.rgb(120, 120, 150);
    root.add([
      k.text(label, { size: isCorner ? CORNER_FS : SIDE_FS, font: "bubble" }),
      k.pos(pos.x, pos.y),
      k.anchor("center"),
      k.color(col),
    ]);
  };

  // Ecken (Summanden) — bei Subtraktion kann eine davon versteckt sein
  drawField(topLeft,  opts.corners[0], opts.hiddenCornerIndex === 0, true);
  drawField(topRight, opts.corners[1], opts.hiddenCornerIndex === 1, true);
  drawField(bottom,   opts.corners[2], opts.hiddenCornerIndex === 2, true);

  // Schenkel-Summen — bei Addition kann eine davon versteckt sein
  drawField(midTop,   opts.sides[0], opts.hiddenSideIndex === 0, false);
  drawField(midRight, opts.sides[1], opts.hiddenSideIndex === 1, false);
  drawField(midLeft,  opts.sides[2], opts.hiddenSideIndex === 2, false);

  return { destroy: () => k.destroy(root) };
}

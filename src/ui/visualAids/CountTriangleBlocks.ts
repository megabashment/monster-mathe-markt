import type kaplay from "kaplay";

export interface CountTriangleBlocksOptions {
  x: number;
  y: number;
  inner: [number, number, number];      // i1, i2, i3
  outer: [number, number, number];      // o12, o23, o31
  hiddenArea: "inner" | "outer";
  hiddenIndex: number;                  // 0, 1, oder 2
  attemptCount: number;                 // 1, 2, 3+
  z?: number;
}

export interface CountTriangleBlocksHandle {
  destroy: () => void;
}

/**
 * Dreieck-Hilfe für Rechendreiecke:
 *  - Versuch 1: Dreiecke ohne Zahlen (nur Struktur)
 *  - Versuch 2: Zahlen an Positionen
 *  - Versuch 3+: Markierte fehlende Feld sichtbar machen
 */
export function createCountTriangleBlocks(
  k: ReturnType<typeof kaplay>,
  opts: CountTriangleBlocksOptions,
): CountTriangleBlocksHandle {
  const z = opts.z ?? 30;
  const showNumbers = opts.attemptCount >= 2;
  const showAnswer = opts.attemptCount >= 3;

  const root = k.add([
    k.pos(opts.x, opts.y),
    k.anchor("center"),
    k.z(z),
  ]);

  const W = 280, H = 240;
  root.add([
    k.rect(W, H, { radius: 6 }),
    k.pos(0, 0),
    k.anchor("center"),
    k.color(245, 235, 220),
    k.outline(2, k.rgb(110, 80, 50)),
  ]);

  // Dreieck-Zentrum und Größe
  const centerX = 0;
  const centerY = 20;
  const outerRadius = 50;
  const innerRadius = 25;

  // Positionen der 3 Eckpunkte (Außenfeld)
  const positions = {
    outer: [
      { x: centerX,              y: centerY - outerRadius, label: "o12" }, // oben
      { x: centerX + outerRadius * 0.866, y: centerY + outerRadius * 0.5, label: "o23" }, // unten rechts
      { x: centerX - outerRadius * 0.866, y: centerY + outerRadius * 0.5, label: "o31" },  // unten links
    ],
    inner: [
      { x: centerX,              y: centerY - innerRadius * 0.6, label: "i1" },  // oben
      { x: centerX + innerRadius * 0.8, y: centerY + innerRadius * 0.4, label: "i2" }, // unten rechts
      { x: centerX - innerRadius * 0.8, y: centerY + innerRadius * 0.4, label: "i3" }, // unten links
    ],
  };

  const drawTriangleField = (
    x: number,
    y: number,
    isOuter: boolean,
    index: number,
    isHidden: boolean,
    value: number,
  ) => {
    const isAnswer = showAnswer && isHidden;
    const color = isOuter ? [60, 130, 220] : [220, 100, 60];
    const bgColor = isAnswer
      ? [100, 200, 100]
      : isHidden && !showNumbers
        ? [240, 240, 240]
        : color;

    const outlineColor = isAnswer ? [50, 150, 50] : isHidden && !showNumbers ? [180, 180, 180] : undefined;

    root.add([
      k.circle(14),
      k.pos(x, y),
      k.anchor("center"),
      k.color(bgColor[0], bgColor[1], bgColor[2]),
      ...(outlineColor ? [k.outline(2, k.rgb(outlineColor[0], outlineColor[1], outlineColor[2]))] : [k.outline(1, k.rgb(100, 100, 100))]),
    ]);

    // Zahl (nur bei Versuch 2+, oder bei Versuch 3+ wenn sichtbar)
    if ((showNumbers && !isHidden) || isAnswer) {
      root.add([
        k.text(`${value}`, { size: 12, font: "bubble" }),
        k.pos(x, y),
        k.anchor("center"),
        k.color(0, 0, 0),
      ]);
    }
  };

  // ─── Außenfelder (blau) ───
  positions.outer.forEach((pos, idx) => {
    const isHidden = opts.hiddenArea === "outer" && opts.hiddenIndex === idx;
    drawTriangleField(pos.x, pos.y, true, idx, isHidden, opts.outer[idx]);
  });

  // ─── Innenfelder (rot/orange) ───
  positions.inner.forEach((pos, idx) => {
    const isHidden = opts.hiddenArea === "inner" && opts.hiddenIndex === idx;
    drawTriangleField(pos.x, pos.y, false, idx, isHidden, opts.inner[idx]);
  });

  // Verbindungslinien als dünne Rechtecke
  const drawLine = (fromPos: (typeof positions.outer)[0], toPos: (typeof positions.outer)[0]) => {
    const midX = (fromPos.x + toPos.x) / 2;
    const midY = (fromPos.y + toPos.y) / 2;
    const dist = Math.hypot(toPos.x - fromPos.x, toPos.y - fromPos.y);
    const angle = Math.atan2(toPos.y - fromPos.y, toPos.x - fromPos.x);

    root.add([
      k.rect(dist, 1),
      k.pos(midX, midY),
      k.anchor("center"),
      k.color(120, 100, 80),
      k.rotate(angle),
      k.opacity(0.4),
    ]);
  };

  // Äußeres Dreieck
  drawLine(positions.outer[0], positions.outer[1]);
  drawLine(positions.outer[1], positions.outer[2]);
  drawLine(positions.outer[2], positions.outer[0]);

  // Inneres Dreieck
  drawLine(positions.inner[0], positions.inner[1]);
  drawLine(positions.inner[1], positions.inner[2]);
  drawLine(positions.inner[2], positions.inner[0]);

  // Legende
  if (showNumbers) {
    root.add([
      k.text("Außen:", { size: 10, font: "bubble" }),
      k.pos(-W / 2 + 35, H / 2 - 25),
      k.anchor("center"),
      k.color(60, 130, 220),
    ]);
    root.add([
      k.text("Innen:", { size: 10, font: "bubble" }),
      k.pos(-W / 2 + 35, H / 2 - 10),
      k.anchor("center"),
      k.color(220, 100, 60),
    ]);
  }

  // Hinweis beim letzten Versuch
  if (showAnswer) {
    const label = opts.hiddenArea === "outer" ? "Außen" : "Innen";
    root.add([
      k.text(`Lösung (${label}): `, { size: 10, font: "bubble" }),
      k.pos(-W / 2 + 40, H / 2 - 40),
      k.anchor("left"),
      k.color(50, 150, 50),
    ]);
  }

  return { destroy: () => k.destroy(root) };
}

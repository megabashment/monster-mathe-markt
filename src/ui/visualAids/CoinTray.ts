import type kaplay from "kaplay";

export interface CoinTrayOptions {
  x: number;
  y: number;
  targetCents: number;             // Zielbetrag, den das Kind legen soll
  available: { id: string; value: number }[]; // Verfügbare Münzen
  onChange?: (currentCents: number) => void;  // Aktueller Wert in der Auslage
  z?: number;
}

export interface CoinTrayHandle {
  destroy: () => void;
  getCurrentCents: () => number;
  reset: () => void;
}

/**
 * Klickbare Münzen-Auslage (vereinfachtes Drag-and-Drop):
 * Klick auf eine Münze fügt sie der Auslage hinzu, Klick auf eine ausgelegte Münze
 * entfernt sie wieder. So legt das Kind den Zielbetrag aktiv selbst.
 */
export function createCoinTray(
  k: ReturnType<typeof kaplay>,
  opts: CoinTrayOptions,
): CoinTrayHandle {
  const z = opts.z ?? 35;
  let currentCents = 0;

  const root = k.add([k.pos(opts.x, opts.y), k.anchor("center"), k.z(z)]);

  const W = 420, H = 160;
  root.add([
    k.rect(W, H, { radius: 10 }),
    k.pos(0, 0),
    k.anchor("center"),
    k.color(245, 235, 220),
    k.outline(2, k.rgb(110, 80, 50)),
  ]);
  root.add([
    k.text(`Lege ${(opts.targetCents / 100).toFixed(2).replace(".", ",")} €`, { size: 14 }),
    k.pos(0, -H / 2 + 12),
    k.anchor("center"),
    k.color(60, 40, 0),
  ]);
  const valueLabel: any = root.add([
    k.text(`0 ct`, { size: 18 }),
    k.pos(0, -H / 2 + 30),
    k.anchor("center"),
    k.color(60, 40, 0),
  ]);

  // Tray (Mitte) — gelegte Münzen
  const trayY = 12;
  const trayItems: any[] = [];

  function recompute() {
    currentCents = trayItems.reduce((sum, it) => sum + it.cents, 0);
    valueLabel.text =
      currentCents >= 100
        ? `${(currentCents / 100).toFixed(2).replace(".", ",")} €`
        : `${currentCents} ct`;
    opts.onChange?.(currentCents);
  }

  function layoutTray() {
    const spacing = 36;
    trayItems.forEach((it, i) => {
      const x = -((trayItems.length - 1) * spacing) / 2 + i * spacing;
      it.pos = k.vec2(x, trayY);
    });
  }

  function addCoin(id: string, value: number) {
    const item: any = root.add([
      k.sprite(id),
      k.pos(0, trayY),
      k.anchor("center"),
      k.scale(1.0),
      k.area(),
      { cents: value },
    ]);
    item.onClick(() => {
      const idx = trayItems.indexOf(item);
      if (idx !== -1) {
        trayItems.splice(idx, 1);
        item.destroy();
        layoutTray();
        recompute();
      }
    });
    trayItems.push(item);
    layoutTray();
    recompute();
  }

  // Münzwahl unten
  const chooserY = H / 2 - 24;
  const sp = 60;
  opts.available.forEach((coin, i) => {
    const x = -((opts.available.length - 1) * sp) / 2 + i * sp;
    const btn = root.add([
      k.sprite(coin.id),
      k.pos(x, chooserY),
      k.anchor("center"),
      k.scale(1.1),
      k.area(),
    ]);
    btn.onHover(() => (btn.scale = k.vec2(1.25)));
    btn.onHoverEnd(() => (btn.scale = k.vec2(1.1)));
    btn.onClick(() => addCoin(coin.id, coin.value));
  });

  return {
    destroy: () => k.destroy(root),
    getCurrentCents: () => currentCents,
    reset: () => {
      trayItems.forEach((it) => it.destroy());
      trayItems.length = 0;
      recompute();
    },
  };
}

import type kaplay from "kaplay";
import { assetManager } from "../logic/AssetManager";
import { getUnlocked, UNLOCK_THRESHOLDS } from "../logic/RewardEngine";

const CARD_W = 180;
const CARD_H = 200;
const COLS = 4;
const GAP = 16;

export function registerAlbumScene(k: ReturnType<typeof kaplay>) {
  k.scene("album", () => {
    const bg = assetManager.getUI("background-shop");
    k.add([k.sprite(bg.id), k.pos(0, 0), k.scale(k.width() / bg.width, k.height() / bg.height)]);
    // Hintergrund-Overlay bleibt fixiert
    k.add([k.rect(k.width(), k.height()), k.pos(0, 0), k.color(0, 0, 0), k.opacity(0.45)]);

    // Titel bleibt oben fixiert
    k.add([
      k.text("Monster-Album", { size: 40, align: "center", font: "bubble" }),
      k.pos(k.width() / 2, 44),
      k.anchor("center"),
      k.color(255, 220, 50),
      k.outline(5, k.rgb(50, 20, 90)),
      k.z(100),
    ]);

    const allMonsters = assetManager.getAllMonsters();
    const unlocked = getUnlocked((key) => k.getData(key));
    const currentAvatar = k.getData<string>("mmm_avatar") ?? "blubbo";

    // ── Scrolling Logik ──
    const scrollContent = k.add([k.pos(0, 0)]);
    let currentScrollY = 0;

    const totalW = COLS * CARD_W + (COLS - 1) * GAP;
    const startX = (k.width() - totalW) / 2;
    const startY = 84;
    const totalRows = Math.ceil(allMonsters.length / COLS);
    // Berechne die Gesamthöhe des Inhalts für das Clamping
    const contentHeight = startY + totalRows * (CARD_H + GAP) + 80; 
    const maxScroll = Math.max(0, contentHeight - k.height());

    // Mausrad / Touch-Scroll
    k.onScroll((s) => {
      currentScrollY = k.clamp(currentScrollY - s.y, -maxScroll, 0);
      scrollContent.pos.y = currentScrollY;
    });

    // Optional: Drag-to-scroll (für Tablets/Touch)
    k.onUpdate(() => {
      if (k.isMouseDown() && !k.isKeyPressed()) { // Einfacher Drag-Check
        currentScrollY = k.clamp(currentScrollY + k.mouseDeltaPos().y, -maxScroll, 0);
        scrollContent.pos.y = currentScrollY;
      }
    });

    allMonsters.forEach((monster, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const cx = startX + col * (CARD_W + GAP) + CARD_W / 2;
      const cy = startY + row * (CARD_H + GAP) + CARD_H / 2;
      const isUnlocked = unlocked.includes(monster.id);
      const isAvatar = monster.id === currentAvatar;

      const card = scrollContent.add([
        k.rect(CARD_W, CARD_H, { radius: 16 }),
        k.pos(cx, cy),
        k.anchor("center"),
        k.color(isAvatar ? 255 : isUnlocked ? 255 : 60,
                isAvatar ? 200 : isUnlocked ? 245 : 60,
                isAvatar ? 60  : isUnlocked ? 255 : 80),
        k.opacity(isUnlocked ? 0.92 : 0.55),
        ...(isUnlocked ? [k.area()] : []),
      ]);

      if (isUnlocked) {
        scrollContent.add([
          k.sprite(monster.id),
          k.pos(cx, cy - 28),
          k.anchor("center"),
          k.scale(2.2),
        ]);
        scrollContent.add([
          k.text(monster.name, { size: 18, align: "center", font: "bubble" }),
          k.pos(cx, cy + 72),
          k.anchor("center"),
          k.color(60, 20, 100),
        ]);

        if (isAvatar) {
          scrollContent.add([
            k.text("⭐ Mein Avatar", { size: 13, align: "center", font: "bubble" }),
            k.pos(cx, cy + 90),
            k.anchor("center"),
            k.color(180, 80, 0),
          ]);
        }

        card.onClick(() => {
          k.setData("mmm_avatar", monster.id);
          k.go("album");
        });
        card.onHover(() => { card.opacity = 1; });
        card.onHoverEnd(() => { card.opacity = 0.92; });
      } else {
        scrollContent.add([
          k.text("?", { size: 64 }),
          k.pos(cx, cy - 16),
          k.anchor("center"),
          k.color(120, 100, 150),
        ]);
        scrollContent.add([
          k.text("Noch gesperrt", { size: 13, align: "center", font: "bubble" }),
          k.pos(cx, cy + 72),
          k.anchor("center"),
          k.color(110, 100, 130),
        ]);
      }
    });

    // Fortschritts-Hinweis (scrollt am Ende der Liste mit)
    const score = k.getData<number>("mmm_score") ?? 0;
    const unlockCount = unlocked.length;
    // Nutze den nächsten Schwellenwert aus der progressiven Kurve
    const nextThreshold = UNLOCK_THRESHOLDS[unlockCount - 1]; 
    const remaining = nextThreshold ? nextThreshold - score : 0;
    
    const infoY = startY + totalRows * (CARD_H + GAP) + 20;

    if (nextThreshold && remaining > 0 && unlockCount < allMonsters.length) {
      scrollContent.add([
        k.text(
          `Noch ${remaining} richtig${remaining === 1 ? "e Antwort" : "e Antworten"} bis zum nächsten Monster!`,
          { size: 16, align: "center", font: "bubble" }
        ),
        k.pos(k.width() / 2, infoY),
        k.anchor("center"),
        k.color(200, 200, 240),
      ]);
    } else if (unlockCount >= allMonsters.length) {
      scrollContent.add([
        k.text("Du hast alle Monster gesammelt! 🏆", { size: 18, align: "center", font: "bubble" }),
        k.pos(k.width() / 2, infoY),
        k.anchor("center"),
        k.color(255, 220, 50),
      ]);
    }

    // Zurück-Button
    const back = k.add([
      k.text("← Menü", { size: 18, font: "bubble" }),
      k.pos(16, k.height() - 28),
      k.color(200, 200, 200),
      k.area(),
      k.z(100),
    ]);
    back.onClick(() => k.go("menu"));
  });
}

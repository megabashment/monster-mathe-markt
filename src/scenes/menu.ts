import type kaplay from "kaplay";
import { assetManager } from "../logic/AssetManager";
import { audioManager } from "../logic/AudioManager";
import { getUnlocked } from "../logic/RewardEngine";
import { openAdminOverlay } from "../ui/AdminOverlay";

let menuMusicHandle: any = null;

export function registerMenuScene(k: ReturnType<typeof kaplay>) {
  k.scene("menu", () => {
    // ── BGM Logic & Autoplay Fix ─────────────────────────────────────────────
    const startMenuBGM = () => {
      if (!menuMusicHandle) {
        menuMusicHandle = k.play("bgm-menu", { 
          loop: true, 
          volume: audioManager.get("bgm-menu").volume 
        });
      }
    };

    // Interaction safeguard: Browsers block audio until the first click
    const gestureReq = k.onClick(() => {
      startMenuBGM();
      gestureReq.cancel(); // Remove listener after first successful interaction
    });

    // Try starting immediately (will show warning in console if blocked, but that's fine)
    startMenuBGM();

    // ── Admin Overlay Hotkey (Shift + A) ──
    k.onKeyPress("a", () => {
      if (k.isKeyDown("shift")) {
        console.log("Admin Panel triggered");
        openAdminOverlay(k);
      }
    });

    // Hintergrund
    const bg = assetManager.getUI("background-shop");
    k.add([k.sprite(bg.id), k.pos(0, 0), k.scale(k.width() / bg.width, k.height() / bg.height)]);

    // ── Titel-Overhaul (Pokémon Mathe Markt) ──
    const title = k.add([
      k.text("POKÉMON\nMATHE MARKT", {
        size: 76,
        align: "center",
        font: "bubble", // Font zurück auf "bubble"
      }),
      k.pos(k.width() / 2, 90),
      k.anchor("center"),
      k.color(255, 255, 255),
      k.outline(12, k.rgb(30, 10, 60)), // Extra dicke Outline für den Bubble-Look
      k.z(10),
    ]);

    title.onUpdate(() => {
      // Wellenbewegung des Titels
      title.pos.y = 90 + Math.sin(k.time() * 2) * 6;
      
      // Super krasser Regenbogen-Schimmer (diagonal simuliert durch Hue-Shift)
      // Wir nutzen eine Wellenbewegung für die Sättigung, um den Glanzeffekt zu verstärken
      const hue = (k.time() * 0.2) % 1;
      const sat = 0.7 + Math.sin(k.time() * 4) * 0.2;
      const light = 0.6 + Math.cos(k.time() * 4) * 0.1;
      title.color = k.hsl2rgb(hue, sat, light);

      // ── Glitzernde Partikel an den Buchstaben ──
      if (k.dt() > 0 && Math.random() < 0.4) {
        const ox = k.rand(-300, 300);
        const oy = k.rand(-90, 90);
        const p = k.add([
          k.text("✨", { size: k.rand(12, 24) }),
          k.pos(title.pos.x + ox, title.pos.y + oy),
          k.anchor("center"),
          k.color(255, 255, 255),
          k.opacity(1),
          k.scale(0),
          k.z(15),
        ]);
        
        const pStartHue = (k.time() + ox * 0.001) % 1;
        p.onUpdate(() => {
          p.color = k.hsl2rgb((pStartHue + k.time()) % 1, 0.8, 0.8);
          p.pos.y -= k.dt() * 30; // Partikel schweben nach oben
        });

        k.tween(0, 1, 0.3, (s) => p.scale = k.vec2(s), k.easings.easeOutBack);
        k.wait(0.6, () => {
          k.tween(1, 0, 0.4, (o) => p.opacity = o).onEnd(() => p.destroy());
        });
      }
    });

    // ── Dynamisches Monster-Raster (Floating Grid) ──
    const unlockedIds = getUnlocked((key) => k.getData(key));
    const COLS = 9; // Max 9 pro Reihe
    const GAP_X = 75;
    const GAP_Y = 65;
    const gridStartY = 240;
    
    unlockedIds.forEach((id, i) => {
      const row = Math.floor(i / COLS);
      const col = i % COLS;
      
      // Berechne wie viele Monster in dieser speziellen Reihe sind für die Zentrierung
      const isLastRow = row === Math.floor((unlockedIds.length - 1) / COLS);
      const countInRow = isLastRow ? (unlockedIds.length % COLS || COLS) : COLS;
      
      const xOffset = (col - (countInRow - 1) / 2) * GAP_X;
      const yBase = gridStartY + row * GAP_Y;

      const m = k.add([
        k.sprite(id),
        k.pos(k.width() / 2 + xOffset, yBase),
        k.anchor("center"),
        k.scale(1.2),
        k.rotate(0),
        k.opacity(0.9),
        k.z(5),
      ]);

      m.onUpdate(() => {
        // Individuelles Schweben und Wackeln
        m.pos.y = yBase + Math.sin(k.time() * 2 + i * 0.5) * 12;
        m.angle = Math.sin(k.time() * 3 + i * 0.3) * 6;
      });
    });

    // Start-Button
    const btn = k.add([
      k.rect(220, 60, { radius: 16 }), // Kleiner und schlanker
      k.pos(k.width() / 2 - 120, 490),
      k.anchor("center"),
      k.color(60, 200, 60), // Sattes Pokémon-Grün
      k.area(),
      k.z(20),
      k.scale(0),
    ]);

    btn.add([
      k.text("Spielen! ✨", { size: 26, font: "bubble" }),
      k.anchor("center"),
      k.color(255, 255, 255),
      k.outline(4, k.rgb(50, 20, 90)),
    ]);

    k.wait(0.2, () => {
      k.tween(0, 1, 0.5, (s) => btn.scale = k.vec2(s), k.easings.easeOutBack);
    });

    btn.onUpdate(() => {
      btn.pos.y = 490 + Math.sin(k.time() * 3) * 4;
    });

    btn.onClick(() => {
      k.play("btn-click", { volume: audioManager.get("btn-click").volume });
      k.play("game-start", { volume: audioManager.get("game-start").volume });

      if (menuMusicHandle) {
        audioManager.fadeOut(k, menuMusicHandle, 0.5).onEnd(() => {
          menuMusicHandle.stop();
          menuMusicHandle = null;
          k.go("game");
        });
      } else {
        k.go("game");
      }
    });

    btn.onHover(() => {
      btn.color = k.rgb(100, 210, 100);
      k.play("btn-hover", { volume: audioManager.get("btn-hover").volume });
    });
    btn.onHoverEnd(() => { btn.color = k.rgb(60, 200, 60); });

    // Album-Button
    const albumBtn = k.add([
      k.rect(220, 60, { radius: 16 }), // Jetzt identisch mit dem Start-Button
      k.pos(k.width() / 2 + 120, 490),
      k.anchor("center"),
      k.color(60, 200, 60), // Jetzt identisch mit dem Start-Button
      k.area(),
      k.z(20),
      k.scale(0),
    ]);
    albumBtn.add([
      k.text("📖 Mein Album", { size: 26, font: "bubble" }), // Font zurück auf "bubble"
      k.anchor("center"),
      k.color(255, 255, 255), // Jetzt identisch mit dem Start-Button
      k.outline(4, k.rgb(50, 20, 90)),
    ]);

    k.wait(0.35, () => {
      k.tween(0, 1, 0.5, (s) => albumBtn.scale = k.vec2(s), k.easings.easeOutBack);
    });

    albumBtn.onUpdate(() => {
      albumBtn.pos.y = 490 + Math.sin(k.time() * 3 + 0.5) * 3;
    });

    albumBtn.onClick(() => {
      k.play("btn-click", { volume: audioManager.get("btn-click").volume });
      k.go("album");
    });
    albumBtn.onHover(() => {
      albumBtn.color = k.rgb(100, 210, 100); // Jetzt identisch mit dem Start-Button
      k.play("btn-hover", { volume: audioManager.get("btn-hover").volume });
    });
    albumBtn.onHoverEnd(() => { albumBtn.color = k.rgb(60, 200, 60); }); // Jetzt identisch mit dem Start-Button

    // ── Mute-Button (oben rechts) ─────────────────────────────────────────────
    let muted = false;
    const muteBtn = k.add([
      k.rect(52, 52, { radius: 12 }),
      k.pos(k.width() - 16, 16),
      k.anchor("topright"),
      k.color(100, 60, 160),
      k.opacity(0.85),
      k.area(),
    ]);
    const muteLabel = muteBtn.add([
      k.text("🔊", { size: 28 }),
      k.anchor("center"),
      k.pos(26, 26),
    ]);
    muteBtn.onClick(() => {
      muted = !muted;
      k.volume(muted ? 0 : 1);
      muteLabel.text = muted ? "🔇" : "🔊";
      k.play("btn-click", { volume: muted ? 0 : audioManager.get("btn-click").volume });
    });
    muteBtn.onHover(() => { muteBtn.opacity = 1; });
    muteBtn.onHoverEnd(() => { muteBtn.opacity = 0.85; });

    // ── Reset-Button (unten rechts) ───────────────────────────────────────────
    const resetBtn = k.add([
      k.rect(52, 52, { radius: 12 }),
      k.pos(k.width() - 16, k.height() - 16),
      k.anchor("botright"),
      k.color(150, 40, 40),
      k.opacity(0.75),
      k.area(),
    ]);
    resetBtn.add([
      k.text("🗑️", { size: 28 }),
      k.anchor("center"),
      k.pos(26, 26),
    ]);
    resetBtn.onClick(() => {
      if (!confirm("Möchtest du wirklich von vorne anfangen?")) return;
      k.setData("mmm_score", 0);
      k.setData("mmm_unlocked_monsters", ["blubbo"]);
      k.setData("mmm_avatar", "blubbo");
      k.setData("mmm_potion_type", null);
      k.setData("mmm_potion_rounds_left", 0);
      k.setData("mmm_merchant_tutorial_shown", false);
      k.go("menu");
    });
    resetBtn.onHover(() => { resetBtn.opacity = 1; });
    resetBtn.onHoverEnd(() => { resetBtn.opacity = 0.75; });
  });
}

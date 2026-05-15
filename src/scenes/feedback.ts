import type kaplay from "kaplay";
import confetti from "canvas-confetti";
import { assetManager } from "../logic/AssetManager";
import { audioManager } from "../logic/AudioManager";
import { getProgress, getNextUnlock, getUnlocked } from "../logic/RewardEngine";

const ERROR_FEEDBACKS = [
  "Fehler sind Helfer beim Lernen! 💡",
  "Jeder Fehler macht dich schlauer! 🧠",
  "Aus Fehlern lernen wir am besten! 🌟",
  "Fehler sind wie kleine Treppenstufen zum Erfolg! 🪜",
  "Kein Problem! Probiere es einfach noch einmal. ✨",
  "Fehler zeigen uns, wo wir noch wachsen können! 🌱",
  "Sogar Mathe-Profis machen mal Fehler! 🎩",
  "Fehler sind unsere kleinen Entdecker-Freunde! 🔍",
  "Mut zum Fehler! Beim nächsten Mal klappt's bestimmt. 💪",
  "Übung macht den Meister! Fehler gehören dazu. 🏆",
  "Hoppla! Das war eine gute Übung für dein Gehirn. ⚡",
  "Fehler sind die Würze beim Lernen! 🧂",
  "Bleib dran! Fehler sind nur kleine Umwege. 🚩",
  "Du bist auf dem richtigen Weg! Fehler helfen dir dabei. 🛤️",
  "Fehler machen gehört zum Lernen einfach dazu! ❤️"
];

export function registerFeedbackScene(k: ReturnType<typeof kaplay>) {
  k.scene("feedback", ({
    correct,
    answer,
    newUnlock = null,
    isShinyBonus = false,
  }: {
    correct: boolean;
    answer: number;
    newUnlock?: string | null;
    isShinyBonus?: boolean;
  }) => {

    // Hintergrund
    const bg = assetManager.getUI("background-shop");
    k.add([k.sprite(bg.id), k.pos(0, 0), k.scale(k.width() / bg.width, k.height() / bg.height)]);
    k.add([k.rect(k.width(), k.height()), k.pos(0, 0), k.color(0, 0, 0), k.opacity(0.4)]);

    if (correct && newUnlock) {
      // ── Unlock-Screen ───────────────────────────────────────────────────────
      // Spiele die Fanfare ab, wenn ein neues Monster freigeschaltet wird
      k.play("unlock-fanfare", { volume: audioManager.get("unlock-fanfare").volume });

      confetti({ particleCount: 180, spread: 100, origin: { y: 0.3 } });

      k.add([
        k.text("Super gemacht! 🌟", { size: 44, align: "center" }),
        k.pos(k.width() / 2, 70),
        k.anchor("center"),
        k.color(255, 220, 50),
      ]);

      // Unlock-Banner
      k.add([
        k.rect(520, 60, { radius: 14 }),
        k.pos(k.width() / 2, 148),
        k.anchor("center"),
        k.color(255, 200, 60),
        k.opacity(0.95),
      ]);
      k.add([
        k.text("🎉 Neues Monster freigeschaltet!", { size: 24, align: "center" }),
        k.pos(k.width() / 2, 148),
        k.anchor("center"),
        k.color(80, 40, 0),
      ]);

      // Neues Monster groß zeigen
      const mon = assetManager.getMonster(newUnlock);
      const monObj = k.add([
        k.sprite(mon.id),
        k.pos(k.width() / 2, 300),
        k.anchor("center"),
        k.scale(0.5),
      ]);
      // Scale-in Tween
      k.tween(0.5, 5.0, 0.5, (s) => { monObj.scale = k.vec2(s); }, k.easings.easeOutBack);

      k.add([
        k.text(mon.name, { size: 30, align: "center" }),
        k.pos(k.width() / 2, 410),
        k.anchor("center"),
        k.color(255, 245, 200),
      ]);

      // Zum Album Button
      const albumBtn = k.add([
        k.rect(240, 62, { radius: 14 }),
        k.pos(k.width() / 2 - 130, k.height() - 76),
        k.anchor("center"),
        k.color(255, 180, 40),
        k.area(),
      ]);
      albumBtn.add([
        k.text("Zum Album →", { size: 22 }),
        k.anchor("center"),
        k.color(80, 40, 0),
      ]);
      albumBtn.onClick(() => k.go("album"));

      // Weiter spielen Button
      const continueBtn = k.add([
        k.rect(240, 62, { radius: 14 }),
        k.pos(k.width() / 2 + 130, k.height() - 76),
        k.anchor("center"),
        k.color(160, 100, 220),
        k.area(),
      ]);
      continueBtn.add([
        k.text("Weiter spielen →", { size: 22 }),
        k.anchor("center"),
        k.color(255, 255, 255),
      ]);
      continueBtn.onClick(() => k.go("game", { skipEvents: true }));

    } else {
      // ── Normaler Feedback-Screen ─────────────────────────────────────────────
      const soundId = correct ? "answer-correct" : "answer-wrong";
      k.play(soundId, { volume: audioManager.get(soundId).volume });

      const avatarId = k.getData<string>("mmm_avatar") ?? "blubbo";
      const monster = k.add([
        k.sprite(assetManager.getMonster(avatarId).id),
        k.pos(k.width() / 2, k.height() / 2 - 40),
        k.anchor("center"),
        k.scale(correct ? 5 : 4),
        k.rotate(0),
        k.z(10),
        ...(isShinyBonus ? [k.color()] : []), // Wichtig: Color-Komponente für Rainbow-Effekt
      ]);

      // ── Shiny Bonus Effekt ──
      if (isShinyBonus) {
        // Ein rotierender Strahlenkranz im Hintergrund aus großen Sternen
        const rays = k.add([
          k.text("✨ ✨ ✨", { size: 120 }),
          k.pos(monster.pos),
          k.anchor("center"),
          k.color(255, 255, 100),
          k.opacity(0.3),
          k.rotate(0),
          k.z(monster.z - 1),
        ]);

        monster.onUpdate(() => {
          // Aggressiverer Regenbogen-Glanzeffekt
          monster.color = k.hsl2rgb((k.time() * 1.5) % 1, 0.8, 0.8);
          
          // Starkes Pulsieren
          const pulse = Math.sin(k.time() * 15) * 0.4;
          monster.scale = k.vec2(5 + pulse);

          // Strahlen rotieren lassen
          rays.angle = k.time() * 120;
          
          // Extra viele und große Funken
          if (Math.random() < 0.6) {
            const star = k.add([
              k.text("✨", { size: k.rand(32, 64) }),
              k.pos(monster.pos.x + k.rand(-100, 100), monster.pos.y + k.rand(-100, 100)),
              k.anchor("center"),
              k.opacity(1),
              k.scale(1),
              k.z(monster.z + 1),
            ]);
            k.tween(1, 0, 0.4, (o) => star.opacity = o).onEnd(() => star.destroy());
            k.tween(1, 2.5, 0.4, (s) => star.scale = k.vec2(s));
          }
        });

        // ── Bonus-Punkte Anzeige (Extra verdientes Geld) ──
        k.add([
          k.text("+5 Münzen! ✨", { size: 32 }),
          k.pos(k.width() / 2, k.height() / 2 + 100),
          k.anchor("center"),
          k.color(255, 215, 0),
        ]);
      }

      if (correct) {
        k.tween(monster.pos.y, monster.pos.y - 60, 0.3,
          (y) => { monster.pos.y = y; }, k.easings.easeOutQuad
        ).onEnd(() =>
          k.tween(monster.pos.y, monster.pos.y + 60, 0.3,
            (y) => { monster.pos.y = y; }, k.easings.easeInQuad
          )
        );
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.4 } });
      }

      k.add([
        k.text(correct ? "Super gemacht! 🌟" : `Die Antwort war: ${answer}`, {
          size: correct ? 44 : 36,
          align: "center",
        }),
        k.pos(k.width() / 2, correct ? 120 : 130),
        k.anchor("center"),
        k.color(correct ? 255 : 255, correct ? 220 : 150, correct ? 50 : 150),
      ]);

      // ── Fortschrittsbalken (nur bei Erfolg und wenn noch Monster gesperrt sind) ──
      const score = k.getData<number>("mmm_score") ?? 0;
      const progress = getProgress(score);

      if (correct && progress) {
        const BAR_W = 340;
        const BAR_H = 24;
        const barX = k.width() / 2;
        const barY = k.height() - 175;

        // Hintergrund des Balkens (Schatten)
        k.add([
          k.rect(BAR_W, BAR_H, { radius: 12 }),
          k.pos(barX, barY),
          k.anchor("center"),
          k.color(40, 20, 60),
        ]);

        // Füllung des Balkens
        const ratio = (progress.current - progress.start) / (progress.target - progress.start);
        if (ratio > 0) {
          k.add([
            k.rect(ratio * BAR_W, BAR_H, { radius: 12 }),
            k.pos(barX - BAR_W / 2, barY - BAR_H / 2),
            k.color(100, 220, 100),
          ]);
        }

        // ── Silhouette des nächsten Monsters ──
        const allIds = assetManager.getAllMonsters().map((m) => m.id);
        const currentUnlocked = getUnlocked((key) => k.getData(key));
        const nextId = getNextUnlock(allIds, currentUnlocked);

        if (nextId) {
          const silPos = k.vec2(barX + BAR_W / 2 + 30, barY);
          k.add([
            k.sprite(assetManager.getMonster(nextId).id),
            k.pos(silPos),
            k.anchor("center"),
            k.scale(0.8),
            k.color(0, 0, 0), // Macht das Monster zur Silhouette
            k.opacity(0.4),
          ]);

          // ── Fragezeichen über der Silhouette ──
          k.add([
            k.text("?", { size: 28 }),
            k.pos(silPos.x, silPos.y - 45),
            k.anchor("center"),
            k.color(255, 255, 255),
            k.opacity(0.8),
          ]);
        }

        const remaining = progress.target - progress.current;
        k.add([
          k.text(`Noch ${remaining} Aufgaben bis zum nächsten Monster!`, { size: 18 }),
          k.pos(barX, barY + 32),
          k.anchor("center"),
          k.color(200, 200, 200),
        ]);
      }

      if (!correct) {
        const randomMsg = ERROR_FEEDBACKS[Math.floor(Math.random() * ERROR_FEEDBACKS.length)];
        k.add([
          k.rect(560, 70, { radius: 14 }),
          k.pos(k.width() / 2, 215),
          k.anchor("center"),
          k.color(255, 250, 240), // Ein warmer, freundlicher Creme-Ton
          k.outline(4, k.rgb(255, 150, 50)), // Ein sanfteres Orange statt hartem Rot
          k.opacity(0.95),
        ]);
        k.add([
          k.text(randomMsg, { size: 20, align: "center", width: 520 }),
          k.pos(k.width() / 2, 215),
          k.anchor("center"),
          k.color(80, 40, 0), // Ein schönes Dunkelbraun für weicheren Kontrast
        ]);
      }

      const btn = k.add([
        k.rect(240, 64, { radius: 14 }),
        k.pos(k.width() / 2, k.height() - 80),
        k.anchor("center"),
        k.color(correct ? 80 : 160, correct ? 180 : 100, correct ? 80 : 220),
        k.area(),
      ]);
      btn.add([
        k.text(correct ? "Weiter! →" : "Nochmal! →", { size: 26 }),
        k.anchor("center"),
        k.color(255, 255, 255),
      ]);
      btn.onClick(() => k.go("game", { skipEvents: !!newUnlock }));

      k.wait(4, () => k.go("game", { skipEvents: !!newUnlock }));
    }
  });
}

import type kaplay from "kaplay";
import confetti from "canvas-confetti";
import { assetManager } from "../logic/AssetManager";
import { audioManager } from "../logic/AudioManager";
import { generateTask } from "../logic/MathEngine";
import { checkMilestonesReached, getNextUnlock, getUnlocked, saveUnlocked } from "../logic/RewardEngine";
import { loadProfile } from "../logic/difficulty/ProfileStore";
import { isReadyForFading, recordResult, shouldShowAid } from "../logic/diagnostics/ErrorTracker";
import { spawnAidForTask, type VisualAidHandle } from "../ui/visualAids";
import { openAdminOverlay } from "../ui/AdminOverlay";
import type { MathTask, StationType, TaskType } from "../types/math";
import type { SoundId } from "../types/audio";

const SCORE_KEY = "mmm_score";

function formatCents(cents: number): string {
  if (cents >= 100) {
    const euros = Math.floor(cents / 100);
    const rest = cents % 100;
    return rest === 0 ? `${euros} €` : `${euros},${rest.toString().padStart(2, "0")} €`;
  }
  return `${cents} ct`;
}

function coinScale(spriteId: string): number {
  if (spriteId === "coin-2e")  return 2.4;
  if (spriteId === "coin-1e")  return 2.0;
  if (spriteId === "coin-50c") return 1.6;
  if (spriteId === "coin-20c") return 1.3;
  return 1.1; // coin-10c
}
const BTN_COLORS = {
  normal: [160, 100, 220] as [number, number, number],
  hover:  [180, 120, 240] as [number, number, number],
  correct:[80,  180,  80] as [number, number, number],
  wrong:  [220,  80,  80] as [number, number, number],
};

// Stationen (plain objects, kein k.vec2 auf Modulebene)
const DOOR = { x: 402, y: 389 };

interface Station {
  id: string;
  pos: { x: number; y: number };
  type: StationType;
}

const STATIONS: Station[] = [
  { id: "counter",  pos: { x: 174, y: 430 }, type: "money" },
  { id: "shelf",    pos: { x: 537, y: 300 }, type: "completion" },
  { id: "trash",    pos: { x: 674, y: 485 }, type: "operations" },
  // AB III — eigene Stationen
  { id: "packets",  pos: { x: 340, y: 230 }, type: "discoveryPacket" },
  { id: "pyramid",  pos: { x: 200, y: 280 }, type: "numberPyramid" },
  { id: "triangle", pos: { x: 720, y: 260 }, type: "countTriangle" },
];
const PRES_POS = { x: 670, y: 460 }; // Feste Position rechts neben den Buttons

// ── Satzkonstellationen ──────────────────────────────────────────────────
const ENTRANCE_THOUGHTS = [
  "Hm, was wollte ich gleich nochmal?",
  "Worauf habe ich heute wohl Lust?",
  "Was steht denn da Schönes?",
  "Huch, so viel Auswahl hier!",
  "Mal sehen, was es heute gibt...",
  "Hallo? Ist jemand im Laden?",
  "Oh, wie ein toller Laden!",
  "Ich glaube, ich vergesse was...",
  "Schnell, ich hab nicht viel Zeit!",
  "Mmmh, hier riecht es gut!",
  "Wo ist denn die Kasse hier?",
  "Ich hoffe, ich hab genug Geld.",
  "Was kaufe ich heute bloß?",
  "Endlich wieder einkaufen!",
  "Hier gibt's sicher was Leckeres.",
];

const LEGENDARY_TEASER_THOUGHTS = [
  "Wer bin ich...?",
  "Ich bin nicht von hier.",
  "Nur auf der Durchreise...",
  "Psst... ich war nie hier.",
  "Zu mächtig für diesen Laden.",
  "Niemand kann mich aufhalten.",
  "Ich existiere kaum...",
  "....",
  "Interessant, dieser Ort.",
  "Ich spüre große Energie hier.",
];

const STATION_DECISIONS: Record<StationType, string[]> = {
  money: [
    "Ich muss noch bezahlen!",
    "Geld zählen macht Spaß!",
    "Habe ich genug Euro dabei?",
    "Ich möchte bar bezahlen.",
    "Wo ist mein Portemonnaie?",
    "Ich hoffe, ich hab genug Cent.",
    "Ach, endlich an der Kasse!",
    "Kleingeld hab ich sicher noch.",
    "Stimmt der Betrag so?",
    "Ich zahl lieber mit Münzen.",
  ],
  completion: [
    "Ich brauche frischen Saft!",
    "Äpfel sind so gesund.",
    "Das Regal sieht aber leer aus!",
    "Ich kaufe Vitamine!",
    "Mmh, reife Bananen!",
    "Eine Dose Suppe wäre toll.",
    "Frische Milch, bitte!",
    "Ich back heute Abend Brot.",
    "Kekse sind meine Lieblinge!",
    "Ein Brötchen für den Weg!",
    "Oh, Milchkartons! Super.",
    "Gibt es hier noch Konserven?",
    "Bananen kaufe ich immer!",
    "Die Keksdose sieht lecker aus.",
    "Frischer Saft für den Morgen!",
  ],
  operations: [
    "Ich räum mal kurz auf.",
    "Das gehört in den Müll!",
    "Hier muss sauber sein.",
    "Mathe-Abfall wegbringen!",
    "Wer hat denn das hier gelassen?",
    "Ordnung muss sein!",
    "Das kommt weg, sofort!",
    "Hier ist ja alles durcheinander.",
    "Ich helf mal beim Aufräumen.",
    "So ein Chaos hier!",
  ],
  discoveryPacket: [
    "Was steckt hinter dem Muster?",
    "Päckchen-Reihe — interessant!",
    "Ich schau mir die Reihe an.",
    "Das hat sicher ein System.",
    "Was kommt als Nächstes?",
    "Ich erkenne hier etwas...",
  ],
  numberPyramid: [
    "Eine Zahlenmauer!",
    "Was steht ganz oben?",
    "Welcher Stein passt rein?",
    "Türmchen bauen mit Zahlen!",
    "Hmm, welche Zahl fehlt?",
    "Ich knack das Türmchen.",
  ],
  countTriangle: [
    "Ein Rechendreieck!",
    "Welche Zahl fehlt im Dreieck?",
    "Schloss-Rätsel im Tresor.",
    "Drei Zahlen, ein System.",
    "Knobelei für Profis!",
    "Das löse ich gleich.",
  ],
};

let gameMusicHandle: any = null;
let currentTrackId: string | null = null;

// ── Ash Ketchup Merchant ─────────────────────────────────────────────────────
const POTION_TYPE_KEY      = "mmm_potion_type";
const POTION_ROUNDS_KEY    = "mmm_potion_rounds_left";
const MERCHANT_TUTORIAL_KEY = "mmm_merchant_tutorial_shown";
const POTION_ROUNDS        = 5;
const POTION_DEFS = [
  { type: "addition",       symbol: "+", name: "Plus-Trank",    price: 8, color: [60,  190,  60] as [number, number, number] },
  { type: "subtraction",    symbol: "−", name: "Minus-Trank",   price: 5, color: [60,  130, 220] as [number, number, number] },
  { type: "multiplication", symbol: "×", name: "Mal-Trank",     price: 4, color: [210, 130,  30] as [number, number, number] },
  { type: "division",       symbol: "÷", name: "Geteilt-Trank", price: 3, color: [170,  50, 190] as [number, number, number] },
];

const MERCHANT_STAND = { x: 500, y: 425 };

const STREAK_KEY = "mmm_streak";
const TOTAL_CORRECT_KEY = "mmm_total_correct";

const CORRECT_MILESTONES: Record<number, string> = {
  10:  "Das war deine\n10. richtige Antwort!\nWeiter so!",
  20:  "Schon 20 richtige!\nDu lernst schnell!",
  30:  "Das war deine\n30. richtige Antwort!\nRespektabel!",
  50:  "50 richtige Antworten!\nDu bist ein Mathe-Profi! 🌟",
  75:  "75 richtige!\nAsh zieht den Hut! 🎩",
  100: "100 RICHTIGE!\nEinfach legendär! 🏆",
};

function animateMerchantEntry(
  k: ReturnType<typeof kaplay>,
  onArrived: () => void,
) {
  k.play("door-bell", { volume: audioManager.get("door-bell").volume });

  const merchant = k.add([
    k.sprite("npc-ash-ketchup"),
    k.pos(DOOR.x, DOOR.y),
    k.anchor("center"),
    k.rotate(0),
    k.z(50),
    k.scale(2.5), // Startet in der Größe der normalen Gäste an der Tür
  ]);

  const dist = Math.hypot(MERCHANT_STAND.x - DOOR.x, MERCHANT_STAND.y - DOOR.y);
  const dur  = dist / 140;

  merchant.flipX = MERCHANT_STAND.x < DOOR.x;

  let walking = true;
  merchant.onUpdate(() => {
    if (walking) merchant.angle = Math.sin(k.time() * 12) * 8;
  });

  k.tween(DOOR.x, MERCHANT_STAND.x, dur, (x) => merchant.pos.x = x, k.easings.linear);
  k.tween(DOOR.y, MERCHANT_STAND.y, dur, (y) => merchant.pos.y = y, k.easings.linear).onEnd(() => {
    // Zoom-Effekt: Er wird größer (von 2.5 auf 4.9 = 3.5 * 1.4), während er auf den Spieler zuläuft
  });
  k.tween(2.5, 4.9, dur, (s) => merchant.scale = k.vec2(s), k.easings.linear).onEnd(() => {
    walking = false;
    merchant.angle = 0;
    k.play("arrival-pop", { volume: audioManager.get("arrival-pop").volume });
    k.tween(MERCHANT_STAND.y, MERCHANT_STAND.y - 22, 0.15, (y) => merchant.pos.y = y, k.easings.easeOutQuad).onEnd(() => {
      k.tween(MERCHANT_STAND.y - 22, MERCHANT_STAND.y, 0.18, (y) => merchant.pos.y = y, k.easings.easeInQuad).onEnd(() => {
        k.destroy(merchant);
        onArrived();
      });
    });
  });
}

function showMerchantTutorial(
  k: ReturnType<typeof kaplay>,
  onDone: () => void,
) {
  const TAG = "merchant-tutorial";
  const CX = k.width() / 2, CY = k.height() / 2;

  k.add([k.rect(k.width(), k.height()), k.pos(0, 0), k.color(0, 0, 0), k.opacity(0.78), k.z(200), k.fixed(), TAG]);
  k.add([k.rect(520, 340, { radius: 24 }), k.pos(CX, CY + 20), k.anchor("center"), k.color(55, 25, 85), k.z(201), k.fixed(), TAG]);

  k.add([k.sprite("npc-ash-ketchup"), k.pos(CX - 290, CY + 20), k.anchor("center"), k.scale(1.4), k.z(203), k.fixed(), TAG]);

  const textLines: Array<{ text: string; size: number; color: [number,number,number]; dy: number }> = [
    { text: "Hey! Ich bin Ash Ketchup!",      size: 21, color: [255, 220, 100], dy: -115 },
    { text: "Manchmal tauche ich zwischen\nden Runden auf.",   size: 15, color: [240, 240, 240], dy: -68 },
    { text: "Dann kannst du Mathe-Tränke kaufen!\nJeder Trank gibt dir 5 Runden lang\nnur eine Aufgaben-Art — einfacher!", size: 14, color: [200, 225, 255], dy: -5 },
    { text: "Tränke kosten Punkte.\nSpar sie klug!",           size: 15, color: [255, 210, 90],  dy: 95 },
  ];
  for (const line of textLines) {
    k.add([k.text(line.text, { size: line.size, align: "center" }), k.pos(CX + 40, CY + 20 + line.dy), k.anchor("center"), k.color(...line.color), k.z(202), k.fixed(), TAG]);
  }

  const btn = k.add([k.rect(200, 52, { radius: 14 }), k.pos(CX + 40, CY + 165), k.anchor("center"), k.color(80, 180, 80), k.area(), k.z(202), k.fixed(), TAG]);
  btn.add([k.text("Los geht's! →", { size: 18 }), k.anchor("center"), k.color(255, 255, 255)]);
  btn.onHover(() => btn.color = k.rgb(110, 210, 110));
  btn.onHoverEnd(() => btn.color = k.rgb(80, 180, 80));
  btn.onClick(() => { k.destroyAll(TAG); onDone(); });
}

function showMerchantOverlay(
  k: ReturnType<typeof kaplay>,
  currentScore: number,
  onClose: (bought: typeof POTION_DEFS[0] | null) => void,
) {
  const TAG = "merchant-overlay";

  k.add([k.rect(k.width(), k.height()), k.pos(0, 0), k.color(0, 0, 0), k.opacity(0.72), k.z(200), k.fixed(), TAG]);

  const CX = k.width() / 2, CY = k.height() / 2;
  k.add([k.rect(500, 410, { radius: 24 }), k.pos(CX, CY), k.anchor("center"), k.color(55, 25, 85), k.z(201), k.fixed(), TAG]);

  // Ash Ketchup Sprite — links oben am Panel
  k.add([k.sprite("npc-ash-ketchup"), k.pos(CX - 290, CY - 140), k.anchor("center"), k.scale(1.4), k.z(203), k.fixed(), TAG]);

  k.add([k.text("Ash Ketchup's Tränke-Shop", { size: 22, align: "center" }), k.pos(CX, CY - 173), k.anchor("center"), k.color(255, 220, 100), k.z(202), k.fixed(), TAG]);
  k.add([k.text("Jeweils 5 Runden Bonus!", { size: 14, align: "center" }), k.pos(CX, CY - 143), k.anchor("center"), k.color(200, 180, 240), k.z(202), k.fixed(), TAG]);

  const BW = 210, BH = 74, GAP = 12;
  const gx = CX - BW - GAP / 2;
  const gy = CY - 98;

  POTION_DEFS.forEach((potion, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const bx = gx + col * (BW + GAP) + BW / 2;
    const by = gy + row * (BH + GAP) + BH / 2;
    const canAfford = currentScore >= potion.price;
    const r = canAfford ? potion.color[0] : 90;
    const g = canAfford ? potion.color[1] : 90;
    const b = canAfford ? potion.color[2] : 90;

    const btn = k.add([
      k.rect(BW, BH, { radius: 14 }),
      k.pos(bx, by), k.anchor("center"),
      k.color(r, g, b),
      k.area(),
      k.z(202), k.fixed(), TAG,
    ]);

    btn.add([k.text(`${potion.symbol}  ${potion.name}`, { size: 18 }), k.anchor("center"), k.pos(0, -12), k.color(255, 255, 255)]);
    btn.add([k.text(`${potion.price} Punkte`, { size: 13 }), k.anchor("center"), k.pos(0, 14), k.color(canAfford ? 255 : 140, canAfford ? 220 : 140, canAfford ? 100 : 140)]);

    if (canAfford) {
      btn.onHover(() => btn.color = k.rgb(Math.min(r + 30, 255), Math.min(g + 30, 255), Math.min(b + 30, 255)));
      btn.onHoverEnd(() => btn.color = k.rgb(r, g, b));
      btn.onClick(() => { k.destroyAll(TAG); onClose(potion); });
    }
  });

  const skip = k.add([
    k.text("Kein Interesse →", { size: 15 }),
    k.pos(CX, CY + 178), k.anchor("center"),
    k.color(170, 170, 170), k.area(), k.z(202), k.fixed(), TAG,
  ]);
  skip.onHover(() => skip.color = k.rgb(220, 220, 220));
  skip.onHoverEnd(() => skip.color = k.rgb(170, 170, 170));
  skip.onClick(() => { k.destroyAll(TAG); onClose(null); });
}

function showAshStreakPeek(
  k: ReturnType<typeof kaplay>,
  message: string,
  onDone: () => void,
) {
  const TAG = "ash-peek";
  const startX = k.width() + 80;
  const stopX  = k.width() - 90;
  const y = k.height() - 110;

  const ash = k.add([
    k.sprite("npc-ash-ketchup"),
    k.pos(startX, y),
    k.anchor("center"),
    k.scale(2.2),
    k.z(160),
    k.fixed(),
    TAG,
  ]);
  ash.flipX = true;

  const bx = stopX - 160;
  const by = y - 105;
  const bubble = k.add([
    k.rect(300, 95, { radius: 14 }),
    k.pos(bx, by),
    k.anchor("center"),
    k.color(255, 240, 80),
    k.outline(3, k.rgb(180, 130, 0)),
    k.opacity(0),
    k.z(161),
    k.fixed(),
    TAG,
  ]);
  const bubbleTxt = k.add([
    k.text(message, { size: 13, width: 278, align: "center" }),
    k.pos(bx, by),
    k.anchor("center"),
    k.color(60, 40, 0),
    k.opacity(0),
    k.z(162),
    k.fixed(),
    TAG,
  ]);

  k.play("think-pop", { volume: audioManager.get("think-pop").volume, detune: -400 });
  k.tween(startX, stopX, 0.5, (x) => ash.pos.x = x, k.easings.easeOutBack).onEnd(() => {
    k.play("arrival-pop", { volume: audioManager.get("arrival-pop").volume });
    k.tween(0, 1, 0.25, (o) => { bubble.opacity = o; bubbleTxt.opacity = o; });
    k.wait(2.8, () => {
      k.tween(1, 0, 0.2, (o) => { bubble.opacity = o; bubbleTxt.opacity = o; });
      k.tween(stopX, startX, 0.35, (x) => ash.pos.x = x, k.easings.easeInQuad).onEnd(() => {
        k.destroyAll(TAG);
        onDone();
      });
    });
  });
}

export function registerGameScene(k: ReturnType<typeof kaplay>) {
  k.scene("game", (args: { skipEvents?: boolean } = {}) => {
    let score = k.getData<number>(SCORE_KEY) ?? 0;

    // Aktiver Trank (Ash Ketchup)
    const activePotionType = k.getData<string>(POTION_TYPE_KEY) ?? null;
    const potionRoundsLeft = k.getData<number>(POTION_ROUNDS_KEY) ?? 0;
    const merchantTutorialShown = k.getData<boolean>(MERCHANT_TUTORIAL_KEY) ?? false;
    let merchantShown = false;

    // Prüfe ob der RAINBOW-Cheat aktiv ist oder ob es der zweite Gast nach Start ist (Score 1)
    let isShiny = !args.skipEvents && (k.getData<boolean>("mmm_force_shiny") === true || score === 1 || Math.random() < 0.06);
    if (k.getData("mmm_force_shiny")) k.setData("mmm_force_shiny", false);

    // ── BGM Logic & Autoplay Fix ─────────────────────────────────────────────
    const startGameBGM = (trackOverride?: SoundId) => {
      const neededTrack: SoundId = trackOverride || (isShiny ? "alphadance" : "bgm-game");

      // Bereits der richtige Track — nichts tun
      if (currentTrackId === neededTrack && gameMusicHandle) return;

      if (gameMusicHandle) {
        const oldHandle = gameMusicHandle;
        gameMusicHandle = null;
        // Cosmetic fade-out; setTimeout überlebt Szenenübergänge (k.tween.onEnd tut das nicht)
        audioManager.fadeOut(k, oldHandle, 0.8);
        setTimeout(() => oldHandle.stop(), 850);
      }

      currentTrackId = neededTrack;
      const trackData = audioManager.get(neededTrack);
      gameMusicHandle = k.play(neededTrack, { loop: true, volume: 0 });
      audioManager.fadeIn(k, gameMusicHandle, trackData.volume ?? 0.1, 1.5);
    };

    // If the user deep-links or refreshes here, we need the same safeguard
    const gestureReq = k.onClick(() => {
      startGameBGM();
      gestureReq.cancel();
    });

    // ── Admin Overlay Hotkey (Shift + A) ──
    k.onKeyPress("a", () => {
      if (k.isKeyDown("shift")) {
        openAdminOverlay(k);
      }
    });

    // Normal start (gesture usually already exists from menu)
    startGameBGM();

    let answered = false;
    let walkingOut = false;
    let pendingFeedback: { correct: boolean; answer: number; newUnlock: string | null; isShinyBonus: boolean } | null = null;

    // Visuelle Hilfsmittel (Hundertertafel, Dienes, Schritt-Leiste)
    let aidHandle: VisualAidHandle | null = null;
    const AID_POS = { x: k.width() / 2, y: 175 };
    const ensureAidShown = (override = false) => {
      if (aidHandle) return;
      if (!override) {
        const allowed = shouldShowAid(station.type, profile.visualSupport, profile.scaffoldOnError, profile.grade);
        if (!allowed) return;
        if (profile.fadingEnabled && profile.visualSupport && isReadyForFading(station.type)) return;
      }
      attemptCount++;
      aidHandle = spawnAidForTask(k, task, AID_POS, attemptCount) ?? null;
      // Wenn am Regal die antwort-zeigenden Items noch sichtbar sind, ausblenden:
      // das Hilfsmittel ersetzt die Item-Anzeige (sonst leakt sie die Lösung).
      if (aidHandle && station.type === "completion") {
        visualGroup.removeAll();
      }
    };
    const destroyAid = () => {
      aidHandle?.destroy();
      aidHandle = null;
    };

    // Scaffold-Retry: erster Fehler verbraucht keinen Walk-out, sondern öffnet
    // die Hilfe + zweite Chance. Falsche Antworten bleiben gesperrt.
    let scaffoldOffered = false;
    let madeError = false;
    let attemptCount = 0;
    const disabledChoices = new Set<number>();
    let retryHint: any = null;
    const showRetryHint = () => {
      if (retryHint) return;
      retryHint = k.add([
        k.rect(420, 50, { radius: 10 }),
        k.pos(k.width() / 2, 280),
        k.anchor("center"),
        k.color(255, 240, 180),
        k.outline(2, k.rgb(180, 130, 30)),
        k.opacity(0),
        k.z(15),
        "scaffold-hint",
      ]);
      retryHint.add([
        k.text("Schau dir die Hilfe an und probier's nochmal!", { size: 12, width: 400 }),
        k.anchor("center"),
        k.color(80, 50, 0),
      ]);
      k.tween(0, 1, 0.25, (o) => (retryHint.opacity = o));
    };
    const clearRetryHint = () => {
      k.destroyAll("scaffold-hint");
      retryHint = null;
    };

    let shinyTime = 15; // 15 Sekunden Zeit für den Bonus
    let streakPeekMessage: string | null = null;

    // Sequenz-States
    let sequenceActive = true;

    // Welches Monster kommt zu Besuch?
    const allIds = assetManager.getAllMonsters().map((m) => m.id);
    const unlockedIds = getUnlocked((key) => k.getData(key));
    const lockedIds = allIds.filter((id) => !unlockedIds.includes(id));
    const legendaryIds = allIds.filter((id) => assetManager.getMonster(id).tags.includes("legendary"));
    const lockedLegendaries = legendaryIds.filter((id) => !unlockedIds.includes(id));
    const lockedRegular = lockedIds.filter((id) => !legendaryIds.includes(id));

    // 5% Chance: ein gesperrtes Legendary taucht als Teaser auf
    let guestPool: string[];
    if (!args.skipEvents && lockedLegendaries.length > 0 && Math.random() < 0.11) {
      const pick = lockedLegendaries[Math.floor(Math.random() * lockedLegendaries.length)];
      guestPool = [...unlockedIds, pick];
    } else {
      guestPool = [...unlockedIds, ...lockedRegular.slice(0, 2)];
    }

    const guestId = guestPool[Math.floor(Math.random() * guestPool.length)] || "blubbo";
    const mon = assetManager.getMonster(guestId);
    const isLegendaryTeaser = !unlockedIds.includes(guestId) && legendaryIds.includes(guestId);

    let currentBubbleText = (score === 1 && isShiny)
      ? "Oha, ich glitzere heute! ✨"
      : isLegendaryTeaser
      ? LEGENDARY_TEASER_THOUGHTS[Math.floor(Math.random() * LEGENDARY_TEASER_THOUGHTS.length)]
      : ENTRANCE_THOUGHTS[Math.floor(Math.random() * ENTRANCE_THOUGHTS.length)];

    // NEU: Sound wenn das Monster erscheint
    k.play("door-bell", { volume: audioManager.get("door-bell").volume });

    // Profil & aktive Stationen
    const profile = loadProfile();
    const activeStations = STATIONS.filter((s) => profile.activeModules.includes(s.type));
    const stationPool = activeStations.length > 0 ? activeStations : STATIONS.slice(0, 3);

    // Station & Aufgabe wählen — bei aktivem Trank 70% Chance auf Rechenaufgabe (operations)
    const operationsStation = stationPool.find((s) => s.type === "operations");
    const station: Station =
      activePotionType && operationsStation && Math.random() < 0.70
        ? operationsStation
        : stationPool[Math.floor(Math.random() * stationPool.length)];

    const task: MathTask = generateTask(station.type, {
      profile,
      operationHint: (activePotionType as TaskType | null) ?? null,
    });

    // ── Background ──────────────────────────────────────────────────────────
    const bg = assetManager.getUI("background-shop");
    k.add([k.sprite(bg.id), k.pos(0, 0), k.scale(k.width() / bg.width, k.height() / bg.height)]);
    k.add([k.rect(k.width(), k.height()), k.pos(0, 0), k.color(0, 0, 0), k.opacity(0.35)]);

    // ── Shiny Vignette Glow ──────────────────────────────────────────────────
    const vignette = k.add([
      k.rect(k.width(), k.height()),
      k.color(255, 220, 50), // Goldener Grundton
      k.opacity(0),
      k.z(150), // Über fast allen Elementen
      k.fixed(),
    ]);

    vignette.onUpdate(() => {
      if (currentTrackId === "alphadance") {
        // Sanftes Pulsieren zwischen 5% und 12% Opacity
        vignette.opacity = 0.08 + Math.sin(k.time() * 4) * 0.04;
      } else {
        vignette.opacity = k.lerp(vignette.opacity, 0, k.dt() * 10);
      }
    });

    // ── Score ────────────────────────────────────────────────────────────────
    const coinObj = assetManager.getObject("coin-gold");
    const scoreIcon = k.add([k.sprite(coinObj.id), k.pos(36, 32), k.scale(1.2), k.anchor("center")]);
    const scoreTxt = k.add([
      k.text(`${score}`, { size: 28 }),
      k.pos(62, 22),
      k.color(255, 220, 50),
    ]);

    // ── Aktiver Trank Indikator ──────────────────────────────────────────────
    if (activePotionType && potionRoundsLeft > 0) {
      const pd = POTION_DEFS.find(p => p.type === activePotionType);
      if (pd) {
        const potionBar = k.add([
          k.rect(160, 34, { radius: 10 }),
          k.pos(10, 60),
          k.color(pd.color[0], pd.color[1], pd.color[2]),
          k.opacity(0.9),
          k.z(10),
          k.outline(2, k.rgb(255, 255, 255)), // Weißer Rahmen für bessere Sichtbarkeit
          k.scale(1),
        ]);

        potionBar.add([
          k.text(`${pd.symbol} AKTIV: ${potionRoundsLeft}x`, { size: 14 }),
          k.pos(10, 17),
          k.anchor("left"),
          k.color(255, 255, 255),
          k.z(11),
        ]);

        // Pulsierender Effekt und magisches Glitzern
        potionBar.onUpdate(() => {
          const s = 1 + Math.sin(k.time() * 4) * 0.04;
          potionBar.scale = k.vec2(s);
          
          // Gelegentliches Glitzern am Indikator
          if (Math.random() < 0.05) {
            const p = k.add([
              k.text("✨", { size: k.rand(8, 16) }),
              k.pos(potionBar.pos.x + k.rand(0, 160), potionBar.pos.y + k.rand(0, 34)),
              k.anchor("center"),
              k.opacity(1),
              k.scale(1),
              k.z(12),
            ]);
            k.tween(1, 0, 0.4, (o) => p.opacity = o).onEnd(() => p.destroy());
            k.tween(0.5, 1.5, 0.4, (s) => p.scale = k.vec2(s));
          }
        });

        // ── "Trank aktiviert!" Animation beim ersten Erscheinen ──────────────
        // Wenn die Rundenanzahl noch beim Maximum liegt, wurde der Trank gerade erst gekauft.
        if (potionRoundsLeft === POTION_ROUNDS) {
          const banner = k.add([
            k.rect(k.width(), 84),
            k.pos(k.width() / 2, k.height() / 2),
            k.anchor("center"),
            k.color(pd.color[0], pd.color[1], pd.color[2]),
            k.opacity(0),
            k.scale(1),
            k.outline(4, k.rgb(255, 255, 255)),
            k.z(300),
            k.fixed(),
          ]);

          const txt = banner.add([
            k.text(`${pd.symbol} ${pd.name.toUpperCase()} AKTIVIERT! ✨`, { size: 28 }),
            k.anchor("center"),
            k.color(255, 255, 255),
            k.opacity(0),
          ]);

          k.play("unlock-fanfare", { volume: 0.15, detune: 800 });

          // Animation: Einblenden mit Ease-Out Effekt
          k.tween(0, 0.9, 0.4, (v) => banner.opacity = v);
          k.tween(0, 1, 0.4, (v) => txt.opacity = v);
          k.tween(0.5, 1, 0.5, (v) => banner.scale = k.vec2(v), k.easings.easeOutBack);

          // Kurze Pause, dann elegantes Ausblenden und Vergrößern
          k.wait(2.2, () => {
            k.tween(0.9, 0, 0.4, (v) => banner.opacity = v);
            k.tween(1, 0, 0.4, (v) => txt.opacity = v);
            k.tween(1, 1.2, 0.4, (v) => banner.scale = k.vec2(v), k.easings.easeInQuad)
              .onEnd(() => banner.destroy());
          });
        }
      }
    }

    // ── Monster (startet an der Tür) ─────────────────────────────────────────
    let arrived = false;
    let reachedStation = false;

    // Aura-Ring für Legendary-Teaser
    const auraColor = mon.tags.includes("water") ? [0, 160, 255]
      : mon.tags.includes("fire") ? [255, 80, 0]
      : [60, 210, 80];
    const aura = isLegendaryTeaser ? k.add([
      k.circle(52),
      k.pos(DOOR.x, DOOR.y),
      k.anchor("center"),
      k.color(auraColor[0], auraColor[1], auraColor[2]),
      k.opacity(0.35),
      k.z(1),
    ]) : null;

    const monster = k.add([
      k.sprite(mon.id),
      k.pos(DOOR.x, DOOR.y),
      k.anchor("center"),
      k.scale(2.5),
      k.rotate(0),
      k.z(2),
      // Silhouette-Logik: Legendaries sind immer tiefschwarz, auch wenn sie shiny sind (Mystery!)
      ...(isLegendaryTeaser ? [k.color(0, 0, 0)] : (isShiny ? [k.color()] : [])),
      { yOffset: 0 },
    ]);

    // ── Shiny & Legendary Effekte ──
    monster.onUpdate(() => {
      // Glitzern: permanent für Shinies ODER für Legendaries beim Abschied
      const isWalkingLegendary = isLegendaryTeaser && walkingOut;
      const glitterChance = isShiny ? 0.3 : (isWalkingLegendary ? 0.2 : 0);

      if (glitterChance > 0 && k.dt() > 0 && Math.random() < glitterChance) {
        const star = k.add([
          k.text("✨", { size: k.rand(16, 32) }),
          k.pos(monster.pos.x + k.rand(-40, 40), monster.pos.y + k.rand(-40, 40)),
          k.anchor("center"),
          k.opacity(1),
          k.scale(1),
          k.move(k.rand(0, 360), 60),
          k.z(monster.z + 1),
        ]);
        k.tween(1, 0, 0.6, (o) => star.opacity = o).onEnd(() => star.destroy());
        k.tween(1, 2, 0.6, (s) => star.scale = k.vec2(s));
      }

      if (isShiny && !isLegendaryTeaser) {
        // Farbwechsel-Effekt (Gold/Regenbogen Glanz) nur für normale Shinies zeigen
        // Bei Legendaries bleibt die Silhouette schwarz, um die Details zu verbergen
        monster.color = k.hsl2rgb((k.time() * 0.8) % 1, 0.8, 0.8);
        
        // Sanftes Pulsieren der Größe für mehr Lebendigkeit
        const pulse = Math.sin(k.time() * 12) * 0.15;
        monster.scale = k.vec2((arrived ? 3.5 : 2.5) + pulse);

        // ── Goldener Partikel-Schweif beim Laufen ──
        if (!arrived && k.dt() > 0 && Math.random() < 0.5) {
          const p = k.add([
            k.circle(k.rand(2, 5)),
            k.pos(monster.pos.x + k.rand(-10, 10), monster.pos.y + 40),
            k.color(255, 220, 50),
            k.opacity(0.8),
            k.anchor("center"),
            k.z(monster.z - 1),
          ]);
          k.tween(0.8, 0, 0.4, (o) => p.opacity = o).onEnd(() => p.destroy());
        }
      }
    });

    // ── Shiny Timer UI (Münzen statt Balken) ──
    const timerCoins: any[] = [];
    const timerGroup = isShiny ? k.add([
      k.pos(k.width() / 2, 68),
    ]) : null;
    let timerLabel: any = null;

    if (isShiny && timerGroup) {
      const spacing = 52;
      const coinCount = 5;
      const startX = -((coinCount - 1) * spacing) / 2;

      timerLabel = timerGroup.add([
        k.text("✨ 5× Punkte! ✨", { size: 18, align: "center" }),
        k.anchor("center"),
        k.pos(0, -36),
        k.color(255, 220, 50),
        k.opacity(0),
      ]);

      for (let i = 0; i < coinCount; i++) {
        const c = timerGroup.add([
          k.sprite(coinObj.id),
          k.pos(startX + i * spacing, 0),
          k.scale(0),
          k.anchor("center"),
          k.opacity(0),
        ]);
        timerCoins.push(c);
      }
    }

    // ── Sprechblase UI ──────────────────────────────────────────────────────
    const bubble = k.add([
      k.rect(180, 50, { radius: 12 }),
      k.pos(monster.pos.x, monster.pos.y - 60),
      k.anchor("bot"),
      k.color(isLegendaryTeaser ? 20 : 255, isLegendaryTeaser ? 10 : 255, isLegendaryTeaser ? 60 : 255),
      k.outline(3, isLegendaryTeaser ? k.rgb(200, 160, 255) : k.rgb(80, 40, 120)),
      k.z(50),
      k.opacity(1),
    ]);
    // Erster Denk-Sound
    k.play("think-pop", { volume: audioManager.get("think-pop").volume });

    const bubbleTxt: any = bubble.add([
      k.text(currentBubbleText, { size: 14, width: 160, align: "center" }),
      k.anchor("center"),
      k.pos(0, -25),
      k.color(isLegendaryTeaser ? 240 : 0, isLegendaryTeaser ? 220 : 0, isLegendaryTeaser ? 255 : 0),
      k.opacity(1),
    ]);

    // ── Aufgaben-Panel (startet unsichtbar) ──────────────────────────────────
    // Multi-line Fragen (AB III) brauchen mehr Platz
    const questionLines = task.question.split("\n").length;
    const questionSize = questionLines >= 3 ? 18 : questionLines === 2 ? 22 : 32;
    const panelH = questionLines >= 3 ? 110 : questionLines === 2 ? 90 : 80;

    const taskPanel = k.add([
      k.rect(460, panelH, { radius: 20 }), // Panelgröße anpassen
      k.pos(k.width() / 2, 330),
      k.anchor("center"),
      k.color(255, 245, 255),
      k.opacity(0),
      k.z(10), // Hinter Text/Buttons aber vor den Items
    ]);

    const questionTxt = k.add([
      k.text(task.question, { size: questionSize, align: "center", width: 440, font: "bubble" }), // Font zurück auf "bubble"
      k.pos(k.width() / 2, 330),
      k.anchor("center"),
      k.color(60, 20, 100),
      k.opacity(0),
      k.outline(4, k.rgb(255, 255, 255)), // Leichte Outline für bessere Lesbarkeit auf dem Panel
      k.z(11),
    ]);

    // ── Antwort-Buttons (2×2, starten unsichtbar) ────────────────────────────
    const BTN_W = 190, BTN_H = 62, GAP = 16;
    const gridX = k.width() / 2 - BTN_W - GAP / 2;
    const gridY = 400;

    // any[] weil btn.add()/k.add() ohne Generics kein OpacityComp inferieren
    const buttons: any[] = [];
    const labels: any[] = [];

    const isMoney = task.visuals?.[0]?.startsWith("coin") ?? false;
    task.choices.forEach((choice, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const bx = gridX + col * (BTN_W + GAP);
      const by = gridY + row * (BTN_H + GAP);

      const btn = k.add([
        k.rect(BTN_W, BTN_H, { radius: 14 }),
        k.pos(bx + BTN_W / 2, by + BTN_H / 2),
        k.anchor("center"),
        k.color(...BTN_COLORS.normal),
        k.area(),
        k.opacity(0),
        k.scale(0), // Startet bei 0 für die Animation
        k.z(12), // Immer ganz oben
      ]);

      const label = btn.add([
        k.text(isMoney ? formatCents(choice) : `${choice}`, { size: 28, font: "bubble" }), // Font zurück auf "bubble"
        k.anchor("center"),
        k.color(255, 255, 255),
        k.opacity(0),
        k.outline(4, k.rgb(50, 20, 90)), // Passende Outline für den Button-Text
      ]);

      btn.onHover(() => {
        if (!answered) {
          btn.color = k.rgb(...BTN_COLORS.hover);
          k.play("btn-hover", { volume: audioManager.get("btn-hover").volume });
        }
      });
      btn.onHoverEnd(() => { if (!answered) btn.color = k.rgb(...BTN_COLORS.normal); });

      btn.onClick(() => {
        if (answered || !arrived || walkingOut) return;
        if (disabledChoices.has(choice)) return;

        const correct = choice === task.answer;

        // ── Scaffold-Retry: erste falsche Antwort öffnet Hilfsmittel + zweite Chance ──
        if (!correct && profile.scaffoldOnError && !scaffoldOffered) {
          scaffoldOffered = true;
          madeError = true;
          disabledChoices.add(choice);
          btn.color = k.rgb(...BTN_COLORS.wrong);
          btn.opacity = 0.55;
          k.play("answer-wrong", { volume: audioManager.get("answer-wrong").volume });
          k.shake(6);
          k.setData(STREAK_KEY, 0);
          ensureAidShown(true);
          showRetryHint();
          return;
        }

        answered = true;
        clearRetryHint();

        // Trank-Runde verbrauchen
        if (activePotionType && potionRoundsLeft > 0) {
          const newRounds = potionRoundsLeft - 1;
          k.setData(POTION_ROUNDS_KEY, newRounds);
          if (newRounds <= 0) k.setData(POTION_TYPE_KEY, null);
        }

        btn.color = k.rgb(...(correct ? BTN_COLORS.correct : BTN_COLORS.wrong));
        k.play("btn-click", { volume: audioManager.get("btn-click").volume });

        let newUnlock: string | null = null;

        if (correct) {
          const oldScore = score;
          const points = (isShiny && shinyTime > 0) ? 5 : 1;
          score += points;
          
          if (isShiny && points > 1) {
            k.play("unlock-fanfare", { volume: 0.3, detune: 500 });
          }

          // Spielstand SOFORT speichern, damit er beim Szenenwechsel sicher ist
          k.setData(SCORE_KEY, score);
          scoreTxt.text = `${score}`;

          k.play("answer-correct", { volume: audioManager.get("answer-correct").volume });
          confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 }, colors: ["#a064dc", "#ffdc32", "#50b450", "#ff5050", "#50c8ff"] });
          
          // Animation: Münzen/Waren fliegen zum Score
          let delay = 0;
          visualGroup.children.forEach((item: any) => {
            k.wait(delay, () => {
              // Welt-Position berechnen
              const startPos = visualGroup.pos.add(item.pos);
              const flyingItem = k.add([
                k.sprite(item.spriteName), // Nutze das neue benutzerdefinierte Feld
                k.pos(startPos),
                k.scale(item.scale),
                k.anchor("center"),
                k.z(100),
              ]);
              
              item.opacity = 0; // Original verstecken

              k.tween(flyingItem.pos, scoreIcon.pos, 0.6, (p) => flyingItem.pos = p, k.easings.easeInQuad).onEnd(() => {
                flyingItem.destroy();
                k.play("coin-collect", { volume: 0.1 });
                // Score-Zähler pulsieren lassen
                k.tween(1.2, 1.6, 0.1, (s) => scoreIcon.scale = k.vec2(s)).onEnd(() => {
                  k.tween(1.6, 1.2, 0.1, (s) => scoreIcon.scale = k.vec2(s));
                });
              });
            });
            delay += 0.05;
          });

          // Prüfe wie viele Monster durch den Punktesprung freigeschaltet wurden
          const count = checkMilestonesReached(oldScore, score);
          if (count > 0) {
            for(let i = 0; i < count; i++) {
              const allIds = assetManager.getAllMonsters().map((m) => m.id);
              const currentUnlocked = getUnlocked((key) => k.getData(key));
              const candidate = getNextUnlock(allIds, currentUnlocked);
              if (candidate) {
                currentUnlocked.push(candidate);
                saveUnlocked((key, val) => k.setData(key, val), currentUnlocked);
                newUnlock = candidate; // Zeige das zuletzt freigeschaltete
              }
            }
          }
          // Streak-Tracking
          const newStreak = (k.getData<number>(STREAK_KEY) ?? 0) + 1;
          const totalCorrect = (k.getData<number>(TOTAL_CORRECT_KEY) ?? 0) + 1;
          k.setData(STREAK_KEY, newStreak);
          k.setData(TOTAL_CORRECT_KEY, totalCorrect);

          if (newStreak === 3) {
            score += 3;
            k.setData(SCORE_KEY, score);
            scoreTxt.text = `${score}`;
            streakPeekMessage = "Saubere Leistung!\n3 richtige hintereinander!\nHier 3 Münzen extra! 💪";
          } else if (newStreak === 5) {
            if (!activePotionType) {
              const randPotion = POTION_DEFS[Math.floor(Math.random() * POTION_DEFS.length)];
              k.setData(POTION_TYPE_KEY, randPotion.type);
              k.setData(POTION_ROUNDS_KEY, POTION_ROUNDS);
              streakPeekMessage = `5 in Folge!\nHier ein ${randPotion.name} gratis! 🧪`;
            } else {
              score += 5;
              k.setData(SCORE_KEY, score);
              scoreTxt.text = `${score}`;
              streakPeekMessage = "5 in Folge! Unglaublich!\nHier 5 Münzen extra! 🤩";
            }
          } else if (newStreak > 5 && newStreak % 5 === 0) {
            score += 5;
            k.setData(SCORE_KEY, score);
            scoreTxt.text = `${score}`;
            streakPeekMessage = `${newStreak} in Folge!\nNicht zu stoppen! +5 Münzen! 🔥`;
          }
          if (!streakPeekMessage && CORRECT_MILESTONES[totalCorrect]) {
            streakPeekMessage = CORRECT_MILESTONES[totalCorrect];
          }
        } else {
          k.play("answer-wrong", { volume: audioManager.get("answer-wrong").volume });
          k.shake(12);
          k.setData(STREAK_KEY, 0);
          // Scaffolding: bei Fehler Hilfsmittel zwingend einblenden
          if (profile.scaffoldOnError) ensureAidShown(true);
        }

        // Diagnostik: Ergebnis je Station tracken (für Fading & Auto-Scaffold)
        recordResult(station.type, correct);

        // Walk-out nach kurzer Pause
        const isShinyBonus = correct && isShiny && shinyTime > 0;

        k.wait(0.8, () => {
          pendingFeedback = { correct, answer: task.answer, newUnlock, isShinyBonus };
          walkingOut = true;
          if (isLegendaryTeaser) {
            const farewells = [
              "Vielleicht sehen wir uns bald wieder...",
              "Du bist fast bereit für mich.",
            ];
            bubbleTxt.text = farewells[Math.floor(Math.random() * farewells.length)];
            bubble.opacity = 1;
            k.play("think-pop", { volume: audioManager.get("think-pop").volume });
          }

          // NEU: Legendary Teaser Silhouette beim Abschied langsam aufhellen
          if (isLegendaryTeaser && walkingOut) {
            // Berechne die Dauer des Walk-out basierend auf Distanz und Geschwindigkeit
            const walkOutDist = k.vec2(PRES_POS.x, PRES_POS.y).dist(k.vec2(DOOR.x, DOOR.y));
            const walkOutDuration = walkOutDist / walkSpeed;

            // Ziel ist die Aura-Farbe des Monsters
            const targetR = auraColor[0];
            const targetG = auraColor[1];
            const targetB = auraColor[2];

            k.tween(
              k.rgb(monster.color.r, monster.color.g, monster.color.b),
              k.rgb(targetR, targetG, targetB),
              walkOutDuration,
              (c) => { monster.color.r = c.r; monster.color.g = c.g; monster.color.b = c.b; },
              k.easings.linear
            );
          }
          arrived = false;
          monster.use(k.sprite(`${guestId}-north`));
          taskPanel.opacity = 0;
          questionTxt.opacity = 0;
          buttons.forEach(btn => (btn.opacity = 0));
          labels.forEach(l => (l.opacity = 0));
          if (timerGroup) {
            timerCoins.forEach(c => c.opacity = 0);
            if (timerLabel) timerLabel.opacity = 0;
          }
          visualGroup.removeAll(); // Entfernt Münzen/Waren vom Bildschirm
          destroyAid();
        });
      });

      buttons.push(btn);
      labels.push(label);
    });

    // ── Visuelle Hilfestellung (Münzen / Items) ───────────────────────────────
    const visualGroup = k.add([
      k.pos(k.width() / 2, 100), // Mittig unter dem oberen Rand
      k.z(20) // Ganz oben, damit nichts es verdeckt
    ]);

    function showTaskVisuals() {
      if (!task.visuals || task.visuals.length === 0) return;
      // Am Regal würden die Items die Antwort verraten, sobald die
      // Hundertertafel als Hilfsmittel sichtbar ist — dann nichts zeigen.
      if (aidHandle && station.type === "completion") return;
      const isMoneyTask = task.visuals[0].startsWith("coin");

      if (isMoneyTask) {
        visualGroup.pos = k.vec2(k.width() / 2, 80);
        const spacing = 50;
        const maxPerRow = 10;
        task.visuals.forEach((spriteId, i) => {
          k.wait(i * 0.08, () => {
            const row = Math.floor(i / maxPerRow);
            const col = i % maxPerRow;
            const xOffset = (col - (Math.min(task.visuals!.length, maxPerRow) - 1) / 2) * spacing;
            const yOffset = row * spacing;
            const item = visualGroup.add([
              k.sprite(spriteId), k.pos(xOffset, yOffset + 20),
              k.scale(0), k.anchor("center"), { spriteName: spriteId },
            ]);
            k.tween(0, coinScale(spriteId), 0.3, (s) => { item.scale = k.vec2(s); }, k.easings.easeOutBack);
            k.tween(item.pos.y, yOffset, 0.3, (y) => { item.pos.y = y; }, k.easings.easeOutBack);
            k.play("coin-collect", { volume: 0.05, detune: i * 100 });
          });
        });
        return;
      }

      // Items (Regal): adaptives Grid — passt sich der Anzahl an und bleibt oberhalb des Panels
      const count = task.visuals.length;
      const AVAIL_W = 740;  // canvas 800 minus Randpuffer
      const AVAIL_H = 285;  // y=5..290, Panel startet bei ca. y=300

      const cols = Math.max(1, Math.ceil(Math.sqrt(count * (AVAIL_W / AVAIL_H))));
      const rows = Math.ceil(count / cols);
      const cellH = Math.floor(AVAIL_H / rows);
      const cellW = Math.floor(AVAIL_W / cols);
      const scale = Math.min(1.2, Math.min(cellH, cellW) / 30);
      const delay = Math.min(0.05, 1.5 / count);

      // Gruppe so positionieren dass erste Zeile nahe am oberen Rand beginnt
      visualGroup.pos = k.vec2(k.width() / 2, cellH / 2 + 5);

      task.visuals.forEach((spriteId, i) => {
        k.wait(i * delay, () => {
          const row = Math.floor(i / cols);
          const col = i % cols;
          const itemsInRow = Math.min(count - row * cols, cols);
          const xOffset = (col - (itemsInRow - 1) / 2) * cellW;
          const yOffset = row * cellH;

          const item = visualGroup.add([
            k.sprite(spriteId), k.pos(xOffset, yOffset + 16),
            k.scale(0), k.anchor("center"), { spriteName: spriteId },
          ]);
          k.tween(0, scale, 0.25, (s) => { item.scale = k.vec2(s); }, k.easings.easeOutBack);
          k.tween(item.pos.y, yOffset, 0.25, (y) => { item.pos.y = y; }, k.easings.easeOutBack);
          if (i < 12) k.play("coin-collect", { volume: 0.04, detune: i * 80 });
        });
      });
    }

    // ── Start-Sequenz Logik ──────────────────────────────────────────────────
    k.wait(2, () => {
      // Wechsel vom "Gedanken" zum "Entschluss"
      const legendaryDecisions = ["Ich teste euch...", "Mal sehen, ob ihr würdig seid.", "Interessant hier.", "Meine Kraft ist unermesslich."];
      const decisions = (score === 1 && isShiny)
        ? ["Heute gibt es extra viele Punkte!"]
        : isLegendaryTeaser
        ? legendaryDecisions
        : (STATION_DECISIONS[station.type] || ["Ich schau mal!"]);
      bubbleTxt.text = decisions[Math.floor(Math.random() * decisions.length)];
      
      // Zweiter Sound beim Entschluss (leicht variiert)
      k.play("think-pop", { volume: audioManager.get("think-pop").volume, detune: 200 });
      
      k.wait(2, () => {
        sequenceActive = false; // Jetzt darf es laufen
        k.tween(1, 0, 0.5, (o) => bubble.opacity = o); // Blase ausfaden
      });
    });

    // ── Laufweg-Logik ────────────────────────────────────────────────────────
    const walkSpeed = 140;

    monster.onUpdate(() => {
      // Blase folgt dem Monster (solange sichtbar)
      bubble.pos = k.vec2(monster.pos.x, monster.pos.y - 60);
      bubbleTxt.opacity = bubble.opacity;

      // Aura pulsiert hinter dem Legendary
      if (aura) {
        aura.pos = k.vec2(monster.pos.x, monster.pos.y + (monster as any).yOffset);
        aura.opacity = 0.2 + Math.sin(k.time() * 4) * 0.15;
      }

      if (sequenceActive) return; // Warten an der Tür

      if (!arrived) {
        // State-Maschine für den Laufweg: Tür -> Station -> Präsentation -> Tür
        const target = walkingOut ? DOOR : (reachedStation ? PRES_POS : station.pos);
        monster.moveTo(target.x, target.y, walkSpeed);
        monster.flipX = target.x < monster.pos.x;
        monster.angle = Math.sin(k.time() * 12) * 10;

        if (monster.pos.dist(k.vec2(target.x, target.y)) < 6) {
          monster.angle = 0;

          if (walkingOut && pendingFeedback) {
            // Nur zurückfaden, wenn KEIN Shiny-Bonus erreicht wurde.
            // Bei Erfolg lassen wir die Alphadance-Musik für den Feedback-Screen weiterlaufen.
            if (!pendingFeedback.isShinyBonus && currentTrackId === "alphadance") {
              startGameBGM("bgm-game");
            }

            // Sicherheits-Check: Falls der Händler (oder Tutorial) bereits läuft, nichts tun
            if (merchantShown) return;

            // Einmaliges Tutorial nach dem 7. Gast (score ≥ 7)
            if (!merchantTutorialShown && score >= 7 && !isShiny && !pendingFeedback.newUnlock) {
              merchantShown = true;
              k.setData(MERCHANT_TUTORIAL_KEY, true);
              animateMerchantEntry(k, () => showMerchantTutorial(k, () => {
                showMerchantOverlay(k, score, (bought) => {
                  if (bought) {
                    k.setData(POTION_TYPE_KEY, bought.type);
                    k.setData(POTION_ROUNDS_KEY, POTION_ROUNDS);
                  }
                  k.go("feedback", pendingFeedback!);
                });
              }));
              return;
            }

            // Ash-Streak-Peek (verdiente Belohnung anzeigen)
            if (streakPeekMessage && !pendingFeedback.newUnlock) {
              merchantShown = true;
              const msg = streakPeekMessage;
              streakPeekMessage = null;
              showAshStreakPeek(k, msg, () => k.go("feedback", pendingFeedback!));
              return;
            }

            // 20% Chance: Ash Ketchup taucht auf — nicht bei Shinys, nicht wenn Trank aktiv
            if (!isShiny && !activePotionType && !pendingFeedback.newUnlock && Math.random() < 0.08) {
              merchantShown = true;
              animateMerchantEntry(k, () => showMerchantOverlay(k, score, (bought) => {
                if (bought) {
                  k.setData(POTION_TYPE_KEY, bought.type);
                  k.setData(POTION_ROUNDS_KEY, POTION_ROUNDS);
                }
                k.go("feedback", pendingFeedback!);
              }));
            } else {
              merchantShown = true;
              k.go("feedback", pendingFeedback);
            }
            return;
          }

          // Wenn Station erreicht, direkt zur Präsentations-Position "spawnen" mit Hüpfer
          if (!reachedStation && !walkingOut) {
            reachedStation = true;
            monster.pos = k.vec2(PRES_POS.x, PRES_POS.y);
            
            // Zufällige Wahl zwischen pj1 und pj2 für mehr Abwechslung
            const jumpSoundId = Math.random() < 0.5 ? "pj1" : "pj2";
            k.play(jumpSoundId, { volume: audioManager.get(jumpSoundId as any).volume });
            k.tween(0, -40, 0.15, (v) => (monster as any).yOffset = v, k.easings.easeOutQuad).onEnd(() => {
              k.tween(-40, 0, 0.15, (v) => (monster as any).yOffset = v, k.easings.easeInQuad);
            });
          }

          // Angekommen an Endposition (PRES_POS) — UI einblenden
          arrived = true;
          monster.scale = k.vec2(3.5);
          monster.flipX = false;
          
          // NEU: Sound bei Ankunft
          k.play("arrival-pop", { volume: audioManager.get("arrival-pop").volume });

          // UI einblenden mit Animationen
          k.tween(0, 0.95, 0.3, (v) => (taskPanel.opacity = v));
          k.tween(0, 1, 0.3, (v) => (questionTxt.opacity = v));
          
          if (isShiny && timerGroup) {
            if (timerLabel) {
              timerLabel.opacity = 0;
              k.tween(0, 1, 0.4, (v) => timerLabel.opacity = v);
            }
            timerCoins.forEach((c, i) => {
              k.wait(i * 0.07, () => {
                c.opacity = 1;
                k.tween(0, 2.0, 0.35, (s) => c.scale = k.vec2(s), k.easings.easeOutBack);
              });
            });
            k.onUpdate(() => {
              if (arrived && !answered && isShiny) {
                shinyTime -= k.dt();
                const visibleCount = Math.ceil(k.clamp(shinyTime / 15, 0, 1) * 5);
                timerCoins.forEach((c, i) => {
                  if (i >= visibleCount && c.opacity > 0) {
                    // Münze verschwindet mit kleinem Effekt
                    k.tween(c.scale.x, 0, 0.2, (s) => c.scale = k.vec2(s));
                    c.opacity = 0;
                  }
                });
              }
            });
          }

          // Für Rechendreieck ist das Visual die Aufgabe selbst — immer zeigen
          const aidRequired = station.type === "countTriangle" || station.type === "numberPyramid";
          ensureAidShown(aidRequired);
          showTaskVisuals();

          // Buttons nacheinander einfedern lassen
          buttons.forEach((btn, i) => {
            k.wait(i * 0.1, () => {
              k.tween(0, 1, 0.2, (v) => (btn.opacity = v));
              k.tween(0, 1, 0.4, (v) => (btn.scale = k.vec2(v)), k.easings.easeOutBack);
              if (labels[i]) {
                k.tween(0, 1, 0.2, (v) => (labels[i].opacity = v));
              }
            });
          });
        }
      } else {
        // Sanftes Schweben an der Präsentations-Position
        monster.pos.y = PRES_POS.y + Math.sin(k.time() * 2) * 6 + (monster as any).yOffset;
      }
    });

    // ── Zurück-Button ────────────────────────────────────────────────────────
    const back = k.add([
      k.text("← Menü", { size: 18 }),
      k.pos(16, k.height() - 32),
      k.color(200, 200, 200),
      k.area(),
    ]);
    back.onClick(() => {
      if (gameMusicHandle) {
        audioManager.fadeOut(k, gameMusicHandle, 0.8).onEnd(() => {
          gameMusicHandle.stop();
          gameMusicHandle = null;
          currentTrackId = null;
          k.go("menu");
        });
      } else {
        k.go("menu");
      }
    });
  });
}

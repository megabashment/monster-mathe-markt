import type kaplay from "kaplay";
import type { StationType, TaskType } from "../types/math";
import {
  ALL_STATIONS,
  PROFILE_PRESETS,
  STATION_LABELS,
  type CountTriangleMode,
  type DifficultyProfile,
  type Grade,
  type Tier,
} from "../logic/difficulty/DifficultyProfile";
import { loadProfile, saveProfile } from "../logic/difficulty/ProfileStore";
import { resetTracker } from "../logic/diagnostics/ErrorTracker";
import { UNLOCK_THRESHOLDS, getUnlocked, saveUnlocked } from "../logic/RewardEngine";
import { assetManager } from "../logic/AssetManager";

const TAG = "admin-overlay";
const OPS: TaskType[] = ["addition", "subtraction", "multiplication", "division"];

const COLOR_ACTIVE:   [number,number,number] = [80,  160,  80];
const COLOR_INACTIVE: [number,number,number] = [70,   50, 110];
const COLOR_OFF:      [number,number,number] = [150,  70,  70];
const COLOR_PRESET:   [number,number,number] = [50,   90, 150];

let isOpen = false;

export function isAdminOpen(): boolean { return isOpen; }

export function openAdminOverlay(
  k: ReturnType<typeof kaplay>,
  onClose?: () => void,
): void {
  if (isOpen) return;
  isOpen = true;

  let profile: DifficultyProfile = { ...loadProfile() };

  const W = k.width(), H = k.height();
  const root = k.add([k.pos(0, 0), k.z(500), k.fixed(), TAG]);
  root.add([k.rect(W, H), k.color(0, 0, 0), k.opacity(0.78), k.z(500)]);

  const panelW = 660, panelH = 660;
  const px = W / 2, py = H / 2;
  root.add([
    k.rect(panelW, panelH, { radius: 18 }),
    k.pos(px, py),
    k.anchor("center"),
    k.color(40, 25, 70),
    k.outline(3, k.rgb(170, 130, 255)),
    k.z(501),
  ]);
  root.add([
    k.text("Admin – Schwierigkeitsprofil", { size: 22 }),
    k.pos(px, py - panelH / 2 + 26),
    k.anchor("center"),
    k.color(255, 220, 100),
    k.z(502),
  ]);

  const fields: any[] = [];
  let refreshPending = false;

  function refresh() {
    if (refreshPending) return;
    refreshPending = true;
    k.wait(0, () => {
      refreshPending = false;
      fields.forEach((f) => { try { f.destroy(); } catch { /* already destroyed */ } });
      fields.length = 0;
      drawFields();
    });
  }

  function commit(patch: Partial<DifficultyProfile>) {
    profile = { ...profile, ...patch };
    saveProfile(profile);
    refresh();
  }

  // ── Hilfsfunktion: einfacher Toggle-Button ──────────────────────────────────
  function makeBtn(
    label: string,
    x: number, y: number,
    w: number, h: number,
    active: boolean,
    color?: [number,number,number],
    fontSize = 11,
  ) {
    const c = color ?? (active ? COLOR_ACTIVE : COLOR_INACTIVE);
    const btn: any = root.add([
      k.rect(w, h, { radius: 6 }),
      k.pos(x, y),
      k.color(...c),
      k.area(),
      k.outline(1, k.rgb(180, 150, 220)),
      k.z(502),
    ]);
    btn.add([
      k.text(label, { size: fontSize }),
      k.pos(w / 2, h / 2),
      k.anchor("center"),
      k.color(255, 255, 255),
    ]);
    fields.push(btn);
    return btn;
  }

  function label(txt: string, x: number, y: number, size = 14, col: [number,number,number] = [255,255,255]) {
    fields.push(root.add([k.text(txt, { size }), k.pos(x, y), k.color(...col), k.z(502)]));
  }

  // ── drawFields ───────────────────────────────────────────────────────────────
  function drawFields() {
    const left = px - panelW / 2 + 24;
    let cy = py - panelH / 2 + 58;
    const lineH = 32;

    // ── Preset-Dropdown (2-Zeilen-Grid, 3 Spalten) ───────────────────────────
    label("Presets:", left, cy);
    const presetKeys = Object.keys(PROFILE_PRESETS);
    const PCOLS = 3;
    const PBW = 180, PBH = 24, PBG = 8;
    const gridLeft = left + 90;
    presetKeys.forEach((key, i) => {
      const col  = i % PCOLS;
      const row  = Math.floor(i / PCOLS);
      const bx   = gridLeft + col * (PBW + PBG);
      const by   = cy - 4 + row * (PBH + 6);
      const isActive = JSON.stringify(profile) === JSON.stringify(PROFILE_PRESETS[key]);
      const nice = key
        .replace("klasse", "Kl. ")
        .replace("-", " · ");
      const btn = makeBtn(nice, bx, by, PBW, PBH, isActive, isActive ? COLOR_ACTIVE : COLOR_PRESET);
      btn.onClick(() => commit({ ...PROFILE_PRESETS[key] }));
    });
    const presetRows = Math.ceil(presetKeys.length / PCOLS);
    cy += presetRows * (PBH + 6) + 6;

    // ── Separator ─────────────────────────────────────────────────────────────
    fields.push(root.add([
      k.rect(panelW - 48, 1),
      k.pos(left, cy),
      k.color(120, 90, 180),
      k.opacity(0.5),
      k.z(502),
    ]));
    cy += 10;

    // ── Klasse + Tier ─────────────────────────────────────────────────────────
    label(`Klasse: ${profile.grade}`, left, cy);
    ([2, 3, 4] as Grade[]).forEach((g, i) => {
      const btn = makeBtn(`${g}`, left + 110 + i * 40, cy - 4, 34, 24, profile.grade === g);
      btn.onClick(() => commit({ grade: g }));
    });

    label(`Tier: ${profile.tier}`, left + 280, cy);
    ([1, 2, 3] as Tier[]).forEach((t, i) => {
      const btn = makeBtn(`${t}`, left + 340 + i * 40, cy - 4, 34, 24, profile.tier === t);
      btn.onClick(() => commit({ tier: t }));
    });
    cy += lineH;

    // ── Zahlenraum ────────────────────────────────────────────────────────────
    label(`Zahlenraum: 0–${profile.range.max}`, left, cy);
    ([20, 100, 1000, 10000] as number[]).forEach((m, i) => {
      const btn = makeBtn(`${m}`, left + 200 + i * 64, cy - 4, 58, 24, profile.range.max === m);
      btn.onClick(() => commit({ range: { min: 0, max: m } }));
    });
    cy += lineH;

    // ── Rechenarten ───────────────────────────────────────────────────────────
    label("Rechenarten:", left, cy);
    let bx = left + 130;
    for (const op of OPS) {
      const on = profile.operations.includes(op);
      const btn = makeBtn(op.slice(0, 3), bx, cy - 4, 76, 24, on);
      btn.onClick(() => {
        const next = on
          ? profile.operations.filter((o) => o !== op)
          : [...profile.operations, op];
        if (next.length > 0) commit({ operations: next });
      });
      bx += 82;
    }
    cy += lineH;

    // ── Bool-Toggles ──────────────────────────────────────────────────────────
    const toggles: Array<[keyof DifficultyProfile, string]> = [
      ["allowCarry",    "Zehnerübergang"],
      ["visualSupport", "Hilfsmittel sichtbar"],
      ["scaffoldOnError","Hilfen bei Fehler"],
      ["fadingEnabled", "Fading aktiv"],
    ];
    // 2 Spalten à 2 Toggles
    const TCOL_W = (panelW - 48) / 2;
    toggles.forEach(([key, lbl], i) => {
      const tx = left + (i % 2) * TCOL_W;
      const ty = cy + Math.floor(i / 2) * 30;
      const on = profile[key] as boolean;
      label(lbl, tx, ty, 12);
      const btn = makeBtn(on ? "AN" : "AUS", tx + 190, ty - 4, 56, 24, on,
        on ? COLOR_ACTIVE : COLOR_OFF);
      btn.onClick(() => commit({ [key]: !on } as Partial<DifficultyProfile>));
    });
    cy += Math.ceil(toggles.length / 2) * 30 + 4;

    // ── Stationen ─────────────────────────────────────────────────────────────
    label("Stationen:", left, cy);
    cy += 22;
    let col = 0;
    for (const s of ALL_STATIONS) {
      const on = profile.activeModules.includes(s);
      const btn: any = root.add([
        k.rect(190, 22, { radius: 6 }),
        k.pos(left + col * 206, cy),
        k.color(...(on ? COLOR_ACTIVE : COLOR_INACTIVE)),
        k.area(),
        k.z(502),
      ]);
      btn.add([
        k.text(`${on ? "✓" : "○"} ${STATION_LABELS[s]}`, { size: 11 }),
        k.pos(8, 11), k.anchor("left"), k.color(255, 255, 255),
      ]);
      btn.onClick(() => {
        const next = on
          ? profile.activeModules.filter((x) => x !== s)
          : [...profile.activeModules, s];
        if (next.length > 0) commit({ activeModules: next as StationType[] });
      });
      fields.push(btn);
      col = (col + 1) % 3;
      if (col === 0) cy += 26;
    }
    if (col !== 0) cy += 26;
    cy += 6;

    // ── Rechendreieck-Modus ───────────────────────────────────────────────────
    label("Rechendreieck:", left, cy, 13);
    const TRIANGLE_MODES: CountTriangleMode[] = ["addition", "subtraction", "mixed"];
    const TRIANGLE_LABELS: Record<CountTriangleMode, string> = {
      addition: "Addition", subtraction: "Subtr.", mixed: "Gemischt",
    };
    let tbx = left + 150;
    for (const m of TRIANGLE_MODES) {
      const btn = makeBtn(TRIANGLE_LABELS[m], tbx, cy - 4, 88, 24, profile.countTriangleMode === m);
      btn.onClick(() => commit({ countTriangleMode: m }));
      tbx += 94;
    }

    // ── Separator ─────────────────────────────────────────────────────────────
    fields.push(root.add([
      k.rect(panelW - 48, 1),
      k.pos(left, cy),
      k.color(220, 80, 80),
      k.opacity(0.5),
      k.z(502),
    ]));
    cy += 10;

    // ── Cheat-Ecke ────────────────────────────────────────────────────────────
    label("⚡ Cheats", left, cy, 14, [255, 120, 120]);
    cy += 24;

    // Coins
    const currentCoins = k.getData<number>("mmm_score") ?? 0;
    label(`Coins (aktuell: ${currentCoins})`, left, cy, 12, [200, 200, 200]);

    const COIN_STEPS = [0, 10, 50, 100, 200, 500, 1000, 1263];
    let cbx = left + 230;
    for (const amount of COIN_STEPS) {
      const btn = makeBtn(`${amount}`, cbx, cy - 4, 46, 22, currentCoins === amount,
        currentCoins === amount ? [160, 100, 20] : [100, 60, 20], 11);
      btn.onClick(() => {
        k.setData("mmm_score", amount);
        refresh();
      });
      cbx += 50;
    }
    cy += 30;

    // Monster-Unlocks
    const allMonsterIds = assetManager.getAllMonsters().map((m) => m.id);
    const totalMonsters = allMonsterIds.length;
    const currentUnlocked = getUnlocked((key) => k.getData(key));
    const currentCount = currentUnlocked.length;

    label(`Monster freigeschaltet (${currentCount}/${totalMonsters})`, left, cy, 12, [200, 200, 200]);

    const monsterSteps = [1, 3, 6, 10, 15, 20, totalMonsters];
    let mbx = left + 310;
    for (const count of monsterSteps) {
      if (count > totalMonsters) continue;
      const btn = makeBtn(`${count}`, mbx, cy - 4, 42, 22, currentCount === count,
        currentCount === count ? [20, 100, 140] : [20, 60, 100], 11);
      btn.onClick(() => {
        // Unlock monsters in order according to UNLOCK_THRESHOLDS
        // Index 0 = blubbo (starter), indices 1..n map to UNLOCK_THRESHOLDS[0..n-1]
        const toUnlock = allMonsterIds.slice(0, count);
        saveUnlocked((key, val) => k.setData(key, val), toUnlock);
        // Set score to the threshold that matches the last unlock
        const scoreForCount = count <= 1 ? 0 : UNLOCK_THRESHOLDS[count - 2];
        k.setData("mmm_score", scoreForCount);
        refresh();
      });
      mbx += 46;
    }
    cy += 6;

    // ── Footer-Buttons ────────────────────────────────────────────────────────
    const footerY = py + panelH / 2 - 28;

    const resetBtn = makeBtn("Fehler-Tracker leeren", px - 140, footerY - 15, 200, 30,
      false, COLOR_OFF, 12);
    resetBtn.onClick(() => resetTracker());

    const closeBtn = makeBtn("Schließen (ESC)", px + 90, footerY - 15, 160, 30,
      true, COLOR_ACTIVE, 12);
    closeBtn.onClick(() => close());
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    refreshPending = true;
    k.destroyAll(TAG);
    onClose?.();
  }

  drawFields();

  const escHandle = k.onKeyPress("escape", () => close());
  root.onDestroy(() => {
    isOpen = false;
    escHandle.cancel();
  });
}

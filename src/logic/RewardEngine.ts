/**
 * RewardEngine.ts
 * Verwaltet den Fortschritt und die Meilensteine für das Freischalten neuer Monster.
 */

const UNLOCKED_KEY = "mmm_unlocked_monsters";

// Legacy-Export für Kompatibilität mit bestehenden Dateien
export const REWARD_EVERY = 5;

// Kumulative Schwellenwerte für alle 34 Monster (33 Unlocks, Blubbo = Starter)
// Ramp-Up 1–9 Min pro Schritt, dann flat 10 Min; alle 4 Legendaries ans Ende.
// ── Reguläre 29 ──────────── bis 733 (~4h10m)
// ── Legendaries 4 ────────── bis 1263 (~7h11m)
export const UNLOCK_THRESHOLDS = [
  3,    //  2: Zappy        (+1min)
  9,    //  3: Bubsy        (+2min)
  18,   //  4: Flarky       (+3min)
  30,   //  5: Mossy        (+4min)
  45,   //  6: Crysto       (+5min)
  63,   //  7: Stinki       (+6min)
  84,   //  8: Mangoman     (+7min)
  107,  //  9: Mooni        (+8min)
  133,  // 10: Flambo       (+9min)
  163,  // 11: Weedy        (+10min) ← Plateau
  193,  // 12: Frosty       (+10min)
  223,  // 13: Ripple       (+10min)
  253,  // 14: Corali       (+10min)
  283,  // 15: Sprouty      (+10min)
  313,  // 16: Aquali       (+10min)
  343,  // 17: Embry        (+10min)
  373,  // 18: Scorchi      (+10min)
  403,  // 19: Volky        (+10min)
  433,  // 20: Fernly       (+10min)
  463,  // 21: Clovey       (+10min)
  493,  // 22: Flambaro     (+10min)
  523,  // 23: Chompy       (+10min)
  553,  // 24: Foxy         (+10min)
  583,  // 25: Flamara      (+10min)
  613,  // 26: Gengar       (+10min)
  643,  // 27: Zaptos       (+10min)
  673,  // 28: Mewtwo       (+10min)
  703,  // 29: Alakazam     (+10min)
  733,  // 30: Porygon      (+10min)
  809,  // 31: Tidaros ⚡   (+26min) ── LEGENDARY
  909,  // 32: Pyragon ⚡   (+34min)
  1058, // 33: Sylvara ⚡   (+51min)
  1263, // 34: Drako ⚡     (+70min)
];

/**
 * Prüft, ob der aktuelle Score genau einen Freischalt-Schwellenwert erreicht hat.
 */
export function checkMilestonesReached(oldScore: number, newScore: number): number {
  // Zählt, wie viele Schwellenwerte zwischen dem alten und neuen Punktestand überschritten wurden
  return UNLOCK_THRESHOLDS.filter(t => t > oldScore && t <= newScore).length;
}

/**
 * Holt die Liste der bereits freigeschalteten Monster-IDs.
 */
export function getUnlocked(getData: (key: string) => any): string[] {
  const data = getData(UNLOCKED_KEY);
  return data || ["blubbo"]; // Blubbo ist der Standard-Starter
}

/**
 * Gibt die Anzahl der aktuell freigeschalteten Monster zurück.
 */
export function getUnlockedCount(getData: (key: string) => any): number {
  return getUnlocked(getData).length;
}

/**
 * Speichert die neue Liste der freigeschalteten Monster.
 */
export function saveUnlocked(setData: (key: string, val: any) => void, unlocked: string[]): void {
  setData(UNLOCKED_KEY, unlocked);
}

/**
 * Findet das nächste noch nicht freigeschaltete Monster aus dem Pool.
 */
export function getNextUnlock(allIds: string[], currentUnlocked: string[]): string | null {
  const locked = allIds.filter((id) => !currentUnlocked.includes(id));
  return locked.length > 0 ? locked[0] : null;
}

/**
 * Berechnet den Fortschritt zum nächsten Meilenstein.
 */
export function getProgress(score: number): { current: number; start: number; target: number } | null {
  const nextThreshold = UNLOCK_THRESHOLDS.find(t => t > score);
  if (!nextThreshold) return null;

  const idx = UNLOCK_THRESHOLDS.indexOf(nextThreshold);
  const startThreshold = idx === 0 ? 0 : UNLOCK_THRESHOLDS[idx - 1];

  return { current: score, start: startThreshold, target: nextThreshold };
}
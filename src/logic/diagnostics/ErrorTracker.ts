import type { StationType } from "../../types/math";

const STORAGE_KEY = "mmm_error_tracker_v1";

interface StationStats {
  errors: number;       // aufeinanderfolgende Fehler an dieser Station
  successStreak: number; // aufeinanderfolgende richtige Antworten
  totalErrors: number;
  totalCorrect: number;
}

type State = Record<StationType, StationStats>;

function emptyStats(): StationStats {
  return { errors: 0, successStreak: 0, totalErrors: 0, totalCorrect: 0 };
}

let cache: State | null = null;

function load(): State {
  if (cache) return cache;
  if (typeof localStorage === "undefined") {
    cache = {} as State;
    return cache;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    cache = raw ? (JSON.parse(raw) as State) : ({} as State);
  } catch {
    cache = {} as State;
  }
  return cache;
}

function persist(): void {
  if (typeof localStorage === "undefined" || !cache) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
}

function statsFor(station: StationType): StationStats {
  const state = load();
  if (!state[station]) state[station] = emptyStats();
  return state[station];
}

export function recordResult(station: StationType, correct: boolean): StationStats {
  const stats = statsFor(station);
  if (correct) {
    stats.errors = 0;
    stats.successStreak += 1;
    stats.totalCorrect += 1;
  } else {
    stats.errors += 1;
    stats.successStreak = 0;
    stats.totalErrors += 1;
  }
  persist();
  return stats;
}

export function getStats(station: StationType): StationStats {
  return { ...statsFor(station) };
}

/**
 * Soll Hilfsmittel automatisch eingeblendet werden?
 * - Bei eingeschalteten Hilfen (visualSupport): immer.
 * - Bei abgeschalteten Hilfen + scaffoldOnError: ab 1 Fehler (Kl. 2), ab 2 Fehlern (Kl. 3+).
 */
export function shouldShowAid(
  station: StationType,
  visualSupport: boolean,
  scaffoldOnError: boolean,
  grade: number = 3,
): boolean {
  if (visualSupport) return true;
  if (!scaffoldOnError) return false;
  const threshold = grade <= 2 ? 1 : 2;
  return statsFor(station).errors >= threshold;
}

/**
 * Fading-Heuristik: Wenn das Kind 5 richtige in Folge an der Station hat,
 * darf das Hilfsmittel als optional markiert werden (nicht zwingend einblenden).
 */
export function isReadyForFading(station: StationType): boolean {
  return statsFor(station).successStreak >= 5;
}

export function resetTracker(): void {
  cache = {} as State;
  persist();
}

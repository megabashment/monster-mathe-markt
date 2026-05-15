import {
  DEFAULT_PROFILE,
  type DifficultyProfile,
} from "./DifficultyProfile";

const STORAGE_KEY = "mmm_difficulty_profile_v1";

type Listener = (profile: DifficultyProfile) => void;
const listeners = new Set<Listener>();
let cached: DifficultyProfile | null = null;

function safeParse(raw: string | null): DifficultyProfile | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<DifficultyProfile>;
    if (
      typeof parsed?.grade === "number" &&
      typeof parsed?.tier === "number" &&
      parsed?.range && Array.isArray(parsed.operations) && Array.isArray(parsed.activeModules)
    ) {
      return { ...DEFAULT_PROFILE, ...parsed } as DifficultyProfile;
    }
  } catch {
    /* fall through */
  }
  return null;
}

export function loadProfile(): DifficultyProfile {
  if (cached) return cached;
  const stored = typeof localStorage !== "undefined" ? safeParse(localStorage.getItem(STORAGE_KEY)) : null;
  cached = stored ?? { ...DEFAULT_PROFILE };
  return cached;
}

export function saveProfile(profile: DifficultyProfile): void {
  cached = { ...profile };
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
  }
  for (const cb of listeners) cb(cached);
}

export function updateProfile(patch: Partial<DifficultyProfile>): DifficultyProfile {
  const next = { ...loadProfile(), ...patch };
  saveProfile(next);
  return next;
}

export function resetProfile(): DifficultyProfile {
  saveProfile({ ...DEFAULT_PROFILE });
  return loadProfile();
}

export function onProfileChange(cb: Listener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

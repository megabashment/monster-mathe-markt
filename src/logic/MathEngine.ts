import type { MathTask, StationType, TaskType } from "../types/math";
import type { DifficultyProfile } from "./difficulty/DifficultyProfile";
import { loadProfile } from "./difficulty/ProfileStore";
import { generateMoneyTask } from "./math/generators/money";
import { generateCompletionTask } from "./math/generators/completion";
import { generateOperationsTask } from "./math/generators/operations";
import { generateDiscoveryPacketTask } from "./math/generators/discoveryPacket";
import { generateNumberPyramidTask } from "./math/generators/numberPyramid";
import { generateCountTriangleTask } from "./math/generators/countTriangle";

export interface GenerateOptions {
  profile?: DifficultyProfile;
  operationHint?: TaskType | null;
}

/**
 * Generiert eine Aufgabe für die gewählte Station, gesteuert durch das Profil.
 * Profile wird aus dem Store geladen, falls keines übergeben wurde.
 */
export function generateTask(
  station: StationType,
  options: GenerateOptions = {},
): MathTask {
  const profile = options.profile ?? loadProfile();
  const hint = options.operationHint ?? undefined;

  switch (station) {
    case "money":           return generateMoneyTask(profile);
    case "completion":      return generateCompletionTask(profile);
    case "operations":      return generateOperationsTask(profile, hint);
    case "discoveryPacket": return generateDiscoveryPacketTask(profile);
    case "numberPyramid":   return generateNumberPyramidTask(profile);
    case "countTriangle":   return generateCountTriangleTask(profile);
  }
}

/**
 * Welche Stationen sind im aktuellen Profil aktiv?
 */
export function getActiveStations(profile?: DifficultyProfile): StationType[] {
  return (profile ?? loadProfile()).activeModules;
}

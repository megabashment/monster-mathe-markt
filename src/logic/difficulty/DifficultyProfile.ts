import type { StationType, TaskType } from "../../types/math";

export type Grade = 2 | 3 | 4;
export type Tier = 1 | 2 | 3;

export type CountTriangleMode = "addition" | "subtraction" | "mixed";

export interface DifficultyProfile {
  grade: Grade;
  tier: Tier;
  range: { min: number; max: number };
  operations: TaskType[];
  allowCarry: boolean;            // Zehnerübergang erlauben
  visualSupport: boolean;         // Hilfsmittel grundsätzlich sichtbar?
  fadingEnabled: boolean;         // Hilfsmittel sukzessive ausblenden?
  scaffoldOnError: boolean;       // Bei Fehler Hilfsmittel automatisch einblenden?
  activeModules: StationType[];   // Welche Stationen sind freigeschaltet?
  countTriangleMode: CountTriangleMode; // Addition (Summe gesucht) / Subtraktion (Summand gesucht) / Gemischt
}

export const ALL_STATIONS: StationType[] = [
  "money",
  "completion",
  "operations",
  "discoveryPacket",
  "numberPyramid",
  "countTriangle",
];

export const STATION_LABELS: Record<StationType, string> = {
  money:           "Kasse",
  completion:      "Regal",
  operations:      "Mülltonne",
  discoveryPacket: "Forschertisch (Päckchen)",
  numberPyramid:   "Zahlenmauer",
  countTriangle:   "Rechendreieck",
};

export const PROFILE_PRESETS: Record<string, DifficultyProfile> = {
  "klasse2-einstieg": {
    grade: 2, tier: 1,
    range: { min: 0, max: 20 },
    operations: ["addition", "subtraction"],
    allowCarry: false,
    visualSupport: true,
    fadingEnabled: true,
    scaffoldOnError: true,
    activeModules: ["money", "completion", "operations"],
    countTriangleMode: "addition",
  },
  "klasse2-aufbau": {
    grade: 2, tier: 2,
    range: { min: 0, max: 100 },
    operations: ["addition", "subtraction", "multiplication"],
    allowCarry: true,
    visualSupport: true,
    fadingEnabled: true,
    scaffoldOnError: true,
    activeModules: ["money", "completion", "operations", "discoveryPacket"],
    countTriangleMode: "addition",
  },
  "klasse2-stark": {
    grade: 2, tier: 3,
    range: { min: 0, max: 100 },
    operations: ["addition", "subtraction", "multiplication"],
    allowCarry: true,
    visualSupport: true,
    fadingEnabled: true,
    scaffoldOnError: true,
    activeModules: ALL_STATIONS,
    countTriangleMode: "mixed",
  },
  "klasse3-einstieg": {
    grade: 3, tier: 1,
    range: { min: 0, max: 1000 },
    operations: ["addition", "subtraction", "multiplication"],
    allowCarry: true,
    visualSupport: true,
    fadingEnabled: true,
    scaffoldOnError: true,
    activeModules: ["money", "completion", "operations", "discoveryPacket"],
    countTriangleMode: "mixed",
  },
  "klasse3-aufbau": {
    grade: 3, tier: 2,
    range: { min: 0, max: 1000 },
    operations: ["addition", "subtraction", "multiplication", "division"],
    allowCarry: true,
    visualSupport: true,
    fadingEnabled: true,
    scaffoldOnError: true,
    activeModules: ALL_STATIONS,
    countTriangleMode: "mixed",
  },
  "klasse3-stark": {
    grade: 3, tier: 3,
    range: { min: 0, max: 1000 },
    operations: ["addition", "subtraction", "multiplication", "division"],
    allowCarry: true,
    visualSupport: true,
    fadingEnabled: true,
    scaffoldOnError: true,
    activeModules: ALL_STATIONS,
    countTriangleMode: "mixed",
  },
  "klasse4-einstieg": {
    grade: 4, tier: 1,
    range: { min: 0, max: 10000 },
    operations: ["addition", "subtraction", "multiplication", "division"],
    allowCarry: true,
    visualSupport: true,
    fadingEnabled: true,
    scaffoldOnError: true,
    activeModules: ALL_STATIONS,
    countTriangleMode: "mixed",
  },
  "klasse4-aufbau": {
    grade: 4, tier: 2,
    range: { min: 0, max: 10000 },
    operations: ["addition", "subtraction", "multiplication", "division"],
    allowCarry: true,
    visualSupport: true,
    fadingEnabled: true,
    scaffoldOnError: true,
    activeModules: ALL_STATIONS,
    countTriangleMode: "mixed",
  },
  "klasse4-stark": {
    grade: 4, tier: 3,
    range: { min: 0, max: 100000 },
    operations: ["addition", "subtraction", "multiplication", "division"],
    allowCarry: true,
    visualSupport: true,
    fadingEnabled: true,
    scaffoldOnError: true,
    activeModules: ALL_STATIONS,
    countTriangleMode: "mixed",
  },
};

export const DEFAULT_PROFILE: DifficultyProfile = PROFILE_PRESETS["klasse2-aufbau"];

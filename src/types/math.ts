export type TaskType = "addition" | "subtraction" | "multiplication" | "division";
export type PotionType = TaskType;

export type StationType =
  | "money"            // Kasse — Geld zählen
  | "completion"       // Regal — Ergänzen (was: "filling")
  | "operations"       // Mülltonne — Kernaufgaben (was: "arithmetic")
  | "discoveryPacket"  // Forschertisch — Schöne Päckchen (AB III)
  | "numberPyramid"    // Lager-Stapel — Zahlenmauer (AB III)
  | "countTriangle";   // Tresor — Rechendreieck (AB III)

export type CompetenceArea = "AB1" | "AB2" | "AB3";

export type VisualAidId =
  | "hundredField"       // 100er-Tafel
  | "dienesBlocks"       // Zehnerstangen + Einerwürfel
  | "stepLadder"         // Schritt-für-Schritt bei Zehnerübergang
  | "coinTray"           // Klickbare Münzen-Auslage
  | "dotArray"           // Punktefeld für Multiplikation/Division
  | "pyramidBlocks"      // Zahlenmauer-Visualisierung
  | "completionBlocks"   // Progressive Blöcke für Ergänzungsaufgaben
  | "countTriangleBlocks" // Dreieck-Hilfe für Rechendreiecke (alt)
  | "countTriangleVisualization"; // Klassisches Rechendreick (PDF-Vorbild)

export interface MathTask {
  question: string;
  answer: number;
  choices: number[];
  type: TaskType;
  station: StationType;
  competence: CompetenceArea;
  visuals?: string[];                 // Sprite-IDs für statische Visualisierung
  visualAid?: VisualAidId;            // Welches Hilfsmittel bei Bedarf einblenden
  meta?: Record<string, unknown>;     // Generator-spezifische Daten (z.B. Päckchen-Reihen)
}

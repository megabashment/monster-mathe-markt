export type SoundId =
  | "btn-click"
  | "btn-hover"
  | "answer-correct"
  | "answer-wrong"
  | "coin-collect"
  | "game-start"
  | "door-bell"
  | "arrival-pop"
  | "trash-impact"
  | "shelf-place"
  | "unlock-fanfare"
  | "bgm-menu"
  | "bgm-game"
  | "think-pop"
  | "monster-jump"
  | "pj1"
  | "pj2"
  | "alphadance";

export interface SoundDef {
  id: SoundId;
  path: string;
  volume?: number;
}

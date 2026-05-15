import type { MathTask } from "../../../types/math";
import type { DifficultyProfile } from "../../difficulty/DifficultyProfile";
import { hasCarry, rnd, shuffle, wrongChoices } from "../util";

/**
 * Rechendreieck nach PDF-Vorbild:
 *
 *   [c0]---[s0]---[c1]
 *      \         /
 *      [s2]   [s1]
 *        \   /
 *        [c2]
 *
 * Addition:    Eine Schenkel-Summe gesucht  (? = cA + cB)
 * Subtraktion: Eine Ecke gesucht            (cA + ? = s, also ? = s - cA)
 */
export function generateCountTriangleTask(profile: DifficultyProfile): MathTask {
  // Zahlenraum aus Profil, sinnvoll auf max 50 begrenzt (Dreieck-Format)
  const cap = Math.min(profile.range.max, 50);
  const floor = Math.max(profile.range.min, 1);

  // Ecken generieren — bei allowCarry=false sicherstellen dass keine Schenkel-Summe überläuft
  let corners: [number, number, number];
  let attempts = 0;
  do {
    corners = [rnd(floor, cap), rnd(floor, cap), rnd(floor, cap)];
    attempts++;
    const noCarryViolation =
      profile.allowCarry ||
      (!hasCarry(corners[0], corners[1]) &&
       !hasCarry(corners[1], corners[2]) &&
       !hasCarry(corners[2], corners[0]));
    if (noCarryViolation || attempts > 50) break;
  } while (true);

  // sides[i] = Summe der beiden Ecken, die an Schenkel i grenzen
  // sides[0] = c0+c1 (oben), sides[1] = c1+c2 (rechts), sides[2] = c2+c0 (links)
  const sides = [
    corners[0] + corners[1],
    corners[1] + corners[2],
    corners[2] + corners[0],
  ] as [number, number, number];

  // Modus aus Profil bestimmen; Subtraktion nur wenn auch in operations erlaubt
  const canSubtract = profile.operations.includes("subtraction");
  const mode = profile.countTriangleMode ?? "addition";
  const wantSubtraction = mode === "subtraction" || (mode === "mixed" && rnd(0, 1) === 1);
  const useSubtraction = wantSubtraction && canSubtract;

  if (useSubtraction) {
    // Eine Ecke verstecken: Zufällige Ecke 0/1/2
    const hiddenCornerIndex = rnd(0, 2) as 0 | 1 | 2;
    const answer = corners[hiddenCornerIndex];

    // Die beiden Schenkel, die an dieser Ecke hängen
    // Ecke 0 → Schenkel 0 (s0=c0+c1) und Schenkel 2 (s2=c2+c0)
    // Ecke 1 → Schenkel 0 (s0=c0+c1) und Schenkel 1 (s1=c1+c2)
    // Ecke 2 → Schenkel 1 (s1=c1+c2) und Schenkel 2 (s2=c2+c0)

    return {
      question: `Was muss in den grauen Kreis?`,
      answer,
      choices: shuffle([answer, ...wrongChoices(answer, 3)]),
      type: "subtraction",
      station: "countTriangle",
      competence: "AB2",
      visualAid: "countTriangleVisualization",
      meta: {
        corners,
        sides,
        hiddenSideIndex: -1,
        hiddenCornerIndex,
      },
    };
  }

  // Addition: eine Schenkel-Summe gesucht
  const hiddenSideIndex = rnd(0, 2) as 0 | 1 | 2;
  const answer = sides[hiddenSideIndex];

  const addends: [number, number][] = [
    [corners[0], corners[1]],
    [corners[1], corners[2]],
    [corners[2], corners[0]],
  ];
  const [a, b] = addends[hiddenSideIndex];

  return {
    question: `Was muss in den grauen Kreis? (${a} + ${b} = ?)`,
    answer,
    choices: shuffle([answer, ...wrongChoices(answer, 3)]),
    type: "addition",
    station: "countTriangle",
    competence: "AB2",
    visualAid: "countTriangleVisualization",
    meta: {
      corners,
      sides,
      hiddenSideIndex,
      hiddenCornerIndex: -1,
    },
  };
}

import type { MathTask } from "../../../types/math";
import type { DifficultyProfile } from "../../difficulty/DifficultyProfile";
import { hasCarry, pick, rnd, shuffle, wrongChoices } from "../util";


/**
 * Ergänzungsaufgabe: a + ? = target.
 * Bei allowCarry=false werden Aufgaben mit Zehnerübergang verworfen.
 * Visual aid: Hundertertafel zeigt den Sprung von a → target.
 */
export function generateCompletionTask(profile: DifficultyProfile): MathTask {
  const max = Math.min(profile.range.max, 100); // Hundertertafel limit
  const targetCandidates =
    profile.tier === 1
      ? [10, 20]
      : profile.tier === 2
        ? [20, 30, 40, 50, 60, 70, 80, 90, 100]
        : Array.from({ length: max - 9 }, (_, i) => i + 10);

  let target = pick(targetCandidates);
  let start = rnd(1, target - 1);

  // Wenn kein Übergang erlaubt: maximal 30 Versuche, Ziel zu finden
  if (!profile.allowCarry) {
    let tries = 0;
    while (hasCarry(start, target - start) && tries < 30) {
      start = rnd(1, target - 1);
      tries++;
    }
  }

  const answer = target - start;

  return {
    question: `${start} + _ = ${target}`,
    answer,
    choices: shuffle([answer, ...wrongChoices(answer, 3)]),
    type: "addition",
    station: "completion",
    competence: target > 20 ? "AB2" : "AB1",
    visualAid: "completionBlocks",
    meta: { start, target },
  };
}

import type { MathTask, TaskType } from "../../../types/math";
import type { DifficultyProfile } from "../../difficulty/DifficultyProfile";
import { hasCarry, pick, rnd, shuffle, wrongChoices } from "../util";

/**
 * Mülltonne — Kernaufgaben (NDS Klasse 2/3):
 * - Klasse 2: Plus/Minus bis 20 (Tier 1) bzw. bis 100 (Tier 2+).
 * - Multiplikation als 2er/5er/10er-Reihe (Kernaufgaben), später erweiterbar.
 * - Division als Umkehrung (immer ganzzahlig).
 */
export function generateOperationsTask(
  profile: DifficultyProfile,
  hint?: TaskType,
): MathTask {
  const allowed = profile.operations;
  const subType: TaskType =
    hint && allowed.includes(hint) && Math.random() < 0.8 ? hint : pick(allowed);

  const limit = profile.range.max;
  let a = 0, b = 0, answer = 0, question = "";

  if (subType === "multiplication") {
    // Kernaufgaben 2er/5er/10er-Reihe (Tier 1), später bis 10x10
    const coreFactors = profile.tier === 1 ? [2, 5, 10] : [2, 3, 4, 5, 6, 10];
    a = pick(coreFactors);
    b = rnd(1, profile.tier >= 2 ? 10 : 5);
    answer = a * b;
    question = `${a} × ${b} = ?`;
  } else if (subType === "division") {
    const divisor = pick(profile.tier === 1 ? [2, 5, 10] : [2, 3, 4, 5, 10]);
    const quotient = rnd(1, 10);
    a = divisor * quotient;
    b = divisor;
    answer = quotient;
    question = `${a} ÷ ${b} = ?`;
  } else if (subType === "addition") {
    let tries = 0;
    do {
      a = rnd(1, Math.max(1, limit - 5));
      b = rnd(1, Math.max(1, limit - a));
      tries++;
    } while (!profile.allowCarry && hasCarry(a, b) && tries < 30);
    answer = a + b;
    question = `${a} + ${b} = ?`;
  } else {
    let tries = 0;
    do {
      a = rnd(5, limit);
      b = rnd(1, a - 1);
      tries++;
    } while (!profile.allowCarry && hasCarry(a - b, b) && tries < 30);
    answer = a - b;
    question = `${a} − ${b} = ?`;
  }

  const carry = subType === "addition" ? hasCarry(a, b) : false;

  let visualAid: import("../../../types/math").VisualAidId;
  if (subType === "multiplication" || subType === "division") {
    visualAid = "dotArray";
  } else if (carry && limit <= 100) {
    // StepLadder ist für Zehnersprünge bis 100 ausgelegt
    visualAid = "stepLadder";
  } else {
    // Ab dreistelligen Zahlen immer Dienes (H/Z/E)
    visualAid = "dienesBlocks";
  }

  return {
    question,
    answer,
    choices: shuffle([answer, ...wrongChoices(answer, 3, Math.max(5, Math.floor(answer / 2)))]),
    type: subType,
    station: "operations",
    competence: limit > 20 ? "AB2" : "AB1",
    visualAid,
    meta: { a, b, carry },
  };
}

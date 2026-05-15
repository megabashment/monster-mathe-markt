import type { MathTask } from "../../../types/math";
import type { DifficultyProfile } from "../../difficulty/DifficultyProfile";
import { rnd, shuffle, wrongChoices } from "../util";

export interface PacketRow {
  a: number;
  b: number;
  result: number;
}

/**
 * "Schöne Päckchen" / Entdeckerpäckchen (AB III).
 * Standardmäßig: Konstanz der Summe (a+1 / b-1 → result bleibt gleich).
 * Variante "stoerung": eine Zeile bricht das Muster — das Kind muss sie finden.
 *
 * Im Stations-Spiel zeigen wir 3 Zeilen + frage nach dem Ergebnis der 4. Zeile.
 */
export function generateDiscoveryPacketTask(profile: DifficultyProfile): MathTask {
  const limit = Math.min(profile.range.max, 100);

  // Pattern auswählen
  const pattern = profile.tier >= 2 && Math.random() < 0.4 ? "diff-grows" : "constant-sum";

  let rows: PacketRow[] = [];
  let answer = 0;
  let questionLabel = "";

  if (pattern === "constant-sum") {
    // a+b bleibt konstant: a steigt um 1, b sinkt um 1
    const sum = rnd(8, Math.min(limit, 20));
    const startA = rnd(1, sum - 4);
    rows = Array.from({ length: 3 }, (_, i) => {
      const a = startA + i;
      const b = sum - a;
      return { a, b, result: a + b };
    });
    const nextA = startA + 3;
    const nextB = sum - nextA;
    answer = nextA + nextB; // == sum
    questionLabel = `${nextA} + ${nextB} = ?`;
  } else {
    // Differenz wächst: a fest, b steigt um 1
    const fixedA = rnd(2, Math.min(10, limit - 6));
    const startB = rnd(1, 4);
    rows = Array.from({ length: 3 }, (_, i) => {
      const a = fixedA;
      const b = startB + i;
      return { a, b, result: a + b };
    });
    const nextA = fixedA;
    const nextB = startB + 3;
    answer = nextA + nextB;
    questionLabel = `${nextA} + ${nextB} = ?`;
  }

  return {
    question: questionLabel,
    answer,
    choices: shuffle([answer, ...wrongChoices(answer, 3)]),
    type: "addition",
    station: "discoveryPacket",
    competence: "AB3",
    visualAid: "hundredField",
    meta: { rows, pattern },
  };
}

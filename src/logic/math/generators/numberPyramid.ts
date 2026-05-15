import type { MathTask } from "../../../types/math";
import type { DifficultyProfile } from "../../difficulty/DifficultyProfile";
import { rnd, shuffle, wrongChoices } from "../util";

/**
 * Zahlenmauer (3 Stockwerke):
 *      [ top  ]          top  = m0 + m1
 *    [ m0 ][ m1 ]        m0   = a + b,  m1 = b + c
 *  [ a  ][ b  ][ c  ]
 *
 * Tier 1 — Vorwärts:  Basis gegeben, Deckstein gesucht
 * Tier 2 — Rückwärts: Deckstein + zwei Basissteine gegeben, fehlender Basisstein gesucht
 * Tier 3 — Rückwärts: Deckstein + ein Basisstein gegeben, fehlender Mittelstein gesucht
 */
export function generateNumberPyramidTask(profile: DifficultyProfile): MathTask {
  // top = a + 2b + c muss im Zahlenraum bleiben → Basissteine auf range.max/4 begrenzen
  const baseCap = Math.max(2, Math.floor(profile.range.max / 4));

  const a = rnd(1, baseCap);
  const b = rnd(1, baseCap);
  const c = rnd(1, baseCap);
  const m0 = a + b;
  const m1 = b + c;
  const top = m0 + m1; // = a + 2b + c

  if (profile.tier === 1) {
    // Vorwärts: alle drei Basissteine gegeben, Deckstein gesucht
    // Mittlere Steine NICHT anzeigen — Kind soll selbst addieren
    return {
      question: "Welcher Stein steht oben?",
      answer: top,
      choices: shuffle([top, ...wrongChoices(top, 3)]),
      type: "addition",
      station: "numberPyramid",
      competence: "AB3",
      visualAid: "pyramidBlocks",
      meta: {
        pyramid: {
          base: [a, b, c] as [number, number, number],
          middle: [false, false] as [false, false],
          top: null,
        },
      },
    };
  }

  if (profile.tier === 2) {
    // Rückwärts: Deckstein bekannt, ein Mittelstein gesucht (top − anderer Mittelstein)
    // Genau eine Lücke sichtbar: entweder m0 oder m1
    const hiddenMid = rnd(0, 1) as 0 | 1;
    const answer = hiddenMid === 0 ? m0 : m1;
    const middle: [number | null, number | null] = hiddenMid === 0 ? [null, m1] : [m0, null];

    return {
      question: "Was muss in den leeren Stein?",
      answer,
      choices: shuffle([answer, ...wrongChoices(answer, 3)]),
      type: "subtraction",
      station: "numberPyramid",
      competence: "AB3",
      visualAid: "pyramidBlocks",
      meta: {
        pyramid: { base: [a, b, c] as [number, number, number], middle, top },
      },
    };
  }

  // Tier 3 — Rückwärts, mittlerer Basisstein gesucht (b hat doppelte Wirkung)
  // Mittelsteine anzeigen damit Kind rückwärts rechnen kann
  return {
    question: "Was muss in den leeren Stein?",
    answer: b,
    choices: shuffle([b, ...wrongChoices(b, 3, Math.max(5, Math.floor(b * 1.5)))]),
    type: "subtraction",
    station: "numberPyramid",
    competence: "AB3",
    visualAid: "pyramidBlocks",
    meta: {
      pyramid: {
        base: [a, null, c] as [number, null, number],
        middle: [m0, m1] as [number, number],
        top,
      },
    },
  };
}

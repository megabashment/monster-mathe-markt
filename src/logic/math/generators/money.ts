import type { MathTask } from "../../../types/math";
import type { DifficultyProfile } from "../../difficulty/DifficultyProfile";
import { rnd, shuffle } from "../util";

function enumerateMoneyTotals(coinValues: number[], coinCount: number): number[] {
  let totals = new Set<number>([0]);
  for (let i = 0; i < coinCount; i++) {
    const next = new Set<number>();
    for (const t of totals) for (const v of coinValues) next.add(t + v);
    totals = next;
  }
  return [...totals].sort((a, b) => a - b);
}

function moneyWrongChoices(
  answer: number,
  count: number,
  coinValues: number[],
  shownCoinCount: number,
): number[] {
  const exact = shuffle(enumerateMoneyTotals(coinValues, shownCoinCount).filter((t) => t !== answer));
  const wrongs = new Set<number>();
  exact.forEach((t) => { if (wrongs.size < count) wrongs.add(t); });

  for (const c of [shownCoinCount - 1, shownCoinCount + 1, shownCoinCount + 2]) {
    if (c <= 0 || wrongs.size >= count) continue;
    const variants = shuffle(
      enumerateMoneyTotals(coinValues, c).filter((t) => t !== answer && !wrongs.has(t)),
    );
    variants.forEach((t) => { if (wrongs.size < count) wrongs.add(t); });
  }

  while (wrongs.size < count) {
    const offset = (Math.floor(Math.random() * 5) + 1) * 10;
    const val = Math.random() > 0.5 ? answer + offset : answer - offset;
    if (val > 0 && val !== answer) wrongs.add(val);
  }
  return [...wrongs].slice(0, count);
}

const ALL_COINS = [
  { id: "coin-2e",  value: 200 },
  { id: "coin-1e",  value: 100 },
  { id: "coin-50c", value: 50  },
  { id: "coin-20c", value: 20  },
  { id: "coin-10c", value: 10  },
] as const;

export function generateMoneyTask(profile: DifficultyProfile): MathTask {
  const visuals: string[] = [];

  // Tier 1: nur 1€ + 50ct, Beträge bis 2€ in 50ct-Schritten
  if (profile.tier === 1) {
    const steps = rnd(1, 4);
    const amount = steps * 50;
    let r = amount;
    while (r >= 100) { visuals.push("coin-1e"); r -= 100; }
    while (r >= 50)  { visuals.push("coin-50c"); r -= 50; }
    return {
      question: "Wie viel Geld ist das?",
      answer: amount,
      choices: shuffle([amount, ...moneyWrongChoices(amount, 3, [50, 100], visuals.length)]),
      visuals,
      type: "addition",
      station: "money",
      competence: "AB1",
      visualAid: "coinTray",
    };
  }

  // Tier 2+: alle Münzen, 2–5 Stück
  const pool = [
    ...Array(2).fill(ALL_COINS[0]),
    ...Array(3).fill(ALL_COINS[1]),
    ...Array(2).fill(ALL_COINS[2]),
    ...Array(2).fill(ALL_COINS[3]),
    ...Array(2).fill(ALL_COINS[4]),
  ];
  const count = rnd(2, profile.tier >= 3 ? 6 : 5);
  let total = 0;
  for (let i = 0; i < count; i++) {
    const coin = pool[rnd(0, pool.length - 1)];
    visuals.push(coin.id);
    total += coin.value;
  }

  return {
    question: "Wie viel Geld ist das?",
    answer: total,
    choices: shuffle([total, ...moneyWrongChoices(total, 3, ALL_COINS.map((c) => c.value), visuals.length)]),
    visuals,
    type: "addition",
    station: "money",
    competence: profile.tier >= 3 ? "AB2" : "AB1",
    visualAid: "coinTray",
  };
}

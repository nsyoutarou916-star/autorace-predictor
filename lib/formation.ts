import type { ScoredEntry } from "@/lib/predict";

export interface FormationCombo {
  carNos: [number, number, number];
  probability: number;
}

export interface Formation {
  axisCarNos: number[];
  secondCandidates: number[];
  thirdCandidates: number[];
  anaCarNo: number | null;
  combos: FormationCombo[];
  totalCoverage: number;
}

/** Below this cumulative hit-probability we keep widening the formation. */
export const TARGET_COVERAGE = 0.28;
/** Hard cap on ticket count so a wide-open race doesn't blow up the buy. */
const MAX_COMBOS = 42;

/**
 * Exact (non-simulated) Plackett-Luce probability that the race finishes
 * a→b→c: draw the 1st-place car weighted by strength, then the 2nd from
 * whoever's left, then the 3rd from whoever's left after that.
 */
function tripleProbability(
  weights: Record<number, number>,
  total: number,
  a: number,
  b: number,
  c: number,
): number {
  const wa = weights[a];
  const wb = weights[b];
  const wc = weights[c];
  const p1 = wa / total;
  const p2 = wb / (total - wa);
  const p3 = wc / (total - wa - wb);
  return p1 * p2 * p3;
}

function buildCombos(
  weights: Record<number, number>,
  total: number,
  axisCarNos: number[],
  secondPool: number[],
  thirdPool: number[],
): FormationCombo[] {
  const combos: FormationCombo[] = [];
  for (const a of axisCarNos) {
    for (const b of secondPool) {
      if (b === a) continue;
      for (const c of thirdPool) {
        if (c === a || c === b) continue;
        combos.push({
          carNos: [a, b, c],
          probability: tripleProbability(weights, total, a, b, c),
        });
      }
    }
  }
  return combos;
}

/**
 * Builds a "フォーメーション" (formation) bet, sized to the race rather than
 * a fixed template: a tight race (no standout favorite) gets a 2-car axis
 * and wider candidate groups, while a race with a clear favorite gets a
 * single axis and a tighter group — expanding either way until the combined
 * hit probability clears TARGET_COVERAGE (or the ticket count hits
 * MAX_COMBOS). The 3rd-place group always folds in one 大穴 (long shot): the
 * best-scoring car outside the main group, not just the single worst entry.
 */
export function buildFormation(scored: ScoredEntry[]): Formation | null {
  if (scored.length < 5) return null;

  const weights: Record<number, number> = {};
  for (const s of scored) weights[s.entry.carNo] = Math.max(s.score, 0.1);
  const total = Object.values(weights).reduce((a, b) => a + b, 0);

  // `scored` is already ranked best-to-worst by predicted strength.
  const ranked = scored.map((s) => s.entry.carNo);
  const p1 = ranked.map((carNo) => weights[carNo] / total);

  // A close or wide-open race gets a 2-car axis instead of 1.
  const axisCarNos =
    p1[0] < 0.3 || p1[0] - p1[1] < 0.05 ? [ranked[0], ranked[1]] : [ranked[0]];

  let secondSize = Math.min(3, ranked.length - 1);
  let thirdSize = Math.min(5, ranked.length - 1);

  let secondCandidates = ranked.slice(0, secondSize);
  let thirdMain = ranked.slice(0, thirdSize);
  let anaCarNo = ranked[thirdSize] ?? null;
  let thirdCandidates = anaCarNo ? [...thirdMain, anaCarNo] : thirdMain;
  let combos = buildCombos(
    weights,
    total,
    axisCarNos,
    secondCandidates,
    thirdCandidates,
  );
  let coverage = combos.reduce((sum, c) => sum + c.probability, 0);

  // Widen the net (alternating 3rd/2nd) until we hit the coverage target,
  // run out of cars to add, or hit the ticket-count ceiling.
  while (
    coverage < TARGET_COVERAGE &&
    combos.length < MAX_COMBOS &&
    (thirdSize < ranked.length - 1 || secondSize < ranked.length - 1)
  ) {
    if (thirdSize < ranked.length - 1) {
      thirdSize++;
    } else if (secondSize < ranked.length - 1) {
      secondSize++;
    } else {
      break;
    }

    secondCandidates = ranked.slice(0, secondSize);
    thirdMain = ranked.slice(0, thirdSize);
    anaCarNo = ranked[thirdSize] ?? null;
    thirdCandidates = anaCarNo ? [...thirdMain, anaCarNo] : thirdMain;
    combos = buildCombos(
      weights,
      total,
      axisCarNos,
      secondCandidates,
      thirdCandidates,
    );
    coverage = combos.reduce((sum, c) => sum + c.probability, 0);
  }

  combos.sort((x, y) => y.probability - x.probability);

  return {
    axisCarNos,
    secondCandidates,
    thirdCandidates,
    anaCarNo,
    combos,
    totalCoverage: coverage,
  };
}

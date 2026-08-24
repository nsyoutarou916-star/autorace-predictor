import type { ScoredEntry } from "@/lib/predict";

export interface FormationCombo {
  carNos: [number, number, number];
  probability: number;
}

export interface Formation {
  axisCarNo: number;
  secondCandidates: number[];
  thirdCandidates: number[];
  anaCarNo: number | null;
  combos: FormationCombo[];
  totalCoverage: number;
}

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

/**
 * Builds a "フォーメーション" (formation) bet: a fixed axis for 1st, a small
 * group of live candidates for 2nd, and a wider group for 3rd that also
 * includes one 大穴 (long shot) — the best-scoring car outside the main
 * group, i.e. the most plausible upset pick rather than the single worst
 * entry in the field.
 */
export function buildFormation(scored: ScoredEntry[]): Formation | null {
  if (scored.length < 5) return null;

  const weights: Record<number, number> = {};
  for (const s of scored) weights[s.entry.carNo] = Math.max(s.score, 0.1);
  const total = Object.values(weights).reduce((a, b) => a + b, 0);

  // `scored` is already ranked best-to-worst by predicted strength.
  const ranked = scored.map((s) => s.entry.carNo);

  const axisCarNo = ranked[0];
  const secondCandidates = ranked.slice(1, 4); // rank 2-4
  const thirdMain = ranked.slice(1, 6); // rank 2-6
  const anaCarNo = ranked[6] ?? null; // best of the rest = the live long shot
  const thirdCandidates = anaCarNo ? [...thirdMain, anaCarNo] : thirdMain;

  const combos: FormationCombo[] = [];
  for (const b of secondCandidates) {
    for (const c of thirdCandidates) {
      if (c === b) continue;
      combos.push({
        carNos: [axisCarNo, b, c],
        probability: tripleProbability(weights, total, axisCarNo, b, c),
      });
    }
  }

  combos.sort((x, y) => y.probability - x.probability);
  const totalCoverage = combos.reduce((sum, c) => sum + c.probability, 0);

  return {
    axisCarNo,
    secondCandidates,
    thirdCandidates,
    anaCarNo,
    combos,
    totalCoverage,
  };
}

import type { ScoredEntry } from "@/lib/predict";

export interface SimpleBetPrediction {
  carNos: number[];
  probability: number;
}

function buildWeights(scored: ScoredEntry[]) {
  const weights: Record<number, number> = {};
  for (const s of scored) weights[s.entry.carNo] = Math.max(s.score, 0.1);
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  return { weights, total };
}

/** 2連単: exact 1st→2nd prediction, using the top 2 ranked cars in order. */
export function computeExacta(
  scored: ScoredEntry[],
): SimpleBetPrediction | null {
  if (scored.length < 2) return null;
  const { weights, total } = buildWeights(scored);
  const a = scored[0].entry.carNo;
  const b = scored[1].entry.carNo;
  const probability = (weights[a] / total) * (weights[b] / (total - weights[a]));
  return { carNos: [a, b], probability };
}

/** 3連複: the top-3 ranked cars finishing in the top 3, in any order. */
export function computeTrio(scored: ScoredEntry[]): SimpleBetPrediction | null {
  if (scored.length < 3) return null;
  const { weights, total } = buildWeights(scored);
  const [a, b, c] = [
    scored[0].entry.carNo,
    scored[1].entry.carNo,
    scored[2].entry.carNo,
  ];

  const permutations: [number, number, number][] = [
    [a, b, c],
    [a, c, b],
    [b, a, c],
    [b, c, a],
    [c, a, b],
    [c, b, a],
  ];

  const probability = permutations.reduce((sum, [x, y, z]) => {
    const p1 = weights[x] / total;
    const p2 = weights[y] / (total - weights[x]);
    const p3 = weights[z] / (total - weights[x] - weights[y]);
    return sum + p1 * p2 * p3;
  }, 0);

  return { carNos: [a, b, c], probability };
}

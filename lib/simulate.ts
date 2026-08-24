import type { ScoredEntry } from "@/lib/predict";

export interface TrifectaCandidate {
  carNos: [number, number, number];
  count: number;
  probability: number; // count / iterations
}

/**
 * Simulates the race `iterations` times using a Plackett-Luce model: each
 * car's predicted score is used as its relative "strength", the winner is
 * drawn weighted by strength, then 2nd/3rd are drawn the same way from the
 * remaining field. Tallies how often each ordered top-3 (3連単) occurs.
 */
export function simulateTrifecta(
  scored: ScoredEntry[],
  iterations = 20000,
): TrifectaCandidate[] {
  if (scored.length < 3) return [];

  const base = scored.map((s) => ({
    carNo: s.entry.carNo,
    weight: Math.max(s.score, 0.1),
  }));

  const tally = new Map<string, number>();

  for (let i = 0; i < iterations; i++) {
    const pool = base.map((b) => ({ ...b }));
    const podium: number[] = [];

    for (let place = 0; place < 3; place++) {
      const total = pool.reduce((sum, p) => sum + p.weight, 0);
      let r = Math.random() * total;
      let idx = pool.length - 1;
      for (let j = 0; j < pool.length; j++) {
        r -= pool[j].weight;
        if (r <= 0) {
          idx = j;
          break;
        }
      }
      podium.push(pool[idx].carNo);
      pool.splice(idx, 1);
    }

    const key = podium.join("-");
    tally.set(key, (tally.get(key) ?? 0) + 1);
  }

  return Array.from(tally.entries())
    .map(([key, count]) => ({
      carNos: key.split("-").map(Number) as [number, number, number],
      count,
      probability: count / iterations,
    }))
    .sort((a, b) => b.count - a.count);
}

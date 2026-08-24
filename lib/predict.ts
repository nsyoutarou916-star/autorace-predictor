import type { Entry } from "@/app/generated/prisma/client";
import type { RecentRaceEntry } from "@/lib/autorace-client";

export interface ScoredEntry {
  entry: Entry;
  score: number;
  mark: string;
  /** 実質差(m): 試走タイム差をハンデ換算した上での、最有利な選手からの遅れ。0が最も有利。 */
  effectiveGapMeters: number;
}

const MARKS = ["◎", "○", "▲", "△"];

function toNumber(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Scales raw values to 0-100 within this race's field. `higherIsBetter` controls direction. */
function normalize(
  values: (number | null)[],
  higherIsBetter: boolean,
): number[] {
  const present = values.filter((v): v is number => v !== null);
  if (present.length === 0) return values.map(() => 50);
  const min = Math.min(...present);
  const max = Math.max(...present);
  const span = max - min;
  return values.map((v) => {
    if (v === null) return 50; // neutral score for missing data
    if (span === 0) return 50;
    const ratio = (v - min) / span;
    return (higherIsBetter ? ratio : 1 - ratio) * 100;
  });
}

function averageRecentOrder(recentJson: string | null): number | null {
  if (!recentJson) return null;
  try {
    const recent = JSON.parse(recentJson) as RecentRaceEntry[];
    const orders = recent
      .map((r) => Number(r.order))
      .filter((n) => Number.isFinite(n));
    if (orders.length === 0) return null;
    return orders.reduce((a, b) => a + b, 0) / orders.length;
  } catch {
    return null;
  }
}

// オートレースの経験則: 0.1秒の差は概ね10m相当詰められる(=1秒で100m)。
// ただしこれは1周(オートレースの走路は全場500m)あたりの差。実際のレースは
// 複数周走るため、試走タイムの差はレースの周回数分だけ積み重なって効いてくる
// ——1周あたりわずかな差でも、速い選手はレース全体を通してハンデ差を削り続ける。
// そのため試走タイム差は「周回数」倍してからハンデ(m)と合算し、ハンデだけで
// なく生の速さが着順により強く反映されるようにしている。
const METERS_PER_SECOND = 100;
const LAP_METERS = 500; // オートレースの走路は全場共通で1周500m
const DEFAULT_LAPS = 4; // 距離が取得できない場合のフォールバック(標準的な周回数)

/**
 * 各選手の「実質差(m)」を算出する。最も有利な選手(=ハンデが小さく、かつ
 * 試走タイムが速い)を0とし、他の選手はハンデ差と、レース全体で積み重なる
 * 試走タイム差を足し合わせた遅れとして表す。内側の選手(ハンデが小さい)でも
 * 試走タイムが遅ければ、周回を重ねるごとに外側の速い選手に詰められ、実質差が
 * 縮まる/逆転する。
 */
function computeEffectiveGaps(
  entries: Entry[],
  raceDistanceMeters: number | null,
): number[] {
  const laps =
    raceDistanceMeters && raceDistanceMeters > 0
      ? raceDistanceMeters / LAP_METERS
      : DEFAULT_LAPS;

  const trialTimes = entries.map((e) => toNumber(e.trialTime));
  const validTimes = trialTimes.filter((t): t is number => t !== null);
  const fastestTime = validTimes.length > 0 ? Math.min(...validTimes) : null;
  const avgTime =
    validTimes.length > 0
      ? validTimes.reduce((a, b) => a + b, 0) / validTimes.length
      : null;

  const rawPositions = entries.map((e, i) => {
    const t = trialTimes[i] ?? avgTime; // 試走データが無い場合は平均扱い(中立)
    const timeGapMeters =
      t !== null && fastestTime !== null
        ? (t - fastestTime) * METERS_PER_SECOND * laps
        : 0;
    return e.handicap + timeGapMeters;
  });

  const best = Math.min(...rawPositions);
  return rawPositions.map((p) => p - best);
}

// 実質差(ハンデ+試走タイム換算)を最優先(7割)。3連率・2連率・直近成績は
// 補助的な要素として残す。
const WEIGHTS = {
  effectiveGap: 0.7,
  rate3: 0.15,
  rate2: 0.05,
  recentOrder: 0.1,
};

export function computeScores(
  entries: Entry[],
  raceDistanceMeters: number | null = null,
): ScoredEntry[] {
  const effectiveGaps = computeEffectiveGaps(entries, raceDistanceMeters);
  const effectiveGapScore = normalize(effectiveGaps, false);

  const rate3 = normalize(
    entries.map((e) => toNumber(e.rate3)),
    true,
  );
  const rate2 = normalize(
    entries.map((e) => toNumber(e.rate2)),
    true,
  );
  const recentOrder = normalize(
    entries.map((e) => averageRecentOrder(e.recentJson)),
    false,
  );

  const scored = entries.map((entry, i) => ({
    entry,
    score:
      effectiveGapScore[i] * WEIGHTS.effectiveGap +
      rate3[i] * WEIGHTS.rate3 +
      rate2[i] * WEIGHTS.rate2 +
      recentOrder[i] * WEIGHTS.recentOrder,
    mark: "",
    effectiveGapMeters: effectiveGaps[i],
  }));

  scored.sort((a, b) => b.score - a.score);
  scored.forEach((s, i) => {
    s.mark = MARKS[i] ?? "";
  });

  return scored;
}

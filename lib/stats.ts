import type { Entry, ResultEntry, Venue } from "@/app/generated/prisma/client";
import { computeScores } from "@/lib/predict";
import { simulateTrifecta } from "@/lib/simulate";
import { buildFormation } from "@/lib/formation";

interface RaceWithDetails {
  id: number;
  raceDate: string;
  raceNo: number;
  distance: number | null;
  venue: Venue;
  entries: Entry[];
  results: ResultEntry[];
}

export interface RaceStatRow {
  raceId: number;
  venueName: string;
  raceDate: string;
  raceNo: number;
  predictedWinnerCarNo: number;
  actualWinnerCarNo: number | null;
  winHit: boolean;
  predictedTrifecta: [number, number, number] | null;
  actualTrifecta: [number, number, number] | null;
  trifectaHit: boolean;
  trifectaBoxHit: boolean;
  formationComboCount: number | null;
  formationCoverage: number | null;
  formationHit: boolean;
}

export interface StatsSummary {
  totalRaces: number;
  winHitCount: number;
  winHitRate: number;
  trifectaHitCount: number;
  trifectaHitRate: number;
  trifectaBoxHitCount: number;
  trifectaBoxHitRate: number;
  formationEligibleCount: number;
  formationHitCount: number;
  formationHitRate: number;
  rows: RaceStatRow[];
}

function actualTopThree(
  results: ResultEntry[],
): [number, number, number] | null {
  const byOrder = new Map(results.map((r) => [r.order, r.carNo]));
  const top = [1, 2, 3].map((o) => byOrder.get(o));
  if (top.some((carNo) => carNo === undefined)) return null;
  return top as [number, number, number];
}

export function computeStats(races: RaceWithDetails[]): StatsSummary {
  const rows: RaceStatRow[] = races
    .filter((race) => race.entries.length >= 3 && race.results.length > 0)
    .map((race) => {
      const scored = computeScores(race.entries, race.distance);
      const predictedWinnerCarNo = scored[0].entry.carNo;
      const actual = actualTopThree(race.results);
      const actualWinnerCarNo = actual ? actual[0] : null;

      const trifectaCandidates = simulateTrifecta(scored, 20000);
      const predictedTrifecta = trifectaCandidates[0]?.carNos ?? null;

      const winHit = actualWinnerCarNo === predictedWinnerCarNo;
      const trifectaHit =
        !!predictedTrifecta &&
        !!actual &&
        predictedTrifecta.every((carNo, i) => carNo === actual[i]);
      const trifectaBoxHit =
        !!predictedTrifecta &&
        !!actual &&
        new Set(predictedTrifecta).size === 3 &&
        predictedTrifecta.every((carNo) => actual.includes(carNo));

      const formation = buildFormation(scored);
      const actualKey = actual ? actual.join("-") : null;
      const formationHit =
        !!formation &&
        !!actualKey &&
        formation.combos.some((c) => c.carNos.join("-") === actualKey);

      return {
        raceId: race.id,
        venueName: race.venue.name,
        raceDate: race.raceDate,
        raceNo: race.raceNo,
        predictedWinnerCarNo,
        actualWinnerCarNo,
        winHit,
        predictedTrifecta,
        actualTrifecta: actual,
        trifectaHit,
        trifectaBoxHit,
        formationComboCount: formation?.combos.length ?? null,
        formationCoverage: formation?.totalCoverage ?? null,
        formationHit,
      };
    });

  const totalRaces = rows.length;
  const winHitCount = rows.filter((r) => r.winHit).length;
  const trifectaHitCount = rows.filter((r) => r.trifectaHit).length;
  const trifectaBoxHitCount = rows.filter((r) => r.trifectaBoxHit).length;
  const formationEligibleRows = rows.filter(
    (r) => r.formationComboCount !== null,
  );
  const formationEligibleCount = formationEligibleRows.length;
  const formationHitCount = formationEligibleRows.filter(
    (r) => r.formationHit,
  ).length;

  return {
    totalRaces,
    winHitCount,
    winHitRate: totalRaces > 0 ? winHitCount / totalRaces : 0,
    trifectaHitCount,
    trifectaHitRate: totalRaces > 0 ? trifectaHitCount / totalRaces : 0,
    trifectaBoxHitCount,
    trifectaBoxHitRate: totalRaces > 0 ? trifectaBoxHitCount / totalRaces : 0,
    formationEligibleCount,
    formationHitCount,
    formationHitRate:
      formationEligibleCount > 0
        ? formationHitCount / formationEligibleCount
        : 0,
    rows,
  };
}

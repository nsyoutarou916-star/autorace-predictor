"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { VENUES, type VenueKey } from "@/lib/venues";
import { fetchAllRacesAction } from "@/app/actions";

function todayJST(): string {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}

export default function RaceSelectorForm() {
  const router = useRouter();
  const [venue, setVenue] = useState<VenueKey>("iizuka");
  const [date, setDate] = useState(todayJST());
  const [raceNo, setRaceNo] = useState(1);
  const [isFetchingAll, startFetchAll] = useTransition();
  const [fetchAllResult, setFetchAllResult] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/race/${venue}/${date}/${raceNo}`);
  }

  function handleFetchAll() {
    setFetchAllResult(null);
    startFetchAll(async () => {
      const result = await fetchAllRacesAction(venue, date);
      setFetchAllResult(
        `${result.fetched}レース取得しました(開催なし/取得失敗 ${result.skipped}件)。`,
      );
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-6 rounded-lg border border-black/10 p-6 dark:border-white/15"
    >
      <div>
        <p className="mb-2 text-sm font-medium">競走場</p>
        <div className="flex flex-wrap gap-2">
          {VENUES.map((v) => (
            <button
              key={v.key}
              type="button"
              onClick={() => setVenue(v.key)}
              className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
                venue === v.key
                  ? "bg-red-600 text-white"
                  : "bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20"
              }`}
            >
              {v.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-6">
        <label className="flex flex-col gap-2 text-sm font-medium">
          開催日
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded border border-black/15 px-3 py-1.5 dark:border-white/20 dark:bg-black"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium">
          レース番号
          <select
            value={raceNo}
            onChange={(e) => setRaceNo(Number(e.target.value))}
            className="rounded border border-black/15 px-3 py-1.5 dark:border-white/20 dark:bg-black"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}R
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          className="rounded bg-red-600 px-6 py-2 text-sm font-semibold text-white hover:bg-red-700"
        >
          予想を見る
        </button>

        <button
          type="button"
          onClick={handleFetchAll}
          disabled={isFetchingAll}
          className="rounded border border-black/15 px-6 py-2 text-sm font-semibold hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/20 dark:hover:bg-white/10"
        >
          {isFetchingAll
            ? "取得中...(1分ほどかかります)"
            : "この開催日の全レースを一括取得"}
        </button>
      </div>

      {fetchAllResult && (
        <p className="text-sm text-black/60 dark:text-white/60">
          {fetchAllResult} 「予想の的中率を見る」からまとめて確認できます。
        </p>
      )}
    </form>
  );
}

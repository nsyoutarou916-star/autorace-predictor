"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { VENUES, type VenueKey } from "@/lib/venues";

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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/race/${venue}/${date}/${raceNo}`);
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

      <button
        type="submit"
        className="self-start rounded bg-red-600 px-6 py-2 text-sm font-semibold text-white hover:bg-red-700"
      >
        予想を見る
      </button>
    </form>
  );
}

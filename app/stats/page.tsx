import Link from "next/link";
import { getRacesWithResults } from "@/lib/scrape";
import { computeStats } from "@/lib/stats";

// Reads live DB state on every request; must not be statically prerendered
// at build time (the production DB doesn't exist yet when `next build` runs).
export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const races = await getRacesWithResults();
  const stats = computeStats(races);

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-4xl flex-col gap-6 px-6 py-16">
      <Link href="/" className="text-sm text-red-600 hover:underline">
        ← 会場・日付・レースを選び直す
      </Link>

      <div>
        <h1 className="text-2xl font-bold">予想の的中率</h1>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          確定結果が取得できたレース({stats.totalRaces}件)について、予想と実際の結果を比較しています。表示したレースが増えるほどデータが溜まります。
        </p>
      </div>

      {stats.totalRaces === 0 ? (
        <p className="rounded-lg border border-black/10 p-6 text-sm text-black/60 dark:border-white/15 dark:text-white/60">
          まだ確定結果のあるレースがありません。いくつかレースを見ると、ここに的中率が表示されます。
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              label="◎単勝的中率"
              hint="◎の選手が実際に1着だった割合"
              count={stats.winHitCount}
              total={stats.totalRaces}
              rate={stats.winHitRate}
            />
            <StatCard
              label="3連単的中率"
              hint="予想の3連単が着順まで一致した割合"
              count={stats.trifectaHitCount}
              total={stats.totalRaces}
              rate={stats.trifectaHitRate}
            />
            <StatCard
              label="3連複的中率"
              hint="予想の上位3車が着順問わず一致した割合"
              count={stats.trifectaBoxHitCount}
              total={stats.totalRaces}
              rate={stats.trifectaBoxHitRate}
            />
          </div>

          <div className="min-w-0 overflow-x-auto rounded-lg border border-black/10 dark:border-white/15">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-black/10 bg-black/5 text-left dark:border-white/15 dark:bg-white/5">
                  <Th>日付</Th>
                  <Th>会場</Th>
                  <Th>R</Th>
                  <Th>◎</Th>
                  <Th>実際1着</Th>
                  <Th>単勝</Th>
                  <Th>予想3連単</Th>
                  <Th>実際3連単</Th>
                  <Th>3連単</Th>
                  <Th>3連複</Th>
                </tr>
              </thead>
              <tbody>
                {stats.rows.map((row) => (
                  <tr
                    key={row.raceId}
                    className="border-b border-black/5 last:border-0 dark:border-white/10"
                  >
                    <Td>{row.raceDate}</Td>
                    <Td>{row.venueName}</Td>
                    <Td>{row.raceNo}R</Td>
                    <Td>{row.predictedWinnerCarNo}</Td>
                    <Td>{row.actualWinnerCarNo ?? "-"}</Td>
                    <Td>{row.winHit ? "◯" : "×"}</Td>
                    <Td>{row.predictedTrifecta?.join("-") ?? "-"}</Td>
                    <Td>{row.actualTrifecta?.join("-") ?? "-"}</Td>
                    <Td>{row.trifectaHit ? "◯" : "×"}</Td>
                    <Td>{row.trifectaBoxHit ? "◯" : "×"}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  hint,
  count,
  total,
  rate,
}: {
  label: string;
  hint: string;
  count: number;
  total: number;
  rate: number;
}) {
  return (
    <div className="rounded-lg border border-black/10 p-4 dark:border-white/15">
      <p className="text-sm font-medium text-black/60 dark:text-white/60">
        {label}
      </p>
      <p className="mt-1 text-3xl font-bold">{(rate * 100).toFixed(1)}%</p>
      <p className="mt-1 text-xs text-black/50 dark:text-white/50">
        {count}/{total}件・{hint}
      </p>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 font-medium">{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-3 py-2">{children}</td>;
}

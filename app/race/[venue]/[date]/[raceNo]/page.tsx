import Link from "next/link";
import { getOrFetchRace, RaceNotFoundError } from "@/lib/scrape";
import { computeScores } from "@/lib/predict";
import { simulateTrifecta } from "@/lib/simulate";
import { buildFormation } from "@/lib/formation";
import { venueByKey } from "@/lib/venues";

interface Props {
  params: Promise<{ venue: string; date: string; raceNo: string }>;
}

export default async function RacePage({ params }: Props) {
  const { venue: venueKey, date, raceNo: raceNoStr } = await params;
  const raceNo = Number(raceNoStr);
  const venue = venueByKey(venueKey);

  if (!venue || !Number.isInteger(raceNo)) {
    return (
      <ErrorScreen message="無効な会場またはレース番号です。" />
    );
  }

  let race;
  try {
    race = await getOrFetchRace(venueKey, date, raceNo);
  } catch (e) {
    if (e instanceof RaceNotFoundError) {
      return (
        <ErrorScreen
          message={`${venue.name}競走場 ${date} ${raceNo}Rのデータが見つかりませんでした。開催日・レース番号を確認してください。`}
        />
      );
    }
    return (
      <ErrorScreen message="データ取得中にエラーが発生しました。時間をおいて再度お試しください。" />
    );
  }

  const scored = computeScores(race.entries, race.distance);
  const resultsByCarNo = new Map(race.results.map((r) => [r.carNo, r]));
  const hasResults = race.results.length > 0;
  const nameByCarNo = new Map(race.entries.map((e) => [e.carNo, e.playerName]));

  const trifectaCandidates = simulateTrifecta(scored, 20000);
  const topTrifecta = trifectaCandidates[0];
  const formation = buildFormation(scored);

  const actualTrifecta = hasResults
    ? [1, 2, 3]
        .map((order) => race.results.find((r) => r.order === order)?.carNo)
        .filter((carNo): carNo is number => carNo !== undefined)
    : [];
  const actualTrifectaHit =
    actualTrifecta.length === 3 &&
    topTrifecta &&
    actualTrifecta.every((carNo, i) => carNo === topTrifecta.carNos[i]);
  const actualKey = actualTrifecta.length === 3 ? actualTrifecta.join("-") : null;
  const formationHitCombo =
    formation && actualKey
      ? formation.combos.find((c) => c.carNos.join("-") === actualKey)
      : undefined;

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-4xl flex-col gap-6 px-6 py-16">
      <Link href="/" className="text-sm text-red-600 hover:underline">
        ← 会場・日付・レースを選び直す
      </Link>

      <div>
        <h1 className="text-2xl font-bold">
          {venue.name}競走場 {date} {raceNo}R
        </h1>
        {(race.distance || race.weather) && (
          <p className="mt-1 text-sm text-black/60 dark:text-white/60">
            {race.distance && `${race.distance}m`}
            {race.distance && race.weather && " / "}
            {race.weather}
          </p>
        )}
        {hasResults && (
          <p className="mt-1 text-sm text-green-700 dark:text-green-400">
            このレースは確定結果があります(答え合わせ表示中)
          </p>
        )}
      </div>

      <div className="min-w-0 overflow-x-auto rounded-lg border border-black/10 dark:border-white/15">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-black/10 bg-black/5 text-left dark:border-white/15 dark:bg-white/5">
              <Th>印</Th>
              <Th>車</Th>
              <Th>選手名</Th>
              <Th>支所</Th>
              <Th>ハンデ</Th>
              <Th>試走T</Th>
              <Th>実質差</Th>
              <Th>2連率</Th>
              <Th>3連率</Th>
              <Th>予想点</Th>
              {hasResults && <Th>実際の着順</Th>}
            </tr>
          </thead>
          <tbody>
            {scored.map(({ entry, score, mark, effectiveGapMeters }) => {
              const result = resultsByCarNo.get(entry.carNo);
              return (
                <tr
                  key={entry.id}
                  className="border-b border-black/5 last:border-0 dark:border-white/10"
                >
                  <Td className="text-lg font-bold">{mark}</Td>
                  <Td>{entry.carNo}</Td>
                  <Td>{entry.playerName}</Td>
                  <Td>{entry.branch}</Td>
                  <Td>{entry.handicap}</Td>
                  <Td>{entry.trialTime}</Td>
                  <Td>
                    {effectiveGapMeters < 0.05
                      ? "先頭"
                      : `+${effectiveGapMeters.toFixed(1)}m`}
                  </Td>
                  <Td>{entry.rate2}</Td>
                  <Td>{entry.rate3}</Td>
                  <Td>{score.toFixed(1)}</Td>
                  {hasResults && (
                    <Td>{result ? `${result.order}着` : "-"}</Td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {topTrifecta && (
        <div className="rounded-lg border border-black/10 p-6 dark:border-white/15">
          <h2 className="text-lg font-bold">3連単予想(20,000回シミュレーション)</h2>
          <p className="mt-1 text-sm text-black/60 dark:text-white/60">
            予想点を強さとして、1着→2着→3着を20,000回抽選し最も出現回数が多かった組み合わせです。
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-4 rounded-lg bg-black/5 p-4 dark:bg-white/5">
            <div className="flex items-center gap-2 text-2xl font-bold">
              {topTrifecta.carNos.map((carNo, i) => (
                <span key={i} className="flex items-center gap-2">
                  {i > 0 && (
                    <span className="text-black/30 dark:text-white/30">→</span>
                  )}
                  <span>{carNo}</span>
                </span>
              ))}
            </div>
            <div className="text-sm text-black/60 dark:text-white/60">
              <div>
                {topTrifecta.carNos
                  .map((carNo) => nameByCarNo.get(carNo) ?? carNo)
                  .join(" → ")}
              </div>
              <div>
                出現確率 {(topTrifecta.probability * 100).toFixed(1)}%(
                {topTrifecta.count}/20000回)
              </div>
            </div>
          </div>

          {hasResults && actualTrifecta.length === 3 && (
            <p
              className={`mt-3 text-sm ${
                actualTrifectaHit
                  ? "text-green-700 dark:text-green-400"
                  : "text-black/60 dark:text-white/60"
              }`}
            >
              実際の結果: {actualTrifecta.join(" → ")}
              {actualTrifectaHit ? "(的中!)" : "(不的中)"}
            </p>
          )}

          <table className="mt-4 w-full max-w-sm border-collapse text-sm">
            <thead>
              <tr className="border-b border-black/10 text-left dark:border-white/15">
                <Th>順位</Th>
                <Th>3連単</Th>
                <Th>確率</Th>
              </tr>
            </thead>
            <tbody>
              {trifectaCandidates.slice(0, 5).map((c, i) => (
                <tr
                  key={c.carNos.join("-")}
                  className="border-b border-black/5 last:border-0 dark:border-white/10"
                >
                  <Td>{i + 1}</Td>
                  <Td>{c.carNos.join(" - ")}</Td>
                  <Td>{(c.probability * 100).toFixed(1)}%</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {formation && (
        <div className="rounded-lg border border-black/10 p-6 dark:border-white/15">
          <h2 className="text-lg font-bold">フォーメーション予想(大穴込み)</h2>
          <p className="mt-1 text-sm text-black/60 dark:text-white/60">
            1着を軸に固定し、2着・3着を複数候補でカバーする買い方です。3着候補には本命グループ以外から最も期待できる大穴を1頭加えています。各組み合わせの確率は数式による厳密な計算値です。
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3 rounded-lg bg-black/5 p-4 text-sm dark:bg-white/5 sm:grid-cols-3">
            <div>
              <p className="text-black/60 dark:text-white/60">1着(軸)</p>
              <p className="mt-1 text-lg font-bold">
                {formation.axisCarNo}{" "}
                <span className="text-sm font-normal">
                  {nameByCarNo.get(formation.axisCarNo)}
                </span>
              </p>
            </div>
            <div>
              <p className="text-black/60 dark:text-white/60">2着候補</p>
              <p className="mt-1 font-bold">
                {formation.secondCandidates.join(" / ")}
              </p>
            </div>
            <div>
              <p className="text-black/60 dark:text-white/60">3着候補</p>
              <p className="mt-1 font-bold">
                {formation.thirdCandidates.map((carNo, i) => (
                  <span key={carNo}>
                    {i > 0 && " / "}
                    {carNo}
                    {carNo === formation.anaCarNo && (
                      <span className="text-red-600"> (穴)</span>
                    )}
                  </span>
                ))}
              </p>
            </div>
          </div>

          <p className="mt-3 text-sm">
            合計{formation.combos.length}点で、合計カバー率{" "}
            <span className="font-bold">
              {(formation.totalCoverage * 100).toFixed(1)}%
            </span>
            (単一の3連単予想の約
            {topTrifecta
              ? (formation.totalCoverage / topTrifecta.probability).toFixed(1)
              : "-"}
            倍の的中確率をカバー)
          </p>

          {hasResults && actualKey && (
            <p
              className={`mt-2 text-sm ${
                formationHitCombo
                  ? "text-green-700 dark:text-green-400"
                  : "text-black/60 dark:text-white/60"
              }`}
            >
              実際の結果: {actualTrifecta.join(" → ")}
              {formationHitCombo
                ? `(フォーメーション的中!確率${(formationHitCombo.probability * 100).toFixed(1)}%の組み合わせでした)`
                : "(フォーメーション圏外)"}
            </p>
          )}

          <div className="mt-4 min-w-0 overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-black/10 text-left dark:border-white/15">
                  <Th>順位</Th>
                  <Th>3連単</Th>
                  <Th>確率</Th>
                  <Th>大穴</Th>
                </tr>
              </thead>
              <tbody>
                {formation.combos.map((c, i) => {
                  const isAna = c.carNos.includes(formation.anaCarNo ?? -1);
                  const isActual = actualKey === c.carNos.join("-");
                  return (
                    <tr
                      key={c.carNos.join("-")}
                      className={`border-b border-black/5 last:border-0 dark:border-white/10 ${
                        isActual
                          ? "bg-green-50 dark:bg-green-950/40"
                          : ""
                      }`}
                    >
                      <Td>{i + 1}</Td>
                      <Td>{c.carNos.join(" - ")}</Td>
                      <Td>{(c.probability * 100).toFixed(2)}%</Td>
                      <Td>{isAna ? "◯" : ""}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-xs text-black/50 dark:text-white/50">
        「実質差」は0.1秒=10m詰められるという経験則をもとに、1周(500m)あたりの試走タイム差をレースの周回数分積み重ねてハンデ(m)と合算した、実質的な後方距離です(0=最有利)。周回を重ねるほど速さの差が効いてくるため、試走タイムが明確に速い選手はハンデが不利でも上位に評価されやすくなります。予想点はこの実質差を最重視(7割)し、3連率・2連率・直近3走成績を加味して算出したルールベースのスコアです。3連単予想・フォーメーション予想は予想点を強さとした確率計算による参考値です。フォーメーションは点数が増えるほど購入コストも増えます。投票の勝敗を保証するものではありません。
      </p>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 font-medium">{children}</th>;
}

function Td({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={`px-3 py-2 ${className}`}>{children}</td>;
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-6 py-16">
      <Link href="/" className="text-sm text-red-600 hover:underline">
        ← 会場・日付・レースを選び直す
      </Link>
      <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
        {message}
      </p>
    </div>
  );
}

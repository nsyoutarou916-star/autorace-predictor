import RaceSelectorForm from "@/app/race-selector-form";

export default function Home() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-16">
      <div>
        <h1 className="text-2xl font-bold">オートレース予想</h1>
        <p className="mt-2 text-sm text-black/60 dark:text-white/60">
          競走場・開催日・レース番号を選ぶと、公式サイトの出走表データから
          スコアリングした予想印(◎○▲△)を表示します。
        </p>
      </div>
      <RaceSelectorForm />
    </div>
  );
}

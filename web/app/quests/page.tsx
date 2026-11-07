import type { Metadata } from "next";

import QuestBoard from "@/components/quests/QuestBoard";
import { Eyebrow } from "@/components/ui";

export const metadata: Metadata = {
  title: "Quests | Vote Better",
  description: "Five small things to know before you vote: who represents you, how your seat voted, and how to check a fact yourself.",
};

export default function QuestsPage() {
  return (
    <div className="mx-auto w-full max-w-[860px] px-4 pb-14 pt-10 sm:px-6 sm:pt-14 lg:px-8">
      <header className="max-w-2xl">
        <Eyebrow>Quests</Eyebrow>
        <h1 className="mt-3 text-[clamp(2.2rem,5vw,3.4rem)] font-semibold leading-[1.04] tracking-[-0.035em] text-ink">Five things to know before you vote</h1>
        <p className="mt-3 text-[15px] leading-7 text-body">Each takes a minute. Finish them and you will know who represents you, how your seat voted, and how to check any fact yourself.</p>
      </header>
      <div className="mt-8"><QuestBoard /></div>
    </div>
  );
}

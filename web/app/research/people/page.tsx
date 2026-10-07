import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadResearchRoster } from "@/lib/research-roster";
import { loadDraftProfileIds } from "@/lib/draft-profile-preview";

export const metadata: Metadata = {
  title: "Draft MP directory | Vote Better",
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{ q?: string | string[] }>;
}

export default async function ResearchMembersPage({ searchParams }: PageProps) {
  if (process.env.NODE_ENV !== "development") notFound();
  const roster = await loadResearchRoster();
  const biographyIds = new Set(await loadDraftProfileIds());
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 80) : "";
  const matches = roster?.members.filter((member) =>
    `${member.name} ${member.constituency} ${member.state}`.toLocaleLowerCase("en-IN").includes(query.toLocaleLowerCase("en-IN")))
    .sort((a, b) => Number(biographyIds.has(b.id)) - Number(biographyIds.has(a.id)) ||
      a.name.localeCompare(b.name, "en-IN")) ?? [];

  return <div className="mx-auto w-full max-w-4xl px-4 pb-16 pt-10 sm:px-6 sm:pt-16">
    <Link href="/research/pin" className="text-sm font-semibold text-[#276b4e] hover:underline">← PIN research</Link>
    <header className="mt-8">
      <p className="text-xs font-extrabold uppercase tracking-[0.17em] text-[#91692d]">Local research preview</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-[-0.06em] text-[#19372d] sm:text-5xl">Draft MP directory</h1>
      <p className="mt-4 text-sm leading-6 text-[#607568]">{roster?.members.length ?? 0} imported Sansad records. {biographyIds.size} have collected biography drafts. These profiles and their links to PIN areas have not completed Vote Better review.</p>
    </header>
    <form action="/research/people" method="get" className="mt-8 flex gap-3">
      <label htmlFor="q" className="sr-only">Search name, constituency, or state</label>
      <input id="q" name="q" defaultValue={query} placeholder="Name, constituency, or state"
        className="min-h-12 min-w-0 flex-1 rounded-2xl border border-[#bfd3c3] bg-white px-4 text-base text-[#18372b] focus:border-[#28724f] focus:ring-2 focus:ring-[#c6e5cf]" />
      <button className="min-h-12 rounded-2xl bg-[#1c6047] px-5 text-sm font-bold text-white" type="submit">Search</button>
    </form>
    <p className="mt-5 text-sm text-[#607568]">{matches.length} matching records{matches.length > 40 ? ". Showing the first 40; search to narrow the list." : "."}</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      {matches.slice(0, 40).map((member) => <Link key={member.id} href={`/research/people/${member.id}`}
        className="rounded-2xl border border-[#dce6dc] bg-white px-5 py-4 hover:border-[#8bbf98]">
        <p className="font-semibold text-[#1f4532]">{member.name}</p>
        <p className="mt-1 text-sm text-[#688071]">{member.constituency}, {member.state}</p>
        {biographyIds.has(member.id) && <p className="mt-2 text-xs font-semibold text-amber-700">Biography draft available</p>}
      </Link>)}
    </div>
  </div>;
}

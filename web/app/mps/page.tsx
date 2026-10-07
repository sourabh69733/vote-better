import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { listPublicMps } from "@/lib/public-mps";

export const metadata: Metadata = { title: "MP profiles | Vote Better" };

interface PageProps { searchParams: Promise<{ q?: string | string[] }> }

export default async function MpDirectory({ searchParams }: PageProps) {
  if (process.env.NODE_ENV !== "development") notFound();
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 80) : "";
  const allProfiles = await listPublicMps();
  const profiles = allProfiles.filter((profile) =>
    `${profile.name} ${profile.constituency} ${profile.state} ${profile.party}`
      .toLocaleLowerCase("en-IN").includes(query.toLocaleLowerCase("en-IN")));
  return <div className="mx-auto w-full max-w-[1200px] px-4 pb-16 pt-10 sm:px-6 sm:pt-14">
    <header className="border-b border-[#dce6dc] pb-8">
      <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#347353]">Digital Sansad records</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-[-0.06em] text-[#19372d] sm:text-5xl">Explore MPs</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-[#607568]">{allProfiles.length} locally collected profiles. Each fact links to its official source and shows when we captured it. This preview is awaiting source reuse clearance.</p>
      <form action="/mps" method="get" className="mt-6 flex max-w-2xl gap-2">
        <label htmlFor="mp-search" className="sr-only">Search MPs by name, constituency, state or party</label>
        <input id="mp-search" name="q" defaultValue={query} placeholder="Name, constituency, state or party"
          className="min-h-12 min-w-0 flex-1 rounded-xl border border-[#bfd3c3] bg-white px-4 text-base text-[#18372b] focus:border-[#28724f]" />
        <button type="submit" className="min-h-12 rounded-xl bg-[#1c6047] px-5 text-sm font-bold text-white">Search</button>
      </form>
    </header>
    <p className="mt-6 text-sm text-[#607568]">{profiles.length} {profiles.length === 1 ? "profile" : "profiles"} found</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {profiles.map((profile) => <Link key={profile.memberId} href={`/mps/${profile.memberId}`}
        className="rounded-2xl border border-[#dce6dc] bg-white p-5 shadow-[0_8px_26px_rgba(28,64,40,.04)] hover:border-[#8bbf98]">
        <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#5e8268]">{profile.constituency}, {profile.state}</p>
        <h2 className="mt-3 text-xl font-semibold tracking-[-0.03em] text-[#19372d]">{profile.name}</h2>
        <p className="mt-1 text-sm text-[#607568]">{profile.party}</p>
        <p className="mt-4 text-xs font-semibold text-[#28724f]">Open sourced profile →</p>
      </Link>)}
    </div>
  </div>;
}

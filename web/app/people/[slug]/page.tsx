import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAreaForPerson } from "@/lib/civic-area";
import { formatShort, loadLokSabha2024, summaryOf } from "@/lib/lok-sabha-2024";
import { findCandidacy2024 } from "@/lib/mp-seat-link";
import { getParliamentaryDebates } from "@/lib/parliamentary-debates";
import { getParliamentaryWork } from "@/lib/parliamentary-work";
import { getJaipurVoteTraceId } from "@/lib/publication";
import { formatTermDuration } from "@/lib/term-duration";
import { getPersonProfile, getProfileSource, listPersonSlugs, type PersonProfile } from "@/lib/verified-profile";
import { ParliamentDebates } from "@/components/ParliamentDebates";
import { ParliamentQuestions } from "@/components/ParliamentQuestions";
import { Card, FactList, ProfileHeader, SeatResultBars, Tile, Timeline } from "@/components/profile/ProfileParts";
import ProfileTabs, { type ProfileTab } from "@/components/profile/ProfileTabs";
import SourceChip, { type ChipSource } from "@/components/profile/SourceChip";
import { sourceLabel } from "@/lib/source-label";
import SourceNote from "../../seats/SourceNote";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return listPersonSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const profile = getPersonProfile(slug);
  return { title: profile ? `${profile.name} | Vote Better` : "Profile not found" };
}

const day = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value)
  ? new Date(`${value}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
  : value;
const kindLabel = { career: "Public role", education: "Education", party: "Party role", work: "Work", election: "Election" } as const;
const rupees = (value: number) => `₹${formatShort(value)}`;

function chip(profile: PersonProfile, sourceId: string): ChipSource {
  const source = getProfileSource(profile, sourceId);
  return { label: sourceLabel(source.url, source.title), title: source.title, url: source.url, checkedOn: day(source.checkedOn) };
}

export default async function PersonPage({ params }: PageProps) {
  const { slug } = await params;
  const profile = getPersonProfile(slug);
  if (!profile) notFound();

  const data = loadLokSabha2024();
  const partyName = (code: string) => data.parties[code]?.name ?? code;
  const area = getAreaForPerson(slug);
  const office = profile.officeTerms.find((term) => !term.endedOn);
  const election = profile.candidacies[0];
  const eciRow = findCandidacy2024(profile.name, election?.election);
  const disclosure = profile.disclosures[0];
  const background = profile.background;
  const work = getParliamentaryWork(slug);
  const debates = getParliamentaryDebates(slug);
  const voteTraceId = getJaipurVoteTraceId(profile.slug);
  const party = office?.party ?? election?.party ?? (eciRow ? partyName(eciRow.candidate.party) : undefined);
  const eciChip: ChipSource | undefined = eciRow && {
    label: "ECI", title: "ECI 2024 results, report 33", url: data.source.url,
    locator: eciRow.candidate.locator.toLowerCase(), checkedOn: day(eciRow.candidate.reviewedAt.slice(0, 10)),
  };

  const seatLine = office ? `${office.constituency}, ${office.state}` : eciRow ? `${eciRow.seat.name}, ${eciRow.seat.state}` : area?.label ?? "";
  const result = eciRow ? summaryOf(eciRow.seat, eciRow.candidate, partyName) : "";
  const summary = office ? `Sitting Lok Sabha MP for ${seatLine}, in office for ${formatTermDuration(office.startedOn, office.reviewedOn)} as of ${day(office.reviewedOn)}. ${result}`.trim()
    : result || "A sourced public profile. Only checked records are shown.";
  const status = office ? { label: "Sitting MP", tone: "sitting" as const }
    : election?.status === "elected" ? { label: "Won", tone: "won" as const }
    : eciRow ? { label: `Lost · ${eciRow.candidate.rank} of ${eciRow.seat.candidates.length}`, tone: "lost" as const }
    : { label: election?.status === "contesting" ? "Contesting" : "Candidate", tone: "lost" as const };

  const educationValue = background?.educationDetail ?? disclosure?.education;
  const educationSource = background?.educationDetail ? background.sourceId : disclosure?.sourceId;
  const disclosureChip = disclosure ? chip(profile, disclosure.sourceId) : undefined;
  const pending = "Not in a checked record yet";

  const story = (
    <div className="grid gap-4">
      <Card title="Timeline">
        <Timeline
          items={[...profile.timeline].sort((a, b) => b.sortOn.localeCompare(a.sortOn)).map((event) => ({
            when: `${day(event.date)} · ${kindLabel[event.kind]}`,
            text: event.party ? `${event.title} (${event.party})` : event.title,
            source: chip(profile, event.sourceId),
            strong: event.kind === "election",
          }))}
          gap="Selected dated records, not a continuous employment history. A gap means we have not found a dated source, not that nothing happened."
        />
      </Card>
      <Card title="Who they are">
        <FactList facts={[
          ...(party ? [[office ? `Current party · checked ${day(office.reviewedOn)}` : `Party at ${election?.election.match(/\d{4}/)?.[0] ?? "recorded"} election`, party] as [string, string]] : []),
          ...(background?.educationDetail ? [["Education", background.educationDetail] as [string, string]] : []),
          ...(background?.workDescription ? [["Work", background.workDescription] as [string, string]] : []),
          ...(disclosure?.education && !background?.educationDetail ? [["Education declared", disclosure.education] as [string, string]] : []),
          ...(eciRow?.candidate.gender ? [["Gender", { female: "Female", male: "Male", third: "Third gender" }[eciRow.candidate.gender]] as [string, string]] : []),
        ]} />
        {background && <div className="mt-3"><SourceChip source={chip(profile, background.sourceId)} /></div>}
        {profile.publicProfiles.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {profile.publicProfiles.map((link) => {
              const source = getProfileSource(profile, link.sourceId);
              return <a key={link.sourceId} href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center rounded-full border border-[#bed6c4] px-3 text-sm font-semibold text-[#216146] hover:bg-[#eff7ef]">{link.label} ↗</a>;
            })}
          </div>
        )}
      </Card>
    </div>
  );

  const showWork = Boolean(profile.officeTerms.length || work || debates || profile.activities.length);
  const workTab = (
    <div className="grid gap-4">
      {profile.officeTerms.map((term) => (
        <Card key={`${term.title}-${term.startedOn}`} title={term.endedOn ? "Past office" : "Current office"}>
          <p className="font-semibold text-[#19372d]">{term.title}, {term.constituency}</p>
          <p className="text-sm">{term.party} · {day(term.startedOn)} to {term.endedOn ? day(term.endedOn) : "present"} · checked {day(term.reviewedOn)}</p>
          <div className="mt-2"><SourceChip source={chip(profile, term.statusSourceId)} /></div>
        </Card>
      ))}
      {(work || debates) && (
        <Card title="In Parliament">
          <p className="text-sm text-[#66796d]">A record shows a question was asked or a debate joined. It does not show that a project was delivered.</p>
          <div className="mt-4 grid gap-5">
            {debates && <ParliamentDebates work={debates} />}
            {work && <ParliamentQuestions work={work} />}
          </div>
        </Card>
      )}
      {profile.activities.length > 0 && (
        <Card title="Earlier sourced examples">
          <ol className="grid gap-4">
            {profile.activities.map((activity) => (
              <li key={activity.sourceId}>
                <p className="text-sm font-bold text-[#4c8063]">{day(activity.date)}</p>
                <p className="font-semibold text-[#19372d]">{activity.title}</p>
                <p className="text-sm">{activity.description}</p>
                <div className="mt-1"><SourceChip source={chip(profile, activity.sourceId)} /></div>
              </li>
            ))}
          </ol>
        </Card>
      )}
    </div>
  );

  const elections = (
    <Card title={election?.election ?? "Elections"}>
      {election ? (
        <p>
          {election.status[0].toUpperCase() + election.status.slice(1)}{election.party ? ` for ${election.party}` : ""}.
          {election.votes !== undefined ? ` ${election.votes.toLocaleString("en-IN")} votes in the official return.` : ""}
        </p>
      ) : <p>No election record is checked for this person yet.</p>}
      {election && <div className="mt-2"><SourceChip source={chip(profile, election.sourceId)} /></div>}
      {voteTraceId && <Link href={`/facts/${voteTraceId}`} className="mt-3 inline-block text-sm font-bold text-[#1d6547] underline decoration-[#9ec9a8] underline-offset-4">See how the vote total was checked</Link>}
      {eciRow && <SeatResultBars seat={eciRow.seat} highlight={eciRow.candidate} compareWith={eciRow.candidate.rank === 1 ? eciRow.seat.candidates[1] : eciRow.seat.candidates[0]} />}
    </Card>
  );

  const money = (
    <Card title="Money and cases">
      {disclosure ? (
        <>
          <p>Declared in the {disclosure.election} affidavit. These are values at filing time, not today.</p>
          <div className="mt-4">
            <FactList facts={[
              ...(disclosure.declaredAssetsRupees !== undefined ? [["Assets declared", `₹${disclosure.declaredAssetsRupees.toLocaleString("en-IN")} (${rupees(disclosure.declaredAssetsRupees)})`] as [string, string]] : []),
              ...(disclosure.declaredLiabilitiesRupees !== undefined ? [["Liabilities declared", `₹${disclosure.declaredLiabilitiesRupees.toLocaleString("en-IN")}`] as [string, string]] : []),
              ...(disclosure.declaredCases !== undefined ? [["Criminal cases declared", String(disclosure.declaredCases)] as [string, string]] : []),
              ...(disclosure.education ? [["Education declared", disclosure.education] as [string, string]] : []),
              ...(disclosure.ageAtFiling !== undefined ? [["Age at filing", String(disclosure.ageAtFiling)] as [string, string]] : []),
            ]} />
          </div>
          {disclosureChip && <div className="mt-3"><SourceChip source={disclosureChip} /></div>}
          <p className="mt-3 text-sm text-[#66796d]">A declared case is not a conviction.</p>
        </>
      ) : <p>No affidavit summary is checked for this person yet.</p>}
    </Card>
  );

  const sources = (
    <div className="grid gap-4">
      <Card title="Checked sources">
        <p className="text-sm">A selected record, not a complete account of this person or a judgment about performance.</p>
        <ul className="mt-3 grid gap-2">
          {profile.sources.map((source) => (
            <li key={source.id} className="flex flex-col justify-between gap-1 border-b border-[#eef3ed] pb-2 text-sm last:border-0 sm:flex-row sm:gap-4">
              <a href={source.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#1d6547] underline decoration-[#9ec9a8] underline-offset-4">{source.title} ↗</a>
              <span className="shrink-0 text-[#66796d]">Checked {day(source.checkedOn)}</span>
            </li>
          ))}
        </ul>
      </Card>
      {eciRow && <SourceNote data={data} rows={eciRow.candidate.locator.toLowerCase()} reviewedAt={eciRow.candidate.reviewedAt} />}
    </div>
  );

  const tabs: ProfileTab[] = [
    { id: "story", label: "Story", content: story },
    ...(showWork ? [{ id: "work", label: "Work", content: workTab }] : []),
    { id: "elections", label: "Elections", content: elections },
    { id: "money", label: "Money and cases", content: money },
    { id: "sources", label: "Sources", content: sources },
  ];

  return (
    <div className="mx-auto w-full max-w-[1000px] px-4 pb-14 pt-8 sm:px-6 sm:pt-12 lg:px-8">
      <nav className="text-sm font-semibold text-[#286b4e]" aria-label="Breadcrumb">
        <Link href="/seats" className="hover:underline">All seats</Link>
        {eciRow && (
          <>
            <span className="mx-2 text-[#a3b7a7]" aria-hidden="true">/</span>
            <Link href={`/seats/${eciRow.seat.stateSlug}/${eciRow.seat.slug}`} className="hover:underline">{eciRow.seat.name}</Link>
          </>
        )}
      </nav>

      <ProfileHeader
        eyebrow={office ? `Member of Parliament · ${seatLine} · 18th Lok Sabha` : `${seatLine} · ${election?.election.match(/\d{4}/)?.[0] ?? ""} Lok Sabha`.trim()}
        name={profile.name}
        subtitle={[party, eciRow?.candidate.partySymbol].filter(Boolean).join(" · ")}
        status={status}
        summary={summary}
      >
        <p className="mt-3 text-xs text-[#7a8c7e]">Core facts reviewed {day(profile.reviewedOn)}. Hand-checked profile.</p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {disclosure?.ageAtFiling !== undefined
            ? <Tile label="Age at 2024 filing" value={String(disclosure.ageAtFiling)} source={disclosureChip} />
            : eciRow?.candidate.age ? <Tile label="Age at 2024 election" value={String(eciRow.candidate.age)} source={eciChip} />
            : <Tile label="Age" value="Not yet" pending={pending} />}
          {educationValue && educationSource ? <Tile label="Education" value={educationValue} source={chip(profile, educationSource)} /> : <Tile label="Education" value="Not yet" pending={pending} />}
          {disclosure?.declaredAssetsRupees !== undefined
            ? <Tile label="Declared assets" value={rupees(disclosure.declaredAssetsRupees)} source={disclosureChip} />
            : <Tile label="Declared assets" value="Not yet" pending="From the 2024 affidavit" />}
          {disclosure?.declaredCases !== undefined
            ? <Tile label="Declared cases" value={String(disclosure.declaredCases)} source={disclosureChip} />
            : <Tile label="Declared cases" value="Not yet" pending="From the 2024 affidavit" />}
        </div>
      </ProfileHeader>

      <div className="mt-4">
        <ProfileTabs tabs={tabs} />
      </div>
    </div>
  );
}

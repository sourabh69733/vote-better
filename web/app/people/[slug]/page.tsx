import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadLokSabha2024, seatHref, summaryOf } from "@/lib/lok-sabha-2024";
import { findCandidacy2024 } from "@/lib/mp-seat-link";
import { getParliamentaryDebates } from "@/lib/parliamentary-debates";
import { getParliamentaryWork } from "@/lib/parliamentary-work";
import { getJaipurVoteTraceId } from "@/lib/publication";
import { eciChip, moneyStats, partyOf, readableTitle, resultStats, topCounts, type ProfileModel, type ProfileStat, type ProfileWork } from "@/lib/profile-model";
import { sourceLabel } from "@/lib/source-label";
import { formatTermDuration } from "@/lib/term-duration";
import { getPersonProfile, getProfileSource, listPersonSlugs, type PersonProfile } from "@/lib/verified-profile";
import type { ChipSource } from "@/components/profile/SourceChip";
import ProfileView from "@/components/profile/ProfileView";

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
  const office = profile.officeTerms.find((term) => !term.endedOn);
  const election = profile.candidacies[0];
  const electionYear = election?.election.match(/\d{4}/)?.[0];
  const row = findCandidacy2024(profile.name, election?.election);
  const disclosure = profile.disclosures[0];
  const background = profile.background;
  const questions = getParliamentaryWork(slug);
  const debates = getParliamentaryDebates(slug);
  const voteTrace = getJaipurVoteTraceId(profile.slug);
  const eci = row ? eciChip(data, row.candidate, day(row.candidate.reviewedAt.slice(0, 10))) : undefined;
  const partyText = office?.party ?? election?.party ?? (row ? partyName(row.candidate.party) : undefined);
  const seatLine = office ? `${office.constituency}, ${office.state}` : row ? `${row.seat.name}, ${row.seat.state}` : "";

  const result = row ? summaryOf(row.seat, row.candidate, partyName) : "";
  const headline = office
    ? `Sitting MP for ${seatLine}, ${formatTermDuration(office.startedOn, office.reviewedOn)} into the term as of ${day(office.reviewedOn)}. ${result}`.trim()
    : result || "A hand-checked public profile. Only checked records are shown.";

  const money = disclosure ? {
    election: disclosure.election.match(/\d{4}/)?.[0] ?? disclosure.election,
    assets: disclosure.declaredAssetsRupees, liabilities: disclosure.declaredLiabilitiesRupees,
    cases: disclosure.declaredCases, education: disclosure.education, age: disclosure.ageAtFiling,
    source: chip(profile, disclosure.sourceId),
  } : undefined;
  const hasMoney = money && [money.assets, money.liabilities, money.cases, money.education, money.age].some((value) => value !== undefined);

  const work: ProfileWork | undefined = office || questions || debates ? {
    ...(questions ? {
      questions: {
        total: questions.questions.length,
        bySession: questions.sessions.map((session) => ({ label: `Session ${session.session}`, count: session.count })),
        topMinistries: topCounts(questions.questions.map((question) => readableTitle(question.ministry)), 5),
        latest: questions.questions.slice(0, 4).map((question) => ({ date: day(question.date), subject: question.subject, url: question.sourceUrl })),
        directoryUrl: questions.directoryUrl, collectedOn: day(questions.collectedOn),
      },
    } : {}),
    ...(debates ? {
      debates: {
        total: debates.totalRecords,
        byCategory: topCounts(debates.records.map((record) => readableTitle(record.category)), 4),
        latest: [...debates.records].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3).map((record) => ({ date: day(record.date), title: record.title, url: record.sourceUrl })),
        collectedOn: day(debates.collectedOn),
      },
    } : {}),
    offices: profile.officeTerms.map((term) => ({
      title: term.title, current: !term.endedOn, source: chip(profile, term.statusSourceId),
      detail: `${term.constituency} · ${term.party} · ${day(term.startedOn)} to ${term.endedOn ? day(term.endedOn) : "present"}, checked ${day(term.reviewedOn)}`,
    })),
    note: "A question or debate record shows the MP raised a matter. It does not show that a project was delivered.",
  } : undefined;

  const stats: ProfileStat[] = [
    ...(row && eci ? resultStats(row.seat, row.candidate, eci).filter((stat) => stat.id === "share") : []),
    ...moneyStats(hasMoney ? money : undefined),
    ...(questions ? [{ id: "questions", label: "Questions asked", value: String(questions.questions.length), note: `Sessions ${questions.sessions[0].session}-${questions.sessions.at(-1)!.session}` }] : []),
    ...(!questions && money?.age !== undefined ? [{ id: "age", label: "Age at filing", value: String(money.age), source: money.source }] : []),
  ].slice(0, 4);

  const model: ProfileModel = {
    name: profile.name,
    party: partyOf(partyText, row?.candidate.party, row?.candidate.partySymbol),
    role: office ? { label: "Sitting MP", tone: "sitting" }
      : election?.status === "elected" ? { label: `Won ${electionYear ?? ""}`.trim(), tone: "won" }
      : row ? { label: `Lost · ${row.candidate.rank} of ${row.seat.candidates.length}`, tone: "lost" }
      : { label: election?.status === "contesting" ? "Contesting" : "Candidate", tone: "candidate" },
    kicker: office ? "Member of Parliament · 18th Lok Sabha" : `Lok Sabha ${electionYear ?? ""} candidate`.replace("  ", " "),
    place: seatLine,
    headline,
    breadcrumb: [{ label: "All seats", href: "/seats" }, ...(row ? [{ label: row.seat.name, href: seatHref(row.seat) }] : [])],
    ...(row ? { contest: { seat: row.seat, candidate: row.candidate } } : {}),
    stats,
    work,
    ...(hasMoney ? { money } : {}),
    timeline: [...profile.timeline].sort((a, b) => b.sortOn.localeCompare(a.sortOn)).map((event) => ({
      when: `${day(event.date)} · ${kindLabel[event.kind]}`,
      text: event.party ? `${event.title} (${event.party})` : event.title,
      source: chip(profile, event.sourceId), strong: event.kind === "election",
    })),
    timelineNote: "Selected dated records, not a continuous employment history. A gap means we have not found a dated source, not that nothing happened.",
    facts: [
      ...(partyText ? [[office ? `Current party · checked ${day(office.reviewedOn)}` : `Party at ${electionYear ?? "recorded"} election`, partyText] as [string, string]] : []),
      ...(background?.educationDetail ? [["Education", background.educationDetail] as [string, string]] : []),
      ...(background?.workDescription ? [["Work", background.workDescription] as [string, string]] : []),
      ...(election?.votes !== undefined ? [["Votes in the official return", election.votes.toLocaleString("en-IN")] as [string, string]] : []),
    ],
    links: profile.publicProfiles.map((item) => ({ label: item.label, url: getProfileSource(profile, item.sourceId).url })),
    related: voteTrace ? [{ label: "See how the vote total was checked against the official return", href: `/facts/${voteTrace}` }] : [],
    sources: profile.sources.map((source) => ({ title: source.title, url: source.url, checkedOn: day(source.checkedOn) })),
    coming: hasMoney ? [] : ["declared assets and cases"],
  };

  return <ProfileView model={model} data={data} />;
}

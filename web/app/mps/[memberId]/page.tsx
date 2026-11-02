import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findAdrWinner, readAdrWinners } from "@/lib/adr-winners";
import { listAreaOverviews } from "@/lib/civic-area";
import { formatShort, requireResults, seatHref, summaryOf } from "@/lib/results";
import { sortableMpName } from "@/lib/mp-directory";
import { linkMpToSeat } from "@/lib/mp-seat-link";
import { getMemberQuestions } from "@/lib/parliamentary-work-local";
import { eciChip, moneyStats, partyOf, questionsForProfile, resultStats, type ProfileModel, type ProfileMoney, type ProfileStat } from "@/lib/profile-model";
import { getPublicMp, publicMpFact, type PublicMp, type PublicMpFact } from "@/lib/public-mps";
import type { ChipSource } from "@/components/profile/SourceChip";
import ProfileView from "@/components/profile/ProfileView";

interface PageProps { params: Promise<{ memberId: string }> }

type Position = { title: string; period?: string };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { memberId } = await params;
  const profile = /^\d+$/.test(memberId) ? await getPublicMp(Number(memberId)) : undefined;
  return { title: profile ? `${sortableMpName(profile.name)}, MP for ${profile.constituency} | Vote Better` : "MP profile | Vote Better" };
}

const day = (value: string) => new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

function ageOn(birthDate: string, today = new Date()) {
  const [year, month, date] = birthDate.split("-").map(Number);
  const passed = today.getUTCMonth() + 1 > month || (today.getUTCMonth() + 1 === month && today.getUTCDate() >= date);
  return today.getUTCFullYear() - year - (passed ? 0 : 1);
}

// Elections, terms and offices tell the story. Committee seats belong under Work.
const milestone = /elected|^member, (lok|rajya) sabha|minister|speaker|chairperson|leader|member, .*legislative (assembly|council)/i;
const lokSabhaTerm = /^(re-)?elected to \d+(st|nd|rd|th) lok sabha/i;

const text = (fact: PublicMpFact | undefined) => (fact && typeof fact.value === "string" ? fact.value : undefined);

function sansad(profile: PublicMp, fact: PublicMpFact | undefined): ChipSource | undefined {
  return fact && {
    label: "Sansad", title: "Digital Sansad member record", url: `https://sansad.in/ls/members/biography/${profile.memberId}`,
    locator: fact.source.locator.replace(/^member\[mpsno=\d+\]\./, "field "), checkedOn: day(profile.sourceCheckedAt),
  };
}

export default async function MpProfilePage({ params }: PageProps) {
  const { memberId } = await params;
  const profile = /^\d+$/.test(memberId) ? await getPublicMp(Number(memberId)) : undefined;
  if (!profile) notFound();
  const data = requireResults("lok-sabha-2024");
  const partyName = (code: string) => data.parties[code]?.name ?? code;
  const name = sortableMpName(profile.name);
  const birth = publicMpFact(profile, "person.birthDate");
  const education = publicMpFact(profile, "person.educationStatement");
  const profession = publicMpFact(profile, "person.profession");
  const positionsFact = publicMpFact(profile, "office.positionsHeld");
  const positions = (Array.isArray(positionsFact?.value) ? positionsFact.value : []) as Position[];
  const link = linkMpToSeat(profile);
  const winner = link.status === "won-2024" ? link.candidate : null;
  const seat = link.status === "unlinked" ? undefined : link.seat;
  const eci = winner ? eciChip(data, winner, day(winner.reviewedAt)) : undefined;
  const curated = listAreaOverviews().flatMap(({ links }) => links).find((item) => item.person.name.toLowerCase() === name.toLowerCase())?.person;
  const seatLine = `${profile.constituency}, ${profile.state}`;
  const terms = positions.filter((position) => lokSabhaTerm.test(position.title)).length;
  const educationText = text(education)?.replace(/^[\s;,.]+|[\s;,]+$/g, "") || undefined;
  const questions = getMemberQuestions(profile.memberId);
  const questionNote = questions && !questions.questions.length
    ? "No questions are listed under this member's name. Ministers and the Speaker answer questions in the House rather than ask them."
    : undefined;
  const adr = await readAdrWinners();
  const declared = adr && findAdrWinner(adr.winners, profile);
  const adrSource = declared && adr ? {
    label: "ADR", title: `ADR / MyNeta summary of ${declared.name}'s 2024 affidavit`, url: declared.sourceUrl,
    locator: "Self-declared figures compiled by ADR from the ECI affidavit. ECI's filing is the record if they differ.", checkedOn: day(adr.checkedOn),
  } : undefined;
  const money: ProfileMoney | undefined = declared ? {
    election: declared.byElection ? "2024 bye-election" : "2024",
    ...(declared.assets !== null ? { assets: declared.assets } : {}),
    ...(declared.liabilities !== null ? { liabilities: declared.liabilities } : {}),
    ...(declared.cases !== null ? { cases: declared.cases } : {}),
    ...(declared.education ? { education: declared.education } : {}),
    ...(declared.age !== null ? { age: declared.age } : {}),
    source: adrSource,
  } : undefined;

  const summary = link.status === "won-2024"
    ? `Sitting MP for ${seatLine}. ${winner ? summaryOf(link.seat, winner, partyName) : "Elected unopposed in 2024."}`
    : link.status === "by-election" ? `Sitting MP for ${seatLine}. ${link.note}` : `Sitting MP for ${seatLine}.`;

  const stats: ProfileStat[] = [
    ...(winner && eci && seat ? resultStats(seat, winner, eci).filter((stat) => stat.id !== "rank") : []),
    ...moneyStats(money),
    ...(terms ? [{ id: "terms", label: "Lok Sabha terms", value: String(terms), note: terms > 1 ? "including this one" : "first term", source: sansad(profile, positionsFact) }] : []),
    ...(text(birth) ? [{ id: "age", label: "Age", value: String(ageOn(text(birth)!)), note: `Born ${day(text(birth)!)}`, source: sansad(profile, birth) }] : []),
  ];

  const timeline = positions
    .filter((position) => milestone.test(position.title) && !(winner && /^elected to 18th lok sabha$/i.test(position.title)))
    .map((position) => ({ when: position.period ?? "Date not stated", text: position.title, source: sansad(profile, positionsFact), strong: /lok sabha/i.test(position.title) }));
  if (winner && eci && seat) {
    timeline.unshift({ when: "2024 · Lok Sabha election", text: `Won ${seat.name} with ${formatShort(winner.votes)} votes (${winner.shareOfValidVotes.toFixed(1)}%).`, source: eci, strong: true });
  }

  const model: ProfileModel = {
    name, officialName: profile.name,
    party: partyOf(profile.party, winner?.party, winner?.partySymbol),
    role: { label: "Sitting MP", tone: "sitting" },
    kicker: "Member of Parliament · 18th Lok Sabha",
    place: seatLine,
    headline: summary,
    breadcrumb: [{ label: "All MPs", href: "/mps" }, ...(seat ? [{ label: seat.name, href: seatHref(seat) }] : [])],
    ...(seat ? { contest: { seat, candidate: winner ?? undefined, ...(link.status === "by-election" ? { note: `${link.note} By-election results are not collected yet; this is the 2024 general election.` } : {}) } } : {}),
    stats,
    work: positions.length || questions ? {
      positions,
      ...(questions?.questions.length ? { questions: questionsForProfile(questions, day) } : {}),
      note: questionNote ?? (questions ? "Attendance and debates for this MP are not collected yet." : curated ? undefined : "Attendance, questions and debates for this MP are not collected yet."),
    } : undefined,
    money,
    timeline,
    timelineNote: "From the positions Digital Sansad lists for this member.",
    facts: [
      ["Name in Sansad record", profile.name],
      ...(text(profession) ? [["Profession", text(profession)!] as [string, string]] : []),
      ...(educationText ? [["Education", educationText] as [string, string]] : []),
    ],
    links: profile.facts.filter((fact) => fact.predicate === "person.socialProfile" && typeof fact.value === "string")
      .map((fact) => ({ label: new URL(fact.value as string).hostname.replace(/^www\./, ""), url: fact.value as string })),
    related: curated ? [{ label: `Open ${curated.name}'s hand-checked profile: affidavit, questions and debates`, href: `/people/${curated.slug}` }] : [],
    sources: [
      { title: "Lok Sabha member list, Digital Sansad", url: `https://sansad.in/ls/members/biography/${profile.memberId}`, checkedOn: day(profile.rosterSource.capturedAt) },
      { title: "Member biography fields, Digital Sansad", url: `https://sansad.in/ls/members/biography/${profile.memberId}`, checkedOn: day(profile.sourceCheckedAt) },
      ...(adrSource ? [
        { title: adrSource.title, url: adrSource.url, checkedOn: adrSource.checkedOn },
        { title: "Candidate affidavit portal, Election Commission of India", url: "https://affidavit.eci.gov.in/", checkedOn: adrSource.checkedOn },
      ] : []),
    ],
    coming: [...(money?.assets === undefined ? ["declared assets"] : []), ...(money?.cases === undefined ? ["declared cases"] : []), ...(curated ? [] : ["questions, debates and attendance"])],
  };

  return <ProfileView model={model} data={data} />;
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { listAreaOverviews } from "@/lib/civic-area";
import { formatShort, loadLokSabha2024, summaryOf } from "@/lib/lok-sabha-2024";
import { sortableMpName } from "@/lib/mp-directory";
import { linkMpToSeat } from "@/lib/mp-seat-link";
import { getPublicMp, publicMpFact, type PublicMp, type PublicMpFact } from "@/lib/public-mps";
import { Card, FactList, ProfileHeader, SeatResultBars, Tile, Timeline, type TimelineItem } from "@/components/profile/ProfileParts";
import ProfileTabs, { type ProfileTab } from "@/components/profile/ProfileTabs";
import type { ChipSource } from "@/components/profile/SourceChip";
import SourceNote from "../../seats/SourceNote";

interface PageProps { params: Promise<{ memberId: string }> }

type Position = { title: string; period?: string; validFrom?: { value: string; precision: string } };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { memberId } = await params;
  const profile = /^\d+$/.test(memberId) ? await getPublicMp(Number(memberId)) : undefined;
  return { title: profile ? `${sortableMpName(profile.name)}, MP for ${profile.constituency} | Vote Better` : "MP profile | Vote Better" };
}

const day = (value: string) => new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

function ageOn(birthDate: string, today = new Date()) {
  const [year, month, date] = birthDate.split("-").map(Number);
  const birthdayPassed = today.getUTCMonth() + 1 > month || (today.getUTCMonth() + 1 === month && today.getUTCDate() >= date);
  return today.getUTCFullYear() - year - (birthdayPassed ? 0 : 1);
}

// Elections, terms and offices tell the story. Committee seats belong under Work.
const milestone = /elected|^member, (lok|rajya) sabha|minister|speaker|chairperson|leader|member, .*legislative (assembly|council)/i;

function text(fact: PublicMpFact | undefined) {
  return fact && typeof fact.value === "string" ? fact.value : undefined;
}

function sansadSource(profile: PublicMp, fact: PublicMpFact | undefined): ChipSource | undefined {
  if (!fact) return undefined;
  return {
    label: "Sansad", title: "Digital Sansad member record", url: `https://sansad.in/ls/members/biography/${profile.memberId}`,
    locator: fact.source.locator.replace(/^member\[mpsno=\d+\]\./, "field "), checkedOn: day(profile.sourceCheckedAt),
  };
}

export default async function MpProfilePage({ params }: PageProps) {
  const { memberId } = await params;
  const profile = /^\d+$/.test(memberId) ? await getPublicMp(Number(memberId)) : undefined;
  if (!profile) notFound();
  const data = loadLokSabha2024();
  const partyName = (code: string) => data.parties[code]?.name ?? code;
  const name = sortableMpName(profile.name);
  const officialUrl = `https://sansad.in/ls/members/biography/${profile.memberId}`;
  const birth = publicMpFact(profile, "person.birthDate");
  const education = publicMpFact(profile, "person.educationStatement");
  const profession = publicMpFact(profile, "person.profession");
  const positionsFact = publicMpFact(profile, "office.positionsHeld");
  const positions = (Array.isArray(positionsFact?.value) ? positionsFact.value : []) as Position[];
  const socials = profile.facts.filter((fact) => fact.predicate === "person.socialProfile" && typeof fact.value === "string");
  const link = linkMpToSeat(profile);
  const winner = link.status === "won-2024" ? link.candidate : null;
  const curated = listAreaOverviews().flatMap(({ links }) => links).find((item) => item.person.name.toLowerCase() === name.toLowerCase())?.person;

  const seatLine = `${profile.constituency}, ${profile.state}`;
  const summary = link.status === "won-2024"
    ? (winner ? `Sitting Lok Sabha MP for ${seatLine}. ${summaryOf(link.seat, winner, partyName)}` : `Sitting Lok Sabha MP for ${seatLine}. Elected unopposed in 2024.`)
    : link.status === "by-election" ? `Sitting Lok Sabha MP for ${seatLine}. ${link.note}` : `Sitting Lok Sabha MP for ${seatLine}.`;

  const eci: ChipSource | undefined = winner ? {
    label: "ECI", title: "ECI 2024 results, report 33", url: data.source.url,
    locator: winner.locator.toLowerCase(), checkedOn: day(winner.reviewedAt),
  } : undefined;
  const positionsSource = sansadSource(profile, positionsFact);
  // With an ECI result, Sansad's "Elected to 18th Lok Sabha" repeats it.
  const milestones: TimelineItem[] = positions.filter((position) => milestone.test(position.title) &&
    !(winner && /^elected to 18th lok sabha$/i.test(position.title))).map((position) => ({
    when: position.period ?? "Date not stated", text: position.title, source: positionsSource,
    strong: /18th lok sabha/i.test(position.title),
  }));
  if (winner && eci) {
    milestones.unshift({ when: "2024 · Lok Sabha election", strong: true, source: eci,
      text: `Won ${link.status === "won-2024" ? link.seat.name : profile.constituency} with ${formatShort(winner.votes)} votes (${winner.shareOfValidVotes.toFixed(2)}%).` });
  }
  const educationText = text(education)?.replace(/^[\s;,.]+|[\s;,]+$/g, "") || undefined;

  const story = (
    <div className="grid gap-4">
      <Card title="Timeline">
        {milestones.length ? (
          <Timeline items={milestones.slice(0, 8)} gap={milestones.length > 8 ? `${milestones.length - 8} earlier entries are under Work.` : undefined} />
        ) : <p>Sansad does not list elections or offices for this member yet.</p>}
      </Card>
      <Card title="Who they are">
        <FactList facts={[
          ["Name in Sansad record", profile.name],
          ["Party", profile.party],
          ...(text(profession) ? [["Profession", text(profession)!] as [string, string]] : []),
          ...(educationText ? [["Education", educationText] as [string, string]] : []),
          ...(text(birth) ? [["Born", day(text(birth)!)] as [string, string]] : []),
        ]} />
        {socials.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {socials.map((fact) => (
              <a key={fact.source.locator} href={fact.value as string} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center rounded-full border border-[#bed6c4] px-3 text-sm font-semibold text-[#216146] hover:bg-[#eff7ef]">
                {new URL(fact.value as string).hostname.replace(/^www\./, "")} ↗
              </a>
            ))}
          </div>
        )}
      </Card>
    </div>
  );

  const work = (
    <div className="grid gap-4">
      <Card title={`Positions and committees (${positions.length})`}>
        {positions.length ? (
          <ol className="grid gap-2">
            {positions.map((position, index) => (
              <li key={`${position.title}-${index}`} className="flex flex-col justify-between gap-1 border-b border-[#eef3ed] pb-2 text-sm last:border-0 sm:flex-row sm:gap-4">
                <span className="font-semibold text-[#19372d]">{position.title}</span>
                <span className="shrink-0 text-[#66796d]">{position.period ?? "Date not stated"}</span>
              </li>
            ))}
          </ol>
        ) : <p>Sansad lists no positions for this member.</p>}
        <a href={officialUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block text-sm font-bold text-[#1d6547] underline decoration-[#9ec9a8] underline-offset-4">Check on Digital Sansad ↗</a>
      </Card>
      <Card title="Attendance, questions and debates">
        {curated ? (
          <p>These are on the checked profile.{" "}
            <Link href={`/people/${curated.slug}`} className="font-bold text-[#1d6547] underline decoration-[#9ec9a8] underline-offset-4">Open {curated.name}&apos;s parliamentary work</Link>
          </p>
        ) : <p>Not collected for this MP yet. They come from Parliament&apos;s own records.</p>}
      </Card>
    </div>
  );

  const elections = (
    <Card title={link.status === "unlinked" ? "Elections" : `${link.seat.name}, 2024`}>
      {link.status === "won-2024" && winner && <SeatResultBars seat={link.seat} highlight={winner} compareWith={link.seat.candidates[1]} />}
      {link.status === "won-2024" && !winner && <p>Elected unopposed. No vote was held in {link.seat.name}.</p>}
      {link.status === "by-election" && (
        <>
          <p>{link.note} By-election results are not collected yet. This is the 2024 general election result for the seat.</p>
          <SeatResultBars seat={link.seat} />
        </>
      )}
      {link.status === "unlinked" && <p>This MP is not yet linked to an election result.</p>}
    </Card>
  );

  const tabs: ProfileTab[] = [
    { id: "story", label: "Story", content: story },
    { id: "work", label: "Work", content: work },
    { id: "elections", label: "Elections", content: elections },
    {
      id: "money", label: "Money and cases", content: (
        <Card title="Money and cases">
          <p>Every candidate files a sworn affidavit with assets, liabilities, education and pending criminal cases. These are not collected for this profile yet.</p>
          <p className="mt-3 text-sm text-[#66796d]">When added, cases will be shown as declared by the candidate. A declared case is not a conviction.</p>
        </Card>
      ),
    },
    {
      id: "sources", label: "Sources", content: (
        <div className="grid gap-4">
          <Card title="Digital Sansad">
            <p>Name, party, seat and status from the Lok Sabha member list, captured {day(profile.rosterSource.capturedAt)}. Biography fields checked against saved Sansad responses on {day(profile.sourceCheckedAt)}. This does not independently confirm every claim.</p>
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer font-semibold text-[#216146]">Field by field</summary>
              <ul className="mt-2 grid gap-1 break-all text-[#5f7465]">
                {profile.facts.filter((fact) => fact.predicate !== "person.photoUrl").map((fact) => (
                  <li key={`${fact.predicate}-${fact.source.locator}`}>{fact.source.locator} · captured {day(fact.source.capturedAt)} · {fact.source.contentHash.slice(0, 19)}…</li>
                ))}
              </ul>
            </details>
            <a href={officialUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-bold text-[#1d6547] underline decoration-[#9ec9a8] underline-offset-4">Open on Digital Sansad ↗</a>
          </Card>
          {link.status !== "unlinked" && <SourceNote data={data} rows={winner?.locator.toLowerCase()} reviewedAt={winner?.reviewedAt} />}
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[1000px] px-4 pb-14 pt-8 sm:px-6 sm:pt-12 lg:px-8">
      <nav className="text-sm font-semibold text-[#286b4e]" aria-label="Breadcrumb">
        <Link href="/mps" className="hover:underline">All MPs</Link>
        {link.status !== "unlinked" && (
          <>
            <span className="mx-2 text-[#a3b7a7]" aria-hidden="true">/</span>
            <Link href={`/seats/${link.seat.stateSlug}/${link.seat.slug}`} className="hover:underline">{link.seat.name}</Link>
          </>
        )}
      </nav>

      <ProfileHeader
        eyebrow={`Member of Parliament · ${seatLine} · 18th Lok Sabha`}
        name={name}
        subtitle={`${profile.party}${winner?.partySymbol ? ` · ${winner.partySymbol}` : ""}`}
        status={{ label: "Sitting MP", tone: "sitting" }}
        summary={summary}
      >
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {text(birth) ? <Tile label="Age" value={String(ageOn(text(birth)!))} source={sansadSource(profile, birth)} /> : <Tile label="Age" value="Not listed" pending="Not in Sansad record" />}
          {educationText ? <Tile label="Education" value={educationText} source={sansadSource(profile, education)} /> : <Tile label="Education" value="Not listed" pending="Not in Sansad record" />}
          <Tile label="Declared assets" value="Not yet" pending="From the 2024 affidavit" />
          <Tile label="Declared cases" value="Not yet" pending="From the 2024 affidavit" />
        </div>
      </ProfileHeader>

      <div className="mt-4">
        <ProfileTabs tabs={tabs} />
      </div>
    </div>
  );
}

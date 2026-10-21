import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { listAreaOverviews } from "@/lib/civic-area";
import { candidateHref, formatNumber, getSeat, loadLokSabha2024, marginOf } from "@/lib/lok-sabha-2024";
import SourceNote from "../../SourceNote";

interface PageProps {
  params: Promise<{ state: string; seat: string }>;
}

export function generateStaticParams() {
  return loadLokSabha2024().seats.map((seat) => ({ state: seat.stateSlug, seat: seat.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { state, seat: slug } = await params;
  const seat = getSeat(state, slug);
  if (!seat) return { title: "Seat not found" };
  const winner = seat.unopposed?.winner ?? seat.candidates[0]?.name;
  return {
    title: `${seat.name}, ${seat.state}: 2024 Lok Sabha result | Vote Better`,
    description: `${winner} won ${seat.name} in 2024. See every candidate, their votes and the official ECI source.`,
  };
}

const reservationLabel: Record<string, string> = { GEN: "General seat", SC: "Reserved for Scheduled Castes", ST: "Reserved for Scheduled Tribes" };

export default async function SeatPage({ params }: PageProps) {
  const { state, seat: slug } = await params;
  const seat = getSeat(state, slug);
  if (!seat) notFound();
  const data = loadLokSabha2024();
  const party = (code: string) => data.parties[code]?.name ?? code;
  // Curated areas add the office holder's work. Match them by seat name and state.
  const curated = listAreaOverviews().find(({ area }) => area.name.toLowerCase() === seat.name.toLowerCase() && area.state === seat.state);

  const winner = seat.candidates[0];
  const margin = winner ? marginOf(seat, winner) : null;
  const turnout = seat.electors && seat.votesPolled ? (seat.votesPolled / seat.electors) * 100 : null;
  const names = new Map<string, number>();
  for (const candidate of seat.candidates) names.set(candidate.name, (names.get(candidate.name) ?? 0) + 1);
  const rowNumbers = seat.candidates.map((candidate) => Number(candidate.locator.replace("Worksheet, row ", "")));
  const rows = rowNumbers.length ? `worksheet rows ${Math.min(...rowNumbers)} to ${Math.max(...rowNumbers)}` : undefined;

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 pb-14 pt-8 sm:px-6 sm:pt-12 lg:px-8">
      <nav className="text-sm font-semibold text-[#286b4e]" aria-label="Breadcrumb">
        <Link href="/seats" className="hover:underline">All seats</Link>
        <span className="mx-2 text-[#a3b7a7]" aria-hidden="true">/</span>
        <Link href={`/seats?q=${encodeURIComponent(seat.state)}`} className="hover:underline">{seat.state}</Link>
      </nav>

      <header className="mt-6">
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#2a7658]">Lok Sabha seat {seat.number} · {seat.state}</p>
        <h1 className="mt-3 text-[clamp(2.4rem,6vw,4.2rem)] font-semibold leading-[1.02] tracking-[-0.07em] text-[#19372d]">{seat.name}</h1>
        <p className="mt-3 text-sm text-[#66796d]">{reservationLabel[seat.reservation] ?? seat.reservation} · 2024 general election</p>
      </header>

      {seat.unopposed ? (
        <section className="mt-8 rounded-[24px] border border-[#dce6dc] bg-white p-6 sm:p-8">
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#4c8063]">Elected unopposed</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#18372b]">{seat.unopposed.winner}</h2>
          <p className="mt-1 text-[#4f6455]">{party(seat.unopposed.party)}</p>
          <p className="mt-4 max-w-2xl text-[15px] leading-7 text-[#43594a]">
            No vote was held. {seat.unopposed.nominated} people filed nominations, {seat.unopposed.rejected} were rejected and {seat.unopposed.withdrawn} withdrew, leaving one candidate.
          </p>
        </section>
      ) : winner && (
        <section className="mt-8 overflow-hidden rounded-[24px] border border-[#dce6dc] bg-white" aria-labelledby="winner-heading">
          <div className="grid gap-6 p-6 sm:p-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#4c8063]">Won the seat</p>
              <h2 id="winner-heading" className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#18372b]">{winner.name}</h2>
              <p className="mt-1 text-[#4f6455]">{party(winner.party)}</p>
              {margin?.kind === "won" && (
                <p className="mt-4 text-[15px] leading-7 text-[#43594a]">
                  Won by <strong className="text-[#19372d]">{formatNumber(margin.votes)} votes</strong> over {margin.other.name} ({margin.other.party}).
                </p>
              )}
            </div>
            <Link href={candidateHref(seat, winner)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#1c6047] px-5 text-sm font-bold text-white hover:bg-[#154c38]">
              See profile <span aria-hidden="true">→</span>
            </Link>
          </div>
          <dl className="grid grid-cols-2 gap-px border-t border-[#e6ede6] bg-[#e6ede6] sm:grid-cols-4">
            {[
              ["Vote share", `${winner.shareOfValidVotes.toFixed(2)}%`],
              ["Votes", formatNumber(winner.votes)],
              ["Candidates", String(seat.candidates.length)],
              ["Turnout", turnout === null ? "Not stated" : `${turnout.toFixed(1)}%`],
            ].map(([label, value]) => (
              <div key={label} className="bg-[#f8faf7] p-4 sm:p-5">
                <dt className="text-xs font-bold uppercase tracking-[0.12em] text-[#7a8c7e]">{label}</dt>
                <dd className="mt-1 text-xl font-semibold text-[#19372d]">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {curated && (
        <Link href={`/areas/${curated.area.id}`} className="mt-4 flex items-center justify-between gap-4 rounded-2xl border border-[#cfe0d2] bg-[#eff7ef] p-5 text-sm font-semibold text-[#1d6547] hover:bg-[#e3f0e5]">
          <span>See checked records for {seat.name}: office holder, parliamentary work and filings.</span>
          <span aria-hidden="true">→</span>
        </Link>
      )}

      {seat.candidates.length > 0 && (
        <section className="mt-8" aria-labelledby="candidates-heading">
          <h2 id="candidates-heading" className="text-2xl font-semibold tracking-[-0.04em] text-[#19372d]">Everyone who contested</h2>
          <p className="mt-1 text-sm text-[#66796d]">Ranked by votes. Share is of valid votes.</p>
          <ol className="mt-4 grid gap-2">
            {seat.candidates.map((candidate) => (
              <li key={candidate.slug}>
                <Link href={candidateHref(seat, candidate)} className="group block rounded-2xl border border-[#e3ebe3] bg-white p-4 hover:border-[#bcd6c3] sm:p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-semibold text-[#19372d] group-hover:underline">
                        <span className="mr-2 text-sm text-[#8a9b8e]">{candidate.rank}.</span>{candidate.name}
                      </p>
                      <p className="mt-0.5 text-sm text-[#5f7465]">
                        {party(candidate.party)}{candidate.partySymbol && candidate.party === "IND" ? ` · symbol: ${candidate.partySymbol}` : ""}
                      </p>
                      {(names.get(candidate.name) ?? 0) > 1 && (
                        <p className="mt-1 text-xs font-semibold text-[#8a6a1c]">Another candidate here has the same name. Check the party.</p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-semibold tabular-nums text-[#19372d]">{formatNumber(candidate.votes)}</p>
                      <p className="text-sm tabular-nums text-[#5f7465]">{candidate.shareOfValidVotes.toFixed(2)}%</p>
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 rounded-full bg-[#eef3ed]" aria-hidden="true">
                    <div className={`h-full rounded-full ${candidate.rank === 1 ? "bg-[#1c6047]" : "bg-[#9ec9a8]"}`} style={{ width: `${Math.max(candidate.shareOfValidVotes, 0.4)}%` }} />
                  </div>
                </Link>
              </li>
            ))}
            {seat.notaVotes !== null && (
              <li className="flex items-center justify-between rounded-2xl border border-dashed border-[#d5e0d5] p-4 text-sm text-[#5f7465] sm:p-5">
                <span>None of the above (NOTA)</span>
                <span className="tabular-nums">{formatNumber(seat.notaVotes)} votes</span>
              </li>
            )}
          </ol>
          {seat.electors !== null && seat.votesPolled !== null && (
            <p className="mt-4 text-sm text-[#66796d]">
              {formatNumber(seat.votesPolled)} of {formatNumber(seat.electors)} registered voters cast a vote.
            </p>
          )}
        </section>
      )}

      <div className="mt-8">
        <SourceNote data={data} rows={rows} file={seat.unopposed ? data.references.find((file) => file.title.includes("report 2A")) : undefined} />
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumb, ButtonLink, Card, Eyebrow, NotCollected } from "@/components/ui";
import { lookupMyArea, pinLookupAvailable, type AreaSeat } from "@/lib/my-area";
import { candidateHref, ELECTION_INFO, formatNumber, seatHref, seatWinner, type ResultElectionId, type ResultSeat } from "@/lib/results";
import { partyColor } from "@/lib/party-colors";

export const metadata: Metadata = {
  title: "Who represents you | Vote Better",
  description: "Enter your PIN code to see your MP, your MLA and your ward councillor, with the official source for each.",
};

interface PageProps { searchParams: Promise<{ pin?: string | string[]; seat?: string | string[] }> }

const first = (value?: string | string[]) => (typeof value === "string" ? value.trim() : "");

function Representative({ office, election, seat, profileHref, note }: { office: string; election: ResultElectionId; seat: ResultSeat; profileHref?: string; note?: string }) {
  const winner = seatWinner(seat);
  return (
    <article className="flex flex-col gap-3 rounded-[24px] border border-line bg-surface p-5 sm:p-6">
      <Eyebrow>{office}</Eyebrow>
      <h3 className="text-lg font-semibold text-ink">{seat.name}{seat.number && ELECTION_INFO[election].body === "assembly" ? <span className="font-normal text-subtle"> · seat {seat.number}</span> : null}</h3>
      {winner ? (
        <div className="flex gap-3">
          <span className="w-1.5 shrink-0 rounded-full" style={{ background: partyColor(winner.party) }} aria-hidden="true" />
          <div>
            <p className="text-xl font-semibold tracking-[-0.03em] text-ink">{winner.name}</p>
            <p className="text-sm text-body">{winner.party} · won {ELECTION_INFO[election].label}{winner.margin !== null ? ` by ${formatNumber(winner.margin)} votes` : ""}</p>
          </div>
        </div>
      ) : null}
      {note ? <p className="text-xs leading-5 text-muted">{note}</p> : null}
      <div className="mt-auto flex flex-wrap gap-2 pt-2">
        <ButtonLink href={seatHref(seat, election)}>Seat result</ButtonLink>
        {profileHref ? <ButtonLink href={profileHref}>Profile</ButtonLink> : null}
        <ButtonLink href={`/share/seat/${election}/${seat.stateSlug}/${seat.slug}`}>Share</ButtonLink>
      </div>
    </article>
  );
}

function Cards({ chosen }: { chosen: AreaSeat }) {
  const mp = chosen.parliament;
  const mpWinner = mp?.candidates[0];
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {mp ? <Representative office="Your MP · Lok Sabha" election="lok-sabha-2024" seat={mp} profileHref={mpWinner ? candidateHref(mp, mpWinner) : undefined} /> : (
        <NotCollected title="Your Lok Sabha seat could not be matched." />
      )}
      <Representative office="Your MLA · Rajasthan Assembly" election="rajasthan-assembly-2023" seat={chosen.assembly}
        note="Elected in 2023. By-elections since then are not on the site yet, so check the seat page for changes." />
      <div className="flex flex-col gap-3 rounded-[24px] border border-dashed border-line-strong bg-[repeating-linear-gradient(135deg,var(--color-track)_0_6px,var(--color-surface-soft)_6px_12px)] p-5 sm:p-6">
        <Eyebrow>Your councillor · ward</Eyebrow>
        <p className="text-sm leading-6 text-body"><strong className="text-ink">Not collected yet.</strong> Ward councillors and city election results are not on the site yet.</p>
      </div>
    </div>
  );
}

export default async function MyAreaPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const pin = first(params.pin).slice(0, 6);
  const available = pinLookupAvailable();
  const result = pin && available ? await lookupMyArea(pin) : undefined;
  const chosen = result?.status === "found" ? result.seats.find((item) => String(item.assembly.number) === first(params.seat)) ?? result.seats[0] : undefined;

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 pb-14 pt-8 sm:px-6 sm:pt-12 lg:px-8">
      <Breadcrumb items={[{ href: "/", label: "Home" }]} />
      <header className="mt-6 max-w-2xl">
        <Eyebrow>My area{available ? " · preview, Rajasthan only" : ""}</Eyebrow>
        <h1 className="mt-3 text-[clamp(2.2rem,5vw,3.6rem)] font-semibold leading-[1.04] tracking-[-0.06em] text-ink">Who represents you</h1>
        <p className="mt-3 text-[15px] leading-7 text-body">Your MP, your MLA and your ward councillor, each with the official result behind them.</p>
      </header>

      {available ? (
        <form action="/my-area" method="get" role="search" className="mt-6 flex max-w-md gap-2">
          <label htmlFor="pin" className="sr-only">PIN code</label>
          <input id="pin" name="pin" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} defaultValue={pin} placeholder="PIN code, e.g. 302017" autoComplete="postal-code"
            className="min-h-12 min-w-0 flex-1 rounded-xl border border-line-strong bg-surface px-4 text-base tracking-[0.08em] text-ink focus:border-link focus:outline-none focus:ring-4 focus:ring-link/10" />
          <button type="submit" className="min-h-12 rounded-xl bg-brand px-5 text-sm font-bold text-white hover:bg-brand-strong">Show my area</button>
        </form>
      ) : (
        <NotCollected title="PIN search is not switched on yet." className="mt-6 max-w-2xl">
          It needs a boundary map whose licence is still being checked. Find your seat by name instead: <Link href="/seats" className="font-semibold text-link underline">search seats</Link>.
        </NotCollected>
      )}

      {result?.status === "invalid" && <p className="mt-4 text-sm text-body" role="alert">Enter the 6 digits of your PIN code.</p>}
      {result?.status === "unavailable" && <NotCollected title="PIN search is not working right now." className="mt-6 max-w-2xl">Try <Link href="/seats" className="font-semibold text-link underline">searching by seat name</Link>.</NotCollected>}
      {result?.status === "not-covered" && (
        <NotCollected title={`PIN ${result.pin} is not covered yet.`} className="mt-6 max-w-2xl">
          PIN search covers Rajasthan so far. <Link href="/seats" className="font-semibold text-link underline">Search for your seat by name</Link>.
        </NotCollected>
      )}

      {result?.status === "found" && chosen && (
        <section className="mt-8 grid gap-6" aria-labelledby="area-heading">
          <div>
            <h2 id="area-heading" className="text-2xl font-semibold tracking-[-0.04em] text-ink">PIN {result.pin}: {chosen.assembly.name}{chosen.parliament ? `, in ${chosen.parliament.name}` : ""}</h2>
            {result.seats.length > 1 && (
              <div className="mt-3">
                <p className="text-sm text-body">This PIN area covers parts of {result.seats.length} assembly seats. The one covering most of its land is shown first. Pick yours if it is different:</p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {result.seats.map((item) => {
                    const on = item === chosen;
                    return (
                      <li key={item.assembly.number}>
                        <Link href={`/my-area?pin=${result.pin}&seat=${item.assembly.number}`} aria-current={on ? "true" : undefined}
                          className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-sm font-bold ${on ? "border-brand bg-brand text-white" : "border-line-strong bg-surface text-link hover:bg-tint"}`}>
                          {item.assembly.name} <span className={on ? "text-white/80" : "text-subtle"}>{Math.round(item.share * 100)}%</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
          <Cards chosen={chosen} />
          <Card>
            <h3 className="text-base font-semibold text-ink">How this was worked out</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-body">
              <li>Your PIN area is matched to assembly seats on a map: PIN boundaries from data.gov.in, assembly boundaries from the government&apos;s BharatMaps service, through a public mirror. Percentages are shares of land, not of people.</li>
              <li>Each assembly seat&apos;s Lok Sabha seat comes from ECI&apos;s 2024 statistical report 15.</li>
              <li>A PIN is not a voting address. Check your polling station and your name on the roll at <a href="https://electoralsearch.eci.gov.in" target="_blank" rel="noopener noreferrer" className="font-semibold text-link underline">electoralsearch.eci.gov.in ↗</a>.</li>
            </ul>
          </Card>
        </section>
      )}
    </div>
  );
}

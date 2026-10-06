import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { lookupResearchPin } from "@/lib/pin-preview";

export const metadata: Metadata = {
  title: "PIN research preview | Vote Better",
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{ pin?: string | string[] }>;
}

export default async function PinResearchPage({ searchParams }: PageProps) {
  if (process.env.NODE_ENV !== "development") notFound();
  const params = await searchParams;
  const pin = typeof params.pin === "string" ? params.pin.trim() : "";
  const result = pin ? await lookupResearchPin(pin) : null;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-10 sm:px-6 sm:pt-16">
      <Link href="/" className="text-sm font-semibold text-[#276b4e] hover:underline">← Areas</Link>
      <div className="mt-8 rounded-[28px] border border-[#dce6dc] bg-white p-6 shadow-[0_16px_44px_rgba(28,64,40,.06)] sm:p-10">
        <p className="text-xs font-extrabold uppercase tracking-[0.17em] text-[#598466]">Local research preview</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.06em] text-[#19372d] sm:text-5xl">Find possible areas</h1>
        <p className="mt-4 max-w-xl text-sm leading-6 text-[#607568]">
          Enter a PIN to see which parliamentary constituencies its postal boundary touches. This map is unreviewed and cannot identify your exact voting area.
        </p>
        <form action="/research/pin" method="get" className="mt-8 flex flex-col gap-3 sm:flex-row">
          <label htmlFor="pin" className="sr-only">Six digit PIN code</label>
          <input id="pin" name="pin" inputMode="numeric" autoComplete="postal-code" pattern="[0-9]{6}" maxLength={6}
            placeholder="Enter 6-digit PIN" defaultValue={pin}
            className="min-h-12 w-full rounded-2xl border border-[#bfd3c3] bg-[#fbfcf9] px-4 text-base text-[#18372b] outline-none focus:border-[#28724f] focus:ring-2 focus:ring-[#c6e5cf]" />
          <button type="submit" className="min-h-12 rounded-2xl bg-[#1c6047] px-7 text-sm font-bold text-white hover:bg-[#154c38]">Check PIN</button>
        </form>

        {result && <div className="mt-8 border-t border-[#e2eae2] pt-7" aria-live="polite">
          {result.status === "possible" ? <>
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#91692d]">Unreviewed boundary match</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#19372d]">
              {result.areas.length === 1 ? "1 possible constituency" : `${result.areas.length} possible constituencies`}
            </h2>
            <div className="mt-4 grid gap-3">
              {result.areas.map((area) => <div key={area.id} className="rounded-2xl border border-[#e0e8dd] bg-[#f7faf5] px-5 py-4">
                <p className="font-semibold text-[#1f4532]">{area.label}</p>
                <p className="mt-1 text-xs text-[#688071]">{area.state} · Source area ID {area.id}</p>
                {area.published?.holders.length ? <div className="mt-4 border-t border-[#dce8dc] pt-4">
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#688071]">MP recorded for this area</p>
                  {area.published.holders.map((holder) => <div key={holder.slug} className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-[#1f4532]">{holder.name}</p>
                      <p className="text-xs text-[#688071]">{holder.office} · Reviewed {holder.reviewedOn}</p>
                    </div>
                    <Link href={`/people/${holder.slug}`} className="text-sm font-semibold text-[#24694b] underline underline-offset-4">View profile ↗</Link>
                  </div>)}
                </div> : <p className="mt-3 text-xs text-[#688071]">No reviewed MP profile linked to this draft area yet.</p>}
              </div>)}
            </div>
            <p className="mt-5 text-sm leading-6 text-[#617367]">A PIN is a postal area. Confirm your voting constituency before using it to identify a representative.</p>
          </> : <p className="text-sm leading-6 text-[#526a59]">
            {result.status === "invalid" ? "Enter exactly six digits." :
              result.status === "unavailable" ? "The local research map is unavailable." :
                result.status === "not-covered" ? "This PIN is not in the research map." :
                  "No constituency overlap was found for this PIN in the research map."}
          </p>}
        </div>}
      </div>
      <p className="mt-5 text-xs leading-5 text-[#788a7c]">This preview runs only in local development. <Link href="/" className="font-semibold text-[#28684d] underline">Browse verified areas</Link>.</p>
    </div>
  );
}

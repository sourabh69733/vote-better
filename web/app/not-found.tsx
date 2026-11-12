import Link from "next/link";

// Shown for any page that does not exist, or a seat, person or election the site has no record of.
export default function NotFound() {
  return (
    <div className="mx-auto w-full max-w-[760px] px-4 py-20 sm:px-6">
      <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-eyebrow">Not found</p>
      <h1 className="mt-3 text-[clamp(2.2rem,6vw,3.6rem)] font-bold leading-[1.02] tracking-[-0.03em] text-ink">
        This page isn&apos;t on <span className="relative whitespace-nowrap">Vote Better<span className="absolute inset-x-0 bottom-[0.08em] -z-10 h-[0.3em] rounded-sm bg-pop" aria-hidden="true" /></span>.
      </h1>
      <p className="mt-5 max-w-xl text-[17px] leading-8 text-body">
        The link may be old, or the seat, person or election may not be collected yet. Search for your seat instead.
      </p>
      <form action="/seats" method="get" role="search" className="mt-8 flex max-w-xl gap-2 rounded-[20px] border border-line-strong bg-surface p-2">
        <label htmlFor="not-found-search" className="sr-only">Find a seat or a name</label>
        <input id="not-found-search" name="q" placeholder="Seat, state or name" autoComplete="off" className="min-h-12 min-w-0 flex-1 bg-transparent px-3 text-base text-ink placeholder:text-subtle focus:outline-none" />
        <button type="submit" className="min-h-12 rounded-[14px] bg-brand px-5 text-sm font-bold text-white hover:bg-brand-strong">Search</button>
      </form>
      <p className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
        <Link href="/" className="text-link underline underline-offset-4">Home</Link>
        <Link href="/elections" className="text-link underline underline-offset-4">Elections</Link>
        <Link href="/seats" className="text-link underline underline-offset-4">All seats</Link>
      </p>
    </div>
  );
}

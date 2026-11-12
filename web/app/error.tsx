"use client"; // Error boundaries must be Client Components.

import Link from "next/link";
import { useEffect } from "react";

// Shown when a page fails while loading. The error is logged for the host's logs, not shown to the reader.
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto w-full max-w-[760px] px-4 py-20 sm:px-6">
      <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-eyebrow">Something went wrong</p>
      <h1 className="mt-3 text-[clamp(2rem,5vw,3.2rem)] font-bold leading-[1.05] tracking-[-0.03em] text-ink">This page didn&apos;t load.</h1>
      <p className="mt-5 max-w-xl text-[17px] leading-8 text-body">
        It is our fault, not yours. Try again; if it keeps happening, the page may be broken for now.
        {error.digest ? <span className="mt-2 block text-sm text-subtle">Reference: {error.digest}</span> : null}
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-4">
        <button type="button" onClick={() => retry()} className="min-h-12 rounded-full bg-brand px-6 text-sm font-bold text-white hover:bg-brand-strong">Try again</button>
        <Link href="/" className="text-sm font-semibold text-link underline underline-offset-4">Go home</Link>
      </div>
    </div>
  );
}

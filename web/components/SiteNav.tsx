"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";

// The main sections. On a wide screen they sit in a row; on a phone they open from a Menu button, so no
// link is cut off, and the menu closes when a page is chosen. The current section is marked.
export default function SiteNav({ links }: { links: { href: string; label: string }[] }) {
  const pathname = usePathname();
  // The page the menu was opened on: it counts as open only there, so choosing a page closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const setOpen = (value: boolean) => setOpenOn(value ? pathname : null);
  const panel = useId();
  const current = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setOpenOn(null); };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [open]);

  return (
    <>
      <nav aria-label="Main" className="hidden items-center gap-6 text-sm font-semibold md:flex lg:gap-7">
        {links.map((link) => (
          <Link key={link.href} href={link.href} aria-current={current(link.href) ? "page" : undefined}
            className={`whitespace-nowrap transition-colors hover:text-brand ${current(link.href) ? "text-ink underline decoration-pop decoration-[3px] underline-offset-[10px]" : "text-body"}`}>
            {link.label}
          </Link>
        ))}
      </nav>

      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls={panel}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line-strong bg-surface px-4 text-sm font-bold text-ink md:hidden">
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          {open ? <path d="M5 5l10 10M15 5L5 15" /> : <path d="M3 6h14M3 10h14M3 14h14" />}
        </svg>
        Menu
      </button>

      {open && (
        <nav id={panel} aria-label="Main" className="absolute inset-x-0 top-full border-b border-line bg-canvas shadow-[0_18px_30px_rgba(15,42,32,.10)] md:hidden">
          <ul className="mx-auto grid max-w-[1320px] grid-cols-2 gap-2 px-4 py-4 sm:px-6">
            {links.map((link) => (
              <li key={link.href}>
                <Link href={link.href} aria-current={current(link.href) ? "page" : undefined} onClick={() => setOpen(false)}
                  className={`flex min-h-12 items-center rounded-2xl border px-4 text-[15px] font-semibold ${current(link.href) ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink"}`}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </>
  );
}

"use client";

import { useId, useState } from "react";

// Filters the seat list below it as the voter types. Without JavaScript the full list still shows.
export default function SeatFilter({ target, placeholder }: { target: string; placeholder: string }) {
  const id = useId();
  const [count, setCount] = useState<number | null>(null);

  function filter(value: string) {
    const words = value.toLocaleLowerCase("en-IN").split(/\s+/).filter(Boolean);
    const root = document.getElementById(target);
    if (!root) return;
    let shown = 0;
    for (const group of root.querySelectorAll<HTMLDetailsElement>("[data-state-group]")) {
      let groupShown = 0;
      for (const row of group.querySelectorAll<HTMLElement>("[data-search]")) {
        const match = words.every((word) => row.dataset.search!.includes(word));
        row.hidden = !match;
        if (match) groupShown++;
      }
      group.hidden = groupShown === 0;
      group.open = words.length > 0 && groupShown > 0 && groupShown <= 12;
      shown += groupShown;
    }
    setCount(words.length ? shown : null);
  }

  return (
    <div className="max-w-xl">
      <label htmlFor={id} className="text-sm font-semibold text-ink">Find your seat</label>
      <input id={id} type="search" placeholder={placeholder} autoComplete="off" onChange={(event) => filter(event.target.value)}
        className="mt-2 min-h-12 w-full rounded-xl border border-line-strong bg-white px-4 text-base text-ink focus:border-link focus:outline-none focus:ring-4 focus:ring-eyebrow/10" />
      <p className="mt-2 min-h-5 text-sm text-muted" aria-live="polite">{count === null ? "" : count ? `${count} ${count === 1 ? "seat matches" : "seats match"}` : "No seat, state or winner matches. Check the spelling."}</p>
    </div>
  );
}

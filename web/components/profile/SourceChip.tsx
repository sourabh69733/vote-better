"use client";

import { useEffect, useId, useRef, useState } from "react";

export interface ChipSource {
  label: string;
  title: string;
  url: string;
  locator: string;
  checkedOn: string;
}

// A small label on a fact. Tap it to see exactly where the fact comes from.
export default function SourceChip({ source }: { source: ChipSource }) {
  const [open, setOpen] = useState(false);
  const panel = useId();
  const root = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: Event) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", close);
    document.addEventListener("pointerdown", close);
    return () => {
      document.removeEventListener("keydown", close);
      document.removeEventListener("pointerdown", close);
    };
  }, [open]);

  return (
    <span ref={root} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={panel}
        className="inline-flex min-h-7 items-center gap-1 rounded-full border border-[#d5e3d7] bg-white px-2.5 text-[11px] font-bold text-[#4c7a5d] hover:border-[#9ec9a8]"
      >
        <span aria-hidden="true">↗</span> {source.label}
      </button>
      {open && (
        <span id={panel} role="note" className="absolute left-0 top-full z-20 mt-2 block w-[min(18rem,75vw)] rounded-xl border border-[#cfe0d2] bg-white p-3 text-xs leading-5 text-[#2c4f3a] shadow-[0_12px_30px_rgba(28,64,40,.14)]">
          {source.title}, {source.locator}. Checked {source.checkedOn}.{" "}
          <a href={source.url} target="_blank" rel="noopener noreferrer" className="font-bold underline underline-offset-2">Open original</a>
        </span>
      )}
    </span>
  );
}

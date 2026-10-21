"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

export interface ProfileTab {
  id: string;
  label: string;
  content: ReactNode;
}

// One section at a time. The address bar keeps the open tab, so a link can open "#elections".
export default function ProfileTabs({ tabs }: { tabs: ProfileTab[] }) {
  const [active, setActive] = useState(tabs[0].id);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const fromHash = () => {
      const id = window.location.hash.slice(1);
      if (tabs.some((tab) => tab.id === id)) setActive(id);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [tabs]);

  function open(id: string) {
    setActive(id);
    window.history.replaceState(null, "", `#${id}`);
  }

  function onKeyDown(event: KeyboardEvent, index: number) {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = (index + step + tabs.length) % tabs.length;
    open(tabs[next].id);
    buttons.current[next]?.focus();
  }

  return (
    <div>
      <div role="tablist" aria-label="Profile sections" className="sticky top-[72px] z-10 -mx-4 flex gap-2 overflow-x-auto bg-[#f5f7f2]/95 px-4 py-3 backdrop-blur [scrollbar-width:none] sm:mx-0 sm:px-0">
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            ref={(element) => { buttons.current[index] = element; }}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={active === tab.id}
            aria-controls={`panel-${tab.id}`}
            tabIndex={active === tab.id ? 0 : -1}
            onClick={() => open(tab.id)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={`min-h-10 shrink-0 rounded-full border px-4 text-sm font-semibold ${active === tab.id ? "border-[#1c6047] bg-[#1c6047] text-white" : "border-[#d5e3d7] bg-white text-[#2c6249] hover:bg-[#eef6ef]"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <div key={tab.id} role="tabpanel" id={`panel-${tab.id}`} aria-labelledby={`tab-${tab.id}`} hidden={active !== tab.id} className="mt-3">
          {tab.content}
        </div>
      ))}
    </div>
  );
}

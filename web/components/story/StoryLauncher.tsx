"use client";

import { useEffect, useState } from "react";
import type { Story } from "@/lib/scenes";
import StoryPlayer from "./StoryPlayer";

// A "Play story" button. A link ending in ?story=1 opens the story straight away.
// "light" sits on the dark profile header; "brand" sits on a white page.
export default function StoryLauncher({ story, className = "", variant = "light" }: { story: Story; className?: string; variant?: "light" | "brand" }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("story") !== "1") return;
    // Remove the flag only once the story opens, so a cancelled first run can retry.
    const show = setTimeout(() => {
      url.searchParams.delete("story");
      window.history.replaceState(null, "", url);
      setOpen(true);
    }, 0);
    return () => clearTimeout(show);
  }, []);

  if (story.scenes.length < 2) return null;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className={`inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-bold ${variant === "light" ? "bg-white text-[#122a20] hover:bg-white/90" : "bg-brand text-white hover:bg-brand-strong"} ${className}`}>
        <span aria-hidden="true">▶</span> Play story · {story.scenes.length} scenes
      </button>
      {open && <StoryPlayer story={story} onClose={() => setOpen(false)} />}
    </>
  );
}

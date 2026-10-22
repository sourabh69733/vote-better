"use client";

import { useEffect, useState } from "react";
import type { Story } from "@/lib/story";
import StoryPlayer from "./StoryPlayer";

// A "Play story" button. A link ending in ?story=1 opens the story straight away.
export default function StoryLauncher({ story, className = "" }: { story: Story; className?: string }) {
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
        className={`inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-bold text-[#122a20] hover:bg-white/90 ${className}`}>
        <span aria-hidden="true">▶</span> Play story · {story.scenes.length} scenes
      </button>
      {open && <StoryPlayer story={story} onClose={() => setOpen(false)} />}
    </>
  );
}

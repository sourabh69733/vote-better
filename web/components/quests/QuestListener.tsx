"use client";

import { useEffect } from "react";

import { isOfficialSource, markQuest } from "@/lib/quests";

// Opening an official document from any page completes "trace one fact". Renders nothing.
export default function QuestListener() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const link = (event.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (link && isOfficialSource(link.href)) markQuest("trace-a-fact", link.href);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
  return null;
}

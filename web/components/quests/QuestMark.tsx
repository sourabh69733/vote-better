"use client";

import { useEffect } from "react";

import { markQuest, type QuestId } from "@/lib/quests";

// Marks a quest done when the page that completes it is shown. Renders nothing.
export default function QuestMark({ quest, detail }: { quest: QuestId; detail?: string }) {
  useEffect(() => { markQuest(quest, detail); }, [quest, detail]);
  return null;
}

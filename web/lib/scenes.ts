// One scene format for every story on the site and every share image. The on-site player
// (components/story/Scene.tsx) and the image renderer (lib/share/render.tsx) both draw these.
// A scene shows one fact; `source` names where it comes from.

export type Scene = { source?: string } & (
  | { kind: "cover"; kicker: string; title: string; subtitle: string }
  | { kind: "person"; kicker: string; name: string; initials: string; party: string | null; color: string; role: string; place: string }
  | { kind: "race"; kicker: string; title: string; rows: { name: string; party: string; color: string; share: number; votes: string; self?: boolean }[]; others?: string }
  | { kind: "big"; kicker: string; value: string; unit: string; line: string; detail?: string; highlight?: boolean }
  | { kind: "money"; kicker: string; title: string; assets?: string; liabilities?: string; assetShare?: number; cases?: number }
  | { kind: "work"; kicker: string; title: string; questions?: number; debates?: number; topics: { name: string; width: number }[] }
  | { kind: "list"; kicker: string; title: string; note?: string; rows: { label: string; detail: string; value: string; width: number; color: string }[] }
  | { kind: "timeline"; kicker: string; title: string; items: { when: string; text: string }[] }
  | { kind: "quiz"; kicker: string; question: string; options: string[]; hint: string }
  | { kind: "points"; kicker: string; title: string; points: { title: string; text: string }[] }
  | { kind: "sources"; title: string; labels: string[] }
  | { kind: "cta"; kicker: string; title: string; text: string }
);

export type SceneKind = Scene["kind"];

export interface Story {
  name: string;
  // Accent colour, usually the party colour of the person the story is about.
  color: string;
  scenes: Scene[];
}

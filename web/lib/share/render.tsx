import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { FORMATS, type Deck, type Format, type Frame } from "./decks";

// Draws one frame for next/og (Satori). Satori lays out with flexbox only, so every
// element with more than one child is a flex container.

const C = { bg: "#163a34", ink: "#ffffff", soft: "#c5dacf", mint: "#8ce0bf", violet: "#cdb8ff", line: "rgba(255,255,255,0.18)", card: "rgba(255,255,255,0.08)" };

let fonts: Promise<{ name: string; data: Buffer; weight: 400 | 700 | 800; style: "normal" }[]> | undefined;
export function loadFonts() {
  fonts ??= Promise.all(([400, 700, 800] as const).map(async (weight) => ({
    name: "Inter", weight, style: "normal" as const, data: await readFile(join(process.cwd(), "assets", "fonts", `Inter-${weight}.ttf`)),
  })));
  return fonts;
}

export const siteLabel = () => process.env.NEXT_PUBLIC_SITE_URL?.replace(/^https?:\/\//, "").replace(/\/$/, "") ?? "";

function Mark({ size }: { size: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: size * 0.4 }}>
      <div style={{ width: size, height: size, borderRadius: size * 0.28, background: "#1e6b4d", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" stroke="#fff" strokeWidth={3.2} fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </div>
      <div style={{ fontSize: size * 0.62, fontWeight: 800, letterSpacing: -1, color: C.ink }}>Vote Better</div>
    </div>
  );
}

function Body({ frame, s }: { frame: Frame; s: number }) {
  const kicker = <div style={{ fontSize: 30 * s, fontWeight: 800, letterSpacing: 5 * s, color: C.mint }}>{frame.kicker}</div>;
  switch (frame.kind) {
    case "cover":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 36 * s }}>
          {kicker}
          <div style={{ fontSize: (frame.title.length > 22 ? 104 : 150) * s, fontWeight: 800, lineHeight: 1.0, letterSpacing: -5 * s }}>{frame.title}</div>
          <div style={{ fontSize: 52 * s, fontWeight: 700, color: C.violet }}>{frame.subtitle}</div>
        </div>
      );
    case "race":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 44 * s }}>
          {kicker}
          <div style={{ fontSize: 96 * s, fontWeight: 800, letterSpacing: -4 * s }}>{frame.title}</div>
          {frame.rows.map((row) => (
            <div key={row.name} style={{ display: "flex", flexDirection: "column", gap: 14 * s }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 20 }}>
                <div style={{ display: "flex", flexDirection: "column", maxWidth: 700 * s }}>
                  <div style={{ fontSize: 50 * s, fontWeight: 800, lineHeight: 1.1 }}>{row.name}</div>
                  <div style={{ fontSize: 30 * s, color: C.soft }}>{row.party}</div>
                </div>
                <div style={{ fontSize: 64 * s, fontWeight: 800 }}>{`${row.share.toFixed(1)}%`}</div>
              </div>
              <div style={{ display: "flex", height: 26 * s, borderRadius: 13 * s, background: C.line }}>
                <div style={{ width: `${Math.max(row.share, 1)}%`, height: "100%", borderRadius: 13 * s, background: row.color }} />
              </div>
              <div style={{ fontSize: 30 * s, color: C.soft }}>{row.votes}</div>
            </div>
          ))}
          {frame.others ? <div style={{ fontSize: 32 * s, color: C.soft }}>{frame.others}</div> : null}
        </div>
      );
    case "big":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 30 * s }}>
          {kicker}
          <div style={{ fontSize: (frame.value.length > 9 ? 170 : 210) * s, fontWeight: 800, letterSpacing: -8 * s, lineHeight: 1, color: frame.highlight ? C.violet : C.ink }}>{frame.value}</div>
          <div style={{ fontSize: 60 * s, fontWeight: 800, letterSpacing: -2 * s }}>{frame.unit}</div>
          <div style={{ fontSize: 44 * s, lineHeight: 1.3, color: C.ink }}>{frame.line}</div>
          {frame.detail ? <div style={{ fontSize: 40 * s, lineHeight: 1.3, color: C.mint, fontWeight: 700 }}>{frame.detail}</div> : null}
        </div>
      );
    case "list":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 36 * s }}>
          {kicker}
          <div style={{ fontSize: 92 * s, fontWeight: 800, letterSpacing: -4 * s, lineHeight: 1.05 }}>{frame.title}</div>
          {frame.note ? <div style={{ fontSize: 32 * s, color: C.soft }}>{frame.note}</div> : null}
          {frame.rows.map((row) => (
            <div key={row.label + row.detail} style={{ display: "flex", flexDirection: "column", gap: 10 * s }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 20 }}>
                <div style={{ display: "flex", flexDirection: "column", maxWidth: 680 * s }}>
                  <div style={{ fontSize: 46 * s, fontWeight: 800 }}>{row.label}</div>
                  <div style={{ fontSize: 28 * s, color: C.soft }}>{row.detail}</div>
                </div>
                <div style={{ fontSize: 46 * s, fontWeight: 800 }}>{row.value}</div>
              </div>
              <div style={{ display: "flex", height: 16 * s, borderRadius: 8 * s, background: C.line }}>
                <div style={{ width: `${row.width}%`, height: "100%", borderRadius: 8 * s, background: row.color }} />
              </div>
            </div>
          ))}
        </div>
      );
    case "quiz":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 40 * s }}>
          {kicker}
          <div style={{ fontSize: 80 * s, fontWeight: 800, letterSpacing: -3 * s, lineHeight: 1.1 }}>{frame.question}</div>
          {frame.options.map((option) => (
            <div key={option} style={{ display: "flex", padding: `${30 * s}px ${40 * s}px`, borderRadius: 30 * s, border: `3px solid ${C.line}`, background: C.card, fontSize: 64 * s, fontWeight: 800 }}>{option}</div>
          ))}
          <div style={{ fontSize: 36 * s, color: C.violet, fontWeight: 700 }}>{frame.hint}</div>
        </div>
      );
    case "points":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 40 * s }}>
          {kicker}
          <div style={{ fontSize: 96 * s, fontWeight: 800, letterSpacing: -4 * s }}>{frame.title}</div>
          {frame.points.map((point) => (
            <div key={point.title} style={{ display: "flex", flexDirection: "column", gap: 12 * s, padding: 40 * s, borderRadius: 32 * s, background: C.card, border: `2px solid ${C.line}` }}>
              <div style={{ fontSize: 50 * s, fontWeight: 800, color: C.violet }}>{point.title}</div>
              <div style={{ fontSize: 40 * s, lineHeight: 1.35 }}>{point.text}</div>
            </div>
          ))}
        </div>
      );
    case "cta":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 40 * s }}>
          {kicker}
          <div style={{ fontSize: 120 * s, fontWeight: 800, letterSpacing: -5 * s, lineHeight: 1.0 }}>{frame.title}</div>
          <div style={{ fontSize: 46 * s, lineHeight: 1.35, color: C.soft }}>{frame.text}</div>
          <div style={{ display: "flex", alignSelf: "flex-start", padding: `${28 * s}px ${44 * s}px`, borderRadius: 999, background: C.ink, color: C.bg, fontSize: 46 * s, fontWeight: 800 }}>
            {siteLabel() || "Link in bio"}
          </div>
        </div>
      );
  }
}

export function FrameImage({ deck, index, format }: { deck: Deck; index: number; format: Format }) {
  const frame = deck.frames[index];
  const s = format === "story" ? 1 : 0.8;
  // Instagram draws its own buttons over roughly the top and bottom 250 px of a story.
  const pad = format === "story" ? { top: 230, bottom: 260, side: 84 } : { top: 76, bottom: 76, side: 66 };
  return (
    <div style={{ width: FORMATS[format].width, height: FORMATS[format].height, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: `${pad.top}px ${pad.side}px ${pad.bottom}px`, background: C.bg, color: C.ink, fontFamily: "Inter" }}>
      <div style={{ display: "flex", gap: 10 }}>
        {deck.frames.map((_, i) => <div key={i} style={{ flex: 1, height: 8, borderRadius: 4, background: i <= index ? C.ink : C.line }} />)}
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}><Body frame={frame} s={s} /></div>
      <div style={{ display: "flex", flexDirection: "column", gap: 22 * s }}>
        {frame.source ? <div style={{ fontSize: 26 * s, color: C.soft, lineHeight: 1.3 }}>{`Source: ${frame.source}`}</div> : null}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Mark size={64 * s} />
          <div style={{ fontSize: 28 * s, color: C.soft }}>{index === deck.frames.length - 1 ? "Check it yourself" : `${index + 1} / ${deck.frames.length}`}</div>
        </div>
      </div>
    </div>
  );
}

// Link preview, 1200 x 630: what WhatsApp and other apps show when a page link is pasted.
export const PREVIEW = { width: 1200, height: 630 };

export function PreviewImage({ kicker, title, line, stat, statLabel, color }: { kicker: string; title: string; line: string; stat?: string; statLabel?: string; color?: string }) {
  return (
    <div style={{ width: PREVIEW.width, height: PREVIEW.height, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "60px 64px", background: C.bg, color: C.ink, fontFamily: "Inter" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Mark size={52} />
        <div style={{ fontSize: 24, color: C.soft }}>Every fact sourced</div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 40 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: stat ? 700 : 1060 }}>
          <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: 4, color: C.mint }}>{kicker}</div>
          <div style={{ fontSize: title.length > 24 ? 64 : 84, fontWeight: 800, letterSpacing: -3, lineHeight: 1.02 }}>{title}</div>
          <div style={{ fontSize: 32, lineHeight: 1.3, color: C.soft }}>{line}</div>
        </div>
        {stat ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, padding: "28px 36px", borderRadius: 28, background: C.card, border: `2px solid ${color ?? C.line}` }}>
            <div style={{ fontSize: 76, fontWeight: 800, letterSpacing: -3, color: C.violet }}>{stat}</div>
            <div style={{ fontSize: 24, color: C.soft }}>{statLabel}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

"use client";

import type { CSSProperties, ReactNode } from "react";
import type { Scene as SceneData } from "@/lib/scenes";

// One fact per scene. Shapes animate; numbers are always shown as their real value.
const step = (order: number): CSSProperties => ({ animationDelay: `${order * 120}ms` });
const enter = "animate-[fadeUp_.5s_ease-out_both] motion-reduce:animate-none";
const grow = "origin-left animate-[growX_.9s_ease-out_both] motion-reduce:animate-none";

function Frame({ children, center }: { children: ReactNode; center?: boolean }) {
  return <div className={`absolute inset-0 flex flex-col justify-center px-7 ${center ? "items-center text-center" : ""}`}>{children}</div>;
}

const Kicker = ({ children, order = 0 }: { children: ReactNode; order?: number }) => (
  <p className={`text-sm text-white/60 ${enter}`} style={step(order)}>{children}</p>
);

// Plays every scene kind in lib/scenes.ts: person stories from profiles and share decks alike.
export default function Scene({ scene, color, onClose }: { scene: SceneData; color: string; onClose: () => void }) {
  switch (scene.kind) {
    case "person":
      return (
        <Frame>
          <div className={`grid h-24 w-24 place-items-center rounded-full bg-white/10 text-3xl font-bold animate-[popIn_.6s_ease-out_both] motion-reduce:animate-none`} style={{ boxShadow: `0 0 0 4px ${scene.color}` }} aria-hidden="true">{scene.initials}</div>
          <div className="mt-7"><Kicker order={1}>{scene.kicker}</Kicker></div>
          <h2 className={`mt-1 text-[2.6rem] font-semibold leading-[1.05] tracking-[-0.04em] ${enter}`} style={step(2)}>{scene.name}</h2>
          {scene.party && (
            <p className={`mt-3 flex items-center gap-2 text-white/85 ${enter}`} style={step(3)}>
              <span className="h-3 w-3 rounded-full" style={{ background: scene.color }} aria-hidden="true" />{scene.party}
            </p>
          )}
          <p className={`mt-1 text-sm text-white/60 ${enter}`} style={step(4)}>{scene.place}</p>
          <span className={`mt-5 self-start rounded-full bg-white px-3 py-1 text-sm font-bold text-[#122a20] ${enter}`} style={step(5)}>{scene.role}</span>
        </Frame>
      );
    case "race":
      return (
        <Frame>
          <Kicker>{scene.kicker}</Kicker>
          <h2 className={`mt-1 text-3xl font-semibold tracking-[-0.03em] ${enter}`} style={step(1)}>{scene.title}</h2>
          <ol className="mt-8 grid gap-6">
            {scene.rows.map((row, index) => (
              <li key={row.name + row.party} className={enter} style={step(index + 2)}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className={`text-base ${row.self ? "font-bold" : "text-white/85"}`}>{row.name} <span className="text-white/55">· {row.party}</span></span>
                  <span className="tabular-nums text-white/85">{row.share.toFixed(1)}%</span>
                </div>
                <div className="mt-2 h-4 overflow-hidden rounded-full bg-white/10">
                  <div className={`h-full rounded-full ${grow}`} style={{ width: `${Math.max(row.share, 1)}%`, background: row.color, animationDelay: `${300 + index * 200}ms`, outline: row.self ? "2px solid white" : undefined }} />
                </div>
                <p className="mt-1 text-xs text-white/55">{row.votes}</p>
              </li>
            ))}
          </ol>
          {scene.others && <p className={`mt-6 text-sm text-white/55 ${enter}`} style={step(6)}>{scene.others}</p>}
        </Frame>
      );
    case "big":
      return (
        <Frame center>
          <Kicker>{scene.kicker}</Kicker>
          <p className="mt-2 text-[clamp(3.2rem,16vw,5rem)] font-semibold leading-none tracking-[-0.05em] tabular-nums animate-[popIn_.7s_ease-out_both] motion-reduce:animate-none" style={{ animationDelay: "150ms", color: scene.highlight ? "#cdb8ff" : undefined }}>{scene.value}</p>
          <p className={`mt-2 text-xl text-white/85 ${enter}`} style={step(3)}>{scene.unit}</p>
          <p className={`mt-1 text-sm text-white/60 ${enter}`} style={step(4)}>{scene.line}</p>
          {scene.detail && (
            <p className={`mt-8 rounded-2xl bg-white/10 px-4 py-3 text-[15px] leading-6 ${enter}`} style={step(6)}>{scene.detail}</p>
          )}
        </Frame>
      );
    case "money":
      return (
        <Frame>
          <Kicker>{scene.title}</Kicker>
          {scene.assets && (
            <>
              <h2 className={`mt-2 text-4xl font-semibold tracking-[-0.03em] ${enter}`} style={step(1)}>{scene.assets}</h2>
              <p className={`text-white/70 ${enter}`} style={step(1)}>in assets</p>
            </>
          )}
          {scene.assetShare !== undefined && (
            <div className="mt-6 flex h-5 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
              <span className={`h-full ${grow}`} style={{ width: `${scene.assetShare}%`, background: "#4caf7a", animationDelay: "300ms" }} />
              <span className={`h-full ${grow}`} style={{ width: `${100 - scene.assetShare}%`, background: "#e0913a", animationDelay: "700ms" }} />
            </div>
          )}
          {scene.liabilities && <p className={`mt-2 text-sm text-white/70 ${enter}`} style={step(4)}>Liabilities {scene.liabilities}</p>}
          {scene.cases !== undefined && (
            <div className={`mt-10 ${enter}`} style={step(6)}>
              <p className="text-6xl font-semibold tabular-nums">{scene.cases}</p>
              <p className="text-white/70">criminal cases declared</p>
              <p className="mt-1 text-xs text-white/50">A declared case is not a conviction.</p>
            </div>
          )}
        </Frame>
      );
    case "work":
      return (
        <Frame>
          <Kicker>{scene.title}</Kicker>
          <div className="mt-3 flex gap-8">
            {scene.questions !== undefined && (
              <div className="animate-[popIn_.6s_ease-out_both] motion-reduce:animate-none" style={{ animationDelay: "120ms" }}>
                <p className="text-6xl font-semibold tabular-nums">{scene.questions}</p><p className="text-white/70">questions asked</p>
              </div>
            )}
            {scene.debates !== undefined && (
              <div className="animate-[popIn_.6s_ease-out_both] motion-reduce:animate-none" style={{ animationDelay: "300ms" }}>
                <p className="text-6xl font-semibold tabular-nums">{scene.debates}</p><p className="text-white/70">debates</p>
              </div>
            )}
          </div>
          {scene.topics.length > 0 && (
            <div className="mt-10">
              <p className={`text-sm text-white/60 ${enter}`} style={step(3)}>Asked most about</p>
              <ul className="mt-3 grid gap-3">
                {scene.topics.map((topic, index) => (
                  <li key={topic.name} className={enter} style={step(index + 4)}>
                    <p className="text-[15px]">{topic.name}</p>
                    <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-white/10">
                      <div className={`h-full rounded-full ${grow}`} style={{ width: `${topic.width}%`, background: color, animationDelay: `${500 + index * 150}ms` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Frame>
      );
    case "timeline":
      return (
        <Frame>
          <Kicker>{scene.title}</Kicker>
          <ol className="mt-6 grid gap-6 border-l-2 border-white/20 pl-6">
            {scene.items.map((item, index) => (
              <li key={item.when + item.text} className={`relative ${enter}`} style={step(index + 1)}>
                <span className="absolute -left-[31px] top-1.5 h-3 w-3 rounded-full" style={{ background: color }} aria-hidden="true" />
                <p className="text-sm font-bold text-white/60">{item.when}</p>
                <p className="text-lg leading-7">{item.text}</p>
              </li>
            ))}
          </ol>
        </Frame>
      );
    case "sources":
      return (
        <Frame center>
          <h2 className={`text-3xl font-semibold tracking-[-0.03em] ${enter}`}>{scene.title}</h2>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {scene.labels.map((label, index) => (
              <span key={label} className={`rounded-full border border-white/25 px-3 py-1 text-sm ${enter}`} style={step(index + 1)}>{label}</span>
            ))}
          </div>
          <button type="button" onClick={onClose} className={`mt-10 rounded-full bg-white px-6 py-3 text-sm font-bold text-[#122a20] ${enter}`} style={step(6)}>
            See the full profile
          </button>
        </Frame>
      );
    case "cover":
      return (
        <Frame>
          <Kicker>{scene.kicker}</Kicker>
          <h2 className={`mt-2 text-[3.2rem] font-semibold leading-[1.02] tracking-[-0.05em] ${enter}`} style={step(1)}>{scene.title}</h2>
          <p className={`mt-4 text-xl font-semibold text-[#cdb8ff] ${enter}`} style={step(2)}>{scene.subtitle}</p>
        </Frame>
      );
    case "list":
      return (
        <Frame>
          <Kicker>{scene.kicker}</Kicker>
          <h2 className={`mt-1 text-3xl font-semibold tracking-[-0.03em] ${enter}`} style={step(1)}>{scene.title}</h2>
          {scene.note && <p className={`mt-1 text-sm text-white/60 ${enter}`} style={step(1)}>{scene.note}</p>}
          <ol className="mt-6 grid gap-4">
            {scene.rows.map((row, index) => (
              <li key={row.label + row.detail} className={enter} style={step(index + 2)}>
                <div className="flex items-baseline justify-between gap-3">
                  <span><span className="font-semibold">{row.label}</span> <span className="text-xs text-white/55">{row.detail}</span></span>
                  <span className="tabular-nums font-semibold">{row.value}</span>
                </div>
                <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-white/10">
                  <div className={`h-full rounded-full ${grow}`} style={{ width: `${row.width}%`, background: row.color, animationDelay: `${300 + index * 150}ms` }} />
                </div>
              </li>
            ))}
          </ol>
        </Frame>
      );
    case "quiz":
      return (
        <Frame>
          <Kicker>{scene.kicker}</Kicker>
          <h2 className={`mt-2 text-[1.9rem] font-semibold leading-tight tracking-[-0.03em] ${enter}`} style={step(1)}>{scene.question}</h2>
          <ul className="mt-6 grid gap-3">
            {scene.options.map((option, index) => (
              <li key={option} className={`rounded-2xl border border-white/25 bg-white/5 px-5 py-4 text-2xl font-semibold tabular-nums ${enter}`} style={step(index + 2)}>{option}</li>
            ))}
          </ul>
          <p className={`mt-5 text-sm font-semibold text-[#cdb8ff] ${enter}`} style={step(6)}>{scene.hint}</p>
        </Frame>
      );
    case "points":
      return (
        <Frame>
          <Kicker>{scene.kicker}</Kicker>
          <h2 className={`mt-1 text-3xl font-semibold tracking-[-0.03em] ${enter}`} style={step(1)}>{scene.title}</h2>
          <ul className="mt-6 grid gap-3">
            {scene.points.map((point, index) => (
              <li key={point.title} className={`rounded-2xl border border-white/20 bg-white/5 p-4 ${enter}`} style={step(index + 2)}>
                <p className="font-semibold text-[#cdb8ff]">{point.title}</p>
                <p className="mt-1 text-[15px] leading-6 text-white/85">{point.text}</p>
              </li>
            ))}
          </ul>
        </Frame>
      );
    case "cta":
      return (
        <Frame center>
          <Kicker>{scene.kicker}</Kicker>
          <h2 className={`mt-2 text-[2.6rem] font-semibold leading-[1.05] tracking-[-0.04em] ${enter}`} style={step(1)}>{scene.title}</h2>
          <p className={`mt-4 text-[15px] leading-6 text-white/75 ${enter}`} style={step(2)}>{scene.text}</p>
          <button type="button" onClick={onClose} className={`mt-8 rounded-full bg-white px-6 py-3 text-sm font-bold text-[#122a20] ${enter}`} style={step(3)}>
            Back to the page
          </button>
        </Frame>
      );
  }
}

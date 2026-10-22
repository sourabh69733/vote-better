"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { Story } from "@/lib/story";
import Scene from "./Scene";

const SCENE_MS = 4500;

// Plays a story: full screen on phones, a centred card on larger screens.
// Tap right or left, hold to pause, swipe down or press Escape to close.
export default function StoryPlayer({ story, onClose }: { story: Story; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const dialog = useRef<HTMLDivElement>(null);
  const press = useRef<{ x: number; y: number; time: number; held: boolean } | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const last = story.scenes.length - 1;
  const progressRef = useRef(0);

  const go = useCallback((next: number) => {
    progressRef.current = 0;
    setIndex(Math.max(0, Math.min(last, next)));
    setProgress(0);
  }, [last]);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);

  // Progress lives in a ref so pausing resumes where it stopped without restarting the timer each tick.
  useEffect(() => {
    if (paused) return;
    const start = performance.now() - progressRef.current * SCENE_MS;
    const timer = setInterval(() => {
      const value = Math.min(1, (performance.now() - start) / SCENE_MS);
      progressRef.current = value;
      setProgress(value);
      if (value >= 1) {
        clearInterval(timer);
        if (index < last) go(index + 1);
      }
    }, 80);
    return () => clearInterval(timer);
  }, [index, paused, last, go]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") go(index + 1);
      if (event.key === "ArrowLeft") go(index - 1);
      if (event.key === " ") { event.preventDefault(); setPaused((value) => !value); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, go, onClose]);

  function onPointerDown(event: ReactPointerEvent) {
    if ((event.target as HTMLElement).closest("a,button")) return;
    press.current = { x: event.clientX, y: event.clientY, time: performance.now(), held: false };
    holdTimer.current = setTimeout(() => {
      if (press.current) press.current.held = true;
      setPaused(true);
    }, 250);
  }

  function onPointerUp(event: ReactPointerEvent) {
    clearTimeout(holdTimer.current);
    const start = press.current;
    press.current = null;
    if (!start) return;
    if (start.held) { setPaused(false); return; }
    if (event.clientY - start.y > 80) { onClose(); return; }
    const box = event.currentTarget.getBoundingClientRect();
    go(event.clientX - box.left < box.width / 3 ? index - 1 : index + 1);
  }

  const scene = story.scenes[index];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#07120d]/80 backdrop-blur-sm sm:p-6" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <button type="button" onClick={() => go(index - 1)} disabled={index === 0} aria-label="Previous scene"
        className="mr-4 hidden h-12 w-12 shrink-0 place-items-center rounded-full bg-white/10 text-2xl text-white hover:bg-white/20 disabled:opacity-30 sm:grid">‹</button>

      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-label={`Story about ${story.name}`}
        tabIndex={-1}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { clearTimeout(holdTimer.current); press.current = null; setPaused(false); }}
        className="relative flex h-full w-full touch-none select-none flex-col overflow-hidden bg-[#122a20] text-white outline-none sm:h-[min(760px,92vh)] sm:w-[min(430px,92vw)] sm:rounded-[28px] sm:shadow-2xl"
      >
        <div className="absolute inset-x-0 top-0 h-1" style={{ background: story.color }} aria-hidden="true" />
        <div className="relative z-10 flex gap-1 px-4 pt-4">
          {story.scenes.map((item, position) => (
            <span key={`${item.kind}-${position}`} className="h-1 flex-1 overflow-hidden rounded-full bg-white/25">
              <span className="block h-full bg-white" style={{ width: `${position < index ? 100 : position === index ? progress * 100 : 0}%` }} />
            </span>
          ))}
        </div>
        <div className="relative z-10 flex items-center justify-between px-4 pt-3 text-sm">
          <span className="font-semibold text-white/80">{story.name}</span>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setPaused(!paused)} aria-label={paused ? "Play" : "Pause"} className="grid h-9 w-9 place-items-center rounded-full text-white/80 hover:bg-white/10">{paused ? "▶" : "❚❚"}</button>
            <button type="button" onClick={onClose} aria-label="Close story" className="grid h-9 w-9 place-items-center rounded-full text-xl text-white/80 hover:bg-white/10">×</button>
          </div>
        </div>
        <div className="relative flex-1" aria-live="polite">
          <Scene key={index} scene={scene} color={story.color} onClose={onClose} />
        </div>
        <p className="relative z-10 pb-4 text-center text-xs text-white/45">{index + 1} of {story.scenes.length} · tap to continue</p>
      </div>

      <button type="button" onClick={() => go(index + 1)} disabled={index === last} aria-label="Next scene"
        className="ml-4 hidden h-12 w-12 shrink-0 place-items-center rounded-full bg-white/10 text-2xl text-white hover:bg-white/20 disabled:opacity-30 sm:grid">›</button>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";

type Format = "story" | "post";

interface Props {
  deckKey: string;
  title: string;
  frames: number;
  link: string;
  caption: { en: string; hi: string };
  hashtags: string[];
}

const SIZE: Record<Format, { width: number; height: number; label: string }> = {
  story: { width: 1080, height: 1920, label: "Story or reel (9:16)" },
  post: { width: 1080, height: 1350, label: "Carousel post (4:5)" },
};
const SECONDS_PER_FRAME = 2.6;
const FADE = 0.4;

const imageUrl = (format: Format, index: number, key: string) => `/share/image/${format}/${index + 1}/${key}`;
const fileName = (key: string, format: Format, index: number) => `votebetter-${key.replace(/\//g, "-")}-${format}-${index + 1}.png`;

async function asFiles(key: string, format: Format, frames: number) {
  return Promise.all(Array.from({ length: frames }, async (_, index) => {
    const blob = await (await fetch(imageUrl(format, index, key))).blob();
    return new File([blob], fileName(key, format, index), { type: "image/png" });
  }));
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`could not load ${src}`));
    image.src = src;
  });
}

// Plays the story frames on a canvas and records them as a video. Records in real time.
async function recordReel(key: string, frames: number, onProgress: (share: number) => void) {
  const types = ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm"];
  const type = types.find((candidate) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(candidate));
  if (!type) throw new Error("This browser cannot record video.");
  const images = await Promise.all(Array.from({ length: frames }, (_, index) => loadImage(imageUrl("story", index, key))));
  const canvas = document.createElement("canvas");
  canvas.width = 1080; canvas.height = 1920;
  const context = canvas.getContext("2d")!;
  const stream = canvas.captureStream(30);
  const recorder = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 6_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
  const done = new Promise<void>((resolve) => { recorder.onstop = () => resolve(); });
  const total = frames * SECONDS_PER_FRAME * 1000;
  recorder.start(250);
  const started = performance.now();
  await new Promise<void>((resolve) => {
    const draw = () => {
      const elapsed = performance.now() - started;
      const position = Math.min(elapsed / (SECONDS_PER_FRAME * 1000), frames - 0.0001);
      const index = Math.floor(position);
      const within = (position - index) * SECONDS_PER_FRAME;
      context.globalAlpha = 1;
      context.drawImage(images[index], 0, 0);
      if (index + 1 < frames && within > SECONDS_PER_FRAME - FADE) {
        context.globalAlpha = (within - (SECONDS_PER_FRAME - FADE)) / FADE;
        context.drawImage(images[index + 1], 0, 0);
      }
      onProgress(Math.min(elapsed / total, 1));
      if (elapsed < total) requestAnimationFrame(draw); else resolve();
    };
    requestAnimationFrame(draw);
  });
  recorder.stop();
  await done;
  return new File([new Blob(chunks, { type })], `votebetter-${key.replace(/\//g, "-")}.${type.startsWith("video/mp4") ? "mp4" : "webm"}`, { type });
}

export default function ShareKit({ deckKey, title, frames, link, caption, hashtags }: Props) {
  const [format, setFormat] = useState<Format>("story");
  const [language, setLanguage] = useState<"en" | "hi">("en");
  const [status, setStatus] = useState("");
  const [reel, setReel] = useState<{ url: string; file: File } | null>(null);
  const [recording, setRecording] = useState<number | null>(null);
  const url = typeof window === "undefined" ? link : new URL(link, window.location.origin).toString();
  const text = useMemo(() => `${caption[language]}\n\n${url}\n\n${hashtags.join(" ")}`, [caption, language, url, hashtags]);

  async function shareImages() {
    setStatus("Preparing images…");
    try {
      const files = await asFiles(deckKey, format, frames);
      if (navigator.canShare?.({ files })) {
        await navigator.share({ files, title, text });
        setStatus("Shared.");
      } else {
        setStatus("This browser cannot share images directly. Save them below, then post from your phone.");
      }
    } catch (error) {
      setStatus(error instanceof Error && error.name === "AbortError" ? "" : "Sharing did not work. Save the images below instead.");
    }
  }

  async function makeReel() {
    setReel(null);
    setRecording(0);
    setStatus("Recording the reel. Keep this tab open.");
    try {
      const file = await recordReel(deckKey, frames, setRecording);
      setReel({ url: URL.createObjectURL(file), file });
      setStatus(file.type.startsWith("video/mp4") ? "Reel ready." : "Reel ready as WebM. Some apps need MP4; try Safari or a recent Chrome for MP4.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not make the reel.");
    } finally {
      setRecording(null);
    }
  }

  async function shareReel() {
    if (!reel) return;
    try {
      if (navigator.canShare?.({ files: [reel.file] })) await navigator.share({ files: [reel.file], title, text });
      else setStatus("This browser cannot share video directly. Save it and post from your phone.");
    } catch { /* closed the share sheet */ }
  }

  async function copyCaption() {
    try { await navigator.clipboard.writeText(text); setStatus("Caption copied."); } catch { setStatus("Select the caption and copy it."); }
  }

  const size = SIZE[format];
  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-full border border-line-strong bg-white p-1" role="group" aria-label="Image size">
          {(Object.keys(SIZE) as Format[]).map((option) => (
            <button key={option} type="button" onClick={() => setFormat(option)} aria-pressed={format === option}
              className={`min-h-10 rounded-full px-4 text-sm font-bold ${format === option ? "bg-brand text-white" : "text-link"}`}>{SIZE[option].label}</button>
          ))}
        </div>
        <button type="button" onClick={shareImages} className="min-h-11 rounded-full bg-brand px-5 text-sm font-bold text-white hover:bg-brand-strong">Share {frames} images</button>
        {format === "story" && (
          <button type="button" onClick={makeReel} disabled={recording !== null} className="min-h-11 rounded-full border border-line-strong bg-white px-5 text-sm font-bold text-link hover:bg-tint disabled:opacity-60">
            {recording === null ? "Make a reel" : `Recording… ${Math.round(recording * 100)}%`}
          </button>
        )}
      </div>
      <p className="-mt-4 min-h-5 text-sm text-link" aria-live="polite">{status}</p>

      {reel && (
        <div className="flex flex-wrap items-start gap-5 rounded-[22px] border border-line bg-white p-5">
          <video src={reel.url} controls playsInline className="w-40 rounded-xl" />
          <div className="grid gap-2">
            <p className="font-semibold text-ink">Your reel</p>
            <button type="button" onClick={shareReel} className="min-h-10 rounded-full bg-brand px-4 text-sm font-bold text-white">Share reel</button>
            <a href={reel.url} download={reel.file.name} className="text-sm font-semibold text-link underline">Save video</a>
          </div>
        </div>
      )}

      <ol className="flex snap-x gap-4 overflow-x-auto pb-3" aria-label="Frames">
        {Array.from({ length: frames }, (_, index) => (
          <li key={`${format}-${index}`} className="w-[180px] shrink-0 snap-start sm:w-[220px]">
            {/* eslint-disable-next-line @next/next/no-img-element -- generated PNGs, already sized */}
            <img src={imageUrl(format, index, deckKey)} alt={`Frame ${index + 1} of ${frames}`} width={size.width} height={size.height} loading={index < 3 ? "eager" : "lazy"}
              className="h-auto w-full rounded-2xl border border-line bg-story" />
            <a href={imageUrl(format, index, deckKey)} download={fileName(deckKey, format, index)} className="mt-2 inline-block text-sm font-semibold text-link underline">Save frame {index + 1}</a>
          </li>
        ))}
      </ol>

      <section className="rounded-[22px] border border-line bg-white p-5 sm:p-6" aria-labelledby="caption-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="caption-heading" className="text-lg font-semibold text-ink">Caption</h2>
          <div className="inline-flex rounded-full border border-line-strong p-1" role="group" aria-label="Caption language">
            {([["en", "English"], ["hi", "Hinglish"]] as const).map(([value, label]) => (
              <button key={value} type="button" onClick={() => setLanguage(value)} aria-pressed={language === value}
                className={`min-h-9 rounded-full px-3 text-sm font-bold ${language === value ? "bg-brand text-white" : "text-link"}`}>{label}</button>
            ))}
          </div>
        </div>
        <textarea readOnly value={text} rows={7} aria-label="Caption text" className="mt-4 w-full rounded-xl border border-line bg-surface-soft p-4 text-sm leading-6 text-ink" />
        <button type="button" onClick={copyCaption} className="mt-3 min-h-10 rounded-full border border-line-strong px-4 text-sm font-bold text-link hover:bg-tint">Copy caption</button>
      </section>
    </div>
  );
}

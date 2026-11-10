"use client";

import { useMemo, useState } from "react";

import { markQuest } from "@/lib/quests";

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

// Saves files one after another, for browsers that cannot hand them to an app.
function saveAll(files: File[]) {
  files.forEach((file, index) => setTimeout(() => {
    const url = URL.createObjectURL(file);
    const anchor = Object.assign(document.createElement("a"), { href: url, download: file.name });
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }, index * 300));
}

// Instagram and YouTube let no website post for you. On a phone the share menu hands the files to the
// app; elsewhere the files are saved, the caption copied, and the app's own upload page linked.
const APPS = {
  instagram: { label: "Instagram", upload: "https://www.instagram.com/", tone: "bg-[linear-gradient(45deg,#f09433,#dc2743_50%,#bc1888)] text-white" },
  youtube: { label: "YouTube Shorts", upload: "https://www.youtube.com/upload", tone: "bg-[#ff0033] text-white" },
} as const;

export default function ShareKit({ deckKey, title, frames, link, caption, hashtags }: Props) {
  const [format, setFormat] = useState<Format>("story");
  const [language, setLanguage] = useState<"en" | "hi">("en");
  const [status, setStatus] = useState("");
  const [reel, setReel] = useState<{ url: string; file: File } | null>(null);
  const [recording, setRecording] = useState<number | null>(null);
  const [next, setNext] = useState<{ label: string; href: string } | null>(null);
  const url = typeof window === "undefined" ? link : new URL(link, window.location.origin).toString();
  const text = useMemo(() => `${caption[language]}\n\n${url}\n\n${hashtags.join(" ")}`, [caption, language, url, hashtags]);

  async function shareImages() {
    setStatus("Preparing images…");
    try {
      const files = await asFiles(deckKey, format, frames);
      if (navigator.canShare?.({ files })) {
        await navigator.share({ files, title, text });
        setStatus("Shared.");
        markQuest("share-a-story", deckKey);
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
      markQuest("share-a-story", deckKey);
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

  async function quietCopy() {
    try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
  }

  async function toInstagram() {
    setNext(null);
    setStatus("Preparing images…");
    try {
      const files = await asFiles(deckKey, format, frames);
      const copied = await quietCopy();
      if (navigator.canShare?.({ files })) {
        await navigator.share({ files, title, text });
        setStatus(`Pick Instagram in the share menu.${copied ? " The caption is copied, so paste it in." : ""}`);
      } else {
        saveAll(files);
        setNext({ label: "Open Instagram", href: APPS.instagram.upload });
        setStatus(`Saved ${files.length} images${copied ? " and copied the caption" : ""}. Instagram only posts from its app: open it on your phone and pick the saved images${format === "story" ? " for your story" : " as one carousel post"}.`);
      }
      markQuest("share-a-story", deckKey);
    } catch (error) {
      setStatus(error instanceof Error && error.name === "AbortError" ? "" : "That did not work. Save the images below instead.");
    }
  }

  async function toYouTube() {
    setNext(null);
    try {
      let file = reel?.file;
      if (!file) {
        setRecording(0);
        setStatus("Making a vertical video for Shorts. Keep this tab open, it takes a few seconds.");
        file = await recordReel(deckKey, frames, setRecording);
        setReel({ url: URL.createObjectURL(file), file });
        setRecording(null);
      }
      const copied = await quietCopy();
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title, text });
        setStatus(`Pick YouTube in the share menu and post it as a Short.${copied ? " The caption is copied." : ""}`);
      } else {
        saveAll([file]);
        setNext({ label: "Open YouTube upload", href: APPS.youtube.upload });
        setStatus(`Saved the video${copied ? " and copied the caption" : ""}. Upload it on YouTube: a vertical video under three minutes becomes a Short.`);
      }
      markQuest("share-a-story", deckKey);
    } catch (error) {
      setRecording(null);
      setStatus(error instanceof Error && error.name === "AbortError" ? "" : error instanceof Error ? error.message : "Could not make the video.");
    }
  }

  async function copyCaption() {
    try { await navigator.clipboard.writeText(text); setStatus("Caption copied."); } catch { setStatus("Select the caption and copy it."); }
  }

  const size = SIZE[format];
  return (
    <div className="grid gap-8">
      <section aria-labelledby="post-heading" className="rounded-[22px] border border-line bg-white p-5 sm:p-6">
        <h2 id="post-heading" className="text-lg font-semibold text-ink">Post it</h2>
        <p className="mt-1 text-sm text-muted">On a phone, this opens your share menu with everything attached. On a computer, it saves the files and copies the caption.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" onClick={toInstagram} className={`inline-flex min-h-12 items-center gap-2 rounded-full px-5 text-sm font-bold shadow-sm transition hover:-translate-y-0.5 ${APPS.instagram.tone}`}>
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" /></svg>
            Share to Instagram
          </button>
          <button type="button" onClick={toYouTube} disabled={recording !== null} className={`inline-flex min-h-12 items-center gap-2 rounded-full px-5 text-sm font-bold shadow-sm transition hover:-translate-y-0.5 disabled:opacity-60 ${APPS.youtube.tone}`}>
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true"><path d="M21.6 7.2a2.6 2.6 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.6 2.6 0 0 0 2.4 7.2 27 27 0 0 0 2 12a27 27 0 0 0 .4 4.8 2.6 2.6 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.6 2.6 0 0 0 1.8-1.8A27 27 0 0 0 22 12a27 27 0 0 0-.4-4.8zM10 15V9l5.2 3z" /></svg>
            {recording === null ? "Share to YouTube Shorts" : `Making video… ${Math.round(recording * 100)}%`}
          </button>
        </div>
        {next && (
          <a href={next.href} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-semibold text-link underline underline-offset-4">{next.label} ↗</a>
        )}
      </section>
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
            <a href={imageUrl(format, index, deckKey)} download={fileName(deckKey, format, index)} onClick={() => markQuest("share-a-story", deckKey)} className="mt-2 inline-block text-sm font-semibold text-link underline">Save frame {index + 1}</a>
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

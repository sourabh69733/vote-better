import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { constitutionSource, type GuideSourceKind } from "@/lib/constitution";
import { constitutionGuides, getConstitutionGuide } from "@/records/constitution-guides";
import { constitutionReviewNote } from "@/records/constitution";

interface PageProps {
  params: Promise<{ guide: string }>;
}

export function generateStaticParams() {
  return constitutionGuides.map((guide) => ({ guide: guide.id }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { guide: id } = await params;
  const guide = getConstitutionGuide(id);
  return { title: guide ? `${guide.title} | Vote Better` : "Guide not found" };
}

const kindStyles: Record<GuideSourceKind, { label: string; className: string }> = {
  constitution: { label: "Constitution", className: "bg-[#e3f1e6] text-[#1d6547]" },
  court: { label: "Supreme Court", className: "bg-[#e5eef8] text-[#28507a]" },
  law: { label: "Ordinary law", className: "bg-[#f6efdc] text-[#7a5d1c]" },
};

const glanceStyles = {
  yes: { mark: "✓", className: "border-[#bcdcc5] bg-[#eff7ef]", markClass: "bg-[#1c6047] text-white" },
  limit: { mark: "!", className: "border-[#ead9a6] bg-[#fbf6e8]", markClass: "bg-[#b58a1c] text-white" },
  no: { mark: "✕", className: "border-[#efc9c2] bg-[#fcf1ee]", markClass: "bg-[#a8432f] text-white" },
};

export default async function GuidePage({ params }: PageProps) {
  const { guide: id } = await params;
  const guide = getConstitutionGuide(id);
  if (!guide) notFound();

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 pb-14 pt-8 sm:px-6 sm:pt-12 lg:px-8">
      <Link href="/constitution" className="text-sm font-semibold text-[#286b4e] hover:underline">← Constitution, simply</Link>

      <header className="mt-6">
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#2a7658]">Guide</p>
        <h1 className="mt-4 text-[clamp(2.3rem,5vw,3.8rem)] font-semibold leading-[1.04] tracking-[-0.07em] text-[#19372d]">{guide.title}</h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-[#576c60]">{guide.summary}</p>
      </header>

      <section className="mt-8 grid gap-3 sm:grid-cols-3" aria-label="At a glance">
        {guide.glance.map((item) => {
          const style = glanceStyles[item.tone];
          return (
            <div key={item.heading} className={`rounded-2xl border p-5 ${style.className}`}>
              <div className="flex items-center gap-3">
                <span className={`grid h-7 w-7 place-items-center rounded-full text-sm font-bold ${style.markClass}`} aria-hidden="true">{style.mark}</span>
                <h2 className="text-lg font-semibold tracking-[-0.02em] text-[#19372d]">{item.heading}</h2>
              </div>
              <p className="mt-3 text-sm leading-6 text-[#43594a]">{item.text}</p>
            </div>
          );
        })}
      </section>

      <div className="mt-6 flex flex-wrap items-center gap-2 text-xs font-semibold text-[#66796d]">
        <span>Source of each point:</span>
        {Object.values(kindStyles).map((kind) => (
          <span key={kind.label} className={`rounded-full px-2.5 py-1 ${kind.className}`}>{kind.label}</span>
        ))}
      </div>

      <div className="mt-6 grid gap-4">
        {guide.sections.map((section, index) => (
          <section key={section.heading} className="rounded-[24px] border border-[#dce6dc] bg-white p-6 sm:p-8" aria-labelledby={`section-${index}`}>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#528166]">{String(index + 1).padStart(2, "0")}</p>
            <h2 id={`section-${index}`} className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#18372b]">{section.heading}</h2>
            <p className="mt-2 text-sm leading-6 text-[#66796d]">{section.intro}</p>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {section.items.map((item) => (
                <li key={item.label} className="rounded-2xl border border-[#e3ebe3] bg-[#fbfcfa] p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${kindStyles[item.kind].className}`}>{item.ref}</span>
                  </div>
                  <p className="mt-2 font-semibold text-[#19372d]">{item.label}</p>
                  <p className="mt-1 text-sm leading-6 text-[#4f6455]">{item.detail}</p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <section className="mt-4 rounded-[24px] bg-[#173a34] p-6 text-white sm:p-8" aria-labelledby="checklist-heading">
        <h2 id="checklist-heading" className="text-2xl font-semibold tracking-[-0.04em]">Before you go</h2>
        <ol className="mt-4 grid gap-3">
          {guide.checklist.map((item, index) => (
            <li key={item} className="flex gap-3 text-[15px] leading-7 text-[#d7e8dc]">
              <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#2c5d50] text-xs font-bold text-[#9fd5b3]">{index + 1}</span>
              {item}
            </li>
          ))}
        </ol>
      </section>

      <p className="mt-6 text-xs leading-5 text-[#7a8c7e]">
        Simple summaries, not legal advice. For your situation, speak to a lawyer or legal aid service. Official text:{" "}
        <a href={constitutionSource.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#286b4e] underline">{constitutionSource.title} ↗</a>. {constitutionReviewNote}
      </p>
    </div>
  );
}

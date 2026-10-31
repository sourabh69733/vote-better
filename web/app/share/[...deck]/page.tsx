import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import ShareKit from "@/components/share/ShareKit";
import { resolveDeck, type Deck } from "@/lib/share/decks";

interface PageProps { params: Promise<{ deck: string[] }> }

export const revalidate = 86400;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const deck = resolveDeck((await params).deck);
  return deck
    ? { title: `Share: ${deck.title} | Vote Better`, description: deck.caption.en, robots: { index: false }, openGraph: { images: [`/share/image/post/1/${deck.key}`] } }
    : { title: "Not found" };
}

// Other decks a voter might share next, from the same seat or state.
function related(deck: Deck): { href: string; label: string }[] {
  const [template, id, state, seat] = deck.key.split("/");
  const links: { href: string; label: string }[] = [];
  if ((template === "seat" || template === "quiz") && seat) {
    links.push(template === "seat" ? { href: `/share/quiz/${id}/${state}/${seat}`, label: "Make it a quiz" } : { href: `/share/seat/${id}/${state}/${seat}`, label: "Seat in 60 seconds" });
    links.push({ href: `/share/closest/${id}/${state}`, label: "Closest fights in this state" });
  }
  if (template === "closest") links.push({ href: `/elections/${id}`, label: "Pick a seat from this election" });
  links.push({ href: "/share/first-time-voter", label: "First-time voter guide" }, { href: "/share/mp-role", label: "What does an MP do?" });
  return links.filter((link) => link.href !== `/share/${deck.key}`);
}

export default async function SharePage({ params }: PageProps) {
  const deck = resolveDeck((await params).deck);
  if (!deck) notFound();
  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 pb-14 pt-8 sm:px-6 sm:pt-12 lg:px-8">
      <nav className="text-sm font-semibold text-link" aria-label="Breadcrumb">
        <Link href={deck.link} className="hover:underline">← Back to the page</Link>
      </nav>
      <header className="mt-6 max-w-2xl">
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-eyebrow">Share</p>
        <h1 className="mt-3 text-[clamp(2rem,5vw,3.2rem)] font-semibold leading-[1.05] tracking-[-0.05em] text-ink">{deck.title}</h1>
        <p className="mt-3 text-[15px] leading-7 text-body">
          Ready-made images for an Instagram story, carousel or reel. Every frame shows its source, and the caption links back to the page so anyone can check it.
        </p>
      </header>
      <div className="mt-8">
        <ShareKit deckKey={deck.key} title={deck.title} frames={deck.scenes.length} link={deck.link} caption={deck.caption} hashtags={deck.hashtags} />
      </div>
      <section className="mt-10" aria-labelledby="more-heading">
        <h2 id="more-heading" className="text-lg font-semibold text-ink">More to share</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {related(deck).map((link) => (
            <li key={link.href}><Link href={link.href} className="inline-flex min-h-10 items-center rounded-full border border-line-strong bg-white px-4 text-sm font-bold text-link hover:bg-tint">{link.label}</Link></li>
          ))}
        </ul>
      </section>
      <p className="mt-10 max-w-2xl text-xs leading-5 text-subtle">
        Templates run the same way for every seat and party. They show results and official facts only: no predictions, no photos, no opinions about anyone.
      </p>
    </div>
  );
}

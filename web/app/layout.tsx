import type { Metadata } from "next";
import QuestListener from "@/components/quests/QuestListener";
import { Bricolage_Grotesque, Plus_Jakarta_Sans } from "next/font/google";
import Link from "next/link";
import "./globals.css";

// Bricolage Grotesque for headings and big numbers, Plus Jakarta Sans for reading.
const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display-face", axes: ["opsz"] });
const body = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-body-face" });

export const metadata: Metadata = {
  // Set NEXT_PUBLIC_SITE_URL in production so link previews point at the public address.
  ...(process.env.NEXT_PUBLIC_SITE_URL ? { metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL) } : {}),
  title: "Vote Better",
  description:
    "Explore sourced public records about elected representatives and candidates in India.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Browser extensions can add attributes to <html> before React hydrates it.
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <body className="min-h-screen flex flex-col bg-canvas text-ink font-sans">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b border-line bg-canvas/90 backdrop-blur-md">
          <div className="mx-auto flex h-[72px] w-full max-w-[1320px] items-center justify-between px-4 sm:px-6 lg:px-8">
            <Link href="/" className="flex shrink-0 items-center gap-2.5 group">
              <span className="grid h-9 w-9 -rotate-6 place-items-center rounded-xl bg-ink text-xl font-black text-pop transition-transform group-hover:rotate-0" aria-hidden="true">✓</span>
              <span className="font-display whitespace-nowrap text-xl font-bold tracking-[-0.025em] text-ink">
                Vote Better
              </span>
            </Link>
            <nav className="ml-4 flex min-w-0 items-center gap-4 overflow-x-auto whitespace-nowrap [scrollbar-width:none] text-sm font-semibold sm:gap-7">
              <Link
                href="/seats"
                className="text-body transition-colors hover:text-brand"
              >
                Seats
              </Link>
              <Link href="/elections" className="text-body transition-colors hover:text-brand">Elections</Link>
              <Link href="/quests" className="text-body transition-colors hover:text-brand">Quests</Link>
              <Link
                href="/constitution"
                className="text-body transition-colors hover:text-brand"
              >
                Constitution
              </Link>
              <Link href="/delhi" className="text-body transition-colors hover:text-brand">Delhi</Link>
              {process.env.NODE_ENV === "development" && <Link href="/mps" className="text-body transition-colors hover:text-brand">MPs</Link>}
              <Link
                href="/about"
                className="text-body transition-colors hover:text-brand"
              >
                About
              </Link>
            </nav>
          </div>
        </header>

        {/* Main Content */}
        <QuestListener />
        <main className="flex-1">{children}</main>

        {/* Footer */}
        <footer className="mt-10 border-t border-line py-7">
          <div className="mx-auto w-full max-w-[1320px] px-4 text-xs text-subtle sm:px-6 lg:px-8">
            <p>
              Open source · Not affiliated with any political party ·{" "}
              <Link
                href="/about"
                className="font-semibold text-link hover:underline"
              >
                Data Sources
              </Link>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}

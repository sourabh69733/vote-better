import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
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
    <html lang="en" className={`${inter.variable}`} suppressHydrationWarning>
      <body className="min-h-screen flex flex-col bg-[#f5f7f2] text-slate-900 font-sans">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b border-[#e1e9e0] bg-[#f5f7f2]/95 backdrop-blur-md">
          <div className="mx-auto flex h-[72px] w-full max-w-[1320px] items-center justify-between px-4 sm:px-6 lg:px-8">
            <Link href="/" className="flex shrink-0 items-center gap-2 group">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#1e6b4d] text-xl font-bold text-white" aria-hidden="true">✓</span>
              <span className="whitespace-nowrap text-lg font-extrabold tracking-[-0.05em] text-[#18372a] transition-colors group-hover:text-[#1e6b4d]">
                Vote Better
              </span>
            </Link>
            <nav className="ml-4 flex min-w-0 items-center gap-4 overflow-x-auto whitespace-nowrap [scrollbar-width:none] text-sm font-semibold sm:gap-7">
              <Link
                href="/"
                className="text-[#526a59] transition-colors hover:text-[#1e6b4d]"
              >
                Areas
              </Link>
              <Link
                href="/constitution"
                className="text-[#526a59] transition-colors hover:text-[#1e6b4d]"
              >
                Constitution
              </Link>
              <Link href="/delhi" className="text-[#526a59] transition-colors hover:text-[#1e6b4d]">Delhi</Link>
              {process.env.NODE_ENV === "development" && <Link href="/mps" className="text-[#526a59] transition-colors hover:text-[#1e6b4d]">MPs</Link>}
              <Link
                href="/about"
                className="text-[#526a59] transition-colors hover:text-[#1e6b4d]"
              >
                About
              </Link>
            </nav>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1">{children}</main>

        {/* Footer */}
        <footer className="mt-10 border-t border-[#dce5db] py-7">
          <div className="mx-auto w-full max-w-[1320px] px-4 text-xs text-[#738477] sm:px-6 lg:px-8">
            <p>
              Open source · Not affiliated with any political party ·{" "}
              <Link
                href="/about"
                className="text-emerald-800 hover:text-emerald-950 hover:underline"
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

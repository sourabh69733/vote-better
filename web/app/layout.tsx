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
    "Explore verified public records about elected representatives and candidates in India.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <body className="min-h-screen flex flex-col bg-[#f7f8f5] text-slate-900 font-sans">
        {/* Header */}
        <header className="bg-white/90 backdrop-blur-md border-b border-emerald-950/10 sticky top-0 z-50">
          <div className="mx-auto flex h-16 w-full max-w-[1480px] items-center justify-between px-4 sm:px-6 lg:px-10">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-800 text-xl font-bold text-white" aria-hidden="true">✓</span>
              <span className="text-lg font-extrabold tracking-tight text-emerald-950 group-hover:text-emerald-700 transition-colors">
                Vote Better
              </span>
            </Link>
            <nav className="flex items-center gap-5 text-sm font-medium">
              <Link
                href="/"
                className="text-slate-600 hover:text-emerald-800 transition-colors"
              >
                Areas
              </Link>
              <Link
                href="/about"
                className="text-slate-600 hover:text-emerald-800 transition-colors"
              >
                About
              </Link>
            </nav>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1">{children}</main>

        {/* Footer */}
        <footer className="mt-12 border-t border-emerald-950/10 py-8">
          <div className="mx-auto w-full max-w-[1480px] px-4 text-sm text-slate-500 sm:px-6 lg:px-10">
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

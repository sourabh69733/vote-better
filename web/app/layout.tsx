import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Vote Better — Know Your Candidates",
  description:
    "Make every Indian voter understand their candidates in 30 seconds. Facts-based, neutral, open source.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-50 font-sans">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl">🗳️</span>
              <span className="font-bold text-lg text-slate-900">
                Vote Better
              </span>
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link
                href="/quiz"
                className="text-slate-600 hover:text-indigo-600 transition-colors"
              >
                Quiz
              </Link>
              <Link
                href="/about"
                className="text-slate-600 hover:text-indigo-600 transition-colors"
              >
                About
              </Link>
            </nav>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1">{children}</main>

        {/* Footer */}
        <footer className="bg-white border-t border-slate-200 py-6">
          <div className="max-w-4xl mx-auto px-4 text-center text-sm text-slate-500">
            <p>
              Open source · Not affiliated with any political party ·{" "}
              <Link href="/about" className="text-indigo-600 hover:underline">
                Data Sources & Methodology
              </Link>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}

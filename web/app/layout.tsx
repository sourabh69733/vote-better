import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Vote Better - Jaipur pilot",
  description:
    "A source-backed pilot profile for Jaipur's elected Lok Sabha representative.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <body className="min-h-screen flex flex-col bg-[#f8fafc] text-slate-900 font-sans">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="text-xl">🗳️</span>
              <span className="font-bold text-lg text-slate-800 group-hover:text-indigo-600 transition-colors">
                Vote Better
              </span>
            </Link>
            <nav className="flex items-center gap-5 text-sm font-medium">
              <Link
                href="/"
                className="text-slate-500 hover:text-indigo-600 transition-colors"
              >
                Jaipur pilot
              </Link>
              <Link
                href="/about"
                className="text-slate-500 hover:text-indigo-600 transition-colors"
              >
                About
              </Link>
            </nav>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1">{children}</main>

        {/* Footer */}
        <footer className="border-t border-slate-100 py-8 mt-12">
          <div className="max-w-4xl mx-auto px-4 text-center text-sm text-slate-400">
            <p>
              Open source · Not affiliated with any political party ·{" "}
              <Link
                href="/about"
                className="text-indigo-500 hover:text-indigo-600 hover:underline"
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

import Link from "next/link";
import type { ReactNode } from "react";

// Shared building blocks. Colours come from the tokens in app/globals.css.

export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`text-xs font-extrabold uppercase tracking-[0.16em] text-eyebrow ${className}`}>{children}</p>;
}

export function Breadcrumb({ items }: { items: { href: string; label: string }[] }) {
  return (
    <nav className="text-sm font-semibold text-link" aria-label="Breadcrumb">
      {items.map((item, index) => (
        <span key={item.href}>
          {index > 0 && <span className="mx-2 text-subtle" aria-hidden="true">/</span>}
          <Link href={item.href} className="hover:underline">{item.label}</Link>
        </span>
      ))}
    </nav>
  );
}

export function Card({ children, className = "", labelledBy }: { children: ReactNode; className?: string; labelledBy?: string }) {
  return <section aria-labelledby={labelledBy} className={`rounded-[24px] border border-line bg-surface p-5 sm:p-7 ${className}`}>{children}</section>;
}

export function SectionHeading({ id, title, lead }: { id: string; title: string; lead?: ReactNode }) {
  return (
    <div>
      <h2 id={id} className="text-2xl font-semibold tracking-[-0.04em] text-ink">{title}</h2>
      {lead ? <p className="mt-1 text-sm text-muted">{lead}</p> : null}
    </div>
  );
}

const buttonStyle = {
  primary: "bg-brand text-white hover:bg-brand-strong",
  secondary: "border border-line-strong bg-surface text-link hover:bg-tint",
};

export function ButtonLink({ href, children, variant = "secondary", className = "" }: { href: string; children: ReactNode; variant?: keyof typeof buttonStyle; className?: string }) {
  return <Link href={href} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-bold ${buttonStyle[variant]} ${className}`}>{children}</Link>;
}

export function StatGrid({ stats }: { stats: [string, string][] }) {
  return (
    <dl className="grid grid-cols-2 gap-px bg-line-soft sm:grid-cols-4">
      {stats.map(([label, value]) => (
        <div key={label} className="bg-surface-soft p-4 sm:p-5">
          <dt className="text-xs font-bold uppercase tracking-[0.12em] text-subtle">{label}</dt>
          <dd className="mt-1 text-xl font-semibold text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

// The empty state for data we have not collected. It says what is missing; it never shows a zero.
export function NotCollected({ title, children, className = "" }: { title: string; children?: ReactNode; className?: string }) {
  return (
    <p className={`rounded-2xl border border-dashed border-line-strong bg-[repeating-linear-gradient(135deg,var(--color-track)_0_6px,var(--color-surface-soft)_6px_12px)] p-5 text-sm leading-6 text-body ${className}`}>
      <strong className="text-ink">{title}</strong>{children ? <> {children}</> : null}
    </p>
  );
}

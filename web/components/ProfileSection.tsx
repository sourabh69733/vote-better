import type { ReactNode } from "react";

interface ProfileSectionProps {
  id: string;
  number: string;
  title: string;
  description?: string;
  children: ReactNode;
}

export function ProfileSection({ id, number, title, description, children }: ProfileSectionProps) {
  return <section id={id} className="scroll-mt-28 border-t border-[#dce6dc] pb-8 pt-8 sm:pb-10 sm:pt-10" aria-labelledby={`${id}-heading`}>
    <div className="mb-5 flex gap-4">
      <span className="pt-1 text-xs font-bold tabular-nums text-[#387052]" aria-hidden="true">{number}</span>
      <div>
        <h2 id={`${id}-heading`} className="text-2xl font-semibold tracking-[-0.04em] text-[#19372d] sm:text-[1.75rem]">{title}</h2>
        {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-[#53695a]">{description}</p>}
      </div>
    </div>
    {children}
  </section>;
}

export function ProfileJumpLinks({ links }: { links: { href: string; label: string }[] }) {
  return <nav aria-label="On this profile" className="flex flex-wrap gap-2 border-b border-[#dce6dc] pb-5">
    {links.map((link) => <a key={link.href} href={link.href} className="inline-flex min-h-11 items-center rounded-full border border-[#cadccd] bg-white px-4 text-sm font-semibold text-[#245f43] transition-colors hover:border-[#8fb89b] hover:bg-[#edf5ed] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#226346]">{link.label}</a>)}
  </nav>;
}

export function ProfileDisclosure({ title, children }: { title: string; children: ReactNode }) {
  return <details className="group rounded-2xl border border-[#dce6dc] bg-white">
    <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-3 text-left font-semibold text-[#19372d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#226346] sm:px-6">
      {title}<span aria-hidden="true" className="text-xl text-[#286b4e] transition-transform group-open:rotate-180 motion-reduce:transition-none">⌄</span>
    </summary>
    <div className="border-t border-[#e3ebe3] px-5 py-5 sm:px-6">{children}</div>
  </details>;
}

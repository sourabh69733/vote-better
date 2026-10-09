import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadDelhiPublication } from "@/lib/delhi";

export const metadata: Metadata = { title: "Delhi institution | Vote Better" };

export default async function DelhiInstitutionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const publication = await loadDelhiPublication();
  const institution = publication.institutions.find((item) => item.id === id);
  if (!institution) notFound();
  const offices = publication.offices.filter((item) => item.institutionId === id);

  return <div className="mx-auto w-full max-w-[1120px] px-4 pb-16 pt-8 sm:px-6 sm:pt-12 lg:px-8">
    <Link href="/delhi" className="inline-flex min-h-11 items-center text-sm font-semibold text-[#1e6b4d] hover:underline">← Delhi directory</Link>
    <header className="mt-5 border-b border-[#d9e3da] pb-9"><p className="text-xs font-extrabold uppercase tracking-[0.15em] text-[#4c8063]">{institution.kind} / Delhi</p><h1 className="mt-3 text-[clamp(2.3rem,4vw,4rem)] font-semibold leading-[1.08] tracking-[-0.06em] text-[#19372d]">{institution.name}</h1><p className="mt-4 max-w-2xl text-base leading-7 text-[#53695b]">These entries show what the captured official source listed. A listed person is not automatically confirmed as the current officeholder.</p></header>
    <section aria-labelledby="offices-heading" className="py-9"><h2 id="offices-heading" className="text-2xl font-semibold tracking-[-0.04em] text-[#19372d]">Offices and contacts</h2><div className="mt-5 grid gap-4">{offices.map((office) => {
      const holders = publication.appointments.filter((item) => item.officeId === office.id).map((item) => ({ appointment: item, person: publication.people.find((person) => person.id === item.personId) })).filter((item) => item.person);
      const trace = publication.traces.find((item) => item.id === office.traceId);
      return <article id={`office-${office.id}`} key={office.id} className="scroll-mt-24 rounded-[24px] border border-[#d7e4d8] bg-white p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#528166]">Source-listed office</p><h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#19372d]">{office.title}</h3>
        {holders.length > 0 && <div className="mt-5"><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#738476]">Person shown in source</p>{holders.map(({ appointment, person }) => <div key={appointment.id} className="mt-3"><p className="text-lg font-semibold text-[#31513d]">{person?.name} <span className="ml-2 text-sm font-normal text-[#687b6d]">{appointment.status.replace("-", " ")}</span></p>{appointment.party && <p className="mt-1 text-sm text-[#65776a]">Party listed: {appointment.party}</p>}{appointment.officialProfileUrl && <a href={appointment.officialProfileUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm font-semibold text-[#1e6b4d] underline underline-offset-4">Official profile ↗</a>}</div>)}</div>}
        {office.officeContact && <div className="mt-5"><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#738476]">Official office contact</p><p className="mt-1 text-base font-medium text-[#31513d]">{office.officeContact}</p></div>}
        {trace && <details className="mt-6 border-t border-[#e3ebe3] pt-4"><summary className="cursor-pointer py-2 text-sm font-bold text-[#1e6b4d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1e6b4d]">Source and review details</summary><div className="mt-2 grid gap-2 text-sm leading-6 text-[#546a59]"><p>Captured: {new Date(trace.capturedAt).toLocaleString("en-IN")}</p><p>Checked: {new Date(trace.checkedAt).toLocaleString("en-IN")}</p><p>Reviewed: {new Date(trace.reviewedAt).toLocaleString("en-IN")}</p><p>Locator: {trace.locator}</p><a href={trace.sourceUrl} target="_blank" rel="noopener noreferrer" className="break-all font-semibold text-[#1e6b4d] underline underline-offset-4">Open official source ↗</a></div></details>}
      </article>;
    })}</div></section>
  </div>;
}

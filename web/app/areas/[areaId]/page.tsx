import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAreaOverview, listAreaOverviews } from "@/lib/civic-area";
import { ResultCoverage } from "@/components/ResultCoverage";

interface PageProps {
  params: Promise<{ areaId: string }>;
}

export function generateStaticParams() {
  return listAreaOverviews().map(({ area }) => ({ areaId: area.id }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { areaId } = await params;
  const overview = getAreaOverview(areaId);
  return { title: overview ? `${overview.area.label} | Vote Better` : "Area not found" };
}

export default async function AreaPage({ params }: PageProps) {
  const { areaId } = await params;
  const overview = getAreaOverview(areaId);
  if (!overview) notFound();

  return (
    <div className="mx-auto w-full max-w-[1320px] px-4 pb-14 pt-8 sm:px-6 sm:pt-12 lg:px-8">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-[#687c6e]">
        <Link href="/" className="font-semibold text-[#277050] hover:underline">Areas</Link>
        <span aria-hidden="true">/</span>
        <span>{overview.area.name}</span>
      </nav>

      <header className="mt-7 grid gap-6 border-b border-[#d9e3da] pb-9 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-end">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.17em] text-[#3f795a]">{overview.area.state} / {overview.area.kind.replaceAll("_", " ")}</p>
          <h1 className="mt-3 text-[clamp(3.2rem,5.5vw,5.6rem)] font-semibold leading-none tracking-[-0.075em] text-[#19372d]">{overview.area.name}</h1>
          <p className="mt-4 text-base text-[#617466]">{overview.area.label}</p>
        </div>
        <div className="grid gap-3">
          <div className="rounded-2xl border border-[#cddfcf] bg-[#eaf3e9] px-5 py-4">
            <strong className="text-3xl font-semibold tracking-[-0.05em] text-[#1d5f43]">{overview.links.length}</strong>
            <p className="mt-1 text-sm leading-5 text-[#4f6e58]">verified {overview.links.length === 1 ? "office holder" : "office holders"} in this area</p>
          </div>
          <ResultCoverage areaId={overview.area.id} />
        </div>
      </header>

      <div className="mt-10 grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section aria-labelledby="holders-heading">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#528166]">01 / People</p>
          <h2 id="holders-heading" className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-[#19372d]">Who holds office here</h2>
          <div className="mt-5 grid gap-4">
            {overview.links.map((link) => (
              <article key={link.id} className="rounded-[22px] border border-[#dce6dc] bg-white p-6 shadow-[0_12px_36px_rgba(28,64,40,.05)] sm:p-8">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                  <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#dceee0] text-lg font-bold text-[#1d6749]" aria-hidden="true">
                    {link.person.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#4f8965]">{link.office.title}</p>
                    <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#1b3327]">{link.person.name}</h3>
                    <p className="mt-2 text-sm leading-6 text-[#697b6e]">In office from {link.startedOn} · Reviewed {link.reviewedOn}</p>
                  </div>
                  <Link href={`/people/${link.person.slug}`} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-[#1d6046] px-5 text-sm font-bold text-white hover:bg-[#154b36]">
                    View profile <span aria-hidden="true">↗</span>
                  </Link>
                </div>
                <div className="mt-6 border-t border-[#e6ede6] pt-5">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.13em] text-[#7a8a7b]">Evidence for this connection</p>
                  <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
                    {link.sources.map((source) => <li key={source.id}>
                      <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-[#1d6547] underline decoration-[#9ec9a8] underline-offset-4 hover:text-[#104831]">{source.title} ↗</a>
                    </li>)}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="rounded-[22px] bg-[#173a34] p-7 text-white lg:mt-12" aria-labelledby="map-heading">
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#9bd3ae]">02 / Relationships</p>
          <h2 id="map-heading" className="mt-2 text-2xl font-semibold tracking-[-0.04em]">Follow the connection</h2>
          <p className="mt-3 text-sm leading-6 text-[#bbd6c4]">See how this area connects to its public office and current holder. Select a line to see its source.</p>
          <div className="mt-6 grid gap-5 text-sm">
            {overview.links.map((link) => <div key={link.id} className="border-l border-[#6a9d7e] pl-5">
              <p className="relative py-2 font-semibold before:absolute before:-left-[25px] before:top-[14px] before:h-2 before:w-2 before:rounded-full before:bg-[#bdecc5]">{overview.area.name}</p>
              <p className="relative py-2 text-[#c8dfcb] before:absolute before:-left-[25px] before:top-[14px] before:h-2 before:w-2 before:rounded-full before:bg-[#bdecc5]">{link.office.title}</p>
              <p className="relative py-2 font-semibold before:absolute before:-left-[25px] before:top-[14px] before:h-2 before:w-2 before:rounded-full before:bg-[#bdecc5]">{link.person.name}</p>
            </div>)}
          </div>
          <Link href={`/areas/${overview.area.id}/relationships`} className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-bold text-[#1a573f] hover:bg-[#e8f4e9]">
            Open relationship map <span aria-hidden="true">↗</span>
          </Link>
        </aside>
      </div>

      <p className="mt-8 text-xs leading-5 text-[#7b8a7c]">Only verified relationships appear. Missing offices and location matches are not inferred.</p>
    </div>
  );
}

import Link from "next/link";
import { listAreaOverviews } from "@/lib/civic-area";

export default function Home() {
  const areas = listAreaOverviews();

  return (
    <div className="mx-auto w-full max-w-[1320px] px-4 pb-14 pt-10 sm:px-6 sm:pt-16 lg:px-8">
      <header className="grid gap-7 border-b border-[#d9e3da] pb-12 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,.65fr)] lg:items-end lg:gap-16 lg:pb-16">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#2a7658]">Civic information, made clear</p>
          <h1 className="mt-5 max-w-4xl text-[clamp(2.7rem,5vw,4.8rem)] font-semibold leading-[1.02] tracking-[-0.075em] text-[#19372d]">
            Know who <span className="block text-[#43896a]">represents you.</span>
          </h1>
        </div>
        <div className="lg:pb-2">
          <p className="max-w-sm text-base leading-7 text-[#576c60]">
            Start with a place. Follow its public offices to the people who hold them, then check the records behind each connection.
          </p>
          <a href="#verified-areas" className="mt-6 inline-flex min-h-11 items-center gap-3 rounded-full bg-[#1c6047] px-5 text-sm font-bold text-white transition-colors hover:bg-[#154c38]">
            Explore verified areas <span aria-hidden="true">↗</span>
          </a>
          <Link href="/mps" className="ml-4 inline-flex min-h-11 items-center text-sm font-semibold text-[#286b4e] underline underline-offset-4">Browse MP profiles</Link>
          {process.env.NODE_ENV === "development" && <Link href="/research/pin" className="ml-4 inline-flex min-h-11 items-center text-sm font-semibold text-[#286b4e] underline underline-offset-4">
            Try PIN research preview
          </Link>}
        </div>
      </header>

      <section id="verified-areas" className="grid gap-6 py-12 lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-12" aria-labelledby="areas-heading">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#528166]">01 / Explore</p>
          <h2 id="areas-heading" className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[#19372d]">Verified areas</h2>
          <p className="mt-3 max-w-xs text-sm leading-6 text-[#66796d]">
            Coverage grows as records are checked. Today, {areas.length} {areas.length === 1 ? "area is" : "areas are"} available.
          </p>
        </div>

        <div className="grid gap-4">
          {areas.map(({ area, links }) => (
            <article key={area.id} className="overflow-hidden rounded-[24px] border border-[#dce6dc] bg-white shadow-[0_12px_36px_rgba(28,64,40,.05)]">
              <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-start sm:justify-between sm:p-8">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-[#4c8063]">{area.state} / {area.kind.replaceAll("_", " ")}</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#18372b] sm:text-3xl">{area.name}</h3>
                  <p className="mt-1 text-sm text-[#738276]">{area.label}</p>
                </div>
                <Link href={`/areas/${area.id}`} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-[#bed6c4] bg-[#eff7ef] px-5 text-sm font-bold text-[#216146] hover:bg-[#e0f0e3]">
                  Open area <span aria-hidden="true">↗</span>
                </Link>
              </div>

              <div className="border-t border-[#e6ede6] bg-[#f8faf7] px-6 py-5 sm:px-8">
                <p className="mb-4 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#77897b]">Verified connections</p>
                <div className="grid gap-3">
                  {links.map((link) => (
                    <div key={link.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
                      <span className="font-semibold text-[#31513d]">{area.name}</span>
                      <span className="text-[#a3b7a7]" aria-hidden="true">→</span>
                      <span className="text-[#667c6a]">{link.office.title}</span>
                      <span className="text-[#a3b7a7]" aria-hidden="true">→</span>
                      <Link href={`/people/${link.person.slug}`} className="font-bold text-[#1d6547] underline decoration-[#9ec9a8] underline-offset-4 hover:text-[#104831]">
                        {link.person.name}
                      </Link>
                      <span className="ml-auto text-xs text-[#839286]">Reviewed {link.reviewedOn}</span>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-6 rounded-[24px] bg-[#173a34] px-6 py-7 text-white sm:grid-cols-3 sm:gap-8 sm:px-8" aria-label="How Vote Better handles records">
        <div><span className="text-xs font-bold text-[#9fd5b3]">01</span><p className="mt-2 text-sm font-semibold">Every connection has a source</p></div>
        <div><span className="text-xs font-bold text-[#9fd5b3]">02</span><p className="mt-2 text-sm font-semibold">Review dates stay visible</p></div>
        <div><span className="text-xs font-bold text-[#9fd5b3]">03</span><p className="mt-2 text-sm font-semibold">Unverified facts stay out</p></div>
      </section>
    </div>
  );
}

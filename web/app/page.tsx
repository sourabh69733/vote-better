import Link from "next/link";
import { listAreaOverviews } from "@/lib/civic-area";

export default function Home() {
  const areas = listAreaOverviews();

  return (
    <div className="mx-auto w-full max-w-[1480px] px-4 pb-16 pt-6 sm:px-6 sm:pt-9 lg:px-10">
      <header className="grid gap-8 rounded-[28px] bg-[#173a34] px-6 py-10 text-white sm:px-10 sm:py-12 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end lg:px-12 lg:py-16">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.17em] text-emerald-200">Vote Better · India</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-extrabold leading-[1.08] tracking-[-0.05em] sm:text-5xl xl:text-6xl">
            Understand who represents you.
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-emerald-100 sm:text-base">
            Explore people, offices and the public records behind them. We add an
            area only when its relationships can be checked.
          </p>
        </div>
        <div className="rounded-2xl border border-white/25 bg-white/10 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-200">Available now</p>
          <p className="mt-3 text-2xl font-bold">{areas.length} verified {areas.length === 1 ? "area" : "areas"}</p>
          <p className="mt-2 text-sm leading-6 text-emerald-100">
            Coverage is limited while we verify more public records. No location is inferred from your PIN code.
          </p>
        </div>
      </header>

      <section className="mt-10" aria-labelledby="areas-heading">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Explore</p>
            <h2 id="areas-heading" className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Verified areas</h2>
          </div>
          <p className="max-w-lg text-sm leading-6 text-slate-600">
            Choose an area to see its current office holders, relationships and sources.
          </p>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {areas.map(({ area, links }) => (
            <article key={area.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">{area.state}</p>
              <h3 className="mt-2 text-xl font-bold text-slate-900">{area.label}</h3>
              <p className="mt-2 text-sm text-slate-600">
                {links.length} verified {links.length === 1 ? "office holder" : "office holders"}
              </p>
              <Link href={`/areas/${area.id}`} className="mt-6 inline-block text-sm font-bold text-emerald-800 underline underline-offset-4 hover:text-emerald-950">
                Explore area →
              </Link>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

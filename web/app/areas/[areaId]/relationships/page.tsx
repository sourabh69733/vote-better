import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAreaGraph } from "@/lib/civic-graph";
import { getAreaOverview, listAreaOverviews } from "@/lib/civic-area";
import RelationshipGraph from "./RelationshipGraph";

interface PageProps {
  params: Promise<{ areaId: string }>;
}

export function generateStaticParams() {
  return listAreaOverviews().map(({ area }) => ({ areaId: area.id }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { areaId } = await params;
  const overview = getAreaOverview(areaId);
  return { title: overview ? `${overview.area.name} relationship map | Vote Better` : "Area not found" };
}

export default async function RelationshipsPage({ params }: PageProps) {
  const { areaId } = await params;
  const overview = getAreaOverview(areaId);
  const graph = getAreaGraph(areaId);
  if (!overview || !graph) notFound();

  return <div className="mx-auto w-full max-w-[1480px] px-4 py-8 sm:px-6 sm:py-12 lg:px-10">
    <Link href={`/areas/${areaId}`} className="text-sm font-semibold text-emerald-800 hover:underline">← {overview.area.name} overview</Link>
    <header className="mt-7 max-w-3xl">
      <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Verified connections</p>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">How {overview.area.name} is represented</h1>
      <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
        This view follows verified connections from an area to its offices and
        their current holders. Select a connection to inspect the original records.
      </p>
    </header>
    <RelationshipGraph graph={graph} />
    <p className="mt-5 text-xs leading-5 text-slate-500">
      Only verified relationships appear here. Missing offices or people are not inferred.
    </p>
  </div>;
}

import type { Metadata } from "next";
import Link from "next/link";
import { getAreaGraph } from "@/lib/civic-graph";
import RelationshipGraph from "./RelationshipGraph";

export const metadata: Metadata = {
  title: "Jaipur relationship map | Vote Better",
  description: "A source-backed view of the Jaipur parliamentary constituency and its MP.",
};

export default function JaipurRelationshipsPage() {
  const graph = getAreaGraph("jaipur-lok-sabha");
  if (!graph) throw new Error("Jaipur relationship graph is missing");

  return <div className="mx-auto w-full max-w-[1480px] px-4 py-8 sm:px-6 sm:py-12 lg:px-10">
    <Link href="/" className="text-sm font-semibold text-emerald-800 hover:underline">← Jaipur overview</Link>
    <header className="mt-7 max-w-3xl">
      <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Verified connections</p>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">How Jaipur is represented</h1>
      <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
        This view follows one supported path from the Jaipur parliamentary
        constituency to its Lok Sabha office and the person holding it. Select
        a connection to inspect the original records.
      </p>
    </header>
    <RelationshipGraph graph={graph} />
    <p className="mt-5 text-xs leading-5 text-slate-500">
      Coverage is limited to this parliamentary link. No Assembly, ward,
      appointed-official or service-office relationship is inferred.
    </p>
  </div>;
}

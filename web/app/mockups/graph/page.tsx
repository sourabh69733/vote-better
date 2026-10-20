import type { Metadata } from "next";
import { notFound } from "next/navigation";
import GraphPrototype from "./GraphPrototype";

export const metadata: Metadata = {
  title: "Vote Better - relationship map mockup",
  description: "A fictional, interactive preview of civic relationships.",
  robots: { index: false, follow: false },
};

// Fictional data: keep it out of the public site, like the research pages.
export default function GraphMockupPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <GraphPrototype />;
}

import type { Metadata } from "next";
import GraphPrototype from "./GraphPrototype";

export const metadata: Metadata = {
  title: "Vote Better - relationship map mockup",
  description: "A fictional, interactive preview of civic relationships.",
  robots: { index: false, follow: false },
};

export default function GraphMockupPage() {
  return <GraphPrototype />;
}

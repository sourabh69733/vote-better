import { previewResponse, previewSize } from "@/lib/share/preview-image";
import { electionPreview } from "@/lib/share/previews";
import { elections } from "@/records/elections";

export const size = previewSize;
export const contentType = "image/png";
export const alt = "Election schedule and results";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const election = elections.find((item) => item.id === id);
  return previewResponse(election ? electionPreview(election) : null);
}

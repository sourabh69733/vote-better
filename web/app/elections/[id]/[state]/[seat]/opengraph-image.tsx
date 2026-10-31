import { isResultElection } from "@/lib/results";
import { previewResponse, previewSize } from "@/lib/share/preview-image";
import { seatPreview } from "@/lib/share/previews";

export const size = previewSize;
export const contentType = "image/png";
export const alt = "Election result for this seat";

export default async function Image({ params }: { params: Promise<{ id: string; state: string; seat: string }> }) {
  const { id, state, seat } = await params;
  return previewResponse(isResultElection(id) ? seatPreview(id, state, seat) : null);
}

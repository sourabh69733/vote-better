import { previewResponse, previewSize } from "@/lib/share/preview-image";
import { seatPreview } from "@/lib/share/previews";

export const size = previewSize;
export const contentType = "image/png";
export const alt = "Lok Sabha 2024 result for this seat";

export default async function Image({ params }: { params: Promise<{ state: string; seat: string }> }) {
  const { state, seat } = await params;
  return previewResponse(seatPreview("lok-sabha-2024", state, seat));
}

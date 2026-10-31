import { ImageResponse } from "next/og";

import { FORMATS, isFormat, resolveDeck } from "@/lib/share/decks";
import { FrameImage, loadFonts } from "@/lib/share/render";

export const runtime = "nodejs";

interface Context { params: Promise<{ format: string; frame: string; deck: string[] }> }

// One frame of a share deck as a PNG, e.g. /share/image/story/1/seat/lok-sabha-2024/rajasthan/jaipur
export async function GET(_request: Request, { params }: Context) {
  const { format, frame, deck: parts } = await params;
  const deck = resolveDeck(parts);
  const index = Number(frame) - 1;
  if (!deck || !isFormat(format) || !Number.isInteger(index) || index < 0 || index >= deck.frames.length) {
    return new Response("Not found", { status: 404 });
  }
  return new ImageResponse(<FrameImage deck={deck} index={index} format={format} />, {
    ...FORMATS[format],
    fonts: await loadFonts(),
    headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" },
  });
}

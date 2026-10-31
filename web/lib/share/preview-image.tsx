import { ImageResponse } from "next/og";

import type { Preview } from "./previews";
import { loadFonts, PREVIEW, PreviewImage } from "./render";

export const previewSize = PREVIEW;

export async function previewResponse(preview: Preview | null) {
  return new ImageResponse(
    <PreviewImage {...(preview ?? { kicker: "VOTE BETTER", title: "Know who represents you", line: "Every election, every seat, every fact sourced." })} />,
    { ...PREVIEW, fonts: await loadFonts() },
  );
}

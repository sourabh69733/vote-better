import { constants } from "node:crypto";
import https from "node:https";

import { JAIPUR_FORM21E_URL } from "./rajasthan-form21e.js";

// The CEO Rajasthan host requires legacy TLS renegotiation. Each use names the exact URLs it may
// fetch; certificate verification stays enabled.
export function createLegacyTlsFetch(allowed: readonly string[], options: { maxBytes?: number; timeoutMs?: number } = {}) {
  const urls = new Set(allowed);
  const maxBytes = options.maxBytes ?? 10_000_000;
  const timeoutMs = options.timeoutMs ?? 15_000;
  return async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = String(input instanceof Request ? input.url : input);
    if (!urls.has(url)) throw new Error("legacy TLS adapter accepts only its listed official URLs");
    return new Promise<Response>((resolve, reject) => {
      const request = https.get(url, {
        secureOptions: constants.SSL_OP_LEGACY_SERVER_CONNECT,
        headers: { Accept: "application/pdf" },
        signal: init?.signal ?? undefined,
      }, (response) => {
        if (response.statusCode !== 200) {
          response.resume();
          reject(new Error(`official source returned HTTP ${response.statusCode ?? "unknown"}`));
          return;
        }
        const chunks: Buffer[] = [];
        let size = 0;
        response.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > maxBytes) {
            request.destroy(new Error("official PDF exceeds size limit"));
            return;
          }
          chunks.push(chunk);
        });
        response.on("error", reject);
        response.on("end", () => {
          const contentType = response.headers["content-type"];
          resolve(new Response(Buffer.concat(chunks), {
            status: 200,
            headers: { "content-type": Array.isArray(contentType) ? contentType[0] : contentType ?? "" },
          }));
        });
      });
      request.setTimeout(timeoutMs, () => request.destroy(new Error("official PDF request timed out")));
      request.on("error", reject);
    });
  };
}

export const fetchJaipurLegacyTls = (url: string, init?: RequestInit) => createLegacyTlsFetch([JAIPUR_FORM21E_URL])(url, init);

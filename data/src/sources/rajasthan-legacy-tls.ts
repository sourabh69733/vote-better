import { constants } from "node:crypto";
import https from "node:https";

import { JAIPUR_FORM21E_URL } from "./rajasthan-form21e.js";

// This government host requires legacy TLS renegotiation. Keep the exception
// limited to this exact source URL; certificate verification remains enabled.
export async function fetchJaipurLegacyTls(url: string, init?: RequestInit): Promise<Response> {
  if (url !== JAIPUR_FORM21E_URL) throw new Error("legacy TLS adapter accepts only the audited Jaipur URL");
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
        if (size > 10_000_000) {
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
    request.setTimeout(15_000, () => request.destroy(new Error("official PDF request timed out")));
    request.on("error", reject);
  });
}

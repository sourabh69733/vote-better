import type { Source } from "../contracts.js";
import type { CivicStore } from "../store.js";
import { collectDocument, PDF_DOCUMENT, type CollectionOptions, type CollectionResult } from "./collect-document.js";

export type { CollectionOptions, CollectionResult } from "./collect-document.js";

export const JAIPUR_FORM21E_URL =
  "https://election.rajasthan.gov.in/Lok_Sabha_Election_2024/ElectionResults/Form21E/Form21E-7.pdf";

export async function collectJaipurForm21E(
  source: Source, store: CivicStore, options: CollectionOptions = {},
): Promise<CollectionResult> {
  return collectDocument(source, store, PDF_DOCUMENT, options);
}

import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { prepareMpLinkQueue, promoteMpLinks, type CrosswalkReviewInput, type MpLinkDecision, type MpLinkQueue } from "./mp-link-promotion.js";
import { fetchText, type QuestionTarget } from "./sansad-questions.js";

const reportPath = fileURLToPath(new URL("../raw/maps/mp_crosswalk_draft.json", import.meta.url));
const queuePath = fileURLToPath(new URL("../raw/maps/mp_link_review_queue.json", import.meta.url));
const templatePath = fileURLToPath(new URL("../raw/maps/mp_link_decisions_template.json", import.meta.url));
const directorySnapshotFolder = fileURLToPath(new URL("../raw/mp-link-review", import.meta.url));
const decisionsPath = fileURLToPath(new URL("../config/mp-link-decisions.json", import.meta.url));
const targetsPath = fileURLToPath(new URL("../config/sansad-question-targets.json", import.meta.url));
const memberDirectoryUrl = "https://sansad.in/api_ls/question/getMembers?lkNo=18";

async function atomicJson(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`);
  await rename(temporary, filePath);
}

function parseArgs(args: string[]): { command: "prepare" | "promote"; directoryFile?: string; write: boolean } {
  const [command, ...options] = args;
  if (command !== "prepare" && command !== "promote") throw new Error("usage: review:mp-links prepare|promote [--directory FILE] [--write]");
  let directoryFile: string | undefined;
  let write = false;
  for (let index = 0; index < options.length; index++) {
    if (options[index] === "--directory" && options[index + 1] && !directoryFile) directoryFile = path.resolve(options[++index]);
    else if (options[index] === "--write" && command === "promote" && !write) write = true;
    else throw new Error(`unexpected option ${options[index]}`);
  }
  return { command, directoryFile, write };
}

async function main(args: string[]): Promise<void> {
  const { command, directoryFile, write } = parseArgs(args);
  const report = JSON.parse(await readFile(reportPath, "utf8")) as CrosswalkReviewInput;
  const directoryText = directoryFile ? await readFile(directoryFile, "utf8") : await fetchText(memberDirectoryUrl);
  const directory = JSON.parse(directoryText);
  const directoryHash = `sha256:${createHash("sha256").update(directoryText).digest("hex")}`;
  const currentQueue = prepareMpLinkQueue(report, directory, directoryHash);

  if (command === "prepare") {
    const targets = JSON.parse(await readFile(targetsPath, "utf8")) as QuestionTarget[];
    const knownIds = new Map(targets.map((target) => [target.memberId, target.personId]));
    await mkdir(directorySnapshotFolder, { recursive: true });
    const directorySnapshotPath = path.join(directorySnapshotFolder, `question-members-${directoryHash.slice(7)}.json`);
    await writeFile(directorySnapshotPath, directoryText);
    await atomicJson(queuePath, {
      ...currentQueue,
      preparedAt: new Date().toISOString(),
      crosswalkGeneratedAt: (report as CrosswalkReviewInput & { generatedAt?: string }).generatedAt,
      questionDirectoryInput: directoryFile ?? "live official response",
      questionDirectorySnapshotPath: directorySnapshotPath,
    });
    await atomicJson(templatePath, { schemaVersion: 1, decisions: currentQueue.matches.map((row) => ({
      decision: "pending", areaId: row.areaId, memberId: row.memberId,
      personId: knownIds.get(row.memberId) ?? `mp-${row.memberId}`, reviewToken: row.reviewToken,
    })) });
    process.stdout.write(`${JSON.stringify({ queuePath, templatePath, directorySnapshotPath, matches: currentQueue.matches.length,
      exact: currentQueue.matches.filter((row) => row.matchKind === "exact").length,
      suggested: currentQueue.matches.filter((row) => row.matchKind === "suggested").length,
      note: "All matches need explicit review before promotion" })}\n`);
    return;
  }

  const savedQueue = JSON.parse(await readFile(queuePath, "utf8")) as MpLinkQueue;
  const decisionFile = JSON.parse(await readFile(decisionsPath, "utf8")) as { schemaVersion: number; decisions: MpLinkDecision[] };
  if (decisionFile.schemaVersion !== 1 || !Array.isArray(decisionFile.decisions)) throw new Error("invalid review decisions file");
  const existing = JSON.parse(await readFile(targetsPath, "utf8")) as QuestionTarget[];
  const targets = promoteMpLinks(savedQueue, currentQueue, decisionFile.decisions, existing);
  if (write && targets.length > existing.length) await atomicJson(targetsPath, targets);
  process.stdout.write(`${JSON.stringify({ existingTargets: existing.length, approvedNewTargets: targets.length - existing.length,
    rejected: decisionFile.decisions.filter((item) => item.decision === "reject").length,
    wroteTargets: write && targets.length > existing.length, targetsPath })}\n`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main(process.argv.slice(2)).catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export interface BlobStore {
  put(bytes: Buffer): Promise<string>;
  get(ref: string): Promise<Buffer>;
}

export class LocalBlobStore implements BlobStore {
  constructor(private readonly directory: string) {}

  async put(bytes: Buffer): Promise<string> {
    const hash = createHash("sha256").update(bytes).digest("hex");
    const ref = `sha256/${hash}`;
    await mkdir(join(this.directory, "sha256"), { recursive: true, mode: 0o700 });
    try {
      await writeFile(join(this.directory, ref), bytes, { flag: "wx", mode: 0o600 });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      const existing = await this.get(ref);
      if (!existing.equals(bytes)) throw new Error("blob hash collision or damaged local copy");
    }
    return ref;
  }

  async get(ref: string): Promise<Buffer> {
    if (!/^sha256\/[0-9a-f]{64}$/.test(ref)) throw new Error("invalid blob reference");
    const bytes = await readFile(join(this.directory, ref));
    const hash = createHash("sha256").update(bytes).digest("hex");
    if (hash !== ref.slice("sha256/".length)) throw new Error("blob hash mismatch");
    return bytes;
  }
}

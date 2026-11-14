import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export interface BlobStore {
  put(bytes: Buffer): Promise<string>;
  get(ref: string): Promise<Buffer>;
}

const REF = /^sha256\/[0-9a-f]{64}$/;

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
    if (!REF.test(ref)) throw new Error("invalid blob reference");
    const bytes = await readFile(join(this.directory, ref));
    const hash = createHash("sha256").update(bytes).digest("hex");
    if (hash !== ref.slice("sha256/".length)) throw new Error("blob hash mismatch");
    return bytes;
  }
}

const missing = (error: unknown) => (error as { name?: string }).name === "NotFound" || (error as { name?: string }).name === "NoSuchKey";

// Raw files kept in an S3-compatible bucket (Cloudflare R2 in production), so a scheduled run on a
// fresh machine can read what earlier runs saved. The local copy is a cache; the bucket is the record.
export class S3BlobStore implements BlobStore {
  private readonly cache: LocalBlobStore;

  constructor(private readonly client: Pick<S3Client, "send">, private readonly bucket: string, private readonly prefix: string, cacheDirectory: string) {
    this.cache = new LocalBlobStore(cacheDirectory);
  }

  private key(ref: string) {
    return `${this.prefix}${ref}`;
  }

  async put(bytes: Buffer): Promise<string> {
    const ref = await this.cache.put(bytes);
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: this.key(ref) }));
    } catch (error) {
      if (!missing(error)) throw error;
      await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: this.key(ref), Body: bytes }));
    }
    return ref;
  }

  async get(ref: string): Promise<Buffer> {
    if (!REF.test(ref)) throw new Error("invalid blob reference");
    try {
      return await this.cache.get(ref);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    const response = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: this.key(ref) }));
    const bytes = Buffer.from(await response.Body!.transformToByteArray());
    if (await this.cache.put(bytes) !== ref) throw new Error("blob hash mismatch");
    return bytes;
  }
}

let client: S3Client | undefined;

// Where a source keeps its raw files, relative to data/raw. With BLOB_BUCKET set they also go to
// that bucket at BLOB_ENDPOINT, using the AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY credentials.
export function openBlobStore(prefix: string, env: NodeJS.ProcessEnv = process.env): BlobStore {
  const directory = fileURLToPath(new URL(`../raw/${prefix}`, import.meta.url));
  if (!env.BLOB_BUCKET) return new LocalBlobStore(directory);
  if (!env.BLOB_ENDPOINT) throw new Error("BLOB_BUCKET is set but BLOB_ENDPOINT is not");
  client ??= new S3Client({ region: "auto", endpoint: env.BLOB_ENDPOINT });
  return new S3BlobStore(client, env.BLOB_BUCKET, prefix.endsWith("/") ? prefix : `${prefix}/`, directory);
}

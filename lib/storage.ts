import { mkdir, writeFile, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
export interface Storage {
  put(key: string, bytes: Buffer, mime: string): Promise<void>;
  get(key: string): Promise<Buffer>;
}
export const mediaRoot = path.resolve(process.env.MEDIA_ROOT || "data/media");
export function localPath(key: string) {
  if (!/^[a-zA-Z0-9/_\-.]+$/.test(key)) throw Error("Invalid storage key");
  const p = path.resolve(mediaRoot, key);
  if (!p.startsWith(mediaRoot + path.sep)) throw Error("Invalid storage path");
  return p;
}
class LocalStorage implements Storage {
  async put(key: string, bytes: Buffer) {
    const p = localPath(key);
    await mkdir(path.dirname(p), { recursive: true });
    await writeFile(p, bytes);
  }
  async get(key: string) {
    return readFile(localPath(key));
  }
}
class S3Storage implements Storage {
  client = new S3Client({
    endpoint: process.env.S3_ENDPOINT || undefined,
    region: process.env.S3_REGION || "us-east-1",
    forcePathStyle: true,
  });
  async put(key: string, bytes: Buffer, mime: string) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
        Body: bytes,
        ContentType: mime,
      }),
    );
  }
  async get(key: string) {
    const r = await this.client.send(
      new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }),
    );
    return Buffer.from(await r.Body!.transformToByteArray());
  }
}
export const storage: Storage =
  process.env.STORAGE_DRIVER === "s3" ? new S3Storage() : new LocalStorage();
export function storageKey(projectId: string, ext: string) {
  return `${projectId}/${randomUUID()}.${ext}`;
}
export async function materialize(key: string, dir: string) {
  if (process.env.STORAGE_DRIVER !== "s3") return localPath(key);
  const dest = path.join(dir, path.basename(key));
  await writeFile(dest, await storage.get(key));
  return dest;
}
export async function exists(key: string) {
  try {
    return (await stat(localPath(key))).size > 0;
  } catch {
    return false;
  }
}

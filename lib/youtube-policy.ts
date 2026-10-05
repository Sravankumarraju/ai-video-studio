import { z } from "zod";

export const uploadMetadata = z.object({
  title: z
    .string()
    .min(1)
    .refine(
      (s) => [...s].length <= 100 && !/[<>]/.test(s),
      "Title: maximum 100 characters; no angle brackets",
    ),
  description: z
    .string()
    .refine(
      (s) => Buffer.byteLength(s, "utf8") <= 5000,
      "Description exceeds 5000 UTF-8 bytes",
    ),
  tags: z
    .array(z.string().min(1).max(100))
    .max(50)
    .refine(
      (tags) =>
        tags.join(",").length + tags.filter((t) => /\s/.test(t)).length * 2 <=
        500,
      "Tags exceed YouTube's 500-character budget",
    ),
});
export function privateVideoMetadata(value: unknown) {
  const m = uploadMetadata.parse(value);
  return {
    snippet: {
      ...m,
      categoryId: "27",
      defaultLanguage: "te",
      defaultAudioLanguage: "te",
    },
    status: {
      privacyStatus: "private",
      selfDeclaredMadeForKids: false,
      containsSyntheticMedia: true,
    },
  };
}
export function acknowledgedOffset(range: string | null, total: number) {
  if (!range) return 0;
  const match = /^bytes=0-(\d+)$/.exec(range);
  const offset = match ? Number(match[1]) + 1 : NaN;
  if (!Number.isSafeInteger(offset) || offset < 1 || offset > total)
    throw Error("Invalid upload acknowledgement");
  return offset;
}
export function validUploadSession(raw: string) {
  const u = new URL(raw);
  if (
    u.protocol !== "https:" ||
    u.hostname !== "www.googleapis.com" ||
    u.port ||
    u.username ||
    u.password ||
    !u.pathname.startsWith("/upload/youtube/v3/videos")
  )
    throw Error("Invalid Google upload session");
  return raw;
}
export function publicUpload<
  T extends { encryptedSession: string | null; metadata: unknown },
>(row: T) {
  const { encryptedSession: _session, ...safe } = row;
  return safe;
}

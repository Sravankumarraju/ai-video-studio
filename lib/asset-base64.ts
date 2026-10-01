export function decodeAssetBase64(value: string): Buffer {
  // A repeated four-character capture exhausts V8's regex stack on real media.
  // Validate the alphabet and padding with a single flat character repetition.
  if (value.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value))
    throw Error("Invalid base64");
  const bytes = Buffer.from(value, "base64");
  if (!bytes.length || bytes.length > 8 * 1024 * 1024)
    throw Error("Media size must be 1 byte to 8 MiB; use manual upload for larger files");
  return bytes;
}

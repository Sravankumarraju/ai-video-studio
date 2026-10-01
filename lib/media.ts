import { spawn } from "node:child_process";
export function command(
  bin: string,
  args: string[],
  cancel?: () => Promise<boolean>,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "",
      stderr = "";
    let stopped = false;
    const timer = cancel
      ? setInterval(() => {
          void cancel()
            .then((c) => {
              if (c) {
                stopped = true;
                child.kill("SIGTERM");
              }
            })
            .catch(() => child.kill("SIGTERM"));
        }, 500)
      : undefined;
    const timeout = setTimeout(() => {
      stopped = true;
      child.kill("SIGKILL");
    }, 2 * 3600000);
    child.stdout.on("data", (b) => {
      stdout = (stdout + b).slice(-2000000);
    });
    child.stderr.on("data", (b) => {
      stderr = (stderr + b).slice(-4000);
    });
    child.on("error", (e) => {
      clearInterval(timer);
      clearTimeout(timeout);
      reject(e);
    });
    child.on("close", (code) => {
      clearInterval(timer);
      clearTimeout(timeout);
      code === 0
        ? resolve(stdout)
        : reject(
            Error(
              stopped
                ? "Cancelled"
                : `Media process failed (${code}): ${stderr}`,
            ),
          );
    });
  });
}
export async function probe(file: string) {
  const r = JSON.parse(
    await command(process.env.FFPROBE_PATH || "ffprobe", [
      "-v",
      "error",
      "-show_format",
      "-show_streams",
      "-of",
      "json",
      file,
    ]),
  );
  const v = r.streams.find(
    (s: { codec_type: string }) => s.codec_type === "video",
  );
  const a = r.streams.find(
    (s: { codec_type: string }) => s.codec_type === "audio",
  );
  if (!v && !a) throw Error("Unsupported media");
  return {
    duration: Number(r.format.duration) || null,
    width: v?.width,
    height: v?.height,
    videoCodec: v?.codec_name,
    audioCodec: a?.codec_name,
    format: r.format.format_name,
  };
}
export function detect(bytes: Buffer) {
  if (
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return { mime: "image/png", ext: "png", kind: "image" };
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
    return { mime: "image/jpeg", ext: "jpg", kind: "image" };
  if (
    bytes.subarray(0, 4).toString() === "RIFF" &&
    bytes.subarray(8, 12).toString() === "WEBP"
  )
    return { mime: "image/webp", ext: "webp", kind: "image" };
  if (
    bytes.subarray(0, 4).toString() === "RIFF" &&
    bytes.subarray(8, 12).toString() === "WAVE"
  )
    return { mime: "audio/wav", ext: "wav", kind: "audio" };
  if (bytes.subarray(4, 8).toString() === "ftyp")
    return { mime: "video/mp4", ext: "mp4", kind: "video" };
  if (
    bytes.subarray(0, 3).toString() === "ID3" ||
    (bytes[0] === 255 && (bytes[1] & 224) === 224)
  )
    return { mime: "audio/mpeg", ext: "mp3", kind: "audio" };
  if (bytes.subarray(0, 4).equals(Buffer.from([26, 69, 223, 163])))
    return { mime: "video/webm", ext: "webm", kind: "video" };
  throw Error("Supported uploads: PNG, JPEG, WebP, MP4, WebM, MP3, WAV");
}

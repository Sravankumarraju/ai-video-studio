import { storage, type Storage } from "./storage";
// Serve byte ranges directly from storage. Never allocate the entire movie per seek.
export async function mediaResponse(key: string, mime: string, req: Request, name: string, source: Storage = storage) {
  const size = await source.size(key);
  const headers: Record<string,string> = {
    "Content-Type": mime, "Accept-Ranges": "bytes", "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "Content-Disposition": `inline; filename="${name.replace(/[^a-zA-Z0-9_.-]/g,"_")}"`,
  };
  const range = req.headers.get("range");
  let start: number | undefined, end: number | undefined;
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    const invalid = () => new Response(null,{status:416,headers:{...headers,"Content-Range":`bytes */${size}`}});
    if (!match || (!match[1] && !match[2]) || !size) return invalid();
    if (match[1]) {
      start = Number(match[1]); end = match[2] ? Number(match[2]) : size-1;
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start>end || start>=size) return invalid();
      end = Math.min(end,size-1);
    } else {
      const suffix = Number(match[2]);
      if (!Number.isSafeInteger(suffix) || suffix<=0) return invalid();
      start = Math.max(0,size-suffix); end=size-1;
    }
    headers["Content-Range"]=`bytes ${start}-${end}/${size}`;
    headers["Content-Length"]=String(end-start+1);
  } else headers["Content-Length"]=String(size);
  return new Response(size && req.method!=="HEAD" ? await source.stream(key,start,end) : null, {status:range?206:200,headers});
}

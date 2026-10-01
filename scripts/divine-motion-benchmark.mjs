import { spawnSync } from 'node:child_process';
const filter = "scale=2160:3840:force_original_aspect_ratio=increase,crop=2160:3840,zoompan=z='1+0.04*min(on/89,1)':x='(iw-iw/zoom)*0.5':y='(ih-ih/zoom)*0.5':d=DURATION:s=1080x1920:fps=30,setsar=1,format=yuv420p";
for (const frames of [1, 90]) {
  const start = performance.now();
  const r = spawnSync('docker', ['compose', 'exec', '-T', 'app', 'ffmpeg', '-v', 'error', '-threads', '1', '-filter_threads', '1', '-loop', '1', '-framerate', '30', '-i', '/app/test-output/benchmark-image.png', '-vf', filter.replace('DURATION', String(frames)), '-t', '3', '-c:v', 'libx264', '-threads:v', '2', '-preset', 'medium', '-y', `/app/test-output/motion-${frames}.mp4`], {encoding:'utf8'});
  if (r.status) throw Error(r.stderr);
  console.log(JSON.stringify({ framesPerImage: frames, elapsedSeconds: (performance.now() - start) / 1000 }));
}
const hashes = [1,90].map(frames => {
  const r = spawnSync('docker', ['compose','exec','-T','app','ffmpeg','-v','error','-i',`/app/test-output/motion-${frames}.mp4`,'-f','framemd5','-'], {encoding:'utf8'});
  if (r.status) throw Error(r.stderr);
  return r.stdout.split('\n').filter(line => line && !line.startsWith('#'));
});
if (hashes[0].length !== 90 || JSON.stringify(hashes[0]) !== JSON.stringify(hashes[1])) throw Error('Cached still motion differs from the original frames');
console.log(JSON.stringify({ decodedFrames:90, allFramesIdentical:true }));

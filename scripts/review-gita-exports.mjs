import http from 'node:http';
import {createReadStream} from 'node:fs';
import {readFile,stat} from 'node:fs/promises';
const root='data/productions/divine-wisdom';
http.createServer(async(req,res)=>{
 try{
  const match=req.url?.match(/^\/(review|video)\/(7|8|9|10)\/(draft|full)$/);
  if(!match){res.writeHead(404);res.end();return;}
  const [,mode,chapter,kind]=match,dir=`${root}/gita-chapter-${chapter}/story-v1`;
  const config=JSON.parse(await readFile(`${dir}/episode.json`,'utf8')),state=JSON.parse(await readFile(`${dir}/state.json`,'utf8'));
  const file=`${dir}/${config.fileStem}-${kind}.mp4`,info=await stat(file);
  if(mode==='review'){
   let repairButton='';
   if(chapter==='9'){
    const timeline=JSON.parse(await readFile(`${dir}/completed-timeline.json`,'utf8')).document;
    const variant=timeline.variants.find(v=>v.id===config.variantId);
    const audioId=state.finished['gita-chapter-9-story-v1-source-14'].audioId;
    let at=0,repairAt;
    for(const id of variant.sceneIds){const scene=timeline.scenes.find(s=>s.id===id);if(repairAt===undefined&&scene.audioId===audioId)repairAt=at+30;at+=scene.duration;}
    if(Number.isFinite(repairAt))repairButton=`<button onclick="sample(${repairAt})">Play repaired recording</button>`;
   }
   res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});
   res.end(`<!doctype html><html lang="en"><meta charset="utf-8"><title>Chapter ${chapter} ${kind} export review</title><style>body{font:18px system-ui;background:#101827;color:#fff;margin:24px}video{width:min(100%,1152px);display:block}button{padding:12px;margin:12px 8px 12px 0}pre{white-space:pre-wrap}</style><h1>Bhagavad Gita Chapter ${chapter} · ${kind} review</h1><p>Saved render ${state.renderJobs[kind]}</p><video controls preload="metadata" src="/video/${chapter}/${kind}"></video><button onclick="sample(0)">Play start</button><button onclick="sample(v.duration/2)">Play middle</button><button onclick="sample(v.duration-15)">Play ending</button>${repairButton}<button onclick="v.pause()">Pause</button><pre id="status"></pre><script>const v=document.querySelector('video');let requested=0;function sample(t){v.pause();requested=t;v.currentTime=t;v.play().catch(e=>document.querySelector('#status').textContent=e.message)}v.addEventListener('timeupdate',()=>document.querySelector('#status').textContent=JSON.stringify({requested,currentTime:v.currentTime,paused:v.paused,duration:v.duration,width:v.videoWidth,height:v.videoHeight,error:v.error?.message||null}));</script></html>`);return;
  }
  const range=req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
  const start=range?Number(range[1]):0,end=range&&range[2]?Math.min(Number(range[2]),info.size-1):info.size-1;
  if(start>end){res.writeHead(416);res.end();return;}
  res.writeHead(range?206:200,{'Content-Type':'video/mp4','Accept-Ranges':'bytes','Content-Length':end-start+1,...(range?{'Content-Range':`bytes ${start}-${end}/${info.size}`}:{})});
  createReadStream(file,{start,end}).pipe(res);
 }catch(e){res.writeHead(404,{'Content-Type':'text/plain'});res.end('Export is not saved yet.');}
}).listen(3038,'127.0.0.1',()=>console.log('Local export review server: http://127.0.0.1:3038/review/7/draft'));

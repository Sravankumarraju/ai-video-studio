const fs=require('node:fs/promises');
(async()=>{
 const report=[];
 for(const id of await fs.readdir('/proc'))if(/^\d+$/.test(id))try{
  const name=(await fs.readFile(`/proc/${id}/comm`,'utf8')).trim();
  if(name!=='ffmpeg')continue;
  const parse=async()=>{const line=await fs.readFile(`/proc/${id}/stat`,'utf8'),fields=line.slice(line.lastIndexOf(')')+2).split(' ');return {state:fields[0],userTicks:+fields[11],systemTicks:+fields[12]};};
  const before=await parse();await new Promise(r=>setTimeout(r,1000));const after=await parse();
  const status=await fs.readFile(`/proc/${id}/status`,'utf8');
  report.push({pid:+id,name,...after,cpuTickChange:after.userTicks+after.systemTicks-before.userTicks-before.systemTicks,memory:status.match(/^VmRSS:.*$/m)?.[0],waitChannel:(await fs.readFile(`/proc/${id}/wchan`,'utf8')).trim()});
 }catch{}
 console.log(JSON.stringify(report));
})().catch(e=>{console.error(e.message);process.exitCode=1});

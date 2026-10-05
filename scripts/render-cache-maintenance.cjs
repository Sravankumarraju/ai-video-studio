const {Queue}=require('bullmq');
const fs=require('node:fs/promises');
const path=require('node:path');
(async()=>{
 const q=new Queue('story-studio',{connection:{host:'redis',port:6379}});
 try {
  const mode=process.argv[2];
  if(mode==='pause'||mode==='resume'){await q[mode]();console.log(`Story Studio queue ${mode}`);return;}
  if(mode==='idle'){console.log(JSON.stringify({active:await q.getActiveCount()}));return;}
  if(!await q.isPaused())throw Error('Queue must be paused');
  if(mode==='inspect'){
   console.log(JSON.stringify(await q.getJobs(['active','waiting','paused']).then(js=>js.map(j=>({id:j.id,name:j.name})))));
   for(const name of await fs.readdir('/tmp'))if(/^story-render-[a-z0-9]+$/i.test(name)){
    const dir=await fs.realpath(path.join('/tmp',name));
    if(path.dirname(dir)!=='/tmp')throw Error('Unexpected directory');
    console.log(JSON.stringify({dir,files:await fs.readdir(dir)}));
   }
  }
 }finally{await q.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1});

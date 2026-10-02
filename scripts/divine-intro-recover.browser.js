(async () => {
  const r=await fetch('/api/projects/edef3ecc-f6c0-46ae-8ff1-7e31372816b3');
  if(!r.ok)throw Error('Cannot read owner assets');
  const assets=(await r.json()).assets;
  return assets.filter(a=>a.metadata?.jobId==='04756772-95b7-4b0b-82ce-53692bf59848').map(a=>({id:a.id,duration:a.duration,alignment:a.metadata.alignment}));
})()

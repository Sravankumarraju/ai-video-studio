(async()=>{const r=await fetch('/api/jobs/d80fa426-aa61-427e-959d-8cd812a06bb2/cancel',{method:'POST'});if(!r.ok)throw Error(await r.text());return r.json();})()

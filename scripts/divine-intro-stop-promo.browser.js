(async () => {
  const id='fd42ee8f-a5ed-44ee-ae53-696825f88d36';
  const r=await fetch('/api/jobs');if(!r.ok)throw Error('Cannot inspect jobs');
  const j=(await r.json()).find(j=>j.id===id);if(!j)throw Error('Promotional job not found');if(['completed','stale','cancelled','failed'].includes(j.state))return {state:j.state,noFurtherWork:true};
  const c=await fetch('/api/jobs/'+id+'/cancel',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});if(!c.ok)throw Error('Cannot cancel promotional render');return await c.json();
})()

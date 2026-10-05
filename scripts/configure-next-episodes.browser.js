(async()=>{
 const wait=async f=>{for(let i=0;i<100;i++){const x=f();if(x)return x;await new Promise(r=>setTimeout(r,100));}throw Error('UI did not reach expected state');};
 const button=t=>[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===t);
 const result=[];
 for(const n of [4,5,6]){
  (await wait(()=>button(`Divine Wisdom Telugu · Episode 00${n} · భగవద్గీత 1.${n}`))).click();
  (await wait(()=>button('Setup'))).click();
  const select=await wait(()=>[...document.querySelectorAll('label')].find(l=>l.textContent.includes('Unknown pricing policy'))?.querySelector('select'));
  select.value='allow';select.dispatchEvent(new Event('change',{bubbles:true}));
  (await wait(()=>button('Save setup'))).click();
  await wait(()=>!button('Save setup'));
  result.push({verse:n,setupSaved:true});
  (await wait(()=>button('Dashboard'))).click();await new Promise(r=>setTimeout(r,300));
 }
 return result;
})()

(async()=>{
 const video=document.querySelector('video');
 if(!video)throw Error('Missing player');
 const response=await fetch('/api/projects/55ddb082-2e1c-45c7-a5af-417fd8208c67');
 if(!response.ok)throw Error('Owner project access failed');
 const p=await response.json(),v=p.document.variants.find(x=>x.id==='gita-1-7-te-devotional-v1');
 let at=0,target=0;
 for(const id of v.sceneIds){const s=p.document.scenes.find(x=>x.id===id);if(s.captions.some(c=>c.display==='full-verse')){const c=s.captions[0];target=at+(c.start+c.end)/2;break;}at+=s.duration;}
 video.currentTime=target;
 await new Promise(resolve=>video.addEventListener('seeked',resolve,{once:true}));
 return {verseTime:video.currentTime,width:video.videoWidth,height:video.videoHeight,error:video.error?.message||null};
})()

(async()=>{
 const wait=async f=>{for(let i=0;i<150;i++){const value=f();if(value)return value;await new Promise(r=>setTimeout(r,100));}throw Error('Expected episode/export did not load');};
 const title='Divine Wisdom Telugu · Episode 007 · భగవద్గీత 1.7';
 const button=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===title);
 if(!button)throw Error('Episode 007 missing in app');button.click();
 await wait(()=>document.querySelector('h1')?.textContent.includes('Episode 007'));
 const preview=await wait(()=>[...document.querySelectorAll('button')].find(b=>b.textContent.trim().endsWith('Preview & exports')));preview.click();
 const video=await wait(()=>[...document.querySelectorAll('video')].find(v=>v.src.includes('0d6f8b92-7685-4fd5-ab14-b1c7d8e15509')));
 video.muted=true;await video.play();await new Promise(r=>setTimeout(r,1200));
 const result={episode:'1.7',seconds:video.duration,width:video.videoWidth,height:video.videoHeight,readyState:video.readyState,currentTime:video.currentTime,paused:video.paused,error:video.error?.message||null};video.pause();
 if(result.width!==1920||result.height!==1080||result.error||result.paused||!result.currentTime)throw Error('Full HD browser playback failed');return result;
})()

(async()=>{const r=await fetch('/api/providers/7e994f10-1088-464c-91fb-79297b8fd6cb/voices');if(!r.ok)return {status:r.status};const voices=await r.json();return voices;})()

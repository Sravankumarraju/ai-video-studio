import {describe,it,expect,vi} from 'vitest';
import {mediaResponse} from '../lib/media-response';
import {storage,storageKey} from '../lib/storage';
const request=(range?:string)=>new Request('http://localhost/movie',{headers:range?{range}:{}});
describe('streaming media downloads',()=>{
 it('serves real local byte ranges without reading the whole asset',async()=>{
  const key=storageKey('test','bin');await storage.put(key,Buffer.from('0123456789'),'application/octet-stream');
  const buffered=vi.spyOn(storage,'get').mockRejectedValue(Error('Whole-file buffering forbidden'));
  try {const response=await mediaResponse(key,'video/mp4',request('bytes=3-6'),'movie.mp4');
   expect(response.status).toBe(206);expect(response.headers.get('content-range')).toBe('bytes 3-6/10');
   expect(response.headers.get('content-length')).toBe('4');expect(await response.text()).toBe('3456');expect(buffered).not.toHaveBeenCalled();
   expect(await (await mediaResponse(key,'video/mp4',request('bytes=-2'),'movie.mp4')).text()).toBe('89');
   expect(await (await mediaResponse(key,'video/mp4',request('bytes=8-'),'movie.mp4')).text()).toBe('89');
  }finally{buffered.mockRestore();}
 });
 it('rejects invalid and multiple ranges before opening storage streams',async()=>{
  const key=storageKey('test','bin');await storage.put(key,Buffer.from('0123456789'),'application/octet-stream');
  const opened=vi.spyOn(storage,'stream');try{
   for(const range of ['bytes=10-','bytes=8-2','bytes=-0','bytes=0-1,4-5','bytes=-','bytes=999999999999999999999-']){
    const response=await mediaResponse(key,'video/mp4',request(range),'movie.mp4');expect(response.status).toBe(416);expect(response.headers.get('content-range')).toBe('bytes */10');
   }expect(opened).not.toHaveBeenCalled();
  }finally{opened.mockRestore();}
 });
 it('streams complete responses and supports HEAD without opening a body',async()=>{
  const key=storageKey('test','bin');await storage.put(key,Buffer.from('0123456789'),'application/octet-stream');
  expect(await (await mediaResponse(key,'video/mp4',request(),'movie.mp4')).text()).toBe('0123456789');
  const opened=vi.spyOn(storage,'stream');try{const response=await mediaResponse(key,'video/mp4',new Request('http://localhost/movie',{method:'HEAD'}),'movie.mp4');expect(response.headers.get('content-length')).toBe('10');expect(response.body).toBeNull();expect(opened).not.toHaveBeenCalled();}finally{opened.mockRestore();}
 });
});

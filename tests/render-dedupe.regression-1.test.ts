import {it,expect} from 'vitest';
import {jobDedupeKey} from '../lib/job-dedupe';
it('allows fresh exports after a renderer upgrade without duplicating paid provider calls',()=>{
 const snapshot={doc:{title:'Video'},revision:1,options:{variantId:'te',draft:true}};
 expect(jobDedupeKey('p','render',snapshot,1)).not.toBe(jobDedupeKey('p','render',snapshot,2));
 expect(jobDedupeKey('p','render',snapshot,2)).toBe(jobDedupeKey('p','render',snapshot,2));
 for(const kind of ['voice','image','script','video'])expect(jobDedupeKey('p',kind,snapshot,1)).toBe(jobDedupeKey('p',kind,snapshot,2));
});

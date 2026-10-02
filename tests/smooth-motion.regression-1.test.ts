import {it,expect} from 'vitest';
import {mkdir,readFile} from 'node:fs/promises';
import path from 'node:path';
import {motionFilter,captionGeometry} from '../worker/render';
import {command} from '../lib/media';
import {newScene,projectSchema,variantSchema} from '../lib/schema';
import {motionState,renderInputs} from '../lib/timeline';

it('renders a gentle pan without zooming and slows down at both ends',async()=>{
 const scene={...newScene(),duration:2,motion:'pan-right' as const,strength:.08,motionEasing:'smooth' as const};
 const dir=path.resolve('test-output/smooth-motion');await mkdir(dir,{recursive:true});const out=path.join(dir,'pan.gray');
 await command(process.env.FFMPEG_PATH||'ffmpeg',['-y','-v','error','-f','lavfi','-i','color=c=black:s=800x450,drawbox=x=240:y=0:w=40:h=450:color=white:t=fill','-vf',motionFilter(scene,320,180,30)+',format=gray','-frames:v','60','-f','rawvideo',out]);
 const pixels=await readFile(out),centres=[],widths=[];
 for(let frame=0;frame<60;frame++){
  let mass=0,moment=0,count=0;for(let x=0;x<320;x++){const value=pixels[frame*320*180+90*320+x];mass+=value;moment+=value*x;if(value>160)count++;}
  centres.push(moment/mass);widths.push(count);
 }
 expect(centres[0]-centres[59]).toBeGreaterThan(10);
 expect(Math.abs(centres[0]-centres[6])).toBeLessThan(Math.abs(centres[27]-centres[33]));
 expect(Math.abs(centres[53]-centres[59])).toBeLessThan(Math.abs(centres[27]-centres[33]));
 expect(Math.max(...widths)-Math.min(...widths)).toBeLessThanOrEqual(1);
 expect(motionState(scene,0).zoom).toBe(motionState(scene,1).zoom);
 expect(motionState(scene,.1).x).toBeLessThan(.1);
});

it('keeps edition descriptions independent without invalidating video exports',()=>{
 const s=newScene(),v=variantSchema.parse({id:'v',name:'New',aspect:'landscape',sceneIds:[s.id],captionBottom:.12});
 const d=projectSchema.parse({title:'Video',scenes:[s],variants:[v],publishing:{description:'Original'}}),before=renderInputs(d,'v');
 d.variants[0].publishing={...d.publishing,description:'Updated description'};
 expect(d.publishing.description).toBe('Original');expect(renderInputs(d,'v')).toBe(before);
 expect(projectSchema.parse(d).variants[0].publishing?.description).toBe('Updated description');
 expect(captionGeometry(v,1920,1080).marginV).toBe(130);
});

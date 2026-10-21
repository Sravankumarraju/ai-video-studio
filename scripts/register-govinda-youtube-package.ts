import 'dotenv/config';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {db} from '../lib/db';
import {storage,storageKey} from '../lib/storage';
import {json} from '../lib/projects';
const root='data/productions/divine-wisdom/govinda-namalu-full-2026-10-20';
async function main(){
 const record=JSON.parse(await readFile(`${root}/studio-registration.json`,'utf8'));
 const files=[
  {file:'youtube-package/thumbnail-youtube-v2.jpg',kind:'image',mime:'image/jpeg'},
  {file:'youtube-package/youtube-details.txt',kind:'text',mime:'text/plain'},
  {file:'youtube-package/description-with-complete-namalu.txt',kind:'text',mime:'text/plain'},
  {file:'youtube-package/youtube-metadata.json',kind:'text',mime:'application/json'}
 ];
 for(const f of files){
  if(record.assets[f.file])continue;
  const bytes=await readFile(`${root}/${f.file}`);const key=storageKey(record.projectId,path.extname(f.file).slice(1));
  await storage.put(key,bytes,f.mime);
  const asset=await db.asset.create({data:{projectId:record.projectId,name:path.basename(f.file),kind:f.kind,mime:f.mime,bytes:bytes.length,storageKey:key,
   metadata:json({source:'Govinda Namalu YouTube package prepared locally at user request',generatedAt:new Date().toISOString(),parameters:{completeNamams:108,descriptionIncludesCompleteLyrics:true,productionFolder:root}})}});
  record.assets[f.file]=asset.id;
 }
 record.thumbnailAssetId=record.assets['youtube-package/thumbnail-youtube-v2.jpg'];
 record.youtubeDetailsAssetId=record.assets['youtube-package/youtube-details.txt'];
 record.youtubeMetadataAssetId=record.assets['youtube-package/youtube-metadata.json'];
 record.preferredThumbnailFile='youtube-package/thumbnail-youtube-v2.jpg';
 record.youtubePackageFolder='youtube-package';
 await writeFile(`${root}/studio-registration.json`,JSON.stringify(record,null,2));
 console.log(JSON.stringify({projectId:record.projectId,thumbnailAssetId:record.thumbnailAssetId,detailsSaved:true}));
}
main().catch(()=>{console.error('YouTube package registration failed; credentials suppressed.');process.exitCode=1;}).finally(()=>db.$disconnect());

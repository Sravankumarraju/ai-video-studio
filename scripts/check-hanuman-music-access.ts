import 'dotenv/config';
import {writeFile} from 'node:fs/promises';
import {db} from '../lib/db';
import {decrypt} from '../lib/security';
async function main(){
 const profile=await db.providerProfile.findUnique({where:{id:'7e994f10-1088-464c-91fb-79297b8fd6cb'}});
 const key=process.env.ELEVENLABS_API_KEY||(profile?decrypt(profile.encryptedKey):'');
 if(!key)throw Error('No saved ElevenLabs credential available');
 const response=await fetch('https://api.elevenlabs.io/v1/user/subscription',{headers:{'xi-api-key':key},signal:AbortSignal.timeout(30000)});
 const info=await response.json().catch(()=>({}));
 const result={checkedAt:new Date().toISOString(),operation:'read-only-subscription-check',httpStatus:response.status,credentialAccepted:response.ok,tier:response.ok?info.tier:undefined,remainingCredits:response.ok?Math.max(0,(info.character_limit||0)-(info.character_count||0)):undefined,musicGenerationVerified:false,paidGenerationCalls:0,note:'Subscription access does not prove that this key has music-generation permission or that Awadhi singing works.'};
 await writeFile('data/productions/divine-wisdom/hanuman-chalisa/provider-access.json',JSON.stringify(result,null,2));
 console.log(JSON.stringify(result));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>db.$disconnect());

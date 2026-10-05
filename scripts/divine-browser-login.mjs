import 'dotenv/config';
import {createHmac} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const exp=String(Date.now()+12*3600000);
const token=`${exp}.${createHmac('sha256',process.env.SESSION_SECRET).update(exp).digest('hex')}`;
const browser='C:/Users/sravankumar.raju/.agents/skills/gstack/browse/dist/browse.exe';
try{execFileSync(browser,['cookie',`studio_session=${token}`],{stdio:'pipe'});}catch{throw new Error('Could not authenticate local QA browser; credential details suppressed');}
console.log(execFileSync(browser,['reload'],{encoding:'utf8'}));

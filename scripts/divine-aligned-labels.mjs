import assert from 'node:assert/strict';
const normalized=t=>t.normalize('NFC').replace(/[\p{P}\p{S}‌‍]/gu,'').trim();
// ElevenLabs timestamps sometimes split a dotted reference into two tokens.
// Restore that one script token without changing its audio timing or other words.
export function restoreVerseLabels(words,text){
 const result=[];let at=0;
 for(const token of text.trim().split(/\s+/u)){
  const target=normalized(token),first=words[at];assert(first,'Missing aligned word');
  if(normalized(first.text)===target){result.push({...first,text:token});at++;continue;}
  assert(/^\d+\.\d+[.]?$/.test(token),'Aligned narration differs from script');
  let accumulated='',last=first;
  do{last=words[at++];assert(last,'Incomplete verse label');accumulated+=normalized(last.text);assert(target.startsWith(accumulated),'Incorrect aligned verse label');}while(accumulated!==target);
  result.push({...first,text:token,end:last.end});
 }
 assert.equal(at,words.length,'Unexpected aligned words');return result;
}

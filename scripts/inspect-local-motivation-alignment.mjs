import {readFile} from 'node:fs/promises';
const d='data/productions/divine-wisdom/motivation-shorts-40/motivation-short-033';
const {duration,alignment:a}=JSON.parse(await readFile(`${d}/provider-alignment-original.json`,'utf8'));
const text=a.characters.join('');
let start=0,word='',problems=[],words=[];
for(let i=0;i<a.characters.length;i++){const ch=a.characters[i];if(!word&&!/\s/u.test(ch))start=a.character_start_times_seconds[i];if(!/\s/u.test(ch))word+=ch;if((/\s/u.test(ch)||/[.!?\n]/u.test(ch)||i===a.characters.length-1)&&word){const end=a.character_end_times_seconds[/\s/u.test(ch)?Math.max(0,i-1):i];words.push({text:word,start,end});if(end<=start)problems.push({text:word,start,end,index:i});word='';}}
console.log(JSON.stringify({duration,lengths:[a.characters.length,a.character_start_times_seconds.length,a.character_end_times_seconds.length],last:Math.max(...a.character_end_times_seconds),wordCount:words.length,problems,lastWords:words.slice(-4),textMatches:text===JSON.parse(await readFile(`${d}/episode.json`,'utf8')).sections[0].text}));

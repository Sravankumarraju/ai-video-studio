import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const root='data/productions/divine-wisdom/devi-navaratri-2026';
const plan=JSON.parse(await readFile(root+'/production-plan.json','utf8'));
const days=[10,11,12,13,14,15,16,17,19,20];
const names=['Navaratri Introduction','Shailputri','Brahmacharini','Chandraghanta','Kushmanda','Skandamata','Katyayani','Kalaratri','Mahagauri','Siddhidatri'];
const releases=[];
for(const video of plan.videos){
 const publishing=JSON.parse(await readFile(video.dir+'/publishing.json','utf8'));
 const date=`2026-10-${days[video.form]}`;
 const title=video.form?publishing.titles[0].replace(/^నవరాత్రులు \d+:/u,'నవరాత్రులు 2026:'):publishing.titles[0].replace('దేవీ నవరాత్రులు ఎందుకు?','దేవీ నవరాత్రులు 2026 ఎందుకు?');
 const hashtag=`#${names[video.form].replace(/ /g,'')}`;
 const prefix=`శారద నవరాత్రులు 2026 · ${video.name}\n${names[video.form]} — Telugu explanation, story and significance.\nవిడుదల: ${date} · ఉదయం 7:00 IST (హైదరాబాద్).\n\n`;
 const description=prefix+publishing.description.replace(publishing.hashtags,`#Navaratri2026 ${hashtag} #Navadurga #NavaratriTelugu #DivineWisdomTelugu`);
 const tags=['Navaratri 2026','Sharad Navratri 2026','Navratri Telugu','Devi Navaratri','Navadurga Telugu',names[video.form],names[video.form]+' Telugu',video.name,'దేవీ నవరాత్రులు','నవదుర్గలు','Divine Wisdom Telugu'];
 assert([...title].length<=100);assert(Buffer.byteLength(description)<=5000);assert(tags.join(',').length<=500);
 releases.push({slug:video.slug,form:video.form,name:video.name,date,time:'07:00',timezone:'Asia/Kolkata',publishAt:new Date(date+'T07:00:00+05:30').toISOString(),privacyUntilRelease:'private',releaseVisibility:'public',status:'planned-not-yet-confirmed-on-youtube',metadata:{title,description,tags}});
}
const result={authorizedBy:'Owner: private until scheduled release, 7:00 AM IST; use Durga puja dates, separate releases',source:'https://www.drikpanchang.com/navratri/ashwin-shardiya-navratri-dates.html?geoname-id=1269843',calendarNote:'Hyderabad: Saptami repeats October 17–18. Mahagauri October 19; Siddhidatri editorial release during morning Navami October 20. Introduction October 10.',releases};
await writeFile(root+'/release-plan.json',JSON.stringify(result,null,2));
await writeFile(root+'/RELEASE-CALENDAR.md',`# Navaratri 2026 releases\n\nPrivate until each individual public release, 07:00 IST. Dates follow the Hyderabad calendar; this is not a Vijayawada alankaram calendar. Scheduling is confirmed only when actual YouTube publishAt matches release-plan.json.\n\n| Video | Date | Time |\n| --- | --- | --- |\n${releases.map(r=>`| ${r.name} | ${r.date} | 07:00 IST |`).join('\n')}\n\nCalendar source: ${result.source}\n\nOctober 18 repeats Saptami; no new form episode is assigned that date. Siddhidatri is planned for the Navami morning on October 20.\n`);
console.log(JSON.stringify(releases.map(({slug,date,publishAt})=>({slug,date,publishAt}))));

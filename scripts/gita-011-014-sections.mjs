import {nextVerseContent} from './gita-011-014-content.mjs';
export function episodeSections(template,n){
 const d=nextVerseContent[n],sections=template.sections.map(s=>({...s,text:d[s.id]||s.text}));
 sections.find(s=>s.id==='welcome').text=`డివైన్ విజ్డమ్ తెలుగు ఛానల్‌కు స్వాగతం. భగవద్గీత అధ్యాయం ఒకటి, శ్లోకం ${d.number}.`;
 sections.find(s=>s.id==='context').image=n===13?'bhishma':'hero';
 sections.find(s=>s.id==='words').image='book';
 sections.find(s=>s.id==='hook').title=d.theme;sections.find(s=>s.id==='shloka').text=d.verse;sections.find(s=>s.id==='shloka').title=`అధ్యాయం 1 — శ్లోకం ${n} · మూల పఠనం`;sections.find(s=>s.id==='meaning').title=`అధ్యాయం 1 — శ్లోకం ${n} · తెలుగు అర్థం`;sections.find(s=>s.id==='next').title=`తరువాత అధ్యాయం 1 — శ్లోకం ${n+1}`;
 return sections;
}

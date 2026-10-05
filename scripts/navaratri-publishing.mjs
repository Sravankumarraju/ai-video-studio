import assert from 'node:assert/strict';
export function navaratriPublishing(config,chapters,thumbnailPrompt){
 assert.equal(config.productionKind,'navaratri');
 assert(config.navaratri&&config.descriptionSummary&&config.sources.length);
 const hashtags='#Navaratri2026 #Navadurga #DeviNavaratri #DivineWisdomTelugu';
 const apology='ఈ వీడియోలో ఉచ్చారణ, కథ, సంప్రదాయ వివరణ లేదా సమాచారంలో పొరపాటు ఉంటే మనస్ఫూర్తిగా క్షమాపణలు కోరుతున్నాం. సరైన మూలంతో కామెంట్‌లో తెలియజేయండి; పరిశీలించి సరిచేస్తాం.';
 const description=`Divine Wisdom Telugu\nదేవీ నవరాత్రులు · ${config.navaratri.form?`నవదుర్గ రూపం ${config.navaratri.form}`:'సిరీస్ పరిచయం'}\n\n${config.descriptionSummary}\n\nవీడియో భాగాలు:\n${chapters}\n\nమూలాలు:\n${config.sources.join('\n')}\n\nఈ సిరీస్ నవదుర్గల సంప్రదాయ క్రమాన్ని అనుసరిస్తుంది. తెలుగు ఆలయాల రోజువారీ అలంకారాలు, పూజా విధానాలు వేరుగా ఉండవచ్చు. వీడియో సంఖ్య పూజ తేదీ కాదు. స్థానిక పంచాంగం, కుటుంబ సంప్రదాయం లేదా ఆలయ సూచనను అనుసరించండి.\n${config.navaratri.calendarNote}\n\nపురాణ కథలు భక్తి సంప్రదాయ కథనాలు. రోజువారీ ఉదాహరణలు, జీవన పాఠాలు స్వతంత్ర భావాన్వయాలు.\n\nతరువాత: ${config.navaratri.nextName}.\nసబ్‌స్క్రైబ్, లైక్, షేర్ చేయండి. ఈ రోజు నేర్చుకున్న విషయాన్ని కామెంట్‌లో చెప్పండి.\n\nAI disclosure: Illustrations and narration are AI-generated artistic interpretations, not historical footage or recordings of an actual temple. సంగీతం లేదు.\n\n${hashtags}\n\n${apology}`;
 assert(Buffer.byteLength(description)<=5000,'YouTube description exceeds 5000 bytes');
 assert([...config.videoTitle].length<=100);
 return {titles:[config.videoTitle],description,hashtags,chapters,thumbnailPrompt};
}

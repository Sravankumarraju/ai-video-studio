import 'dotenv/config';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const data={
7:{ordinal:'ఏడవ',theme:'మన బలాన్ని తెలుసుకుందాం',
verse:'అస్మాకం తు విశిష్టా యే తాన్నిబోధ ద్విజోత్తమ. నాయకా మమ సైన్యస్య సంజ్ఞార్థం తాన్ బ్రవీమి తే.',
display:'అస్మాకం తు విశిష్టా యే\nతాన్నిబోధ ద్విజోత్తమ ।\nనాయకా మమ సైన్యస్య\nసంజ్ఞార్థం తాన్ బ్రవీమి తే ॥ ౭ ॥',
hook:'ఎదుటివారి బలం చూస్తూ, మన దగ్గర ఉన్న సామర్థ్యాన్ని మర్చిపోతున్నామా? ఒక సవాలు ఎదురైనప్పుడు భయం సహజం. కానీ మనకు సహాయం చేయగలవారు ఎవరు? మనం ఇప్పటికే నేర్చుకున్నది ఏమిటి? కురుక్షేత్రంలో దుర్యోధనుడు ఇప్పుడు తన పక్షంలోని నాయకుల వైపు దృష్టి మళ్లిస్తున్నాడు. ఈ మాటలను అర్థం చేసుకుంటూ, మన సిద్ధత గురించి ఆలోచిద్దాం.',
context:'ఇంతవరకు దుర్యోధనుడు ద్రోణాచార్యుడికి పాండవ పక్షపు యోధులను చూపించాడు. ఆరవ శ్లోకంతో ఆ పరిచయం ముగిసింది. ఇప్పుడు మన పక్షంలో కూడా ముఖ్యమైన నాయకులు ఉన్నారని చెబుతున్నాడు. మాటల దిశ మారుతోంది. తన గురువుతో మాట్లాడుతున్న దుర్యోధనుడే ఇక్కడ వక్త. ఏడవ శ్లోకాన్ని వినండి.',
meaning:'బ్రాహ్మణులలో శ్రేష్ఠుడా, మన పక్షంలో ఉన్న ముఖ్యమైన వారిని కూడా తెలుసుకోండి. నా సైన్యానికి నాయకులైన వారి గురించి, మీకు తెలియజేయడానికి చెబుతున్నాను, అని దుర్యోధనుడు అంటున్నాడు. ఈ శ్లోకం పేర్ల జాబితాకు ఒక పరిచయం. ఆ పేర్లు తర్వాతి శ్లోకంలో వస్తాయి. ఇక్కడ వాటిని ముందుగానే మూల పఠనంలో కలపకూడదు.',
words:'అస్మాకం అంటే మన యొక్క. విశిష్టా అంటే ముఖ్యమైన లేదా ప్రత్యేకమైన వారు. నిబోధ అంటే తెలుసుకోండి. ద్విజోత్తమ అనే సంబోధనతో ద్రోణాచార్యుడిని పలుకరిస్తున్నాడు. నాయకా అంటే నాయకులు. సంజ్ఞార్థం అంటే తెలియజేయడం కోసం. చిన్న పదాలను విడదీసి చూస్తే, వాక్యం మొత్తం అర్థం సులభంగా తెలుస్తుంది.',
detail:'ఈ భాగంలో శ్రీకృష్ణుడు ఇంకా ఉపదేశం ప్రారంభించలేదు. దుర్యోధనుడు తన సైన్యాన్ని పరిచయం చేస్తున్నాడు. కాబట్టి అతని ప్రతి మాటను గీత ఇచ్చే జీవన ఆదేశంగా భావించకూడదు. కథలో ఎవరు మాట్లాడుతున్నారు, ఎవరితో మాట్లాడుతున్నారు, ఎందుకు మాట్లాడుతున్నారు అనే మూడు ప్రశ్నలు మన అవగాహనకు చాలా ఉపయోగపడతాయి.',
reflection:'ఈ సందర్భం నుంచి మనం ఒక ఆచరణాత్మక ఆలోచన తీసుకోవచ్చు. మన బలాన్ని గుర్తించడం అంటే గొప్పలు చెప్పుకోవడం కాదు. మన సామర్థ్యాన్ని నిజాయితీగా చూడటం. ఇతరుల సహాయం అవసరమయ్యే చోట దాన్ని అంగీకరించడం. మన లోపాలు కూడా తెలుసుకోవడం. ఇది మన అన్వయం; శ్లోకంలోని ప్రత్యక్ష ఆజ్ఞ కాదు.',
example:'కొత్త ఉద్యోగంలో ఒక పని అప్పగించారని అనుకోండి. ఇతరులు చాలా అనుభవం కలవారని చూసి భయపడవచ్చు. అప్పుడు మీకు తెలిసిన విషయాలను రాయండి. సహాయం చేయగల గురువును గుర్తించండి. పని వివరాలు అడగండి. చిన్న దశతో ప్రారంభించండి. బృందంలో ప్రతి ఒక్కరి సామర్థ్యం తెలిసినప్పుడు పని పంచుకోవడం సులభమవుతుంది. మన విలువను చూపడానికి తెలియని విషయాన్ని తెలిసినట్లు చెప్పాల్సిన అవసరం లేదు.',
practice:'ఈ రోజు ఒక కాగితంపై మూడు విషయాలు రాయండి. నాకు తెలిసిన ఒక పని. నేర్చుకోవలసిన ఒక విషయం. సహాయం అడగగల ఒక వ్యక్తి. తర్వాత మొదటి చిన్న అడుగు వేయండి. సిద్ధతతో వచ్చిన నమ్మకం, పోలికలతో వచ్చిన భయం కంటే ఉపయోగకరం.',
conclusion:'ఏడవ శ్లోకం దుర్యోధనుడి పక్షంలోని నాయకుల పరిచయానికి ఆరంభం. మన జీవిత అన్వయంలో, మన బలాన్ని తెలుసుకుంటూ ఇతరుల సహాయాన్ని గౌరవిద్దాం. అహంకారం లేకుండా, వాస్తవాన్ని చూసి సిద్ధపడదాం.',
next:'తర్వాతి వీడియోలో మొదటి అధ్యాయం, ఎనిమిదవ శ్లోకాన్ని తెలుసుకుందాం. ద్రోణుడు, భీష్ముడు, కర్ణుడు మరియు ఇతర యోధులను దుర్యోధనుడు ఎలా పరిచయం చేశాడో చూద్దాం.',
hero:'Duryodhana, a regal human prince in crimson-gold armor, respectfully addressing elderly white-bearded Drona in cream-gold robes, gesturing toward Kaurava commanders and organized chariots at Kurukshetra dawn. Thoughtful faces, calm readiness, no fighting, no Krishna costume or divine aura.',exampleSource:'gita-1-6/devotional-v1/example.png'},
8:{ordinal:'ఎనిమిదవ',theme:'అనుభవాన్ని గౌరవిద్దాం',
verse:'భవాన్ భీష్మశ్చ కర్ణశ్చ కృపశ్చ సమితింజయః. అశ్వత్థామా వికర్ణశ్చ సౌమదత్తిస్తథైవ చ.',
display:'భవాన్ భీష్మశ్చ కర్ణశ్చ\nకృపశ్చ సమితింజయః ।\nఅశ్వత్థామా వికర్ణశ్చ\nసౌమదత్తిస్తథైవ చ ॥ ౮ ॥',
hook:'ఎంత పెద్ద పని అయినా ఒకరి బలంతోనే పూర్తవుతుందా? అనుభవం ఉన్నవారు, నైపుణ్యం ఉన్నవారు, నేర్చుకుంటున్నవారు కలిసి ఉన్నప్పుడు బృందం బలపడుతుంది. కానీ పేర్లు గొప్పగా ఉంటే చాలు, విజయం ఖాయమా? భగవద్గీతలో దుర్యోధనుడు తన పక్షంలోని ప్రముఖుల పేర్లు చెబుతున్నాడు. వారిని తెలుసుకుందాం. పేర్లను గౌరవిస్తూ, నిర్ణయాలను కూడా పరిశీలిద్దాం.',
context:'ఏడవ శ్లోకంలో మన పక్షపు నాయకుల గురించి చెబుతానని దుర్యోధనుడు అన్నాడు. ఇప్పుడు ఆ జాబితా మొదలవుతుంది. తన ఎదుట ఉన్న ద్రోణాచార్యుడిని మీరు అని మొదట ప్రస్తావిస్తున్నాడు. తర్వాత ఇతర ముఖ్యమైన యోధులను పరిచయం చేస్తున్నాడు. ఇది కౌరవ పక్షపు పరిచయం. ఎనిమిదవ శ్లోకాన్ని వినండి.',
meaning:'మీరూ, భీష్ముడూ, కర్ణుడూ, యుద్ధంలో నైపుణ్యం కలిగిన కృపాచార్యుడూ ఉన్నారు. అశ్వత్థామ, వికర్ణుడు, సోమదత్తుని కుమారుడు కూడా ఉన్నారు, అని దుర్యోధనుడు అంటున్నాడు. సోమదత్తుని కుమారుడు భూరిశ్రవుడు. మీరు అనే పదం ఇక్కడ ద్రోణాచార్యుడిని సూచిస్తుంది. పేర్లను ఒక్కొక్కటిగా గుర్తిస్తే ఈ పరిచయం స్పష్టమవుతుంది.',
words:'భవాన్ అంటే మీరు. చ అంటే మరియు. సమితింజయః అంటే యుద్ధంలో విజయాన్ని సాధించేవాడు. సౌమదత్తి అంటే సోమదత్తుని కుమారుడు. తథైవ చ అంటే అలాగే కూడా. భీష్ముడు, భీముడు వేర్వేరు వ్యక్తులు. వారి పేర్లు దగ్గరగా వినిపించినా, చదివేటప్పుడు కలపకుండా జాగ్రత్తగా పలకాలి.',
detail:'ఈ జాబితాలో గురువు, పెద్దలు, యువ యోధులు కనిపిస్తారు. కానీ శ్లోకం వారి పూర్తి జీవిత కథలను చెప్పదు. వారి చివరి ఫలితాలను కూడా ఇక్కడ ప్రకటించదు. పేర్లు, నైపుణ్యం గురించి మాట్లాడినంత మాత్రాన వారి ప్రతి నిర్ణయం సరైనదని తీర్పు ఇవ్వలేం. వ్యక్తి సామర్థ్యాన్ని గుర్తించడం, అతని చర్యను పరిశీలించడం రెండూ అవసరమే.',
reflection:'ఈ సందర్భాన్ని మన జీవితానికి అన్వయించుకుంటే, అనుభవాన్ని గౌరవించడం అనే ఆలోచన వస్తుంది. గౌరవంగా వినడం మంచిది. సందేహం వచ్చినప్పుడు మర్యాదగా ప్రశ్నించడం కూడా మంచిదే. పెద్ద పేరు ఉంది కాబట్టి అన్ని విషయాల్లో తప్పు ఉండదని అనుకోకండి. ఇది మన ఆధునిక అన్వయం; ఈ శ్లోకం ఇచ్చిన ప్రత్యక్ష సూచన కాదు.',
example:'పాఠశాలలో ఒక కార్యక్రమానికి బృందం సిద్ధమవుతోందని ఊహించండి. ఒకరికి మాట్లాడటం బాగా వచ్చు. మరొకరు ఏర్పాట్లు చక్కగా చేస్తారు. అనుభవం ఉన్న గురువు దిశ చూపుతారు. ఎవరు ఏ పని చేయగలరో తెలుసుకుని బాధ్యతలు పంచుకుంటే పని సులభమవుతుంది. గురువు చెప్పింది అర్థం కాకపోతే గౌరవంగా అడగాలి. బృందంలో నమ్మకం పెరగడానికి వినడం, స్పష్టంగా మాట్లాడటం రెండూ ఉపయోగపడతాయి.',
practice:'మీకు ఒక మంచి అలవాటు నేర్పిన వ్యక్తిని గుర్తు చేసుకోండి. మీరు ఏమి నేర్చుకున్నారో చెప్పి ధన్యవాదాలు తెలపండి. తర్వాత మీ బృందంలో ఎవరి నైపుణ్యం ఉపయోగపడుతుందో రాయండి. గౌరవంతో పాటు బాధ్యతను కూడా పంచుకోండి.',
conclusion:'ఎనిమిదవ శ్లోకంలో కౌరవ పక్షపు ప్రముఖుల పరిచయాన్ని చూశాం. మన అన్వయంలో నేర్చుకునేది, అనుభవాన్ని గౌరవించడం, సామర్థ్యాన్ని గుర్తించడం. పేరు కంటే పని, పొగడ్త కంటే స్పష్టమైన అవగాహన ముఖ్యమని ఆలోచిద్దాం.',
next:'తర్వాతి వీడియోలో మొదటి అధ్యాయం, తొమ్మిదవ శ్లోకాన్ని తెలుసుకుందాం. తన కోసం పోరాడేందుకు సిద్ధంగా ఉన్న మరెందరో యోధుల గురించి దుర్యోధనుడు ఏమంటాడో వినండి.',
hero:'Seven distinct human Kaurava allied commanders in dignified staggered portrait beside golden chariots: Drona elderly teacher in cream, Bhishma very elderly white beard in silver armor, Karna mature archer in gold, Kripa mature teacher, Ashwatthama young warrior, Vikarna prince, Bhurishrava mature warrior. Beautiful indigo-gold Indian epic painting. Lowered weapons, no battle action, no divine Krishna identity.',exampleSource:'gita-1-5/devotional-v1/example.png'},
9:{ordinal:'తొమ్మిదవ',theme:'నిబద్ధతకు వివేకం తోడు',
verse:'అన్యే చ బహవః శూరా మదర్థే త్యక్తజీవితాః. నానాశస్త్రప్రహరణాః సర్వే యుద్ధవిశారదాః.',
display:'అన్యే చ బహవః శూరా\nమదర్థే త్యక్తజీవితాః ।\nనానాశస్త్రప్రహరణాః\nసర్వే యుద్ధవిశారదాః ॥ ౯ ॥',
hook:'ఎవరో మన మీద నమ్మకం ఉంచారు కాబట్టి, వారు చెప్పిన ప్రతిదీ ఆలోచించకుండా చేయాలా? నిబద్ధత గొప్పదే. కానీ దానికి వివేకం తోడైతేనే మన నిర్ణయం విలువైనది అవుతుంది. కురుక్షేత్రంలో తన కోసం ప్రాణాలు అర్పించేందుకు సిద్ధమైన యోధుల గురించి దుర్యోధనుడు చెబుతున్నాడు. ముందుగా అతని మాటల అర్థం తెలుసుకుందాం. తర్వాత మన బాధ్యత గురించి ఆలోచిద్దాం.',
context:'ఎనిమిదవ శ్లోకంలో ద్రోణుడు, భీష్ముడు, కర్ణుడు వంటి ప్రముఖుల పేర్లు వచ్చాయి. ఇప్పుడు వారితో పాటు మరెందరో ఉన్నారని దుర్యోధనుడు చెబుతున్నాడు. ఇది యుద్ధానికి ముందు తన సైన్యాన్ని గురించి చెప్పిన మాట. యుద్ధం తర్వాత జరిగిన సంఘటనను ఇక్కడ వివరిస్తున్నట్లు భావించకండి. తొమ్మిదవ శ్లోకాన్ని వినండి.',
meaning:'ఇంకా చాలామంది వీరులు నా కోసం తమ ప్రాణాలను అర్పించేందుకు సిద్ధంగా ఉన్నారు. వారు అనేక రకాల ఆయుధాలను ధరించారు. వారందరూ యుద్ధ విద్యలో నిపుణులు, అని దుర్యోధనుడు చెబుతున్నాడు. ఇక్కడ నా కోసం అనే మాట అతని దృష్టిని చూపిస్తుంది. ఇది యోధుల సిద్ధత గురించి చేసిన ప్రకటన.',
words:'అన్యే అంటే ఇతరులు. బహవః అంటే చాలామంది. శూరా అంటే వీరులు. మదర్థే అంటే నా కోసం. త్యక్తజీవితాః అనే పదాన్ని ఇక్కడ ప్రాణాలు అర్పించేందుకు సిద్ధమైనవారు అనే సందర్భంలో అర్థం చేసుకుంటున్నాం. యుద్ధవిశారదాః అంటే యుద్ధంలో నైపుణ్యం కలిగినవారు. నానాశస్త్ర అనే పదం విభిన్న ఆయుధాలను సూచిస్తుంది.',
detail:'ఈ శ్లోకం దుర్యోధనుడి పక్షపు సిద్ధతను తెలియజేస్తుంది. నైపుణ్యం ఉన్నవారు ఒక లక్ష్యానికి తమ శక్తిని వినియోగించవచ్చు. కానీ నైపుణ్యం ఒక్కటే ఆ లక్ష్యం సరైనదని నిరూపించదు. ఈ దృశ్యాన్ని చదివేటప్పుడు వక్త మాట, కథా సందర్భం వేరు చేసి చూడాలి. శ్రీకృష్ణుడు అందరినీ ఇలా చేయమని ఆదేశించిన వాక్యం ఇది కాదు.',
reflection:'మన జీవితానికి ఒక ప్రశ్న తీసుకుందాం. నేను చేస్తున్న పని ఎవరికోసం? దాని వల్ల ఎవరికి మేలు, ఎవరికి నష్టం? నమ్మకాన్ని నిలబెట్టడం మంచిదే. కానీ తప్పు కనిపించినప్పుడు ప్రశ్నించడం కూడా బాధ్యత. నిబద్ధత అంటే మన ఆలోచనను వదిలేయడం కాదు. ఇది మన అన్వయం; ప్రాణత్యాగానికి పిలుపుగా భావించకండి.',
example:'ఒక విద్యార్థికి స్నేహితుడు పరీక్షలో సమాధానాలు చూపించమని అడిగాడని ఊహించండి. స్నేహం కోసం తప్పును ఒప్పుకోవాలా? సహాయం చేయాలనే ఉద్దేశంతో, చదువులో తోడ్పడవచ్చు. విషయాన్ని వివరించవచ్చు. కానీ మోసం చేయాల్సిన అవసరం లేదు. మర్యాదగా కాదు అని చెప్పడం స్నేహాన్ని తక్కువ చేయడం కాదు. మంచి దిశలో నిలబడటం కూడా నిజమైన సహాయం. ఇది మన అవగాహన కోసం ఇచ్చిన ఉదాహరణ.',
practice:'ఒక చిన్న నిర్ణయం ముందు ఆగండి. ఇది సరైన పని కాదా? ఎవరి నమ్మకాన్ని కాపాడుతున్నాను? ఎవరినైనా నష్టపరుస్తున్నానా? అని అడగండి. సందేహం ఉంటే నమ్మకమైన పెద్దవారితో మాట్లాడండి. ఆలోచించి చేసిన నిర్ణయం మన బాధ్యతను స్పష్టం చేస్తుంది.',
conclusion:'తొమ్మిదవ శ్లోకంలో దుర్యోధనుడు మరెందరో యోధుల సిద్ధతను వివరించాడు. మన జీవితంలో తీసుకునే ఆలోచన, నిబద్ధతకు వివేకాన్ని జోడించడం. మన సామర్థ్యాన్ని మంచి దిశలో వినియోగించేందుకు ఆలోచిద్దాం.',
next:'తర్వాతి వీడియోలో మొదటి అధ్యాయం, పదవ శ్లోకాన్ని తెలుసుకుందాం. భీష్ముడు, భీముడు రక్షించే రెండు సైన్యాల బలాన్ని దుర్యోధనుడు ఎలా పోల్చాడో చూద్దాం.',
hero:'Duryodhana surveying many disciplined human Kaurava warriors with different lowered bows, spears and shields, majestic chariots, dramatic but peaceful golden dawn, attentive faces, symbolic readiness before war. No wounds, violence, dying soldiers or triumphant battle, no text. Rich sacred epic illustration indigo and gold.',exampleSource:'gita-1-4/devotional-v1/example.png'},
10:{ordinal:'పదవ',theme:'నమ్మకమా? అతి నమ్మకమా?',
verse:'అపర్యాప్తం తదస్మాకం బలం భీష్మాభిరక్షితమ్. పర్యాప్తం త్విదమేతేషాం బలం భీమాభిరక్షితమ్.',
display:'అపర్యాప్తం తదస్మాకం\nబలం భీష్మాభిరక్షితమ్ ।\nపర్యాప్తం త్విదమేతేషాం\nబలం భీమాభిరక్షితమ్ ॥ ౧౦ ॥',
hook:'నా దగ్గర చాలా బలం ఉంది, నాకు ఓటమి ఉండదు అని అనుకున్నప్పుడు, నిజంగా సిద్ధంగా ఉన్నామా? లేక చూడాల్సిన విషయాన్ని చూడటం మానేశామా? నమ్మకం మనల్ని ముందుకు తీసుకెళ్తుంది. అతి నమ్మకం పరిశీలనను తగ్గించవచ్చు. దుర్యోధనుడు రెండు సైన్యాల బలాన్ని పోలుస్తున్న ఈ శ్లోకాన్ని జాగ్రత్తగా అర్థం చేసుకుందాం.',
context:'గత శ్లోకాల్లో దుర్యోధనుడు రెండు పక్షాల యోధులను పరిచయం చేశాడు. ఇప్పుడు భీష్ముడు రక్షిస్తున్న తమ సైన్యాన్ని, భీముడు రక్షిస్తున్న పాండవ సైన్యంతో పోలుస్తున్నాడు. పేర్లు స్పష్టంగా గుర్తించండి. భీష్ముడు కౌరవ పక్షంలో ఉన్న పెద్ద యోధుడు. భీముడు పాండవులలో ఒకడు. పదవ శ్లోకాన్ని వినండి.',
meaning:'ఈ వీడియోలో అనుసరిస్తున్న వ్యాఖ్యానంలో, భీష్ముడు రక్షిస్తున్న మన బలం అపరిమితమైనది; భీముడు రక్షిస్తున్న వారి బలం పరిమితమైనది, అని దుర్యోధనుడు చెప్పినట్లు వివరిస్తారు. ఇది అతను చేసిన అంచనా. యుద్ధ ఫలితాన్ని ప్రకటించే తీర్పు కాదు. తన బలంపై అతని దృష్టిని చూపించే మాటగా ముందుగా గుర్తుపెట్టుకుందాం.',
words:'అస్మాకం అంటే మన యొక్క. ఏతేషాం అంటే వారి యొక్క. బలం అంటే సైనిక శక్తి. అభిరక్షితమ్ అంటే రక్షింపబడినది. అపర్యాప్తం, పర్యాప్తం అనే పదాలకు వ్యాఖ్యాన సంప్రదాయాల్లో భిన్నమైన వివరణలు ఉన్నాయి. కొన్ని అనువాదాలు సరిపోని బలం, సరిపోయే బలం అనే అర్థాలను చూపిస్తాయి. అందువల్ల ఒకే అర్థం మాత్రమే ఉందని చెప్పడం సరికాదు.',
detail:'మన సిరీస్ ఉపయోగిస్తున్న మూల వ్యాఖ్యానం అపరిమితం, పరిమితం అనే పఠనాన్ని అనుసరిస్తుంది. మరొక పఠనంలో దుర్యోధనుడి ఆందోళన బయటపడినట్లు వివరిస్తారు. ఏ పఠనమైనా రెండు సైన్యాలను పోల్చే వక్త దుర్యోధనుడే. శ్రీకృష్ణుడు ఇచ్చిన జీవన ఆజ్ఞ ఇది కాదు. భిన్నమైన అర్థం కనిపించినప్పుడు మూలాన్ని పరిశీలించి, ప్రశాంతంగా నేర్చుకోవచ్చు.',
reflection:'ఈ సందర్భం నుంచి మనం ఒక ఆచరణాత్మక ఆలోచన తీసుకోవచ్చు. నా బలం నాకు తెలుసా? నా అంచనాకు ఆధారం ఏమిటి? ఇతరుల సామర్థ్యాన్ని తక్కువగా చూస్తున్నానా? అనే ప్రశ్నలు ఉపయోగపడతాయి. నమ్మకంతో పాటు పరిశీలన ఉండాలి. ఇది మన జీవిత అన్వయం; శ్లోకంలోని నేరుగా ఇచ్చిన ఆధునిక సూచన కాదు.',
example:'ఒక విద్యార్థికి గత పరీక్షలో మంచి మార్కులు వచ్చాయని అనుకోండి. ఈసారి చదవకపోయినా సరిపోతుందని భావిస్తే సిద్ధత తగ్గుతుంది. గత విజయాన్ని ప్రోత్సాహంగా తీసుకుని, కొత్త పాఠాలను సాధన చేస్తే నమ్మకానికి ఆధారం ఉంటుంది. మరో విద్యార్థి బాగా సిద్ధమయ్యాడని తెలిసినప్పుడు తక్కువగా చూడకుండా నేర్చుకోవచ్చు. ఫలితం ఖాయం అని అనుకోవడం కంటే, ఈ రోజు చేయాల్సిన పని పూర్తి చేయడం ఉపయోగకరం.',
practice:'మీకు సులభంగా అనిపిస్తున్న ఒక పనిని ఎంచుకోండి. ఇంకా తనిఖీ చేయాల్సిన రెండు విషయాలు రాయండి. ఎవరి సూచన ఉపయోగపడుతుందో గుర్తించండి. చిన్న సాధన చేయండి. నమ్మకాన్ని తగ్గించుకోవాల్సిన అవసరం లేదు. దానికి సిద్ధతను జోడించండి.',
conclusion:'పదవ శ్లోకంలో రెండు సైన్యాల బలంపై దుర్యోధనుడి పోలికను చూశాం. పదాల భిన్న పఠనాలను కూడా గుర్తించాం. మన ఆచరణలో నమ్మకం, వినయం, పరిశీలన కలిసి ఉండేలా నేర్చుకుందాం.',
next:'తర్వాతి వీడియోలో మొదటి అధ్యాయం, పదకొండవ శ్లోకాన్ని తెలుసుకుందాం. భీష్ముడి రక్షణ గురించి దుర్యోధనుడు తన యోధులకు ఏం చెప్పాడో చూద్దాం. ఒక్కో శ్లోకంతో మన ప్రయాణం కొనసాగుతుంది.',
hero:'One coherent panoramic Kurukshetra before-battle scene: elderly white-bearded Bhishma in silver-gold armor among Kaurava chariots on one side; powerful human Bhima with lowered mace and Pandava soldiers across open field on the other; Duryodhana thoughtfully surveys the comparison in foreground. Peaceful contemplative epic devotional art, not winner or loser, no fighting, no text.',exampleSource:'gita-1-4/devotional-v1/example.png'}
};
const root='data/productions/divine-wisdom';
const template=JSON.parse(await readFile(`${root}/gita-1-6/devotional-v1/episode.json`,'utf8'));
const client=new Client({name:'gita-next-four',version:'1'});
assert(process.env.STORY_STUDIO_MCP_TOKEN);
await client.connect(new StreamableHTTPClientTransport(new URL('http://localhost:3000/api/mcp'),{requestInit:{headers:{Authorization:`Bearer ${process.env.STORY_STUDIO_MCP_TOKEN}`,Connection:'close'}}}));
async function call(name,args){const r=await client.callTool({name,arguments:args}),t=r.content.find(c=>c.type==='text')?.text;assert(!r.isError,t);return JSON.parse(t);}
const base=(await call('get_project',{projectId:template.projectId})).document;
try{for(const n of [7,8,9,10]){
 const dir=`${root}/gita-1-${n}/devotional-v1`;await mkdir(dir,{recursive:true});
 const exists=await readFile(`${dir}/episode.json`,'utf8').then(JSON.parse).catch(()=>null);if(exists){console.log(JSON.stringify({verse:n,projectId:exists.projectId,resumed:true}));continue;}
 const d=data[n],ep=String(n).padStart(3,'0');
 const sections=template.sections.map(s=>({...s,text:d[s.id]||s.text}));
 sections.find(s=>s.id==='welcome').text=`డివైన్ విజ్డమ్ తెలుగు ఛానల్‌కు స్వాగతం. భగవద్గీత మొదటి అధ్యాయం, ${d.ordinal} శ్లోకం. మన జ్ఞాన ప్రయాణంలో ${d.ordinal} ఎపిసోడ్.`;
 sections.find(s=>s.id==='hook').title=d.theme;
 sections.find(s=>s.id==='shloka').text=d.verse;
 sections.find(s=>s.id==='shloka').title=`భగవద్గీత 1.${n} · శ్లోక పఠనం`;
 sections.find(s=>s.id==='meaning').title=`శ్లోకం 1.${n} · సులభమైన తెలుగు అర్థం`;
 sections.find(s=>s.id==='next').title=`తర్వాతి ఎపిసోడ్ · భగవద్గీత 1.${n+1}`;
 const title=`Divine Wisdom Telugu · Episode ${ep} · భగవద్గీత 1.${n}`;
 const document={...base,title,topic:`భగవద్గీత 1.${n}: ${d.theme}`,mode:'manual',reviewCheckpoints:true,budget:10,generationLimit:50,unknownCostPolicy:'block',scenes:[],variants:[],script:'',outline:'',sources:'',publishing:{titles:[],description:'',hashtags:'',thumbnailPrompt:'',chapters:''}};
 const project=await call('create_project',{document});
 const config={...template,projectId:project.id,variantId:`gita-1-${n}-te-devotional-v1`,prefix:`gita-${ep}-v1`,fileStem:`episode-${ep}`,episodeNumber:ep,verseRef:`1.${n}`,nextVerseRef:`1.${n+1}`,title,videoTitle:`భగవద్గీత 1.${n} — ${d.theme} | Divine Wisdom Telugu`,descriptionSummary:`భగవద్గీత మొదటి అధ్యాయం, ${d.ordinal} శ్లోకం. ${d.theme}. మూల శ్లోక పఠనం, సులభమైన తెలుగు అర్థం, ముఖ్య పదాలు, కథా సందర్భం, రోజువారీ ఉదాహరణ మరియు చిన్న ఆచరణ.`,verseDisplay:d.display,sources:[`https://www.holy-bhagavad-gita.org/chapter/1/verse/${n}/te/`],sourceNotes:`One verse only: Bhagavad Gita 1.${n}. Public-domain Sanskrit transliterated in Telugu. Original Telugu paraphrase and analogies. Speaker is Duryodhana addressing Drona, not Krishna's direct instruction. Modern applications explicitly distinguished from literal meaning. ${n===10?'Uses Mukundananda unlimited/limited reading; alternate insufficient/sufficient reading expressly acknowledged.':''} Long-form 16:9, no music, natural delivery under five minutes.`,sections};
 await writeFile(`${dir}/episode.json`,JSON.stringify(config,null,2));
 const style='Use case: illustration-story. 16:9 landscape, beautiful respectful Divine Wisdom devotional Indian epic painting, luminous gold and deep indigo, expressive faces, rich fabrics, soft celestial sky, natural anatomy. No text, no watermark; calm bottom center for captions. ';
 const reuse={teacher:'gita-1-3/devotional-v1/teacher.png',formation:'gita-1-3/devotional-v1/formation.png',verse:'gita-1-1/recreated-v3/04-verse.png',calm:'gita-series-intro/calm.png',path:'gita-series-intro/path.png',book:'gita-series-intro/book.png',example:d.exampleSource};
 const prompts=[{name:'hero',prompt:style+d.hero},...Object.entries(reuse).map(([name,source])=>({name,source:`${root}/${source}`,prompt:`Reuse approved Divine Wisdom ${name} illustration. ${name==='example'?'Modern educational analogy: '+d.example:''} Source: ${root}/${source}`}))];
 for(const [name,source] of Object.entries(reuse))await copyFile(`${root}/${source}`,`${dir}/${name}.png`);
 await writeFile(`${dir}/image-prompts.json`,JSON.stringify(prompts,null,2));
 await writeFile(`${dir}/THUMBNAIL-PROMPT.md`,`Use case: ads-marketing. YouTube thumbnail, 16:9, exquisite devotional epic Indian painting, luminous gold and deep indigo. Right half: ${d.hero} Left half dark indigo with VERY LARGE exact Telugu headline "${d.theme}" in two or three clear lines, gold/white. Beneath exactly "భగవద్గీత 1.${n}". Top label exactly "Divine Wisdom Telugu". No other text. Phone readable, no text cut off.`);
 console.log(JSON.stringify({verse:n,projectId:project.id,words:sections.reduce((a,s)=>a+s.text.split(/\s+/u).length,0)}));
}}finally{await client.close();}

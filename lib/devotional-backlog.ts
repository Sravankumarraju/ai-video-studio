import { z } from "zod";

// Discovery records, not a verified sacred-text edition or a media-generation queue.
const sourceSchema = z.object({
  url: z.string().url(),
  publisher: z.string(),
  editorialGroup: z.string(),
  access: z.enum(["retrieved", "search_index_only", "index_only"]),
  observedOn: z.string(),
  independence: z.enum(["needs_verification", "mirror"]),
  reuse: z.literal("needs_verification"),
});
export const devotionalWorkSchema = z.object({
  id: z.string(),
  deity: z.string(),
  titleTe: z.string(),
  titleEn: z.string(),
  priority: z.enum(["P1", "P2"]),
  originalLanguage: z.string().nullable(),
  displayScript: z.literal("Telugu"),
  textForm: z.enum(["stotram", "namavali", "dandakam", "needs_verification"]),
  firstLine: z.string().nullable(),
  sources: z.array(sourceSchema),
  edition: z.string().nullable(),
  completenessScope: z.string(),
  verifiedCounts: z.object({
    verses: z.number().int().positive().nullable(),
    names: z.number().int().positive().nullable(),
  }),
  sourceAccessDate: z.string().nullable(),
  rightsStatus: z.literal("needs_verification"),
  verificationStatus: z.literal("needs_verification"),
  productionStatus: z.enum(["research", "blocked"]),
  firstTreatment: z.string(),
  estimatedMinutes: z.tuple([z.number(), z.number()]),
  reviewerNotes: z.array(z.string()),
});
export type DevotionalWork = z.infer<typeof devotionalWorkSchema>;
type Row = [
  string,
  string,
  string,
  string,
  "P1" | "P2",
  number,
  number,
  string,
];
const rows: Row[] = [
  [
    "lingashtakam",
    "Shiva",
    "లింగాష్టకం",
    "Lingashtakam",
    "P1",
    3,
    6,
    "Chant with Telugu lyrics; separate meaning video",
  ],
  [
    "shiva-panchakshari",
    "Shiva",
    "శివ పంచాక్షరి స్తోత్రం",
    "Shiva Panchakshari Stotram",
    "P1",
    3,
    6,
    "Chant and pronunciation guide",
  ],
  [
    "bilvashtakam",
    "Shiva",
    "బిల్వాష్టకం",
    "Bilvashtakam",
    "P1",
    3,
    6,
    "Chant; explain bilva symbolism separately",
  ],
  [
    "kalabhairavashtakam",
    "Shiva",
    "కాలభైరవాష్టకం",
    "Kalabhairavashtakam",
    "P2",
    4,
    8,
    "Recitation and original Telugu meaning",
  ],
  [
    "shiva-tandava",
    "Shiva",
    "శివ తాండవ స్తోత్రం",
    "Shiva Tandava Stotram",
    "P2",
    6,
    12,
    "Expert rhythm and pronunciation review",
  ],
  [
    "shiva-namavali",
    "Shiva",
    "శివ అష్టోత్తర శత నామావళి",
    "Shiva Ashtottara Shata Namavali",
    "P2",
    8,
    15,
    "Verify each name and count",
  ],
  [
    "vishnu-sahasranamam",
    "Vishnu",
    "శ్రీ విష్ణు సహస్రనామ స్తోత్రం",
    "Vishnu Sahasranamam",
    "P1",
    25,
    45,
    "Declare opening and closing sections",
  ],
  [
    "govinda-namavali",
    "Venkateswara",
    "గోవింద నామావళి",
    "Govinda Namavali",
    "P1",
    8,
    20,
    "Select a named version before counting",
  ],
  [
    "venkateswara-stotram",
    "Venkateswara",
    "శ్రీ వేంకటేశ్వర స్తోత్రం",
    "Venkateswara Stotram",
    "P1",
    4,
    8,
    "Recitation and separate explanation",
  ],
  [
    "venkateswara-suprabhatam",
    "Venkateswara",
    "శ్రీ వేంకటేశ్వర సుప్రభాతం",
    "Venkateswara Suprabhatam",
    "P2",
    8,
    25,
    "Distinguish Suprabhatam from the four-part compilation",
  ],
  [
    "narasimha-karavalamba",
    "Narasimha",
    "లక్ష్మీ నృసింహ కరావలంబ స్తోత్రం",
    "Lakshmi Narasimha Karavalamba Stotram",
    "P2",
    6,
    12,
    "Full selected text and explanatory companion",
  ],
  [
    "achyutashtakam",
    "Krishna",
    "అచ్యుతాష్టకం",
    "Achyutashtakam",
    "P2",
    4,
    7,
    "Chant and Telugu meaning",
  ],
  [
    "hanuman-chalisa",
    "Hanuman",
    "హనుమాన్ చాలీసా",
    "Hanuman Chalisa",
    "P1",
    8,
    12,
    "Awadhi recitation in Telugu script; not the Telugu adaptation",
  ],
  [
    "anjaneya-dandakam",
    "Hanuman",
    "ఆంజనేయ దండకం",
    "Anjaneya Dandakam",
    "P1",
    4,
    8,
    "Verify exact Telugu version and diction",
  ],
  [
    "hanumat-pancharatnam",
    "Hanuman",
    "హనుమత్ పంచరత్నం",
    "Hanumat Pancharatnam",
    "P2",
    3,
    6,
    "Beginner recitation",
  ],
  [
    "hanuman-namavali",
    "Hanuman",
    "హనుమాన్ అష్టోత్తర శత నామావళి",
    "Hanuman Ashtottara Shata Namavali",
    "P2",
    8,
    15,
    "Keep namavali distinct from nama-stotram",
  ],
  [
    "lalitha-sahasranamam",
    "Lalitha",
    "శ్రీ లలితా సహస్రనామ స్తోత్రం",
    "Lalitha Sahasranamam",
    "P1",
    30,
    45,
    "Prepare selected edition and separate meaning series",
  ],
  [
    "mahishasura-mardini",
    "Durga",
    "మహిషాసుర మర్దినీ స్తోత్రం",
    "Mahishasura Mardini Stotram",
    "P1",
    12,
    20,
    "Full verified text and original arrangement",
  ],
  [
    "kanakadhara",
    "Lakshmi",
    "కనకధారా స్తోత్రం",
    "Kanakadhara Stotram",
    "P1",
    8,
    15,
    "Recitation and original Telugu meaning",
  ],
  [
    "mahalakshmi-ashtakam",
    "Lakshmi",
    "మహాలక్ష్మీ అష్టకం",
    "Mahalakshmi Ashtakam",
    "P1",
    3,
    6,
    "Short complete starter production",
  ],
  [
    "annapurna-stotram",
    "Devi",
    "అన్నపూర్ణా స్తోత్రం",
    "Annapurna Stotram",
    "P2",
    4,
    8,
    "Verify opening line and version",
  ],
  [
    "durga-namavali",
    "Durga",
    "దుర్గా అష్టోత్తర శత నామావళి",
    "Durga Ashtottara Shata Namavali",
    "P2",
    8,
    15,
    "Verify names with readable pacing",
  ],
  [
    "aditya-hrudayam",
    "Surya",
    "ఆదిత్య హృదయం",
    "Aditya Hrudayam",
    "P1",
    8,
    15,
    "Recitation; verify Ramayana context separately",
  ],
  [
    "sankata-nashana-ganesha",
    "Ganesha",
    "సంకట నాశన గణేశ స్తోత్రం",
    "Sankata Nashana Ganesha Stotram",
    "P2",
    3,
    6,
    "Chant and name meanings",
  ],
  [
    "ganesha-pancharatnam",
    "Ganesha",
    "గణేశ పంచరత్నం",
    "Ganesha Pancharatnam",
    "P2",
    4,
    7,
    "Chant and beginner pronunciation",
  ],
  [
    "rama-raksha",
    "Rama",
    "శ్రీ రామ రక్షా స్తోత్రం",
    "Rama Raksha Stotram",
    "P2",
    10,
    18,
    "Complete selected edition",
  ],
  [
    "madhurashtakam",
    "Krishna",
    "మధురాష్టకం",
    "Madhurashtakam",
    "P2",
    4,
    7,
    "Original melody or recitation",
  ],
  [
    "subrahmanya-bhujangam",
    "Subrahmanya",
    "సుబ్రహ్మణ్య భుజంగం",
    "Subrahmanya Bhujangam",
    "P2",
    12,
    20,
    "Specialist pronunciation review",
  ],
  [
    "harivarasanam",
    "Ayyappa",
    "హరివరాసనం",
    "Harivarasanam",
    "P2",
    4,
    7,
    "Investigate composition and music rights",
  ],
  [
    "navagraha-stotram",
    "Navagraha",
    "నవగ్రహ స్తోత్రం",
    "Navagraha Stotram",
    "P2",
    4,
    8,
    "Chant and separate meaning",
  ],
];

const observedOn = "2026-10-16";
function source(
  url: string,
  publisher: string,
  access: z.infer<typeof sourceSchema>["access"],
): z.infer<typeof sourceSchema> {
  return {
    url,
    publisher,
    editorialGroup: publisher,
    access,
    observedOn,
    independence: "needs_verification",
    reuse: "needs_verification",
  };
}
const research: Record<string, z.infer<typeof sourceSchema>[]> = {
  lingashtakam: [
    source(
      "https://vignanam.org/telugu/lingashtakam.html",
      "Vaidika Vignanam",
      "search_index_only",
    ),
    source(
      "https://sanskritdocuments.org/doc_shiva/lingashh.html",
      "Sanskrit Documents",
      "retrieved",
    ),
  ],
  "mahalakshmi-ashtakam": [
    source(
      "https://vignanam.org/telugu/maha-lakshmi-ashtakam.html",
      "Vaidika Vignanam",
      "search_index_only",
    ),
    source(
      "https://sanskritdocuments.org/doc_devii/mahaalakshmyashhTakaM.html",
      "Sanskrit Documents",
      "retrieved",
    ),
  ],
  "hanuman-chalisa": [
    source(
      "https://vignanam.org/telugu/hanuman-chalisa.html",
      "Vaidika Vignanam",
      "search_index_only",
    ),
    source(
      "https://sanskritdocuments.org/doc_hanumaana/hanuman40.html",
      "Sanskrit Documents",
      "retrieved",
    ),
  ],
  "venkateswara-stotram": [
    source(
      "https://vignanam.org/telugu/sri-venkateswara-stotram.html",
      "Vaidika Vignanam",
      "search_index_only",
    ),
    source(
      "https://sanskritdocuments.org/doc_vishhnu/venkaTeshastotra.html",
      "Sanskrit Documents",
      "retrieved",
    ),
  ],
  "aditya-hrudayam": [
    source(
      "https://vignanam.org/telugu/aditya-hrudayam.html",
      "Vaidika Vignanam",
      "search_index_only",
    ),
    source(
      "https://sanskritdocuments.org/doc_z_misc_navagraha/adityahriday.html",
      "Sanskrit Documents",
      "retrieved",
    ),
  ],
  kanakadhara: [
    source(
      "https://vignanam.org/telugu/kanakadhara-stotram.html",
      "Vaidika Vignanam",
      "search_index_only",
    ),
    source(
      "https://sanskritdocuments.org/doc_devii/kanaka.html",
      "Sanskrit Documents",
      "retrieved",
    ),
  ],
  "vishnu-sahasranamam": [
    source("https://vignanam.org/telugu.htm", "Vaidika Vignanam", "index_only"),
    source(
      "https://sanskritdocuments.org/doc_vishhnu/vsahasranew.html",
      "Sanskrit Documents",
      "retrieved",
    ),
  ],
  "shiva-panchakshari": [
    source("https://vignanam.org/telugu.htm", "Vaidika Vignanam", "index_only"),
    source(
      "https://sanskritdocuments.org/doc_shiva/panch.html",
      "Sanskrit Documents",
      "retrieved",
    ),
  ],
};
export const firstExperiment = [
  "lingashtakam",
  "mahalakshmi-ashtakam",
  "hanuman-chalisa",
  "venkateswara-stotram",
  "aditya-hrudayam",
  "kanakadhara",
  "vishnu-sahasranamam",
  "shiva-panchakshari",
];
export const devotionalBacklog = rows.map(
  ([id, deity, titleTe, titleEn, priority, min, max, firstTreatment]) =>
    devotionalWorkSchema.parse({
      id,
      deity,
      titleTe,
      titleEn,
      priority,
      originalLanguage:
        id === "hanuman-chalisa"
          ? "Awadhi"
          : id === "anjaneya-dandakam"
            ? "Telugu"
            : firstExperiment.includes(id)
              ? "Sanskrit"
              : null,
      displayScript: "Telugu",
      textForm: id.includes("namavali")
        ? "namavali"
        : id === "anjaneya-dandakam"
          ? "dandakam"
          : id === "harivarasanam"
            ? "needs_verification"
            : "stotram",
      firstLine: null,
      sources: research[id] ?? [],
      edition: null,
      completenessScope:
        "Needs edition selection; opening, core and closing sections must be declared separately.",
      verifiedCounts: { verses: null, names: null },
      sourceAccessDate: research[id] ? observedOn : null,
      rightsStatus: "needs_verification",
      verificationStatus: "needs_verification",
      productionStatus: firstExperiment.includes(id) ? "blocked" : "research",
      firstTreatment,
      estimatedMinutes: [min, max],
      reviewerNotes: [
        "Imported from the user-supplied brief; topic priority and runtime are editorial estimates.",
        ...(research[id]?.length === 2
          ? [
              "Two publishers located; editorial independence and line-by-line comparison remain unverified.",
            ]
          : firstExperiment.includes(id)
            ? ["An independently edited second source is still required."]
            : []),
        ...(id === "hanuman-chalisa"
          ? [
              "Do not substitute the separately listed M.S. Ramarao Telugu adaptation.",
            ]
          : []),
      ],
    }),
);

const starterDetails = {
  lingashtakam: {
    introductionTe:
      "లింగాష్టకంలోని శివస్తుతిని తెలుగు లిపిలో చదువుతూ నేర్చుకునే కార్యక్రమం ఇది. ముందుగా పాఠభేదాలను పరిశీలించి, తరువాత ప్రతి శ్లోకానికి సరళమైన భావాన్ని విడిగా అందిస్తాము.",
    conceptEn:
      "Original contemplative illustration of a Shiva linga on its pedestal in a quiet stone sanctum, warm oil lamps, subtle bilva leaves, no letters or watermarks, wide composition with clear lower space for typeset lyrics. Review religious iconography before use.",
    thumbnailTe: "లింగాష్టకం",
    variantNote:
      "Vignanam marks alternatives in verses 1 and 8. Select one reading with a reviewer; do not silently combine variants. Simplified and shuddha Telugu are two renderings from the same publisher.",
    pronunciation: [
      "శివ, లింగం, ప్రణమామి వంటి పదాల్లో అక్షరాలు మింగకుండా పలకాలి.",
      "దీర్ఘాలు, సంయుక్తాక్షరాలు, పాదాంత విరామాలను పండితునితో పరిశీలించాలి.",
    ],
  },
  "mahalakshmi-ashtakam": {
    introductionTe:
      "మహాలక్ష్మీ అష్టకాన్ని తెలుగు లిపిలో చదువుతూ నేర్చుకునేందుకు ఈ కార్యక్రమాన్ని సిద్ధం చేస్తున్నాము. స్తోత్ర పఠనాన్ని, దాని తెలుగు భావ వివరణను వేర్వేరు భాగాలుగా అందిస్తాము.",
    conceptEn:
      "Original devotional illustration of Mahalakshmi seated on a lotus, calm expression, balanced traditional composition, warm rose and gold palette, no text or watermark, clear lower space for typeset lyrics. Have a knowledgeable reviewer approve attributes and hand positions.",
    thumbnailTe: "మహాలక్ష్మీ అష్టకం",
    variantNote:
      "Keep Indra uvacha, the numbered core and unnumbered phalasruti distinct. The Sanskrit Documents page also contains Lakshmi Stava; do not append that separate work automatically.",
    pronunciation: [
      "మహాలక్ష్మి అనే సంబోధనలో హ్రస్వ, దీర్ఘ భేదాలను ఎంచుకున్న పాఠం ప్రకారం పలకాలి.",
      "నమోఽస్తు వంటి సంధులను, శంఖచక్ర వంటి సంయుక్త పదాలను నిపుణునితో వినిపించి సరిచూడాలి.",
    ],
  },
};
export type StarterId = keyof typeof starterDetails;
export function starterPackage(id: string) {
  if (!Object.hasOwn(starterDetails, id))
    throw Error("No starter package for this work");
  const detail = starterDetails[id as StarterId];
  const work = devotionalBacklog.find((w) => w.id === id)!;
  // Eight provisional slots are a planning scaffold, never a verified count.
  const sections = [
    {
      id: `${id}:opening`,
      type: "invocation",
      original_text: null,
      meaning_te: null,
      review_status: "needs_verification",
    },
    {
      id: `${id}:dhyanam`,
      type: "dhyanam",
      original_text: null,
      meaning_te: null,
      review_status: "inclusion_needs_verification",
    },
    ...Array.from({ length: 8 }, (_, i) => ({
      id: `${id}:core:${String(i + 1).padStart(3, "0")}`,
      type: "core",
      original_text: null,
      meaning_te: null,
      review_status: "needs_verification",
    })),
    {
      id: `${id}:phalasruti`,
      type: "phalasruti",
      original_text: null,
      meaning_te: null,
      review_status: "needs_verification",
    },
  ];
  return {
    schema_version: 1,
    content_id: id,
    deity: work.deity,
    title_te: work.titleTe,
    title_en: work.titleEn,
    format: "chant",
    companion_format: "meaning",
    original_language: "Sanskrit",
    display_script: "Telugu",
    scope:
      "Provisional eight-slot core scaffold; optional sections and count require edition review.",
    sources: work.sources,
    edition: null,
    verification_status: "needs_verification",
    rights_status: "needs_verification",
    production_status: "blocked",
    publish_ready: false,
    verified_counts: work.verifiedCounts,
    sections,
    editorial_introduction_te: detail.introductionTe,
    pronunciation_notes: detail.pronunciation,
    variant_notes: [detail.variantNote],
    scenes: sections
      .filter((s) => s.type === "core")
      .map((s) => ({
        section_id: s.id,
        estimated_duration_seconds: null,
        image_prompt_en: detail.conceptEn,
        on_screen_text_te: null,
        review_status: "awaiting_text",
      })),
    audio_instructions:
      "Use an original cleared recording. Start promptly, keep natural recitation pace and no CTA during the hymn. AI pronunciation requires expert listening approval. No named-singer imitation.",
    metadata: {
      title_draft_te: `${work.titleTe} | తెలుగు లిపిలో పఠనం | Divine Wisdom Telugu`,
      description_draft_te: `${work.titleTe} పఠనాన్ని తెలుగు లిపిలో అనుసరించేందుకు రూపొందిస్తున్న వీడియో. ఎంచుకున్న పాఠం, మూలాల వివరాలు, పఠన సమీక్ష పూర్తయ్యాక తుది వివరణ అందిస్తాము.`,
      thumbnail_concept_en: detail.conceptEn,
      thumbnail_text_te: detail.thumbnailTe,
      source_credits: work.sources.map((s) => ({
        publisher: s.publisher,
        url: s.url,
        permission: "pending",
      })),
    },
    captions: {
      status: "not_created",
      files: [],
      timing_basis: "Requires actual reviewed recording",
    },
    render_manifest: {
      aspect: "16:9",
      width: 1920,
      height: 1080,
      font: "Noto Sans Telugu",
      safe_margin_percent: 10,
      timing_status: "unaligned",
      audio_asset: null,
      visual_assets: [],
      output_file: null,
    },
    quality_checks: [
      "Edition and independent comparison",
      "Text and asset reuse basis",
      "Verse order and count",
      "Telugu Unicode and shaping",
      "Expert pronunciation approval",
      "Caption sync with actual audio",
      "Safe areas and readable line breaks",
      "Audio clipping and levels",
      "Original explanations reviewed separately",
    ].map((check) => ({ check, status: "pending" })),
    unresolved_items: [
      "Select a production edition and document its reuse basis.",
      "Compare the complete text against an independently edited source.",
      "Fill and approve all included section texts; remove optional sections only after review.",
      "Author and review verse-by-verse Telugu meanings separately.",
      "Record new audio and obtain knowledgeable pronunciation approval.",
      "Render and review visuals, shaping, timing and audio before publishing.",
    ],
  };
}
export const devotionalResearchBundle = () => ({
  schemaVersion: 1,
  channelUrl: "https://www.youtube.com/@DivineWisdomTeluguOfficial",
  preparedOn: observedOn,
  brief: "Divine_Wisdom_Telugu_Codex_Content_Brief.md",
  works: devotionalBacklog,
  firstExperiment,
  packages: Object.keys(starterDetails).map(starterPackage),
  analytics: {
    status: "unavailable",
    windowsDays: [7, 28],
    impressions: null,
    ctr: null,
    retention: null,
    returningViewers: null,
  },
  publicComparables: [],
  researchLimits: [
    "No channel audit or refreshed comparable-video metrics completed.",
    "Vignanam work pages were available through search indexing; direct retrieval failed for several pages.",
    "Two publisher candidates located for each first-experiment work; editorial independence and line-by-line edition review remain pending. Two Vignanam references still point to the index.",
    "Unselected works retain unknown fields as null. No paid generation, account changes or uploading performed.",
  ],
});

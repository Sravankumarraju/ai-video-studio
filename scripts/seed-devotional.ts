// Creates the Bhagavad Gita, Lord Vishnu and Lord Shiva projects (if missing) with one starter
// video each, and writes every video's full prompt to data/productions/devotional/.
// Safe to re-run: existing projects and videos with the same title are reused.
import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { db } from "../lib/db";
import { createSeries, createVideo } from "../lib/series-store";
import { buildFullPrompt } from "../lib/series";
import { seriesSettingsSchema } from "../lib/series-schema";
import { projectSchema } from "../lib/schema";
import { json } from "../lib/projects";

const teluguVoice = "sJrRcQEpUbZehhGBdEbD"; // the Telugu voice used for Divine Wisdom Telugu
const plan = [
  {
    templateId: "bhagavad-gita" as const,
    video: {
      title: "భగవద్గీత 1.2–1.3 · దుర్యోధనుడు ద్రోణాచార్యుడి వద్దకు",
      formatId: "two-shlokas",
      episode: 2, // Episode 001 (1.1) predates projects
      inputs: {
        topic: "పాండవ సైన్యాన్ని చూసిన దుర్యోధనుడు గురువు ద్రోణాచార్యుడి వద్దకు వెళ్లి ద్రుపద కుమారుడు ఏర్పాటు చేసిన వ్యూహాన్ని చూపడం",
        description: "Episode 002 of the Divine Wisdom Telugu Gita series. Sanjaya begins his answer to Dhritarashtra: Duryodhana sees the Pandava army in formation, approaches Drona (1.2), and points out that it was arranged by Drona's own student, the son of Drupada (1.3).",
        references: "1.2, 1.3",
        sourceNotes: "Episode 001 covered 1.1 (Dhritarashtra's question to Sanjaya). Traditional commentators read Duryodhana's going first to Drona rather than to Bhishma as a sign of anxiety; label this as commentary.",
        instructions: "Modern example: a team leader who rushes to the manager about a rival team's strong preparation instead of improving his own work. Mark it as an illustration.",
      },
    },
  },
  {
    templateId: "vishnu" as const,
    video: {
      title: "గజేంద్ర మోక్షం · శరణాగతి కథ",
      formatId: "story",
      inputs: {
        topic: "మొసలి పట్టులో చిక్కిన గజేంద్రుడు శ్రీమహావిష్ణువును శరణు కోరడం, భగవంతుడు రక్షించడం",
        description: "The story of Gajendra Moksham: the elephant king's surrender to Lord Vishnu and the Lord's rescue.",
        references: "Srimad Bhagavatam, Canto 8, chapters 2–4 (Gajendra Moksham)",
        sourceNotes: "Follow the Srimad Bhagavatam account. Pothana's Telugu Bhagavatam retelling is well loved in Telugu homes; mention it as the Telugu tradition if quoted.",
        instructions: "Practical lesson: complete surrender when our own strength fails, without giving up effort. Label the modern example as an illustration.",
      },
    },
  },
  {
    templateId: "shiva" as const,
    video: {
      title: "శివ పంచాక్షర స్తోత్రం · శ్లోకాలు 1–2 అర్థం",
      formatId: "stotra",
      inputs: {
        topic: "నమః శివాయ పంచాక్షరి: 'న' మరియు 'మ' అక్షరాల శ్లోకాల అర్థం",
        description: "Meaning of the first two verses of the Shiva Panchakshara Stotram (the verses for the syllables Na and Ma).",
        references: "Shiva Panchakshara Stotram, verses 1–2 (traditionally attributed to Adi Shankaracharya)",
        sourceNotes: "Quote the two verses exactly in Telugu script. Attribution to Adi Shankaracharya is traditional; say so.",
        instructions: "Devotional takeaway: chanting the Panchakshari with understanding in daily worship.",
      },
    },
  },
];

async function main() {
  const out = path.resolve("data/productions/devotional");
  const summary: Record<string, unknown>[] = [];
  for (const item of plan) {
    let series = (await db.series.findMany()).find((s) => seriesSettingsSchema.parse(s.settings).templateId === item.templateId);
    if (!series) {
      series = await createSeries(item.templateId);
      const settings = seriesSettingsSchema.parse(series.settings);
      settings.defaults.voiceId = teluguVoice;
      settings.defaults.channelName = "Divine Wisdom Telugu";
      series = await db.series.update({ where: { id: series.id }, data: { settings: json(settings) } });
    }
    let video = await db.project.findFirst({ where: { seriesId: series.id, title: item.video.title } });
    if (!video) video = await createVideo(series.id, item.video);
    const doc = projectSchema.parse(video.document);
    const dir = path.join(out, item.templateId);
    await mkdir(dir, { recursive: true });
    const file = path.join(dir, `${item.video.formatId}-full-prompt.txt`);
    await writeFile(file, buildFullPrompt(doc));
    summary.push({ project: series.name, projectId: series.id, video: video.title, videoId: video.id, prompt: path.relative(process.cwd(), file) });
  }
  console.log(JSON.stringify(summary, null, 2));
  await db.$disconnect();
}
main().catch(async (e) => { console.error(e); await db.$disconnect(); process.exit(1); });

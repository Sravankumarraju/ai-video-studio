import { db } from "./db";
import { json, saveProject } from "./projects";
import { storage, storageKey } from "./storage";
import { projectSchema, type ProjectDoc } from "./schema";
import { seriesSettingsSchema, videoInputsSchema, videoOverridesSchema, type SeriesSettings } from "./series-schema";
import { seriesTemplates, createVideoDocument, applySeriesUpdates, validateGenerated, applyGenerated, suggestEpisodes } from "./series";

const settingsOf = (s: { settings: unknown }) => seriesSettingsSchema.parse(s.settings);
const libraryDoc = (name: string) => projectSchema.parse({ title: `${name} · media library`, category: "Devotional", language: "te", subtitleLanguage: "te" });

export async function listSeries() {
  return db.series.findMany({ orderBy: { updatedAt: "desc" } });
}

export async function createSeries(templateId: keyof typeof seriesTemplates, name?: string, settings?: unknown) {
  const base = settings ? seriesSettingsSchema.parse(settings) : structuredClone(seriesTemplates[templateId] || seriesTemplates.custom);
  if (name?.trim()) base.name = name.trim().slice(0, 200);
  return db.$transaction(async (tx) => {
    const library = await tx.project.create({ data: { title: libraryDoc(base.name).title, role: "library", document: json(libraryDoc(base.name)) } });
    return tx.series.create({ data: { name: base.name, settings: json(base), libraryProjectId: library.id } });
  });
}

export async function getSeries(id: string) {
  const series = await db.series.findUniqueOrThrow({ where: { id } });
  const media = series.libraryProjectId ? await db.asset.findMany({ where: { projectId: series.libraryProjectId }, orderBy: { createdAt: "desc" } }) : [];
  return { ...series, media };
}

// Optimistic concurrency like project saves. Existing videos keep their snapshot.
export async function updateSeries(id: string, settings: unknown, revision: number) {
  const parsed = seriesSettingsSchema.parse(settings);
  const series = await db.series.findUniqueOrThrow({ where: { id } });
  const media = new Set((series.libraryProjectId ? await db.asset.findMany({ where: { projectId: series.libraryProjectId }, select: { id: true } }) : []).map((a) => a.id));
  for (const ref of [parsed.defaults.logoAssetId, ...parsed.visual.characters.map((c) => c.referenceAssetId)])
    if (ref && !media.has(ref)) throw Error("Reference images and logos must be uploaded to this project's media");
  const changed = await db.series.updateMany({ where: { id, revision }, data: { name: parsed.name, settings: json(parsed), revision: { increment: 1 } } });
  if (!changed.count) throw Error("Project settings changed in another tab. Reload before saving.");
  if (series.libraryProjectId) await db.project.update({ where: { id: series.libraryProjectId }, data: { title: libraryDoc(parsed.name).title } });
  return db.series.findUniqueOrThrow({ where: { id } });
}

// Videos stay (unassigned); the hidden media library and its files go with the project.
export async function deleteSeries(id: string) {
  const series = await db.series.findUniqueOrThrow({ where: { id } });
  await db.series.delete({ where: { id } });
  if (series.libraryProjectId) await db.project.delete({ where: { id: series.libraryProjectId } });
  return { ok: true };
}

async function copyAsset(sourceId: string, projectId: string) {
  const existing = await db.asset.findFirst({ where: { projectId, metadata: { path: ["sourceAssetId"], equals: sourceId } } });
  if (existing) return existing.id;
  const a = await db.asset.findUniqueOrThrow({ where: { id: sourceId } });
  const key = storageKey(projectId, a.storageKey.split(".").at(-1)!);
  await storage.put(key, await storage.get(a.storageKey), a.mime);
  const copy = await db.asset.create({
    data: { projectId, name: a.name, kind: a.kind, mime: a.mime, storageKey: key, bytes: a.bytes, duration: a.duration, metadata: json({ ...(a.metadata as object), sourceAssetId: sourceId }) },
  });
  return copy.id;
}

// Each video owns copies of the project's reference images and logo, so its media stays separate.
async function localizeMedia(settings: SeriesSettings, projectId: string) {
  const s = structuredClone(settings);
  for (const c of s.visual.characters) if (c.referenceAssetId) c.referenceAssetId = await copyAsset(c.referenceAssetId, projectId);
  if (s.defaults.logoAssetId) s.defaults.logoAssetId = await copyAsset(s.defaults.logoAssetId, projectId);
  return s;
}

export async function duplicateSeries(id: string) {
  const series = await getSeries(id);
  const settings = settingsOf(series);
  const copy = await createSeries(settings.templateId, `${settings.name} (copy)`, settings);
  const remap: Record<string, string> = {};
  for (const a of series.media) remap[a.id] = await copyAsset(a.id, copy.libraryProjectId!);
  const next = structuredClone(settings);
  next.name = copy.name;
  for (const c of next.visual.characters) if (c.referenceAssetId) c.referenceAssetId = remap[c.referenceAssetId];
  if (next.defaults.logoAssetId) next.defaults.logoAssetId = remap[next.defaults.logoAssetId];
  return db.series.update({ where: { id: copy.id }, data: { settings: json(next) } });
}

// Highest episode number among the project's videos (0 when none are numbered).
export async function lastEpisode(seriesId: string) {
  const videos = await db.project.findMany({ where: { seriesId, role: "video" }, select: { document: true } });
  return videos.reduce((n, v) => Math.max(n, (v.document as { video?: { episode?: number } }).video?.episode ?? 0), 0);
}

type NewVideo = { title: string; formatId?: string; inputs?: unknown; overrides?: unknown; episode?: number };

export async function createVideo(seriesId: string, input: NewVideo) {
  const series = await db.series.findUniqueOrThrow({ where: { id: seriesId } });
  const settings = settingsOf(series);
  const title = String(input.title || "").trim().slice(0, 200);
  if (!title) throw Error("Give the video a title");
  const episode = input.episode ?? (await lastEpisode(seriesId)) + 1;
  const make = (s: SeriesSettings, inputs: unknown, formatId: string | undefined, overrides: unknown) => {
    const d = createVideoDocument({ id: series.id, revision: series.revision, settings: s }, title, videoInputsSchema.parse(inputs || {}), formatId, videoOverridesSchema.parse(overrides || {}));
    return { ...d, video: { ...d.video!, episode } };
  };
  const draft = make(settings, input.inputs, input.formatId, input.overrides);
  const project = await db.project.create({ data: { title, document: json(draft), seriesId: series.id } });
  const doc = make(await localizeMedia(settings, project.id), draft.video.inputs, draft.video.formatId, draft.video.overrides);
  return saveProject(project.id, doc, project.revision);
}

// Adds several episodes in order; numbering continues after the project's last episode.
export async function createVideos(seriesId: string, rows: NewVideo[]) {
  if (!rows.length || rows.length > 100) throw Error("Add between 1 and 100 episodes at a time");
  let next = (await lastEpisode(seriesId)) + 1;
  const created = [];
  for (const row of rows) {
    const video = await createVideo(seriesId, { ...row, episode: row.episode ?? next });
    next = Math.max(next, ((video.document as { video?: { episode?: number } }).video?.episode ?? next) + 1);
    created.push(video);
  }
  return created;
}

// Moves an existing video into (or out of) a project without rewriting its saved settings.
export async function assignVideo(projectId: string, seriesId: string | null) {
  const project = await db.project.findUniqueOrThrow({ where: { id: projectId } });
  if (project.role !== "video") throw Error("Only videos can be moved between projects");
  if (seriesId) await db.series.findUniqueOrThrow({ where: { id: seriesId } });
  return db.project.update({ where: { id: projectId }, data: { seriesId } });
}

export async function applyProjectUpdates(projectId: string) {
  const project = await db.project.findUniqueOrThrow({ where: { id: projectId } });
  const doc = projectSchema.parse(project.document);
  if (!doc.video || !project.seriesId) throw Error("This video was not created from a project template");
  const series = await db.series.findUniqueOrThrow({ where: { id: project.seriesId } });
  const settings = await localizeMedia(settingsOf(series), project.id);
  return saveProject(project.id, applySeriesUpdates(doc, { revision: series.revision, settings }), project.revision);
}

// Validates against the video's template; applies only when valid and asked to.
export async function importGenerated(projectId: string, raw: unknown, options: { apply?: boolean; replace?: boolean; revision?: number; review?: { sourcesChecked: boolean; versesChecked: boolean } }) {
  const project = await db.project.findUniqueOrThrow({ where: { id: projectId } });
  const doc: ProjectDoc = projectSchema.parse(project.document);
  const result = validateGenerated(raw, doc);
  if (!options.apply || !result.ok || !result.data) return { ...result, project: undefined };
  if (options.revision && options.revision !== project.revision) throw Error("Video changed in another tab. Reload before importing.");
  // Quoted scripture must be checked by the owner against the source before it is used.
  if (result.data.verses.length && !options.review?.versesChecked) throw Error("Confirm that you checked each verse against its source");
  if (!options.review?.sourcesChecked) throw Error("Confirm that you reviewed the sources and content labels");
  const saved = await saveProject(project.id, applyGenerated(doc, result.data, !!options.replace, { sourcesChecked: true, versesChecked: !!options.review?.versesChecked }), project.revision);
  return { ...result, project: saved };
}

export async function suggestNextEpisodes(seriesId: string, formatId: string | undefined, count: number) {
  const series = await db.series.findUniqueOrThrow({ where: { id: seriesId } });
  const settings = settingsOf(series);
  const videos = await db.project.findMany({ where: { seriesId, role: "video" }, select: { document: true } });
  // Continue after the furthest verse any video in this project already covers.
  const after = videos.map((v) => (v.document as { video?: { inputs?: { references?: string } } }).video?.inputs?.references || "").join(", ");
  return suggestEpisodes(settings, formatId || settings.defaultFormatId, after, Math.min(50, Math.max(1, count)), (await lastEpisode(seriesId)) + 1);
}

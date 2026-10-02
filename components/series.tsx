"use client";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  FileText,
  FolderOpen,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";
import { api, Button, Field, Modal, Empty } from "./ui";
import {
  buildFullPrompt,
  resolveVideo,
  statusHelp,
  videoStatus,
  videoStatuses,
  type GeneratedVideo,
  type Validation,
  type VideoStatus,
} from "@/lib/series";
import {
  contentTypeNames,
  contentTypes,
  sectionKinds,
  type SectionTemplate,
  type SeriesSettings,
  type VerseRule,
  type VideoFormat,
} from "@/lib/series-schema";
import type { ProjectDoc } from "@/lib/schema";

export type SeriesRow = { id: string; name: string; settings: SeriesSettings; revision: number; libraryProjectId: string | null; updatedAt: string };
type VideoRow = { id: string; title: string; document: ProjectDoc; revision: number; updatedAt: string; seriesId?: string | null };
type JobRow = { id: string; projectId: string; kind: string; state: string; result?: { draft?: boolean } };
type MediaRow = { id: string; name: string; kind: string };
type Run = (fn: () => Promise<void>) => Promise<void>;

const templateCards = [
  ["bhagavad-gita", "Bhagavad Gita", "Two shlokas per video: recitation, meaning, explanation, practical examples and what to follow."],
  ["vishnu", "Lord Vishnu", "Stories, teachings, avatars, selected verses and devotional explanations."],
  ["shiva", "Lord Shiva", "Stotras, stories, symbolism and practical lessons."],
  ["custom", "Custom", "Your own sources, structure, visual style and narration instructions."],
] as const;
const templateName = (id: string) => templateCards.find((t) => t[0] === id)?.[1] || "Custom";
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "section";

export function StatusChip({ status }: { status: VideoStatus }) {
  return (
    <span className={`status-chip s-${slugify(status)}`} title={statusHelp[status]}>
      {status}
    </span>
  );
}

export function statusOf(video: VideoRow, jobs: JobRow[]) {
  return videoStatus(video.document, jobs.filter((j) => j.projectId === video.id));
}

// Dashboard: one card per devotional project.
export function SeriesCards({ series, videos, jobs, onOpen, onCreate }: { series: SeriesRow[]; videos: VideoRow[]; jobs: JobRow[]; onOpen: (id: string) => void; onCreate: () => void }) {
  return (
    <div className="project-grid">
      {series.map((s) => {
        const own = videos.filter((v) => v.seriesId === s.id);
        const done = own.filter((v) => statusOf(v, jobs) === "Completed").length;
        return (
          <article className="project-card series-card" key={s.id}>
            <button className="project-cover" onClick={() => onOpen(s.id)}>
              <div className={`generated-cover series-cover t-${s.settings.templateId}`}>
                <FolderOpen size={34} />
                <span>{templateName(s.settings.templateId)}</span>
              </div>
              <span className="cover-language">Telugu</span>
            </button>
            <div className="project-info">
              <button className="project-title" onClick={() => onOpen(s.id)}>
                {s.name}
              </button>
              <p>{s.settings.description || s.settings.subject || "Devotional project"}</p>
              <div className="project-footer">
                <span className={`status ${own.length ? "ready" : ""}`}>
                  <span />
                  {own.length} video{own.length === 1 ? "" : "s"} · {done} completed
                </span>
              </div>
            </div>
          </article>
        );
      })}
      <button className="new-card" onClick={onCreate}>
        <div>
          <Plus size={24} />
        </div>
        <h3>New devotional project</h3>
        <p>Start from Bhagavad Gita, Lord Vishnu, Lord Shiva or a blank template.</p>
      </button>
    </div>
  );
}

export function NewSeriesModal({ onClose, run, created }: { onClose: () => void; run: Run; created: (s: SeriesRow) => void }) {
  const [templateId, setTemplateId] = useState<(typeof templateCards)[number][0]>("bhagavad-gita");
  const [name, setName] = useState("");
  return (
    <Modal title="New devotional project" onClose={onClose}>
      <p className="muted">Every video in this project inherits its settings. You can customise the template now or at any time later. Videos are produced in Telugu.</p>
      <div className="template-choices">
        {templateCards.map(([id, title, text]) => (
          <button key={id} className={`template-choice ${templateId === id ? "active" : ""}`} onClick={() => setTemplateId(id)}>
            {templateId === id && <Check size={14} />}
            <strong>{title}</strong>
            <span>{text}</span>
          </button>
        ))}
      </div>
      <Field label="Project name (optional)">
        <input value={name} placeholder={`${templateName(templateId)} · Telugu`} onChange={(e) => setName(e.target.value)} />
      </Field>
      <div className="modal-footer">
        <Button secondary onClick={onClose}>Cancel</Button>
        <Button onClick={() => void run(async () => created(await api<SeriesRow>("series", "POST", { templateId, name: name || undefined })))}>
          Create project
        </Button>
      </div>
    </Modal>
  );
}

function StructureEditor({ structure, onChange }: { structure: SectionTemplate[]; onChange: (s: SectionTemplate[]) => void }) {
  const set = (i: number, v: Partial<SectionTemplate>) => onChange(structure.map((s, n) => (n === i ? { ...s, ...v } : s)));
  const move = (i: number, d: number) => {
    const next = [...structure];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };
  return (
    <div className="structure-list">
      {structure.map((s, i) => (
        <div className="structure-row" key={`${s.id}-${i}`}>
          <span className="structure-index">{i + 1}</span>
          <div className="structure-fields">
            <div className="grid-three">
              <Field label="Section title">
                <input value={s.title} onChange={(e) => set(i, { title: e.target.value })} />
              </Field>
              <Field label="ID (used in the JSON)">
                <input value={s.id} onChange={(e) => set(i, { id: slugify(e.target.value) })} />
              </Field>
              <Field label="Kind">
                <select value={s.kind} onChange={(e) => set(i, { kind: e.target.value as SectionTemplate["kind"] })}>
                  {sectionKinds.map((k) => (
                    <option key={k}>{k}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="What this section should do">
              <textarea rows={2} value={s.purpose} onChange={(e) => set(i, { purpose: e.target.value })} />
            </Field>
            <label className="check">
              <input type="checkbox" checked={s.required} onChange={(e) => set(i, { required: e.target.checked })} /> Required
            </label>
          </div>
          <div className="structure-actions">
            <button className="icon" aria-label="Move up" disabled={!i} onClick={() => move(i, -1)}><ChevronUp size={15} /></button>
            <button className="icon" aria-label="Move down" disabled={i === structure.length - 1} onClick={() => move(i, 1)}><ChevronDown size={15} /></button>
            <button className="icon" aria-label="Remove section" disabled={structure.length === 1} onClick={() => onChange(structure.filter((_, n) => n !== i))}><Trash2 size={15} /></button>
          </div>
        </div>
      ))}
      <Button secondary onClick={() => onChange([...structure, { id: `section-${structure.length + 1}`, title: "New section", kind: "custom", purpose: "", required: true }])}>
        <Plus size={15} /> Add section
      </Button>
    </div>
  );
}

function VerseRuleEditor({ rule, onChange }: { rule: VerseRule; onChange: (r: VerseRule) => void }) {
  return (
    <div className="grid-three">
      <Field label="Verses">
        <select value={rule.mode} onChange={(e) => onChange({ ...rule, mode: e.target.value as VerseRule["mode"], exact: rule.exact || 2, max: rule.max || 3 })}>
          <option value="none">None</option>
          <option value="optional">Optional (up to a maximum)</option>
          <option value="exact">Exact count</option>
          <option value="range">Range</option>
        </select>
      </Field>
      {rule.mode === "exact" && (
        <Field label="Exactly">
          <input type="number" min={1} max={20} value={rule.exact || 1} onChange={(e) => onChange({ ...rule, exact: Number(e.target.value) })} />
        </Field>
      )}
      {rule.mode === "range" && (
        <Field label="Minimum">
          <input type="number" min={0} max={50} value={rule.min} onChange={(e) => onChange({ ...rule, min: Number(e.target.value) })} />
        </Field>
      )}
      {(rule.mode === "range" || rule.mode === "optional") && (
        <Field label="Maximum">
          <input type="number" min={1} max={50} value={rule.max} onChange={(e) => onChange({ ...rule, max: Number(e.target.value) })} />
        </Field>
      )}
      {rule.mode !== "none" && (
        <Field label="Verse word">
          <input value={rule.label} onChange={(e) => onChange({ ...rule, label: e.target.value })} />
        </Field>
      )}
    </div>
  );
}

export function SeriesSettingsEditor({ value, onChange }: { value: SeriesSettings; onChange: (s: SeriesSettings) => void }) {
  const [formatId, setFormatId] = useState(value.defaultFormatId);
  const format = value.formats.find((f) => f.id === formatId) || value.formats[0];
  const set = <K extends keyof SeriesSettings>(k: K, v: SeriesSettings[K]) => onChange({ ...value, [k]: v });
  const setFormat = (v: Partial<VideoFormat>) => onChange({ ...value, formats: value.formats.map((f) => (f.id === format.id ? { ...f, ...v } : f)) });
  const area = (label: string, v: string, on: (s: string) => void, rows = 3) => (
    <Field label={label}>
      <textarea rows={rows} value={v} onChange={(e) => on(e.target.value)} />
    </Field>
  );
  return (
    <div className="settings-stack">
      <section className="panel">
        <h2>Project</h2>
        <div className="grid-two">
          <Field label="Name"><input value={value.name} onChange={(e) => set("name", e.target.value)} /></Field>
          <Field label="Subject"><input value={value.subject} onChange={(e) => set("subject", e.target.value)} /></Field>
        </div>
        {area("Description", value.description, (v) => set("description", v), 2)}
        <Field label="Intended audience"><input value={value.audience} onChange={(e) => set("audience", e.target.value)} /></Field>
        <p className="muted">Language: Telugu (all videos in this phase).</p>
      </section>
      <section className="panel">
        <h2>Sources and accuracy</h2>
        {area("Source texts", value.sources.texts, (v) => set("sources", { ...value.sources, texts: v }))}
        {area("Reference preferences and accuracy rules", value.sources.preferences, (v) => set("sources", { ...value.sources, preferences: v }), 4)}
      </section>
      <section className="panel">
        <div className="section-heading">
          <h2>Video formats and structure</h2>
          <div className="row">
            <Button secondary onClick={() => {
              const id = `${format.id}-copy`.slice(0, 40);
              onChange({ ...value, formats: [...value.formats, { ...structuredClone(format), id, name: `${format.name} (copy)` }] });
              setFormatId(id);
            }}><Copy size={14} /> Duplicate format</Button>
            <Button secondary disabled={value.formats.length === 1} onClick={() => {
              const rest = value.formats.filter((f) => f.id !== format.id);
              onChange({ ...value, formats: rest, defaultFormatId: value.defaultFormatId === format.id ? rest[0].id : value.defaultFormatId });
              setFormatId(rest[0].id);
            }}><Trash2 size={14} /> Remove format</Button>
          </div>
        </div>
        <nav className="stage-nav compact">
          {value.formats.map((f) => (
            <button key={f.id} className={f.id === format.id ? "active" : ""} onClick={() => setFormatId(f.id)}>
              {f.name}{f.id === value.defaultFormatId ? " · default" : ""}
            </button>
          ))}
        </nav>
        <div className="grid-three">
          <Field label="Format name"><input value={format.name} onChange={(e) => setFormat({ name: e.target.value })} /></Field>
          <Field label="Content type">
            <select value={format.contentType} onChange={(e) => setFormat({ contentType: e.target.value as VideoFormat["contentType"] })}>
              {contentTypes.map((c) => <option key={c} value={c}>{contentTypeNames[c]}</option>)}
            </select>
          </Field>
          <label className="check field">
            <input type="checkbox" checked={value.defaultFormatId === format.id} onChange={() => set("defaultFormatId", format.id)} /> Default for new videos
          </label>
        </div>
        <VerseRuleEditor rule={format.verses} onChange={(verses) => setFormat({ verses })} />
        {area("Format instructions", format.instructions, (instructions) => setFormat({ instructions }), 2)}
        <h3>Section order</h3>
        <StructureEditor structure={format.structure} onChange={(structure) => setFormat({ structure })} />
      </section>
      <section className="panel">
        <h2>Telugu narration</h2>
        {area("Tone", value.narration.tone, (v) => set("narration", { ...value.narration, tone: v }), 2)}
        {area("Pronunciation guidance", value.narration.pronunciation, (v) => set("narration", { ...value.narration, pronunciation: v }))}
        {area("Narration instructions", value.narration.instructions, (v) => set("narration", { ...value.narration, instructions: v }), 2)}
      </section>
      <section className="panel">
        <h2>Visual style</h2>
        {area("Style", value.visual.style, (v) => set("visual", { ...value.visual, style: v }))}
        {area("Image prompt rules", value.visual.imageRules, (v) => set("visual", { ...value.visual, imageRules: v }), 4)}
        <h3>Character appearance</h3>
        {value.visual.characters.map((c, i) => (
          <div className="grid-two character-row" key={c.id}>
            <Field label="Name"><input value={c.name} onChange={(e) => set("visual", { ...value.visual, characters: value.visual.characters.map((x, n) => (n === i ? { ...x, name: e.target.value } : x)) })} /></Field>
            <div className="row-end">
              <Field label="Appearance (repeated in every image prompt)">
                <textarea rows={2} value={c.description} onChange={(e) => set("visual", { ...value.visual, characters: value.visual.characters.map((x, n) => (n === i ? { ...x, description: e.target.value } : x)) })} />
              </Field>
              <button className="icon" aria-label={`Remove ${c.name}`} onClick={() => set("visual", { ...value.visual, characters: value.visual.characters.filter((_, n) => n !== i) })}><Trash2 size={15} /></button>
            </div>
          </div>
        ))}
        <Button secondary onClick={() => set("visual", { ...value.visual, characters: [...value.visual.characters, { id: `character-${Date.now().toString(36)}`, name: "New character", description: "" }] })}>
          <Plus size={14} /> Add character
        </Button>
      </section>
      <section className="panel">
        <h2>Defaults and branding</h2>
        <div className="grid-three">
          <Field label="Default ElevenLabs voice ID"><input value={value.defaults.voiceId} onChange={(e) => set("defaults", { ...value.defaults, voiceId: e.target.value })} /></Field>
          <Field label="Aspect ratio">
            <select value={value.defaults.aspect} onChange={(e) => set("defaults", { ...value.defaults, aspect: e.target.value as "landscape" | "vertical" })}>
              <option value="landscape">16:9 · YouTube</option>
              <option value="vertical">9:16 · Shorts / Reels</option>
            </select>
          </Field>
          <Field label="Target duration, minutes (optional guide)">
            <input type="number" min={1} max={120} placeholder="No fixed length" value={value.defaults.targetDuration ? Math.round(value.defaults.targetDuration / 60) : ""} onChange={(e) => set("defaults", { ...value.defaults, targetDuration: e.target.value ? Number(e.target.value) * 60 : null })} />
          </Field>
          <Field label="Channel name"><input value={value.defaults.channelName} onChange={(e) => set("defaults", { ...value.defaults, channelName: e.target.value })} /></Field>
          <Field label="Opening title overlay"><input value={value.defaults.titleOverlay} onChange={(e) => set("defaults", { ...value.defaults, titleOverlay: e.target.value })} /></Field>
        </div>
      </section>
      <section className="panel">
        <h2>Intro, closing and call to action</h2>
        {area("Intro instructions", value.intro.instructions, (v) => set("intro", { instructions: v }), 2)}
        {area("Closing instructions", value.closing.instructions, (v) => set("closing", { instructions: v }), 2)}
        <label className="check">
          <input type="checkbox" checked={value.cta.enabled} onChange={(e) => set("cta", { ...value.cta, enabled: e.target.checked })} /> Include a call to action
        </label>
        {value.cta.enabled && area("Call-to-action instructions", value.cta.instructions, (v) => set("cta", { ...value.cta, instructions: v }), 2)}
      </section>
    </div>
  );
}

function NewVideoModal({ series, nextEpisode, onClose, run, created }: { series: SeriesRow; nextEpisode: number; onClose: () => void; run: Run; created: (v: VideoRow) => void }) {
  const s = series.settings;
  const [title, setTitle] = useState("");
  const [formatId, setFormatId] = useState(s.defaultFormatId);
  const [inputs, setInputs] = useState({ topic: "", description: "", references: "", sourceNotes: "", instructions: "" });
  const [minutes, setMinutes] = useState(s.defaults.targetDuration ? String(Math.round(s.defaults.targetDuration / 60)) : "");
  const [aspect, setAspect] = useState("");
  const [voiceId, setVoiceId] = useState("");
  const [custom, setCustom] = useState(false);
  const [episode, setEpisode] = useState(String(nextEpisode));
  const format = s.formats.find((f) => f.id === formatId)!;
  const [structure, setStructure] = useState<SectionTemplate[]>(format.structure);
  useEffect(() => setStructure(format.structure), [formatId]);
  const scripture = format.verses.mode === "exact" || format.verses.mode === "range";
  const field = (k: keyof typeof inputs, label: string, rows = 2, placeholder = "") => (
    <Field label={label}>
      <textarea rows={rows} placeholder={placeholder} value={inputs[k]} onChange={(e) => setInputs({ ...inputs, [k]: e.target.value })} />
    </Field>
  );
  return (
    <Modal title={`New episode · ${series.name}`} onClose={onClose}>
      <div className="grid-three">
        <Field label="Episode number">
          <input type="number" min={0} max={9999} value={episode} onChange={(e) => setEpisode(e.target.value)} />
        </Field>
        <Field label="Episode title"><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. కర్మయోగం · శ్లోకాలు 2.47–2.48" /></Field>
        <Field label="Format">
          <select value={formatId} onChange={(e) => setFormatId(e.target.value)}>
            {s.formats.map((f) => <option key={f.id} value={f.id}>{f.name} · {contentTypeNames[f.contentType]}</option>)}
          </select>
        </Field>
      </div>
      {field("topic", "Topic", 2)}
      {field("description", "Description", 2)}
      {field("references", scripture ? `${format.verses.label} references (required for accuracy, e.g. 2.47, 2.48)` : "Story, stotra or source reference (optional)", 1, scripture ? "2.47, 2.48" : "Srimad Bhagavatam, Canto 8 · Gajendra Moksham")}
      {field("sourceNotes", "Source notes", 2)}
      {field("instructions", "Extra instructions for this video", 2)}
      <div className="grid-three">
        <Field label="Target duration, minutes (optional)">
          <input type="number" min={1} max={120} placeholder="Narration decides" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
        </Field>
        <Field label="Aspect ratio">
          <select value={aspect} onChange={(e) => setAspect(e.target.value)}>
            <option value="">Project default ({s.defaults.aspect === "vertical" ? "9:16" : "16:9"})</option>
            <option value="landscape">16:9</option>
            <option value="vertical">9:16</option>
          </select>
        </Field>
        <Field label="Voice ID override (optional)"><input value={voiceId} placeholder={s.defaults.voiceId || "Project default"} onChange={(e) => setVoiceId(e.target.value)} /></Field>
      </div>
      <label className="check">
        <input type="checkbox" checked={custom} onChange={(e) => setCustom(e.target.checked)} /> Customise the section order for this video only
      </label>
      {custom && <StructureEditor structure={structure} onChange={setStructure} />}
      <div className="modal-footer">
        <Button secondary onClick={onClose}>Cancel</Button>
        <Button
          disabled={!title.trim() || (scripture && !inputs.references.trim())}
          onClick={() =>
            void run(async () =>
              created(
                await api<VideoRow>(`series/${series.id}/videos`, "POST", {
                  title,
                  formatId,
                  ...(episode !== "" ? { episode: Number(episode) } : {}),
                  inputs: { ...inputs, targetDuration: minutes ? Number(minutes) * 60 : null },
                  overrides: { ...(aspect ? { aspect } : {}), ...(voiceId ? { voiceId } : {}), ...(custom ? { structure } : {}) },
                }),
              ),
            )
          }
        >
          Create video
        </Button>
      </div>
    </Modal>
  );
}

type EpisodeRow = { title: string; references: string; topic: string; verses?: VerseRule };
const episodeOf = (v: VideoRow) => v.document.video?.episode;
const epLabel = (n?: number) => (n === undefined ? "–" : String(n).padStart(3, "0"));

// Several episodes at once: paste one per line, or let a chaptered scripture suggest the next ones.
function AddEpisodesModal({ series, onClose, run, created }: { series: SeriesRow; onClose: () => void; run: Run; created: () => void }) {
  const s = series.settings;
  const [formatId, setFormatId] = useState(s.defaultFormatId);
  const [rows, setRows] = useState<EpisodeRow[]>([]);
  const [paste, setPaste] = useState("");
  const [count, setCount] = useState(5);
  const format = s.formats.find((f) => f.id === formatId)!;
  const set = (i: number, v: Partial<EpisodeRow>) => setRows(rows.map((r, n) => (n === i ? { ...r, ...v } : r)));
  const addPasted = () => {
    const parsed = paste
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const [title = "", references = "", topic = ""] = l.split("|").map((x) => x.trim());
        return { title, references, topic };
      });
    setRows([...rows, ...parsed]);
    setPaste("");
  };
  const needsRefs = format.verses.mode === "exact" || format.verses.mode === "range";
  return (
    <Modal title={`Add episodes · ${series.name}`} onClose={onClose}>
      <p className="muted">Each episode becomes its own video, numbered after the project's last episode. It inherits this project's settings; you import its script later.</p>
      <div className="grid-two">
        <Field label="Format">
          <select value={formatId} onChange={(e) => setFormatId(e.target.value)}>
            {s.formats.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </Field>
        {!!s.sources.chapterVerses.length && (
          <div className="row-end">
            <Field label="Suggest next episodes (how many)">
              <input type="number" min={1} max={50} value={count} onChange={(e) => setCount(Number(e.target.value))} />
            </Field>
            <Button
              secondary
              onClick={() =>
                void run(async () => {
                  const plan = await api<(EpisodeRow & { episode: number })[]>(`series/${series.id}/videos/suggest?formatId=${formatId}&count=${count}`);
                  setRows([...rows, ...plan.map((p) => ({ title: p.title, references: p.references, topic: "", verses: p.verses }))]);
                })
              }
            >
              Suggest
            </Button>
          </div>
        )}
      </div>
      <Field label="Paste episodes, one per line: Title | references | topic">
        <textarea rows={4} value={paste} placeholder="అధ్యాయం 1 · శ్లోకాలు 1.4–1.5 | 1.4, 1.5 | పాండవ సైన్య వీరులు" onChange={(e) => setPaste(e.target.value)} />
      </Field>
      <Button secondary disabled={!paste.trim()} onClick={addPasted}><Plus size={14} /> Add to list</Button>
      {!!rows.length && (
        <table className="video-table">
          <thead><tr><th>#</th><th>Title</th><th>References</th><th>Topic</th><th /></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td><input value={r.title} onChange={(e) => set(i, { title: e.target.value })} /></td>
                <td>
                  <input value={r.references} onChange={(e) => set(i, { references: e.target.value })} />
                  {r.verses && <small className="muted"> {r.verses.exact} verse(s): end of chapter</small>}
                </td>
                <td><input value={r.topic} onChange={(e) => set(i, { topic: e.target.value })} /></td>
                <td><button className="icon" aria-label="Remove episode" onClick={() => setRows(rows.filter((_, n) => n !== i))}><Trash2 size={14} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="modal-footer">
        <Button secondary onClick={onClose}>Cancel</Button>
        <Button
          disabled={!rows.length || rows.some((r) => !r.title.trim() || (needsRefs && !r.references.trim()))}
          onClick={() =>
            void run(async () => {
              await api(`series/${series.id}/videos/bulk`, "POST", {
                episodes: rows.map((r) => ({ title: r.title, formatId, inputs: { references: r.references, topic: r.topic }, overrides: r.verses ? { verses: r.verses } : {} })),
              });
              created();
            })
          }
        >
          Create {rows.length} episode{rows.length === 1 ? "" : "s"}
        </Button>
      </div>
    </Modal>
  );
}

// A devotional project: its videos, its editable settings and its reference media.
export function SeriesPage({ id, videos, jobs, run, back, openVideo, refresh, notify }: { id: string; videos: VideoRow[]; jobs: JobRow[]; run: Run; back: () => void; openVideo: (v: VideoRow) => void; refresh: () => Promise<void>; notify: (s: string) => void }) {
  const [series, setSeries] = useState<(SeriesRow & { media: MediaRow[] }) | null>(null);
  const [draft, setDraft] = useState<SeriesSettings | null>(null);
  const [tab, setTab] = useState("Videos");
  const [newVideo, setNewVideo] = useState(false);
  const [addEpisodes, setAddEpisodes] = useState(false);
  const [moveId, setMoveId] = useState("");
  async function load() {
    const s = await api<SeriesRow & { media: MediaRow[] }>(`series/${id}`);
    setSeries(s);
    setDraft(structuredClone(s.settings));
  }
  useEffect(() => void run(load), [id]);
  if (!series || !draft) return <main className="content"><Empty title="Loading project">One moment…</Empty></main>;
  const own = videos
    .filter((v) => v.seriesId === id)
    .sort((a, b) => (episodeOf(a) ?? 1e9) - (episodeOf(b) ?? 1e9) || a.updatedAt.localeCompare(b.updatedAt));
  const unassigned = videos.filter((v) => !v.seriesId);
  const dirty = JSON.stringify(draft) !== JSON.stringify(series.settings);
  const save = () => run(async () => {
    await api(`series/${id}`, "PATCH", { settings: draft, revision: series.revision });
    await load();
    await refresh();
    notify("Project settings saved. New videos use them; existing videos keep theirs until you apply updates.");
  });
  const counts = Object.fromEntries(videoStatuses.map((st) => [st, own.filter((v) => statusOf(v, jobs) === st).length]));
  return (
    <main className="content">
      <div className="project-heading">
        <div>
          <button className="back-link" onClick={back}><ArrowLeft size={14} /> Dashboard</button>
          <h1>{series.name}</h1>
          <p>{templateName(series.settings.templateId)} template · Telugu · {own.length} video{own.length === 1 ? "" : "s"}</p>
        </div>
        <div className="row">
          {dirty && <Button onClick={() => void save()}><Check size={15} /> Save settings</Button>}
          <Button secondary onClick={() => void run(async () => { const c = await api<SeriesRow>(`series/${id}/duplicate`, "POST"); await refresh(); notify(`Created "${c.name}" with the same settings and media; videos are not copied.`); })}>
            <Copy size={15} /> Duplicate project
          </Button>
          <Button secondary onClick={() => { if (confirm(`Delete "${series.name}"? Its videos are kept as unassigned videos; its reference media is deleted.`)) void run(async () => { await api(`series/${id}`, "DELETE"); await refresh(); back(); }); }}>
            <Trash2 size={15} /> Delete
          </Button>
          <Button secondary onClick={() => setAddEpisodes(true)}><Plus size={15} /> Add episodes</Button>
          <Button onClick={() => setNewVideo(true)}><Plus size={15} /> New episode</Button>
        </div>
      </div>
      <nav className="stage-nav">
        {["Videos", "Settings & template", "Media & references"].map((t) => (
          <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>{t}</button>
        ))}
      </nav>
      {tab === "Videos" ? (
        <section className="panel">
          <div className="status-summary">
            {videoStatuses.map((st) => <span key={st}><StatusChip status={st} /> {counts[st]}</span>)}
          </div>
          {own.length ? (
            <table className="video-table">
              <thead><tr><th>Ep</th><th>Title</th><th>Format</th><th>Status</th><th>Updated</th><th /></tr></thead>
              <tbody>
                {own.map((v) => {
                  const st = statusOf(v, jobs), meta = v.document.video;
                  const format = meta ? resolveVideo(meta).format.name : "Legacy video";
                  return (
                    <tr key={v.id}>
                      <td className="episode-no">{epLabel(episodeOf(v))}</td>
                      <td><button className="link" onClick={() => openVideo(v)}>{v.title}</button>{meta && meta.settingsRevision < series.revision && <small className="muted"> · project settings changed since creation</small>}</td>
                      <td>{format}</td>
                      <td><StatusChip status={st} /><small className="muted"> {statusHelp[st]}</small></td>
                      <td>{new Date(v.updatedAt).toLocaleDateString()}</td>
                      <td className="row">
                        <Button secondary onClick={() => openVideo(v)}>Open</Button>
                        <button className="icon" title="Duplicate video draft" aria-label={`Duplicate ${v.title}`} onClick={() => void run(async () => { await api(`projects/${v.id}/duplicate`, "POST", {}); await refresh(); notify("Video duplicated in this project"); })}><Copy size={14} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <Empty title="No videos yet">Create a video. It inherits this project's structure, sources, narration and visual settings.</Empty>
          )}
          {!!unassigned.length && (
            <div className="row move-row">
              <select value={moveId} onChange={(e) => setMoveId(e.target.value)} aria-label="Existing video to move">
                <option value="">Move an existing unassigned video here…</option>
                {unassigned.map((v) => <option key={v.id} value={v.id}>{v.title}</option>)}
              </select>
              <Button secondary disabled={!moveId} onClick={() => void run(async () => { await api(`projects/${moveId}/series`, "POST", { seriesId: id }); setMoveId(""); await refresh(); notify("Video moved. Its saved settings are unchanged."); })}>Move</Button>
            </div>
          )}
        </section>
      ) : tab === "Settings & template" ? (
        <>
          <p className="muted">Changes apply to new videos. Existing videos keep their saved settings until you choose "Apply project updates" inside a video.</p>
          <SeriesSettingsEditor value={draft} onChange={setDraft} />
          {dirty && <div className="sticky-save"><Button onClick={() => void save()}><Check size={15} /> Save settings</Button><Button secondary onClick={() => setDraft(structuredClone(series.settings))}>Discard changes</Button></div>}
        </>
      ) : (
        <section className="panel">
          <div className="section-heading">
            <div><h2>Reference images and logo</h2><p className="muted">Kept with this project. Each new video receives its own copy.</p></div>
            <label className="btn secondary">
              <Upload size={15} /> Upload
              <input type="file" accept="image/*" hidden onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f || !series.libraryProjectId) return;
                const form = new FormData();
                form.set("file", f);
                form.set("projectId", series.libraryProjectId);
                void run(async () => { await api("assets", "POST", form); await load(); });
              }} />
            </label>
          </div>
          <div className="media-grid">
            {series.media.map((m) => (
              <figure key={m.id}>
                {m.kind === "image" ? <img src={`/api/assets/${m.id}`} alt={m.name} /> : <FileText size={28} />}
                <figcaption>{m.name}</figcaption>
              </figure>
            ))}
            {!series.media.length && <p className="muted">No reference media yet.</p>}
          </div>
          <h3>Assign</h3>
          {draft.visual.characters.map((c, i) => (
            <Field key={c.id} label={`${c.name} · appearance reference`}>
              <select value={c.referenceAssetId || ""} onChange={(e) => setDraft({ ...draft, visual: { ...draft.visual, characters: draft.visual.characters.map((x, n) => (n === i ? { ...x, referenceAssetId: e.target.value || undefined } : x)) } })}>
                <option value="">None</option>
                {series.media.filter((m) => m.kind === "image").map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </Field>
          ))}
          <Field label="Channel logo (overlay)">
            <select value={draft.defaults.logoAssetId || ""} onChange={(e) => setDraft({ ...draft, defaults: { ...draft.defaults, logoAssetId: e.target.value || undefined } })}>
              <option value="">None</option>
              {series.media.filter((m) => m.kind === "image").map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </Field>
          {dirty && <Button onClick={() => void save()}><Check size={15} /> Save assignments</Button>}
        </section>
      )}
      {addEpisodes && (
        <AddEpisodesModal series={series} onClose={() => setAddEpisodes(false)} run={run} created={() => { setAddEpisodes(false); void run(async () => { await refresh(); notify("Episodes created. Open one to copy its full prompt."); }); }} />
      )}
      {newVideo && (
        <NewVideoModal series={series} nextEpisode={own.reduce((n, v) => Math.max(n, episodeOf(v) ?? 0), 0) + 1} onClose={() => setNewVideo(false)} run={run} created={(v) => { setNewVideo(false); void run(async () => { await refresh(); openVideo(v); }); }} />
      )}
    </main>
  );
}

// First stage of a project video: inherited settings, the full prompt, and validated import.
export function PlanStage({ project, doc, run, save, reload, patch, goTo, copy, notify, seriesRevision }: {
  project: { id: string; revision: number };
  doc: ProjectDoc;
  run: Run;
  save: () => Promise<void>;
  reload: () => Promise<void>;
  patch: (p: Partial<ProjectDoc>) => void;
  goTo: (stage: string) => void;
  copy: (s: string) => Promise<void>;
  notify: (s: string) => void;
  seriesRevision?: number;
}) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<Validation | null>(null);
  const [checks, setChecks] = useState({ versesChecked: false, sourcesChecked: false });
  const [showPrompt, setShowPrompt] = useState(false);
  if (!doc.video) return <Empty title="Not a project video">This video was created before devotional projects. Use the Script stage.</Empty>;
  const meta = doc.video, r = resolveVideo(meta), prompt = buildFullPrompt(doc);
  const setInputs = (v: Partial<typeof meta.inputs>) => patch({ video: { ...meta, inputs: { ...meta.inputs, ...v } } });
  const hasMedia = doc.scenes.some((s) => s.assetId || s.audioId);
  const data = result?.data as GeneratedVideo | undefined;
  const validate = () => run(async () => {
    await save();
    setResult(await api<Validation>(`projects/${project.id}/import-generated`, "POST", { json: text }));
  });
  const apply = () => run(async () => {
    if (hasMedia && !confirm("Replace the current scene plan? Uploaded images and voice stay in Assets but are unassigned from scenes.")) return;
    await save();
    await api(`projects/${project.id}/import-generated`, "POST", { json: text, apply: true, replace: hasMedia, review: checks });
    await reload();
    notify("Script imported. Upload an image for each scene next.");
    goTo("Assets");
  });
  return (
    <div className="plan-stage">
      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Video details</h2>
            <p className="muted">{r.settings.name} · {r.format.name} ({contentTypeNames[r.format.contentType]}) · {r.aspect === "vertical" ? "9:16" : "16:9"} · {r.targetDuration ? `about ${Math.round(r.targetDuration / 60)} min (guide)` : "narration decides the length"}</p>
          </div>
          {seriesRevision !== undefined && meta.settingsRevision < seriesRevision && (
            <Button secondary onClick={() => void run(async () => { await save(); await api(`projects/${project.id}/apply-series`, "POST"); await reload(); notify("Project updates applied to this video"); })}>
              <RefreshCw size={14} /> Apply project updates
            </Button>
          )}
        </div>
        {seriesRevision !== undefined && meta.settingsRevision < seriesRevision && <p className="warning">The project's settings changed after this video was created. This video keeps its saved settings until you apply the updates.</p>}
        <div className="grid-two">
          <Field label="Episode number"><input type="number" min={0} max={9999} value={meta.episode ?? ""} onChange={(e) => patch({ video: { ...meta, episode: e.target.value === "" ? undefined : Number(e.target.value) } })} /></Field>
          <Field label="Episode title"><input value={doc.title} onChange={(e) => patch({ title: e.target.value })} /></Field>
          <Field label="Topic"><textarea rows={2} value={meta.inputs.topic} onChange={(e) => setInputs({ topic: e.target.value })} /></Field>
          <Field label="Description"><textarea rows={2} value={meta.inputs.description} onChange={(e) => setInputs({ description: e.target.value })} /></Field>
          <Field label="References (verses, story or stotra)"><textarea rows={2} value={meta.inputs.references} onChange={(e) => setInputs({ references: e.target.value })} /></Field>
          <Field label="Source notes"><textarea rows={2} value={meta.inputs.sourceNotes} onChange={(e) => setInputs({ sourceNotes: e.target.value })} /></Field>
        </div>
        <Field label="Extra instructions"><textarea rows={2} value={meta.inputs.instructions} onChange={(e) => setInputs({ instructions: e.target.value })} /></Field>
        <p className="muted">Structure: {r.structure.map((s) => s.title.split(" · ").at(-1)).join(" → ")} · Verses: {r.verses.mode === "exact" ? `exactly ${r.verses.exact}` : r.verses.mode === "range" ? `${r.verses.min}–${r.verses.max}` : r.verses.mode === "optional" ? `optional, up to ${r.verses.max}` : "none"}</p>
      </section>
      <section className="panel">
        <div className="section-heading">
          <div><h2>1 · Copy Full Prompt JSON</h2><p className="muted">Paste it into ChatGPT, Gemini, Claude or another AI tool. It returns the Telugu script, metadata, scene plan and image prompts as JSON.</p></div>
          <div className="row">
            <Button onClick={() => void run(async () => { await save(); await copy(prompt); })}><Copy size={15} /> Copy full prompt</Button>
            <Button secondary onClick={() => { const u = URL.createObjectURL(new Blob([prompt], { type: "text/plain" })); const a = document.createElement("a"); a.href = u; a.download = `${slugify(doc.title)}-prompt.txt`; a.click(); setTimeout(() => URL.revokeObjectURL(u), 1000); }}><Download size={15} /> Download</Button>
            <Button secondary onClick={() => setShowPrompt(!showPrompt)}>{showPrompt ? "Hide" : "Preview"}</Button>
          </div>
        </div>
        {showPrompt && <textarea className="prompt-box" readOnly rows={18} value={prompt} />}
      </section>
      <section className="panel">
        <div className="section-heading">
          <div><h2>2 · Import Generated JSON</h2><p className="muted">Paste the AI's JSON answer, or choose the file. It is checked against this video's template before anything changes.</p></div>
          <label className="btn secondary">
            <Upload size={15} /> Choose file
            <input type="file" accept=".json,.txt,application/json,text/plain" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void f.text().then((t) => { setText(t); setResult(null); }); }} />
          </label>
        </div>
        <textarea className="prompt-box" rows={10} value={text} placeholder='{ "title": "…", "sections": [ … ] }' onChange={(e) => { setText(e.target.value); setResult(null); }} />
        <Button disabled={!text.trim()} onClick={() => void validate()}><Check size={15} /> Validate</Button>
      </section>
      {result && (
        <section className="panel">
          <h2>3 · Review</h2>
          {result.errors.length > 0 && <div className="error-list">{result.errors.map((e) => <p key={e}>✕ {e}</p>)}</div>}
          {result.warnings.length > 0 && <div className="warning">{result.warnings.map((w) => <p key={w}>⚠ {w}</p>)}</div>}
          {data && (
            <>
              <p><strong>{data.title}</strong>{result.estimatedSeconds ? ` · estimated ${Math.floor(result.estimatedSeconds / 60)}:${String(Math.round(result.estimatedSeconds % 60)).padStart(2, "0")} of narration` : ""}</p>
              {data.versionNote && <p className="muted">Version followed: {data.versionNote}</p>}
              {!!data.sources.length && <div className="source-list">{data.sources.map((s, i) => <p key={i}><span className={`kind-badge k-${s.type}`}>{s.type}</span> {s.reference}{s.note ? ` · ${s.note}` : ""}</p>)}</div>}
              {!!data.verses.length && (
                <table className="video-table">
                  <thead><tr><th>Reference</th><th>Verse</th><th>Meaning</th></tr></thead>
                  <tbody>{data.verses.map((v) => <tr key={v.reference}><td>{v.reference}</td><td className="verse">{v.original}</td><td>{v.meaning}</td></tr>)}</tbody>
                </table>
              )}
              <table className="video-table">
                <thead><tr><th>Section</th><th>Content</th><th>Scenes</th><th>Opening narration</th></tr></thead>
                <tbody>{data.sections.map((s) => <tr key={s.id}><td>{s.title || s.id}</td><td><span className={`kind-badge k-${s.contentKind}`}>{s.contentKind}</span></td><td>{s.scenes.length}</td><td>{s.scenes[0]?.narration.slice(0, 140)}</td></tr>)}</tbody>
              </table>
              {result.ok && (
                <div className="check-list">
                  {!!data.verses.length && <label className="check"><input type="checkbox" checked={checks.versesChecked} onChange={(e) => setChecks({ ...checks, versesChecked: e.target.checked })} /> I checked every verse's text and reference against the source.</label>}
                  <label className="check"><input type="checkbox" checked={checks.sourcesChecked} onChange={(e) => setChecks({ ...checks, sourcesChecked: e.target.checked })} /> I reviewed the sources and the scripture / commentary / story / illustration labels.</label>
                  <Button disabled={!checks.sourcesChecked || (!!data.verses.length && !checks.versesChecked)} onClick={() => void apply()}>
                    <Check size={15} /> {hasMedia ? "Replace scene plan" : "Use this script"}
                  </Button>
                </div>
              )}
            </>
          )}
        </section>
      )}
      <section className="panel workflow-hint">
        <p>Next: <strong>Assets</strong> (upload an image for each scene) → <strong>Voice & captions</strong> (generate Telugu voice) → <strong>Preview & exports</strong> (draft preview, full render, download).</p>
      </section>
    </div>
  );
}

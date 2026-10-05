"use client";
import { McpSettings } from "./mcp-settings";
import { YoutubeSettings, YoutubeUploadControls } from "./youtube-settings";
import { isExportForVariant } from "@/lib/export-visibility";
import { api, Button, Field, Empty, Modal } from "./ui";
import { SeriesCards, NewSeriesModal, SeriesPage, PlanStage, StatusChip, statusOf, type SeriesRow } from "./series";
import { useEffect, useRef, useState } from "react";
import {
  Film,
  LayoutDashboard,
  Plus,
  Settings,
  FolderOpen,
  Clapperboard,
  FileText,
  Layers,
  AudioLines,
  PanelTop,
  Download,
  ChevronRight,
  ArrowLeft,
  Search,
  MoreHorizontal,
  Play,
  Copy,
  Upload,
  Trash2,
  Lock,
  Unlock,
  RefreshCw,
  Sparkles,
  Check,
  Clock,
  Activity,
  BookOpen,
  LogOut,
  Menu,
  Undo2,
  Redo2,
  GripVertical,
  X,
  Image as ImageIcon,
} from "lucide-react";
import {
  projectSchema,
  newScene,
  sceneSchema,
  variantSchema,
  providerSchema,
  type ProjectDoc,
  type Scene,
  type Variant,
  type ProviderConfig,
  type Capability,
} from "@/lib/schema";
import {
  approximateCaptions,
  duration,
  timeline,
  warnings,
  motionState,
} from "@/lib/timeline";
import { expandPrompt, templates } from "@/lib/prompts";
import { layoutCaptions } from "@/lib/caption-layout";
import { reconcileVariantScenes, createVideoVersion } from "@/lib/project-edit";
import { landscapeShotVersion, addCallToAction, visualPromptPack } from "@/lib/production-workflow";
import {
  durationPresets,
  durationPlan,
  targetDuration,
  durationSummary,
} from "@/lib/duration";
type Asset = {
  id: string;
  name: string;
  kind: string;
  mime: string;
  bytes: number;
  duration: number | null;
  metadata: unknown;
};
type Project = {
  id: string;
  title: string;
  document: ProjectDoc;
  revision: number;
  updatedAt: string;
  seriesId?: string | null;
  assets?: Asset[];
};
type Profile = {
  id: string;
  config: ProviderConfig;
  verification: Record<string, unknown>;
  key: string;
};
type Job = {
  id: string;
  projectId: string;
  kind: string;
  state: string;
  stage: string;
  error?: string;
  providerJobId?: string;
  estimatedCost?: number;
  actualCost?: number;
  result?: {
    variantId?: string;
    assetId?: string;
    text?: string;
    duration?: number;
    width?: number;
    height?: number;
    bytes?: number;
    draft?: boolean;
  };
};
type Template = {
  id: string;
  name: string;
  stage: string;
  body: string;
  version: number;
  history: { version: number; body: string; name: string }[];
};
const stages = [
  "Script",
  "Storyboard",
  "Prompts",
  "Assets",
  "Voice & captions",
  "Timeline",
  "Preview & exports",
  "Publishing",
];
const capabilities: Capability[] = [
  "script",
  "image",
  "video",
  "voice",
  "transcription",
];
const languageNames = { en: "English", te: "Telugu", hi: "Hindi" };
const isFullExport = (j: Job) =>
  j.kind === "render" &&
  ["completed", "stale"].includes(j.state) &&
  !j.result?.draft;
const fmt = (n: number) =>
  `${Math.floor(n / 60)}:${String(Math.round(n) % 60).padStart(2, "0")}`;
function Visual({ asset, scene }: { asset?: Asset; scene?: Scene }) {
  return (
    <div className={`visual ${asset ? "" : "placeholder"}`}>
      {asset?.kind === "image" ? (
        <img
          src={`/api/assets/${asset.id}`}
          alt={scene?.visual || asset.name}
          style={{
            objectPosition: `${(scene?.focalX ?? 0.5) * 100}% ${(scene?.focalY ?? 0.5) * 100}%`,
          }}
        />
      ) : asset?.kind === "video" ? (
        <video
          src={`/api/assets/${asset.id}`}
          muted
          preload="metadata"
          style={{
            objectPosition: `${(scene?.focalX ?? 0.5) * 100}% ${(scene?.focalY ?? 0.5) * 100}%`,
          }}
        />
      ) : (
        <>
          <ImageIcon size={26} />
          <span>
            {scene ? "Add scene media" : "Your next story starts here"}
          </span>
        </>
      )}
    </div>
  );
}
export default function Studio() {
  const [auth, setAuth] = useState<boolean | null>(null),
    [password, setPassword] = useState(""),
    [view, setView] = useState("Dashboard"),
    [stage, setStage] = useState("Script");
  const [projects, setProjects] = useState<Project[]>([]),
    [project, setProject] = useState<Project | null>(null),
    [doc, setDoc] = useState<ProjectDoc | null>(null),
    [assets, setAssets] = useState<Asset[]>([]),
    [profiles, setProfiles] = useState<Profile[]>([]),
    [defaults, setDefaults] = useState<Record<string, string>>({}),
    [jobs, setJobs] = useState<Job[]>([]),
    [savedTemplates, setSavedTemplates] = useState<Template[]>([]);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false),
    [newOpen, setNewOpen] = useState(false),
    [selected, setSelected] = useState(""),
    [variantId, setVariantId] = useState(""),
    [search, setSearch] = useState(""),
    [mobile, setMobile] = useState(false),
    [setupOpen, setSetupOpen] = useState(false),
    [seriesList, setSeriesList] = useState<SeriesRow[]>([]),
    [seriesId, setSeriesId] = useState(""),
    [newSeriesOpen, setNewSeriesOpen] = useState(false);
  const history = useRef<ProjectDoc[]>([]),
    future = useRef<ProjectDoc[]>([]),
    saving = useRef<Promise<void> | null>(null),
    current = useRef(doc),
    projectRef = useRef(project);
  current.current = doc;
  projectRef.current = project;
  useEffect(() => {
    if (project && view === "Project") localStorage.setItem(`studio-position-${project.id}`, JSON.stringify({ stage, variantId, selected }));
  }, [project?.id, view, stage, variantId, selected]);
  async function run(fn: () => Promise<void>) {
    setError("");
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Operation failed");
    } finally {
      setBusy(false);
    }
  }
  async function refresh() {
    const [p, pr, d, j, t, sr] = await Promise.all([
      api<Project[]>("projects"),
      api<Profile[]>("providers"),
      api<Record<string, string>>("defaults"),
      api<Job[]>("jobs"),
      api<{ saved: Template[] }>("templates"),
      api<SeriesRow[]>("series"),
    ]);
    setSeriesList(sr);
    setProjects(p);
    setProfiles(pr);
    setDefaults(d);
    setJobs(j);
    setSavedTemplates(t.saved);
  }
  useEffect(() => {
    void api("session")
      .then(() => {
        setAuth(true);
        void run(refresh);
      })
      .catch(() => setAuth(false));
  }, []);
  useEffect(() => {
    if (!auth) return;
    const t = setInterval(() => {
      void api<Job[]>("jobs")
        .then(setJobs)
        .catch(() => {});
    }, 4000);
    return () => clearInterval(t);
  }, [auth]);
  useEffect(() => {
    if (!dirty || !project || !doc) return;
    const t = setTimeout(
      () => void save().catch((e) => setError(e.message)),
      1500,
    );
    return () => clearTimeout(t);
  }, [dirty, doc]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(t);
  }, [notice]);
  const edit = (next: ProjectDoc) => {
    if (doc) {
      history.current.push(structuredClone(doc));
      history.current = history.current.slice(-50);
      future.current = [];
    }
    setDoc(next);
    setDirty(true);
  };
  const patch = (values: Partial<ProjectDoc>) => {
    if (doc) edit(reconcileVariantScenes({ ...doc, ...values }));
  };
  const editScene = (id: string, values: Partial<Scene>) => {
    if (doc)
      patch({
        scenes: doc.scenes.map((s) => (s.id === id ? { ...s, ...values } : s)),
      });
  };
  async function save() {
    if (saving.current) {
      await saving.current;
      if (current.current !== doc) return save();
      return;
    }
    if (!projectRef.current || !current.current || !dirty) return;
    const snapshot = current.current;
    const previous = projectRef.current;
    saving.current = (async () => {
      const p = await api<Project>(`projects/${previous.id}`, "PATCH", {
        document: snapshot,
        revision: previous.revision,
      });
      projectRef.current = p;
      setProject(p);
      if (current.current === snapshot) {
        const parsed = projectSchema.parse(p.document);
        current.current = parsed;
        setDoc(parsed);
        setDirty(false);
      }
      setNotice("All changes saved");
    })();
    try {
      await saving.current;
    } finally {
      saving.current = null;
    }
  }
  async function open(p: Project, requestedVariantId?: string) {
    if (dirty) await save();
    const full = await api<Project>(`projects/${p.id}`);
    setProject(full);
    const parsed = projectSchema.parse(full.document);
    setDoc(parsed);
    setAssets(full.assets || []);
    let remembered: { stage?: string; variantId?: string; selected?: string } | null = null;
    try { remembered = JSON.parse(localStorage.getItem(`studio-position-${p.id}`) || "null"); } catch { /* A corrupt browser preference must never block opening a saved project. */ }
    const requestedVariant = parsed.variants.find(v => v.id === requestedVariantId);
    setSelected(requestedVariant ? requestedVariant.sceneIds[0] || "" : parsed.scenes.some(s => s.id === remembered?.selected) ? remembered!.selected! : parsed.scenes[0]?.id || "");
    setVariantId(requestedVariant?.id || (parsed.variants.some(v => v.id === remembered?.variantId) ? remembered!.variantId! : parsed.variants[0]?.id || ""));
    setDirty(false);
    history.current = [];
    future.current = [];
    setView("Project");
    const videoStages = parsed.video ? ["Plan & import", ...stages] : stages;
    setStage(requestedVariant ? "Preview & exports" : remembered?.stage && videoStages.includes(remembered.stage) ? remembered.stage : parsed.video ? "Plan & import" : "Script");
  }
  async function reloadProject() {
    if (!project) return;
    await open(project);
  }
  async function upload(file: File) {
    if (!project) return;
    const form = new FormData();
    form.set("file", file);
    form.set("projectId", project.id);
    const asset = await api<Asset>("assets", "POST", form);
    setAssets((a) => [asset, ...a]);
    return asset;
  }
  async function generate(
    kind: string,
    sceneId?: string,
    operation?: string,
    prompt?: string,
    variantScoped = false,
  ) {
    if (!project || !doc) return;
    if (
      !window.confirm(
        kind === "render"
          ? "Queue a background render?"
          : kind === "automatic"
            ? "Start automatic production under the saved project budget and unknown-cost policy? This can use paid APIs."
            : "This generation can consume provider credits. Continue?",
      )
    )
      return;
    await save();
    await api("jobs", "POST", {
      projectId: project.id,
      kind,
      options: {
        sceneId,
        operation,
        prompt,
        variantScoped,
        paidConfirmed: true,
        variantId,
        draft: false,
      },
    });
    setNotice("Job queued. View Usage & jobs for progress.");
    await refresh();
  }
  function addScene() {
    if (!doc) return;
    const s = newScene(doc.scenes.length + 1);
    patch({
      scenes: [...doc.scenes, s],
      variants: doc.variants.map((v) => ({
        ...v,
        sceneIds: [...v.sceneIds, s.id],
      })),
    });
    setSelected(s.id);
  }
  function removeScene(id: string) {
    if (!doc || doc.scenes.find((s) => s.id === id)?.locked) return;
    patch({
      scenes: doc.scenes.filter((s) => s.id !== id),
      variants: doc.variants
        .map((v) => ({ ...v, sceneIds: v.sceneIds.filter((i) => i !== id) }))
        .filter((v) => v.sceneIds.length),
    });
    setSelected(doc.scenes.find((s) => s.id !== id)?.id || "");
  }
  function duplicateScene(s: Scene) {
    if (!doc) return;
    const copy = {
      ...structuredClone(s),
      id: crypto.randomUUID(),
      title: s.title + " (copy)",
      locked: false,
    };
    const index = doc.scenes.findIndex((x) => x.id === s.id);
    const scenes = [...doc.scenes];
    scenes.splice(index + 1, 0, copy);
    patch({
      scenes,
      variants: doc.variants.map((v) => ({
        ...v,
        sceneIds: v.sceneIds.flatMap((id) =>
          id === s.id ? [id, copy.id] : [id],
        ),
      })),
    });
    setSelected(copy.id);
  }
  const selectedScene = doc?.scenes.find((s) => s.id === selected);
  const variant =
    doc?.variants.find((v) => v.id === variantId) || doc?.variants[0];
  const publishing = variant?.publishing ?? doc?.publishing ?? {titles: [], description: "", hashtags: "", thumbnailPrompt: "", chapters: ""};
  function editPublishing(change: Partial<ProjectDoc["publishing"]>) {
    if (!doc) return;
    const next = {...publishing, ...change};
    patch(variant ? {variants: doc.variants.map(v => v.id === variant.id ? {...v, publishing: next} : v)} : {publishing: next});
  }
  const projectJobs = jobs.filter((j) => j.projectId === project?.id);
  const navigate = (v: string) => {
    setView(v);
    setMobile(false);
  };
  async function clipboard(s: string) {
    await navigator.clipboard.writeText(s);
    setNotice("Copied to clipboard");
  }
  function downloadJson(data: unknown, name: string) {
    const u = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = u;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(u), 1000);
  }
  if (auth === null)
    return (
      <main className="loading">
        <Film />
        <p>Opening your studio…</p>
      </main>
    );
  if (!auth)
    return (
      <main className="login">
        <div className="login-card">
          <div className="brand">
            <div className="brand-icon">
              <Film />
            </div>
            Story<span>Studio</span>
          </div>
          <h1>A space for your stories.</h1>
          <p>Sign in to your private video studio.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                await api("login", "POST", { password });
                setAuth(true);
                await refresh();
              });
            }}
          >
            <Field label="Owner password">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </Field>
            <Button disabled={busy}>
              Enter studio <ChevronRight size={16} />
            </Button>
          </form>
          {error && <p className="error">{error}</p>}
          <small>
            No public registration. Configure owner access in your server
            environment.
          </small>
        </div>
      </main>
    );
  return (
    <div className="app">
      <aside className={mobile ? "sidebar open" : "sidebar"}>
        <a className="brand" href="#" onClick={() => navigate("Dashboard")}>
          <div className="brand-icon">
            <Film size={23} />
          </div>
          Story<span>Studio</span>
        </a>
        <div className="workspace-label">PERSONAL WORKSPACE</div>
        <nav>
          {[
            ["Dashboard", LayoutDashboard],
            ["Devotional projects", BookOpen],
            ["All projects", FolderOpen],
            ["AI Providers", Settings],
            ["MCP Connectors", Sparkles],
            ["YouTube uploads", Sparkles],
            ["Prompt templates", BookOpen],
            ["Usage & jobs", Activity],
          ].map(([name, Icon]) => {
            const I = Icon as typeof Film;
            return (
              <button
                key={name as string}
                className={view === name ? "active" : ""}
                onClick={() => navigate(name as string)}
              >
                <I size={18} />
                {name as string}
                {name === "Usage & jobs" &&
                  jobs.some((j) => j.state === "running") && (
                    <span className="live-dot" />
                  )}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-projects">
          <div className="workspace-label">RECENT PROJECTS</div>
          {projects.slice(0, 4).map((p) => (
            <button key={p.id} onClick={() => void run(() => open(p))}>
              <span className="project-dot" />
              {p.title}
            </button>
          ))}
        </div>
        <div className="sidebar-bottom">
          <div className="local-badge">
            <span className="live-dot" /> Private studio <span>v1.0</span>
          </div>
          <div className="owner">
            <div className="avatar">S</div>
            <div>
              Studio owner<small>Personal workspace</small>
            </div>
            <button
              className="icon"
              title="Sign out"
              onClick={() =>
                void run(async () => {
                  await api("logout", "POST", {});
                  setAuth(false);
                })
              }
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <button
            className="icon mobile-menu"
            aria-label="Open navigation"
            onClick={() => setMobile(!mobile)}
          >
            <Menu />
          </button>
          <div className="breadcrumb">
            Workspace <ChevronRight size={13} />
            <span>{view === "Project" ? doc?.title : view}</span>
          </div>
          <div className="top-actions">
            <span className="private-pill">
              <Lock size={12} /> Owner only
            </span>
            <Button onClick={() => setNewOpen(true)}>
              <Plus size={16} /> New project
            </Button>
          </div>
        </header>
        {error && (
          <div className="error-banner" role="alert">
            {error}
            <button
              className="icon"
              aria-label="Dismiss error"
              onClick={() => setError("")}
            >
              <X size={16} />
            </button>
          </div>
        )}
        {notice && (
          <div className="toast" role="status">
            <Check size={15} />
            {notice}
          </div>
        )}
        {view === "Dashboard" || view === "All projects" ? (
          <main className="content">
            <div className="page-heading">
              <div>
                <div className="eyebrow">YOUR CREATIVE SPACE</div>
                <h1>
                  {view === "Dashboard"
                    ? "Bring your next story to life."
                    : "All projects"}
                </h1>
                <p>From a spark of an idea to a story worth sharing.</p>
              </div>
              <span className="date-label">PERSONAL VIDEO STUDIO</span>
            </div>
            {view === "Dashboard" && (
              <section className="hero">
                <div className="hero-copy">
                  <div className="hero-tag">
                    <Sparkles size={13} /> MADE FOR YOUR STORIES
                  </div>
                  <h2>
                    Every great video
                    <br />
                    starts with a story.
                  </h2>
                  <p>
                    Create in Telugu, Hindi, or English. Build it your way,
                    <br className="desktop" /> with AI, by hand, or a little of
                    both.
                  </p>
                  <Button onClick={() => setNewOpen(true)}>
                    Create a story <Plus size={17} />
                  </Button>
                  <div className="hero-formats">
                    <span>▭ YouTube</span>
                    <span>▯ Shorts</span>
                    <span>▯ Reels</span>
                  </div>
                </div>
                <div className="hero-art" aria-hidden="true">
                  <div className="art-orbit orbit-one" />
                  <div className="art-orbit orbit-two" />
                  <div className="art-card card-back">
                    <div className="mini-hills" />
                  </div>
                  <div className="art-card card-front">
                    <div className="sun" />
                    <div className="mountain mountain-one" />
                    <div className="mountain mountain-two" />
                    <div className="play-circle">
                      <Play size={22} fill="currentColor" />
                    </div>
                    <div className="art-caption">A story waiting to unfold</div>
                  </div>
                  <div className="floating-tag">
                    <AudioLines size={15} /> Your voice. Your vision.
                  </div>
                </div>
              </section>
            )}
            <div className="stats">
              {[
                [projects.length, "Projects", FolderOpen],
                [
                  projects.reduce((n, p) => n + p.document.scenes.length, 0),
                  "Scenes created",
                  Layers,
                ],
                [
                  // Stale exports are still finished videos; they predate later edits.
                  jobs.filter(isFullExport).length,
                  "Videos exported",
                  Film,
                ],
                [
                  jobs.filter((j) => ["queued", "running"].includes(j.state))
                    .length,
                  "Active jobs",
                  Activity,
                ],
              ].map(([n, label, Icon]) => {
                const I = Icon as typeof Film;
                return (
                  <div className="stat" key={label as string}>
                    <div className="stat-icon">
                      <I size={18} />
                    </div>
                    <div>
                      <strong>{n as number}</strong>
                      <span>{label as string}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            {view === "Dashboard" && (
              <>
                <div className="section-heading">
                  <div>
                    <h2>
                      Devotional projects <span className="count">{seriesList.length}</span>
                    </h2>
                    <p>Each project has its own template, sources and style. Its videos inherit them.</p>
                  </div>
                </div>
                <SeriesCards series={seriesList} videos={projects} jobs={jobs} onOpen={(id) => { setSeriesId(id); navigate("Devotional project"); }} onCreate={() => setNewSeriesOpen(true)} />
              </>
            )}
            <div className="section-heading">
              <div>
                <h2>
                  {view === "Dashboard" ? "Recent videos" : "Your projects"}{" "}
                  <span className="count">{projects.length}</span>
                </h2>
                <p>Pick up where your inspiration left off.</p>
              </div>
              <label className="search">
                <Search size={16} />
                <input
                  placeholder="Search projects…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Search projects"
                />
              </label>
            </div>
            <div className="project-grid">
              {projects
                .filter((p) =>
                  p.title.toLowerCase().includes(search.toLowerCase()) ||
                  p.document.variants.some(v => v.name.toLowerCase().includes(search.toLowerCase())),
                )
                .map((p) => (
                  <article className="project-card" key={p.id}>
                    <button
                      className="project-cover"
                      onClick={() => void run(() => open(p))}
                    >
                      <div
                        className={`generated-cover category-${p.document.category.toLowerCase()}`}
                      >
                        <Clapperboard size={38} />
                        <span>{p.document.style}</span>
                      </div>
                      <span className="cover-format">
                        {p.document.variants.some(
                          (v) => v.aspect === "vertical",
                        )
                          ? "9:16"
                          : "16:9"}
                      </span>
                      <span className="cover-language">
                        {languageNames[p.document.language]}
                      </span>
                    </button>
                    <div className="project-info">
                      <button
                        className="project-title"
                        onClick={() => void run(() => open(p))}
                      >
                        {p.title}
                      </button>
                      <p>
                        {p.document.category} <span>·</span>{" "}
                        {p.document.scenes.length} scenes
                      </p>
                      <div className="project-versions" aria-label={`Video versions in ${p.title}`}>
                        <strong>Video versions · {p.document.variants.length}</strong>
                        {p.document.variants.map(v => (
                          <button key={v.id} onClick={() => void run(() => open(p, v.id))}>
                            <Play size={13} aria-hidden="true" />
                            <span>{v.name}</span>
                            <small>{v.aspect === "vertical" ? "9:16" : "16:9"}</small>
                          </button>
                        ))}
                      </div>
                      <div className="project-footer">
                        {(() => {
                          const exported = jobs.filter(
                            (j) => j.projectId === p.id && isFullExport(j),
                          ).length;
                          return (
                            <span
                              className={`status ${p.document.scenes.length ? "ready" : ""}`}
                            >
                              <span />
                              {exported
                                ? `${exported} video${exported === 1 ? "" : "s"} exported`
                                : p.document.scenes.length
                                  ? "In production"
                                  : "Draft"}
                            </span>
                          );
                        })()}
                        <button
                          className="icon"
                          aria-label={`Duplicate ${p.title}`}
                          onClick={() =>
                            void run(async () => {
                              await api(
                                `projects/${p.id}/duplicate`,
                                "POST",
                                {},
                              );
                              await refresh();
                            })
                          }
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              <button className="new-card" onClick={() => setNewOpen(true)}>
                <div>
                  <Plus size={24} />
                </div>
                <h3>Create a new project</h3>
                <p>Give your next idea a home.</p>
              </button>
            </div>
            {view === "Dashboard" && (
              <section className="workflow-strip">
                <div>
                  <div className="workflow-icon">
                    <Clapperboard />
                  </div>
                  <h3>One studio. The whole journey.</h3>
                  <p>Your story, from the first word to the final frame.</p>
                </div>
                <div className="workflow-steps">
                  {["Write", "Visualize", "Narrate", "Edit", "Export"].map(
                    (s, i) => (
                      <span key={s}>
                        <b>{String(i + 1).padStart(2, "0")}</b>
                        {s}
                        {i < 4 && <ChevronRight size={12} />}
                      </span>
                    ),
                  )}
                </div>
              </section>
            )}
          </main>
        ) : view === "Devotional projects" ? (
          <main className="content">
            <div className="page-heading">
              <div>
                <div className="eyebrow">TELUGU DEVOTIONAL VIDEOS</div>
                <h1>Devotional projects</h1>
                <p>Bhagavad Gita, Lord Vishnu, Lord Shiva or your own topic. Open a project to create its videos.</p>
              </div>
            </div>
            <SeriesCards series={seriesList} videos={projects} jobs={jobs} onOpen={(id) => { setSeriesId(id); navigate("Devotional project"); }} onCreate={() => setNewSeriesOpen(true)} />
          </main>
        ) : view === "Devotional project" && seriesId ? (
          <SeriesPage
            id={seriesId}
            videos={projects}
            jobs={jobs}
            run={run}
            back={() => navigate("Devotional projects")}
            openVideo={(v) => void run(() => open(v as Project))}
            refresh={refresh}
            notify={setNotice}
          />
        ) : view === "YouTube uploads" ? (
          <YoutubeSettings />
        ) : view === "MCP Connectors" ? (
          <McpSettings />
        ) : view === "AI Providers" ? (
          <Providers
            profiles={profiles}
            defaults={defaults}
            saved={async () => {
              await refresh();
            }}
            run={run}
          />
        ) : view === "Usage & jobs" ? (
          <main className="content">
            <div className="page-heading">
              <div>
                <h1>Usage & jobs</h1>
                <p>Persistent work, honest progress, and credit visibility.</p>
              </div>
              <Button secondary onClick={() => void run(refresh)}>
                <RefreshCw size={15} /> Refresh
              </Button>
            </div>
            <div className="stats">
              <div className="stat">
                <div>
                  <strong>
                    $
                    {jobs
                      .reduce((n, j) => n + (j.actualCost || 0), 0)
                      .toFixed(2)}
                  </strong>
                  <span>Reported actual cost</span>
                </div>
              </div>
              <div className="stat">
                <div>
                  <strong>
                    {
                      jobs.filter(
                        (j) =>
                          j.estimatedCost === null ||
                          j.estimatedCost === undefined,
                      ).length
                    }
                  </strong>
                  <span>Jobs with unknown pricing</span>
                </div>
              </div>
            </div>
            <JobList jobs={jobs} run={run} refresh={refresh} />
          </main>
        ) : view === "Prompt templates" ? (
          <TemplatePage
            saved={savedTemplates}
            refresh={refresh}
            run={run}
            download={downloadJson}
          />
        ) : doc && project ? (
          <main className="project-content">
            <div className="project-heading">
              <div>
                <button
                  className="back-link"
                  onClick={() => {
                    if (project.seriesId) setSeriesId(project.seriesId);
                    navigate(project.seriesId ? "Devotional project" : "Dashboard");
                  }}
                >
                  <ArrowLeft size={14} />{" "}
                  {seriesList.find((x) => x.id === project.seriesId)?.name || "Projects"}
                </button>
                <h1>
                  {doc.title}{" "}
                  {doc.video && <StatusChip status={statusOf({ ...project, document: doc }, jobs)} />}
                </h1>
                <p>
                  {languageNames[doc.language]} · {doc.category} · {doc.mode}{" "}
                  workflow
                </p>
              </div>
              <div className="row">
                <span className="save-status">
                  {dirty ? "Saving changes…" : "Saved"}
                </span>
                <Button secondary onClick={() => setSetupOpen(true)}>
                  <Settings size={15} /> Setup
                </Button>
                <Button
                  secondary
                  onClick={() => void run(reloadProject)}
                  title="Load generated output and current server revision"
                >
                  <RefreshCw size={15} /> Reload
                </Button>
                <Button onClick={() => void run(() => generate("automatic"))}>
                  <Sparkles size={15} /> Produce / resume
                </Button>
              </div>
            </div>
            <nav className="stage-nav">
              {(doc.video ? ["Plan & import", ...stages] : stages).map((s, i) => (
                <button
                  className={stage === s ? "active" : ""}
                  key={s}
                  onClick={() => setStage(s)}
                >
                  <span>{doc.stages[s] ? <Check size={12} /> : i + 1}</span>
                  {s}
                </button>
              ))}
            </nav>
            {stage === "Plan & import" && doc.video ? (
              <PlanStage
                project={project}
                doc={doc}
                run={run}
                save={save}
                reload={async () => { await reloadProject(); await refresh(); }}
                patch={patch}
                goTo={setStage}
                copy={clipboard}
                notify={setNotice}
                seriesRevision={seriesList.find((x) => x.id === project.seriesId)?.revision}
              />
            ) : stage === "Script" ? (
              <div className="editor-columns">
                <section className="panel">
                  <div className="section-heading">
                    <h2>Your story</h2>
                    <span className="subtle">
                      ~
                      {Math.round(
                        doc.script.split(/\s+/).filter(Boolean).length / 2.3,
                      )}
                      s estimated
                    </span>
                  </div>
                  <Field label="Outline">
                    <textarea
                      rows={4}
                      value={doc.outline}
                      onChange={(e) => patch({ outline: e.target.value })}
                    />
                  </Field>
                  <Field label="Narration script">
                    <textarea
                      className="script-area"
                      rows={18}
                      value={doc.script}
                      onChange={(e) => patch({ script: e.target.value })}
                      placeholder="Start with a hook. Tell your story. Leave your audience with something to carry."
                    />
                  </Field>
                  <div className="row wrap">
                    <Button
                      onClick={() => {
                        const paragraphs = doc.script
                          .split(/\n\s*\n/)
                          .filter((p) => p.trim());
                        if (!paragraphs.length) {
                          setError("Enter a script first");
                          return;
                        }
                        const locked = doc.scenes.filter((s) => s.locked);
                        const scenes = [
                          ...locked,
                          ...paragraphs.map((p, i) => ({
                            ...newScene(i + 1, p),
                            duration: Math.max(2, p.split(/\s+/).length / 2.3),
                            visual: p,
                            imagePrompt: p,
                          })),
                        ];
                        const variants = doc.variants.length
                          ? doc.variants.map((v) => ({
                              ...v,
                              sceneIds: scenes.map((s) => s.id),
                            }))
                          : [
                              variantSchema.parse({
                                id: crypto.randomUUID(),
                                name: "YouTube long",
                                aspect: "landscape",
                                sceneIds: scenes.map((s) => s.id),
                                maxDuration: 7200,
                              }),
                            ];
                        patch({ scenes, variants });
                        setSelected(scenes[0]?.id || "");
                        setVariantId(variants[0].id);
                        setStage("Storyboard");
                      }}
                    >
                      Create scenes from paragraphs <ChevronRight size={15} />
                    </Button>
                    <Button
                      secondary
                      onClick={() =>
                        void run(() =>
                          generate("script", undefined, "storyboard"),
                        )
                      }
                    >
                      AI storyboard
                    </Button>
                  </div>
                  <p className="help">
                    Duration is an estimate until narration is measured.
                    Paragraph splitting is a manual starting point.
                  </p>
                </section>
                <aside className="panel narrow">
                  <h3>Writing tools</h3>
                  <p className="help">
                    API operations use your independent script provider.
                  </p>
                  {[
                    "Generate script",
                    "Rewrite",
                    "Shorten",
                    "Expand",
                    "Translate",
                  ].map((action) => (
                    <Button
                      key={action}
                      secondary
                      onClick={() =>
                        void run(() =>
                          generate(
                            "script",
                            undefined,
                            "script",
                            action === "Generate script"
                              ? undefined
                              : `${action} this narration in ${doc.language}. Return only the script. Do not invent source quotations.\n${doc.script}`,
                          ),
                        )
                      }
                    >
                      {action === "Generate script" ? (
                        <Sparkles size={15} />
                      ) : (
                        <FileText size={15} />
                      )}{" "}
                      {action}
                    </Button>
                  ))}
                  <Field label="Sources and research notes">
                    <textarea
                      rows={5}
                      value={doc.sources}
                      onChange={(e) => patch({ sources: e.target.value })}
                    />
                  </Field>
                  <Field label="Account classification">
                    <select
                      value={doc.sourceClassification}
                      onChange={(e) =>
                        patch({
                          sourceClassification: e.target
                            .value as ProjectDoc["sourceClassification"],
                        })
                      }
                    >
                      {["traditional", "interpretation", "fiction"].map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                    </select>
                  </Field>
                  <p className="help">
                    Review devotional accounts against your supplied sources.
                    Fictional additions and interpretation should be identified.
                  </p>
                  <Field label="Pronunciation notes">
                    <textarea
                      value={doc.pronunciation}
                      onChange={(e) => patch({ pronunciation: e.target.value })}
                    />
                  </Field>
                  <Button
                    secondary
                    onClick={() =>
                      void run(async () => {
                        const versions = await api<
                          { revision: number; document: ProjectDoc }[]
                        >(`projects/${project.id}/versions`);
                        const revision = window.prompt(
                          `Restore revision: ${versions.map((v) => v.revision).join(", ")}`,
                        );
                        const v = versions.find(
                          (v) => String(v.revision) === revision,
                        );
                        if (v) edit(projectSchema.parse(v.document));
                      })
                    }
                  >
                    Restore a saved version
                  </Button>
                </aside>
              </div>
            ) : stage === "Storyboard" ? (
              <>
                <div className="toolbar">
                  <div>
                    <h2>
                      Storyboard{" "}
                      <span className="count">{doc.scenes.length}</span>
                    </h2>
                    <p>Arrange the moments that make your story.</p>
                  </div>
                  <Button onClick={addScene}>
                    <Plus size={15} /> Add scene
                  </Button>
                </div>
                <div className="storyboard-layout">
                  <div className="scene-list">
                    {doc.scenes.map((s, i) => (
                      <div
                        key={s.id}
                        className={
                          selected === s.id
                            ? "scene-thumb selected"
                            : "scene-thumb"
                        }
                        draggable={!s.locked}
                        onDragStart={(e) =>
                          e.dataTransfer.setData("text/plain", s.id)
                        }
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const from = e.dataTransfer.getData("text/plain");
                          const src = doc.scenes.find((s) => s.id === from);
                          if (!src || src.locked || s.locked) return;
                          const scenes = doc.scenes.filter(
                            (s) => s.id !== from,
                          );
                          scenes.splice(
                            scenes.findIndex((x) => x.id === s.id),
                            0,
                            src,
                          );
                          patch({
                            scenes,
                            variants: doc.variants.map((v) => ({
                              ...v,
                              sceneIds: scenes
                                .filter((s) => v.sceneIds.includes(s.id))
                                .map((s) => s.id),
                            })),
                          });
                        }}
                      >
                        <button onClick={() => setSelected(s.id)}>
                          <span className="scene-number">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <Visual
                            asset={assets.find((a) => a.id === s.assetId)}
                            scene={s}
                          />
                          <div>
                            <strong>{s.title}</strong>
                            <small>
                              {fmt(s.duration)} · {s.status}{" "}
                              {s.locked ? "· Locked" : ""}
                            </small>
                          </div>
                        </button>
                        <GripVertical size={15} />
                      </div>
                    ))}
                    {!doc.scenes.length && (
                      <Empty title="Your storyboard is waiting">
                        Create scenes from your script or add your first scene.
                      </Empty>
                    )}
                  </div>
                  {selectedScene && (
                    <SceneEditor
                      scene={selectedScene}
                      assets={assets}
                      doc={doc}
                      profiles={profiles}
                      edit={(values) => editScene(selected, values)}
                      upload={upload}
                      run={run}
                      generate={(kind, prompt) =>
                        generate(kind, selected, undefined, prompt)
                      }
                      duplicate={() => duplicateScene(selectedScene)}
                      remove={() => removeScene(selected)}
                      split={() => {
                        const s = selectedScene;
                        if (s.locked) return;
                        const text = s.narration;
                        const words = text.split(/\s+/);
                        const half = Math.ceil(words.length / 2);
                        const second = {
                          ...structuredClone(s),
                          id: crypto.randomUUID(),
                          title: s.title + " · part 2",
                          narration: words.slice(half).join(" "),
                          duration: s.duration / 2,
                          audioId: undefined,
                          captions: [],
                          narrationStale: false,
                          captionsStale: false,
                        };
                        const first = {
                          ...s,
                          narration: words.slice(0, half).join(" "),
                          duration: s.duration / 2,
                          audioId: undefined,
                          captions: [],
                        };
                        patch({
                          scenes: doc.scenes.flatMap((x) =>
                            x.id === s.id ? [first, second] : [x],
                          ),
                          variants: doc.variants.map((v) => ({
                            ...v,
                            sceneIds: v.sceneIds.flatMap((id) =>
                              id === s.id ? [id, second.id] : [id],
                            ),
                          })),
                        });
                      }}
                      merge={() => {
                        const i = doc.scenes.findIndex(
                          (s) => s.id === selected,
                        );
                        const next = doc.scenes[i + 1];
                        if (!next || next.locked || selectedScene.locked)
                          return;
                        const merged = {
                          ...selectedScene,
                          narration:
                            selectedScene.narration + "\n" + next.narration,
                          duration: selectedScene.duration + next.duration,
                          audioId: undefined,
                          captions: [],
                          narrationStale: false,
                          captionsStale: false,
                        };
                        patch({
                          scenes: doc.scenes
                            .filter((s) => s.id !== next.id)
                            .map((s) => (s.id === selected ? merged : s)),
                          variants: doc.variants.map((v) => ({
                            ...v,
                            sceneIds: v.sceneIds.filter((id) => id !== next.id),
                          })),
                        });
                      }}
                    />
                  )}
                </div>
                <CharacterEditor doc={doc} patch={patch} assets={assets} />
              </>
            ) : stage === "Prompts" ? (
              <>
              <section className="panel">
                <h2>Review visuals and create versions</h2>
                <p className="help">Create a new version before changing its scenes to keep other versions independent. Review the saved image and prompt together, generate or upload a replacement, then export the selected version. Editing a prompt alone does not change the image.</p>
                <div className="row">
                  <Field label="Video version to review">
                    <select value={variant?.id || ""} onChange={e => {
                      setVariantId(e.target.value);
                      setSelected(doc.variants.find(v => v.id === e.target.value)?.sceneIds[0] || "");
                    }}>
                      {doc.variants.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                  </Field>
                  <Button secondary disabled={!variant} onClick={() => void run(async () => {
                    await save();
                    const latest = await api<Project>(`projects/${project.id}`);
                    const source = projectSchema.parse(latest.document);
                    const next = createVideoVersion(source, variant!.id, `${variant!.name} · version ${source.variants.length + 1}`);
                    const result = await api<Project>(`projects/${project.id}`, "PATCH", { document: next.document, revision: latest.revision });
                    const parsed = projectSchema.parse(result.document);
                    projectRef.current = result;
                    current.current = parsed;
                    setProject(result); setDoc(parsed); setDirty(false);
                    setVariantId(next.variant.id); setSelected(next.variant.sceneIds[0]);
                    setNotice("New video version saved. Review its images and prompts, then export it.");
                  })}><Plus size={15} /> Create new video version</Button>
                  <Button secondary onClick={() => setStage("Preview & exports")}><Play size={15} /> Preview & export selected version</Button>
                </div>
              </section>
              <PromptWorkspace
                doc={doc}
                scene={selectedScene}
                scenes={variant ? doc.scenes.filter(s => variant.sceneIds.includes(s.id)) : doc.scenes}
                assets={assets}
                generateImage={(id, prompt) => generate("image", id, undefined, prompt)}
                imageConfigured={profiles.some(p => p.id === (selectedScene?.providers.image || doc.providers.image || defaults.image) && p.config.capabilities.includes("image"))}
                configureImage={() => setView("AI Providers")}
                select={setSelected}
                saved={savedTemplates}
                patch={patch}
                editScene={editScene}
                copy={clipboard}
                download={downloadJson}
                setStage={setStage}
                upload={upload}
                run={run}
              />
              </>
            ) : stage === "Assets" ? (
              <section>
                <div className="toolbar">
                  <div>
                    <h2>Asset library</h2>
                    <p>
                      Durable media stays with your project when providers
                      change.
                    </p>
                  </div>
                  <label className="btn">
                    <Upload size={15} /> Upload media
                    <input
                      type="file"
                      multiple
                      accept="image/png,image/jpeg,image/webp,video/mp4,video/webm,audio/mpeg,audio/wav"
                      hidden
                      onChange={(e) =>
                        void run(async () => {
                          for (const f of Array.from(e.target.files || []))
                            await upload(f);
                        })
                      }
                    />
                  </label>
                </div>
                <div className="asset-grid">
                  {assets.map((a) => (
                    <div className="panel asset-card" key={a.id}>
                      {a.kind === "audio" ? (
                        <audio controls src={`/api/assets/${a.id}`} />
                      ) : (
                        <Visual asset={a} />
                      )}
                      <h3>{a.name}</h3>
                      <p className="help">
                        {a.kind} · {(a.bytes / 1048576).toFixed(2)} MB{" "}
                        {a.duration ? `· ${fmt(a.duration)}` : ""}
                      </p>
                      <Field label="Explicitly assign to scene">
                        <select
                          defaultValue=""
                          onChange={(e) => {
                            if (!e.target.value) return;
                            editScene(
                              e.target.value,
                              a.kind === "audio"
                                ? {
                                    audioId: a.id, audioStart: 0, audioSlice: false,
                                    duration: a.duration || 5,
                                    narrationStale: false,
                                  }
                                : {
                                    assetId: a.id,
                                    mediaType: a.kind as "image" | "video",
                                    status: "Media ready",
                                  },
                            );
                            setNotice("Assigned to scene");
                          }}
                        >
                          <option value="">Choose scene…</option>
                          {doc.scenes
                            .filter((s) => !s.locked)
                            .map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.title}
                              </option>
                            ))}
                        </select>
                      </Field>
                      <details>
                        <summary>Asset provenance</summary>
                        <pre>{JSON.stringify(a.metadata, null, 2)}</pre>
                      </details>
                    </div>
                  ))}
                </div>
                {!assets.length && (
                  <Empty title="Make room for your visuals">
                    Upload images, video clips, or narration. Scene assignments
                    are always explicit.
                  </Empty>
                )}
                <div className="row">
                  <Button
                    secondary
                    onClick={() =>
                      downloadJson(
                        {
                          schemaVersion: 1,
                          scenes: doc.scenes.map((s) => ({
                            id: s.id,
                            title: s.title,
                            visualFile: "",
                            audioFile: "",
                          })),
                        },
                        "scene-manifest.json",
                      )
                    }
                  >
                    Download scene manifest
                  </Button>
                  <label className="btn secondary">
                    Import scene manifest
                    <input
                      type="file"
                      accept="application/json"
                      hidden
                      onChange={(e) =>
                        void run(async () => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const manifest = JSON.parse(await file.text());
                          const scenes = [...doc.scenes];
                          for (const item of manifest.scenes) {
                            const s = scenes.find((s) => s.id === item.id);
                            if (!s || s.locked)
                              throw Error(
                                "Manifest references missing or locked scene",
                              );
                            for (const [field, name] of [
                              ["assetId", item.visualFile],
                              ["audioId", item.audioFile],
                            ] as const) {
                              if (!name) continue;
                              const matches = assets.filter(
                                (a) => a.name === name,
                              );
                              if (matches.length !== 1)
                                throw Error(
                                  `Ambiguous or missing file: ${name}`,
                                );
                              (s as unknown as Record<string, unknown>)[field] =
                                matches[0].id;
                            }
                          }
                          patch({ scenes });
                        })
                      }
                    />
                  </label>
                </div>
              </section>
            ) : stage === "Voice & captions" ? (
              <VoicePage
                doc={doc}
                selected={selected}
                select={setSelected}
                assets={assets}
                profiles={profiles}
                edit={(values) => editScene(selected, values)}
                patch={patch}
                generate={(kind) => generate(kind, selected)}
                upload={upload}
                run={run}
              />
            ) : stage === "Timeline" ? (
              <TimelineEditor
                doc={doc}
                variant={variant}
                assets={assets}
                selected={selected}
                select={setSelected}
                editScene={editScene}
                patch={patch}
                variantId={variantId}
                setVariant={setVariantId}
                generate={generate}
                undo={() => {
                  const prev = history.current.pop();
                  if (prev) {
                    future.current.push(doc);
                    setDoc(prev);
                    setDirty(true);
                  }
                }}
                redo={() => {
                  const next = future.current.pop();
                  if (next) {
                    history.current.push(doc);
                    setDoc(next);
                    setDirty(true);
                  }
                }}
                upload={upload}
                run={run}
              />
            ) : stage === "Preview & exports" ? (
              <section>
                <div className="toolbar">
                  <div>
                    <h2>Preview & exports</h2>
                    <p>
                      Draft previews and final exports render the same saved
                      timeline.
                    </p>
                  </div>
                  <div className="row">
                    <select
                      value={variant?.id || ""}
                      onChange={(e) => setVariantId(e.target.value)}
                    >
                      {doc.variants.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name} · {v.aspect}
                        </option>
                      ))}
                    </select>
                    <Button
                      secondary
                      disabled={!variant}
                      onClick={() =>
                        void run(async () => {
                          await save();
                          await api("jobs", "POST", {
                            projectId: project.id,
                            kind: "render",
                            options: { variantId: variant?.id, draft: true },
                          });
                          await refresh();
                        })
                      }
                    >
                      <Play size={15} /> Draft preview
                    </Button>
                    <Button
                      disabled={!variant}
                      onClick={() => void run(() => generate("render"))}
                    >
                      <Download size={15} /> Full export
                    </Button>
                  </div>
                </div>
                {variant && warnings(doc, variant, assets).length > 0 && (
                  <div className="warning">
                    {warnings(doc, variant, assets).map((w) => (
                      <p key={w}>{w}</p>
                    ))}
                  </div>
                )}
                {projectJobs
                  .filter(
                    (j) =>
                      j.kind === "render" &&
                      ["completed", "stale"].includes(j.state) &&
                      isExportForVariant(j.result, variant?.id, doc.variants.length),
                  )
                  .map((j) => (
                    <div key={j.id} className="panel export-card">
                      <video
                        controls
                        src={`/api/jobs/${j.id}/download`}
                        preload="metadata"
                      />
                      <div>
                        <h3>
                          {j.result?.draft
                            ? "Draft preview"
                            : "Full-quality export"}
                        </h3>
                        <p>
                          {j.result?.width} × {j.result?.height} ·{" "}
                          {fmt(j.result?.duration || 0)} ·{" "}
                          {((j.result?.bytes || 0) / 1048576).toFixed(2)} MB
                        </p>
                        {j.state === "stale" && (
                          <p className="warning">
                            Timeline changed since this render. This export
                            preserves its original revision.
                          </p>
                        )}
                        <div className="row">
                          {["mp4", "srt", "vtt"].map((f) => (
                            <a
                              key={f}
                              className="btn secondary"
                              href={`/api/jobs/${j.id}/download?format=${f}`}
                              download={`story.${f}`}
                            >
                              {f.toUpperCase()} <Download size={13} />
                            </a>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                <JobList
                  jobs={projectJobs.filter(
                    (j) =>
                      j.kind === "render" &&
                      !["completed", "stale"].includes(j.state),
                  )}
                  run={run}
                  refresh={refresh}
                />
                <div className="row">
                  <a
                    className="btn secondary"
                    href={`/api/projects/${project.id}/export`}
                    download
                  >
                    Backup project and media
                  </a>
                  <Button
                    secondary
                    onClick={() =>
                      downloadJson(
                        doc.scenes.map((s) => ({
                          sceneId: s.id,
                          imagePrompt: s.imagePrompt,
                          videoPrompt: s.videoPrompt,
                        })),
                        "story-prompts.json",
                      )
                    }
                  >
                    Export all scene prompts
                  </Button>
                </div>
              </section>
            ) : (
              <section className="panel">
                <div className="toolbar">
                  <div>
                    <h2>Publishing package</h2>
                    <p>
                      Prepare your video for sharing. Exporting never publishes
                      automatically.
                    </p>
                  </div>
                  <Button
                    onClick={() =>
                      void run(() =>
                        generate("script", undefined, "publishing", undefined, !!variant),
                      )
                    }
                  >
                    <Sparkles size={15} /> Generate metadata
                  </Button>
                </div>
                <YoutubeUploadControls key={variant?.id ?? project.id} projectId={project.id} variantId={variant?.id} jobs={jobs} assets={assets} publishing={publishing} />
                <Field label="Title options (one per line)">
                  <select aria-label="Publishing version" value={variant?.id ?? ""} onChange={e => setVariantId(e.target.value)}>
                    {doc.variants.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                  <textarea
                    value={publishing.titles.join("\n")}
                    onChange={(e) =>
                      editPublishing({titles: e.target.value.split("\n")})
                    }
                  />
                </Field>
                {(
                  [
                    "description",
                    "hashtags",
                    "thumbnailPrompt",
                    "chapters",
                  ] as const
                ).map((k) => (
                  <Field key={k} label={k}>
                    <textarea
                      rows={4}
                      value={publishing[k]}
                      onChange={(e) =>
                        editPublishing({[k]: e.target.value})
                      }
                    />
                  </Field>
                ))}
                <div className="row">
                  <Button
                    secondary
                    onClick={() =>
                      downloadJson(publishing, "publishing-package.json")
                    }
                  >
                    Download package
                  </Button>
                  <Button
                    secondary
                    onClick={() =>
                      void clipboard(publishing.thumbnailPrompt)
                    }
                  >
                    Copy thumbnail prompt
                  </Button>
                  <Button
                    onClick={() =>
                      void run(() =>
                        generate(
                          "image",
                          undefined,
                          "thumbnail",
                          publishing.thumbnailPrompt,
                        ),
                      )
                    }
                  >
                    Generate thumbnail
                  </Button>
                </div>
              </section>
            )}
            <footer className="stage-footer">
              <Button
                secondary
                onClick={() => {
                  patch({ stages: { ...doc.stages, [stage]: true } });
                  const next = stages[stages.indexOf(stage) + 1];
                  if (next) setStage(next);
                }}
              >
                <Check size={14} /> Mark reviewed & continue
              </Button>
              <span>Completed work is preserved when you switch modes.</span>
            </footer>
          </main>
        ) : null}
        <footer className="app-footer">
          Story Studio <span>Built for stories that matter.</span>
          <span>Manual · Hybrid · Automatic</span>
        </footer>
      </div>
      {newSeriesOpen && (
        <NewSeriesModal
          onClose={() => setNewSeriesOpen(false)}
          run={run}
          created={(s) => {
            setNewSeriesOpen(false);
            void run(async () => {
              await refresh();
              setSeriesId(s.id);
              navigate("Devotional project");
            });
          }}
        />
      )}
      {newOpen && (
        <NewProject
          onClose={() => setNewOpen(false)}
          run={run}
          create={async (d) => {
            const p = await api<Project>("projects", "POST", d);
            await refresh();
            await open(p);
            setNewOpen(false);
          }}
          importProject={async (f) => {
            const r = await fetch("/api/projects/import", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: await f.text(),
            });
            const p = await r.json();
            if (!r.ok) throw Error(p.error);
            await refresh();
            await open(p);
            setNewOpen(false);
          }}
        />
      )}
      {setupOpen && doc && project && (
        <Modal title="Project setup" onClose={() => setSetupOpen(false)}>
          <ProjectFields doc={doc} patch={patch} />
          <div className="grid-two">
            {capabilities.map((c) => (
              <Field key={c} label={`${c} provider override`}>
                <select
                  value={doc.providers[c] || ""}
                  onChange={(e) =>
                    patch({
                      providers: { ...doc.providers, [c]: e.target.value },
                    })
                  }
                >
                  <option value="">Use global default</option>
                  {profiles
                    .filter((p) => p.config.capabilities.includes(c))
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.config.name}
                      </option>
                    ))}
                </select>
              </Field>
            ))}
          </div>
          <Button
            secondary
            onClick={() =>
              void run(async () => {
                await save();
                const p = await api<Project>(
                  `projects/${project.id}/migrate-providers`,
                  "POST",
                  {},
                );
                setProject(p);
                setDoc(projectSchema.parse(p.document));
                setDirty(false);
              })
            }
          >
            Deliberately adopt current global defaults
          </Button>
          <Button
            onClick={() => {
              void save();
              setSetupOpen(false);
            }}
          >
            Save setup
          </Button>
        </Modal>
      )}
    </div>
  );
}
function DurationInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (seconds: number) => void;
}) {
  const [custom, setCustom] = useState(!durationPresets.includes(value));
  return (
    <Field label={label}>
      <select
        aria-label={`${label} preset`}
        value={
          custom || !durationPresets.includes(value) ? "custom" : String(value)
        }
        onChange={(e) => {
          setCustom(e.target.value === "custom");
          if (e.target.value !== "custom") onChange(Number(e.target.value));
        }}
      >
        {durationPresets.map((s) => (
          <option key={s} value={s}>
            {s < 120 ? `${s} seconds` : `${s / 60} minutes`}
          </option>
        ))}
        <option value="custom">Custom</option>
      </select>
      <div className="grid-two">
        <label>
          Minutes
          <input
            required
            aria-label={`${label} minutes`}
            type="number"
            min={0}
            max={120}
            step={1}
            value={Math.floor(value / 60)}
            onChange={(e) => {
              setCustom(true);
              onChange(
                Math.max(0, Math.round(Number(e.target.value))) * 60 +
                  (value % 60),
              );
            }}
          />
        </label>
        <label>
          Seconds
          <input
            required
            aria-label={`${label} seconds`}
            type="number"
            min={0}
            max={59}
            step={1}
            value={value % 60}
            onChange={(e) => {
              setCustom(true);
              onChange(
                Math.floor(value / 60) * 60 +
                  Math.min(59, Math.max(0, Math.round(Number(e.target.value)))),
              );
            }}
          />
        </label>
      </div>
      {(value < 1 || value > 7200) && (
        <span role="alert">
          Enter a video length between 1 second and 120 minutes.
        </span>
      )}
    </Field>
  );
}
function ProjectFields({
  doc,
  patch,
}: {
  doc: ProjectDoc;
  patch: (p: Partial<ProjectDoc>) => void;
}) {
  return (
    <>
      <div className="grid-two">
        <Field label="Project title">
          <input
            value={doc.title}
            onChange={(e) => patch({ title: e.target.value })}
          />
        </Field>
        <Field label="Category">
          <select
            value={doc.category}
            onChange={(e) => patch({ category: e.target.value })}
          >
            {[
              "Motivational",
              "Devotional",
              "Mythology",
              "Moral story",
              "Custom",
            ].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Topic or idea">
        <textarea
          value={doc.topic}
          onChange={(e) => patch({ topic: e.target.value })}
          placeholder="What story do you want to tell?"
        />
      </Field>
      <div className="grid-three">
        <Field label="Narration language">
          <select
            value={doc.language}
            onChange={(e) =>
              patch({ language: e.target.value as ProjectDoc["language"] })
            }
          >
            {Object.entries(languageNames).map(([k, n]) => (
              <option key={k} value={k}>
                {n}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Subtitle language">
          <select
            value={doc.subtitleLanguage}
            onChange={(e) =>
              patch({
                subtitleLanguage: e.target.value as ProjectDoc["language"],
              })
            }
          >
            {Object.entries(languageNames).map(([k, n]) => (
              <option key={k} value={k}>
                {n}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Creation mode">
          <select
            value={doc.mode}
            onChange={(e) =>
              patch({ mode: e.target.value as ProjectDoc["mode"] })
            }
          >
            {["manual", "hybrid", "automatic"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </Field>
      </div>
      <div className="grid-two">
        <DurationInput
          label="Target video length · long video"
          value={doc.targetDuration}
          onChange={(value) =>
            patch({
              targetDuration: value,
              variants: doc.variants.map((v) =>
                v.aspect === "landscape" ? { ...v, targetDuration: value } : v,
              ),
            })
          }
        />
        <DurationInput
          label="Target video length · Shorts / Reels"
          value={doc.shortTargetDuration}
          onChange={(value) =>
            patch({
              shortTargetDuration: value,
              variants: doc.variants.map((v) =>
                v.aspect === "vertical" ? { ...v, targetDuration: value } : v,
              ),
            })
          }
        />
        <Field label="Visual style">
          <input
            value={doc.style}
            onChange={(e) => patch({ style: e.target.value })}
          />
        </Field>
        <Field label="Audience">
          <input
            value={doc.audience}
            onChange={(e) => patch({ audience: e.target.value })}
          />
        </Field>
        <Field label="Budget (USD)">
          <input
            type="number"
            min={0}
            step={0.1}
            value={doc.budget}
            onChange={(e) => patch({ budget: Number(e.target.value) })}
          />
        </Field>
        <Field label="Generation call limit">
          <input
            type="number"
            min={0}
            value={doc.generationLimit}
            onChange={(e) => patch({ generationLimit: Number(e.target.value) })}
          />
        </Field>
        <Field label="Unknown pricing policy">
          <select
            value={doc.unknownCostPolicy}
            onChange={(e) =>
              patch({
                unknownCostPolicy: e.target
                  .value as ProjectDoc["unknownCostPolicy"],
              })
            }
          >
            <option value="block">Block calls with unknown pricing</option>
            <option value="allow">Allow unknown cost within call limit</option>
          </select>
        </Field>
      </div>
      <label className="checkbox">
        <input
          type="checkbox"
          checked={doc.reviewCheckpoints}
          onChange={(e) => patch({ reviewCheckpoints: e.target.checked })}
        />{" "}
        Pause automation for review at each stage
      </label>
      <p className="help">
        Plan about {durationPlan(doc.targetDuration).minimumWords}–
        {durationPlan(doc.targetDuration).maximumWords} words across{" "}
        {durationPlan(doc.targetDuration).suggestedScenes} coherent scenes for
        the long video. Language and delivery affect timing; measure narration
        before accepting the final length. Clip lengths are separate.
      </p>
      <p className="help">
        Automatic production can consume credits. Manual production requires no
        provider credentials.
      </p>
    </>
  );
}
function NewProject({
  onClose,
  create,
  run,
  importProject,
}: {
  onClose: () => void;
  create: (d: ProjectDoc) => Promise<void>;
  run: (fn: () => Promise<void>) => Promise<void>;
  importProject: (f: File) => Promise<void>;
}) {
  const [d, setD] = useState(projectSchema.parse({ title: "Untitled story" }));
  const [formats, setFormats] = useState(["landscape"]);
  return (
    <Modal title="Start a new story" onClose={onClose}>
      <ProjectFields doc={d} patch={(p) => setD({ ...d, ...p })} />
      <div className="field">
        <span>Output formats</span>
        <div className="row">
          {["landscape", "vertical"].map((f) => (
            <label className="format-choice" key={f}>
              <input
                type="checkbox"
                checked={formats.includes(f)}
                onChange={(e) =>
                  setFormats(
                    e.target.checked
                      ? [...formats, f]
                      : formats.filter((x) => x !== f),
                  )
                }
              />
              <span>
                {f === "landscape"
                  ? "16:9 · YouTube long"
                  : "9:16 · Shorts / Reels"}
              </span>
            </label>
          ))}
        </div>
      </div>
      <Field label="Existing narration script (optional)">
        <textarea
          rows={4}
          value={d.script}
          onChange={(e) => setD({ ...d, script: e.target.value })}
        />
      </Field>
      <div className="modal-footer">
        <label className="btn secondary">
          <Upload size={15} /> Import project
          <input
            type="file"
            accept="application/json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void run(() => importProject(f));
            }}
          />
        </label>
        <Button
          disabled={
            !d.title.trim() ||
            !formats.length ||
            d.targetDuration < 1 ||
            d.targetDuration > 7200 ||
            d.shortTargetDuration < 1 ||
            d.shortTargetDuration > 7200
          }
          onClick={() =>
            void run(async () => {
              const scenes = d.script
                .split(/\n\s*\n/)
                .filter((x) => x.trim())
                .map((p, i) => ({
                  ...newScene(i + 1, p),
                  duration: Math.max(2, p.split(/\s+/).length / 2.3),
                  visual: p,
                  imagePrompt: p,
                }));
              const seed = scenes.length ? scenes : [newScene()];
              await create({
                ...d,
                scenes: seed,
                variants: formats.map((f) =>
                  variantSchema.parse({
                    id: crypto.randomUUID(),
                    name: f === "landscape" ? "YouTube long" : "Shorts / Reels",
                    aspect: f,
                    sceneIds: seed.map((s) => s.id),
                    maxDuration: f === "landscape" ? 7200 : 180,
                    targetDuration:
                      f === "landscape"
                        ? d.targetDuration
                        : d.shortTargetDuration,
                  }),
                ),
              });
            })
          }
        >
          Create project <ChevronRight size={16} />
        </Button>
      </div>
    </Modal>
  );
}
function Providers({
  profiles,
  defaults,
  saved,
  run,
}: {
  profiles: Profile[];
  defaults: Record<string, string>;
  saved: () => Promise<void>;
  run: (fn: () => Promise<void>) => Promise<void>;
}) {
  const [open, setOpen] = useState(false),
    [editing, setEditing] = useState(""),
    [config, setConfig] = useState(
      providerSchema.parse({
        name: "ZenMux script",
        type: "zenmux",
        baseUrl: "https://zenmux.ai/api/v1",
        capabilities: ["script"],
        model: "enter-model-slug",
      }),
    ),
    [key, setKey] = useState(""),
    [parameters, setParameters] = useState("{}");
  const patch = (p: Partial<ProviderConfig>) => setConfig({ ...config, ...p });
  const saveProfile = async (check: boolean) => {
    const validated = providerSchema.parse({ ...config, parameters: JSON.parse(parameters) });
    const profile = await api<Profile>(
      editing ? `providers/${editing}` : "providers",
      editing ? "PATCH" : "POST",
      { config: validated, apiKey: key },
    );
    setKey("");
    setOpen(false);
    try {
      if (check) await api(`providers/${profile.id}/verify`, "POST", {});
    } finally {
      await saved();
    }
  };
  return (
    <main className="content">
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR MODELS, YOUR CHOICE</div>
          <h1>AI providers</h1>
          <p>Independent keys and models for each part of your production.</p>
        </div>
        <Button
          onClick={() => {
            setEditing("");
            setKey("");
            setOpen(true);
          }}
        >
          <Plus size={15} /> Add provider profile
        </Button>
      </div>
      <section className="panel">
        <h2>Add your own API keys</h2>
        <p className="help">
          Enter keys privately in a provider profile. Keys are encrypted on the
          server and are never displayed again. Edit a profile to replace its
          key; leave the key field blank to keep the saved key. No environment
          variable or app restart is needed for keys saved here.
        </p>
        <Button
          secondary
          onClick={() => {
            setEditing("");
            setKey("");
            setParameters("{}");
            setConfig(providerSchema.parse({
              name: "ElevenLabs voice",
              type: "elevenlabs",
              baseUrl: "https://api.elevenlabs.io/v1",
              capabilities: ["voice"],
              model: "eleven_v4",
              parameters: {},
              supportedParameters: [],
            }));
            setOpen(true);
          }}
        >
          <AudioLines size={15} /> Set up ElevenLabs voice
        </Button>
      </section>
      <section className="panel">
        <h2>Capability defaults</h2>
        <p className="help">
          Changing an image provider leaves voice and video settings intact.
          Existing assets retain their provenance.
        </p>
        <div className="grid-three">
          {capabilities.map((c) => (
            <Field label={c} key={c}>
              <select
                value={defaults[c] || ""}
                onChange={(e) =>
                  void run(async () => {
                    await api("defaults", "POST", {
                      ...defaults,
                      [c]: e.target.value,
                    });
                    await saved();
                  })
                }
              >
                <option value="">Not configured · manual input</option>
                {profiles
                  .filter((p) => p.config.capabilities.includes(c))
                  .map((p) => (
                    <option value={p.id} key={p.id}>
                      {p.config.name} · {p.config.model}
                    </option>
                  ))}
              </select>
            </Field>
          ))}
        </div>
      </section>
      <div className="provider-grid">
        {profiles.map((p) => (
          <section className="panel" key={p.id}>
            <div className="row between">
              <div className="provider-symbol">
                {p.config.type === "elevenlabs" ? <AudioLines /> : <Sparkles />}
              </div>
              <span className="pill">{p.config.type}</span>
            </div>
            <h2>{p.config.name}</h2>
            <p>{p.config.model}</p>
            <div className="row wrap">
              {p.config.capabilities.map((c) => (
                <span className="pill" key={c}>
                  {c}
                </span>
              ))}
            </div>
            <p className="secret">API key {p.key}</p>
            {Boolean(p.verification.checkedAt) && (
              <div role="status">
                <p className="help">
                  Model: {String(p.verification.model)} · Voice: {String(p.verification.voice)}
                </p>
                {Array.isArray(p.verification.diagnostics) && p.verification.diagnostics.map((message, i) => (
                  <p className="help" key={i}>{String(message)}</p>
                ))}
                <p className="help">{String(p.verification.message)}</p>
              </div>
            )}
            <p className="help">
              {p.config.pricePerCall === undefined
                ? "Pricing unknown"
                : `Estimated $${p.config.pricePerCall} / call`}
            </p>
            <details>
              <summary>Connection status</summary>
              <pre>{JSON.stringify(p.verification, null, 2)}</pre>
              <p className="help">
                Model listing does not establish endpoint support. Only an
                explicit generation test does.
              </p>
            </details>
            <div className="row">
              <Button
                secondary
                onClick={() =>
                  void run(async () => {
                    await api(`providers/${p.id}/verify`, "POST", {});
                    await saved();
                  })
                }
              >
                <RefreshCw size={14} /> Check without generation
              </Button>
              <button
                className="icon"
                aria-label="Edit profile"
                onClick={() => {
                  setConfig(p.config);
                  setParameters(JSON.stringify(p.config.parameters, null, 2));
                  setEditing(p.id);
                  setKey("");
                  setOpen(true);
                }}
              >
                <Settings size={16} />
              </button>
            </div>
            <Button
              secondary
              onClick={() =>
                void run(async () => {
                  const projectId = window.prompt(
                    "Project ID to use for an explicit paid test (available in project backup URL):",
                  );
                  if (!projectId) return;
                  if (
                    !window.confirm(
                      "This test generates content and can spend real credits. Continue?",
                    )
                  )
                    return;
                  await api(`providers/${p.id}/test`, "POST", {
                    projectId,
                    capability: p.config.capabilities[0],
                  });
                  await saved();
                })
              }
            >
              Explicit paid generation test
            </Button>
          </section>
        ))}
      </div>
      {!profiles.length && (
        <Empty title="Connect when you’re ready">
          Manual projects work without keys. Add multiple profiles for the same
          provider or use a different provider at every stage.
        </Empty>
      )}
      {open && (
        <Modal
          title={editing ? "Edit provider profile" : "Add provider profile"}
          onClose={() => {
            setKey("");
            setOpen(false);
          }}
        >
          <Field label="Display name">
            <input
              value={config.name}
              onChange={(e) => patch({ name: e.target.value })}
            />
          </Field>
          <div className="grid-two">
            <Field label="Provider adapter / protocol">
              <select
                value={config.type}
                onChange={(e) => {
                  const type = e.target.value as ProviderConfig["type"];
                  patch({
                    type,
                    baseUrl:
                      type === "zenmux"
                        ? "https://zenmux.ai/api/v1"
                        : type === "elevenlabs"
                          ? "https://api.elevenlabs.io/v1"
                          : "https://api.openai.com/v1",
                    capabilities:
                      type === "elevenlabs" ? ["voice"] : ["script"],
                    languages: [],
                    model: type === "elevenlabs" ? "eleven_v4" : "enter-model-slug",
                    parameters: {},
                    supportedParameters: [],
                  });
                  setParameters("{}");
                }}
              >
                <option value="zenmux">ZenMux: OpenAI + native video</option>
                <option value="openai-compatible">
                  OpenAI compatible: text / images / transcription
                </option>
                <option value="elevenlabs">ElevenLabs: voice</option>
              </select>
            </Field>
            <Field label="Model identifier">
              <input
                value={config.model}
                onChange={(e) => patch({ model: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Base URL">
            <input
              value={config.baseUrl}
              onChange={(e) => patch({ baseUrl: e.target.value })}
            />
          </Field>
          <Field
            label={
              editing
                ? "New secret key (blank keeps existing)"
                : "Secret API key"
            }
          >
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              autoComplete="new-password"
            />
          </Field>
          {config.type === "elevenlabs" && (
            <p className="help">
              In ElevenLabs, allow Models read, Voices read and Text-to-Speech
              generation for this key. Add your selected voice to My Voices,
              then paste its voice ID below. Saving a key does not change its
              permissions or generate audio. After saving, use Check without
              generation, then select this profile as your voice default.
            </p>
          )}
          <div className="row wrap">
            {capabilities
              .filter((c) =>
                config.type === "elevenlabs"
                  ? c === "voice"
                  : config.type === "openai-compatible"
                    ? c !== "voice" && c !== "video"
                    : c !== "voice",
              )
              .map((c) => (
                <label className="checkbox" key={c}>
                  <input
                    type="checkbox"
                    checked={config.capabilities.includes(c)}
                    onChange={(e) =>
                      patch({
                        capabilities: e.target.checked
                          ? [...config.capabilities, c]
                          : config.capabilities.filter((x) => x !== c),
                      })
                    }
                  />
                  {c}
                </label>
              ))}
          </div>
          <div className="grid-three">
            <Field label="Timeout (seconds)">
              <input
                type="number"
                value={config.timeout}
                onChange={(e) => patch({ timeout: Number(e.target.value) })}
              />
            </Field>
            <Field label="Concurrent requests">
              <input
                type="number"
                value={config.concurrency}
                onChange={(e) => patch({ concurrency: Number(e.target.value) })}
              />
            </Field>
            <Field label="Estimated cost per call (USD)">
              <input
                type="number"
                step={0.001}
                value={config.pricePerCall ?? ""}
                onChange={(e) =>
                  patch({
                    pricePerCall: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  })
                }
              />
            </Field>
          </div>
          {config.type === "elevenlabs" && (
            <Field label="Default voice ID">
              <input
                value={config.voiceId}
                onChange={(e) => patch({ voiceId: e.target.value })}
              />
            </Field>
          )}
          <Field label="Supported parameter names (comma separated; use model documentation)">
            <input
              value={config.supportedParameters.join(",")}
              onChange={(e) =>
                patch({
                  supportedParameters: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
            />
          </Field>
          <Field label="Model parameters (JSON; only supported names are sent)">
            <textarea
              rows={4}
              value={parameters}
              onChange={(e) => setParameters(e.target.value)}
            />
          </Field>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={config.discovery}
              onChange={(e) => patch({ discovery: e.target.checked })}
            />{" "}
            Model discovery supported by this endpoint
          </label>
          <p className="help">
            Telugu voice support is checked against ElevenLabs model discovery
            at generation time. Character reference images are not sent by these
            adapters.
          </p>
          <Button onClick={() => void run(() => saveProfile(false))}>
            <Check size={15} /> Save encrypted profile
          </Button>
          <Button secondary onClick={() => void run(() => saveProfile(true))}>
            <RefreshCw size={15} /> Save and check connection
          </Button>
        </Modal>
      )}
    </main>
  );
}
function JobList({
  jobs,
  run,
  refresh,
}: {
  jobs: Job[];
  run: (fn: () => Promise<void>) => Promise<void>;
  refresh: () => Promise<void>;
}) {
  return (
    <div className="job-list">
      {jobs.map((j) => (
        <article className="panel job" key={j.id}>
          <div className={`job-icon ${j.state}`}>
            <Activity size={20} />
          </div>
          <div className="job-main">
            <div className="row">
              <strong>{j.kind}</strong>
              <span className="pill">{j.state}</span>
              <small>{j.id.slice(0, 8)}</small>
            </div>
            <p>{j.stage}</p>
            {j.error && <p className="error">{j.error}</p>}
            <small>
              {j.actualCost !== null && j.actualCost !== undefined
                ? `Reported $${j.actualCost}`
                : j.estimatedCost !== null && j.estimatedCost !== undefined
                  ? `Estimated $${j.estimatedCost}`
                  : "Cost unknown"}{" "}
              {j.providerJobId ? `· provider job ${j.providerJobId}` : ""}
            </small>
            {j.result?.text && (
              <details>
                <summary>Generated response</summary>
                <textarea readOnly rows={6} value={j.result.text} />
              </details>
            )}
          </div>
          <div className="row">
            {["failed", "waiting-for-input", "cancelled"].includes(j.state) && (
              <Button
                secondary
                onClick={() =>
                  void run(async () => {
                    let providerJobId: string | null = null,
                      acknowledgeNewCharge = false;
                    if (
                      j.kind !== "render" &&
                      j.kind !== "automatic" &&
                      !j.providerJobId &&
                      !j.result
                    ) {
                      providerJobId = window.prompt(
                        "If a provider submission may have succeeded, paste its job ID. Leave blank to consider a new request.",
                      );
                      if (!providerJobId) {
                        acknowledgeNewCharge = window.confirm(
                          "A new request may duplicate an earlier charge. Explicitly authorize a new paid attempt?",
                        );
                        if (!acknowledgeNewCharge) return;
                      }
                    }
                    await api(`jobs/${j.id}/retry`, "POST", {
                      providerJobId,
                      acknowledgeNewCharge,
                    });
                    await refresh();
                  })
                }
              >
                Resume
              </Button>
            )}
            {["queued", "running", "waiting-for-input"].includes(j.state) && (
              <Button
                secondary
                onClick={() =>
                  void run(async () => {
                    await api(`jobs/${j.id}/cancel`, "POST", {});
                    await refresh();
                  })
                }
              >
                Cancel locally
              </Button>
            )}
          </div>
        </article>
      ))}
      {!jobs.length && (
        <Empty title="Nothing in the queue">
          Generation and rendering jobs appear here with their real status.
        </Empty>
      )}
    </div>
  );
}
function SceneEditor({
  scene: s,
  assets,
  doc,
  profiles,
  edit,
  upload,
  run,
  generate,
  duplicate,
  remove,
  split,
  merge,
}: {
  scene: Scene;
  assets: Asset[];
  doc: ProjectDoc;
  profiles: Profile[];
  edit: (v: Partial<Scene>) => void;
  upload: (f: File) => Promise<Asset | undefined>;
  run: (fn: () => Promise<void>) => Promise<void>;
  generate: (kind: string, prompt?: string) => Promise<void>;
  duplicate: () => void;
  remove: () => void;
  split: () => void;
  merge: () => void;
}) {
  return (
    <section className="panel scene-editor">
      <div className="toolbar">
        <h2>{s.title}</h2>
        <div className="row">
          <button
            className="icon"
            title={s.locked ? "Unlock scene" : "Lock scene"}
            onClick={() => edit({ locked: !s.locked })}
          >
            {s.locked ? <Lock size={17} /> : <Unlock size={17} />}
          </button>
          <button className="icon" title="Duplicate scene" onClick={duplicate}>
            <Copy size={17} />
          </button>
          <button
            className="icon"
            title="Delete scene"
            disabled={s.locked}
            onClick={remove}
          >
            <Trash2 size={17} />
          </button>
        </div>
      </div>
      <Visual scene={s} asset={assets.find((a) => a.id === s.assetId)} />
      <fieldset disabled={s.locked}>
        <Field label="Scene title">
          <input
            value={s.title}
            onChange={(e) => edit({ title: e.target.value })}
          />
        </Field>
        <Field label="Narration">
          <textarea
            rows={4}
            value={s.narration}
            onChange={(e) => edit({ narration: e.target.value })}
          />
        </Field>
        <Field label="Character dialogue / notes">
          <textarea
            value={s.dialogue}
            onChange={(e) => edit({ dialogue: e.target.value })}
          />
        </Field>
        <Field label="Visual description">
          <textarea
            value={s.visual}
            onChange={(e) => edit({ visual: e.target.value })}
          />
        </Field>
        <div className="grid-two">
          <Field label="Media strategy">
            <select
              value={s.mediaType}
              onChange={(e) =>
                edit({ mediaType: e.target.value as Scene["mediaType"] })
              }
            >
              <option value="image">Animated still image</option>
              <option value="video">Video clip</option>
            </select>
          </Field>
          <Field label="Duration (seconds)">
            <input
              type="number"
              min={0.5}
              step={0.1}
              value={s.duration}
              onChange={(e) => edit({ duration: Number(e.target.value) })}
            />
          </Field>
        </div>
        {(["image", "video"] as const).map((k) => (
          <Field key={k} label={`${k} prompt`}>
            <textarea
              rows={3}
              value={s[k === "image" ? "imagePrompt" : "videoPrompt"]}
              onChange={(e) =>
                edit({
                  [k === "image" ? "imagePrompt" : "videoPrompt"]:
                    e.target.value,
                })
              }
            />
          </Field>
        ))}
        <div className="row wrap">
          <label className="btn secondary">
            <Upload size={14} /> Upload visual
            <input
              hidden
              type="file"
              accept="image/png,image/jpeg,image/webp,video/mp4,video/webm"
              onChange={(e) =>
                void run(async () => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const a = await upload(f);
                  if (a)
                    edit({
                      assetId: a.id,
                      mediaType: a.kind as Scene["mediaType"],
                      status: "Media ready",
                      alternatives: [...s.alternatives, a.id],
                    });
                })
              }
            />
          </label>
          <Button onClick={() => void run(() => generate(s.mediaType))}>
            <Sparkles size={14} /> Generate {s.mediaType}
          </Button>
          <Button
            secondary
            onClick={() =>
              void run(() =>
                generate(
                  "script",
                  `Rewrite this one section in ${doc.language}; only return narration. ${s.narration}`,
                ),
              )
            }
          >
            Rewrite section
          </Button>
        </div>
        <Field label="Selected visual / previous versions">
          <select
            value={s.assetId || ""}
            onChange={(e) =>
              edit({
                assetId: e.target.value || undefined,
                status: "Media ready",
              })
            }
          >
            <option value="">Choose media</option>
            {assets
              .filter((a) => a.kind === "image" || a.kind === "video")
              .map((a) => (
                <option value={a.id} key={a.id}>
                  {a.name}
                  {s.alternatives.includes(a.id) ? " · previous version" : ""}
                </option>
              ))}
          </select>
        </Field>
        <div className="row wrap">
          {s.alternatives.map((id) => (
            <button
              className="alternative"
              key={id}
              onClick={() => edit({ assetId: id })}
            >
              <Visual asset={assets.find((a) => a.id === id)} />
            </button>
          ))}
        </div>
        <div className="row">
          <Button secondary onClick={split}>
            Split narration in half
          </Button>
          <Button secondary onClick={merge}>
            Merge with next scene
          </Button>
        </div>
        <details>
          <summary>Scene provider and stage overrides</summary>
          {capabilities.map((c) => (
            <div className="grid-two" key={c}>
              <Field label={`${c} provider`}>
                <select
                  value={s.providers[c] || ""}
                  onChange={(e) =>
                    edit({ providers: { ...s.providers, [c]: e.target.value } })
                  }
                >
                  <option value="">Use project / global default</option>
                  {profiles
                    .filter((p) => p.config.capabilities.includes(c))
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.config.name}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label={`${c} input mode`}>
                <select
                  value={s.modes[c] || "api"}
                  onChange={(e) =>
                    edit({
                      modes: {
                        ...s.modes,
                        [c]: e.target.value as "manual" | "api",
                      },
                    })
                  }
                >
                  <option value="api">API generation</option>
                  <option value="manual">Manual input</option>
                </select>
              </Field>
            </div>
          ))}
        </details>
      </fieldset>
      {s.locked && (
        <p className="help">
          This scene is locked. Unlock it to edit or regenerate.
        </p>
      )}
    </section>
  );
}
function CharacterEditor({
  doc,
  patch,
  assets,
}: {
  doc: ProjectDoc;
  patch: (p: Partial<ProjectDoc>) => void;
  assets: Asset[];
}) {
  return (
    <section className="panel">
      <h2>Characters & visual consistency</h2>
      <Field label="Reusable project style guide">
        <textarea
          value={doc.styleGuide}
          onChange={(e) => patch({ styleGuide: e.target.value })}
        />
      </Field>
      {doc.characters.map((c) => (
        <div className="grid-three" key={c.id}>
          <Field label="Character name">
            <input
              value={c.name}
              onChange={(e) =>
                patch({
                  characters: doc.characters.map((x) =>
                    x.id === c.id ? { ...x, name: e.target.value } : x,
                  ),
                })
              }
            />
          </Field>
          <Field label="Appearance and traits">
            <input
              value={c.description}
              onChange={(e) =>
                patch({
                  characters: doc.characters.map((x) =>
                    x.id === c.id ? { ...x, description: e.target.value } : x,
                  ),
                })
              }
            />
          </Field>
          <Field label="Voice ID">
            <input
              value={c.voiceId}
              onChange={(e) =>
                patch({
                  characters: doc.characters.map((x) =>
                    x.id === c.id ? { ...x, voiceId: e.target.value } : x,
                  ),
                })
              }
            />
          </Field>
          <Field label="Reference asset">
            <select
              value={c.referenceAssetId || ""}
              onChange={(e) =>
                patch({
                  characters: doc.characters.map((x) =>
                    x.id === c.id
                      ? { ...x, referenceAssetId: e.target.value || undefined }
                      : x,
                  ),
                })
              }
            >
              <option value="">None</option>
              {assets
                .filter((a) => a.kind === "image")
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
            </select>
          </Field>
        </div>
      ))}
      <Button
        secondary
        onClick={() =>
          patch({
            characters: [
              ...doc.characters,
              {
                id: crypto.randomUUID(),
                name: "New character",
                description: "",
                voiceId: "",
              },
            ],
          })
        }
      >
        <Plus size={14} /> Add character
      </Button>
      <p className="help">
        Character descriptions are included in prompts. Image references remain
        available for manual tools. Current adapters do not send reference
        images; consistency depends on the model.
      </p>
    </section>
  );
}
function PromptWorkspace({
  doc,
  scene,
  scenes,
  select,
  saved,
  patch,
  editScene,
  copy,
  download,
  setStage,
  upload,
  run,
  assets,
  generateImage,
  imageConfigured,
  configureImage,
}: {
  doc: ProjectDoc;
  scene?: Scene;
  scenes: Scene[];
  select: (id: string) => void;
  saved: Template[];
  patch: (p: Partial<ProjectDoc>) => void;
  editScene: (id: string, p: Partial<Scene>) => void;
  copy: (s: string) => Promise<void>;
  download: (v: unknown, n: string) => void;
  setStage: (s: string) => void;
  upload: (f: File) => Promise<Asset | undefined>;
  run: (f: () => Promise<void>) => Promise<void>;
  assets: Asset[];
  generateImage: (id: string, prompt: string) => Promise<void>;
  imageConfigured: boolean;
  configureImage: () => void;
}) {
  const [type, setType] = useState("script"),
    [response, setResponse] = useState("");
  const expanded = expandPrompt(
    type,
    doc,
    scene,
    saved.find((t) => t.stage === type)?.body,
  );
  return (
    <div>
      {scene && (
        <section className="panel">
          <h2>Saved image and editable prompt</h2>
          <div className="grid-two">
            <div>{assets.find(a => a.id === scene.assetId)?.kind === "image" ? (
              <img src={`/api/assets/${scene.assetId}`} alt={scene.title} style={{ width: "100%", maxHeight: 520, objectFit: "contain", borderRadius: 8, background: "#0b1015" }} />
            ) : <Visual asset={assets.find(a => a.id === scene.assetId)} scene={scene} />}</div>
            <div>
              <Field label="Saved image prompt"><textarea rows={7} disabled={scene.locked} value={scene.imagePrompt} onChange={e => editScene(scene.id, { imagePrompt: e.target.value })} /></Field>
              <Field label="Reviewed background image"><select disabled={scene.locked} value={scene.assetId || ""} onChange={e => editScene(scene.id, { assetId: e.target.value || undefined, mediaType: "image" })}>
                <option value="">No image selected</option>
                {assets.filter(a => a.kind === "image").map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select></Field>
              <Button disabled={scene.locked || !scene.imagePrompt.trim() || !imageConfigured} onClick={() => void run(() => generateImage(scene.id, scene.imagePrompt))}><Sparkles size={15} /> Generate image from saved prompt</Button>
              {!imageConfigured && <p className="help">Choose an image provider in AI Providers and the project setup to generate from this prompt. <button className="btn secondary" onClick={configureImage}>Configure image provider</button></p>}
              <p className="help">Generation uses your independently configured image provider and credits. You can also upload a new image in Assets and choose it here. Voice and captions are retained when only the visual changes.</p>
            </div>
          </div>
        </section>
      )}
    <div className="editor-columns">
      <section className="panel">
        <div className="toolbar">
          <h2>Manual prompt workspace</h2>
          <div className="row">
            <select value={type} onChange={(e) => setType(e.target.value)}>
              {Object.keys(templates).map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <select
              value={scene?.id || ""}
              onChange={(e) => select(e.target.value)}
            >
              <option value="">Project context</option>
              {scenes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </div>
        </div>
        <Field label="Expanded prompt · ready for an external tool">
          <textarea rows={12} readOnly value={expanded} />
        </Field>
        <div className="row">
          <Button onClick={() => void run(() => copy(expanded))}>
            <Copy size={15} /> Copy prompt
          </Button>
          <Button
            secondary
            onClick={() =>
              download(
                scenes.map((s) => ({
                  id: s.id,
                  title: s.title,
                  image: expandPrompt("image", doc, s),
                  video: expandPrompt("video", doc, s),
                })),
                "expanded-prompts.json",
              )
            }
          >
            Export all prompts
          </Button>
        </div>
        <Field label="Template override (variables use {{name}})">
          <textarea
            rows={4}
            value={
              (scene?.promptOverrides[type] || doc.promptOverrides[type]) ?? ""
            }
            placeholder={templates[type]}
            onChange={(e) =>
              scene
                ? editScene(scene.id, {
                    promptOverrides: {
                      ...scene.promptOverrides,
                      [type]: e.target.value,
                    },
                  })
                : patch({
                    promptOverrides: {
                      ...doc.promptOverrides,
                      [type]: e.target.value,
                    },
                  })
            }
          />
        </Field>
        <Field label="Paste output from your external tool">
          <textarea
            rows={8}
            value={response}
            onChange={(e) => setResponse(e.target.value)}
          />
        </Field>
        <div className="row wrap">
          <Button
            onClick={() =>
              void run(async () => {
                if (!response.trim()) throw Error("Paste a response first");
                if (type === "storyboard") {
                  const raw = JSON.parse(
                    response
                      .replace(/^```(?:json)?\s*/, "")
                      .replace(/\s*```$/, ""),
                  );
                  const list = sceneSchema.array().parse(
                    raw.map((s: object, i: number) => ({
                      ...newScene(i + 1),
                      ...s,
                    })),
                  );
                  const locked = doc.scenes.filter((s) => s.locked);
                  const all = [...locked, ...list];
                  patch({
                    scenes: all,
                    variants: doc.variants.map((v) => ({
                      ...v,
                      sceneIds: all.map((s) => s.id),
                    })),
                  });
                } else if (type === "publishing")
                  patch({
                    publishing: projectSchema.shape.publishing.parse(
                      JSON.parse(response),
                    ),
                  });
                else if (type === "script") patch({ script: response });
                else if (type === "research") patch({ outline: response });
                else if (type === "image" && scene)
                  editScene(scene.id, { imagePrompt: response });
                else if (type === "video" && scene)
                  editScene(scene.id, { videoPrompt: response });
                else if (type === "voice" && scene)
                  editScene(scene.id, { narration: response });
                else if (type === "thumbnail")
                  patch({
                    publishing: {
                      ...doc.publishing,
                      thumbnailPrompt: response,
                    },
                  });
                else throw Error("Select a scene for this output");
              })
            }
          >
            <Check size={14} /> Validate & apply response
          </Button>
          <label className="btn secondary">
            <Upload size={14} /> Upload output
            <input
              type="file"
              hidden
              onChange={(e) =>
                void run(async () => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  if (!scene) throw Error("Select a scene before uploading");
                  const a = await upload(f);
                  if (a)
                    editScene(
                      scene.id,
                      a.kind === "audio"
                        ? {
                            audioId: a.id, audioStart: 0, audioSlice: false,
                            duration: a.duration || scene.duration,
                            narrationStale: false,
                          }
                        : {
                            assetId: a.id,
                            mediaType: a.kind as "image" | "video",
                            status: "Media ready",
                          },
                    );
                })
              }
            />
          </label>
          <Button secondary onClick={() => setStage("Storyboard")}>
            Continue to storyboard
          </Button>
        </div>
      </section>
      <aside className="panel narrow">
        <h3>Make it your own</h3>
        <p>
          Use any external tool. Paste text or upload the output here and keep
          producing without API credentials.
        </p>
        <p className="help">
          Storyboard responses must be a JSON array. Each scene needs title,
          narration, visual, imagePrompt, videoPrompt, duration, and mediaType.
          Stable IDs are assigned when absent.
        </p>
        <p className="help">
          Uploaded files are never guessed into scenes. Select their destination
          explicitly.
        </p>
      </aside>
    </div>
    </div>
  );
}
function VoicePage({
  doc,
  selected,
  select,
  assets,
  profiles,
  edit,
  patch,
  generate,
  upload,
  run,
}: {
  doc: ProjectDoc;
  selected: string;
  select: (s: string) => void;
  assets: Asset[];
  profiles: Profile[];
  edit: (p: Partial<Scene>) => void;
  patch: (p: Partial<ProjectDoc>) => void;
  generate: (k: string) => Promise<void>;
  upload: (f: File) => Promise<Asset | undefined>;
  run: (f: () => Promise<void>) => Promise<void>;
}) {
  const s = doc.scenes.find((s) => s.id === selected);
  const [voices, setVoices] = useState<{ id: string; name: string }[]>([]);
  return (
    <section className="panel">
      <div className="toolbar">
        <h2>Give your story a voice</h2>
        <select value={selected} onChange={(e) => select(e.target.value)}>
          {doc.scenes.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
      </div>
      {s ? (
        <>
          <fieldset disabled={s.locked}>
            <p>{s.narration}</p>
            <div className="grid-two">
              <Field label="Voice ID override">
                <input
                  value={s.voiceId}
                  onChange={(e) => edit({ voiceId: e.target.value })}
                  list="voices"
                />
                <datalist id="voices">
                  {voices.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </datalist>
              </Field>
              <Field label="Character voice assignment">
                <select
                  defaultValue=""
                  onChange={(e) =>
                    edit({
                      voiceId:
                        doc.characters.find((c) => c.id === e.target.value)
                          ?.voiceId || "",
                    })
                  }
                >
                  <option value="">Choose character</option>
                  {doc.characters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="row wrap">
              <select
                aria-label="Use saved narration version"
                value=""
                onChange={(e) => {
                  const a = assets.find((a) => a.id === e.target.value);
                  if (a)
                    edit({
                      audioId: a.id, audioStart: 0, audioSlice: false,
                      duration: a.duration || s.duration,
                      narrationStale: false,
                      captionsStale: !!s.captions.length,
                    });
                }}
              >
                <option value="">Use a saved narration recording</option>
                {assets
                  .filter((a) => a.kind === "audio")
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} · {fmt(a.duration || 0)}
                    </option>
                  ))}
              </select>
              <Button onClick={() => void run(() => generate("voice"))}>
                <AudioLines size={15} /> Generate narration
              </Button>
              <Button
                secondary
                onClick={() =>
                  void run(async () => {
                    const p =
                      profiles.find(
                        (p) =>
                          p.id === (s.providers.voice || doc.providers.voice),
                      ) || profiles.find((p) => p.config.type === "elevenlabs");
                    if (!p) throw Error("Add an ElevenLabs profile");
                    setVoices(await api(`providers/${p.id}/voices`));
                  })
                }
              >
                Discover voices
              </Button>
              <label className="btn secondary">
                <Upload size={15} /> Upload narration
                <input
                  type="file"
                  accept="audio/mpeg,audio/wav"
                  hidden
                  onChange={(e) =>
                    void run(async () => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const a = await upload(f);
                      if (a)
                        edit({
                          audioId: a.id, audioStart: 0, audioSlice: false,
                          duration: a.duration || s.duration,
                          narrationStale: false,
                          captionsStale: !!s.captions.length,
                        });
                    })
                  }
                />
              </label>
            </div>
            {s.audioId && (
              <div className="audio-preview">
                <audio controls src={`/api/assets/${s.audioId}`} />
                <p>
                  Measured narration:{" "}
                  {fmt(assets.find((a) => a.id === s.audioId)?.duration || 0)}
                </p>
                <Button
                  secondary
                  onClick={() =>
                    edit({
                      duration:
                        assets.find((a) => a.id === s.audioId)?.duration ||
                        s.duration,
                    })
                  }
                >
                  Use measured duration
                </Button>
              </div>
            )}
            {s.narrationStale && (
              <div className="warning">
                Narration text changed. Generate or upload a new recording, or
                explicitly review the existing recording.
                <Button
                  secondary
                  onClick={() => edit({ narrationStale: false })}
                >
                  I reviewed this recording
                </Button>
              </div>
            )}
            <div className="section-heading">
              <div>
                <h2>Captions</h2>
                <p>
                  Scene-relative timing in seconds. Translations keep the
                  original timeline.
                </p>
              </div>
              <div className="row wrap">
                <Button
                  secondary
                  onClick={() =>
                    edit({
                      captions: approximateCaptions(s),
                      captionsStale: false,
                    })
                  }
                >
                  Approximate phrases
                </Button>
                <Button
                  secondary
                  onClick={() => void run(() => generate("transcription"))}
                >
                  Transcribe audio
                </Button>
                <Button
                  secondary
                  onClick={() =>
                    edit({
                      captions: [
                        ...s.captions,
                        {
                          id: crypto.randomUUID(),
                          start: 0,
                          end: s.duration,
                          text: "New caption",
                          accuracy: "manual",
                        },
                      ],
                    })
                  }
                >
                  <Plus size={14} /> Add caption
                </Button>
              </div>
            </div>
            {s.captionsStale && (
              <div className="warning">
                Captions need review after narration changes.
                <Button
                  secondary
                  onClick={() => edit({ captionsStale: false })}
                >
                  Mark timing reviewed
                </Button>
              </div>
            )}
            {s.captions.map((c, i) => (
              <div className="caption-row" key={c.id}>
                <span>{i + 1}</span>
                <input
                  type="number"
                  aria-label="Caption start"
                  step={0.01}
                  value={c.start}
                  onChange={(e) =>
                    edit({
                      captions: s.captions.map((x) =>
                        x.id === c.id
                          ? {
                              ...x,
                              start: Number(e.target.value),
                              accuracy: "manual",
                            }
                          : x,
                      ),
                    })
                  }
                />
                <span>→</span>
                <input
                  type="number"
                  aria-label="Caption end"
                  step={0.01}
                  value={c.end}
                  onChange={(e) =>
                    edit({
                      captions: s.captions.map((x) =>
                        x.id === c.id
                          ? {
                              ...x,
                              end: Number(e.target.value),
                              accuracy: "manual",
                            }
                          : x,
                      ),
                    })
                  }
                />
                <textarea
                  rows={c.display === "full-verse" ? 3 : 2}
                  value={c.text}
                  aria-label="Caption text"
                  onChange={(e) =>
                    edit({
                      captions: s.captions.map((x) =>
                        x.id === c.id
                          ? {
                              ...x,
                              text: e.target.value,
                              words: undefined,
                              accuracy: "manual",
                            }
                          : x,
                      ),
                    })
                  }
                />
                <label className="checkbox">
                  <input type="checkbox" checked={c.display === "full-verse"} onChange={(e) => edit({captions: s.captions.map((x) => x.id === c.id ? {...x, display: e.target.checked ? "full-verse" : undefined} : x)})} />
                  Keep complete verse on screen during this cue (even with captions off)
                </label>
                <span className="pill">{c.accuracy}</span>
                <button
                  className="icon"
                  aria-label="Delete caption"
                  onClick={() =>
                    edit({ captions: s.captions.filter((x) => x.id !== c.id) })
                  }
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </fieldset>
          <p className="help">
            Automatic approximate captions are never presented as accurate
            alignment. ElevenLabs timestamp responses produce phrase timing;
            phrase text can be translated without changing start/end times.
          </p>
        </>
      ) : (
        <Empty title="Add a scene first">
          Narration and captions are associated with individual scenes.
        </Empty>
      )}
    </section>
  );
}
function TimelineEditor({
  doc,
  variant: v,
  assets,
  selected,
  select,
  editScene: editBaseScene,
  patch,
  variantId,
  setVariant,
  undo,
  redo,
  upload,
  run,
  generate,
}: {
  doc: ProjectDoc;
  variant?: Variant;
  assets: Asset[];
  selected: string;
  select: (s: string) => void;
  editScene: (id: string, p: Partial<Scene>) => void;
  patch: (p: Partial<ProjectDoc>) => void;
  variantId: string;
  setVariant: (id: string) => void;
  undo: () => void;
  redo: () => void;
  upload: (f: File) => Promise<Asset | undefined>;
  run: (f: () => Promise<void>) => Promise<void>;
  generate: (
    kind: string,
    sceneId?: string,
    operation?: string,
    prompt?: string,
    variantScoped?: boolean,
  ) => Promise<void>;
}) {
  const [playhead, setPlayhead] = useState(0),
    [playing, setPlaying] = useState(false);
  const tracks = v ? timeline(doc, v) : [];
  const total = v ? duration(doc, v) : 0;
  const timing = v ? durationSummary(doc, v, assets) : undefined;
  useEffect(() => {
    setPlayhead(0);
    setPlaying(false);
  }, [variantId]);
  useEffect(() => {
    if (v && !v.sceneIds.includes(selected)) select(v.sceneIds[0]);
  }, [v, selected, select]);
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(
      () =>
        setPlayhead((p) => {
          if (p + 0.1 >= total) {
            setPlaying(false);
            return 0;
          }
          return p + 0.1;
        }),
      100,
    );
    return () => clearInterval(t);
  }, [playing, total]);
  const s = tracks.find((t) => t.scene.id === selected)?.scene || tracks[0]?.scene;
  const editScene = (id: string, p: Partial<Scene>) => {
    if (!v || !v.sceneIds.includes(id)) return;
    const base = v.sceneOverrides[id] || doc.scenes.find((s) => s.id === id);
    if (base)
      patch({
        variants: doc.variants.map((x) =>
          x.id === v.id
            ? {
                ...x,
                sceneOverrides: {
                  ...x.sceneOverrides,
                  [id]: { ...base, ...p },
                },
              }
            : x,
        ),
      });
  };
  const active = tracks.find((t) => playhead >= t.start && playhead < t.end);
  const previewScene = active
    ? {
        ...active.scene,
        focalX: v?.framing[active.scene.id]?.x ?? active.scene.focalX,
        focalY: v?.framing[active.scene.id]?.y ?? active.scene.focalY,
      }
    : undefined;
  const activeCaption = active?.scene.captions.find(
    (c) =>
      playhead - active.start >= c.start && playhead - active.start < c.end,
  );
  const captionPage = active && activeCaption && v ? layoutCaptions([activeCaption], {
    maxWidthPx: Math.floor((v.aspect === "vertical" ? 1080 * .8 : 1920 * .84) * .92),
    fontPx: Math.round(v.fontSize * (v.aspect === "vertical" ? 1920 : 1080) / 1080),
  }).find(p => playhead - active.start >= p.start && playhead - active.start < p.end) : undefined;
  const pageWords = captionPage?.lines.flat() ?? [];
  const updateVariant = (p: Partial<Variant>) =>
    v &&
    patch({
      variants: doc.variants.map((x) => (x.id === v.id ? { ...x, ...p } : x)),
    });
  const addBookend = (assetId: string, at: "intro" | "outro") => {
    const asset = assets.find((a) => a.id === assetId);
    if (!asset || !v) return;
    const scene = {
      ...newScene(),
      title: at === "intro" ? "Intro" : "Outro",
      assetId: asset.id,
      mediaType:
        asset.kind === "video" ? ("video" as const) : ("image" as const),
      duration: Math.max(0.5, asset.duration || 3),
      narration: "",
    };
    patch({
      scenes: at === "intro" ? [scene, ...doc.scenes] : [...doc.scenes, scene],
      variants: doc.variants.map((x) =>
        x.id === v.id
          ? {
              ...x,
              sceneIds:
                at === "intro"
                  ? [scene.id, ...x.sceneIds]
                  : [...x.sceneIds, scene.id],
            }
          : x,
      ),
      [at === "intro" ? "introId" : "outroId"]: assetId,
    });
    select(scene.id);
  };
  return (
    <>
      <div className="toolbar" style={{ flexWrap: "wrap" }}>
        <h2>Timeline editor</h2>
        <div className="row wrap">
          <Button secondary onClick={undo}>
            <Undo2 size={14} /> Undo
          </Button>
          <Button secondary onClick={redo}>
            <Redo2 size={14} /> Redo
          </Button>
          <select
            value={v?.id || ""}
            onChange={(e) => setVariant(e.target.value)}
          >
            {doc.variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
          <Button secondary onClick={() => void run(async () => {
            if (!v) return;
            const next = landscapeShotVersion(doc, v.id);
            patch({ scenes: next.document.scenes, variants: next.document.variants });
            setVariant(next.variant.id); select(next.variant.sceneIds[0]);
          })}>New 16:9 version · 8-second shots</Button>
          <Button secondary onClick={() => void run(async () => {
            if (!v) return;
            const next = addCallToAction(doc, v.id);
            patch({ scenes: next.document.scenes, variants: next.document.variants }); select(next.scene.id);
          })}>Add subscribe / like / comment</Button>
          <Button secondary onClick={() => void run(async () => {
            if (!v) return;
            const pack = visualPromptPack(doc, v.id), blob = new Blob([JSON.stringify(pack, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob), a = document.createElement("a"); a.href = url; a.download = `${v.id}-visual-prompts.json`; a.click(); URL.revokeObjectURL(url);
          })}>Download timed prompts for any AI</Button>
          <Button
            secondary
            onClick={() => {
              if (!v) return;
              const next = {
                ...structuredClone(v),
                id: crypto.randomUUID(),
                name: "Shorts / Reels",
                aspect: "vertical" as const,
                targetDuration: doc.shortTargetDuration,
                maxDuration: 180,
                sceneOverrides: Object.fromEntries(
                  tracks.map((t) => [t.scene.id, structuredClone(t.scene)]),
                ),
              };
              patch({ variants: [...doc.variants, next] });
              setVariant(next.id);
            }}
          >
            New vertical variant
          </Button>
        </div>
      </div>
      {v ? (
        <>
          {timing && (
            <section className="panel">
              <h3>
                Target {fmt(timing.target)} · Actual timeline{" "}
                {fmt(timing.actual)}
              </h3>
              <p className="help">
                Measured narration: {fmt(timing.measuredNarration)}
                {!timing.narrationComplete
                  ? " · Some recordings are missing"
                  : ""}
                . Actual timing includes scenes, pauses and transition overlap.
                Narration is played at its natural speed.
              </p>
              {Math.abs(timing.target - timing.actual) > 1 && (
                <div className="row wrap">
                  <Button
                    secondary
                    onClick={() =>
                      void run(() =>
                        generate(
                          "script",
                          undefined,
                          "variant-shorten",
                          undefined,
                          true,
                        ),
                      )
                    }
                  >
                    Shorten this variant's script
                  </Button>
                  <Button
                    secondary
                    onClick={() =>
                      void run(() =>
                        generate(
                          "script",
                          undefined,
                          "variant-expand",
                          undefined,
                          true,
                        ),
                      )
                    }
                  >
                    Expand this variant's script
                  </Button>
                  <Button
                    secondary
                    onClick={() => {
                      if (v)
                        updateVariant({
                          targetDuration: Math.max(
                            1,
                            Math.round(timing.actual),
                          ),
                        });
                    }}
                  >
                    Accept actual duration
                  </Button>
                </div>
              )}
              <p className="help">
                Adjust pauses using scene duration below, or rewrite and
                regenerate affected narration. The original timeline stays
                available; paid generation requires confirmation.
              </p>
            </section>
          )}
          <div className="editor-columns">
            <section className="panel">
              <div className={`timeline-monitor ${v.aspect}`}>
                <div className="preview-placeholder">
                  <div
                    className="motion-preview"
                    style={
                      active
                        ? {
                            transform: `scale(${motionState(active.scene, (playhead - active.start) / active.scene.duration).zoom})`,
                            transformOrigin: `${motionState(active.scene, (playhead - active.start) / active.scene.duration).x * 100}% ${motionState(active.scene, (playhead - active.start) / active.scene.duration).y * 100}%`,
                          }
                        : undefined
                    }
                  >
                    <Visual
                      scene={previewScene}
                      asset={assets.find((a) => a.id === active?.scene.assetId)}
                    />
                  </div>
                  {(v.logoId === undefined ? doc.logoId : v.logoId) && playhead >= (v.logoStart ?? 0) && (
                    <img src={`/api/assets/${v.logoId === undefined ? doc.logoId : v.logoId}`} alt="Channel logo" style={{position: "absolute", top: "2%", right: "3%", width: "12%", zIndex: 2}} />
                  )}
                  {active && (v.captions || activeCaption?.display === "full-verse") && (
                    <div
                      className="browser-caption"
                      style={{
                        fontFamily:
                          v.font === "Noto Sans Telugu" ||
                          (!v.font && doc.subtitleLanguage === "te")
                            ? "Telugu"
                            : v.font === "Noto Sans Devanagari" ||
                                (!v.font && doc.subtitleLanguage === "hi")
                              ? "Devanagari"
                              : "Studio, Telugu, Devanagari",
                        fontSize: v.fontSize / 3 * (captionPage?.scale ?? 1),
                        color: v.color,
                        background: v.background && activeCaption?.display !== "full-verse"
                          ? "rgba(0,0,0,.65)"
                          : undefined,
                        whiteSpace: activeCaption?.display === "full-verse" ? "pre-line" : undefined,
                        transform: activeCaption?.display === "full-verse" ? "translateY(-50%)" : undefined,
                        lineHeight: activeCaption?.display === "full-verse" ? 1.6 : undefined,
                        top:
                          activeCaption?.display === "full-verse" ? "50%" : v.position === "top"
                            ? "8%"
                            : v.position === "center"
                              ? "45%"
                              : undefined,
                        bottom: activeCaption?.display === "full-verse" ? "auto" : v.position === "bottom" ? `${(v.captionBottom ?? (v.aspect === "vertical" ? .2 : .07)) * 100}%` : "auto",
                        textShadow: `0 0 ${v.outline}px #000`,
                      }}
                    >
                      {captionPage?.lines.map((line, lineIndex) => <span key={lineIndex} style={{display: "block"}}>{line.map((word, i) => {
                        const index = pageWords.indexOf(word);
                        const highlighted = v.wordHighlight && !captionPage.held && captionPage.timed && word.start !== undefined && playhead - active.start >= (index === 0 ? captionPage.start : word.start) && playhead - active.start < (pageWords[index + 1]?.start ?? captionPage.end);
                        return <span key={i} style={{color: highlighted ? v.highlightColor : v.color}}>{word.text}{" "}</span>;
                      })}</span>)}
                    </div>
                  )}
                </div>
              </div>
              <p className="help">
                Editing monitor shows scene and caption timing. Render a draft
                for accurate motion, crossfades and audio playback.
              </p>
              <div className="player-controls">
                <button
                  className="icon"
                  aria-label={playing ? "Pause timeline" : "Play timeline"}
                  onClick={() => setPlaying(!playing)}
                >
                  <Play size={18} />
                </button>
                <input
                  type="range"
                  min={0}
                  max={total}
                  step={0.01}
                  value={playhead}
                  onChange={(e) => setPlayhead(Number(e.target.value))}
                  aria-label="Timeline playhead"
                />
                <span>
                  {fmt(playhead)} / {fmt(total)}
                </span>
              </div>
            </section>
            <aside className="panel narrow">
              {s && (
                <fieldset disabled={s.locked}>
                  <h3>{s.title} controls</h3>
                  <Field label="Variant narration">
                    <textarea
                      value={s.narration}
                      onChange={(e) =>
                        editScene(s.id, { narration: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Voice ID for this scene"><input value={s.voiceId} onChange={e => editScene(s.id, { voiceId: e.target.value })} /></Field>
                  <Field label="Recording start timestamp (seconds)"><input type="number" min={0} step={0.01} value={s.audioStart} onChange={e => editScene(s.id, { audioStart: Number(e.target.value), audioSlice: true, captionsStale: !!s.captions.length })} /></Field>
                  {s.audioId && <audio key={`${s.id}-${s.audioId}-${s.audioStart}`} controls src={`/api/assets/${s.audioId}`} onLoadedMetadata={e => { e.currentTarget.currentTime = s.audioStart; }} onTimeUpdate={e => { if (s.audioSlice && e.currentTarget.currentTime >= s.audioStart + s.duration) e.currentTarget.pause(); }} />}
                  <p className="help">This scene uses {s.audioStart.toFixed(2)}–{(s.audioStart + s.duration).toFixed(2)} seconds of its recording. Changing an image keeps this audio range and its volume. Generate a new voice take per scene, or assign another uploaded recording; rebuild captions if timing changes.</p>
                  <div className="scene-visual-pick">
                    {s.assetId && assets.find(a => a.id === s.assetId)?.kind === "image" && <img src={`/api/assets/${s.assetId}`} alt={`Current image for ${s.title}`} />}
                    <label className="btn secondary">
                      <Upload size={14} /> Upload my own image / video
                      <input type="file" accept="image/*,video/*" hidden onChange={e => {
                        const f = e.target.files?.[0];
                        e.target.value = "";
                        // Uploads and assigns in one step; the scene keeps its recording, timing and captions.
                        if (f) void run(async () => { const a = await upload(f); if (a) editScene(s.id, { assetId: a.id, mediaType: a.kind === "video" ? "video" : "image" }); });
                      }} />
                    </label>
                  </div>
                  <Field label="Image / video for this shot"><select value={s.assetId || ""} onChange={e => { const a = assets.find(a => a.id === e.target.value); if (a) editScene(s.id, { assetId: a.id, mediaType: a.kind === "video" ? "video" : "image" }); }}><option value="">Choose uploaded or generated visual</option>{assets.filter(a => a.kind === "image" || a.kind === "video").map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
                  <Field label="Saved image prompt"><textarea value={s.imagePrompt} onChange={e => editScene(s.id, { imagePrompt: e.target.value })} /></Field>
                  <Field label="Saved video prompt"><textarea value={s.videoPrompt} onChange={e => editScene(s.id, { videoPrompt: e.target.value })} /></Field>
                  {s.narrationStale && (
                    <p className="warning">
                      Narration changed. Regenerate or assign a new recording
                      before exporting.
                    </p>
                  )}
                  <Button
                    secondary
                    onClick={() =>
                      void run(() =>
                        generate("voice", s.id, undefined, undefined, true),
                      )
                    }
                  >
                    Regenerate variant narration
                  </Button>
                  <select
                    value=""
                    aria-label="Assign variant narration"
                    onChange={(e) => {
                      const a = assets.find((a) => a.id === e.target.value);
                      if (a)
                        editScene(s.id, {
                          audioId: a.id,
                          audioStart: 0,
                          audioSlice: false,
                          duration: a.duration || s.duration,
                          narrationStale: false,
                          captionsStale: !!s.captions.length,
                        });
                    }}
                  >
                    <option value="">Assign uploaded narration</option>
                    {assets
                      .filter((a) => a.kind === "audio")
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                  </select>
                  <div className="grid-two">
                    <Field label="Duration (seconds)">
                      <input
                        type="number"
                        step={0.1}
                        value={s.duration}
                        onChange={(e) =>
                          editScene(s.id, { duration: Number(e.target.value) })
                        }
                      />
                    </Field>
                    <Field label="Clip in point">
                      <input
                        type="number"
                        step={0.1}
                        value={s.trimStart}
                        onChange={(e) =>
                          editScene(s.id, { trimStart: Number(e.target.value) })
                        }
                      />
                    </Field>
                  </div>
                  <Field label="Motion preset">
                    <select
                      value={s.motion}
                      onChange={(e) =>
                        editScene(s.id, {
                          motion: e.target.value as Scene["motion"],
                        })
                      }
                    >
                      {[
                        "static",
                        "zoom-in",
                        "zoom-out",
                        "pan-left",
                        "pan-right",
                        "pan-up",
                        "pan-down",
                      ].map((m) => (
                        <option key={m}>{m}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Motion strength">
                    <input
                      type="range"
                      min={0}
                      max={0.4}
                      step={0.01}
                      value={s.strength}
                      onChange={(e) =>
                        editScene(s.id, { strength: Number(e.target.value) })
                      }
                    />
                  </Field>
                  <Field label="Camera movement">
                    <select value={s.motionEasing ?? "linear"} onChange={e => editScene(s.id, {motionEasing: e.target.value as Scene["motionEasing"]})}>
                      <option value="linear">Linear</option>
                      <option value="smooth">Smooth start and stop</option>
                    </select>
                  </Field>
                  <div className="grid-two">
                    <Field label="Variant focal X">
                      <input
                        type="number"
                        min={0}
                        max={1}
                        step={0.05}
                        value={v.framing[s.id]?.x ?? s.focalX}
                        onChange={(e) =>
                          updateVariant({
                            framing: {
                              ...v.framing,
                              [s.id]: {
                                x: Number(e.target.value),
                                y: v.framing[s.id]?.y ?? s.focalY,
                              },
                            },
                          })
                        }
                      />
                    </Field>
                    <Field label="Variant focal Y">
                      <input
                        type="number"
                        min={0}
                        max={1}
                        step={0.05}
                        value={v.framing[s.id]?.y ?? s.focalY}
                        onChange={(e) =>
                          updateVariant({
                            framing: {
                              ...v.framing,
                              [s.id]: {
                                y: Number(e.target.value),
                                x: v.framing[s.id]?.x ?? s.focalX,
                              },
                            },
                          })
                        }
                      />
                    </Field>
                    <Field label="Transition into scene">
                      <select
                        value={s.transition}
                        onChange={(e) =>
                          editScene(s.id, {
                            transition: e.target.value as Scene["transition"],
                          })
                        }
                      >
                        <option value="cut">Cut</option>
                        <option value="crossfade">Crossfade</option>
                      </select>
                    </Field>
                    <Field label="Overlap (seconds)">
                      <input
                        type="number"
                        step={0.1}
                        value={s.overlap}
                        onChange={(e) =>
                          editScene(s.id, { overlap: Number(e.target.value) })
                        }
                      />
                    </Field>
                    <Field label="Narration volume">
                      <input
                        type="number"
                        min={0}
                        max={2}
                        step={0.1}
                        value={s.volume}
                        onChange={(e) =>
                          editScene(s.id, { volume: Number(e.target.value) })
                        }
                      />
                    </Field>
                    <Field label="Short clip policy">
                      <select
                        value={s.shortClipPolicy}
                        onChange={(e) =>
                          editScene(s.id, {
                            shortClipPolicy: e.target
                              .value as Scene["shortClipPolicy"],
                          })
                        }
                      >
                        {["reject", "freeze", "loop", "trim"].map((x) => (
                          <option key={x}>{x}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Audio fade in">
                      <input
                        type="number"
                        value={s.fadeIn}
                        step={0.1}
                        onChange={(e) =>
                          editScene(s.id, { fadeIn: Number(e.target.value) })
                        }
                      />
                    </Field>
                    <Field label="Audio fade out">
                      <input
                        type="number"
                        value={s.fadeOut}
                        step={0.1}
                        onChange={(e) =>
                          editScene(s.id, { fadeOut: Number(e.target.value) })
                        }
                      />
                    </Field>
                  </div>
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={s.muted}
                      onChange={(e) =>
                        editScene(s.id, { muted: e.target.checked })
                      }
                    />{" "}
                    Mute narration
                  </label>
                  {s.shortClipPolicy === "trim" && (
                    <Button
                      secondary
                      onClick={() =>
                        editScene(s.id, {
                          duration: Math.max(
                            0.5,
                            (assets.find((a) => a.id === s.assetId)?.duration ||
                              s.duration) - s.trimStart,
                          ),
                        })
                      }
                    >
                      Apply trim to available footage
                    </Button>
                  )}
                </fieldset>
              )}
            </aside>
          </div>
          <section className="panel timeline-tracks">
            <div className="track">
              <span>
                <Film size={14} /> Visuals
              </span>
              <div>
                {tracks.map((t) => (
                  <button
                    style={{ flex: t.scene.duration }}
                    className={
                      t.scene.id === selected ? "clip selected" : "clip"
                    }
                    key={t.scene.id}
                    onClick={() => {
                      select(t.scene.id);
                      setPlayhead(t.start);
                    }}
                  >
                    {t.scene.title}
                    <small>{fmt(t.scene.duration)}</small>
                  </button>
                ))}
              </div>
            </div>
            <div className="track">
              <span>
                <AudioLines size={14} /> Narration
              </span>
              <div>
                {tracks.map((t) => (
                  <div
                    className={t.scene.audioId ? "audio-clip" : "missing-clip"}
                    style={{ flex: t.scene.duration }}
                    key={t.scene.id}
                  >
                    {t.scene.audioId ? "▂▅▃▇▂▆▅▃▇▂▅▃" : "No narration"}
                  </div>
                ))}
              </div>
            </div>
            <div className="track">
              <span>
                <AudioLines size={14} /> Music
              </span>
              <div className="music-clip">
                {assets.find((a) => a.id === doc.musicId)?.name ||
                  "No music selected"}
              </div>
            </div>
            <div className="track">
              <span>
                <FileText size={14} /> Captions
              </span>
              <div>
                {tracks.map((t) => (
                  <div
                    className="caption-clip"
                    style={{ flex: t.scene.duration }}
                    key={t.scene.id}
                  >
                    {t.scene.captions.length} phrases
                  </div>
                ))}
              </div>
            </div>
          </section>
          <section className="panel">
            <h2>Output variant & audio mix</h2>
            <div className="grid-three">
              <Field label="Variant name">
                <input
                  value={v.name}
                  onChange={(e) => updateVariant({ name: e.target.value })}
                />
              </Field>
              <DurationInput
                label="Selected variant target video length"
                value={targetDuration(doc, v)}
                onChange={(value) => updateVariant({ targetDuration: value })}
              />
              <Field label="Aspect ratio">
                <select
                  value={v.aspect}
                  onChange={(e) =>
                    updateVariant({
                      aspect: e.target.value as Variant["aspect"],
                    })
                  }
                >
                  <option value="landscape">1920 × 1080 landscape</option>
                  <option value="vertical">1080 × 1920 vertical</option>
                </select>
              </Field>
              <Field label="Frame rate">
                <input
                  type="number"
                  min={24}
                  max={60}
                  value={v.fps}
                  onChange={(e) =>
                    updateVariant({ fps: Number(e.target.value) })
                  }
                />
              </Field>
              <Field label="CRF quality">
                <input
                  type="number"
                  min={16}
                  max={35}
                  value={v.crf}
                  onChange={(e) =>
                    updateVariant({ crf: Number(e.target.value) })
                  }
                />
              </Field>
              <Field label="Bitrate ceiling">
                <input
                  value={v.bitrate}
                  onChange={(e) => updateVariant({ bitrate: e.target.value })}
                />
              </Field>
              <Field label="Platform duration warning (seconds)">
                <input
                  type="number"
                  value={v.maxDuration}
                  onChange={(e) =>
                    updateVariant({ maxDuration: Number(e.target.value) })
                  }
                />
              </Field>
            </div>
            <Field label="Highlight scenes included in this variant">
              <div className="row wrap">
                {doc.scenes.map((s) => (
                  <label className="checkbox" key={s.id}>
                    <input
                      type="checkbox"
                      checked={v.sceneIds.includes(s.id)}
                      onChange={(e) => {
                        const ids = e.target.checked
                          ? [...v.sceneIds, s.id]
                          : v.sceneIds.filter((id) => id !== s.id);
                        if (ids.length) updateVariant({ sceneIds: ids });
                      }}
                    />
                    {s.title}
                  </label>
                ))}
              </div>
            </Field>
            <p className="help">
              A highlight selection preserves the original. To create a paced
              Short, duplicate scenes and rewrite the hook and narration before
              adding them to a new variant.
            </p>
            <div className="grid-three">
              <Field label="Music track">
                <select
                  value={doc.musicId || ""}
                  onChange={(e) =>
                    patch({ musicId: e.target.value || undefined })
                  }
                >
                  <option value="">No music</option>
                  {assets
                    .filter((a) => a.kind === "audio")
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="Insert intro scene in selected variant">
                <select
                  value=""
                  onChange={(e) => addBookend(e.target.value, "intro")}
                >
                  <option value="">Choose uploaded image or clip</option>
                  {assets
                    .filter((a) => ["image", "video"].includes(a.kind))
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="Insert outro scene in selected variant">
                <select
                  value=""
                  onChange={(e) => addBookend(e.target.value, "outro")}
                >
                  <option value="">Choose uploaded image or clip</option>
                  {assets
                    .filter((a) => ["image", "video"].includes(a.kind))
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="Music volume">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={doc.musicVolume}
                  onChange={(e) =>
                    patch({ musicVolume: Number(e.target.value) })
                  }
                />
              </Field>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={doc.ducking}
                  onChange={(e) => patch({ ducking: e.target.checked })}
                />{" "}
                Duck music beneath narration
              </label>
              <Field label="Logo for this version">
                <select
                  value={(v.logoId === undefined ? doc.logoId : v.logoId) || ""}
                  onChange={(e) =>
                    updateVariant({ logoId: e.target.value || null })
                  }
                >
                  <option value="">No logo</option>
                  {assets
                    .filter((a) => a.kind === "image")
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="Show corner logo after (seconds)">
                <input type="number" min={0} step={0.1} value={v.logoStart ?? 0} onChange={(e) => updateVariant({logoStart: Math.max(0, Number(e.target.value))})} />
              </Field>
              <Field label="Title overlay (first 3 seconds)">
                <input
                  value={v.titleOverlay}
                  onChange={(e) =>
                    updateVariant({ titleOverlay: e.target.value })
                  }
                />
              </Field>
            </div>
            <h3>Sound effects</h3>
            {doc.effects.map((fx, i) => (
              <div className="grid-three" key={i}>
                <Field label="Audio asset">
                  <select
                    value={fx.assetId}
                    onChange={(e) =>
                      patch({
                        effects: doc.effects.map((x, n) =>
                          n === i ? { ...x, assetId: e.target.value } : x,
                        ),
                      })
                    }
                  >
                    {assets
                      .filter((a) => a.kind === "audio")
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                  </select>
                </Field>
                <Field label="Start (seconds)">
                  <input
                    type="number"
                    value={fx.start}
                    onChange={(e) =>
                      patch({
                        effects: doc.effects.map((x, n) =>
                          n === i ? { ...x, start: Number(e.target.value) } : x,
                        ),
                      })
                    }
                  />
                </Field>
                <Field label="Volume">
                  <input
                    type="number"
                    step={0.1}
                    value={fx.volume}
                    onChange={(e) =>
                      patch({
                        effects: doc.effects.map((x, n) =>
                          n === i
                            ? { ...x, volume: Number(e.target.value) }
                            : x,
                        ),
                      })
                    }
                  />
                </Field>
              </div>
            ))}
            <Button
              secondary
              disabled={!assets.some((a) => a.kind === "audio")}
              onClick={() =>
                patch({
                  effects: [
                    ...doc.effects,
                    {
                      assetId: assets.find((a) => a.kind === "audio")!.id,
                      start: 0,
                      volume: 1,
                    },
                  ],
                })
              }
            >
              Add sound effect
            </Button>
            <h3>Caption appearance</h3>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={v.wordHighlight}
                onChange={(e) =>
                  updateVariant({ wordHighlight: e.target.checked })
                }
              />{" "}
              Highlight the word being spoken (needs aligned captions)
            </label>
            {v.wordHighlight && (
              <Field label="Highlight colour">
                <input type="color" value={v.highlightColor} onChange={(e) => updateVariant({ highlightColor: e.target.value })} />
              </Field>
            )}
            <p className="help">Captions are centred and laid out for this version's frame: words are never split, at most two lines show at once, and long words shrink to fit. Vertical versions sit above the Shorts/Reels controls.</p>
            <div className="grid-three">
              <Field label="Caption font">
                <select
                  value={v.font || "automatic"}
                  onChange={(e) =>
                    updateVariant({ font: e.target.value as Variant["font"] })
                  }
                >
                  {[
                    "automatic",
                    "Noto Sans",
                    "Noto Sans Telugu",
                    "Noto Sans Devanagari",
                  ].map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </select>
              </Field>
              <Field label="Font size (1080p)">
                <input
                  type="number"
                  value={v.fontSize}
                  onChange={(e) =>
                    updateVariant({ fontSize: Number(e.target.value) })
                  }
                />
              </Field>
              <Field label="Caption color">
                <input
                  type="color"
                  value={v.color}
                  onChange={(e) => updateVariant({ color: e.target.value })}
                />
              </Field>
              <Field label="Position">
                <select
                  value={v.position}
                  onChange={(e) =>
                    updateVariant({
                      position: e.target.value as Variant["position"],
                    })
                  }
                >
                  {["bottom", "center", "top"].map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </Field>
              <Field label="Caption height above bottom (%)">
                <input type="number" min={5} max={40} step={1} value={Math.round((v.captionBottom ?? (v.aspect === "vertical" ? .2 : .07)) * 100)} onChange={e => updateVariant({captionBottom: Number(e.target.value) / 100})} />
              </Field>
              <Field label="Outline width">
                <input
                  type="number"
                  value={v.outline}
                  onChange={(e) =>
                    updateVariant({ outline: Number(e.target.value) })
                  }
                />
              </Field>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={v.background}
                  onChange={(e) =>
                    updateVariant({ background: e.target.checked })
                  }
                />{" "}
                Caption background
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={v.captions}
                  onChange={(e) =>
                    updateVariant({ captions: e.target.checked })
                  }
                />{" "}
                Burn captions into video
              </label>
            </div>
          </section>
        </>
      ) : (
        <Empty title="Create scenes to start editing">
          Output variants need at least one scene.
        </Empty>
      )}
    </>
  );
}
function TemplatePage({
  saved,
  refresh,
  run,
  download,
}: {
  saved: Template[];
  refresh: () => Promise<void>;
  run: (f: () => Promise<void>) => Promise<void>;
  download: (v: unknown, n: string) => void;
}) {
  const [stage, setStage] = useState("script"),
    [name, setName] = useState("My script template"),
    [body, setBody] = useState(templates.script),
    [id, setId] = useState("");
  return (
    <main className="content">
      <div className="page-heading">
        <div>
          <h1>Prompt templates</h1>
          <p>
            Reusable, versioned instructions with project and scene overrides.
          </p>
        </div>
        <div className="row">
          <Button
            secondary
            onClick={() =>
              download(
                saved.map((t) => ({
                  name: t.name,
                  stage: t.stage,
                  body: t.body,
                  version: t.version,
                  history: t.history,
                })),
                "prompt-templates.json",
              )
            }
          >
            Export templates
          </Button>
          <label className="btn secondary">
            Import templates
            <input
              type="file"
              hidden
              accept="application/json"
              onChange={(e) =>
                void run(async () => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const parsed = JSON.parse(await f.text());
                  for (const t of parsed) await api("templates", "POST", t);
                  await refresh();
                })
              }
            />
          </label>
        </div>
      </div>
      <div className="editor-columns">
        <section className="panel">
          <div className="grid-two">
            <Field label="Template name">
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Stage">
              <select
                value={stage}
                onChange={(e) => {
                  setStage(e.target.value);
                  setBody(templates[e.target.value]);
                  setId("");
                }}
              >
                {Object.keys(templates).map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Template body">
            <textarea
              rows={15}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </Field>
          <p className="help">
            Variables:{" "}
            {
              "{{title}}, {{topic}}, {{script}}, {{narration}}, {{visual}}, {{sources}}, {{pronunciation}}, {{styleGuide}}, {{characters}}"
            }
            .
          </p>
          <Button
            onClick={() =>
              void run(async () => {
                await api(
                  id ? `templates/${id}` : "templates",
                  id ? "PATCH" : "POST",
                  { name, stage, body },
                );
                await refresh();
              })
            }
          >
            Save template version
          </Button>
        </section>
        <aside className="panel narrow">
          <h3>Saved templates</h3>
          {saved.map((t) => (
            <div key={t.id}>
              <button
                className="template-item"
                onClick={() => {
                  setName(t.name);
                  setStage(t.stage);
                  setBody(t.body);
                  setId(t.id);
                }}
              >
                {t.name}
                <small>
                  {t.stage} · v{t.version}
                </small>
              </button>
              {t.history.length > 0 && (
                <select
                  defaultValue=""
                  onChange={(e) => {
                    const v = t.history.find(
                      (v) => String(v.version) === e.target.value,
                    );
                    if (v) {
                      setName(v.name);
                      setBody(v.body);
                      setId(t.id);
                      setStage(t.stage);
                    }
                  }}
                >
                  <option value="">Restore earlier version…</option>
                  {t.history.map((h) => (
                    <option value={h.version} key={h.version}>
                      Version {h.version}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ))}
          {!saved.length && (
            <p className="help">Built-in defaults are ready to customize.</p>
          )}
        </aside>
      </div>
    </main>
  );
}

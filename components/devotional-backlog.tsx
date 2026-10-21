"use client";
import { useEffect, useState } from "react";
import type { devotionalResearchBundle } from "@/lib/devotional-backlog";
import { api, Button, Field } from "./ui";

type Bundle = ReturnType<typeof devotionalResearchBundle>;
export function DevotionalBacklog() {
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("all");
  const [selectedId, setSelectedId] = useState("lingashtakam");
  const [firstOnly, setFirstOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true);
    setError("");
    try {
      setBundle(await api<Bundle>("devotional-backlog"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load research");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  if (error)
    return (
      <main className="content">
        <div role="alert">{error}</div>
        <Button onClick={() => void load()}>Retry</Button>
      </main>
    );
  if (loading || !bundle)
    return (
      <main className="content">
        <p role="status">Loading devotional research…</p>
      </main>
    );
  const query = search.trim().toLocaleLowerCase();
  const works = bundle.works.filter(
    (w) =>
      (priority === "all" || w.priority === priority) &&
      (!firstOnly || bundle.firstExperiment.includes(w.id)) &&
      `${w.titleTe} ${w.titleEn} ${w.deity}`
        .toLocaleLowerCase()
        .includes(query),
  );
  const selected = bundle.works.find((w) => w.id === selectedId)!;
  const packet = bundle.packages.find((p) => p.content_id === selectedId);
  return (
    <main className="content devotional-research">
      <div className="page-heading">
        <div>
          <div className="eyebrow">DIVINE WISDOM TELUGU</div>
          <h1>Devotional research</h1>
          <p>
            30 discovery topics · 2 starter drafts · Edition and pronunciation
            review pending
          </p>
        </div>
        <a className="btn secondary" href="/api/devotional-backlog?download=1">
          Download research JSON
        </a>
      </div>
      <section className="panel">
        <h2>Start with the two short hymns</h2>
        <p>
          Lingashtakam and Mahalakshmi Ashtakam have draft production plans.
          Recitation text, verse meanings and media remain pending. These drafts
          cannot be treated as publish-ready videos.
        </p>
        <p>
          Research observed {bundle.preparedOn}.{" "}
          <a href={bundle.channelUrl} target="_blank" rel="noreferrer">
            Channel reference ↗
          </a>
        </p>
      </section>
      <div className="toolbar devotional-filters">
        <Field label="Search by work or deity">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Title, Telugu title or deity"
          />
        </Field>
        <Field label="Priority">
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option value="all">All priorities</option>
            <option>P1</option>
            <option>P2</option>
          </select>
        </Field>
        <label>
          <input
            type="checkbox"
            checked={firstOnly}
            onChange={(e) => setFirstOnly(e.target.checked)}
          />{" "}
          First eight research works
        </label>
      </div>
      <div className="devotional-columns">
        <section className="panel">
          <h2>Backlog ({works.length})</h2>
          <div className="devotional-work-list">
            {works.map((w) => (
              <button
                key={w.id}
                className={`devotional-work ${selectedId === w.id ? "selected" : ""}`}
                aria-pressed={selectedId === w.id}
                onClick={() => setSelectedId(w.id)}
              >
                <strong lang="te">{w.titleTe}</strong>
                <span>
                  {w.titleEn} · {w.deity}
                </span>
                <small>
                  {w.priority} · {w.estimatedMinutes.join("–")} min estimate ·{" "}
                  {w.productionStatus}
                </small>
              </button>
            ))}
            {!works.length && (
              <p role="status">
                No matching works. Try another title or priority.
              </p>
            )}
          </div>
        </section>
        <section className="panel devotional-detail" aria-label="Selected work">
          <h2 lang="te">{selected.titleTe}</h2>
          <p>{selected.titleEn}</p>
          <dl>
            <dt>First treatment</dt>
            <dd>{selected.firstTreatment}</dd>
            <dt>Language / script / form</dt>
            <dd>
              {selected.originalLanguage ?? "Language needs verification"} /{" "}
              {selected.displayScript} / {selected.textForm}
            </dd>
            <dt>Production status</dt>
            <dd>
              {selected.productionStatus}; text and rights need verification
            </dd>
            <dt>Verified counts</dt>
            <dd>
              Verses: {selected.verifiedCounts.verses ?? "not verified"}; names:{" "}
              {selected.verifiedCounts.names ?? "not verified"}
            </dd>
            <dt>Edition and scope</dt>
            <dd>
              {selected.edition ?? "Edition not selected"}.{" "}
              {selected.completenessScope}
            </dd>
          </dl>
          <h3>Source candidates</h3>
          {selected.sources.length ? (
            <ul>
              {selected.sources.map((s) => (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noreferrer">
                    {s.publisher} ↗
                  </a>
                  <p>
                    {s.access.replaceAll("_", " ")} · {s.observedOn} ·
                    independence and reuse pending
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p>Exact source pages have not been researched for this work.</p>
          )}
          <h3>Review notes</h3>
          <ul>
            {selected.reviewerNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
          {packet ? (
            <>
              <h3>Starter production draft</h3>
              <p lang="te">{packet.editorial_introduction_te}</p>
              <p>
                Eight provisional core slots; count is unverified. Audio,
                captions and render timing are pending.
              </p>
              <h3>Pronunciation review</h3>
              <ul lang="te">
                {packet.pronunciation_notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
              <h3>Edition differences and boundaries</h3>
              <ul>
                {packet.variant_notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
              <h3>Visual concept</h3>
              <p>{packet.scenes[0].image_prompt_en}</p>
              <h3>Before production</h3>
              <ul>
                {packet.unresolved_items.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
              <a
                className="btn secondary"
                href={`/api/devotional-backlog?package=${encodeURIComponent(selectedId)}&download=1`}
              >
                Download starter draft JSON
              </a>
            </>
          ) : (
            <p>
              No production package yet. Finish source discovery and edition
              review before preparing text and media.
            </p>
          )}
        </section>
      </div>
      <section className="panel">
        <h2>Experiment and measurement</h2>
        <p>
          Proposed cadence: two main videos and two related Shorts each week.
          Prepare long Sahasranama texts separately. Compare formats at 7 and 28
          days using authorized Studio data.
        </p>
        <p>
          Channel analytics and public comparison metrics are unavailable in
          this bundle.
        </p>
        <ul>
          {bundle.researchLimits.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}

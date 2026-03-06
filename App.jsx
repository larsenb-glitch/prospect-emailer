import { useState, useRef } from "react";

const ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";

const RESEARCH_PROMPT = (name, company) => `Return a JSON object about this person. No explanation, no apology, just JSON. If you don't know something, make a reasonable guess based on the company name and industry.

Person: ${name}, Company: ${company}

Return ONLY this exact JSON structure with no other text:
{"name":"${name}","company":"${company}","title":"guess their likely title","industry":"guess the industry","companyDescription":"one sentence about what they do","companySize":"estimate","recentNews":"any news or write unknown","painPoints":"likely pain points for this type of company"}`;

const EMAIL_PROMPT = (research) => `You are a senior B2B copywriter. Write a cold outreach email from Opiniion to the prospect below. Return ONLY JSON, no other text.

ABOUT OPINIION:
Opiniion is a leading resident satisfaction and reputation management platform for multifamily property management companies. Named to the Inc. 5000 Fastest-Growing Companies list two years in a row. Subscription-based, scalable for any portfolio size.

Core problems solved:
- Property managers only hear from residents when things go wrong — Opiniion creates a continuous feedback loop via automated SMS/email surveys at key moments (tours, move-ins, maintenance, renewals, move-outs)
- Bad reviews kill leasing — Opiniion automatically converts happy residents into public reviews. One property went from 2.8 to 4.0 stars and added nearly 1,000 reviews in 10 months
- No portfolio visibility — Opiniion's dashboard shows performance across communities, managers, and maintenance teams
- Feedback fragmented across PMS systems — Opiniion integrates with Yardi, Entrata, AppFolio, RealPage, Buildium, Rent Manager

Key capabilities: automated SMS/email surveys, negative feedback routing (catches problems before they become public reviews), automated review generation, centralized reputation monitoring (Google, Yelp, Facebook, ApartmentRatings), customizable survey campaigns, portfolio analytics, social media management, business listings sync.

Business outcomes: higher star ratings, more leasing conversions, better retention, operational intelligence, improved NOI.

PROSPECT:
Name: ${research.name}, Title: ${research.title}, Company: ${research.company}
About: ${research.companyDescription}
Pain points: ${research.painPoints}
Recent news: ${research.recentNews}

EMAIL RULES:
- Max 80 words in the body
- Open with ONE specific observation about their company or a pain point they likely feel — NOT a generic opener
- Connect that pain point to ONE specific Opiniion capability — use a concrete stat or outcome if relevant
- End with a soft CTA ("Worth a quick call?" or "Open to a 15-min demo?")
- Write like a real person — no buzzwords, no "I hope this finds you well", no fluff
- Pick the ONE most relevant feature, don't list everything

Return ONLY this JSON with no other text:
{"subject":"...","body":"..."}`;

const BRAND = {
  teal: "#2bbfbf",
  tealDark: "#1a9e9e",
  tealLight: "#e8f9f9",
  navy: "#1a2e44",
  gray: "#f7f8fa",
  grayBorder: "#e2e6ea",
  textDark: "#1a2e44",
  textMid: "#4a5568",
  textLight: "#8a95a3",
  white: "#ffffff",
};

const S = {
  page: { minHeight: "100vh", background: BRAND.gray, fontFamily: "'Helvetica Neue', Arial, sans-serif", color: BRAND.textDark },
  bg: { display: "none" },
  wrap: { position: "relative", zIndex: 1, maxWidth: 1100, margin: "0 auto", padding: "0 24px 48px" },
  label: { display: "block", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: BRAND.textMid, marginBottom: 7, fontWeight: 600 },
  input: { width: "100%", boxSizing: "border-box", background: BRAND.white, border: `1px solid ${BRAND.grayBorder}`, borderRadius: 6, padding: "10px 14px", color: BRAND.textDark, fontSize: 14, fontFamily: "inherit", outline: "none", transition: "border-color 0.2s" },
  card: { background: BRAND.white, border: `1px solid ${BRAND.grayBorder}`, borderRadius: 10, padding: "24px 28px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
  goldCard: { background: BRAND.tealLight, border: "1px solid rgba(43,191,191,0.25)", borderRadius: 10, padding: "24px 28px" },
  microLabel: { fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: BRAND.textLight, marginBottom: 5, fontWeight: 600 },
  microVal: { fontSize: 13, color: BRAND.textMid, lineHeight: 1.6 },
};

const callClaude = async (userPrompt, useWebSearch = false) => {
  const body = {
    model: ANTHROPIC_MODEL,
    max_tokens: 1000,
    messages: [{ role: "user", content: userPrompt }],
  };
  if (useWebSearch) body.tools = [{ type: "web_search_20250305", name: "web_search" }];
  const res = await fetch("/api/proxy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    const msg = errData?.error || `API error: ${res.status}`;
    throw new Error(msg);
  }
  const data = await res.json();
  const text = data.content.filter(b => b.type === "text").map(b => b.text).join("");
  return text.replace(/```json|```/g, "").trim();
};

function StatusBadge({ status }) {
  const map = {
    idle:        { color: "#8a95a3", bg: "#f0f2f5",               label: "Queued" },
    researching: { color: "#1a9e9e", bg: "rgba(43,191,191,0.12)", label: "Researching…" },
    writing:     { color: "#3b7dd8", bg: "rgba(59,125,216,0.1)",  label: "Writing email…" },
    done:        { color: "#2e9e6e", bg: "rgba(46,158,110,0.1)",  label: "Done ✓" },
    error:       { color: "#d94f4f", bg: "rgba(217,79,79,0.1)",   label: "Error" },
  };
  const s = map[status] || map.idle;
  return (
    <span style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: s.color, background: s.bg, padding: "3px 8px", borderRadius: 2 }}>
      {s.label}
    </span>
  );
}

function ResultCard({ result }) {
  const [expanded, setExpanded] = useState(false);
  const [editBody, setEditBody] = useState(result.email?.body || "");
  const [copied, setCopied] = useState(false);

  if (result.email && editBody === "" && result.email.body) setEditBody(result.email.body);

  const copy = () => {
    navigator.clipboard.writeText(`Subject: ${result.email.subject}\n\n${editBody}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ ...S.card, marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <StatusBadge status={result.status} />
          <span style={{ fontSize: 15, color: BRAND.textDark, fontWeight: 600 }}>{result.name}</span>
          <span style={{ color: BRAND.grayBorder }}>·</span>
          <span style={{ fontSize: 13, color: BRAND.textMid }}>{result.company}</span>
          {result.research?.title && (
            <span style={{ fontSize: 12, color: BRAND.textLight }}>{result.research.title}</span>
          )}
          {result.status === "error" && (
            <span style={{ fontSize: 12, color: "#d94f4f", fontStyle: "italic" }}>{result.errorMsg}</span>
          )}
        </div>
        {result.status === "done" && (
          <button
            onClick={() => setExpanded(x => !x)}
            style={{ background: "transparent", border: `1px solid ${BRAND.teal}`, borderRadius: 6, color: BRAND.teal, padding: "5px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
          >
            {expanded ? "Collapse ▲" : "View ▼"}
          </button>
        )}
      </div>

      {expanded && result.status === "done" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 20 }}>
          <div style={S.goldCard}>
            <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: BRAND.tealDark, marginBottom: 16, fontWeight: 700 }}>Research Brief</div>
            {[
              ["Title", result.research.title],
              ["Industry", result.research.industry],
              ["About", result.research.companyDescription],
              ["Size", result.research.companySize],
              ["Recent News", result.research.recentNews],
              ["Pain Points", result.research.painPoints],
            ].filter(([, v]) => v).map(([label, value]) => (
              <div key={label} style={{ marginBottom: 12 }}>
                <div style={S.microLabel}>{label}</div>
                <div style={S.microVal}>{value}</div>
              </div>
            ))}
          </div>
          <div style={{ ...S.card, display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: BRAND.tealDark, marginBottom: 16, fontWeight: 700 }}>Draft Email</div>
            <div style={{ marginBottom: 12 }}>
              <div style={S.microLabel}>Subject</div>
              <div style={{ fontSize: 14, color: BRAND.textDark, fontWeight: 600, background: BRAND.gray, padding: "8px 12px", borderRadius: 6, border: `1px solid ${BRAND.grayBorder}` }}>
                {result.email.subject}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={S.microLabel}>Body <span style={{ textTransform: "none", letterSpacing: 0, color: BRAND.textLight, fontWeight: 400 }}>(editable)</span></div>
              <textarea
                value={editBody}
                onChange={e => setEditBody(e.target.value)}
                style={{ ...S.input, lineHeight: 1.7, resize: "vertical", minHeight: 160 }}
                onFocus={e => e.target.style.borderColor = BRAND.teal}
                onBlur={e => e.target.style.borderColor = BRAND.grayBorder}
              />
            </div>
            <button
              onClick={copy}
              style={{ marginTop: 12, background: copied ? "#2e9e6e" : BRAND.teal, border: "none", borderRadius: 6, padding: "10px 16px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "background 0.2s" }}
            >
              {copied ? "✓ Copied!" : "Copy Subject + Body"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

let idCounter = 0;
const newRow = () => ({ id: ++idCounter, name: "", company: "" });

export default function BatchProspectEmailer() {
  const [rows, setRows] = useState([newRow(), newRow(), newRow()]);
  const [results, setResults] = useState([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const cancelRef = useRef(false);

  const updateRow = (field, value, id) => {
    if (field === "remove") setRows(r => r.filter(x => x.id !== id));
    else setRows(r => r.map(x => x.id === id ? { ...x, [field]: value } : x));
  };

  const handlePaste = (e) => {
    const text = e.clipboardData.getData("text");
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return;
    const parsed = lines.map(line => {
      const parts = line.includes("\t") ? line.split("\t") : line.split(",");
      const r = newRow();
      r.name = (parts[0] || "").trim();
      r.company = (parts[1] || "").trim();
      return r;
    }).filter(r => r.name || r.company);
    if (parsed.length > 0) { e.preventDefault(); setRows(parsed); }
  };

  const validRows = rows.filter(r => r.name.trim() && r.company.trim());

  const run = async () => {
    if (!validRows.length) return;
    cancelRef.current = false;
    setRunning(true);
    setProgress({ done: 0, total: validRows.length });
    const initialResults = validRows.map(r => ({ ...r, status: "idle", research: null, email: null, errorMsg: "" }));
    setResults(initialResults);

    for (let i = 0; i < validRows.length; i++) {
      if (cancelRef.current) break;
      const { name, company, id } = validRows[i];
      const update = (patch) => setResults(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
      try {
        update({ status: "researching" });
        const rawResearch = await callClaude(RESEARCH_PROMPT(name, company), false);
        const research = JSON.parse(rawResearch);
        update({ research, status: "writing" });
        const rawEmail = await callClaude(EMAIL_PROMPT(research), false);
        const email = JSON.parse(rawEmail);
        update({ email, status: "done" });
      } catch (err) {
        update({ status: "error", errorMsg: err.message || "Failed" });
      }
      setProgress({ done: i + 1, total: validRows.length });
    }
    setRunning(false);
  };

  const reset = () => {
    setResults([]);
    setProgress({ done: 0, total: 0 });
    setRows([newRow(), newRow(), newRow()]);
  };

  const isDone = results.length > 0 && !running;
  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div style={S.page}>
      <div style={S.bg} />

      {/* Top nav bar */}
      <div style={{ background: BRAND.navy, padding: "0 32px", display: "flex", alignItems: "center", height: 60, boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
        <img src="https://opiniion.com/wp-content/uploads/2022/05/Group-943.svg" alt="Opiniion" style={{ height: 28, filter: "brightness(0) invert(1)" }} />
        <span style={{ marginLeft: 16, color: "rgba(255,255,255,0.4)", fontSize: 13 }}>|</span>
        <span style={{ marginLeft: 16, color: "rgba(255,255,255,0.75)", fontSize: 13, fontWeight: 500, letterSpacing: "0.02em" }}>Prospect Emailer</span>
      </div>

      <div style={S.wrap}>

        {/* Header */}
        <div style={{ padding: "36px 0 28px", borderBottom: `1px solid ${BRAND.grayBorder}`, marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, color: BRAND.navy }}>
            Batch Prospect Research & Email Generator
          </h1>
          <p style={{ marginTop: 8, color: BRAND.textMid, fontSize: 14, lineHeight: 1.6, maxWidth: 580 }}>
            Add prospects below — or paste a CSV (Name, Company per line). We'll research each one and draft a personalized cold email pitched around Opiniion's value prop.
          </p>
        </div>

        {/* Input table */}
        {!running && results.length === 0 && (
          <div style={{ ...S.card, marginBottom: 24 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 36px", gap: 10, marginBottom: 12 }}>
              <div style={S.label}>Prospect Name</div>
              <div style={S.label}>Company</div>
              <div />
            </div>
            <div onPaste={handlePaste}>
              {rows.map(r => (
                <div key={r.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 36px", gap: 10, marginBottom: 10 }}>
                  <input value={r.name} onChange={e => updateRow("name", e.target.value, r.id)} placeholder="e.g. Sarah Chen" style={S.input}
                    onFocus={e => e.target.style.borderColor = BRAND.teal}
                    onBlur={e => e.target.style.borderColor = BRAND.grayBorder} />
                  <input value={r.company} onChange={e => updateRow("company", e.target.value, r.id)} placeholder="e.g. Acme Properties" style={S.input}
                    onFocus={e => e.target.style.borderColor = BRAND.teal}
                    onBlur={e => e.target.style.borderColor = BRAND.grayBorder} />
                  <button onClick={() => updateRow("remove", null, r.id)} style={{ background: "transparent", border: `1px solid ${BRAND.grayBorder}`, borderRadius: 6, color: BRAND.textLight, cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 16, alignItems: "center", flexWrap: "wrap" }}>
              <button onClick={() => setRows(r => [...r, newRow()])}
                style={{ background: "transparent", border: `1px solid ${BRAND.grayBorder}`, borderRadius: 6, color: BRAND.textMid, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                + Add Row
              </button>
              <button onClick={run} disabled={!validRows.length}
                style={{ background: validRows.length ? BRAND.teal : "#c8e8e8", color: "#fff", border: "none", borderRadius: 6, padding: "9px 28px", fontSize: 14, fontWeight: 700, cursor: validRows.length ? "pointer" : "not-allowed", transition: "background 0.2s" }}>
                Run {validRows.length > 0 ? `${validRows.length} Prospect${validRows.length !== 1 ? "s" : ""}` : ""} →
              </button>
              <span style={{ fontSize: 12, color: BRAND.textLight }}>tip: paste a CSV to fill the list instantly</span>
            </div>
          </div>
        )}

        {/* Progress */}
        {running && (
          <div style={{ ...S.card, marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 14, color: BRAND.navy, fontWeight: 600 }}>Processing {progress.done} of {progress.total} prospects…</div>
              <div style={{ fontSize: 13, color: BRAND.textLight }}>{pct}%</div>
            </div>
            <div style={{ height: 6, background: BRAND.grayBorder, borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${BRAND.teal}, ${BRAND.tealDark})`, borderRadius: 3, transition: "width 0.5s ease" }} />
            </div>
            <button onClick={() => { cancelRef.current = true; }}
              style={{ marginTop: 14, background: "transparent", border: "1px solid #d94f4f", borderRadius: 6, color: "#d94f4f", padding: "6px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              Cancel
            </button>
          </div>
        )}

        {/* Results list */}
        {results.length > 0 && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: BRAND.textMid, fontWeight: 600 }}>
                {results.filter(r => r.status === "done").length} of {results.length} complete
              </div>
              {isDone && (
                <button onClick={reset}
                  style={{ background: "transparent", border: `1px solid ${BRAND.teal}`, borderRadius: 6, color: BRAND.teal, padding: "6px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  ↺ New Batch
                </button>
              )}
            </div>
            {results.map(r => <ResultCard key={r.id} result={r} />)}
          </div>
        )}
      </div>
    </div>
  );
}

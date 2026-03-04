import { useState, useRef } from "react";

const ANTHROPIC_MODEL = "claude-sonnet-4-20250514";

const RESEARCH_PROMPT = (name, company) => `
You are a B2B sales research assistant. Research the following prospect and return a JSON object ONLY (no markdown, no explanation, no backticks).

Prospect: ${name}
Company: ${company}

Search the web to find:
1. Their likely job title / role
2. The company's industry and what they do (1-2 sentences)
3. Company size estimate (employees/revenue if findable)
4. Any recent news about the company or person (last 6 months)
5. Any pain points or initiatives the company is known for

Return ONLY this JSON structure:
{
  "name": "${name}",
  "company": "${company}",
  "title": "...",
  "industry": "...",
  "companyDescription": "...",
  "companySize": "...",
  "recentNews": "...",
  "painPoints": "..."
}`;

const EMAIL_PROMPT = (research) => `
You are an expert B2B cold email copywriter. Using the research below, write a short, compelling cold outreach email.

Research:
${JSON.stringify(research, null, 2)}

Rules:
- Max 100 words in the body
- Personalize using the research — mention the company, recent news, or a pain point
- Clear value proposition in 1 sentence
- One soft CTA (e.g., "Worth a quick chat?")
- No fluff, no fake familiarity
- Professional but human tone

Return ONLY a JSON object (no markdown, no backticks):
{
  "subject": "...",
  "body": "..."
}`;

const S = {
  page: { minHeight: "100vh", background: "#0a0a0f", fontFamily: "Georgia, 'Times New Roman', serif", color: "#e8e4dc", position: "relative", overflow: "hidden" },
  bg: { position: "fixed", inset: 0, zIndex: 0, background: "radial-gradient(ellipse 80% 60% at 50% -10%, #1a1040 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 80% 80%, #0d2030 0%, transparent 50%)", pointerEvents: "none" },
  wrap: { position: "relative", zIndex: 1, maxWidth: 1100, margin: "0 auto", padding: "48px 24px" },
  label: { display: "block", fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "#b8956a", marginBottom: 8 },
  input: { width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 3, padding: "10px 14px", color: "#e8e4dc", fontSize: 14, fontFamily: "Georgia, serif", outline: "none" },
  card: { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 4, padding: "24px 28px" },
  goldCard: { background: "rgba(184,149,106,0.04)", border: "1px solid rgba(184,149,106,0.2)", borderRadius: 4, padding: "24px 28px" },
  microLabel: { fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "#4a4640", marginBottom: 5 },
  microVal: { fontSize: 13, color: "#c8c4bc", lineHeight: 1.5 },
};

const callClaude = async (userPrompt, useWebSearch = false, apiKey = "") => {
  const body = {
    model: ANTHROPIC_MODEL,
    max_tokens: 1000,
    messages: [{ role: "user", content: userPrompt }],
  };
  if (useWebSearch) body.tools = [{ type: "web_search_20250305", name: "web_search" }];
  const headers = { "Content-Type": "application/json" };
  if (apiKey) headers["x-api-key"] = apiKey;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error("Invalid API key — please check and try again.");
    throw new Error(`API error: ${res.status}`);
  }
  const data = await res.json();
  const text = data.content.filter(b => b.type === "text").map(b => b.text).join("");
  return text.replace(/```json|```/g, "").trim();
};

function StatusBadge({ status }) {
  const map = {
    idle:        { color: "#4a4640", bg: "rgba(255,255,255,0.04)", label: "Queued" },
    researching: { color: "#b8956a", bg: "rgba(184,149,106,0.1)",  label: "Researching…" },
    writing:     { color: "#7a9abf", bg: "rgba(100,140,200,0.1)",  label: "Writing email…" },
    done:        { color: "#80c090", bg: "rgba(80,160,100,0.1)",   label: "Done" },
    error:       { color: "#e08080", bg: "rgba(180,60,60,0.1)",    label: "Error" },
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
          <span style={{ fontSize: 15, color: "#f0ece4", fontWeight: 500 }}>{result.name}</span>
          <span style={{ color: "#3a3630" }}>·</span>
          <span style={{ fontSize: 13, color: "#7a7570", fontStyle: "italic" }}>{result.company}</span>
          {result.research?.title && (
            <span style={{ fontSize: 12, color: "#5a5550" }}>{result.research.title}</span>
          )}
          {result.status === "error" && (
            <span style={{ fontSize: 12, color: "#e08080", fontStyle: "italic" }}>{result.errorMsg}</span>
          )}
        </div>
        {result.status === "done" && (
          <button
            onClick={() => setExpanded(x => !x)}
            style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 3, color: "#b8956a", padding: "5px 14px", fontSize: 11, letterSpacing: "0.1em", cursor: "pointer", textTransform: "uppercase", whiteSpace: "nowrap" }}
          >
            {expanded ? "Collapse" : "View →"}
          </button>
        )}
      </div>

      {expanded && result.status === "done" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 20 }}>
          <div style={S.goldCard}>
            <div style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "#b8956a", marginBottom: 16 }}>Research Brief</div>
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
            <div style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "#b8956a", marginBottom: 16 }}>Draft Email</div>
            <div style={{ marginBottom: 12 }}>
              <div style={S.microLabel}>Subject</div>
              <div style={{ ...S.microVal, color: "#e8e4dc", fontWeight: 600, background: "rgba(255,255,255,0.04)", padding: "8px 12px", borderRadius: 3 }}>
                {result.email.subject}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={S.microLabel}>Body <span style={{ textTransform: "none", letterSpacing: 0, color: "#3a3630", fontStyle: "italic" }}>(editable)</span></div>
              <textarea
                value={editBody}
                onChange={e => setEditBody(e.target.value)}
                style={{ ...S.input, lineHeight: 1.7, resize: "vertical", minHeight: 160 }}
                onFocus={e => e.target.style.borderColor = "rgba(184,149,106,0.4)"}
                onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
              />
            </div>
            <button
              onClick={copy}
              style={{ marginTop: 12, background: copied ? "rgba(80,160,100,0.2)" : "rgba(184,149,106,0.15)", border: `1px solid ${copied ? "rgba(80,160,100,0.4)" : "rgba(184,149,106,0.3)"}`, borderRadius: 3, padding: "9px 16px", color: copied ? "#80c090" : "#b8956a", fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "Georgia, serif", cursor: "pointer" }}
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
  const [apiKey, setApiKey] = useState("");
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
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
        const rawResearch = await callClaude(RESEARCH_PROMPT(name, company), true, apiKey);
        const research = JSON.parse(rawResearch);
        update({ research, status: "writing" });
        const rawEmail = await callClaude(EMAIL_PROMPT(research), false, apiKey);
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
      <div style={S.wrap}>

        {/* Header */}
        <div style={{ marginBottom: 44, textAlign: "center" }}>
          <div style={{ fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", color: "#b8956a", marginBottom: 12 }}>Sales Intelligence</div>
          <h1 style={{ fontSize: "clamp(26px, 4vw, 44px)", fontWeight: 400, margin: 0, letterSpacing: "-0.02em", lineHeight: 1.1, color: "#f0ece4" }}>
            Batch Prospect <em style={{ fontStyle: "italic", color: "#b8956a" }}>Research</em> & Outreach
          </h1>
          <p style={{ marginTop: 12, color: "#7a7570", fontSize: 14, fontStyle: "italic", maxWidth: 520, margin: "12px auto 0", lineHeight: 1.6 }}>
            Add prospects below — or paste a CSV (Name, Company per line). We'll research each one and draft a personalized cold email.
          </p>
        </div>

        {/* API Key panel */}
        <div style={{ ...S.card, marginBottom: 20, borderColor: apiKey ? "rgba(80,160,100,0.2)" : "rgba(184,149,106,0.2)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 260 }}>
              <label style={S.label}>
                Anthropic API Key
                {apiKey && <span style={{ color: "#80c090", marginLeft: 8, fontSize: 10 }}>✓ Set</span>}
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type={apiKeyVisible ? "text" : "password"}
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="sk-ant-..."
                  style={{ ...S.input, flex: 1, fontFamily: "monospace", fontSize: 13, letterSpacing: apiKey && !apiKeyVisible ? "0.1em" : "normal" }}
                  onFocus={e => e.target.style.borderColor = "rgba(184,149,106,0.5)"}
                  onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
                />
                <button
                  onClick={() => setApiKeyVisible(v => !v)}
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 3, color: "#7a7570", padding: "0 14px", cursor: "pointer", fontSize: 13 }}
                  title={apiKeyVisible ? "Hide" : "Show"}
                >
                  {apiKeyVisible ? "🙈" : "👁"}
                </button>
              </div>
            </div>
            <div style={{ fontSize: 12, color: "#4a4640", fontStyle: "italic", maxWidth: 340, lineHeight: 1.6 }}>
              Your key is never stored — it lives only in this browser session and is sent directly to Anthropic.{" "}
              <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer" style={{ color: "#b8956a", textDecoration: "none" }}>
                Get a key →
              </a>
            </div>
          </div>
        </div>

        {/* Input table */}
        {!running && results.length === 0 && (
          <div style={{ ...S.card, marginBottom: 28, borderColor: "rgba(184,149,106,0.2)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 36px", gap: 10, marginBottom: 10 }}>
              <div style={S.label}>Prospect Name</div>
              <div style={S.label}>Company</div>
              <div />
            </div>
            <div onPaste={handlePaste}>
              {rows.map(r => (
                <div key={r.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 36px", gap: 10, marginBottom: 10 }}>
                  <input value={r.name} onChange={e => updateRow("name", e.target.value, r.id)} placeholder="e.g. Sarah Chen" style={S.input}
                    onFocus={e => e.target.style.borderColor = "rgba(184,149,106,0.5)"}
                    onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
                  <input value={r.company} onChange={e => updateRow("company", e.target.value, r.id)} placeholder="e.g. Acme Corp" style={S.input}
                    onFocus={e => e.target.style.borderColor = "rgba(184,149,106,0.5)"}
                    onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
                  <button onClick={() => updateRow("remove", null, r.id)} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 3, color: "#4a4640", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 16, alignItems: "center", flexWrap: "wrap" }}>
              <button onClick={() => setRows(r => [...r, newRow()])}
                style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 3, color: "#7a7570", padding: "9px 18px", fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", fontFamily: "Georgia, serif" }}>
                + Add Row
              </button>
              <button onClick={run} disabled={!validRows.length || !apiKey.trim()}
                style={{ background: (validRows.length && apiKey.trim()) ? "rgba(184,149,106,0.9)" : "rgba(184,149,106,0.2)", color: (validRows.length && apiKey.trim()) ? "#0a0a0f" : "#7a7570", border: "none", borderRadius: 3, padding: "9px 28px", fontSize: 13, letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "Georgia, serif", cursor: (validRows.length && apiKey.trim()) ? "pointer" : "not-allowed", fontWeight: 600 }}>
                {!apiKey.trim() ? "Enter API Key to Run" : `Run ${validRows.length > 0 ? `${validRows.length} Prospect${validRows.length !== 1 ? "s" : ""}` : ""} →`}
              </button>
              <span style={{ fontSize: 12, color: "#3a3630", fontStyle: "italic" }}>tip: paste a CSV to fill the list instantly</span>
            </div>
          </div>
        )}

        {/* Progress */}
        {running && (
          <div style={{ ...S.card, marginBottom: 28, borderColor: "rgba(184,149,106,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 13, color: "#b8956a" }}>Processing {progress.done} of {progress.total} prospects…</div>
              <div style={{ fontSize: 12, color: "#4a4640" }}>{pct}%</div>
            </div>
            <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg, #b8956a, #d4af80)", borderRadius: 2, transition: "width 0.5s ease" }} />
            </div>
            <button onClick={() => { cancelRef.current = true; }}
              style={{ marginTop: 14, background: "transparent", border: "1px solid rgba(180,60,60,0.3)", borderRadius: 3, color: "#e08080", padding: "6px 16px", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", fontFamily: "Georgia, serif" }}>
              Cancel
            </button>
          </div>
        )}

        {/* Results list */}
        {results.length > 0 && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "#b8956a" }}>
                Results — {results.filter(r => r.status === "done").length} / {results.length} complete
              </div>
              {isDone && (
                <button onClick={reset}
                  style={{ background: "transparent", border: "1px solid rgba(184,149,106,0.3)", borderRadius: 3, color: "#b8956a", padding: "6px 16px", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", fontFamily: "Georgia, serif" }}>
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

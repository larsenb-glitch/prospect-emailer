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
- Bad reviews kill leasing — Opiniion automatically converts happy residents into public reviews, helping properties significantly improve their star ratings and review volume within months
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
- Always open with "Hey [first name]," or "Hi [first name]," on its own line before the rest of the email
- Connect that pain point to ONE specific Opiniion capability — use a concrete stat or outcome if relevant
- End with a soft CTA ("Worth a quick call?" or "Open to a 15-min demo?")
- Write like a real person — no buzzwords, no "I hope this finds you well", no fluff
- Format the body with a line break between each sentence — no walls of text
- Pick the ONE most relevant feature, don't list everything

Return ONLY this JSON with no other text:
{"subject":"...","body":"..."}`;

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

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Serif+Display:ital@0;1&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body { background: #f0f4f8; }

  .app { min-height: 100vh; font-family: 'DM Sans', sans-serif; color: #1a2e44; }

  .topbar {
    background: linear-gradient(135deg, #0f2035 0%, #1a3a5c 100%);
    padding: 0 40px;
    height: 64px;
    display: flex;
    align-items: center;
    gap: 0;
    box-shadow: 0 4px 24px rgba(0,0,0,0.18);
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .topbar-logo { height: 30px; filter: brightness(0) invert(1); }

  .topbar-divider {
    width: 1px;
    height: 22px;
    background: rgba(255,255,255,0.2);
    margin: 0 18px;
  }

  .topbar-title {
    color: rgba(255,255,255,0.85);
    font-size: 13px;
    font-weight: 500;
    letter-spacing: 0.04em;
  }

  .topbar-badge {
    margin-left: auto;
    background: rgba(43,191,191,0.2);
    border: 1px solid rgba(43,191,191,0.4);
    color: #2bbfbf;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: 4px 10px;
    border-radius: 20px;
  }

  .hero {
    background: linear-gradient(135deg, #0f2035 0%, #1a3a5c 100%);
    padding: 28px 40px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }

  .hero-inner { max-width: 1060px; margin: 0 auto; display: flex; align-items: flex-start; gap: 48px; flex-wrap: wrap; }

  .hero-intro { flex: 1; min-width: 260px; }

  .hero-intro p {
    color: rgba(255,255,255,0.55);
    font-size: 13px;
    line-height: 1.6;
    margin-top: 4px;
  }

  .hero-title {
    color: rgba(255,255,255,0.9);
    font-size: 15px;
    font-weight: 600;
  }

  .steps {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    flex: 2;
    min-width: 300px;
  }

  .step {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    flex: 1;
    min-width: 140px;
  }

  .step-num {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: rgba(43,191,191,0.2);
    border: 1px solid rgba(43,191,191,0.4);
    color: #2bbfbf;
    font-size: 11px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 1px;
  }

  .step-text {
    font-size: 12px;
    color: rgba(255,255,255,0.55);
    line-height: 1.5;
  }

  .step-text strong {
    display: block;
    color: rgba(255,255,255,0.85);
    font-size: 13px;
    margin-bottom: 2px;
  }

  .wrap { max-width: 1060px; margin: 0 auto; padding: 36px 40px 60px; }

  .section-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #2bbfbf;
    margin-bottom: 14px;
  }

  .card {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    padding: 28px 32px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.05);
    margin-bottom: 20px;
  }

  .card-teal {
    background: linear-gradient(135deg, #e8f9f9 0%, #f0fefe 100%);
    border: 1px solid rgba(43,191,191,0.2);
    border-radius: 14px;
    padding: 28px 32px;
  }

  .grid-cols-header {
    display: grid;
    grid-template-columns: 1fr 1fr 38px;
    gap: 12px;
    margin-bottom: 12px;
  }

  .col-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #94a3b8;
  }

  .row-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 38px;
    gap: 12px;
    margin-bottom: 10px;
  }

  .inp {
    width: 100%;
    background: #f8fafc;
    border: 1.5px solid #e2e8f0;
    border-radius: 8px;
    padding: 11px 15px;
    font-size: 14px;
    font-family: 'DM Sans', sans-serif;
    color: #1a2e44;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }

  .inp:focus {
    border-color: #2bbfbf;
    box-shadow: 0 0 0 3px rgba(43,191,191,0.12);
    background: #fff;
  }

  .inp::placeholder { color: #b0bec5; }

  .btn-ghost {
    background: transparent;
    border: 1.5px solid #e2e8f0;
    border-radius: 8px;
    color: #64748b;
    padding: 10px 20px;
    font-size: 13px;
    font-weight: 600;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    transition: all 0.15s;
  }
  .btn-ghost:hover { border-color: #2bbfbf; color: #2bbfbf; }

  .btn-remove {
    background: transparent;
    border: 1.5px solid #e2e8f0;
    border-radius: 8px;
    color: #b0bec5;
    font-size: 18px;
    cursor: pointer;
    transition: all 0.15s;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .btn-remove:hover { border-color: #fc8181; color: #fc8181; background: #fff5f5; }

  .btn-primary {
    background: linear-gradient(135deg, #2bbfbf 0%, #1a9e9e 100%);
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 11px 28px;
    font-size: 14px;
    font-weight: 700;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    transition: all 0.15s;
    box-shadow: 0 4px 14px rgba(43,191,191,0.3);
  }
  .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(43,191,191,0.4); }
  .btn-primary:disabled { background: #b2dfdf; box-shadow: none; cursor: not-allowed; transform: none; }

  .btn-copy {
    background: linear-gradient(135deg, #2bbfbf 0%, #1a9e9e 100%);
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 10px 20px;
    font-size: 13px;
    font-weight: 600;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    transition: all 0.15s;
    margin-top: 14px;
    width: 100%;
  }
  .btn-copy.copied { background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); }

  .tip-text {
    font-size: 12px;
    color: #94a3b8;
    font-style: italic;
  }

  .progress-bar-track {
    height: 6px;
    background: #e2e8f0;
    border-radius: 3px;
    overflow: hidden;
    margin: 10px 0;
  }

  .progress-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #2bbfbf, #1a9e9e);
    border-radius: 3px;
    transition: width 0.5s ease;
  }

  .results-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .result-card {
    background: #fff;
    border: 1.5px solid #e2e8f0;
    border-radius: 14px;
    margin-bottom: 10px;
    overflow: hidden;
    transition: box-shadow 0.2s;
  }
  .result-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.07); }
  .result-card.done { border-color: rgba(43,191,191,0.3); }
  .result-card.error { border-color: rgba(252,129,129,0.4); }

  .result-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 24px;
    gap: 12px;
  }

  .result-left {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .result-name { font-size: 15px; font-weight: 600; color: #1a2e44; }
  .result-dot { color: #e2e8f0; }
  .result-company { font-size: 13px; color: #64748b; }
  .result-title { font-size: 12px; color: #94a3b8; }
  .result-error { font-size: 12px; color: #fc8181; font-style: italic; }

  .badge {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: 3px 9px;
    border-radius: 20px;
    white-space: nowrap;
  }
  .badge-idle    { color: #94a3b8; background: #f1f5f9; }
  .badge-researching { color: #1a9e9e; background: rgba(43,191,191,0.12); }
  .badge-writing { color: #3b7dd8; background: rgba(59,125,216,0.1); }
  .badge-done    { color: #38a169; background: rgba(72,187,120,0.12); }
  .badge-error   { color: #e53e3e; background: rgba(252,129,129,0.12); }

  .btn-view {
    background: transparent;
    border: 1.5px solid #2bbfbf;
    border-radius: 8px;
    color: #2bbfbf;
    padding: 6px 16px;
    font-size: 12px;
    font-weight: 700;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.15s;
  }
  .btn-view:hover { background: #2bbfbf; color: #fff; }

  .expand-panel {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    padding: 0 24px 24px;
    border-top: 1px solid #f0f4f8;
  }

  .micro-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #94a3b8;
    margin-bottom: 5px;
  }

  .micro-val {
    font-size: 13px;
    color: #4a5568;
    line-height: 1.6;
    margin-bottom: 14px;
  }

  .subject-box {
    background: #f8fafc;
    border: 1.5px solid #e2e8f0;
    border-radius: 8px;
    padding: 10px 14px;
    font-size: 14px;
    font-weight: 600;
    color: #1a2e44;
    margin-bottom: 14px;
  }

  .email-textarea {
    width: 100%;
    background: #f8fafc;
    border: 1.5px solid #e2e8f0;
    border-radius: 8px;
    padding: 12px 15px;
    font-size: 14px;
    font-family: 'DM Sans', sans-serif;
    color: #1a2e44;
    line-height: 1.85;
    resize: vertical;
    min-height: 170px;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
    white-space: pre-wrap;
  }
  .email-textarea:focus {
    border-color: #2bbfbf;
    box-shadow: 0 0 0 3px rgba(43,191,191,0.12);
    background: #fff;
  }

  .panel-title {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #1a9e9e;
    margin-bottom: 18px;
    padding-bottom: 10px;
    border-bottom: 1.5px solid rgba(43,191,191,0.2);
  }

  .cancel-btn {
    background: transparent;
    border: 1.5px solid #fc8181;
    border-radius: 8px;
    color: #e53e3e;
    padding: 7px 18px;
    font-size: 12px;
    font-weight: 600;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    margin-top: 14px;
  }

  .new-batch-btn {
    background: transparent;
    border: 1.5px solid #2bbfbf;
    border-radius: 8px;
    color: #2bbfbf;
    padding: 7px 18px;
    font-size: 13px;
    font-weight: 600;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    transition: all 0.15s;
  }
  .new-batch-btn:hover { background: #2bbfbf; color: #fff; }
`;

let idCounter = 0;
const newRow = () => ({ id: ++idCounter, name: "", company: "" });

function StatusBadge({ status }) {
  const map = {
    idle: { cls: "badge-idle", label: "Queued" },
    researching: { cls: "badge-researching", label: "Researching…" },
    writing: { cls: "badge-writing", label: "Writing…" },
    done: { cls: "badge-done", label: "Done ✓" },
    error: { cls: "badge-error", label: "Error" },
  };
  const s = map[status] || map.idle;
  return <span className={`badge ${s.cls}`}>{s.label}</span>;
}

function ResultCard({ result, onRegenerate }) {
  const [expanded, setExpanded] = useState(false);
  const [editBody, setEditBody] = useState(result.email?.body || "");
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedSubject, setCopiedSubject] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  if (result.email && !editBody && result.email.body) setEditBody(result.email.body);

  const copyAll = () => {
    navigator.clipboard.writeText(`Subject: ${result.email.subject}\n\n${editBody}`);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const copySubject = () => {
    navigator.clipboard.writeText(result.email.subject);
    setCopiedSubject(true);
    setTimeout(() => setCopiedSubject(false), 2000);
  };

  const copyBody = () => {
    navigator.clipboard.writeText(editBody);
    setCopiedBody(true);
    setTimeout(() => setCopiedBody(false), 2000);
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    await onRegenerate(result.id, result.research);
    setRegenerating(false);
    setEditBody("");
  };

  const cardClass = `result-card ${result.status === "done" ? "done" : result.status === "error" ? "error" : ""}`;

  return (
    <div className={cardClass}>
      <div className="result-row">
        <div className="result-left">
          <StatusBadge status={regenerating ? "writing" : result.status} />
          <span className="result-name">{result.name}</span>
          <span className="result-dot">·</span>
          <span className="result-company">{result.company}</span>
          {result.research?.title && <span className="result-title">{result.research.title}</span>}
          {result.status === "error" && <span className="result-error">{result.errorMsg}</span>}
        </div>
        {result.status === "done" && (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="btn-view"
              onClick={handleRegenerate}
              disabled={regenerating}
              style={{ borderColor: "#94a3b8", color: "#64748b" }}
            >
              {regenerating ? "Rewriting…" : "↺ Regenerate"}
            </button>
            <button className="btn-view" onClick={() => setExpanded(x => !x)}>
              {expanded ? "Collapse ▲" : "View Email ▼"}
            </button>
          </div>
        )}
      </div>

      {expanded && result.status === "done" && (
        <div className="expand-panel">
          <div className="card-teal" style={{ margin: 0 }}>
            <div className="panel-title">Research Brief</div>
            {[
              ["Title", result.research.title],
              ["Industry", result.research.industry],
              ["About", result.research.companyDescription],
              ["Size", result.research.companySize],
              ["Recent News", result.research.recentNews],
              ["Pain Points", result.research.painPoints],
            ].filter(([, v]) => v).map(([label, value]) => (
              <div key={label}>
                <div className="micro-label">{label}</div>
                <div className="micro-val">{value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div className="panel-title">Draft Email</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <div className="micro-label" style={{ margin: 0 }}>Subject Line</div>
              <button
                onClick={copySubject}
                style={{ background: "transparent", border: "none", fontSize: 11, color: copiedSubject ? "#38a169" : "#2bbfbf", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", padding: "2px 0" }}
              >
                {copiedSubject ? "✓ Copied" : "Copy"}
              </button>
            </div>
            <div className="subject-box">{result.email.subject}</div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <div className="micro-label" style={{ margin: 0 }}>Body <span style={{ textTransform: "none", letterSpacing: 0, color: "#b0bec5", fontWeight: 400 }}>(editable)</span></div>
              <button
                onClick={copyBody}
                style={{ background: "transparent", border: "none", fontSize: 11, color: copiedBody ? "#38a169" : "#2bbfbf", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", padding: "2px 0" }}
              >
                {copiedBody ? "✓ Copied" : "Copy"}
              </button>
            </div>
            <textarea
              className="email-textarea"
              value={regenerating ? "Rewriting email…" : editBody}
              onChange={e => setEditBody(e.target.value)}
              disabled={regenerating}
            />
            <button className={`btn-copy${copiedAll ? " copied" : ""}`} onClick={copyAll} disabled={regenerating}>
              {copiedAll ? "✓ Copied to clipboard!" : "Copy Subject + Body Together"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
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
    setResults(validRows.map(r => ({ ...r, status: "idle", research: null, email: null, errorMsg: "" })));

    for (let i = 0; i < validRows.length; i++) {
      if (cancelRef.current) break;
      const { name, company, id } = validRows[i];
      const update = (patch) => setResults(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
      try {
        update({ status: "researching" });
        const rawResearch = await callClaude(RESEARCH_PROMPT(name, company), true);
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

  const regenerate = async (id, research) => {
    const update = (patch) => setResults(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
    try {
      const rawEmail = await callClaude(EMAIL_PROMPT(research), false);
      const email = JSON.parse(rawEmail);
      update({ email, status: "done" });
    } catch (err) {
      update({ status: "error", errorMsg: err.message || "Failed" });
    }
  };

  const reset = () => {
    setResults([]);
    setProgress({ done: 0, total: 0 });
    setRows([newRow(), newRow(), newRow()]);
  };

  const isDone = results.length > 0 && !running;
  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <>
      <style>{css}</style>
      <div className="app">

        {/* Topbar */}
        <div className="topbar">
          <img className="topbar-logo" src="https://opiniion.com/wp-content/uploads/2022/05/Group-943.svg" alt="Opiniion" />
          <div className="topbar-divider" />
          <span className="topbar-title">Prospect Emailer</span>
          <span className="topbar-badge">Sales Tool</span>
        </div>

        {/* Hero */}
        <div className="hero">
          <div className="hero-inner">
            <div className="hero-intro">
              <div className="hero-title">Prospect Emailer</div>
              <p>Enter a prospect's name and company — we'll research them and write a personalized cold email for you.</p>
            </div>
            <div className="steps">
              <div className="step">
                <div className="step-num">1</div>
                <div className="step-text"><strong>Add Prospects</strong>Type names and companies below, or paste a CSV list.</div>
              </div>
              <div className="step">
                <div className="step-num">2</div>
                <div className="step-text"><strong>Hit Run</strong>We'll research each prospect and write a tailored email.</div>
              </div>
              <div className="step">
                <div className="step-num">3</div>
                <div className="step-text"><strong>Review & Send</strong>Edit the email if needed, then copy and paste into Gmail.</div>
              </div>
            </div>
          </div>
        </div>

        <div className="wrap">

          {/* Input */}
          {!running && results.length === 0 && (
            <div className="card">
              <div className="section-label">Add Prospects</div>
              <div className="grid-cols-header">
                <div className="col-label">Prospect Name</div>
                <div className="col-label">Company</div>
                <div />
              </div>
              <div onPaste={handlePaste}>
                {rows.map(r => (
                  <div key={r.id} className="row-grid">
                    <input className="inp" value={r.name} onChange={e => updateRow("name", e.target.value, r.id)} placeholder="e.g. Sarah Chen" />
                    <input className="inp" value={r.company} onChange={e => updateRow("company", e.target.value, r.id)} placeholder="e.g. Greystar" />
                    <button className="btn-remove" onClick={() => updateRow("remove", null, r.id)}>×</button>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 18, alignItems: "center", flexWrap: "wrap" }}>
                <button className="btn-ghost" onClick={() => setRows(r => [...r, newRow()])}>+ Add Row</button>
                <button className="btn-primary" onClick={run} disabled={!validRows.length}>
                  Run {validRows.length > 0 ? `${validRows.length} Prospect${validRows.length !== 1 ? "s" : ""}` : ""} →
                </button>
                <span className="tip-text">tip: paste a CSV (Name, Company) to fill instantly</span>
              </div>
            </div>
          )}

          {/* Progress */}
          {running && (
            <div className="card">
              <div className="section-label">Processing</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#1a2e44" }}>
                  {progress.done} of {progress.total} prospects complete
                </span>
                <span style={{ fontSize: 13, color: "#94a3b8", fontWeight: 600 }}>{pct}%</span>
              </div>
              <div className="progress-bar-track">
                <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
              </div>
              <button className="cancel-btn" onClick={() => { cancelRef.current = true; }}>Cancel</button>
            </div>
          )}

          {/* Results */}
          {results.length > 0 && (
            <div>
              <div className="results-header">
                <div className="section-label" style={{ margin: 0 }}>
                  Results — {results.filter(r => r.status === "done").length} of {results.length} complete
                </div>
                {isDone && <button className="new-batch-btn" onClick={reset}>↺ New Batch</button>}
              </div>
              {results.map(r => <ResultCard key={r.id} result={r} onRegenerate={regenerate} />)}
            </div>
          )}

        </div>
      </div>
    </>
  );
}

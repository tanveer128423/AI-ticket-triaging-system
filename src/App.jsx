import { useEffect, useMemo, useState } from "react";
import {
  BrowserRouter,
  NavLink,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import ProviderSelector from "./components/ProviderSelector";
import TicketForm from "./components/TicketForm";
import ResultCard from "./components/ResultCard";
import Dashboard from "./components/Dashboard";
import BatchTriage from "./components/BatchTriage";
import ErrorAlert from "./components/ErrorAlert";
import { analyzeTicket } from "./services/triageService";

const HISTORY_KEY = "ticketHistory";

const SAMPLE_TICKET =
  "Unable to post a vendor invoice in SAP Finance after latest patch. Error code FI-422 appears for all users and blocking month-end closure.";

const SAMPLE_TICKETS = [
  {
    title: "Finance Blocker",
    text: "Unable to post a vendor invoice in SAP Finance after latest patch. Error code FI-422 appears for all users and blocking month-end closure.",
  },
  {
    title: "Inventory Mismatch",
    text: "Warehouse team reports stock mismatch in Oracle Fusion Inventory after cycle count import. Pick-and-pack is delayed for 3 major orders.",
  },
  {
    title: "HR Access",
    text: "New joiners cannot access employee profile updates in Microsoft Dynamics HR portal. This affects onboarding compliance tasks.",
  },
];

export default function App() {
  const [provider, setProvider] = useState("openai");
  const [apiKey, setApiKey] = useState("");
  const [ticket, setTicket] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [copyStatus, setCopyStatus] = useState("");

  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem(HISTORY_KEY);

    if (!saved) {
      return [];
    }

    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const insight = useMemo(() => {
    if (history.length === 0) {
      return {
        averageConfidence: 0,
        highRiskRate: 0,
      };
    }

    const totalConfidence = history.reduce((acc, current) => {
      const value = Number.parseInt(current.confidence, 10);
      return acc + (Number.isNaN(value) ? 0 : value);
    }, 0);

    const highRisk = history.filter(
      (item) => item.priority === "High" || item.escalation_required,
    ).length;

    return {
      averageConfidence: Math.round(totalConfidence / history.length),
      highRiskRate: Math.round((highRisk / history.length) * 100),
    };
  }, [history]);

  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }, [history]);

  const handleAnalyze = async () => {
    const normalizedTicket = ticket.trim();

    if (normalizedTicket.length < 20) {
      setError(
        "Please enter a detailed ticket description (min 20 characters).",
      );
      return;
    }

    if (!apiKey.trim()) {
      setError("Please enter API key.");
      return;
    }

    try {
      setError("");
      setLoading(true);
      setResult(null);

      const analysis = await analyzeTicket(
        provider,
        apiKey.trim(),
        normalizedTicket,
      );

      setResult(analysis);
      setHistory((prev) => [analysis, ...prev]);
      setTicket("");
    } catch (err) {
      setError(err.message);
    }

    setLoading(false);
  };

  const handleBatchComplete = (analyses) => {
    if (!Array.isArray(analyses) || analyses.length === 0) {
      return;
    }
    setHistory((prev) => [...analyses.slice().reverse(), ...prev]);
  };

  const clearHistory = () => {
    localStorage.removeItem(HISTORY_KEY);
    setHistory([]);
  };

  const handleCopyResult = async () => {
    if (!result) {
      return;
    }

    try {
      await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
      setCopyStatus("Copied");
    } catch {
      setCopyStatus("Copy failed");
    }

    setTimeout(() => setCopyStatus(""), 1800);
  };

  const handleDownloadResult = () => {
    if (!result) {
      return;
    }

    const blob = new Blob([JSON.stringify(result, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${result.ticket_id || "ticket-analysis"}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const navClassName = ({ isActive }) =>
    `rounded-full border px-4 py-1 text-xs font-semibold uppercase tracking-wide transition ${
      isActive
        ? "border-slate-900 bg-slate-900 text-white"
        : "border-slate-300 text-slate-700 hover:border-slate-900"
    }`;

  return (
    <BrowserRouter>
      <div className="min-h-screen px-4 py-6 md:px-8 md:py-10">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
          <header className="hero-card animate-rise rounded-3xl border border-white/60 px-5 py-6 shadow-xl md:px-10 md:py-9">
            <h1 className="mt-2 max-w-2xl text-3xl font-bold leading-tight text-slate-900 md:text-5xl">
              AI Ticket Triage Copilot for ERP Operations
            </h1>
            <p className="mt-4 max-w-2xl text-sm text-slate-600 md:text-base">
              Route enterprise support tickets with deterministic prompting,
              confidence scoring, escalation insights, and provider switching.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <NavLink to="/" end className={navClassName}>
                Home
              </NavLink>
              <NavLink to="/triage" className={navClassName}>
                Triage
              </NavLink>
              <NavLink to="/batch" className={navClassName}>
                Batch
              </NavLink>
              <NavLink to="/dashboard" className={navClassName}>
                Dashboard
              </NavLink>
            </div>
          </header>

          <Routes>
            <Route
              path="/"
              element={
                <section className="animate-rise rounded-3xl border border-white/65 bg-white/88 p-5 shadow-xl backdrop-blur md:p-7">
                  <h2 className="text-xl font-semibold text-slate-900">
                    Overview
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm text-slate-600">
                    Use this app to classify ERP support tickets, estimate
                    urgency, and route cases to the right team with confidence
                    scoring.
                  </p>

                  <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="hero-stat">
                      <p>Tickets Processed</p>
                      <strong>{history.length}</strong>
                    </div>
                    <div className="hero-stat">
                      <p>Avg. Confidence</p>
                      <strong>
                        {history.length === 0
                          ? "-"
                          : `${insight.averageConfidence}%`}
                      </strong>
                    </div>
                    <div className="hero-stat">
                      <p>High Risk Rate</p>
                      <strong>
                        {history.length === 0
                          ? "-"
                          : `${insight.highRiskRate}%`}
                      </strong>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <article className="showcase-card">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Engineering Highlights
                      </p>
                      <h3 className="mt-2 text-lg font-semibold text-slate-900">
                        Built for operational reliability
                      </h3>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="chip">Multi-Provider Routing</span>
                        <span className="chip">Structured JSON Parsing</span>
                        <span className="chip">Confidence & SLA Logic</span>
                        <span className="chip">Local History Analytics</span>
                      </div>
                    </article>

                    <article className="showcase-card">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Triage Workflow
                      </p>
                      <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-slate-700">
                        <div className="workflow-step">
                          1. Capture issue context and impact.
                        </div>
                        <div className="workflow-step">
                          2. Classify category, module, issue type.
                        </div>
                        <div className="workflow-step">
                          3. Compute priority, confidence, SLA target.
                        </div>
                        <div className="workflow-step">
                          4. Route to team with first response text.
                        </div>
                      </div>
                    </article>
                  </div>
                </section>
              }
            />

            <Route
              path="/triage"
              element={
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
                  <section className="animate-rise rounded-3xl border border-white/65 bg-white/88 p-5 shadow-xl backdrop-blur xl:col-span-3 md:p-7">
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
                      <h2 className="text-xl font-semibold text-slate-900">
                        Run Triage
                      </h2>
                      <div className="flex flex-wrap gap-2">
                        {SAMPLE_TICKETS.map((sample) => (
                          <button
                            key={sample.title}
                            type="button"
                            onClick={() => setTicket(sample.text)}
                            className="rounded-full border border-slate-300/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
                          >
                            {sample.title}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            setTicket(SAMPLE_TICKET);
                            setError("");
                          }}
                          className="rounded-full border border-slate-900/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-800 transition hover:bg-slate-900 hover:text-white"
                        >
                          Quick Fill
                        </button>
                      </div>
                    </div>

                    <ProviderSelector
                      provider={provider}
                      setProvider={setProvider}
                    />

                    <TicketForm
                      provider={provider}
                      apiKey={apiKey}
                      setApiKey={setApiKey}
                      ticket={ticket}
                      setTicket={setTicket}
                      loading={loading}
                      onAnalyze={handleAnalyze}
                    />

                    {error && <ErrorAlert message={error} />}
                  </section>

                  <section className="animate-rise rounded-3xl border border-white/65 bg-white/90 p-5 shadow-xl backdrop-blur xl:col-span-2 md:p-7">
                    {result ? (
                      <>
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Result Actions
                          </p>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={handleCopyResult}
                              className="rounded-full border border-slate-300 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-700 transition hover:border-slate-900"
                            >
                              {copyStatus || "Copy JSON"}
                            </button>
                            <button
                              type="button"
                              onClick={handleDownloadResult}
                              className="rounded-full border border-slate-300 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-700 transition hover:border-slate-900"
                            >
                              Download
                            </button>
                          </div>
                        </div>
                        <ResultCard result={result} />
                      </>
                    ) : (
                      <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/90 p-6 text-center text-sm text-slate-500">
                        Your latest analysis will appear here with priority
                        signal, confidence, and a ready-to-send first response.
                      </div>
                    )}
                  </section>
                </div>
              }
            />

            <Route
              path="/batch"
              element={
                <BatchTriage
                  provider={provider}
                  setProvider={setProvider}
                  apiKey={apiKey}
                  setApiKey={setApiKey}
                  onComplete={handleBatchComplete}
                />
              }
            />

            <Route
              path="/dashboard"
              element={
                history.length > 0 ? (
                  <Dashboard history={history} onClear={clearHistory} />
                ) : (
                  <section className="animate-rise rounded-3xl border border-white/65 bg-white/88 p-6 text-sm text-slate-600 shadow-xl backdrop-blur">
                    No triage history yet. Run an analysis from the Triage page.
                  </section>
                )
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

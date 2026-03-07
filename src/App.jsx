import { useEffect, useMemo, useState } from "react";
import ProviderSelector from "./components/ProviderSelector";
import TicketForm from "./components/TicketForm";
import ResultCard from "./components/ResultCard";
import Dashboard from "./components/Dashboard";
import ErrorAlert from "./components/ErrorAlert";
import { analyzeTicket } from "./services/triageService";

const HISTORY_KEY = "ticketHistory";

const SAMPLE_TICKET =
  "Unable to post a vendor invoice in SAP Finance after latest patch. Error code FI-422 appears for all users and blocking month-end closure.";

export default function App() {
  const [provider, setProvider] = useState("openai");
  const [apiKey, setApiKey] = useState("");
  const [ticket, setTicket] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

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

  const clearHistory = () => {
    localStorage.removeItem(HISTORY_KEY);
    setHistory([]);
  };

  return (
    <div className="min-h-screen app-surface px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="hero-card animate-rise rounded-3xl border border-white/60 px-5 py-6 shadow-xl md:px-10 md:py-9">
          <p className="tracking-[0.22em] text-xs font-semibold uppercase text-slate-500">
            Portfolio Showcase
          </p>
          <h1 className="mt-2 max-w-2xl text-3xl font-bold leading-tight text-slate-900 md:text-5xl">
            AI Ticket Triage Copilot for ERP Operations
          </h1>
          <p className="mt-4 max-w-2xl text-sm text-slate-600 md:text-base">
            Route enterprise support tickets with deterministic prompting,
            confidence scoring, escalation insights, and provider switching.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="hero-stat">
              <p>Tickets Processed</p>
              <strong>{history.length}</strong>
            </div>
            <div className="hero-stat">
              <p>Avg. Confidence</p>
              <strong>
                {history.length === 0 ? "-" : `${insight.averageConfidence}%`}
              </strong>
            </div>
            <div className="hero-stat">
              <p>High Risk Rate</p>
              <strong>
                {history.length === 0 ? "-" : `${insight.highRiskRate}%`}
              </strong>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
          <section className="animate-rise rounded-3xl border border-white/65 bg-white/88 p-5 shadow-xl backdrop-blur xl:col-span-3 md:p-7">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">
                Run Triage
              </h2>
              <button
                type="button"
                onClick={() => setTicket(SAMPLE_TICKET)}
                className="rounded-full border border-slate-300/80 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
              >
                Load Sample Ticket
              </button>
            </div>

            <ProviderSelector provider={provider} setProvider={setProvider} />

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
              <ResultCard result={result} />
            ) : (
              <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/90 p-6 text-center text-sm text-slate-500">
                Your latest analysis will appear here with priority signal,
                confidence, and a ready-to-send first response.
              </div>
            )}
          </section>
        </div>

        {history.length > 0 && (
          <Dashboard history={history} onClear={clearHistory} />
        )}
      </div>
    </div>
  );
}

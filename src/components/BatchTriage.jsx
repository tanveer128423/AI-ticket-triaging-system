import { useMemo, useRef, useState } from "react";
import {
  analyzeBatch,
  parseTicketsInput,
  toCsv,
} from "../services/triageService";
import ProviderSelector from "./ProviderSelector";
import ErrorAlert from "./ErrorAlert";

const SAMPLE_BATCH = `Unable to post a vendor invoice in SAP Finance after latest patch. Error FI-422 blocks month-end closure for all users.
Warehouse team reports stock mismatch in Oracle Fusion Inventory after cycle count import. Pick-and-pack delayed for 3 major orders.
New joiners cannot access employee profile updates in Microsoft Dynamics HR portal, affecting onboarding compliance tasks.
Purchase order approval workflow is stuck in SAP Procurement for amounts above the manager threshold limit.
User requests guidance on running a custom sales report in Oracle Fusion for the quarterly review meeting.`;

export default function BatchTriage({
  provider,
  setProvider,
  apiKey,
  setApiKey,
  onComplete,
}) {
  const [rawInput, setRawInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [results, setResults] = useState([]);
  const fileInputRef = useRef(null);

  const parsedCount = useMemo(
    () => parseTicketsInput(rawInput).length,
    [rawInput],
  );

  const summary = useMemo(() => {
    const ok = results.filter((r) => r.ok);
    const failed = results.filter((r) => !r.ok);
    const high = ok.filter((r) => r.analysis.priority === "High").length;
    const escalated = ok.filter((r) => r.analysis.escalation_required).length;
    const review = ok.filter((r) => r.analysis.human_review_required).length;
    return { ok: ok.length, failed: failed.length, high, escalated, review };
  }, [results]);

  const successAnalyses = useMemo(
    () => results.filter((r) => r.ok).map((r) => r.analysis),
    [results],
  );

  const handleFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setRawInput(String(e.target?.result || ""));
      setError("");
    };
    reader.readAsText(file);
  };

  const handleRun = async () => {
    const tickets = parseTicketsInput(rawInput);

    if (tickets.length === 0) {
      setError("Add at least one ticket (one per line, or upload a CSV).");
      return;
    }

    if (!apiKey.trim()) {
      setError("Please enter API key.");
      return;
    }

    if (tickets.length > 50) {
      setError("Batch limit is 50 tickets per run. Please reduce the list.");
      return;
    }

    try {
      setError("");
      setLoading(true);
      setResults([]);
      setProgress({ completed: 0, total: tickets.length });

      const batchResults = await analyzeBatch(
        provider,
        apiKey.trim(),
        tickets,
        (p) => setProgress(p),
      );

      setResults(batchResults);

      const successful = batchResults
        .filter((r) => r.ok)
        .map((r) => r.analysis);

      if (successful.length > 0 && typeof onComplete === "function") {
        onComplete(successful);
      }
    } catch (err) {
      setError(err.message || "Batch triage failed.");
    }

    setLoading(false);
  };

  const downloadBlob = (content, type, filename) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = () => {
    if (successAnalyses.length === 0) {
      return;
    }
    downloadBlob(
      toCsv(successAnalyses),
      "text/csv;charset=utf-8",
      `batch-triage-${Date.now()}.csv`,
    );
  };

  const handleExportJson = () => {
    if (successAnalyses.length === 0) {
      return;
    }
    downloadBlob(
      JSON.stringify(successAnalyses, null, 2),
      "application/json",
      `batch-triage-${Date.now()}.json`,
    );
  };

  const priorityClass = (priority) =>
    priority === "High"
      ? "bg-red-100 text-red-700"
      : priority === "Medium"
        ? "bg-amber-100 text-amber-700"
        : "bg-emerald-100 text-emerald-700";

  const progressPct =
    progress.total === 0
      ? 0
      : Math.round((progress.completed / progress.total) * 100);

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
      <section className="animate-rise rounded-3xl border border-white/65 bg-white/88 p-5 shadow-xl backdrop-blur xl:col-span-2 md:p-7">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-semibold text-slate-900">Batch Triage</h2>
          <button
            type="button"
            onClick={() => {
              setRawInput(SAMPLE_BATCH);
              setError("");
            }}
            className="rounded-full border border-slate-900/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-800 transition hover:bg-slate-900 hover:text-white"
          >
            Load Sample
          </button>
        </div>

        <ProviderSelector provider={provider} setProvider={setProvider} />

        <div className="mt-6 space-y-2">
          <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            {provider === "openai"
              ? "OpenAI API Key"
              : provider === "google"
                ? "Gemini API Key"
                : "Grok API Key"}
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            autoComplete="off"
            placeholder="sk-..."
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-900"
          />
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Tickets (one per line or CSV)
            </label>
            <span className="text-[11px] font-semibold text-slate-500">
              {parsedCount} detected
            </span>
          </div>
          <textarea
            rows="9"
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            placeholder={
              "Paste one ticket per line, or upload a CSV.\nA CSV with a column named ticket/description/issue is auto-detected."
            }
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-900"
          />
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFile}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-full border border-slate-300 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-700 transition hover:border-slate-900"
            >
              Upload CSV / TXT
            </button>
            {rawInput && (
              <button
                type="button"
                onClick={() => {
                  setRawInput("");
                  setResults([]);
                  setError("");
                }}
                className="rounded-full border border-slate-300 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-700 transition hover:border-slate-900"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={handleRun}
          disabled={loading}
          className={`mt-5 w-full rounded-2xl px-4 py-3 text-sm font-semibold uppercase tracking-wide transition ${
            loading
              ? "cursor-not-allowed bg-slate-300 text-slate-500"
              : "bg-slate-900 text-white hover:bg-black"
          }`}
        >
          {loading
            ? `Analyzing ${progress.completed}/${progress.total}...`
            : `Triage ${parsedCount || ""} Tickets`.trim()}
        </button>

        {loading && (
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-slate-900 transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        )}

        {error && <ErrorAlert message={error} />}
      </section>

      <section className="animate-rise rounded-3xl border border-white/65 bg-white/90 p-5 shadow-xl backdrop-blur xl:col-span-3 md:p-7">
        {results.length === 0 ? (
          <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/90 p-6 text-center text-sm text-slate-500">
            Triaged tickets will appear here as a queue with priority, SLA, and
            export to CSV/JSON. Results are also added to the Dashboard.
          </div>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xl font-semibold text-slate-900">
                Batch Results
              </h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleExportCsv}
                  disabled={successAnalyses.length === 0}
                  className="rounded-full border border-slate-300 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-700 transition hover:border-slate-900 disabled:opacity-40"
                >
                  Export CSV
                </button>
                <button
                  type="button"
                  onClick={handleExportJson}
                  disabled={successAnalyses.length === 0}
                  className="rounded-full border border-slate-300 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-700 transition hover:border-slate-900 disabled:opacity-40"
                >
                  Export JSON
                </button>
              </div>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-5">
              <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Triaged
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {summary.ok}
                </p>
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-red-600">
                  High
                </p>
                <p className="mt-1 text-lg font-semibold text-red-700">
                  {summary.high}
                </p>
              </div>
              <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-700">
                  Escalated
                </p>
                <p className="mt-1 text-lg font-semibold text-sky-700">
                  {summary.escalated}
                </p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-600">
                  Review
                </p>
                <p className="mt-1 text-lg font-semibold text-amber-700">
                  {summary.review}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Failed
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-700">
                  {summary.failed}
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <div className="max-h-[460px] overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-slate-100 text-[11px] uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2 font-semibold">#</th>
                      <th className="px-3 py-2 font-semibold">Ticket</th>
                      <th className="px-3 py-2 font-semibold">Category</th>
                      <th className="px-3 py-2 font-semibold">Priority</th>
                      <th className="px-3 py-2 font-semibold">SLA</th>
                      <th className="px-3 py-2 font-semibold">Conf.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((row) => (
                      <tr
                        key={row.index}
                        className="border-t border-slate-100 align-top"
                      >
                        <td className="px-3 py-2 text-slate-500">
                          {row.index + 1}
                        </td>
                        <td className="max-w-[280px] px-3 py-2 text-slate-700">
                          <p className="line-clamp-2">{row.ticket_text}</p>
                          {row.ok ? (
                            <span className="text-[10px] text-slate-400">
                              {row.analysis.erp_module} ·{" "}
                              {row.analysis.assigned_team}
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-red-600">
                              {row.error}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          {row.ok ? row.analysis.business_category : "-"}
                        </td>
                        <td className="px-3 py-2">
                          {row.ok ? (
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${priorityClass(
                                row.analysis.priority,
                              )}`}
                            >
                              {row.analysis.priority}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400">
                              failed
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          {row.ok ? `${row.analysis.sla_target_hours}h` : "-"}
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          {row.ok ? row.analysis.confidence : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

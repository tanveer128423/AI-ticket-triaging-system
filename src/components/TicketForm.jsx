export default function TicketForm({
  provider,
  apiKey,
  setApiKey,
  ticket,
  setTicket,
  loading,
  onAnalyze,
}) {
  const getProviderLabel = () => {
    if (provider === "openai") return "OpenAI API Key";
    if (provider === "google") return "Gemini API Key";
    if (provider === "grok") return "Grok API Key";
    return "";
  };

  return (
    <form
      className="mt-6 space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        onAnalyze();
      }}
    >
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          {getProviderLabel()}
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          autoComplete="off"
          placeholder="sk-..."
          className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-900"
        />
        <p className="text-xs text-slate-500">
          Keys are only used client-side for direct API calls and never
          persisted.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          ERP Support Ticket
        </label>
        <textarea
          rows="6"
          value={ticket}
          onChange={(e) => setTicket(e.target.value)}
          placeholder="Example: Unable to post invoice in SAP Finance module..."
          className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-900"
        />
        <p className="text-xs text-slate-500">
          Use specific error code, affected module, and operational impact for
          better classification quality.
        </p>
      </div>

      <button
        type="submit"
        disabled={loading}
        className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold uppercase tracking-wide transition ${
          loading
            ? "cursor-not-allowed bg-slate-300 text-slate-500"
            : "bg-slate-900 text-white hover:bg-black"
        }`}
      >
        {loading ? "Analyzing Ticket..." : "Analyze Ticket"}
      </button>
    </form>
  );
}

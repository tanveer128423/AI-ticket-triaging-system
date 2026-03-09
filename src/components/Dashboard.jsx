export default function Dashboard({ history, onClear }) {
  const high = history.filter((t) => t.priority === "High").length;
  const medium = history.filter((t) => t.priority === "Medium").length;
  const low = history.filter((t) => t.priority === "Low").length;
  const escalated = history.filter((t) => t.escalation_required).length;
  const latest = history.slice(0, 6);

  const topCategory = getTopValue(history, "business_category");
  const topModule = getTopValue(history, "erp_module");

  return (
    <section className="animate-rise rounded-3xl border border-white/65 bg-white/88 p-5 shadow-xl backdrop-blur md:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-slate-900">
          Operations Dashboard
        </h2>

        <button
          onClick={onClear}
          className="rounded-full border border-red-300 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-red-700 transition hover:bg-red-50"
        >
          Clear History
        </button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
            High
          </p>
          <p className="mt-2 text-2xl font-semibold text-red-700">{high}</p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
            Medium
          </p>
          <p className="mt-2 text-2xl font-semibold text-amber-700">{medium}</p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
            Low
          </p>
          <p className="mt-2 text-2xl font-semibold text-emerald-700">{low}</p>
        </div>

        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
            Escalated
          </p>
          <p className="mt-2 text-2xl font-semibold text-sky-700">
            {escalated}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Most Frequent Category
          </p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {topCategory}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Most Frequent Module
          </p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {topModule}
          </p>
        </div>
      </div>

      <div className="mt-6">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Recent Triages
        </p>
        <div className="space-y-3">
          {latest.map((ticket) => (
            <article
              key={ticket.ticket_id}
              className="rounded-2xl border border-slate-200 bg-white p-4 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-slate-800">
                  {ticket.ticket_id}
                </span>
                <span className="text-xs text-slate-500">
                  {ticket.timestamp}
                </span>
              </div>
              <p className="mt-2 text-slate-600">
                {ticket.business_category} | {ticket.erp_module} |{" "}
                {ticket.issue_type}
              </p>
              <div className="mt-2 flex items-center gap-2 text-xs">
                <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700">
                  {ticket.priority}
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700">
                  {ticket.confidence}
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700">
                  {ticket.assigned_team}
                </span>
              </div>
            </article>
          ))}
          {history.length > latest.length && (
            <p className="text-xs text-slate-500">
              Showing latest {latest.length} of {history.length} analyses.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function getTopValue(items, key) {
  if (!items.length) {
    return "-";
  }

  const counts = items.reduce((acc, current) => {
    const label = current[key] || "Unknown";
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

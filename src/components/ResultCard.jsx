export default function ResultCard({ result }) {
  const priorityClasses =
    result.priority === "High"
      ? "bg-red-100 text-red-700 border border-red-200"
      : result.priority === "Medium"
        ? "bg-amber-100 text-amber-700 border border-amber-200"
        : "bg-emerald-100 text-emerald-700 border border-emerald-200";

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Latest Analysis
          </p>
          <h3 className="mt-1 text-2xl font-semibold text-slate-900">
            {result.ticket_id}
          </h3>
          <p className="mt-1 text-xs text-slate-500">{result.timestamp}</p>
        </div>

        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${priorityClasses}`}
        >
          {result.priority} Priority
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <article className="metric-card">
          <p>Confidence</p>
          <strong>{result.confidence}</strong>
        </article>
        <article className="metric-card">
          <p>SLA Target</p>
          <strong>{result.sla_target_hours}h</strong>
        </article>
        <article className="metric-card">
          <p>Business Category</p>
          <strong>{result.business_category}</strong>
        </article>
        <article className="metric-card">
          <p>ERP Module</p>
          <strong>{result.erp_module}</strong>
        </article>
        <article className="metric-card">
          <p>Issue Type</p>
          <strong>{result.issue_type}</strong>
        </article>
        <article className="metric-card">
          <p>Assigned Team</p>
          <strong>{result.assigned_team}</strong>
        </article>
      </div>

      <div className="grid grid-cols-1 gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-700">
        <p>
          Escalation Required:{" "}
          <strong>{result.escalation_required ? "Yes" : "No"}</strong>
        </p>
        <p>
          Human Review:{" "}
          <strong>
            {result.human_review_required ? "Required" : "Not Required"}
          </strong>
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          First Level Response
        </p>
        <div className="text-sm leading-relaxed text-slate-700">
          {result.first_level_response}
        </div>
      </div>
    </div>
  );
}

export default function ProviderSelector({ provider, setProvider }) {
  const providers = [
    {
      id: "openai",
      name: "OpenAI",
      description: "Fast and balanced classification quality",
    },
    {
      id: "google",
      name: "Gemini",
      description: "High-throughput text analysis",
    },
    {
      id: "grok",
      name: "Grok",
      description: "Robust fallback through Groq API",
    },
  ];

  return (
    <div className="space-y-3">
      <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        Select Model Provider
      </label>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
        {providers.map((option) => {
          const active = provider === option.id;

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setProvider(option.id)}
              className={`rounded-2xl border px-4 py-3 text-left transition ${
                active
                  ? "border-slate-900 bg-slate-900 text-white shadow-md"
                  : "border-slate-300 bg-white text-slate-700 hover:border-slate-900"
              }`}
            >
              <p className="text-sm font-semibold">{option.name}</p>
              <p
                className={`mt-1 text-xs ${
                  active ? "text-slate-200" : "text-slate-500"
                }`}
              >
                {option.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

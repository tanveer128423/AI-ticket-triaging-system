# AI ERP Ticket Triage Copilot
## Deployed Link - https://ai-ticket-triaging-system-6kb5.vercel.app/

## Live Portfolio

🌐 https://khalid-tanveer.vercel.app

## Why this project stands out

- Multi-provider AI support: OpenAI, Gemini, and Grok through a unified service layer.
- Deterministic structured output: strict JSON prompt strategy with robust parsing fallbacks.
- Batch triage: classify an entire queue of tickets at once from pasted text or a CSV/TXT upload, with live progress, per-ticket error isolation, and CSV/JSON export.
- Resilient API calls: automatic retry with exponential backoff for transient rate limits (HTTP 429/5xx).
- Operational dashboard: confidence trends, risk ratio, and recent ticket snapshots.
- Production-like UX: responsive layout, animated transitions, visual design system, and strong empty/error states.
- Local persistence: triage history stored in `localStorage` for quick exploration during demos.

## Tech stack

- React 19
- Vite 7
- Tailwind CSS 4
- ESLint 9

## Project structure

```text
src/
	components/
		BatchTriage.jsx
		Dashboard.jsx
		ErrorAlert.jsx
		ProviderSelector.jsx
		ResultCard.jsx
		TicketForm.jsx
	services/
		triageService.js
	App.jsx
	index.css
	main.jsx
```

## Setup

```bash
npm install
npm run dev
```

Build and lint:

```bash
npm run build
npm run lint
```

## Usage

### Single ticket (Triage)

1. Select an LLM provider.
2. Paste your API key for the selected provider.
3. Enter an ERP support ticket with module context and business impact.
4. Review generated triage details:
   - Business category
   - ERP module
   - Issue type
   - Priority and SLA
   - Escalation and human review recommendation

### Bulk tickets (Batch)

1. Open the **Batch** tab and select a provider + API key.
2. Provide tickets either by:
   - Pasting one ticket per line, or
   - Uploading a `.csv` / `.txt` file. A CSV column named `ticket`, `description`,
     `issue`, `summary`, `text`, or `body` is auto-detected.
3. Click **Triage** to process the queue (up to 50 tickets per run) with a live
   progress bar. Failed tickets are isolated and reported inline without
   stopping the batch.
4. Review the results table and summary (Triaged / High / Escalated / Review /
   Failed), then **Export CSV** or **Export JSON**. Successful results are also
   merged into the Dashboard history.

> Tip: provider model defaults are `gpt-4o-mini` (OpenAI),
> `gemini-flash-latest` (Gemini), and `llama-3.3-70b-versatile` (Grok/Groq).
> If a Gemini key returns quota or auth errors, verify billing and API access in
> Google Cloud, or use the Grok provider for a quick, reliable demo.

## Important notes

- API keys are used in browser requests and are not persisted by the app.
- This app is designed for demo and portfolio use. For production, move API calls to a backend proxy and add key vaulting, auth, and rate limiting.

## Future enhancements

- Role-based authentication and audit logs.
- Webhook / ITSM integrations (Jira, ServiceNow) for routed tickets.
- Confidence calibration dashboard over longer history.
- Prompt versioning and A/B evaluation harness.
- Concurrency controls and configurable batch size limits.

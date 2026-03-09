# AI ERP Ticket Triage Copilot

A portfolio-grade React app that classifies ERP support tickets using LLM APIs and produces structured triage output for operations teams.

# Deployed Link - https://ai-ticket-triaging-system-6kb5.vercel.app/

## Why this project stands out

- Multi-provider AI support: OpenAI, Gemini, and Grok through a unified service layer.
- Deterministic structured output: strict JSON prompt strategy with robust parsing fallbacks.
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

1. Select an LLM provider.
2. Paste your API key for the selected provider.
3. Enter an ERP support ticket with module context and business impact.
4. Review generated triage details:
   - Business category
   - ERP module
   - Issue type
   - Priority and SLA
   - Escalation and human review recommendation

## Important notes

- API keys are used in browser requests and are not persisted by the app.
- This app is designed for demo and portfolio use. For production, move API calls to a backend proxy and add key vaulting, auth, and rate limiting.

## Future enhancements

- Role-based authentication and audit logs.
- Ticket export to CSV/JSON and webhook integrations.
- Confidence calibration dashboard over longer history.
- Prompt versioning and A/B evaluation harness.

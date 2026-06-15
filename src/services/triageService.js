export function parseTicketsInput(rawInput) {
  const text = String(rawInput || "").trim();

  if (!text) {
    return [];
  }

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return [];
  }

  // Detect a likely CSV header and a column holding the ticket text.
  const firstColumns = splitCsvLine(lines[0]);
  const headerIndex = firstColumns.findIndex((col) =>
    /ticket|description|issue|summary|text|body/i.test(col),
  );

  const looksLikeCsv = lines.some((line) => line.includes(","));
  const hasHeader = headerIndex !== -1 && firstColumns.length > 1;

  if (looksLikeCsv && hasHeader) {
    return lines
      .slice(1)
      .map((line) => {
        const cells = splitCsvLine(line);
        return (cells[headerIndex] || "").trim();
      })
      .filter((value) => value.length > 0);
  }

  if (looksLikeCsv) {
    // No clear header: use the longest cell on each row as the ticket text.
    return lines
      .map((line) => {
        const cells = splitCsvLine(line);
        return cells.reduce(
          (longest, cell) => (cell.length > longest.length ? cell : longest),
          "",
        ).trim();
      })
      .filter((value) => value.length > 0);
  }

  // Plain text: one ticket per line.
  return lines;
}

function splitCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current);
  return result.map((cell) => cell.trim());
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function isRetryableError(message) {
  return /rate limit|rate_limit|overload|temporarily|timeout|please retry|try again|429|503|500/i.test(
    String(message || ""),
  );
}

async function analyzeWithRetry(provider, apiKey, text, maxRetries = 3) {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await analyzeTicket(provider, apiKey, text);
    } catch (err) {
      lastError = err;

      if (attempt === maxRetries || !isRetryableError(err.message)) {
        throw err;
      }

      // Exponential backoff with jitter: ~1s, 2s, 4s.
      const delay = 1000 * 2 ** attempt + Math.floor(Math.random() * 400);
      await sleep(delay);
    }
  }

  throw lastError;
}

export async function analyzeBatch(provider, apiKey, tickets, onProgress) {
  const list = Array.isArray(tickets) ? tickets : [];
  const results = [];
  let completed = 0;

  for (let index = 0; index < list.length; index += 1) {
    const ticketText = String(list[index] || "").trim();

    if (ticketText.length < 20) {
      results.push({
        index,
        ok: false,
        ticket_text: ticketText,
        error: "Ticket too short (min 20 characters).",
      });
    } else {
      try {
        const analysis = await analyzeWithRetry(provider, apiKey, ticketText);
        results.push({
          index,
          ok: true,
          ticket_text: ticketText,
          analysis: { ...analysis, ticket_text: ticketText },
        });
      } catch (err) {
        results.push({
          index,
          ok: false,
          ticket_text: ticketText,
          error: err.message || "Analysis failed.",
        });
      }
    }

    completed += 1;

    if (typeof onProgress === "function") {
      onProgress({ completed, total: list.length });
    }
  }

  return results;
}

export function toCsv(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return "";
  }

  const headers = [
    "ticket_id",
    "timestamp",
    "business_category",
    "erp_module",
    "issue_type",
    "priority",
    "assigned_team",
    "confidence",
    "sla_target_hours",
    "escalation_required",
    "human_review_required",
    "source_provider",
    "ticket_text",
  ];

  const escape = (value) => {
    const str = String(value ?? "");
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines = rows.map((row) =>
    headers.map((key) => escape(row[key])).join(","),
  );

  return [headers.join(","), ...lines].join("\n");
}

export async function analyzeTicket(provider, apiKey, text) {
  const selectedProvider = String(provider || "").toLowerCase();

  if (selectedProvider === "openai") {
    return analyzeWithOpenAI(apiKey, text);
  }

  if (selectedProvider === "google") {
    return analyzeWithGemini(apiKey, text);
  }

  if (selectedProvider === "grok") {
    return analyzeWithGrok(apiKey, text);
  }

  throw new Error(
    `Invalid provider selected: ${selectedProvider || "unknown"}.`,
  );
}

async function analyzeWithOpenAI(apiKey, text) {
  const prompt = buildPrompt(text);

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a precise ERP triaging AI." },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || "OpenAI API Error");
  }

  const raw = data.choices?.[0]?.message?.content || "";
  return buildStructuredOutput(parseModelResponse(raw), "openai");
}

async function analyzeWithGemini(apiKey, text) {
  const prompt = buildPrompt(text);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    },
  );

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || "Gemini API Error");
  }

  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return buildStructuredOutput(parseModelResponse(raw), "google");
}

async function analyzeWithGrok(apiKey, text) {
  const prompt = buildPrompt(text);

  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: "You are a precise ERP triaging AI." },
            { role: "user", content: prompt },
          ],
          temperature: 0,
          stream: false,
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      const errorMsg =
        data.error?.message || data.message || JSON.stringify(data);
      throw new Error(`Grok API Error (${response.status}): ${errorMsg}`);
    }

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error("Grok API returned unexpected response structure");
    }

    const raw = data.choices[0].message.content || "";
    return buildStructuredOutput(parseModelResponse(raw), "grok");
  } catch (error) {
    if (error.message.includes("Grok API")) {
      throw error;
    }
    throw new Error(`Grok API Error: ${error.message}`);
  }
}

function parseModelResponse(raw) {
  const cleaned = String(raw)
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  if (!cleaned) {
    throw new Error("Model returned an empty response.");
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);

    if (!match) {
      throw new Error("Model response could not be parsed as JSON.");
    }

    try {
      return JSON.parse(match[0]);
    } catch {
      throw new Error("Model returned invalid JSON format.");
    }
  }
}

function buildPrompt(ticket) {
  return `
You are an AI system specialized in ERP support ticket triaging.

Analyze the support ticket and classify it.

Rules:

Business categories must be one of:
Finance
Inventory
Procurement
HR
Sales
IT
General

ERP module must be one of:
SAP
Oracle Fusion
Microsoft Dynamics
Other

Issue type must be one of:
Incident
Change Request
Support Request
Information Request

Priority rules:
High = system down, blocking operations, financial impact, production issue
Medium = workflow disruption or functional problem
Low = question, guidance request, or minor issue

Confidence must be a number between 0 and 100.

Return ONLY valid JSON.

{
  "business_category": "",
  "erp_module": "",
  "issue_type": "",
  "priority": "",
  "assigned_team": "",
  "confidence": ""
}

Ticket:
"${ticket}"
`;
}

function normalizeValue(value, allowedValues, fallback) {
  const normalized = String(value || "").toLowerCase();
  const matched = allowedValues.find(
    (entry) => entry.toLowerCase() === normalized,
  );
  return matched || fallback;
}

function buildStructuredOutput(data, sourceProvider) {
  const priority = normalizeValue(
    data.priority,
    ["High", "Medium", "Low"],
    "Low",
  );
  const confidenceRaw = Number.parseInt(data.confidence, 10);
  const confidence = Number.isNaN(confidenceRaw)
    ? 85
    : Math.min(100, Math.max(0, confidenceRaw));

  const businessCategory = normalizeValue(
    data.business_category,
    ["Finance", "Inventory", "Procurement", "HR", "Sales", "IT", "General"],
    "General",
  );

  const erpModule = normalizeValue(
    data.erp_module,
    ["SAP", "Oracle Fusion", "Microsoft Dynamics", "Other"],
    "Other",
  );

  const issueType = normalizeValue(
    data.issue_type,
    ["Incident", "Change Request", "Support Request", "Information Request"],
    "Support Request",
  );

  return {
    ticket_id:
      "TCK-" +
      String(Date.now()).slice(-6) +
      "-" +
      Math.floor(10 + Math.random() * 90),
    timestamp: new Date().toLocaleString(),
    source_provider: sourceProvider,
    business_category: businessCategory,
    erp_module: erpModule,
    issue_type: issueType,
    priority,
    assigned_team: data.assigned_team || `${businessCategory} Operations`,
    confidence: confidence + "%",
    escalation_required: priority === "High",
    human_review_required: confidence < 75,
    sla_target_hours: priority === "High" ? 2 : priority === "Medium" ? 8 : 24,
    first_level_response:
      "Thank you for reporting this issue. Our team has been notified and will respond within SLA.",
  };
}

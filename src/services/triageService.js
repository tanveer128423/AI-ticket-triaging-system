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
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
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

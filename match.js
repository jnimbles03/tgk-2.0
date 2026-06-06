cat > (builder / lib / stages / match.js) << "ENDOFMATCH";
("use strict");
const Anthropic = require("@anthropic-ai/sdk");

const TEMPLATE_LIBRARY = [
  {
    id: "signing-ceremony",
    keywords: [
      "signature",
      "sign",
      "initial",
      "signing block",
      "docusign",
      "e-sign",
      "sign here",
    ],
  },
  {
    id: "webform-intake",
    keywords: [
      "form",
      "intake",
      "webform",
      "field",
      "input",
      "submit",
      "maestro",
      "data entry",
    ],
  },
  {
    id: "navigator",
    keywords: [
      "repository",
      "document list",
      "search",
      "library",
      "navigator",
      "agreements",
      "filter",
    ],
  },
  {
    id: "portal-shell",
    keywords: [
      "portal",
      "dashboard",
      "home",
      "landing",
      "navigation",
      "menu",
      "inbox",
    ],
  },
  {
    id: "workspace",
    keywords: [
      "workspace",
      "workflow",
      "task",
      "checklist",
      "step",
      "progress",
    ],
  },
];

const VERTICAL_MAP = {
  financial: {
    label: "Financial Services",
    signer: "Account Holder",
    document: "Agreement",
    process: "Account Opening",
  },
  healthcare: {
    label: "Healthcare",
    signer: "Patient",
    document: "Consent Form",
    process: "Patient Intake",
  },
  government: {
    label: "Government",
    signer: "Applicant",
    document: "Application",
    process: "Benefits Enrollment",
  },
  legal: {
    label: "Legal",
    signer: "Client",
    document: "Contract",
    process: "Matter Management",
  },
  hr: {
    label: "HR / Benefits",
    signer: "Employee",
    document: "Policy",
    process: "Onboarding",
  },
  realestate: {
    label: "Real Estate",
    signer: "Buyer",
    document: "Purchase Agreement",
    process: "Closing",
  },
  insurance: {
    label: "Insurance",
    signer: "Policyholder",
    document: "Policy",
    process: "Claims",
  },
  other: {
    label: "Enterprise",
    signer: "Signer",
    document: "Document",
    process: "Workflow",
  },
};

async function runMatch(jobId, jobStore) {
  jobStore.updateStage(jobId, "match", {
    status: "running",
    started_at: new Date().toISOString(),
    model_calls: 0,
    model_tokens: 0,
  });
  try {
    const meta = jobStore.getJobMeta(jobId);
    const descBlob = jobStore.readBlob(jobId, "descriptions.json");
    if (!descBlob || !descBlob.descriptions)
      return jobStore.failStage(
        jobId,
        "match",
        "cannot_proceed",
        "no descriptions.json",
      );

    const descriptions = descBlob.descriptions
      .map((d) => d.description)
      .join("\n\n");
    const vertical = meta.inputs?.vertical || "other";
    const keyMoment = meta.inputs?.key_moment || "";
    const outputType = meta.inputs?.output_type || "portal";

    const client = new Anthropic();
    const resp = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `You are analyzing a product demo video to identify which workflow templates it contains.

VIDEO FRAME DESCRIPTIONS:
${descriptions}

KEY MOMENT: ${keyMoment || "not specified"}
OUTPUT TYPE: ${outputType}
VERTICAL: ${vertical}

AVAILABLE TEMPLATES:
${TEMPLATE_LIBRARY.map((t) => `- ${t.id}: ${t.keywords.join(", ")}`).join("\n")}

Respond with raw JSON only (no markdown):
{
  "templates": ["template-id-1","template-id-2"],
  "tenantName": "company name visible in UI or realistic example for vertical",
  "primaryColor": "#hex",
  "secondaryColor": "#hex",
  "summary": "one sentence describing what this demo shows"
}
Rules: order templates as they appear in video; default to ["portal-shell"] if unclear; extract colors from UI or use vertical-appropriate defaults.`,
        },
      ],
    });

    let match;
    try {
      match = JSON.parse(resp.content[0].text);
    } catch (_) {
      match = {
        templates: ["portal-shell"],
        tenantName: "Acme Corp",
        primaryColor: "#4C00FF",
        secondaryColor: "#CBC2FF",
        summary: "Product demo",
      };
    }

    match.vertical = vertical;
    match.keyMoment = keyMoment;
    match.outputType = outputType;
    match.verticalConfig = VERTICAL_MAP[vertical] || VERTICAL_MAP.other;

    jobStore.writeBlob(jobId, "match.json", match);
    jobStore.updateStage(jobId, "match", {
      status: "completed",
      completed_at: new Date().toISOString(),
      model_calls: 1,
      model_tokens: resp.usage.input_tokens + resp.usage.output_tokens,
    });
    return { ok: true };
  } catch (err) {
    return jobStore.failStage(
      jobId,
      "match",
      "error",
      String(err.message || err),
    );
  }
}

module.exports = { runMatch };
ENDOFMATCH;

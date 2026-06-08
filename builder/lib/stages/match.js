'use strict';
const { CATALOG, matchByKeywords, packForVertical } = require('../demo-catalog');

// Vertical → human labels used for {{SIGNER}} / {{PROCESS}} style fields and the
// demo logo sub-label. signer/document/process feed the demo narration context.
const VERTICAL_MAP = {
  financial:  { label:'Financial Services', signer:'Account Holder', document:'Agreement',         process:'Account Opening',     sub:'Financial' },
  healthcare: { label:'Healthcare',         signer:'Patient',        document:'Consent Form',      process:'Patient Intake',      sub:'Health' },
  government: { label:'Government',          signer:'Applicant',      document:'Application',       process:'Benefits Enrollment', sub:'Agency' },
  legal:      { label:'Legal',              signer:'Client',         document:'Contract',          process:'Matter Management',   sub:'Legal' },
  hr:         { label:'HR / Benefits',      signer:'Employee',       document:'Policy',            process:'Onboarding',          sub:'People' },
  realestate: { label:'Real Estate',        signer:'Buyer',          document:'Purchase Agreement',process:'Closing',             sub:'Realty' },
  insurance:  { label:'Insurance',          signer:'Policyholder',   document:'Policy',            process:'Claims',              sub:'Insurance' },
  other:      { label:'Enterprise',         signer:'Signer',         document:'Document',          process:'Workflow',            sub:'Group' },
};

const MAX_TEMPLATES = 6;
const MATCH_MODEL = process.env.BUILDER_MATCH_MODEL || 'claude-opus-4-5';

// Derive tenant logo bits (logoWord / mark) from a tenant name.
function brandBits(tenantName, vertical) {
  const name  = (tenantName || '').trim() || 'Northwind';
  const word  = name.split(/\s+/)[0];
  const mark  = (word[0] || 'N').toUpperCase();
  const sub   = (VERTICAL_MAP[vertical] || VERTICAL_MAP.other).sub;
  return { logoWord: word, mark, logoSub: sub };
}

// Build a deterministic match.json (no model) from the frame descriptions.
function fakeMatch(descriptions, vertical, keyMoment, outputType) {
  let ids = matchByKeywords(descriptions);
  if (!ids.length) ids = ['workspaces'];
  ids = ids.slice(0, MAX_TEMPLATES);
  const tenantName = 'Northwind ' + ((VERTICAL_MAP[vertical] || VERTICAL_MAP.other).sub);
  return {
    templates: ids,
    tenantName,
    primaryColor: '#4C00FF',
    secondaryColor: '#CBC2FF',
    summary: 'Product demo (' + ids.map(i => CATALOG[i] ? CATALOG[i].label : i).join(', ') + ')',
    _fake: true,
    vertical, keyMoment, outputType,
  };
}

async function runMatch(jobId, jobStore) {
  jobStore.updateStage(jobId, 'match', { status:'running', started_at:new Date().toISOString(), model_calls:0, model_tokens:0 });
  try {
    const meta     = jobStore.getJobMeta(jobId);
    const descBlob = jobStore.readBlob(jobId, 'descriptions.json');
    if (!descBlob || !descBlob.descriptions)
      return jobStore.failStage(jobId, 'match', 'cannot_proceed', 'no descriptions.json');

    const descriptions = descBlob.descriptions.map(d => d.description).join('\n\n');
    const vertical     = (meta.inputs && meta.inputs.vertical)    || 'other';
    const keyMoment    = (meta.inputs && meta.inputs.key_moment)  || '';
    const outputType   = (meta.inputs && meta.inputs.output_type) || 'portal';

    let match;
    let modelCalls = 0, modelTokens = 0;

    if (!process.env.ANTHROPIC_API_KEY) {
      // Fake mode — keep the whole convert flow runnable with no key.
      match = fakeMatch(descriptions, vertical, keyMoment, outputType);
    } else {
      try {
        const Anthropic = require('@anthropic-ai/sdk');
        const client = new Anthropic();
        const catalogList = Object.entries(CATALOG)
          .map(([id, def]) => '- ' + id + ': ' + def.keywords.join(', '))
          .join('\n');
        const resp = await client.messages.create({
          model: MATCH_MODEL, max_tokens: 1024,
          messages: [{ role:'user', content:
            'You are analyzing a product demo video to identify which Docusign demo modules it contains.\n\n' +
            'VIDEO FRAME DESCRIPTIONS:\n' + descriptions + '\n\n' +
            'KEY MOMENT: ' + (keyMoment||'not specified') + '\n' +
            'OUTPUT TYPE: ' + outputType + '\nVERTICAL: ' + vertical + '\n\n' +
            'AVAILABLE MODULES (id: keywords):\n' + catalogList + '\n\n' +
            'Respond with raw JSON only (no markdown):\n{\n' +
            '  "templates": ["module-id-1"],\n' +
            '  "tenantName": "company name or realistic example",\n' +
            '  "primaryColor": "#hex",\n' +
            '  "secondaryColor": "#hex",\n' +
            '  "summary": "one sentence describing what this demo shows"\n}\n' +
            'Rules: use ONLY ids from the list above; order them as they appear in the demo; ' +
            'default to ["workspaces"] if unclear.' }]
        });
        modelCalls = 1;
        modelTokens = (resp.usage.input_tokens + resp.usage.output_tokens);
        try { match = JSON.parse(resp.content[0].text); }
        catch(_) { match = fakeMatch(descriptions, vertical, keyMoment, outputType); }
      } catch (modelErr) {
        // Model unavailable / bad id / network — degrade gracefully, don't fail the job.
        console.warn('[match] model call failed, falling back to keyword match:', modelErr.message);
        match = fakeMatch(descriptions, vertical, keyMoment, outputType);
      }
    }

    // Validate template ids against the catalog (drop unknowns; keep order).
    const valid = (match.templates || [])
      .map(t => (CATALOG[t] ? t : null))
      .filter(Boolean)
      .slice(0, MAX_TEMPLATES);
    match.templates = valid.length ? valid : ['workspaces'];

    // Normalize brand + context the assemble stage consumes.
    match.vertical       = vertical;
    match.keyMoment      = keyMoment;
    match.outputType     = outputType;
    match.verticalConfig = VERTICAL_MAP[vertical] || VERTICAL_MAP.other;
    match.packKey        = packForVertical(vertical);
    Object.assign(match, brandBits(match.tenantName, vertical));

    jobStore.writeBlob(jobId, 'match.json', match);
    jobStore.updateStage(jobId, 'match', { status:'completed', completed_at:new Date().toISOString(), model_calls:modelCalls, model_tokens:modelTokens });
    return { ok:true };
  } catch(err) {
    return jobStore.failStage(jobId, 'match', 'error', String(err.message||err));
  }
}

module.exports = { runMatch };

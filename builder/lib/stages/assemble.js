'use strict';
const fs   = require('fs');
const path = require('path');

const TEMPLATE_DIR  = path.join(__dirname, '../../../story-templates');
const TEMPLATE_FILES = {
  'signing-ceremony': 'docusign-signing-ceremony.html',
  'webform-intake':   'docusign-webform-intake.html',
  'navigator':        'docusign-navigator.html',
  'portal-shell':     'docusign-portal-shell.html',
  'workspace':        'docusign-workspace.html',
};

function injectContext(html, ctx) {
  const vc = ctx.verticalConfig || {};
  const cssVars = '<style id="tgk-context-vars">:root{--primary-color:' + (ctx.primaryColor||'#4C00FF') + ';--secondary-color:' + (ctx.secondaryColor||'#CBC2FF') + ';}</style>';
  html = html.replace('</head>', cssVars + '</head>');
  const rep = {
    '{{TENANT_NAME}}':     ctx.tenantName    || 'Acme Corp',
    '{{PRIMARY_COLOR}}':   ctx.primaryColor  || '#4C00FF',
    '{{SECONDARY_COLOR}}': ctx.secondaryColor|| '#CBC2FF',
    '{{SIGNER}}':          vc.signer         || 'Signer',
    '{{DOCUMENT}}':        vc.document       || 'Document',
    '{{PROCESS}}':         vc.process        || 'Workflow',
    '{{VERTICAL}}':        vc.label          || 'Enterprise',
    '{{KEY_MOMENT}}':      ctx.keyMoment     || '',
  };
  for (const [k,v] of Object.entries(rep))
    html = html.replace(new RegExp(k.replace(/[{}]/g,'\\$&'),'g'), v);
  return html;
}

async function runAssemble(jobId, jobStore) {
  jobStore.updateStage(jobId, 'assemble', { status:'running', started_at:new Date().toISOString() });
  try {
    const match = jobStore.readBlob(jobId, 'match.json');
    if (!match) return jobStore.failStage(jobId, 'assemble', 'cannot_proceed', 'no match.json');

    const templates = (match.templates||[]).filter(t => TEMPLATE_FILES[t]);
    if (!templates.length) templates.push('portal-shell');

    const pc = match.primaryColor||'#4C00FF';
    const navItems = templates.map((t,i) => {
      const labels = {'signing-ceremony':'✍️ Signing','webform-intake':'📋 Intake','navigator':'📁 Repository','portal-shell':'🏛️ Portal','workspace':'⚙️ Workspace'};
      return '<button class="nav-btn' + (i===0?' active':'') + '" onclick="showDemo(' + i + ')">' + (labels[t]||t) + '</button>';
    }).join('');

    const frames = templates.map((t,i) => {
      const file = TEMPLATE_FILES[t];
      const tpath = path.join(TEMPLATE_DIR, file);
      if (!fs.existsSync(tpath)) return '<div class="demo-frame' + (i===0?'':' hidden') + '" id="frame-' + i + '" style="display:flex;align-items:center;justify-content:center;color:#666">Template not found: ' + file + '</div>';
      let html = fs.readFileSync(tpath,'utf8');
      html = injectContext(html, match);
      return '<iframe class="demo-frame' + (i===0?'':' hidden') + '" id="frame-' + i + '" srcdoc="' + html.replace(/&/g,'&amp;').replace(/"/g,'&quot;') + '" style="width:100%;height:100%;border:none;"></iframe>';
    }).join('');

    const out = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + (match.tenantName||'Demo') + ' — TGK Demo</title><link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet"><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Space Grotesk,sans-serif;background:#0a0014;color:#F8F3F0;height:100vh;display:flex;flex-direction:column}.top-bar{background:#130032;border-bottom:1px solid #2a1a4a;padding:12px 24px;display:flex;align-items:center;gap:16px;flex-shrink:0}.logo{font-size:13px;font-weight:700;letter-spacing:.05em;color:#CBC2FF}.title{font-size:15px;font-weight:600;flex:1}.summary{font-size:12px;color:#7a6fa0;max-width:400px}.nav-bar{background:#1a0a3a;border-bottom:1px solid #2a1a4a;padding:8px 24px;display:flex;gap:8px;flex-shrink:0}.nav-btn{background:transparent;border:1.5px solid #2a1a4a;border-radius:6px;color:#9b8fc0;font-family:Space Grotesk,sans-serif;font-size:13px;font-weight:500;padding:6px 14px;cursor:pointer;transition:all .15s}.nav-btn:hover{border-color:' + pc + ';color:#F8F3F0}.nav-btn.active{border-color:' + pc + ';background:' + pc + '20;color:#F8F3F0}.demo-area{flex:1;overflow:hidden;position:relative}.demo-frame{position:absolute;inset:0}.demo-frame.hidden{display:none}</style></head><body><div class="top-bar"><div class="logo">TGK</div><div class="title">' + (match.tenantName||'Demo') + '</div><div class="summary">' + (match.summary||'') + '</div></div><div class="nav-bar">' + navItems + '</div><div class="demo-area">' + frames + '</div><script>function showDemo(i){document.querySelectorAll(".demo-frame").forEach((f,j)=>f.classList.toggle("hidden",j!==i));document.querySelectorAll(".nav-btn").forEach((b,j)=>b.classList.toggle("active",j===i))}</script></body></html>';

    const ts = new Date().toISOString().replace(/[:.]/g,'-').slice(0,16);
    const outFile = ts + '__tgk-demo.html';
    jobStore.writeOutput(jobId, outFile, out);

    const outputsDir = path.join(__dirname,'../../../builder/outputs');
    if (!fs.existsSync(outputsDir)) fs.mkdirSync(outputsDir,{recursive:true});
    fs.writeFileSync(path.join(outputsDir, outFile), out);

    jobStore.updateStage(jobId, 'assemble', { status:'completed', completed_at:new Date().toISOString(), output_file:outFile });
    return { ok:true };
  } catch(err) {
    return jobStore.failStage(jobId, 'assemble', 'error', String(err.message||err));
  }
}

module.exports = { runAssemble };

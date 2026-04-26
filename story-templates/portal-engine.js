/* ============================================================
   PORTAL ENGINE
   Loads a story recipe, finds the portal step we're rendering,
   applies brand tokens to CSS vars, and instantiates the
   layout + blocks described in the step. All drill-downs
   route through openFrame() so stories stay data-driven.
   ============================================================ */

(function () {
  const params = new URLSearchParams(location.search);
  const STORY_ID = params.get('story') || 'wealth-onboarding';
  const STEP_IDX = parseInt(params.get('step') || '1', 10);
  // Tenant param lets a story re-skin chrome per-viewer (e.g. wealth-onboarding-v2
  // supports ?tenant=redtail|wealthscape|schwab). Stories that don't declare a
  // tenants block in their recipe ignore this; param still propagates to iframes.
  const TENANT_ID = params.get('tenant') || '';
  const RECIPE_URL = `../stories/${STORY_ID}/recipe.json`;
  // Absolute URL of the recipe — used as the base for resolving every
  // path in recipe.paths so authors can keep paths recipe-relative.
  const RECIPE_ABS = new URL(RECIPE_URL, location.href).href;

  const root = document.getElementById('portal-root');
  const errEl = document.getElementById('portal-error');

  // ---------- icon library (inline SVGs keyed by name) ----------
  const ICONS = {
    link:      '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
    dollar:    '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
    gavel:     '<path d="M12 3v18"/><path d="M6 10l-3 6h6z"/><path d="M18 10l-3 6h6z"/><path d="M4 21h16"/>',
    shield:    '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>',
    grid:      '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    form:      '<rect x="3" y="4" width="18" height="16" rx="2"/><line x1="7" y1="9" x2="17" y2="9"/><line x1="7" y1="13" x2="17" y2="13"/><line x1="7" y1="17" x2="13" y2="17"/>',
    esig:      '<path d="M3 17c3 0 4-4 6-4s3 4 6 4 4-4 6-4"/><line x1="3" y1="21" x2="21" y2="21"/>',
    maestro:   '<circle cx="5" cy="12" r="2"/><circle cx="19" cy="5" r="2"/><circle cx="19" cy="19" r="2"/><line x1="7" y1="12" x2="17" y2="5"/><line x1="7" y1="12" x2="17" y2="19"/>',
    doc:       '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/>',
    loop:      '<path d="M17 1l4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
    compass:   '<polygon points="3 11 22 2 13 21 11 13 3 11"/>',
    chart:     '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
    alert:     '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
    back:      '<polyline points="15 18 9 12 15 6"/>',
    chevRight: '<polyline points="9 18 15 12 9 6"/>',
    report:    '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>'
  };

  function icon(name, size) {
    const d = ICONS[name] || '';
    const s = size || 16;
    return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  }

  // Default Docusign brand logo mark if none provided
  const DEFAULT_LOGO = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M3 14l5-5 4 4 9-9" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M15 4h6v6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  // ---------- load + render ----------
  fetch(RECIPE_URL, { cache: 'no-cache' })
    .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
    .then(recipe => render(recipe))
    .catch(err => {
      console.error('Portal engine: recipe load failed', err);
      errEl.style.display = 'flex';
      errEl.querySelector('code').textContent = RECIPE_URL;
    });

  function render(recipe) {
    // Merge tenant override on top of brand if a tenant is specified AND
    // the recipe declares one. Unknown tenant IDs fall back to recipe.brand.
    const tenantOverride = (TENANT_ID && recipe.tenants && recipe.tenants[TENANT_ID]) || null;
    const mergedBrand = Object.assign({}, recipe.brand || {}, tenantOverride || {});
    applyBrand(mergedBrand);
    // Expose resolved brand for brandHeader fragment
    recipe.__resolvedBrand = mergedBrand;
    const step = (recipe.steps || [])[STEP_IDX];
    if (!step || step.kind === 'hero') {
      errEl.style.display = 'flex';
      errEl.querySelector('code').textContent = `step ${STEP_IDX} (not a portal)`;
      return;
    }
    document.body.classList.add(`layout-${step.layout || 'dashboard-3col'}`);
    const paths = recipe.paths || {};
    const personas = recipe.personas || {};

    // Mount the correct layout
    const html = renderLayout(step, recipe, personas, paths);
    root.innerHTML = html;

    // Wire drill-downs after mount
    wireDrillDowns(step, paths);
  }

  // ---------- brand token application ----------
  function applyBrand(brand) {
    const s = document.documentElement.style;
    // Brand primary maps to --p700 (the core action color)
    if (brand.primary)    s.setProperty('--p700', brand.primary);
    if (brand.primary900) s.setProperty('--p900', brand.primary900);
    if (brand.primary800) s.setProperty('--p800', brand.primary800);
    if (brand.primary600) s.setProperty('--p600', brand.primary600);
    if (brand.primary400) s.setProperty('--p400', brand.primary400);
    if (brand.primary100) s.setProperty('--p100', brand.primary100);
    if (brand.primary50)  s.setProperty('--p50',  brand.primary50);
    if (brand.tickerBg)   s.setProperty('--ticker-bg', brand.tickerBg);
  }

  // ---------- layout dispatcher ----------
  function renderLayout(step, recipe, personas, paths) {
    switch (step.layout) {
      case 'customer-2col': return layoutCustomer(step, recipe, personas, paths);
      default:              return layoutDashboard3col(step, recipe, personas, paths);
    }
  }

  // ---------- brand header fragment ----------
  function brandHeader(step, recipe, personas) {
    // Prefer resolved (tenant-merged) brand if available
    const brand = recipe.__resolvedBrand || recipe.brand || {};
    const persona = personas[step.persona] || {};
    const logo = (brand.logoSvg ? brand.logoSvg : DEFAULT_LOGO)
      .replace(/stroke="[^"]*"/g, `stroke="var(--p700)"`);
    const titleHtml = step.portalTitle
      ? `<div class="p-header-title">${step.portalTitle}</div>`
      : '';
    const navHtml = step.nav && step.nav.length
      ? `<div class="p-header-nav">${step.nav.map(n => `<div class="item${n.active ? ' active' : ''}">${n.label}</div>`).join('')}</div>`
      : '';
    const avatarClass = step.layout === 'customer-2col' ? 'avatar avatar-lg' : 'avatar';
    const personaLabel = step.layout === 'customer-2col'
      ? `<strong>${persona.name || ''}</strong><div><span>${persona.title || ''}</span></div>`
      : `<strong>${persona.name || ''}</strong><div><span>${persona.title || ''}</span></div>`;

    return `
      <div class="p-header">
        <div class="p-header-left">
          <div class="brand-mark" style="color:var(--p900);">${logo}${brand.name || ''}</div>
          ${titleHtml}${navHtml}
        </div>
        <div class="user-info">
          <div class="label">${personaLabel}</div>
          <div class="${avatarClass}">${persona.avatar || ''}</div>
        </div>
      </div>`;
  }

  // ---------- ticker fragment ----------
  function ticker(items) {
    if (!items || !items.length) return '';
    const renderItem = (t) => `<div class="ticker-item"><span class="ticker-symbol">${t.symbol}</span><span class="ticker-val">${t.value}</span><span class="t-${t.dir}">${t.dir === 'up' ? '▲' : '▼'} ${t.change}</span></div>`;
    // Duplicate for seamless scroll
    const doubled = items.concat(items).map(renderItem).join('');
    return `<div class="ticker-wrap"><div class="ticker">${doubled}</div></div>`;
  }

  // ---------- frame overlay markup (shared) ----------
  // Portals show single future-state "art of the possible" mocks, no A/B compare.
  function frameOverlay() {
    return `
      <div id="frame-view">
        <div class="frame-chrome">
          <button id="frame-back">${icon('back', 13)} Back</button>
          <div class="divider"></div>
          <span id="frame-label" style="color:var(--g500);">—</span>
        </div>
        <iframe id="frame-embed" style="width:100%;height:100%;border:0;"></iframe>
      </div>`;
  }

  // ---------- LAYOUT: dashboard-3col (sender / modular) ----------
  function layoutDashboard3col(step, recipe, personas, paths) {
    const tk = step.ticker ? ticker(recipe.ticker || defaultTicker()) : '';
    const header = brandHeader(step, recipe, personas);
    const callout = step.callout ? `<div class="callout-banner">${icon('grid')}<div>${step.callout}</div></div>` : '';
    const kpis = step.kpis ? renderKpis(step.kpis) : '';
    const cols = step.columns || {};
    const left   = (cols.left   || []).map(renderBlock).join('');
    const middle = (cols.middle || []).map(renderBlock).join('');
    const right  = (cols.right  || []).map(renderBlock).join('');

    return `
      <div class="portal-wrapper">
        ${tk}
        ${header}
        <div id="main-view" style="display:flex;flex-direction:column;flex-grow:1;overflow:hidden;">
          ${callout}
          ${kpis}
          <div class="p-container-3col">
            <div class="col-stack">${left}</div>
            <div class="col-stack">${middle}</div>
            <div class="col-stack">${right}</div>
          </div>
        </div>
        ${frameOverlay()}
      </div>`;
  }

  // ---------- LAYOUT: customer-2col (signer) ----------
  function layoutCustomer(step, recipe, personas, paths) {
    const header = brandHeader(step, recipe, personas);
    const cols = step.columns || {};
    const left  = (cols.left  || []).map(renderBlock).join('');
    const right = (cols.right || []).map(renderBlock).join('');
    const hero = step.hero ? `
      <div class="c-hero">
        <div class="c-greeting">${step.hero.greeting || ''}</div>
        ${step.hero.metric ? `
          <div class="c-net-worth-label">${step.hero.metric.label || ''}</div>
          <div class="c-net-worth-val">${step.hero.metric.value || ''}</div>
          ${step.hero.metric.delta ? `<div class="c-delta">${step.hero.metric.delta}</div>` : ''}
        ` : ''}
      </div>` : '';

    return `
      <div class="portal-wrapper">
        ${header}
        <div id="main-view" class="p-container-customer">
          ${hero}
          <div class="c-grid">
            <div style="display:flex;flex-direction:column;gap:24px;">${left}</div>
            <div style="display:flex;flex-direction:column;gap:20px;">${right}</div>
          </div>
        </div>
        ${frameOverlay()}
      </div>`;
  }

  // ---------- KPIs ----------
  function renderKpis(kpis) {
    const cards = kpis.map(k => {
      const trendCls = k.trendDir ? ` t-${k.trendDir}` : '';
      return `<div class="kpi-card">
        <div class="kpi-label">${k.label || ''}</div>
        <div class="kpi-val">${k.value || ''}</div>
        ${k.trend ? `<div class="kpi-trend${trendCls}">${k.trend}</div>` : ''}
      </div>`;
    }).join('');
    return `<div class="kpi-bar">${cards}</div>`;
  }

  // ---------- Block dispatcher ----------
  function renderBlock(b) {
    switch (b.type) {
      case 'list':     return blockList(b);
      case 'schedule': return blockSchedule(b);
      case 'table':    return blockTable(b);
      case 'actions':  return blockActions(b);
      case 'donut':    return blockDonut(b);
      case 'stock':    return blockStock(b);
      case 'holdings': return blockHoldings(b);
      case 'insights': return blockInsights(b);
      case 'alert':    return blockAlert(b);
      case 'advisor':  return blockAdvisor(b);
      case 'movers':   return blockMovers(b);
      case 'legend':   return blockLegend(b);
      case 'tools':    return blockActions(Object.assign({}, b, { isToolGrid: true }));
      default:         return '';
    }
  }

  // ---------- block: list ----------
  function blockList(b) {
    const hdr = cardHeader(b);
    const items = (b.items || []).map(it => `
      <div class="p-item${it.highlighted ? ' highlighted' : ''}" ${it.drillId ? `data-drill="${it.drillId}"` : ''}>
        <div>
          <div class="p-item-name">${it.name || ''}</div>
          ${it.meta ? `<div class="p-item-meta">${it.meta}</div>` : ''}
        </div>
        ${it.value ? `<span class="p-item-val">${it.value}</span>` : ''}
      </div>`).join('');
    return `<div class="p-card">${hdr}<div class="p-client-list">${items}</div></div>`;
  }

  // ---------- block: schedule ----------
  function blockSchedule(b) {
    const hdr = cardHeader(b);
    const rows = (b.items || []).map(it => `
      <div class="review-row">
        <div class="date-block"><div class="m">${it.month || ''}</div><div class="d">${it.day || ''}</div></div>
        <div class="review-meta"><div class="t">${it.title || ''}</div><div class="s">${it.subtitle || ''}</div></div>
      </div>`).join('');
    return `<div class="p-card">${hdr}<div>${rows}</div></div>`;
  }

  // ---------- block: table ----------
  function blockTable(b) {
    const hdr = cardHeader(b);
    const cols = (b.columns || []).map(c => `<th>${c}</th>`).join('');
    const rows = (b.rows || []).map((r, rowIdx) => {
      const cells = (r.cells || []).map(c => {
        if (typeof c === 'string') return `<td>${c}</td>`;
        if (c.label) {
          return `<td><div class="dt-label">${c.label}</div>${c.sub ? `<div class="dt-sub">${c.sub}</div>` : ''}</td>`;
        }
        if (c.pill) {
          const p = c.pill;
          const rippleCls = p.ripple ? ` ripple-${p.color}` : '';
          const drillAttr = drillToAttr(c.drillTo, rowIdx, 'table');
          const toolAttr = p.tool ? ` data-tool="${p.tool}"` : '';
          return `<td><span class="pill pill-${p.color}${rippleCls}"${drillAttr}${toolAttr}>${p.label}</span></td>`;
        }
        return '<td></td>';
      }).join('');
      return `<tr class="docket-row">${cells}</tr>`;
    }).join('');
    return `<div class="p-card" style="${b.grow ? 'flex-grow:1;' : ''}">
      ${hdr}
      <table class="docket-table">
        <thead><tr>${cols}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  }

  // ---------- block: actions (quick actions OR tool grid) ----------
  function blockActions(b) {
    const hdr = cardHeader(b);
    const buttons = (b.items || []).map((a, i) => {
      const primaryCls = a.primary ? ' primary' : '';
      const pulseCls   = a.pulse === 'attention' ? ' highlight-action' : '';
      const drillAttr  = drillToAttr(a.drillTo, i, 'action');
      const toolAttr   = a.tool ? ` data-tool="${a.tool}"` : '';
      const tag        = a.tag ? `<span class="tag">${a.tag}</span>` : '';
      return `<button class="p-action-btn${primaryCls}${pulseCls}"${drillAttr}${toolAttr}>
        ${icon(a.icon || 'link')}<span>${a.label}</span>${tag}
      </button>`;
    }).join('');
    return `<div class="p-card">${hdr}<div class="p-action-grid">${buttons}</div></div>`;
  }

  // ---------- block: donut ----------
  function blockDonut(b) {
    const hdr = cardHeader(b);
    // Build conic-gradient from segments
    let pct = 0;
    const stops = (b.segments || []).map(s => {
      const start = pct;
      pct += (s.pct || 0);
      return `var(--${s.color || 'p700'}) ${start}% ${pct}%`;
    }).join(', ');
    const rows = (b.segments || []).map(s => `
      <div class="allocation-row">
        <div class="alloc-label"><div class="dot" style="background:var(--${s.color || 'p700'});"></div>${s.label || ''}</div>
        <div class="alloc-val">${s.pct || 0}%</div>
      </div>`).join('');
    return `<div class="p-card">${hdr}
      <div class="donut-wrap">
        <div class="donut" style="background:conic-gradient(${stops});"></div>
      </div>
      <div>${rows}</div>
    </div>`;
  }

  // ---------- block: stock highlight ----------
  function blockStock(b) {
    const hdr = `<div class="p-card-header"><span>${b.title || ''}</span>${b.live ? `<span style="color:var(--green);font-size:10px;">●</span>` : ''}</div>`;
    return `<div class="p-card">${hdr}
      <div class="stock-highlight">
        <div style="display:flex;justify-content:space-between;align-items:flex-end;">
          <div>
            <div class="big-price">${b.price || ''}</div>
            <div class="stock-sub">${b.sub || ''}</div>
          </div>
          <div class="stock-delta">${b.delta || ''}</div>
        </div>
        <div class="stock-bar"><span></span></div>
      </div>
    </div>`;
  }

  // ---------- block: holdings (signer-portal donut+blocks) ----------
  function blockHoldings(b) {
    let pct = 0;
    const stops = (b.donut && b.donut.segments ? b.donut.segments : []).map(s => {
      const start = pct;
      pct += (s.pct || 0);
      return `var(--${s.color || 'p700'}) ${start}% ${pct}%`;
    }).join(', ');
    const d = b.donut || {};
    const blocks = (b.blocks || []).map(blk => `
      <div class="holdings-block">
        <div class="holdings-head">
          <div class="swatch" style="background:var(--${blk.color || 'p700'});"></div>
          <div class="label" style="color:var(--${blk.color || 'p700'});">${blk.label || ''}</div>
        </div>
        <div class="holdings-rows">
          ${(blk.rows || []).map(r => `<div class="row"><span>${r.name || ''}</span><span>${r.meta || ''}</span></div>`).join('')}
        </div>
      </div>`).join('');
    return `<div class="c-card">
      <div class="c-card-title">${b.title || ''}</div>
      <div class="holdings-wrap">
        <div class="holdings-donut">
          <div class="donut donut-lg" style="background:conic-gradient(${stops});">
            <div class="donut-center">
              <div class="big">${d.center || ''}</div>
              <div class="sm">${d.centerSub || ''}</div>
            </div>
          </div>
        </div>
        <div class="holdings-body">${blocks}</div>
      </div>
    </div>`;
  }

  // ---------- block: insights ----------
  function blockInsights(b) {
    const items = (b.items || []).map(it => `
      <div class="research-item">
        <div class="doc-icon">${icon(it.icon || 'report', 20)}</div>
        <div class="r-content">
          <h4>${it.title || ''}</h4>
          <p>${it.body || ''}</p>
          ${it.cta ? `<a class="r-btn">${it.cta}${icon('chevRight', 12)}</a>` : ''}
        </div>
      </div>`).join('');
    return `<div class="c-card">
      <div class="c-card-title">${b.title || ''}</div>
      ${items}
    </div>`;
  }

  // ---------- block: alert (pulsing action card) ----------
  function blockAlert(b) {
    const drillAttr = drillToAttr(b.drillTo, 0, 'alert');
    const pulseCls = b.pulse ? ' urgent-action' : '';
    return `<div class="c-card action-card${pulseCls}"${drillAttr}>
      <div style="display:flex;justify-content:space-between;align-items:start;">
        <h3>${icon('alert')}${b.title || ''}</h3>
        ${b.badge ? `<span class="urgent-badge">${b.badge}</span>` : ''}
      </div>
      ${b.body ? `<p style="font-size:12.5px;color:var(--g700);margin-bottom:6px;line-height:1.5;">${b.body}</p>` : ''}
      ${b.cta ? `<button class="action-btn">${b.cta}</button>` : ''}
    </div>`;
  }

  // ---------- block: advisor widget ----------
  function blockAdvisor(b) {
    const adv = b.advisor || {};
    const actions = (b.actions || []).map((a, i) => {
      const drillAttr = drillToAttr(a.drillTo, i, 'advisor-action');
      return `<button class="ad-btn-sm"${drillAttr}>${a.label}</button>`;
    }).join('');
    return `<div class="c-card">
      <div class="c-card-title">${b.title || ''}</div>
      <div class="advisor-widget">
        <div class="ad-avatar">${adv.avatar || ''}</div>
        <div class="ad-info">
          <div class="n">${adv.name || ''}</div>
          <div class="t">${adv.title || ''}</div>
        </div>
      </div>
      <div class="ad-actions">${actions}</div>
    </div>`;
  }

  // ---------- block: movers ----------
  function blockMovers(b) {
    const rows = (b.rows || []).map(r => `
      <div class="movers-row">
        <span style="font-weight:600;">${r.symbol}</span>
        <span class="t-${r.dir}">${r.change}</span>
      </div>`).join('');
    return `<div class="c-card">
      <div class="c-card-title">${b.title || ''}</div>${rows}
    </div>`;
  }

  // ---------- block: legend / coverage ----------
  function blockLegend(b) {
    const hdr = cardHeader(b);
    const rows = (b.rows || []).map(r =>
      `<div class="row"><span>${r.label}</span><span>${r.value}</span></div>`
    ).join('');
    return `<div class="p-card">${hdr}<div class="legend-body">${rows}</div></div>`;
  }

  // ---------- helpers ----------
  function cardHeader(b) {
    const right = b.subtitle
      ? `<span class="sub-link">${b.subtitle}</span>`
      : (b.badge ? `<span class="p-badge-inline">${b.badge}</span>` : '');
    return `<div class="p-card-header"><span>${b.title || ''}</span>${right}</div>`;
  }

  // Build data-drill-* attrs from a drillTo descriptor: { current, future, tool, label }
  // Returns attributes that wireDrillDowns() will read.
  function drillToAttr(drill, idx, prefix) {
    if (!drill) return '';
    const id = `${prefix}-${idx}`;
    return ` data-drill="${id}"`;
  }

  // Gather all drillTo targets from the step tree so wireDrillDowns can find them
  function collectDrills(step) {
    const drills = {};
    const walk = (node, prefix) => {
      if (!node) return;
      (node.items || []).forEach((it, i) => {
        if (it.drillTo) drills[`${prefix}-${i}`] = it.drillTo;
      });
      (node.rows || []).forEach((r, i) => {
        (r.cells || []).forEach(c => {
          if (c && c.drillTo) drills[`table-${i}`] = c.drillTo;
        });
      });
    };
    ['left', 'middle', 'right'].forEach(col => {
      (step.columns && step.columns[col] || []).forEach(blk => {
        if (blk.type === 'list')      walk(blk, 'list');
        if (blk.type === 'table')     walk(blk, 'table');
        if (blk.type === 'actions')   walk(blk, 'action');
        if (blk.type === 'advisor')   walk({ items: blk.actions }, 'advisor-action');
        if (blk.type === 'alert' && blk.drillTo) drills['alert-0'] = blk.drillTo;
      });
    });
    return drills;
  }

  // ---------- drill-down wiring ----------
  function wireDrillDowns(step, paths) {
    const drills = collectDrills(step);
    // Resolve a path key to an absolute URL. If the key exists in recipe.paths,
    // use that value — otherwise treat the key itself as a path. Either way,
    // resolve against the recipe's URL so recipe-relative paths work regardless
    // of where portal.html lives.
    const resolve = (key) => {
      const raw = paths[key] || key;
      try { return new URL(raw, RECIPE_ABS).href; }
      catch (e) { return raw; }
    };

    const frameView  = document.getElementById('frame-view');
    const mainView   = document.getElementById('main-view');
    const frame      = document.getElementById('frame-embed');
    const frameLabel = document.getElementById('frame-label');
    const frameBack  = document.getElementById('frame-back');

    function openFrame(target) {
      if (!target) return;
      // Every drill-down is a single future-state (or tool) view.
      let url = resolve(target.future || target.tool || target.current);
      if (!url) return;
      // Propagate the portal's ?tenant= down to the iframe so sibling scenes
      // render in the same tenant chrome. Safe no-op for stories that don't
      // use tenant-swap.
      if (TENANT_ID) {
        url += (url.indexOf('?') === -1 ? '?' : '&') + 'tenant=' + encodeURIComponent(TENANT_ID);
      }
      frameLabel.textContent = target.label || '';
      frame.src = url;
      if (mainView) mainView.style.display = 'none';
      frameView.style.display = 'block';
    }

    function closeFrame() {
      frame.src = 'about:blank';
      frameView.style.display = 'none';
      if (mainView) mainView.style.display = (document.body.classList.contains('layout-customer-2col') ? 'block' : 'flex');
    }

    frameBack.addEventListener('click', closeFrame);

    // Wire elements with data-drill (drillTo lookup) OR data-tool (paths lookup)
    document.querySelectorAll('[data-drill]').forEach(el => {
      const key = el.getAttribute('data-drill');
      const target = drills[key];
      if (!target) return;
      el.addEventListener('click', (ev) => {
        ev.stopPropagation();
        openFrame(target);
      });
      // Widen the click target: when the drill attribute is on a pill inside
      // a docket row, bind the whole row too so clicking anywhere in the row
      // drills in. Same story for p-item and p-action-btn (drill attr
      // directly on the element means the closest() call returns the element
      // itself, which is already wired).
      const row = el.closest('.docket-row, .p-item, .p-action-btn');
      if (row && row !== el) {
        row.addEventListener('click', (ev) => {
          ev.stopPropagation();
          openFrame(target);
        });
      }
    });
    document.querySelectorAll('[data-tool]').forEach(el => {
      const toolKey = el.getAttribute('data-tool');
      // Skip if element also has a data-drill (already wired)
      if (el.hasAttribute('data-drill')) return;
      const target = { future: toolKey, label: toolLabel(toolKey) };
      el.addEventListener('click', (ev) => {
        ev.stopPropagation();
        openFrame(target);
      });
    });
  }

  // Convert a tool key to a friendly label for the frame chrome
  function toolLabel(key) {
    const MAP = {
      webforms: 'Docusign Web Forms',
      idv: 'Docusign ID Verification',
      notary: 'Docusign Notary / IPEN',
      esig: 'Docusign eSignature',
      maestro: 'Docusign Maestro',
      docgen: 'Docusign Doc Generation',
      loop: 'Docusign Loop',
      navigator: 'Docusign Navigator',
      workspaces: 'Docusign Workspaces'
    };
    return MAP[key] || key;
  }

  // ---------- default ticker (fallback) ----------
  function defaultTicker() {
    return [
      { symbol: 'S&P 500', value: '5,214.08', dir: 'up', change: '0.41%' },
      { symbol: 'DJIA', value: '39,512.13', dir: 'down', change: '0.09%' },
      { symbol: 'NASDAQ', value: '16,340.87', dir: 'up', change: '0.72%' },
      { symbol: 'DOCU', value: '83.55', dir: 'up', change: '1.81%' },
      { symbol: '10Y TSY', value: '4.21%', dir: 'down', change: '2bps' }
    ];
  }
})();

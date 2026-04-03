'use strict';

/* ── Constants ────────────────────────────────────────────────────────────── */
const FDA_BASE = 'https://api.fda.gov';
const FDA_KEY  = 'KYTR43yahC3OQRPCj2dyIM7q68gJ3C7OMH0EvGpg';
const MAX_DRUGS = 8;

/* ── State ────────────────────────────────────────────────────────────────── */
let panel     = [];   // [{ name, brandName, genericName, pharmClass, fdaClass }]
let analyzing = false;

/* ── FDA API ──────────────────────────────────────────────────────────────── */
async function fdaGet(path, params = {}) {
  const url = new URL(FDA_BASE + path);
  url.searchParams.set('api_key', FDA_KEY);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  let delay = 500;
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url.toString());
    if (res.status === 404)  return null;
    if (res.status === 429)  { await sleep(delay); delay *= 2; continue; }
    if (!res.ok)             throw new Error(`FDA ${res.status}`);
    return res.json();
  }
  throw new Error('Rate limited after retries');
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchAETotal(name) {
  return fdaGet('/drug/event.json', {
    search: `patient.drug.medicinalproduct:"${name}"`,
    limit:  1
  });
}
async function fetchAESerious(name) {
  return fdaGet('/drug/event.json', {
    search: `patient.drug.medicinalproduct:"${name}" AND serious:1`,
    limit:  1
  });
}
async function fetchTopReactions(name) {
  return fdaGet('/drug/event.json', {
    search: `patient.drug.medicinalproduct:"${name}"`,
    count:  'patient.reaction.reactionmeddrapt.exact',
    limit:  10
  });
}
async function fetchRecalls(name) {
  return fdaGet('/drug/enforcement.json', {
    search: `product_description:"${name}"`,
    limit:  5
  });
}
async function fetchLabel(query) {
  return fdaGet('/drug/label.json', {
    search: `openfda.brand_name:"${query}" OR openfda.generic_name:"${query}"`,
    limit:  6
  });
}

/* ── Drug Panel ───────────────────────────────────────────────────────────── */
function addDrug(name, brandName, genericName, pharmClass) {
  name = (name || '').trim();
  if (!name) return false;

  if (panel.length >= MAX_DRUGS) {
    showToast('Maximum 8 medications allowed.');
    return false;
  }
  if (panel.some(d => d.name.toLowerCase() === name.toLowerCase())) {
    showToast(`${name} is already in your list.`);
    return false;
  }

  const fdaClass = detectClass(name, genericName, pharmClass);
  panel.push({ name, brandName: brandName || name, genericName: genericName || '', pharmClass: pharmClass || '', fdaClass });
  renderPanel();
  clearResults();
  return true;
}

function removeDrug(name) {
  panel = panel.filter(d => d.name !== name);
  renderPanel();
  clearResults();
}

function clearPanel() {
  panel = [];
  renderPanel();
  clearResults();
}

function detectClass(brand, generic, pharmClass) {
  const haystack = `${brand} ${generic || ''} ${pharmClass || ''}`.toLowerCase();
  for (const [cls, { drugs, keywords }] of Object.entries(DRUG_CLASS_MAP)) {
    if (drugs.some(d => haystack.includes(d.toLowerCase())))      return cls;
    if (keywords.some(k => haystack.includes(k.toLowerCase())))   return cls;
  }
  if (pharmClass) {
    // Trim the "[EPC]" suffix from FDA class strings
    return pharmClass.replace(/\s*\[.*?\]\s*$/, '').trim();
  }
  return 'Unknown';
}

function renderPanel() {
  const cards      = document.getElementById('drug-cards');
  const empty      = document.getElementById('empty-state');
  const countBadge = document.getElementById('drug-count');
  const analyzeBtn = document.getElementById('analyze-btn');
  const clearBtn   = document.getElementById('clear-all-btn');

  countBadge.textContent = `${panel.length} / ${MAX_DRUGS}`;
  analyzeBtn.disabled = panel.length === 0 || analyzing;
  clearBtn.disabled   = panel.length === 0;

  if (panel.length === 0) {
    cards.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');

  cards.innerHTML = panel.map(drug => `
    <div class="drug-card">
      <div class="drug-card-info">
        <div class="drug-card-name">${esc(drug.name)}</div>
        ${drug.genericName && drug.genericName !== drug.name
          ? `<div class="drug-card-generic">${esc(drug.genericName)}</div>` : ''}
        <div class="drug-card-class">${esc(drug.fdaClass)}</div>
      </div>
      <div class="drug-card-chips" id="chips-${escId(drug.name)}">
        <span class="chip chip-default">Pending</span>
      </div>
      <button class="drug-card-remove" data-remove="${escAttr(drug.name)}"
              aria-label="Remove ${esc(drug.name)}">×</button>
    </div>
  `).join('');

  cards.querySelectorAll('[data-remove]').forEach(btn =>
    btn.addEventListener('click', () => removeDrug(btn.dataset.remove))
  );
}

/* ── Drug Typeahead ───────────────────────────────────────────────────────── */
let searchTimer = null;

function initDrugSearch() {
  const input    = document.getElementById('drug-search');
  const dropdown = document.getElementById('drug-suggestions');

  input.addEventListener('input', e => {
    clearTimeout(searchTimer);
    const q = e.target.value.trim();
    if (q.length < 2) { hideDropdown(); return; }
    searchTimer = setTimeout(() => runDrugSearch(q), 300);
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') hideDropdown();
  });

  document.addEventListener('click', e => {
    if (!input.contains(e.target) && !dropdown.contains(e.target)) hideDropdown();
  });
}

async function runDrugSearch(q) {
  const dropdown = document.getElementById('drug-suggestions');
  dropdown.innerHTML = '<div class="suggestion-loading">Searching…</div>';
  dropdown.classList.remove('hidden');

  try {
    const data = await fetchLabel(q);
    if (!data?.results?.length) {
      dropdown.innerHTML = '<div class="suggestion-none">No results found</div>';
      return;
    }
    renderDropdown(data.results);
  } catch {
    dropdown.innerHTML = '<div class="suggestion-none">Search unavailable</div>';
  }
}

function renderDropdown(results) {
  const dropdown = document.getElementById('drug-suggestions');
  const items = results.slice(0, 6).filter(r => {
    return r.openfda?.brand_name?.[0] || r.openfda?.generic_name?.[0];
  });

  if (!items.length) {
    dropdown.innerHTML = '<div class="suggestion-none">No results found</div>';
    return;
  }

  dropdown.innerHTML = items.map(r => {
    const brand  = r.openfda?.brand_name?.[0]      || '';
    const generic= r.openfda?.generic_name?.[0]     || '';
    const cls    = r.openfda?.pharm_class_epc?.[0]  || '';
    const display= brand || generic;
    return `
      <div class="suggestion-item"
           data-brand="${escAttr(brand)}"
           data-generic="${escAttr(generic)}"
           data-class="${escAttr(cls)}">
        <span class="suggestion-name">${esc(display)}</span>
        ${generic && generic !== brand
          ? `<span class="suggestion-generic">${esc(generic)}</span>` : ''}
        ${cls ? `<span class="suggestion-class">${esc(cls.replace(/\s*\[.*?\]/g,''))}</span>` : ''}
      </div>
    `;
  }).join('');

  dropdown.querySelectorAll('.suggestion-item').forEach(item => {
    item.addEventListener('click', () => {
      const brand   = item.dataset.brand;
      const generic = item.dataset.generic;
      const cls     = item.dataset.class;
      addDrug(brand || generic, brand, generic, cls);
      document.getElementById('drug-search').value = '';
      hideDropdown();
    });
  });
}

function hideDropdown() {
  document.getElementById('drug-suggestions').classList.add('hidden');
}

/* ── Class Explorer ───────────────────────────────────────────────────────── */
function renderCuratedClasses() {
  const container = document.getElementById('curated-class-list');
  container.innerHTML = Object.keys(DRUG_CLASS_MAP).map(cls =>
    `<button class="class-tag" data-class="${escAttr(cls)}">${esc(cls)}</button>`
  ).join('');

  container.querySelectorAll('.class-tag').forEach(btn =>
    btn.addEventListener('click', () => showClassModal(btn.dataset.class))
  );
}

function initClassSearch() {
  let timer = null;
  const input   = document.getElementById('class-search');
  const results = document.getElementById('class-search-results');

  input.addEventListener('input', e => {
    clearTimeout(timer);
    const q = e.target.value.trim();
    if (q.length < 2) { results.classList.add('hidden'); return; }
    timer = setTimeout(() => runClassSearch(q), 300);
  });

  document.addEventListener('click', e => {
    if (!input.contains(e.target) && !results.contains(e.target)) {
      results.classList.add('hidden');
    }
  });
}

async function runClassSearch(q) {
  const results  = document.getElementById('class-search-results');
  const drugsDiv = document.getElementById('class-search-drugs');

  results.classList.remove('hidden');
  drugsDiv.innerHTML = '<div class="loading-text">Searching…</div>';

  try {
    const data = await fdaGet('/drug/label.json', {
      search: `pharm_class_epc:"${q}"`,
      limit:  20
    });

    if (!data?.results?.length) {
      drugsDiv.innerHTML = '<div class="loading-text">No results found</div>';
      return;
    }

    const drugs = data.results
      .map(r => ({
        brand:  r.openfda?.brand_name?.[0]     || '',
        generic:r.openfda?.generic_name?.[0]    || '',
        cls:    r.openfda?.pharm_class_epc?.[0] || q
      }))
      .filter(d => d.brand || d.generic);

    drugsDiv.innerHTML = drugs.map(d => `
      <div class="class-drug-item">
        <span>${esc(d.brand || d.generic)}</span>
        <button class="btn-add-small"
                data-brand="${escAttr(d.brand)}"
                data-generic="${escAttr(d.generic)}"
                data-class="${escAttr(d.cls)}">+ Add</button>
      </div>
    `).join('');

    drugsDiv.querySelectorAll('.btn-add-small').forEach(btn =>
      btn.addEventListener('click', () => {
        addDrug(btn.dataset.brand || btn.dataset.generic, btn.dataset.brand, btn.dataset.generic, btn.dataset.class);
      })
    );
  } catch {
    drugsDiv.innerHTML = '<div class="loading-text">Search unavailable</div>';
  }
}

function showClassModal(className) {
  const classData = DRUG_CLASS_MAP[className];
  if (!classData) return;

  const content = document.getElementById('class-modal-content');
  content.innerHTML = `
    <h3>${esc(className)}</h3>
    <p class="modal-subtitle">Select drugs to add to your medication list:</p>
    <div class="class-modal-drugs">
      ${classData.drugs.map(drug => `
        <div class="class-drug-item">
          <span>${esc(drug)}</span>
          <button class="btn-add-small" data-drug="${escAttr(drug)}" data-class="${escAttr(className)}">+ Add</button>
        </div>
      `).join('')}
    </div>
  `;

  content.querySelectorAll('.btn-add-small').forEach(btn =>
    btn.addEventListener('click', () =>
      addDrug(btn.dataset.drug, btn.dataset.drug, '', btn.dataset.class)
    )
  );

  document.getElementById('class-modal').classList.remove('hidden');
}

/* ── Analysis ─────────────────────────────────────────────────────────────── */
async function runAnalysis() {
  if (panel.length === 0 || analyzing) return;
  analyzing = true;

  const analyzeBtn = document.getElementById('analyze-btn');
  analyzeBtn.disabled  = true;
  analyzeBtn.textContent = 'Analyzing…';

  // Shimmer chips
  panel.forEach(drug => {
    const el = document.getElementById(`chips-${escId(drug.name)}`);
    if (el) el.innerHTML = '<span class="chip chip-loading">Loading…</span>';
  });

  showRiskContent();

  try {
    const settled = await Promise.allSettled(
      panel.map(drug => fetchDrugData(drug.name))
    );

    const drugData = settled.map((r, i) => ({
      drug: panel[i],
      data: r.status === 'fulfilled' ? r.value : null
    }));

    // Update chips
    drugData.forEach(({ drug, data }) => {
      const el = document.getElementById(`chips-${escId(drug.name)}`);
      if (!el) return;
      if (!data) { el.innerHTML = '<span class="chip chip-unknown">No FDA Records</span>'; return; }

      const chips = [];
      if ((data.recalls || []).length > 0) chips.push('<span class="chip chip-recall">Active Recall</span>');
      if (data.totalEvents > 0)            chips.push('<span class="chip chip-ae">Adverse Events Found</span>');
      if (chips.length === 0)              chips.push('<span class="chip chip-clean">Clean</span>');
      el.innerHTML = chips.join('');
    });

    // Score & render
    const risk = calculateRisk(drugData);

    renderGauge(risk.score);
    animateScore(risk.score);
    setTierLabel(risk.tier, risk.tierClass);
    renderFactorCards(risk);
    renderRecallBanner(drugData);
    renderMatrix(drugData);
    renderAEChart(drugData);

  } catch (err) {
    showToast('Analysis failed. Please try again.');
    console.error(err);
  } finally {
    analyzing = false;
    analyzeBtn.disabled   = panel.length === 0;
    analyzeBtn.textContent = 'Analyze Safety';
  }
}

async function fetchDrugData(name) {
  const [total, serious, reactions, recalls] = await Promise.allSettled([
    fetchAETotal(name),
    fetchAESerious(name),
    fetchTopReactions(name),
    fetchRecalls(name)
  ]);

  return {
    name,
    totalEvents:   total.value?.meta?.results?.total    ?? 0,
    seriousEvents: serious.value?.meta?.results?.total  ?? 0,
    topReactions:  reactions.value?.results              || [],
    recalls:       recalls.value?.results                || []
  };
}

/* ── Risk Score ───────────────────────────────────────────────────────────── */
function calculateRisk(drugData) {
  let totalEvents = 0, seriousEvents = 0, maxRecallScore = 0;

  drugData.forEach(({ data }) => {
    if (!data) return;
    totalEvents   += data.totalEvents;
    seriousEvents += data.seriousEvents;

    data.recalls.forEach(r => {
      const cls = r.classification || '';
      const pts = cls.includes('Class I') && !cls.includes('Class II') && !cls.includes('Class III') ? 20
                : cls.includes('Class II') && !cls.includes('Class III') ? 12
                : cls.includes('Class III') ? 6 : 0;
      maxRecallScore = Math.max(maxRecallScore, pts);
    });
  });

  const aeScore      = Math.round(Math.min(totalEvents / 50000, 1) * 35);
  const sevScore     = totalEvents > 0 ? Math.round((seriousEvents / totalEvents) * 30) : 0;
  const recallScore  = Math.min(maxRecallScore, 20);
  const overlapScore = calcOverlap();
  const total        = Math.min(aeScore + sevScore + recallScore + overlapScore, 100);

  const [tier, tierClass] = total < 25 ? ['Low Risk','low']
                          : total < 50 ? ['Moderate','med']
                          : total < 75 ? ['High','high']
                          :              ['Critical','crit'];

  return { score: total, tier, tierClass, aeScore, sevScore, recallScore, overlapScore, totalEvents, seriousEvents };
}

function calcOverlap() {
  let pts = 0;
  const classes = panel.map(d => d.fdaClass);
  for (let i = 0; i < classes.length; i++) {
    for (let j = i + 1; j < classes.length; j++) {
      const a = classes[i], b = classes[j];
      if (!a || !b || a === 'Unknown' || b === 'Unknown') continue;
      if (a === b) {
        pts += CNS_DEPRESSANT_CLASSES.has(a) ? 5 : 3;
      } else if (CNS_DEPRESSANT_CLASSES.has(a) && CNS_DEPRESSANT_CLASSES.has(b)) {
        pts += 5;
      }
    }
  }
  return Math.min(pts, 15);
}

/* ── Gauge ────────────────────────────────────────────────────────────────── */
function renderGauge(score) {
  const svg = document.getElementById('risk-gauge');
  const cx = 100, cy = 105, r = 80, sw = 14;

  // Background arc via explicit midpoint (avoids SVG diameter ambiguity)
  const bgPath = `M ${cx-r} ${cy} A ${r} ${r} 0 0 0 ${cx} ${cy-r} A ${r} ${r} 0 0 0 ${cx+r} ${cy}`;

  let arcPath = '';
  if (score > 0) {
    if (score >= 100) {
      arcPath = bgPath;
    } else {
      // angle increases from π (left) to 2π (right) through top (3π/2)
      const angle = Math.PI + (score / 100) * Math.PI;
      const ex    = (cx + r * Math.cos(angle)).toFixed(2);
      const ey    = (cy + r * Math.sin(angle)).toFixed(2);
      // large-arc = 0 (always ≤ 180°); sweep = 0 (counterclockwise = upward on screen)
      arcPath = `M ${cx-r} ${cy} A ${r} ${r} 0 0 0 ${ex} ${ey}`;
    }
  }

  const color = riskColor(score);

  svg.innerHTML = `
    <path d="${bgPath}" fill="none" stroke="var(--border)" stroke-width="${sw}" stroke-linecap="round"/>
    ${score > 0
      ? `<path d="${arcPath}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" class="gauge-arc"/>`
      : ''}
  `;
}

function riskColor(s) {
  if (s < 25) return 'var(--risk-low)';
  if (s < 50) return 'var(--risk-med)';
  if (s < 75) return 'var(--risk-high)';
  return 'var(--risk-crit)';
}

function animateScore(target) {
  const el   = document.getElementById('risk-score-num');
  let   curr = 0;
  const step = target / (800 / 16);
  const t = setInterval(() => {
    curr = Math.min(curr + step, target);
    el.textContent = Math.round(curr);
    if (curr >= target) clearInterval(t);
  }, 16);
}

function setTierLabel(tier, tierClass) {
  const el = document.getElementById('risk-tier-label');
  el.textContent = tier;
  el.className   = `risk-tier tier-${tierClass}`;
}

/* ── Factor Cards ─────────────────────────────────────────────────────────── */
function renderFactorCards({ aeScore, sevScore, recallScore, overlapScore, totalEvents, seriousEvents }) {
  document.getElementById('fv-ae').textContent  = totalEvents.toLocaleString() + ' reports';
  document.getElementById('fp-ae').textContent  = `${aeScore} / 35 pts`;

  const sevPct = totalEvents > 0 ? Math.round(seriousEvents / totalEvents * 100) : 0;
  document.getElementById('fv-sev').textContent = `${sevPct}% serious`;
  document.getElementById('fp-sev').textContent = `${sevScore} / 30 pts`;

  const recallLabel = recallScore === 20 ? 'Class I'
                    : recallScore === 12 ? 'Class II'
                    : recallScore ===  6 ? 'Class III'
                    :                      'None found';
  document.getElementById('fv-recall').textContent = recallLabel;
  document.getElementById('fp-recall').textContent = `${recallScore} / 20 pts`;

  document.getElementById('fv-overlap').textContent = `${panel.length} drug${panel.length !== 1 ? 's' : ''}`;
  document.getElementById('fp-overlap').textContent = `${overlapScore} / 15 pts`;
}

/* ── Recall Banner ────────────────────────────────────────────────────────── */
function renderRecallBanner(drugData) {
  const banner = document.getElementById('recall-banner');
  const list   = document.getElementById('recall-list');

  const all = drugData.flatMap(({ drug, data }) =>
    (data?.recalls || []).map(r => ({ drugName: drug.name, recall: r }))
  );

  if (!all.length) { banner.classList.add('hidden'); return; }
  banner.classList.remove('hidden');

  list.innerHTML = all.slice(0, 5).map(({ drugName, recall }) => {
    const cls  = recall.classification || 'Unknown';
    const desc = recall.product_description || '';
    return `
      <div class="recall-item">
        <span class="recall-class-badge ${recallBadgeClass(cls)}">${esc(cls)}</span>
        <div class="recall-info">
          <div class="recall-drug">${esc(drugName)}</div>
          <div class="recall-desc">${esc(desc.length > 110 ? desc.slice(0, 110) + '…' : desc)}</div>
        </div>
      </div>
    `;
  }).join('');
}

function recallBadgeClass(cls) {
  if (cls.includes('Class I') && !cls.includes('II') && !cls.includes('III')) return 'badge-class1';
  if (cls.includes('Class II') && !cls.includes('III'))                        return 'badge-class2';
  if (cls.includes('Class III'))                                                return 'badge-class3';
  return 'badge-unknown';
}

/* ── Overlap Matrix ───────────────────────────────────────────────────────── */
function renderMatrix() {
  const section = document.getElementById('matrix-section');
  if (panel.length < 2) { section.classList.add('hidden'); return; }
  section.classList.remove('hidden');

  const n   = panel.length;
  let   html = `<div class="matrix-grid" style="--n:${n}">`;

  // Header row
  html += '<div class="matrix-corner"></div>';
  panel.forEach(d => {
    html += `<div class="matrix-header matrix-col-header" title="${escAttr(d.name)}">${esc(d.name.slice(0,6))}</div>`;
  });

  // Body rows
  panel.forEach((rowDrug, i) => {
    html += `<div class="matrix-header matrix-row-header" title="${escAttr(rowDrug.name)}">${esc(rowDrug.name.slice(0,6))}</div>`;
    panel.forEach((colDrug, j) => {
      if (i === j) {
        html += '<div class="matrix-cell cell-self">—</div>';
      } else {
        const ov = overlapType(rowDrug.fdaClass, colDrug.fdaClass);
        html += `<div class="matrix-cell ${ov.cls}" title="${escAttr(rowDrug.name + ' × ' + colDrug.name + ': ' + ov.label)}"></div>`;
      }
    });
  });
  html += '</div>';

  html += `
    <div class="matrix-legend">
      <span class="legend-item"><span class="legend-dot cell-none"></span> No overlap</span>
      <span class="legend-item"><span class="legend-dot cell-same"></span> Same class</span>
      <span class="legend-item"><span class="legend-dot cell-cns"></span>  CNS risk pair</span>
    </div>
  `;

  document.getElementById('class-matrix').innerHTML = html;
}

function overlapType(a, b) {
  if (!a || !b || a === 'Unknown' || b === 'Unknown') return { cls: 'cell-none', label: 'Unknown' };
  if (a === b) {
    return CNS_DEPRESSANT_CLASSES.has(a)
      ? { cls: 'cell-cns',  label: 'Same CNS class — high risk' }
      : { cls: 'cell-same', label: 'Same class' };
  }
  if (CNS_DEPRESSANT_CLASSES.has(a) && CNS_DEPRESSANT_CLASSES.has(b)) {
    return { cls: 'cell-cns', label: 'CNS depressant combination — high risk' };
  }
  return { cls: 'cell-none', label: 'No significant overlap' };
}

/* ── AE Chart (Canvas) ────────────────────────────────────────────────────── */
function renderAEChart(drugData) {
  const canvas = document.getElementById('ae-chart');
  const dpr    = window.devicePixelRatio || 1;
  const W      = canvas.clientWidth  || 320;
  const H      = 220;

  canvas.width        = W * dpr;
  canvas.height       = H * dpr;
  canvas.style.width  = W + 'px';
  canvas.style.height = H + 'px';

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);

  // Aggregate reactions
  const map = {};
  drugData.forEach(({ data }) => {
    (data?.topReactions || []).forEach(r => {
      const t = (r.term || '').toLowerCase();
      if (t) map[t] = (map[t] || 0) + (r.count || 0);
    });
  });

  const reactions = Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  if (!reactions.length) {
    ctx.fillStyle    = '#6b7080';
    ctx.font         = '13px Sora, sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('No adverse event data available', W / 2, H / 2);
    return;
  }

  const PL = 118, PR = 48, PT = 10, PB = 10;
  const chartW  = W - PL - PR;
  const count   = reactions.length;
  const totalH  = H - PT - PB;
  const barH    = Math.min(16, Math.floor(totalH / count) - 4);
  const spacing = (totalH - barH * count) / Math.max(count - 1, 1);
  const maxVal  = reactions[0][1];

  reactions.forEach(([term, val], i) => {
    const y    = PT + i * (barH + spacing);
    const barW = (val / maxVal) * chartW;

    // Bar
    ctx.fillStyle = '#4f8ef7';
    roundRect(ctx, PL, y, Math.max(barW, 2), barH, 3);
    ctx.fill();

    // Label (left)
    const label = capitalize(term);
    ctx.fillStyle    = '#6b7080';
    ctx.font         = `11px 'DM Mono', monospace`;
    ctx.textAlign    = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(label.length > 15 ? label.slice(0, 14) + '…' : label, PL - 6, y + barH / 2);

    // Count (right of bar)
    ctx.fillStyle = '#e8eaf0';
    ctx.textAlign = 'left';
    ctx.font      = `10px 'DM Mono', monospace`;
    ctx.fillText(val.toLocaleString(), PL + barW + 5, y + barH / 2);
  });
}

function roundRect(ctx, x, y, w, h, r) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y,     x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x,     y + h, r);
  ctx.arcTo(x,     y + h, x,     y,     r);
  ctx.arcTo(x,     y,     x + w, y,     r);
  ctx.closePath();
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/* ── UI Helpers ───────────────────────────────────────────────────────────── */
function showRiskContent() {
  document.getElementById('risk-placeholder').classList.add('hidden');
  document.getElementById('risk-content').classList.remove('hidden');
}

function clearResults() {
  document.getElementById('risk-placeholder').classList.remove('hidden');
  document.getElementById('risk-content').classList.add('hidden');
  document.getElementById('risk-score-num').textContent = '—';
  document.getElementById('risk-tier-label').textContent = '—';
  document.getElementById('risk-tier-label').className   = 'risk-tier';
}

/* ── Education Modals ─────────────────────────────────────────────────────── */
const EDU = {
  ae: {
    title: 'What are Adverse Events?',
    body: `
      <p>An adverse event report is a record submitted to the FDA when a patient, caregiver, or healthcare provider suspects that a drug contributed to a harmful outcome. The FDA's MedWatch system collects these reports voluntarily and from manufacturers.</p>
      <p><strong>Important:</strong> Adverse event reports indicate an <em>association</em>, not proven causation. High report counts may reflect widespread drug use, active surveillance campaigns, or heightened public awareness — not necessarily higher danger.</p>
    `
  },
  recall: {
    title: 'What is a Drug Recall?',
    body: `
      <p>Drug recalls are classified by the FDA into three classes based on health hazard severity:</p>
      <ul>
        <li><strong>Class I</strong> — Serious adverse health consequences or death are probable.</li>
        <li><strong>Class II</strong> — Temporary or medically reversible adverse consequences are probable.</li>
        <li><strong>Class III</strong> — The product is unlikely to cause adverse health consequences, but violates FDA regulations.</li>
      </ul>
      <p>Not all recalls mean a drug is currently dangerous — many are precautionary.</p>
    `
  }
};

function showEduModal(type) {
  const content = EDU[type];
  if (!content) return;
  document.getElementById('edu-modal-content').innerHTML =
    `<h3>${esc(content.title)}</h3>${content.body}`;
  document.getElementById('edu-modal').classList.remove('hidden');
}

function showAboutModal() {
  document.getElementById('edu-modal-content').innerHTML = `
    <h3>About Drug Safety Explorer</h3>
    <p>Drug Safety Explorer is an interactive educational tool that lets you build a personal medication list and receive a real-time safety analysis powered by live data from the OpenFDA public API.</p>
    <p>It addresses a real public health problem: over 1.5 million U.S. ER visits per year involve adverse drug events, and no free consumer tool makes FDA safety data accessible and interpretable in one place.</p>
    <p><strong>Data:</strong> All data is sourced from the U.S. Food &amp; Drug Administration's <a href="https://open.fda.gov" target="_blank">OpenFDA API</a>.</p>
    <p>Built for AIML 1870 | Code Quest | University of Nebraska Omaha</p>
  `;
  document.getElementById('edu-modal').classList.remove('hidden');
}

/* ── Disclaimer ───────────────────────────────────────────────────────────── */
function checkDisclaimer() {
  if (!localStorage.getItem('dse_seen')) {
    document.getElementById('disclaimer-modal').classList.remove('hidden');
  }
}

function dismissDisclaimer() {
  localStorage.setItem('dse_seen', '1');
  document.getElementById('disclaimer-modal').classList.add('hidden');
}

/* ── Toast ────────────────────────────────────────────────────────────────── */
function showToast(msg) {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className   = 'toast';
  el.textContent = msg;
  container.appendChild(el);
  requestAnimationFrame(() => el.classList.add('toast-show'));
  setTimeout(() => {
    el.classList.remove('toast-show');
    setTimeout(() => el.remove(), 300);
  }, 3000);
}

/* ── Escape helpers ───────────────────────────────────────────────────────── */
function esc(s) {
  return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function escAttr(s) {
  return (s || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function escId(s) {
  return (s || '').replace(/[^a-z0-9]/gi, '_');
}

/* ── Bootstrap ────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  renderCuratedClasses();
  renderPanel();
  initDrugSearch();
  initClassSearch();
  checkDisclaimer();

  document.getElementById('analyze-btn').addEventListener('click', runAnalysis);
  document.getElementById('clear-all-btn').addEventListener('click', clearPanel);

  document.getElementById('dismiss-disclaimer').addEventListener('click', dismissDisclaimer);
  document.getElementById('disclaimer-modal').addEventListener('click', e => {
    if (e.target === document.getElementById('disclaimer-modal')) dismissDisclaimer();
  });

  document.getElementById('about-btn').addEventListener('click', showAboutModal);
  document.getElementById('disclaimer-btn').addEventListener('click', () => {
    document.getElementById('edu-modal-content').innerHTML = `
      <h3>Disclaimer</h3>
      <p>Drug Safety Explorer is for <strong>educational use only</strong>. It does not constitute medical advice.</p>
      <p>Data sourced from the <a href="https://open.fda.gov" target="_blank">OpenFDA API</a>, provided by the U.S. Food &amp; Drug Administration.</p>
      <p>Always consult a licensed healthcare provider before making any decisions about medications.</p>
    `;
    document.getElementById('edu-modal').classList.remove('hidden');
  });

  document.getElementById('close-edu-modal').addEventListener('click', () => {
    document.getElementById('edu-modal').classList.add('hidden');
  });
  document.getElementById('close-class-modal').addEventListener('click', () => {
    document.getElementById('class-modal').classList.add('hidden');
  });

  document.getElementById('edu-modal').addEventListener('click', e => {
    if (e.target === document.getElementById('edu-modal')) {
      document.getElementById('edu-modal').classList.add('hidden');
    }
  });
  document.getElementById('class-modal').addEventListener('click', e => {
    if (e.target === document.getElementById('class-modal')) {
      document.getElementById('class-modal').classList.add('hidden');
    }
  });

  // Info buttons (delegated)
  document.addEventListener('click', e => {
    const btn = e.target.closest('.info-btn[data-edu]');
    if (btn) showEduModal(btn.dataset.edu);
  });
});

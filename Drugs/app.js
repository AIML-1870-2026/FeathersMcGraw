'use strict';

/* ── Constants ────────────────────────────────────────────────────────────── */
const FDA_BASE   = 'https://api.fda.gov';
const FDA_KEY    = 'KYTR43yahC3OQRPCj2dyIM7q68gJ3C7OMH0EvGpg';
const MAX_DRUGS  = 8;
const DRUG_COLORS = ['#4f8ef7','#f7914f','#4ff79a','#f74f91','#c084fc','#f7e44f','#4ff7f7','#fb923c'];

// Known clinical drug-class interaction pairs [classA, classB, points, description]
const INTERACTION_PAIRS = [
  ['NSAIDs',         'Anticoagulants',  12, 'GI & internal bleeding risk'],
  ['SSRIs',          'NSAIDs',           8, 'GI bleeding & serotonin risk'],
  ['ACE Inhibitors', 'NSAIDs',           6, 'Kidney function stress'],
  ['SSRIs',          'Opioids',          5, 'Serotonin syndrome risk'],
  ['Statins',        'Antipsychotics',   4, 'Myopathy & metabolism risk'],
];

/* ── State ────────────────────────────────────────────────────────────────── */
let panel       = [];   // [{ name, brandName, genericName, pharmClass, fdaClass }]
let analyzing   = false;
let selectedIdx = -1;   // typeahead keyboard selection

/* ── FDA API ──────────────────────────────────────────────────────────────── */
async function fdaGet(path, params = {}, signal = null) {
  const url = new URL(FDA_BASE + path);
  url.searchParams.set('api_key', FDA_KEY);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  let delay = 500;
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url.toString(), signal ? { signal } : {});
    if (res.status === 404)  return null;
    if (res.status === 429)  { await sleep(delay); delay *= 2; continue; }
    if (!res.ok)             throw new Error(`FDA ${res.status}`);
    return res.json();
  }
  throw new Error('Rate limited after retries');
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ── Search cache & abort ─────────────────────────────────────────────────── */
const _searchCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;
let   _searchAbort = null;

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
    search: `openfda.generic_name:"${name}" OR openfda.brand_name:"${name}"`,
    limit:  5
  });
}

// Fetch count of AE reports with a specific outcome flag (e.g. seriousnessdeath:1)
async function fetchAEOutcome(name, outcomeFilter) {
  return fdaGet('/drug/event.json', {
    search: `patient.drug.medicinalproduct:"${name}" AND ${outcomeFilter}`,
    limit:  1
  });
}

// Prefix-wildcard label search with per-query caching and abort support
async function fetchLabel(query) {
  const key    = query.trim().toLowerCase();
  const cached = _searchCache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.data;

  if (_searchAbort) _searchAbort.abort();
  _searchAbort = new AbortController();

  // Use first token as wildcard prefix: "lip" → brand_name:lip* catches Lipitor, Lisinopril, etc.
  const prefix = key.split(/\s+/)[0].replace(/[^a-z0-9]/gi, '');
  if (!prefix) return null;

  const data = await fdaGet('/drug/label.json', {
    search: `openfda.brand_name:${prefix}* OR openfda.generic_name:${prefix}*`,
    limit:  8
  }, _searchAbort.signal);

  if (data) _searchCache.set(key, { data, ts: Date.now() });
  return data;
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
    selectedIdx = -1;
    const q = e.target.value.trim();
    if (q.length < 2) { hideDropdown(); return; }
    // Show local results instantly, then fire API after short debounce
    const local = searchLocal(q);
    if (local.length) showDropdown(local, true);
    searchTimer = setTimeout(() => runDrugSearch(q, local), 150);
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') { hideDropdown(); return; }
    const items = dropdown.querySelectorAll('.suggestion-item');
    if (!items.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIdx = Math.min(selectedIdx + 1, items.length - 1);
      updateActiveItem(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIdx = Math.max(selectedIdx - 1, 0);
      updateActiveItem(items);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIdx >= 0 && items[selectedIdx]) items[selectedIdx].click();
      else if (items.length > 0) items[0].click();
    }
  });

  document.addEventListener('click', e => {
    if (!input.contains(e.target) && !dropdown.contains(e.target)) hideDropdown();
  });
}

function updateActiveItem(items) {
  items.forEach((item, i) => item.classList.toggle('active', i === selectedIdx));
  if (selectedIdx >= 0) items[selectedIdx].scrollIntoView({ block: 'nearest' });
}

// Instant local search against curated DRUG_CLASS_MAP (0ms, no network)
function searchLocal(q) {
  const ql  = q.toLowerCase();
  const out = [];
  // Pass 1: prefix matches (higher confidence)
  for (const [cls, { drugs }] of Object.entries(DRUG_CLASS_MAP)) {
    for (const drug of drugs) {
      if (drug.toLowerCase().startsWith(ql)) {
        out.push({ brand: drug, generic: '', cls });
        if (out.length >= 3) return out;
      }
    }
  }
  // Pass 2: substring matches
  for (const [cls, { drugs }] of Object.entries(DRUG_CLASS_MAP)) {
    for (const drug of drugs) {
      const dl = drug.toLowerCase();
      if (!dl.startsWith(ql) && dl.includes(ql) && !out.some(r => r.brand === drug)) {
        out.push({ brand: drug, generic: '', cls });
        if (out.length >= 3) return out;
      }
    }
  }
  return out;
}

function normalizeAPIResults(results) {
  return (results || [])
    .map(r => ({
      brand:   r.openfda?.brand_name?.[0]     || '',
      generic: r.openfda?.generic_name?.[0]   || '',
      cls:     r.openfda?.pharm_class_epc?.[0] || ''
    }))
    .filter(r => r.brand || r.generic);
}

function mergeResults(local, api) {
  const seen = new Set(local.map(r => (r.brand || r.generic).toLowerCase()));
  const fresh = api.filter(r => !seen.has((r.brand || r.generic).toLowerCase()));
  return [...local, ...fresh].slice(0, 6);
}

async function runDrugSearch(q, local = []) {
  const dropdown = document.getElementById('drug-suggestions');
  if (!local.length) {
    dropdown.innerHTML = '<div class="suggestion-loading">Searching…</div>';
    dropdown.classList.remove('hidden');
  }

  try {
    const data   = await fetchLabel(q);
    const api    = normalizeAPIResults(data?.results);
    const merged = mergeResults(local, api);
    if (merged.length) {
      showDropdown(merged, false);
    } else if (!local.length) {
      dropdown.innerHTML = '<div class="suggestion-none">No results found</div>';
    } else {
      showDropdown(local, false); // keep local, remove spinner
    }
  } catch (e) {
    if (e.name === 'AbortError') return; // superseded by a newer query — do nothing
    if (!local.length) dropdown.innerHTML = '<div class="suggestion-none">Search unavailable</div>';
    else showDropdown(local, false);
  }
}

function showDropdown(items, isLoading) {
  const dropdown = document.getElementById('drug-suggestions');

  let html = items.map(r => {
    const display  = r.brand || r.generic;
    const clsLabel = r.cls ? r.cls.replace(/\s*\[.*?\]/g, '') : '';
    return `
      <div class="suggestion-item"
           data-brand="${escAttr(r.brand)}"
           data-generic="${escAttr(r.generic)}"
           data-class="${escAttr(r.cls)}">
        <span class="suggestion-name">${esc(display)}</span>
        ${r.generic && r.generic !== r.brand
          ? `<span class="suggestion-generic">${esc(r.generic)}</span>` : ''}
        ${clsLabel ? `<span class="suggestion-class">${esc(clsLabel)}</span>` : ''}
      </div>
    `;
  }).join('');

  if (isLoading) {
    html += '<div class="suggestion-loading suggestion-loading-inline">Finding more…</div>';
  }

  dropdown.innerHTML = html;
  dropdown.classList.remove('hidden');

  dropdown.querySelectorAll('.suggestion-item').forEach(item => {
    item.addEventListener('click', () => {
      addDrug(item.dataset.brand || item.dataset.generic, item.dataset.brand, item.dataset.generic, item.dataset.class);
      document.getElementById('drug-search').value = '';
      hideDropdown();
    });
  });
}

function hideDropdown() {
  selectedIdx = -1;
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
    btn.addEventListener('click', () => {
      const added = addDrug(btn.dataset.drug, btn.dataset.drug, '', btn.dataset.class);
      if (added) showToast(`Added ${btn.dataset.drug}`);
    })
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
  renderFactorLoading();

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
      if ((data.recalls || []).length > 0) chips.push('<span class="chip chip-recall">Has Recalls</span>');
      const dr = data.totalEvents > 0 ? data.deathEvents / data.totalEvents : 0;
      const hr = data.totalEvents > 0 ? data.hospEvents  / data.totalEvents : 0;
      if (dr > 0.08)        chips.push('<span class="chip chip-recall">High Fatal Rate</span>');
      else if (dr > 0.03)   chips.push('<span class="chip chip-ae">Fatalities Reported</span>');
      if (hr > 0.35)        chips.push('<span class="chip chip-ae">High Hosp. Rate</span>');
      if (chips.length === 0) chips.push('<span class="chip chip-clean">Low Concern</span>');
      el.innerHTML = chips.join('');
    });

    // Score & render
    const risk = calculateRisk(drugData);

    renderGauge(risk.score);
    animateScore(risk.score);
    setTierLabel(risk.tier, risk.tierClass);
    renderFactorCards(risk);
    renderRecallBanner(drugData);
    renderMatrix();
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
  const [total, deaths, hospit, lt, reactions, recalls] = await Promise.allSettled([
    fetchAETotal(name),
    fetchAEOutcome(name, 'seriousnessdeath:1'),
    fetchAEOutcome(name, 'seriousnesshospitalization:1'),
    fetchAEOutcome(name, 'seriousnesslifethreatening:1'),
    fetchTopReactions(name),
    fetchRecalls(name)
  ]);

  return {
    name,
    totalEvents: total.status    === 'fulfilled' ? (total.value?.meta?.results?.total    ?? 0) : 0,
    deathEvents: deaths.status   === 'fulfilled' ? (deaths.value?.meta?.results?.total   ?? 0) : 0,
    hospEvents:  hospit.status   === 'fulfilled' ? (hospit.value?.meta?.results?.total   ?? 0) : 0,
    ltEvents:    lt.status       === 'fulfilled' ? (lt.value?.meta?.results?.total        ?? 0) : 0,
    topReactions:reactions.status=== 'fulfilled' ? (reactions.value?.results              || []) : [],
    recalls:     recalls.status  === 'fulfilled' ? (recalls.value?.results                || []) : []
  };
}

/* ── Risk Score ───────────────────────────────────────────────────────────── */
// Scoring is RATE-based, not count-based, so popular drugs aren't unfairly penalized.
// Thresholds are set so common OTC drugs (ibuprofen, aspirin) score 20-35,
// while genuinely high-risk drugs and dangerous combinations score 65+.
//
// Formula (max 100):
//   Fatal Outcomes    0-30 pts  death rate vs 12% ceiling
//   Hospitalization   0-30 pts  (hosp + life-threatening rate) vs 60% ceiling
//   Recall Status     0-15 pts  worst recall class in the panel
//   Interactions      0-25 pts  known pharmacological interaction pairs

function calculateRisk(drugData) {
  let totalEvents = 0, deathEvents = 0, hospEvents = 0, ltEvents = 0, maxRecallScore = 0;

  drugData.forEach(({ data }) => {
    if (!data) return;
    totalEvents  += data.totalEvents;
    deathEvents  += data.deathEvents;
    hospEvents   += data.hospEvents;
    ltEvents     += data.ltEvents;

    data.recalls.forEach(r => {
      const cls = r.classification || '';
      const pts = cls.includes('Class I')   && !cls.includes('Class II')  ? 15
                : cls.includes('Class II')  && !cls.includes('Class III') ? 8
                : cls.includes('Class III')                                ? 4 : 0;
      maxRecallScore = Math.max(maxRecallScore, pts);
    });
  });

  const deathRate = totalEvents > 0 ? deathEvents / totalEvents : 0;
  const sevRate   = totalEvents > 0 ? (hospEvents + ltEvents) / totalEvents : 0;

  // Each rate scored against a clinical ceiling; capped at max pts
  const deathScore   = Math.round(Math.min(deathRate / 0.12, 1) * 30); // 12% fatal rate = max
  const hospScore    = Math.round(Math.min(sevRate   / 0.60, 1) * 30); // 60% severe rate = max
  const recallScore  = Math.min(maxRecallScore, 15);
  const overlapScore = calcOverlap();
  const total        = Math.min(deathScore + hospScore + recallScore + overlapScore, 100);

  const [tier, tierClass] = total < 21 ? ['Low Risk', 'low']
                          : total < 41 ? ['Moderate', 'med']
                          : total < 66 ? ['High',     'high']
                          :              ['Critical', 'crit'];

  return {
    score: total, tier, tierClass,
    deathScore, hospScore, recallScore, overlapScore,
    totalEvents, deathEvents, hospEvents, ltEvents,
    deathRate, sevRate
  };
}

function calcOverlap() {
  let pts = 0;
  const classes = panel.map(d => d.fdaClass);
  for (let i = 0; i < classes.length; i++) {
    for (let j = i + 1; j < classes.length; j++) {
      const a = classes[i], b = classes[j];
      if (!a || !b || a === 'Unknown' || b === 'Unknown') continue;

      // CNS depressant combinations — synergistic respiratory depression
      if (CNS_DEPRESSANT_CLASSES.has(a) && CNS_DEPRESSANT_CLASSES.has(b)) {
        pts += a === b ? 8 : 12;
        continue;
      }

      // Known clinical interaction pairs
      let matched = false;
      for (const [ca, cb, addPts] of INTERACTION_PAIRS) {
        if ((a === ca && b === cb) || (a === cb && b === ca)) {
          pts += addPts; matched = true; break;
        }
      }

      // Same class, non-CNS — generally additive risk
      if (!matched && a === b) pts += 3;
    }
  }
  return Math.min(pts, 25);
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
  if (s < 21) return 'var(--risk-low)';
  if (s < 41) return 'var(--risk-med)';
  if (s < 66) return 'var(--risk-high)';
  return 'var(--risk-crit)';
}

function animateScore(target) {
  const el   = document.getElementById('risk-score-num');
  let   curr = 0;
  const step = target / (800 / 16);
  const t = setInterval(() => {
    curr = Math.min(curr + step, target);
    el.textContent = Math.round(curr);
    el.style.color = riskColor(curr);
    if (curr >= target) clearInterval(t);
  }, 16);
}

function setTierLabel(tier, tierClass) {
  const el = document.getElementById('risk-tier-label');
  el.textContent = tier;
  el.className   = `risk-tier tier-${tierClass}`;
}

/* ── Factor Cards ─────────────────────────────────────────────────────────── */
function renderFactorLoading() {
  ['fv-death','fv-hosp','fv-recall','fv-overlap'].forEach(id => {
    document.getElementById(id).textContent = '…';
  });
  ['fp-death','fp-hosp','fp-recall','fp-overlap'].forEach(id => {
    document.getElementById(id).textContent = '…';
  });
}

function renderFactorCards({ deathScore, hospScore, recallScore, overlapScore, totalEvents, deathRate, sevRate }) {
  const pct = v => (v * 100).toFixed(1) + '%';

  document.getElementById('fv-death').textContent = totalEvents > 0 ? pct(deathRate) + ' of reports' : 'No data';
  document.getElementById('fp-death').textContent = `${deathScore} / 30 pts`;

  document.getElementById('fv-hosp').textContent  = totalEvents > 0 ? pct(sevRate)   + ' of reports' : 'No data';
  document.getElementById('fp-hosp').textContent  = `${hospScore} / 30 pts`;

  const recallLabel = recallScore === 15 ? 'Class I'
                    : recallScore ===  8 ? 'Class II'
                    : recallScore ===  4 ? 'Class III'
                    :                      'None found';
  document.getElementById('fv-recall').textContent = recallLabel;
  document.getElementById('fp-recall').textContent = `${recallScore} / 15 pts`;

  const interactionLabel = overlapScore === 0 ? 'None detected'
                         : overlapScore < 8   ? 'Low'
                         : overlapScore < 16  ? 'Moderate'
                         :                      'High';
  document.getElementById('fv-overlap').textContent = interactionLabel;
  document.getElementById('fp-overlap').textContent = `${overlapScore} / 25 pts`;
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
      <span class="legend-item"><span class="legend-dot cell-none"></span> No interaction</span>
      <span class="legend-item"><span class="legend-dot cell-same"></span> Same class</span>
      <span class="legend-item"><span class="legend-dot cell-interaction"></span> Known interaction</span>
      <span class="legend-item"><span class="legend-dot cell-cns"></span> CNS risk</span>
    </div>
  `;

  document.getElementById('class-matrix').innerHTML = html;
}

function overlapType(a, b) {
  if (!a || !b || a === 'Unknown' || b === 'Unknown') return { cls: 'cell-none', label: 'No data' };

  if (a === b) {
    return CNS_DEPRESSANT_CLASSES.has(a)
      ? { cls: 'cell-cns',  label: 'Same CNS class — synergistic respiratory depression' }
      : { cls: 'cell-same', label: 'Same class — additive risk possible' };
  }

  if (CNS_DEPRESSANT_CLASSES.has(a) && CNS_DEPRESSANT_CLASSES.has(b)) {
    return { cls: 'cell-cns', label: 'CNS depressant pair — high respiratory depression risk' };
  }

  for (const [ca, cb, , label] of INTERACTION_PAIRS) {
    if ((a === ca && b === cb) || (a === cb && b === ca)) {
      return { cls: 'cell-interaction', label };
    }
  }

  return { cls: 'cell-none', label: 'No known significant interaction' };
}

/* ── AE Chart (Canvas) ────────────────────────────────────────────────────── */
function renderAEChart(drugData) {
  const canvas   = document.getElementById('ae-chart');
  const dpr      = window.devicePixelRatio || 1;
  const W        = canvas.offsetWidth || 320;
  const hasMulti = drugData.length > 1;
  const H        = 220;
  const PB       = hasMulti ? 32 : 10;

  canvas.width        = W * dpr;
  canvas.height       = H * dpr;
  canvas.style.width  = W + 'px';
  canvas.style.height = H + 'px';

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);

  // Assign a color per drug
  const colorMap = {};
  drugData.forEach(({ drug }, i) => { colorMap[drug.name] = DRUG_COLORS[i % DRUG_COLORS.length]; });

  // Aggregate reactions, tracking which drug contributed most to each
  const reactionMap = {};
  drugData.forEach(({ drug, data }) => {
    (data?.topReactions || []).forEach(r => {
      const t = (r.term || '').toLowerCase();
      if (!t) return;
      if (!reactionMap[t]) reactionMap[t] = { total: 0, byDrug: {} };
      reactionMap[t].total += (r.count || 0);
      reactionMap[t].byDrug[drug.name] = (reactionMap[t].byDrug[drug.name] || 0) + (r.count || 0);
    });
  });

  const reactions = Object.entries(reactionMap)
    .map(([term, d]) => {
      const dominant = Object.entries(d.byDrug).sort((a, b) => b[1] - a[1])[0];
      return { term, total: d.total, color: dominant ? colorMap[dominant[0]] : DRUG_COLORS[0] };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  if (!reactions.length) {
    ctx.fillStyle    = '#6b7080';
    ctx.font         = '13px Sora, sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('No adverse event data available', W / 2, H / 2);
    return;
  }

  const PL = 118, PR = 48, PT = 10;
  const chartW  = W - PL - PR;
  const count   = reactions.length;
  const totalH  = H - PT - PB;
  const barH    = Math.min(16, Math.floor(totalH / count) - 4);
  const spacing = (totalH - barH * count) / Math.max(count - 1, 1);
  const maxVal  = reactions[0].total;

  reactions.forEach(({ term, total, color }, i) => {
    const y    = PT + i * (barH + spacing);
    const barW = (total / maxVal) * chartW;

    ctx.fillStyle = color;
    roundRect(ctx, PL, y, Math.max(barW, 2), barH, 3);
    ctx.fill();

    const label = capitalize(term);
    ctx.fillStyle    = '#6b7080';
    ctx.font         = `11px 'DM Mono', monospace`;
    ctx.textAlign    = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(label.length > 15 ? label.slice(0, 14) + '…' : label, PL - 6, y + barH / 2);

    ctx.fillStyle = '#e8eaf0';
    ctx.textAlign = 'left';
    ctx.font      = `10px 'DM Mono', monospace`;
    ctx.fillText(total.toLocaleString(), PL + barW + 5, y + barH / 2);
  });

  // Drug color legend (only shown when multiple drugs)
  if (hasMulti) {
    let legendX = PL;
    const legendY = H - 12;
    ctx.font         = `10px 'DM Mono', monospace`;
    ctx.textBaseline = 'middle';
    drugData.forEach(({ drug }, i) => {
      if (legendX > W - 30) return;
      const color = DRUG_COLORS[i % DRUG_COLORS.length];
      const name  = drug.brandName || drug.name;
      const label = name.length > 10 ? name.slice(0, 9) + '…' : name;
      ctx.fillStyle = color;
      ctx.fillRect(legendX, legendY - 4, 8, 8);
      ctx.fillStyle = '#6b7080';
      ctx.textAlign = 'left';
      ctx.fillText(label, legendX + 11, legendY);
      legendX += ctx.measureText(label).width + 22;
    });
  }
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
  outcomes: {
    title: 'Fatal & Hospitalization Rates — How to Read This',
    body: `
      <p>These percentages show what fraction of FDA adverse event reports for this drug involved a death or hospitalization as an outcome.</p>
      <p><strong>Critical context:</strong> These are <em>reported associations</em>, not proven causes. Someone who takes ibuprofen for knee pain and later dies in a car accident may appear in this data. The FDA's system is also heavily biased toward serious outcomes — mild side effects are rarely reported at all.</p>
      <p>Widely-used drugs tend to have higher absolute report counts, but the <em>rate</em> is what matters here. A drug used by 500 million people with a 4% death rate in reports is vastly safer than one used by 10,000 people with a 40% death rate in reports.</p>
      <p>Use these numbers as relative signals, not absolute danger assessments, and always weigh them against your doctor's advice.</p>
    `
  },
  recall: {
    title: 'What is a Drug Recall?',
    body: `
      <p>Drug recalls are classified by the FDA into three classes based on health hazard severity:</p>
      <ul>
        <li><strong>Class I</strong> — Serious adverse health consequences or death are probable.</li>
        <li><strong>Class II</strong> — Temporary or medically reversible adverse consequences are probable.</li>
        <li><strong>Class III</strong> — The product is unlikely to cause adverse health consequences, but violates FDA labeling or manufacturing regulations.</li>
      </ul>
      <p>Not all recalls mean a drug is currently dangerous — many are precautionary or affect specific lots. A Class III recall on an otherwise safe drug is very different from a Class I recall.</p>
    `
  },
  interactions: {
    title: 'Drug Interaction Risk',
    body: `
      <p>Drug interactions occur when two or more medications affect each other in the body — amplifying side effects, reducing effectiveness, or creating new risks that neither drug causes alone.</p>
      <p><strong>Combinations flagged by this tool:</strong></p>
      <ul>
        <li><strong>CNS depressants</strong> (opioids + benzodiazepines + antipsychotics) — synergistic respiratory depression; leading cause of overdose deaths</li>
        <li><strong>NSAIDs + anticoagulants</strong> — dramatically increased GI and internal bleeding risk</li>
        <li><strong>SSRIs + NSAIDs</strong> — increased GI bleeding; potential serotonin effects</li>
        <li><strong>ACE inhibitors + NSAIDs</strong> — reduced kidney function, especially in elderly or dehydrated patients</li>
        <li><strong>SSRIs + opioids</strong> — serotonin syndrome risk, particularly with tramadol</li>
      </ul>
      <p>This list covers well-established interactions; your specific medications may have others. Always review interactions with a pharmacist.</p>
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
  return Array.from(s || '').map(c => /[a-z0-9]/i.test(c) ? c : c.charCodeAt(0)).join('');
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

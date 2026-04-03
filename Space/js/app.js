// app.js — Tab routing, state management, rendering

const STATE = {
  activeTab: 'week',
  neows: [],
  sbdb: [],
  sentry: [],
  weekSort: 'cts',
  weekHazardOnly: false,
  futureSort: 'dist',
  futureSortDir: 1,
  futureDays: 365,
  futureDistMax: 20,
  openAsteroid: null,
  pingFired: new Set(),
};

window._allAsteroids = [];
let countdownTimers = [];

// ─── Tab Routing ─────────────────────────────────────────────

function switchTab(tabId) {
  STATE.activeTab = tabId;
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('tab-btn--active', btn.dataset.tab === tabId);
  });
  document.querySelectorAll('.tab-panel').forEach(panel => {
    const visible = panel.id === `panel-${tabId}`;
    panel.style.display = visible ? '' : 'none';
    panel.style.opacity = visible ? '' : '0';
    if (visible) { setTimeout(() => { panel.style.opacity = '1'; }, 10); }
  });

  if (tabId === 'week') renderWeekTab();
  if (tabId === 'future') renderFutureTab();
  if (tabId === 'impact') renderImpactTab();
}

// ─── Countdown timers ────────────────────────────────────────

function startCountdowns() {
  countdownTimers.forEach(clearInterval);
  countdownTimers = [];
  const timers = document.querySelectorAll('[data-countdown]');
  timers.forEach(el => {
    const iso = el.dataset.countdown;
    if (!iso) return;
    const target = new Date(iso);
    const update = () => {
      const cd = formatCountdown(target);
      const str = formatCountdownStr(cd);
      el.textContent = str;
      el.classList.toggle('countdown--urgent', !cd.passed && cd.totalMs < 86400000);
      // Opacity pulse
      el.style.opacity = '0.4';
      setTimeout(() => { el.style.opacity = '1'; }, 80);
    };
    update();
    const id = setInterval(update, 1000);
    countdownTimers.push(id);
  });
}

// ─── Detail Panel ─────────────────────────────────────────────

function openDetailPanel(asteroid) {
  if (!asteroid) return;
  STATE.openAsteroid = asteroid;
  const panel = document.getElementById('detail-panel');
  document.getElementById('detail-overlay').classList.add('overlay--visible');
  const body = document.getElementById('detail-body');

  const band = getCTSBand(asteroid.cts);
  const cdStr = asteroid.approachDate ? asteroid.approachDate.toISOString() : '';

  body.innerHTML = `
    <div class="detail-header">
      <div>
        <h2 class="detail-name">${asteroid.name}</h2>
        <span class="detail-source">${asteroid.source?.toUpperCase()}</span>
      </div>
      ${renderCTSBadge(asteroid.cts)}
    </div>

    <section class="detail-section">
      <h3 class="detail-section-title">APPROACH DATA</h3>
      <div class="detail-grid">
        <div class="detail-kv"><span class="dk">Diameter</span><span class="dv">${asteroid.diameterM ? Math.round(asteroid.diameterM) + ' m' : '—'}</span></div>
        <div class="detail-kv"><span class="dk">Miss Distance</span><span class="dv">${asteroid.missDistanceLd ? fmt(asteroid.missDistanceLd, 2) + ' LD' : '—'}</span></div>
        <div class="detail-kv"><span class="dk">Velocity</span><span class="dv">${asteroid.velocityKms ? fmt(asteroid.velocityKms, 2) + ' km/s' : '—'}</span></div>
        <div class="detail-kv"><span class="dk">Approach Date</span><span class="dv">${asteroid.approachDate ? asteroid.approachDate.toUTCString().slice(0,16) : '—'}</span></div>
        ${asteroid.isHazardous ? '<div class="detail-kv detail-kv--full"><span class="pho-flag">⚠ POTENTIALLY HAZARDOUS OBJECT</span></div>' : ''}
        ${cdStr ? `<div class="detail-kv detail-kv--full"><span class="dk">Time to Approach</span><span class="dv countdown--detail" data-countdown="${cdStr}">—</span></div>` : ''}
      </div>
    </section>

    <section class="detail-section">
      <h3 class="detail-section-title">THREAT BREAKDOWN</h3>
      <div class="detail-grid">
        <div class="detail-kv"><span class="dk">CTS</span><span class="dv">${fmt(asteroid.cts, 1)}</span></div>
        <div class="detail-kv"><span class="dk">Band</span><span class="dv" style="color:${band.color}">${band.label}</span></div>
        ${asteroid.impactProbability ? `<div class="detail-kv"><span class="dk">Impact Probability</span><span class="dv">1 in ${Math.round(1/asteroid.impactProbability).toLocaleString()}</span></div>` : ''}
        ${asteroid.palermo !== undefined ? `<div class="detail-kv"><span class="dk">Palermo Scale</span><span class="dv">${asteroid.palermo}</span></div>` : ''}
        ${asteroid.torino !== undefined ? `<div class="detail-kv"><span class="dk">Torino Scale</span><span class="dv">${asteroid.torino}</span></div>` : ''}
      </div>
    </section>

    <section class="detail-section">
      <h3 class="detail-section-title">SIZE COMPARATOR</h3>
      ${renderSizeComparator(asteroid.diameterM)}
    </section>

    <section class="detail-section">
      <h3 class="detail-section-title">WHAT IF IT HIT?</h3>
      ${renderImpactSection(asteroid.diameterM, asteroid.velocityKms)}
    </section>
  `;

  panel.classList.add('detail-panel--open');
  requestAnimationFrame(() => {
    const cdEls = body.querySelectorAll('[data-countdown]');
    cdEls.forEach(el => {
      const target = new Date(el.dataset.countdown);
      const update = () => {
        const cd = formatCountdown(target);
        el.textContent = formatCountdownStr(cd);
        el.classList.toggle('countdown--urgent', !cd.passed && cd.totalMs < 86400000);
      };
      update();
      const id = setInterval(update, 1000);
      countdownTimers.push(id);
    });
    // Trigger size comparator animations
    setTimeout(() => {
      body.querySelectorAll('.comp-bar').forEach(bar => bar.classList.add('comp-bar--animated'));
    }, 100);
  });

  // Fire ping if high threat
  if (asteroid.cts >= 50 && !STATE.pingFired.has(asteroid.id)) {
    STATE.pingFired.add(asteroid.id);
    playPing();
  }
}

function closeDetailPanel() {
  document.getElementById('detail-panel').classList.remove('detail-panel--open');
  document.getElementById('detail-overlay').classList.remove('overlay--visible');
  STATE.openAsteroid = null;
  countdownTimers.forEach(clearInterval);
  countdownTimers = [];
}

// ─── Tab 1: This Week ─────────────────────────────────────────

function renderWeekTab() {
  const container = document.getElementById('week-cards');
  if (!container) return;
  let data = [...STATE.neows];

  if (STATE.weekHazardOnly) data = data.filter(a => a.isHazardous);

  data.sort((a, b) => {
    switch (STATE.weekSort) {
      case 'cts':  return b.cts - a.cts;
      case 'size': return (b.diameterM || 0) - (a.diameterM || 0);
      case 'dist': return (a.missDistanceLd || 999) - (b.missDistanceLd || 999);
      case 'time':
        if (!a.approachDate) return 1;
        if (!b.approachDate) return -1;
        return a.approachDate - b.approachDate;
    }
    return 0;
  });

  if (data.length === 0) {
    container.innerHTML = '<p class="empty-msg">No asteroids found for this period.</p>';
    return;
  }

  container.innerHTML = data.map(asteroid => {
    const band = getCTSBand(asteroid.cts);
    const cdStr = asteroid.approachDate ? asteroid.approachDate.toISOString() : '';
    return `
      <div class="ast-card" onclick="openDetailPanel(window._allAsteroids.find(a=>a.id==='${asteroid.id}'))">
        <div class="ast-card-header">
          <span class="ast-name">${asteroid.name}</span>
          ${renderCTSBadge(asteroid.cts)}
        </div>
        <div class="ast-card-meta">
          <span>${asteroid.diameterM ? 'Ø ~' + Math.round(asteroid.diameterM) + 'm' : '—'}</span>
          ${asteroid.isHazardous ? '<span class="pho-pill">PHO</span>' : ''}
        </div>
        <div class="ast-card-row"><span class="ast-label">Miss</span><span class="ast-val">${asteroid.missDistanceLd ? fmt(asteroid.missDistanceLd, 2) + ' LD' : '—'}</span></div>
        <div class="ast-card-row"><span class="ast-label">Speed</span><span class="ast-val">${asteroid.velocityKms ? fmt(asteroid.velocityKms, 1) + ' km/s' : '—'}</span></div>
        <div class="ast-card-footer">
          ${cdStr ? `<span class="countdown" data-countdown="${cdStr}">—</span>` : '<span>—</span>'}
          <span class="ast-details-link">→ details</span>
        </div>
      </div>`;
  }).join('');

  startCountdowns();
}

// ─── Tab 2: Future Approaches ─────────────────────────────────

const FUTURE_COLS = [
  { key: 'name',          label: 'Name' },
  { key: 'date',          label: 'Date' },
  { key: 'cts',           label: 'CTS' },
  { key: 'missDistanceLd',label: 'Miss Dist (LD)' },
  { key: 'diameterM',     label: 'Diameter (m)' },
  { key: 'velocityKms',   label: 'Speed (km/s)' },
];

function renderFutureTab() {
  const container = document.getElementById('future-table-wrap');
  if (!container) return;

  const now = new Date();
  const cutoff = new Date(now.getTime() + STATE.futureDays * 86400000);
  let data = STATE.sbdb.filter(a => {
    if (a.approachDate && a.approachDate > cutoff) return false;
    if (a.missDistanceLd && a.missDistanceLd > STATE.futureDistMax) return false;
    return true;
  });

  // Sort
  data.sort((a, b) => {
    let av, bv;
    switch (STATE.futureSort) {
      case 'name':           av = a.name; bv = b.name; break;
      case 'date':           av = a.approachDate; bv = b.approachDate; break;
      case 'cts':            av = a.cts; bv = b.cts; break;
      case 'missDistanceLd': av = a.missDistanceLd; bv = b.missDistanceLd; break;
      case 'diameterM':      av = a.diameterM; bv = b.diameterM; break;
      case 'velocityKms':    av = a.velocityKms; bv = b.velocityKms; break;
    }
    if (av === null || av === undefined) return 1;
    if (bv === null || bv === undefined) return -1;
    if (av < bv) return -STATE.futureSortDir;
    if (av > bv) return STATE.futureSortDir;
    return 0;
  });

  const headCells = FUTURE_COLS.map(col => {
    const active = STATE.futureSort === col.key;
    const arrow = active ? (STATE.futureSortDir === 1 ? ' ↑' : ' ↓') : ' ↕';
    return `<th class="tbl-th${active ? ' tbl-th--active' : ''}" onclick="sortFuture('${col.key}')">${col.label}${arrow}</th>`;
  }).join('');

  const rows = data.slice(0, 500).map(a => {
    const band = getCTSBand(a.cts);
    const dateStr = a.approachDate ? a.approachDate.toISOString().split('T')[0] : '—';
    return `<tr class="tbl-row" onclick="openDetailPanel(window._allAsteroids.find(x=>x.id==='${a.id}'))">
      <td class="tbl-td">${a.name}</td>
      <td class="tbl-td mono">${dateStr}</td>
      <td class="tbl-td mono" style="color:${band.color}">${fmt(a.cts, 1)}</td>
      <td class="tbl-td mono">${a.missDistanceLd ? fmt(a.missDistanceLd, 2) : '—'}</td>
      <td class="tbl-td mono">${a.diameterM ? Math.round(a.diameterM) : '—'}</td>
      <td class="tbl-td mono">${a.velocityKms ? fmt(a.velocityKms, 1) : '—'}</td>
    </tr>`;
  }).join('');

  container.innerHTML = `
    <table class="data-table">
      <thead><tr>${headCells}</tr></thead>
      <tbody>${rows || '<tr><td colspan="6" class="empty-msg">No results.</td></tr>'}</tbody>
    </table>`;
}

function sortFuture(col) {
  if (STATE.futureSort === col) STATE.futureSortDir *= -1;
  else { STATE.futureSort = col; STATE.futureSortDir = 1; }
  renderFutureTab();
}

// ─── Tab 3: Impact Watch ──────────────────────────────────────

function renderImpactTab() {
  const container = document.getElementById('impact-list');
  if (!container) return;

  const data = [...STATE.sentry].sort((a, b) => b.cts - a.cts);

  if (data.length === 0) {
    container.innerHTML = '<p class="empty-msg">No Sentry impact candidates loaded.</p>';
    return;
  }

  container.innerHTML = data.map(a => {
    const band = getCTSBand(a.cts);
    const ip = a.impactProbability;
    const ipStr = ip ? `1 in ${Math.round(1/ip).toLocaleString()}` : '—';
    const year = a.pdate ? a.pdate.split('-')[0] : '—';
    return `
      <div class="impact-row" onclick="openDetailPanel(window._allAsteroids.find(x=>x.id==='${a.id}'))">
        <div class="impact-row-name">${a.name}</div>
        <div class="impact-row-cts" style="color:${band.color}">${fmt(a.cts, 1)}<span class="impact-row-band">${band.label}</span></div>
        <div class="impact-row-stat"><span class="ir-label">Impact Prob.</span><span class="ir-val">${ipStr}</span></div>
        <div class="impact-row-stat"><span class="ir-label">Palermo</span><span class="ir-val">${a.palermo ?? '—'}</span></div>
        <div class="impact-row-stat"><span class="ir-label">Torino</span><span class="ir-val">${a.torino ?? '—'}</span></div>
        <div class="impact-row-stat"><span class="ir-label">Diameter</span><span class="ir-val">${a.diameterM ? Math.round(a.diameterM) + 'm' : '—'}</span></div>
        <div class="impact-row-stat"><span class="ir-label">Most Likely</span><span class="ir-val">${year}</span></div>
      </div>`;
  }).join('');
}

// ─── Sort/Filter Controls ─────────────────────────────────────

function setWeekSort(sort) {
  STATE.weekSort = sort;
  document.querySelectorAll('.sort-btn').forEach(btn => {
    btn.classList.toggle('sort-btn--active', btn.dataset.sort === sort);
  });
  renderWeekTab();
}

function toggleHazardOnly(checked) {
  STATE.weekHazardOnly = checked;
  renderWeekTab();
}

function setFutureDays(days) {
  STATE.futureDays = parseInt(days);
  document.querySelectorAll('.days-btn').forEach(btn => {
    btn.classList.toggle('sort-btn--active', btn.dataset.days === String(days));
  });
  renderFutureTab();
}

function updateDistFilter(val) {
  STATE.futureDistMax = parseFloat(val);
  document.getElementById('dist-val').textContent = parseFloat(val).toFixed(1) + ' LD';
  renderFutureTab();
}

// ─── Load All Data ─────────────────────────────────────────────

async function loadAll() {
  setStatus('Contacting NASA/JPL…');

  const results = await Promise.allSettled([
    fetchNeoWs(),
    fetchSBDB(),
    fetchSentry(),
  ]);

  if (results[0].status === 'fulfilled') {
    STATE.neows = results[0].value;
  } else {
    console.error('NeoWs failed:', results[0].reason);
    showError('neows-error', 'NeoWs API unavailable. ' + results[0].reason?.message);
  }

  if (results[1].status === 'fulfilled') {
    STATE.sbdb = results[1].value;
  } else {
    console.error('SBDB failed:', results[1].reason);
    showError('future-error', 'SBDB API unavailable. ' + results[1].reason?.message);
  }

  if (results[2].status === 'fulfilled') {
    STATE.sentry = results[2].value;
  } else {
    console.error('Sentry failed:', results[2].reason);
    showError('impact-error', 'Sentry API unavailable. ' + results[2].reason?.message);
  }

  // Merge sentry CTS boosts into neows/sbdb
  const sentryMap = {};
  STATE.sentry.forEach(s => { sentryMap[s.id] = s.sentryProbability; });
  [...STATE.neows, ...STATE.sbdb].forEach(a => {
    if (sentryMap[a.id] !== undefined) {
      a.sentryProbability = sentryMap[a.id];
      a.cts = computeThreatScore(a.diameterM, a.velocityKms, a.missDistanceLd, a.sentryProbability);
    }
  });

  window._allAsteroids = [...STATE.neows, ...STATE.sbdb, ...STATE.sentry];

  // Fire ping for any high-threat asteroid in this week's batch
  STATE.neows.filter(a => a.cts >= 50).forEach(a => {
    if (!STATE.pingFired.has(a.id)) {
      STATE.pingFired.add(a.id);
      playPing();
    }
  });

  initTicker(STATE.neows, STATE.sbdb);
  clearStatus();
  renderWeekTab();
  initGlobeWhenReady(window._allAsteroids);
}

// Start globe once both data AND the CDN lib are ready
function initGlobeWhenReady(asteroids) {
  if (window.Globe) {
    initGlobe(asteroids);
    return;
  }
  let tries = 0;
  const poll = setInterval(() => {
    tries++;
    if (window.Globe) {
      clearInterval(poll);
      initGlobe(asteroids);
    } else if (tries >= 20) {
      clearInterval(poll); // give up after 10s
    }
  }, 500);
}

function setStatus(msg) {
  const el = document.getElementById('status-msg');
  if (el) { el.textContent = msg; el.style.display = ''; }
}

function clearStatus() {
  const el = document.getElementById('status-msg');
  if (el) el.style.display = 'none';
}

function showError(id, msg) {
  const el = document.getElementById(id);
  if (el) { el.textContent = msg; el.style.display = ''; }
}

// ─── Bootstrap ────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // Tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Close panel
  document.getElementById('detail-close').addEventListener('click', closeDetailPanel);
  document.getElementById('detail-overlay').addEventListener('click', closeDetailPanel);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDetailPanel(); });

  // Mute button
  document.getElementById('mute-btn').addEventListener('click', () => { initAudio(); toggleMute(); });
  updateMuteButton();

  // Sort buttons (week)
  document.querySelectorAll('.sort-btn[data-sort]').forEach(btn => {
    btn.addEventListener('click', () => setWeekSort(btn.dataset.sort));
  });

  // Hazard filter
  const haz = document.getElementById('hazard-only');
  if (haz) haz.addEventListener('change', e => toggleHazardOnly(e.target.checked));

  // Future day toggles
  document.querySelectorAll('.days-btn').forEach(btn => {
    btn.addEventListener('click', () => setFutureDays(btn.dataset.days));
  });

  // Distance slider
  const slider = document.getElementById('dist-slider');
  if (slider) slider.addEventListener('input', e => updateDistFilter(e.target.value));

  // Set default sort active
  document.querySelector('.sort-btn[data-sort="cts"]')?.classList.add('sort-btn--active');
  document.querySelector('.days-btn[data-days="365"]')?.classList.add('sort-btn--active');

  // Initial tab
  switchTab('week');
  loadAll();
});

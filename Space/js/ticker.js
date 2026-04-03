// ticker.js — Live scrolling ticker

let tickerAsteroids = [];

function buildTickerEntry(asteroid) {
  const cd = asteroid.approachDate ? formatCountdown(asteroid.approachDate) : null;
  let timeStr = '—';
  if (cd && !cd.passed) {
    timeStr = `${cd.days}d ${cd.hours}h`;
  } else if (cd && cd.passed) {
    timeStr = 'PASSED';
  }
  const diam = asteroid.diameterM ? `Ø ~${Math.round(asteroid.diameterM)}m` : '';
  const cts = asteroid.cts ? `CTS ${fmt(asteroid.cts, 0)}` : '';
  const high = asteroid.cts >= 50;
  return `<span class="ticker-entry${high ? ' ticker-entry--high' : ''}">${asteroid.name} · ${diam} · ${cts} · Passes in ${timeStr}</span><span class="ticker-sep">///</span>`;
}

function initTicker(neows, sbdb) {
  const combined = [...(neows || []), ...(sbdb || []).slice(0, 20)];
  // Sort by approach date
  combined.sort((a, b) => {
    if (!a.approachDate) return 1;
    if (!b.approachDate) return -1;
    return a.approachDate - b.approachDate;
  });
  tickerAsteroids = combined;
  renderTicker();
}

function renderTicker() {
  const track = document.getElementById('ticker-track');
  if (!track) return;
  if (tickerAsteroids.length === 0) {
    track.innerHTML = '<span class="ticker-entry">Loading asteroid data…</span>';
    return;
  }
  // Duplicate content for seamless loop
  const content = tickerAsteroids.map(buildTickerEntry).join('');
  track.innerHTML = content + content;
}

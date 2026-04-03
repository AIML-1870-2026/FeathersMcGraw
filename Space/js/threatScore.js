// threatScore.js — Composite Threat Score formula

function computeThreatScore(diameterM, velocityKms, missDistanceLd, sentryProbability = 0) {
  if (!diameterM || !velocityKms || !missDistanceLd) return 0;
  const raw = (diameterM * velocityKms) / missDistanceLd;
  if (raw <= 0) return 0;
  const logScore = Math.log10(raw) * 18;
  const sentryBoost = 1 + (sentryProbability * 5);
  const cts = Math.min(logScore * sentryBoost, 100);
  return Math.max(0, parseFloat(cts.toFixed(1)));
}

function getCTSBand(cts) {
  if (cts < 25) return { label: 'NOMINAL',   color: '#6B6B6B', pulse: false };
  if (cts < 50) return { label: 'ELEVATED',  color: '#B5830A', pulse: false };
  if (cts < 75) return { label: 'HIGH',      color: '#C1121F', pulse: false };
  return         { label: 'CRITICAL',  color: '#C1121F', pulse: true  };
}

function renderCTSBadge(cts) {
  const band = getCTSBand(cts);
  const pulseClass = band.pulse ? ' cts-pulse' : '';
  return `<span class="cts-badge${pulseClass}" style="color:${band.color};border-color:${band.color}">
    <span class="cts-value">${fmt(cts, 1)}</span>
    <span class="cts-label">${band.label}</span>
  </span>`;
}

// impact.js — Impact physics calculator

function computeImpact(diameterM, velocityKms) {
  if (!diameterM || !velocityKms) return null;
  const DENSITY_KGM3 = 3000;
  const r = diameterM / 2;
  const volume = (4 / 3) * Math.PI * Math.pow(r, 3);
  const mass = DENSITY_KGM3 * volume;

  const velocityMs = velocityKms * 1000;
  const kineticEnergyJ = 0.5 * mass * Math.pow(velocityMs, 2);

  const craterDiameterKm = 0.07 * Math.pow(kineticEnergyJ, 0.294) / 1000;
  const richter = ((2 / 3) * Math.log10(kineticEnergyJ) - 3.2).toFixed(1);
  const hiroshimas = kineticEnergyJ / 6.3e13;
  const blastRadiusKm = 20 * Math.pow(hiroshimas, 1 / 3);
  const megatons = kineticEnergyJ / 4.184e15;

  return {
    kineticEnergyJ,
    megatons: megatons.toFixed(2),
    craterDiameterKm: craterDiameterKm.toFixed(2),
    richter,
    blastRadiusKm: blastRadiusKm.toFixed(1),
    hiroshimas: hiroshimas.toFixed(0),
  };
}

function renderImpactSection(diameterM, velocityKms) {
  const impact = computeImpact(diameterM, velocityKms);
  if (!impact) return '<p class="data-na">Insufficient data for impact modeling.</p>';

  const blastKm = parseFloat(impact.blastRadiusKm);
  const craterKm = parseFloat(impact.craterDiameterKm);

  // SVG blast ring diagram (3 concentric rings: crater, severe, blast)
  const blastSvg = renderBlastDiagram(craterKm, blastKm);
  const craterSvg = renderCraterDot(craterKm);

  return `
    <div class="impact-grid">
      <div class="impact-stat">
        <span class="impact-label">YIELD</span>
        <span class="impact-value">${fmtLarge(parseFloat(impact.megatons))} MT</span>
        <span class="impact-sub">≡ ${fmtLarge(parseFloat(impact.hiroshimas))} Hiroshima bombs</span>
      </div>
      <div class="impact-stat">
        <span class="impact-label">SEISMIC EQUIV.</span>
        <span class="impact-value">Richter ${impact.richter}</span>
        <span class="impact-sub">if surface impact</span>
      </div>
      <div class="impact-stat">
        <span class="impact-label">CRATER</span>
        <span class="impact-value">${impact.craterDiameterKm} km Ø</span>
        ${craterSvg}
      </div>
      <div class="impact-stat impact-stat--wide">
        <span class="impact-label">BLAST RADIUS DIAGRAM</span>
        ${blastSvg}
        <div class="blast-legend">
          <span class="blast-leg-item"><span class="blast-swatch" style="background:#C1121F"></span>Crater (${impact.craterDiameterKm} km)</span>
          <span class="blast-leg-item"><span class="blast-swatch" style="background:#B5830A"></span>Severe (${fmt(blastKm * 0.5, 1)} km)</span>
          <span class="blast-leg-item"><span class="blast-swatch" style="background:#6B6B6B"></span>Blast (${impact.blastRadiusKm} km)</span>
        </div>
      </div>
    </div>`;
}

function renderBlastDiagram(craterKm, blastKm) {
  const W = 200, H = 200, cx = W / 2, cy = H / 2;
  if (blastKm <= 0) return '';
  const scale = (W * 0.45) / blastKm;
  const blastR = blastKm * scale;
  const severeR = blastKm * 0.5 * scale;
  const craterR = Math.max((craterKm / 2) * scale, 2);
  return `<svg class="blast-svg" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
    <circle cx="${cx}" cy="${cy}" r="${blastR}" fill="none" stroke="#6B6B6B" stroke-width="1" stroke-dasharray="4,4"/>
    <circle cx="${cx}" cy="${cy}" r="${severeR}" fill="none" stroke="#B5830A" stroke-width="1"/>
    <circle cx="${cx}" cy="${cy}" r="${craterR}" fill="#C1121F" fill-opacity="0.3" stroke="#C1121F" stroke-width="1"/>
    <text x="${cx}" y="${cy + craterR + 10}" text-anchor="middle" font-size="8" fill="#C1121F" font-family="JetBrains Mono,monospace">CRATER</text>
    <text x="${cx + blastR + 4}" y="${cy}" text-anchor="start" font-size="7" fill="#6B6B6B" font-family="JetBrains Mono,monospace">${blastKm.toFixed(1)}km</text>
  </svg>`;
}

function renderCraterDot(craterKm) {
  // Mini scale indicator showing crater vs Manhattan (~21km long)
  const manhattanKm = 21;
  const pct = Math.min((craterKm / manhattanKm) * 100, 100);
  return `<div class="crater-scale">
    <div class="crater-scale-bar">
      <div class="crater-scale-fill" style="width:${pct}%"></div>
    </div>
    <span class="crater-scale-label">vs Manhattan (21 km)</span>
  </div>`;
}

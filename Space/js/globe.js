// globe.js — globe.gl 3D Orbital View

let globeInstance = null;
let globeData = [];

function initGlobe(asteroids) {
  const container = document.getElementById('globe-container');
  if (!container || !window.Globe) return;
  destroyGlobe();

  // Golden-angle spread keeps dots visually distributed across the globe.
  // Altitude is proportional to miss distance (0–3 globe-radius units).
  globeData = asteroids
    .filter(a => a.missDistanceLd != null)
    .slice(0, 100)
    .map((a, i) => {
      const lat  = Math.sin((i * 137.508) * Math.PI / 180) * 60;
      const lng  = ((i * 137.508) % 360) - 180;
      const alt  = Math.min(a.missDistanceLd / 20, 3);
      const band = getCTSBand(a.cts);
      return {
        lat, lng, alt,
        name: a.name,
        cts: a.cts,
        missDistanceLd: a.missDistanceLd,
        diameterM: a.diameterM,
        color: band.color === '#6B6B6B' ? '#FFFFFF' : band.color,
      };
    });

  globeInstance = Globe({ animateIn: true })(container)
    .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
    .atmosphereColor('#FAFAFA')
    .atmosphereAltitude(0.1)
    .backgroundColor('#0A0A0A')
    .showGraticules(true)
    // htmlElementsData renders real DOM nodes at lat/lng/alt — no spikes
    .htmlElementsData(globeData)
    .htmlLat('lat')
    .htmlLng('lng')
    .htmlAltitude('alt')
    .htmlElement(d => buildGlobeDot(d));

  globeInstance.controls().autoRotate      = true;
  globeInstance.controls().autoRotateSpeed = 0.5;
}

// Builds a glowing dot div with an on-hover data card
function buildGlobeDot(d) {
  const dotSize = Math.max(8, Math.round(d.cts / 8) + 6);
  const glow    = Math.ceil(dotSize * 0.8);

  const dot = document.createElement('div');
  dot.style.cssText = `
    width:${dotSize}px;
    height:${dotSize}px;
    background:${d.color};
    border-radius:50%;
    cursor:pointer;
    position:relative;
    box-shadow:0 0 ${glow}px ${d.color};
    transition:transform 0.15s ease, box-shadow 0.15s ease;
    pointer-events:auto;
  `;

  // Tooltip card — positioned above the dot
  const tip = document.createElement('div');
  tip.style.cssText = `
    display:none;
    position:absolute;
    bottom:calc(100% + 8px);
    left:50%;
    transform:translateX(-50%);
    white-space:nowrap;
    background:#0A0A0A;
    color:#FAFAFA;
    font-family:JetBrains Mono,monospace;
    font-size:10px;
    line-height:1.75;
    border:1px solid ${d.color};
    padding:6px 10px;
    pointer-events:none;
    z-index:9999;
  `;
  tip.innerHTML = [
    `<span style="font-size:11px;font-weight:700">${d.name}</span>`,
    `CTS &nbsp;&nbsp; ${fmt(d.cts, 1)}`,
    `Miss &nbsp; ${fmt(d.missDistanceLd, 2)} LD`,
    d.diameterM ? `Ø &nbsp;&nbsp;&nbsp; ~${Math.round(d.diameterM)} m` : null,
  ].filter(Boolean).join('<br>');

  dot.appendChild(tip);

  dot.addEventListener('mouseenter', () => {
    tip.style.display = 'block';
    dot.style.transform = 'scale(1.6)';
    dot.style.boxShadow = `0 0 ${Math.ceil(glow * 2)}px ${d.color}`;
  });
  dot.addEventListener('mouseleave', () => {
    tip.style.display = 'none';
    dot.style.transform = 'scale(1)';
    dot.style.boxShadow = `0 0 ${glow}px ${d.color}`;
  });
  dot.addEventListener('click', () => {
    const match = window._allAsteroids?.find(a => a.name === d.name);
    if (match) openDetailPanel(match);
  });

  return dot;
}

function destroyGlobe() {
  globeInstance = null;
  const container = document.getElementById('globe-container');
  if (container) container.innerHTML = '';
}

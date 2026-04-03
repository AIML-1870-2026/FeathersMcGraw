# SENTINEL — Near-Earth Object Dashboard
### Project Spec · AIML 1870 · University of Nebraska Omaha

---

## Overview

**SENTINEL** is a single-page, vanilla JS web dashboard that pulls live data from three NASA/JPL APIs to visualize near-Earth asteroids. It is deployed as a static site on GitHub Pages.

The dashboard distinguishes itself through:
- A proprietary **Composite Threat Score** formula applied to every asteroid
- A **"What If It Hit?"** impact physics calculator with real crater/blast modeling
- A **Size Comparator** with animated SVG scale references
- A **live scrolling ticker** showing incoming approaches in real time
- Subtle **ambient sound design**
- A **3D interactive globe** (stretch goal, globe.gl)

---

## Visual Design Language

**Theme:** Architectural Blueprint meets NASA Whitepaper  
**Palette:**
- Background: `#FAFAFA` (off-white)
- Primary text: `#0A0A0A`
- Borders: `1px solid #000` (hairline throughout)
- Accent: `#C1121F` (deep red — used ONLY for threat/danger indicators)
- Secondary: `#6B6B6B` (labels, metadata)

**Typography:**
- Display / headers: `Cormorant Garamond` (weight 300, letter-spaced) — fragile, precise
- Data / monospace: `JetBrains Mono` — for numbers, scores, coordinates
- Body: `DM Sans` weight 300

**Layout principles:**
- Heavy negative space
- Hairline `1px` borders everywhere — no thick cards, no drop shadows
- Dot-grid background texture (`radial-gradient` pattern at 20px intervals, very subtle)
- No rounded corners anywhere (`border-radius: 0`)
- Minimal color — the red accent should feel like a warning light, not decoration

**Motion:**
- Tab transitions: crossfade 150ms
- Detail panel: slides in from the right, 200ms ease-out
- Ticker: CSS `marquee`-style continuous scroll
- Size comparator: SVG scale animation on panel open
- Countdown timers: update every second, digits flip with a brief 80ms opacity pulse
- Audio ping: single soft tone (Web Audio API) when high-threat asteroid loads

---

## Architecture

```
index.html          — single file, all tabs, all modals
/css/
  style.css         — all styles
/js/
  app.js            — tab routing, state management
  api.js            — all fetch logic, caching
  ticker.js         — scrolling ticker logic
  threatScore.js    — Composite Threat Score formula
  impact.js         — impact physics calculator
  comparator.js     — size comparator SVG
  audio.js          — Web Audio API ambient + ping
  globe.js          — globe.gl 3D view (stretch)
  utils.js          — unit conversions, formatters
```

All API responses cached in `sessionStorage` to avoid redundant fetches on tab switches.

---

## Data Sources & API Calls

### 1. NeoWs — NASA Asteroids API
**Endpoint:** `https://api.nasa.gov/neo/rest/v1/feed`  
**Params:** `start_date`, `end_date` (7-day window from today), `api_key=DEMO_KEY`  
**Used for:** Tab 1 (This Week), Ticker  
**Key fields:** `name`, `close_approach_data[].close_approach_date_full`, `close_approach_data[].miss_distance.lunar`, `close_approach_data[].relative_velocity.kilometers_per_second`, `estimated_diameter.meters`, `is_potentially_hazardous_asteroid`

### 2. SBDB Close-Approach API — JPL
**Endpoint:** `https://ssd-api.jpl.nasa.gov/cad.api`  
**Params:** `date-min=now`, `date-max=+365`, `dist-max=0.05`, `sort=dist`  
**Used for:** Tab 2 (Future Approaches)  
**Key fields:** `des` (designation), `cd` (close approach date), `dist` (AU), `v-rel` (km/s), `diameter`

### 3. Sentry — JPL Impact Monitoring
**Endpoint:** `https://ssd-api.jpl.nasa.gov/sentry.api`  
**Params:** none required (returns all monitored objects)  
**Used for:** Tab 3 (Impact Watch), Threat Score boost  
**Key fields:** `des`, `pdate` (most likely impact date), `ip` (impact probability), `ps` (Palermo Scale), `ts` (Torino Scale), `diameter`

---

## Composite Threat Score (CTS)

A proprietary 0–100 score applied to every asteroid across all tabs and the ticker.

### Formula

```js
function computeThreatScore(diameterM, velocityKms, missDistanceLd, sentryProbability = 0) {
  if (!diameterM || !velocityKms || !missDistanceLd) return 0;
  
  const raw = (diameterM * velocityKms) / missDistanceLd;
  const logScore = Math.log10(raw) * 18;
  const sentryBoost = 1 + (sentryProbability * 5);
  const cts = Math.min(logScore * sentryBoost, 100);
  
  return Math.max(0, parseFloat(cts.toFixed(1)));
}
```

### Score Bands
| CTS | Label | Color |
|-----|-------|-------|
| 0–25 | NOMINAL | `#6B6B6B` |
| 25–50 | ELEVATED | `#B5830A` |
| 50–75 | HIGH | `#C1121F` |
| 75–100 | CRITICAL | `#C1121F` + pulse animation |

---

## Impact Physics Calculator ("What If It Hit?")

Displayed in the detail panel for every asteroid. Uses the asteroid's estimated mean diameter and approach velocity.

### Formulas

```js
function computeImpact(diameterM, velocityKms) {
  const DENSITY_KGM3 = 3000; // rocky asteroid assumption
  const r = diameterM / 2;
  const volume = (4 / 3) * Math.PI * Math.pow(r, 3);
  const mass = DENSITY_KGM3 * volume; // kg

  const velocityMs = velocityKms * 1000;
  const kineticEnergyJ = 0.5 * mass * Math.pow(velocityMs, 2);

  // Crater diameter — Collins et al. (2005) scaling law
  const craterDiameterKm = 0.07 * Math.pow(kineticEnergyJ, 0.294) / 1000;

  // Richter equivalent
  const richter = ((2 / 3) * Math.log10(kineticEnergyJ) - 3.2).toFixed(1);

  // Blast radius (Hiroshima-normalized overpressure scaling)
  // 1 Hiroshima ≈ 6.3e13 J, ~20km devastation radius (conservative)
  const hiroshimas = kineticEnergyJ / 6.3e13;
  const blastRadiusKm = 20 * Math.pow(hiroshimas, 1 / 3);

  // Megatons TNT equivalent (1 MT = 4.184e15 J)
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
```

### Display in Detail Panel
- **Energy:** `X megatons TNT (equiv. to X Hiroshima bombs)`
- **Crater:** `X km diameter` with a to-scale circle on a mini city map SVG
- **Seismic:** `Richter X.X equivalent`
- **Blast radius:** A concentric ring diagram (SVG), labeled with km

---

## Size Comparator

Displayed in the detail panel. Animated SVG showing the asteroid diameter against reference objects.

### Reference Objects
| Object | Approx. size |
|--------|-------------|
| School bus | 12 m |
| Boeing 747 | 70 m |
| Football stadium | 300 m |
| Manhattan (width) | 3,000 m |
| Mt. Everest (height) | 8,849 m |

### Behavior
On panel open, SVG renders a horizontal bar chart where each reference object is a labeled hairline bar. The asteroid's size is drawn as a red hairline bar. Bars animate in with a left-to-right wipe (CSS transition, 400ms staggered). If the asteroid is smaller than a bus, that is noted explicitly ("smaller than a school bus").

---

## UI Components

### Persistent: Live Ticker
- Horizontal strip at the very top of the page, above the nav
- Continuously scrolling, CSS animation (`@keyframes ticker-scroll`)
- Each entry: `[ASTEROID NAME] · Ø Xm · CTS XX · Passes in Xd Xh`
- Entries sourced from NeoWs (this week) + first 20 results from SBDB
- High-CTS entries (>50) are colored `#C1121F`

### Nav Tabs
Four hairline-bordered tab labels: `THIS WEEK / FUTURE / IMPACT WATCH / ORBITAL VIEW`  
Active tab: bottom border becomes 2px solid black.

### Detail Panel
- Slides in from the right, 60% viewport width on desktop, full width on mobile
- Header: asteroid name + CTS badge
- Sections (hairline-divided): Approach Data · Threat Breakdown · Size Comparator · What If It Hit?
- Close button top-right: `×` character, no border

### Countdown Timer
- Format: `T− XXd XXh XXm XXs`
- Digits pulse opacity briefly (80ms) on each second tick
- If < 24h: text turns red

---

## Tab 1 — This Week

**API:** NeoWs (7-day window)

**Layout:** Responsive grid of asteroid cards (3 columns desktop, 1 mobile)

**Each card:**
```
[NAME]                        [CTS badge]
Ø ~Xm                         PHO flag (if applicable)
Miss: X.XX LD
Speed: XX.X km/s
T− XXd XXh XXm XXs            [→ details]
```

**Controls (above grid):**
- Sort by: `CTS / Size / Miss Distance / Time` — hairline toggle buttons
- Filter: `Show only hazardous` — checkbox

---

## Tab 2 — Future Approaches

**API:** SBDB (next 365 days, dist-max 0.05 AU)

**Layout:** Sortable table with hairline row borders

**Columns:** `Name · Date · CTS · Miss Dist (LD) · Diameter (m) · Speed (km/s)`

**Controls:**
- Sort on any column header click (asc/desc toggle, indicated by `↑↓`)
- Range filter: miss distance slider (0–20 LD)
- Date range: `next 30d / 90d / 180d / 365d` hairline toggle

---

## Tab 3 — Impact Watch

**API:** Sentry

**Layout:** Ranked list, sorted by CTS descending (your score, not NASA's)

**Each row:**
```
[NAME]   [CTS]   [IP: 1 in X]   [Palermo: X.X]   [Torino: X]   [Diameter: Xm]   [Most likely impact: YYYY]
```

**Note:** Show a callout at the top: *"CTS here incorporates NASA's own impact probability data — asteroids with non-zero Sentry probabilities receive a score multiplier."*

---

## Tab 4 — Orbital View (Stretch Goal)

**Library:** `globe.gl` (CDN)

**Setup:**
- Dark globe with white lat/long grid lines (matches overall fragile aesthetic inverted — this is the one dark surface)
- Earth texture: minimal, desaturated
- Each asteroid: white dot plotted on a ring at altitude proportional to miss distance in LD (1 LD = ~384,400 km, normalize to globe radius scale)
- Hover: dot expands + tooltip with name, CTS, miss distance
- Click: opens detail panel (same as other tabs)
- Camera auto-rotates slowly; user can grab and spin

**Data:** Combine NeoWs + SBDB results; use miss distance to set altitude.

---

## Audio Design

**Implementation:** Web Audio API (no external files required)

**Ambient hum:**
```js
// Low sine wave, ~60Hz, gain 0.03 — barely perceptible
const osc = audioCtx.createOscillator();
osc.frequency.value = 60;
const gain = audioCtx.createGain();
gain.gain.value = 0.03;
osc.connect(gain); gain.connect(audioCtx.destination);
osc.start();
```

**Alert ping** (fires when any asteroid with CTS > 50 loads into view):
```js
// Short descending two-tone ping
// Tone 1: 880Hz for 80ms, Tone 2: 660Hz for 120ms, slight reverb via convolver
```

**Mute toggle:** Small `♪` / `×` icon, bottom-right corner, persisted to `localStorage`.

---

## Deployment

- Repo: GitHub Pages, single branch `main`
- No build step — pure HTML/CSS/JS
- API key: `DEMO_KEY` (NASA's public key, rate-limited but sufficient for demo)
- `README.md` includes: project description, APIs used, CTS formula explanation, physics citations (Collins et al. 2005)

---

## Physics References

- Collins, G.S., Melosh, H.J., Marcus, R.A. (2005). *Earth Impact Effects Program.* Meteoritics & Planetary Science. — crater scaling law source
- Kinetic energy: classical mechanics (½mv²)
- Richter energy relation: USGS formula (2/3 × log₁₀E − 3.2)
- Blast radius: normalized from Glasstone & Dolan (1977), *The Effects of Nuclear Weapons*, adapted for asteroid impact yields

---

*Hand this spec to Claude Code. It should produce a working implementation in one pass.*

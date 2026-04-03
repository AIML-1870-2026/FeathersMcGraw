# Drug Safety Explorer — spec.md
### AIML 1870 | Code Quest | University of Nebraska Omaha

---

## 1. Project Overview

**Drug Safety Explorer** is an interactive, single-page web application that lets users build a personal medication list and receive a real-time safety analysis powered by live data from the OpenFDA public API. It targets patients, caregivers, students, and clinicians who want to understand adverse event patterns, recall history, and polypharmacy risk for a given combination of drugs.

The app addresses a real public health problem: over 1.5 million U.S. ER visits per year involve adverse drug events, and no free consumer tool makes FDA safety data accessible and interpretable in one place.

---

## 2. Aesthetic Direction

**Modern SaaS — Refined Utility**

Inspired by Linear, Notion, and Vercel dashboards. The defining quality is *purposeful restraint*: clean whitespace, tight typography, and surgical use of color. Nothing decorative that doesn't carry information. Every element earns its place.

### Typography
- **Display / headings:** `Sora` (Google Fonts) — geometric, medical-adjacent, memorable
- **Body / data:** `DM Mono` (Google Fonts) — signals precision and data literacy; used for drug names, scores, numbers
- **UI labels:** `Sora` at small sizes, tracked out

### Color Palette (CSS variables)
```css
--bg:         #0f1117;   /* near-black, deep */
--surface:    #16181f;   /* card backgrounds */
--surface-2:  #1e2029;   /* elevated panels */
--border:     #2a2d3a;   /* subtle dividers */
--text:        #e8eaf0;  /* primary text */
--text-muted:  #6b7080;  /* labels, metadata */
--accent:      #4f8ef7;  /* primary blue — interactions, CTAs */
--accent-soft: #1a2d52;  /* accent background wash */
--risk-low:    #22c55e;  /* green */
--risk-med:    #f59e0b;  /* amber */
--risk-high:   #ef4444;  /* red */
--risk-crit:   #dc2626;  /* deep red with glow */
```

### Visual Details
- Subtle `1px` borders on all cards, no drop shadows except for modals
- Hover states: border-color brightens + background lightens by one step
- Risk score gauge uses an SVG arc with color interpolation across the risk spectrum
- Smooth `200ms ease` transitions on all interactive state changes
- Drug class overlap shown as a small matrix grid (colored cells)
- Scrollbar styled to match the dark theme

---

## 3. Application Architecture

### Single-Page Layout — Three-Panel Design
```
┌────────────────────────────────────────────────────────────┐
│  HEADER: Drug Safety Explorer   [?] About  [!] Disclaimer  │
├─────────────┬──────────────────────┬───────────────────────┤
│  LEFT PANEL │    CENTER PANEL      │    RIGHT PANEL        │
│             │                      │                       │
│  Drug Class │  Polypharmacy Panel  │  Risk Analysis        │
│  Explorer   │  (Medication List)   │  Dashboard            │
│             │                      │                       │
│  Curated    │  - Search + Add drug │  - Risk Score Gauge   │
│  classes +  │  - Drug cards        │  - Factor breakdown   │
│  class      │  - Remove / clear    │  - Class overlap grid │
│  search     │  - Up to 8 drugs     │  - Recall alerts      │
│             │  - Analyze button    │  - Event timeline     │
└─────────────┴──────────────────────┴───────────────────────┘
```

On mobile: stacks vertically (Left → Center → Right).

---

## 4. OpenFDA API Integration

**Base URL:** `https://api.fda.gov`

No API key required for rates under 1,000 requests/day. All calls are client-side `fetch()`.

### Endpoints Used

| Endpoint | Purpose |
|---|---|
| `GET /drug/event.json` | Adverse event reports — volume + outcome severity |
| `GET /drug/enforcement.json` | Recall history — class and status |
| `GET /drug/label.json` | Drug labeling — drug class, indications, warnings |

### Key Query Patterns

```js
// Adverse event count for a drug (brand or generic)
/drug/event.json?search=patient.drug.medicinalproduct:"DRUGNAME"&count=patient.reaction.reactionmeddrapt.exact&limit=10

// Serious outcomes (death/hospitalization) count
/drug/event.json?search=patient.drug.medicinalproduct:"DRUGNAME"+AND+serious:1&limit=1

// Recalls for a drug
/drug/enforcement.json?search=product_description:"DRUGNAME"&limit=5

// Drug label (class info)
/drug/label.json?search=openfda.brand_name:"DRUGNAME"&limit=1
```

### Error Handling
- 404 from OpenFDA (no results) → show "No FDA records found" badge on drug card, treat as 0 for scoring
- Network failure → toast notification, graceful degradation (score still calculated from available data)
- Rate limiting → exponential backoff with visual spinner

---

## 5. Polypharmacy Panel (Center)

The core interaction. Users build their personal medication list here.

### Drug Search
- Typeahead input with debounce (300ms)
- Searches OpenFDA label endpoint for matching brand/generic names as user types
- Dropdown shows up to 6 suggestions with drug class label (pulled from label data)
- Selecting adds drug as a card to the panel

### Drug Card (per added drug)
Each card shows:
- Drug name (brand + generic if available)
- Drug class badge (e.g., "SSRI", "NSAID")
- Status chips: `Adverse Events Found` | `Active Recall` | `Clean`
- `×` remove button

### Analyze Button
- Triggers parallel `Promise.all()` fetch of all three endpoints for all drugs in the panel
- Loading state: each drug card shows a subtle shimmer skeleton on its status chips
- Results populate Right Panel

### Constraints
- Maximum 8 drugs in panel
- Minimum 1 drug to analyze
- Duplicate drug names rejected with a toast

---

## 6. Drug Class Explorer (Left Panel)

Helps users explore by pharmacological category instead of individual drug name.

### Curated Class List (clickable)
Displayed as a vertical list of pill-shaped tags:

| Class | Example Drugs |
|---|---|
| SSRIs | Fluoxetine, Sertraline, Escitalopram |
| NSAIDs | Ibuprofen, Naproxen, Ketorolac |
| Beta Blockers | Metoprolol, Atenolol, Carvedilol |
| ACE Inhibitors | Lisinopril, Enalapril, Ramipril |
| Statins | Atorvastatin, Rosuvastatin |
| Benzodiazepines | Lorazepam, Diazepam, Clonazepam |
| Opioids | Oxycodone, Hydrocodone, Morphine |
| Anticoagulants | Warfarin, Apixaban, Rivaroxaban |
| Proton Pump Inhibitors | Omeprazole, Pantoprazole |
| Antipsychotics | Quetiapine, Risperidone, Haloperidol |

### Class Search
- Freeform input: "Search a drug class..."
- Queries OpenFDA label endpoint: `/drug/label.json?search=pharm_class_epc:"CLASSNAME"&limit=20`
- Results shown as a mini card grid below the curated list

### Class → Panel
- Clicking a class from curated list OR a drug from class search results → opens a small modal showing all drugs in that class
- Each drug in modal has an "+ Add to Panel" button
- This fulfills the "explore entire drug classes" stretch goal

---

## 7. Interaction Risk Score (Right Panel)

A **composite 0–100 score** calculated client-side from four factors after fetching FDA data.

### Formula

```
Risk Score = AE_Volume_Score + Severity_Score + Recall_Score + ClassOverlap_Score
```

| Factor | Max Points | Calculation |
|---|---|---|
| **AE Volume** | 35 pts | `min(totalEventCount / 50000, 1) × 35` — normalized against a high-volume reference |
| **Severity** | 30 pts | `(seriousCount / totalCount) × 30` — fraction of reports flagged as serious (outcome: death, hospitalization, life-threatening) |
| **Recall History** | 20 pts | Class I recall = 20, Class II = 12, Class III = 6, None = 0; takes **max** across all drugs in panel |
| **Drug Class Overlap** | 15 pts | +5 per overlapping pair within a CNS-depressant cluster (Opioids + Benzos + Antipsychotics), +3 per pair in other same-class matches |

### Risk Tiers

| Score | Label | Color |
|---|---|---|
| 0–24 | Low Risk | `--risk-low` green |
| 25–49 | Moderate | `--risk-med` amber |
| 50–74 | High | `--risk-high` red |
| 75–100 | Critical | `--risk-crit` deep red + pulse glow |

### Visual Components

1. **SVG Arc Gauge** — animated sweep from 0 to score, color interpolated across the tier gradient
2. **Factor Breakdown Cards** — four small cards, one per factor, each showing its raw value and contribution points
3. **Drug Class Overlap Matrix** — N×N grid (one cell per drug pair), colored by overlap severity (gray = no overlap, amber = same class, red = high-risk CNS pairing)
4. **Recall Alert Banner** — conditionally rendered; lists any active recalls with recall class badge and product description
5. **Top Adverse Events Chart** — horizontal bar chart (vanilla JS + `<canvas>` or pure CSS bars) showing the top 10 reported reactions across all drugs in the panel combined

---

## 8. Education Popups

Small modal dialogs triggered by `[?]` info icons placed contextually throughout the UI.

### Popup 1 — "What are Adverse Events?"
**Trigger:** `[?]` icon next to "Adverse Events" header in Right Panel

**Content:**
> An adverse event report is a record submitted to the FDA when a patient, caregiver, or healthcare provider suspects that a drug contributed to a harmful outcome. The FDA's MedWatch system collects these reports voluntarily and from manufacturers.
>
> **Important:** Adverse event reports indicate an *association*, not proven causation. High report counts may reflect widespread drug use, active surveillance campaigns, or heightened public awareness — not necessarily higher danger.

### Popup 2 — "What is a Drug Recall?"
**Trigger:** `[?]` icon next to "Recall History" in the Right Panel

**Content:**
> Drug recalls are classified by the FDA into three classes based on health hazard severity:
>
> - **Class I** — Serious adverse health consequences or death are probable.
> - **Class II** — Temporary or medically reversible adverse consequences are probable.
> - **Class III** — The product is unlikely to cause adverse health consequences, but violates FDA regulations.
>
> Not all recalls mean a drug is currently dangerous — many are precautionary.

### Popup Design
- Centered modal with `backdrop-filter: blur(4px)` overlay
- Max width `480px`, padding `32px`
- Close via `×` button or clicking outside
- Smooth fade + scale-up entry animation

---

## 9. Disclaimer & Attribution

### Persistent Footer
```
⚕ Educational use only. Data sourced from the OpenFDA API (open.fda.gov).
This tool does not constitute medical advice. Always consult a licensed healthcare provider.
openFDA data is provided by the U.S. Food & Drug Administration.
```

### Modal on First Load
A dismissible disclaimer modal appears on first visit (localStorage flag):
- Title: "Before You Begin"
- Brief explanation of educational purpose
- FDA attribution
- "I Understand" button to dismiss

---

## 10. File Structure

```
drug-safety-explorer/
├── index.html
├── style.css
├── app.js
├── data/
│   └── drug-classes.js     # Curated class → drug name mapping
└── README.md
```

Single-file approach acceptable; prefer split for maintainability with Claude Code.

---

## 11. Technical Constraints

- **Vanilla HTML/CSS/JS only** — no frameworks, no build tools
- **GitHub Pages deployment** — all paths must be relative
- **No API key** — OpenFDA free tier only
- **No backend** — all data fetching is client-side
- **Google Fonts** — loaded via `<link>` in `<head>`
- **Canvas API** — for the adverse events bar chart
- **No external chart libraries** — keep bundle zero-dependency

---

## 12. Stretch Goal Checklist

- [x] Drug class explorer with curated list + custom search
- [x] Education popups (adverse events, recall classes)
- [x] Interaction Risk Score with composite formula
- [ ] *(Optional bonus)* Shareable URL that encodes current medication list as query params
- [ ] *(Optional bonus)* Adverse event trend timeline (year-by-year bar chart per drug)

---

## 13. Deployment

1. Push repo to GitHub
2. Enable GitHub Pages from `main` branch root
3. Submit live URL + GitHub repo link to Canvas

---

*Spec authored collaboratively with Claude (Anthropic) as part of the AIML 1870 design-first workflow.*

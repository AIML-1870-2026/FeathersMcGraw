# Blackjack AI Agent — spec.md

## Project Overview

A static single-page Blackjack application where an OpenAI-powered AI agent reads the game state, recommends actions, and executes them. The player interacts with a central game panel flanked by an Analytics tab on the left and a Strategy tab on the right. No backend. No storage. API key loaded in-memory only via `.env` file upload.

---

## Reference Implementation

The `temp/` folder contains working examples from previous assignments. Use it as a reference for:
- How to parse a `.env` file for the API key (in-memory only)
- General fetch() call structure and error handling patterns

**Critical difference from previous assignments:** This project uses the **OpenAI API**, not Anthropic. The endpoint, headers, and response shape are different. Do not copy the API call itself from `temp/` — only use the `.env` parsing and structural patterns.

OpenAI endpoint: `https://api.openai.com/v1/chat/completions`
Auth header: `Authorization: Bearer <API_KEY>`
Do NOT include the `temp/` folder in the final build or deployment.

---

## Tech Stack

- Vanilla HTML, CSS, JavaScript — fully static
- No frameworks, no build step
- Deployed to GitHub Pages
- Single `index.html` file (CSS and JS can be in separate files if cleaner)

---

## Aesthetic Direction

**Sleek white sketchpad.** Think architectural drafting table — clean, sparse, precise.

- **Background:** Pure white (`#FFFFFF`) or very slightly warm off-white (`#FAFAF8`)
- **Typography:** A thin, geometric sans-serif for headings (e.g., `Outfit` or `DM Sans` at light weight). Monospace for data readouts (e.g., `JetBrains Mono` or `IBM Plex Mono`).
- **Color palette:**
  - Base: white / `#F5F5F3`
  - Ink: `#1A1A1A` for text
  - Accent: a single muted accent — something like `#2D6BE4` (cool blue) or `#1A1A1A` used sparingly
  - Red suit color: `#C0392B` (muted, not garish)
  - Borders: thin `1px` lines, `#E0E0E0`
- **Cards:** White with thin black border, minimal suit symbols. Clean typographic card faces — no clip art.
- **Spacing:** Generous. Nothing cramped. Let whitespace breathe.
- **Micro-interactions:** Subtle fade-ins when cards are dealt. Smooth tab transitions. No heavy animations.
- **No gradients, no drop shadows heavier than `0 1px 4px rgba(0,0,0,0.06)`**

---

## Layout — Three-Panel Design

```
┌─────────────────────────────────────────────────────────────┐
│                        Header bar                           │
│          [Model Selector]     [.env Upload]    [Balance]    │
├───────────────┬─────────────────────────┬───────────────────┤
│               │                         │                   │
│  ANALYTICS    │       GAME (center)     │    STRATEGY       │
│  (left tab)   │                         │   (right tab)     │
│               │   Dealer hand           │                   │
│  Bankroll     │   ─────────────         │  Decision matrix  │
│  graph        │   Player hand           │  Risk slider      │
│               │   ─────────────         │  Explainability   │
│  Win/loss     │   Bet input             │  toggle           │
│  stats        │   [ Hit ] [ Stand ]     │                   │
│               │   [Get AI Rec]          │  Current rec      │
│  Decision     │   [Execute Rec]         │  reasoning        │
│  quality      │                         │                   │
│               │   AI Analysis panel     │                   │
└───────────────┴─────────────────────────┴───────────────────┘
```

- The center game panel is **always visible** — it never collapses or tabs away.
- Left and right panels are collapsible on narrower screens but open by default on desktop.
- Panels separated by thin `1px` dividers.

---

## Core Game Logic

### Deck
- Standard 52-card deck. Shuffle at start of each shoe (or when deck runs low — reshuffle at < 15 cards remaining).
- Card values: number cards = face value, J/Q/K = 10, Ace = 1 or 11 (soft/hard hand logic required).

### Hand Scoring
- Correctly handle soft aces — if hand > 21 and contains an ace counted as 11, recount it as 1.
- Display current hand total on screen at all times.
- Detect: Blackjack (21 on initial deal), Bust (> 21), Push (tie with dealer).

### Dealer Rules
- Dealer hits on soft 16 or less, stands on hard 17+.
- Dealer hand is revealed only after player stands or busts.

### Game Flow
1. Player sets bet amount (input, validated against current balance).
2. Deal: player gets 2 cards face up, dealer gets 1 face up / 1 face down.
3. Player clicks **Get AI Recommendation** — triggers LLM call.
4. AI Analysis panel populates with reasoning + recommended action.
5. Player clicks **Execute Recommendation** — game takes the action.
6. Alternatively player can manually Hit or Stand at any time.
7. After hand ends: balance updated, analytics updated, new hand can begin.

### Balance
- Starting balance: **$1,000**
- Win: balance + bet
- Loss: balance - bet
- Push: no change
- Blackjack: balance + (bet × 1.5)
- Prevent bet > current balance

---

## API Integration — OpenAI

### Setup
- User uploads a `.env` file containing `OPENAI_API_KEY=sk-...`
- Key is parsed in-memory only. Never logged, stored, or sent anywhere except the OpenAI endpoint.
- Show a small status indicator: "Key loaded ✓" after successful parse.

### Model Selector
Dropdown in the header. Options:
- `gpt-4o`
- `gpt-4o-mini`
- `gpt-4-turbo`
- `o1-mini`

Default: `gpt-4o-mini` (fast, cheap, good for testing).

### The LLM Call

Send a structured prompt that returns **JSON only** — no prose wrapping.

**System prompt:**
```
You are a Blackjack strategy expert. You will be given the current game state and must respond with a JSON object only — no prose, no markdown, no explanation outside the JSON fields.

Respond with exactly this shape:
{
  "action": "hit" | "stand",
  "confidence": 0.0–1.0,
  "brief_reason": "one sentence",
  "full_analysis": "2–3 sentences of statistical reasoning",
  "basic_strategy_agrees": true | false
}
```

**User message:**
```
Player hand: [cards], total: [X] ([soft/hard])
Dealer up card: [card]
Deck composition note: [remaining high/low card ratio if tracked, otherwise omit]
Risk profile: [conservative | balanced | aggressive] based on slider position
```

### Parsing the Response
- Parse `response.choices[0].message.content` as JSON.
- Extract `action` field directly — no keyword scanning.
- If JSON parse fails: log error to console, show user-facing error in AI Analysis panel, do not crash.
- Log full raw response to console for debugging.

### Console Logging
Log the following to console on every LLM call:
```
[BLACKJACK AGENT] --- New LLM Call ---
Model: gpt-4o-mini
Game state: { playerHand, dealerUpCard, playerTotal, riskProfile }
Raw response: <full response text>
Parsed action: hit | stand
Confidence: 0.87
```

---

## Stretch Goals — All 4 Required

### 1. Strategy Visualization (Right Panel)
- Display a condensed **Basic Strategy decision matrix** — rows = player total (8–21), columns = dealer up card (2–A).
- Highlight the cell corresponding to the current hand in real time.
- Color code: green = stand, blue = hit, yellow = double (display only, no double mechanic needed).
- Small legend beneath the matrix.

### 2. Performance Analytics (Left Panel)
- **Bankroll graph:** Line chart showing balance after each hand. Updates live after every hand resolves. Use a lightweight canvas-based chart (no Chart.js dependency — draw it manually with `<canvas>` or use a CDN-loaded Chart.js).
- **Stats row:**
  - Hands played
  - Win rate (%)
  - Current streak (W/L/P)
  - Biggest win / biggest loss
- **Decision quality tracker:** After each hand, compare what the AI recommended vs. what basic strategy says. Track "correct" AI decisions as a percentage over time.

### 3. Explainability Controls (Right Panel, below matrix)
Three toggle levels — radio buttons or a segmented control:
- **Brief:** Show only `brief_reason` from LLM response
- **Standard:** Show `full_analysis`
- **Deep:** Show full analysis + confidence score + whether AI agrees with basic strategy + the highlighted matrix cell explanation

The AI Analysis panel in the center game area renders according to the selected level.

### 4. Risk Tolerance Slider (Right Panel)
- Horizontal slider: **Conservative ←→ Aggressive**
- Three stops internally: `conservative`, `balanced`, `aggressive`
- Label displayed below slider updates as user drags.
- This value is passed to the LLM in the user message so it can factor in the player's risk appetite.
- Conservative: agent biases toward standing, avoiding busts.
- Aggressive: agent is more willing to hit on borderline totals.
- Visual note beneath slider: "Currently: [label] — AI will [behavior description]"

---

## File Structure

```
/
├── index.html
├── style.css
├── game.js          # Deck, hand scoring, game state machine
├── agent.js         # LLM call, prompt construction, JSON parsing
├── analytics.js     # Stats tracking, chart rendering
├── strategy.js      # Basic strategy matrix data + highlighting
├── temp/            # Reference implementations (DO NOT DEPLOY)
│   └── ...
└── .gitignore       # Include: .env, temp/
```

---

## Error Handling

- Invalid or missing API key: clear message in AI Analysis panel. Do not crash.
- Network failure: retry once, then surface error.
- Malformed JSON from LLM: log raw response, show "Could not parse recommendation. Please try again."
- Bet > balance: disable deal button, show inline validation message.
- Deck empty mid-hand: reshuffle remaining cards before continuing.

---

## Deployment

- GitHub Pages
- No `.env` file committed — it is user-uploaded at runtime
- `temp/` excluded via `.gitignore`
- No build step — direct file serving

---

## Out of Scope

- Splitting pairs
- Doubling down (display in matrix only)
- Insurance
- Multi-player
- Persistent storage of any kind

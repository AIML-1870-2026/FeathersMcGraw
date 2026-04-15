# Science Experiment Generator — spec.md

## Project Overview

A single-page web app that generates grade-appropriate science experiments using AI. The user selects a grade level and adds their available supplies as interactive tags. The app calls OpenAI and renders the experiment as formatted HTML below the input form.

Deployed as a static `index.html` via GitHub Pages. No backend. No build step.

---

## Reference Implementation

The `temp/` folder contains my complete LLM Switchboard project (HTML, CSS, and JS files). This is NOT part of the current project — do not include it in the final build or deployment.

Use it as a reference for:
- How to parse a `.env` file for API keys (in-memory only, never stored or logged)
- The `fetch()` call structure for OpenAI's chat completions API
- Error handling patterns for failed API requests
- General structure of a single-page LLM tool

Ignore these Switchboard features:
- Anthropic integration — this project is OpenAI-only
- Model selection dropdown and provider switching
- Structured output / JSON schema handling

This project uses unstructured (free-form) responses only. Render the model's markdown output as formatted HTML.

---

## Tech Stack

- Vanilla HTML + CSS + JS (no frameworks)
- Single file: `index.html`
- OpenAI Chat Completions API — model: `gpt-4o-mini` (hardcoded)
- `marked.js` via CDN for markdown → HTML rendering
- `.env` file for API key — loaded in-memory only, same pattern as Switchboard

---

## Visual Design — Lab Notebook Theme

The entire app should feel like a scientist's lab notebook. This is the core aesthetic direction — commit to it fully.

### Background
- Subtle graph paper pattern as the page background (CSS only — repeating grid lines using `background-image: linear-gradient(...)` in a light blue-gray on white). No images needed.

### Typography
- Headings: a handwritten or slightly imperfect font — use `"Caveat"` from Google Fonts for headings and labels
- Body/output text: a clean readable font like `"Inter"` or system font stack for readability
- The contrast between handwritten headings and clean body text is intentional and important

### App Container
- Centered card, max-width ~720px
- Off-white or very light cream background (`#fafaf7`) to look like notebook paper
- Subtle drop shadow, slightly rounded corners
- A thin ruled line at the very top of the card (like the red margin line in a notebook)

### Header
- App title: **"Science Experiment Generator"** in Caveat, large, dark ink color
- Subtitle in smaller Caveat: *"Enter your grade level and supplies. Let's do science."*
- A small decorative element — a simple SVG beaker or flask icon inline with the title (keep it minimal, not cartoonish)

### Input Section
Label each input like a notebook field — e.g., a handwritten-style label that says "Grade Level:" with a short underline beneath it, mimicking a fill-in-the-blank form.

### Output Section
When the result appears, render it inside a "lined paper" styled div:
- Horizontal rules behind the text (CSS `repeating-linear-gradient` to fake ruled lines)
- Left red margin line (like a real notebook page)
- Slight inset shadow
- The experiment content sits on top of the lines naturally

This output area should feel like the experiment was written directly into the notebook.

---

## UI Layout

### Header
- Title + subtitle + flask icon (described above)

### Input Panel

**1. Grade Level**
A styled `<select>` dropdown. Options:
- K–2 (Kindergarten–2nd Grade)
- 3–5 (3rd–5th Grade)
- 6–8 (6th–8th Grade)
- 9–12 (9th–12th Grade)

**2. Available Supplies — Tag/Chip Input**
Do NOT use a plain textarea. Instead, build an interactive chip input:
- A text input field where the user types a supply and hits Enter (or clicks an Add button) to add it
- Each supply appears as a removable chip/tag below the input
- Chips have an × button to remove them
- Placeholder text in the input: `"Type a supply and press Enter..."`
- Style chips to look like little sticky notes or label stickers — warm yellow background, rounded, small

**3. Generate Button**
- Label: "Run Experiment →"
- Full width, styled with a dark ink color (navy or near-black)
- Hover state: slight lift (transform: translateY(-1px)) + shadow
- Disabled state while request is in flight — text changes to "Generating..."

### Output Panel
- Appears below the input panel after response is received
- Rendered inside the lined-paper styled div (described in Visual Design)
- Fades in smoothly on appearance (`opacity` transition)
- On error: displays a clear inline message in red ink style — no `alert()` calls
- While loading: show a subtle animated placeholder (three dots or a pulsing line) inside the output area

---

## API Behavior

### Model
`gpt-4o-mini` — hardcoded, no selector.

### System Prompt
```
You are a science education assistant helping K-12 students and teachers. Generate safe, hands-on science experiments using only the supplies provided.

Always format your response in markdown with these exact sections:
## Experiment Title
## The Big Idea
(One sentence: what scientific concept does this explore?)
## What You'll Need
(Only use supplies from the provided list)
## Instructions
(Numbered steps, clear and age-appropriate)
## What's Actually Happening
(The science behind it — explained for the grade level)
## Think About It
(2–3 discussion questions appropriate for the grade level)

Keep it safe. Keep it fun. Match the complexity to the grade level.
```

### User Message
```
Grade Level: {selected grade label}
Available Supplies: {comma-separated list of chips}

Generate a science experiment.
```

### Request Parameters
- `model`: `gpt-4o-mini`
- `max_tokens`: 1000
- `temperature`: 0.8
- `stream`: false

---

## API Key Handling

- Same `.env` parsing pattern as the Switchboard — in-memory only
- Key never written to DOM, localStorage, or logs
- If key is missing or invalid: show a friendly inline error in the output area

---

## Error Handling

Handle and display user-friendly inline messages for:
- No supplies added (at least one chip required before generating)
- API key not found
- Non-200 response from OpenAI
- Network failure

Style errors like a red handwritten note — fits the notebook theme.

---

## File Structure

```
/
├── index.html        ← entire app (inline CSS + JS)
├── .env              ← OPENAI_API_KEY=sk-...  (gitignored)
├── .gitignore        ← must include .env
└── temp/             ← Switchboard reference only, not deployed
```

---

## Deployment

GitHub Pages — `index.html` must be fully self-contained. All CSS and JS inline or from CDN. No build step, no server.

---

## Out of Scope

- Multiple simultaneous experiments
- Save / export / print
- User accounts or history
- Any model other than `gpt-4o-mini`
- Any provider other than OpenAI
- Dark mode

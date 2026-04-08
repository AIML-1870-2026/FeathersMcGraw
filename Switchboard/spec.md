# LLM Switchboard — spec.md
**AIML 1870 · Quest 08**

---

## Overview

A single-page web app that lets users interact with the OpenAI API directly from the browser.
Users can input an API key, select a model, write a prompt, and toggle between unstructured (free-text) and structured (JSON schema) output modes.

Deployed to GitHub Pages. No build step. Vanilla JS only.

---

## Aesthetic

**Theme:** White / sketchbook-technical hybrid.

- Background: faint graph-paper grid (CSS `background-image` linear-gradient, ~28px cells, very low opacity border lines)
- All borders: `0.5px solid` — hairline only
- Corner radius: `2px` maximum — sharp, drafting-tool feel
- Typography: monospace throughout (`font-family: monospace` or `'Courier New'`)
- Colors: near-black text on white. No color accents except for the send button (inverted: white text on black bg)
- No shadows. No gradients. No animation except a blinking cursor on the output area during streaming.
- Status bar below output showing token count, latency, mode, and model

---

## Layout

Two-column grid. Max-width 900px, centered.

### Left column (260px fixed)
1. **Config panel**
   - API key input (password type, masked)
   - Model selector dropdown
   - "Structured output" toggle (on/off)
   - "Stream response" toggle (on/off — stretch goal, can be wired later)

2. **Example prompts panel**
   - Four preset prompt buttons
   - Clicking one populates the prompt textarea and loads the appropriate schema template
   - Presets:
     - "Summarize a news article"
     - "Extract entities from text"
     - "Classify sentiment"
     - "Generate product data"

### Right column (flex, fills remaining width)
1. **Prompt textarea** — user types or pastes their prompt here
2. **JSON Schema textarea** — visible only when structured mode is ON; pre-filled when an example is loaded; dashed border to distinguish from prompt
3. **Send row** — schema template dropdown on left, SEND button on right
4. **Response panel** — displays raw text or formatted JSON; status bar below showing `tokens / latency / mode / model`

---

## Functionality

### API key handling
- Input masked with `type="password"`
- Stored only in JS memory (a variable). Never persisted to localStorage.
- Show a small inline warning if key field is empty when SEND is clicked

### Model selector
Options:
- `gpt-4o`
- `gpt-4o-mini`
- `gpt-3.5-turbo`

### Unstructured mode
- Calls `POST https://api.openai.com/v1/chat/completions`
- Body: `{ model, messages: [{ role: "user", content: prompt }] }`
- Displays `choices[0].message.content` as plain text in response panel

### Structured mode
- Same endpoint but adds `response_format: { type: "json_object" }` to the body
- Includes a system message: `"Respond only with valid JSON matching the provided schema."`
- Appends the schema to the user prompt: `"Schema: <schema_text>\n\nPrompt: <user_prompt>"`
- Parses and pretty-prints the JSON in the response panel with 2-space indent

### Schema templates (dropdown)
Four options mapped to the four example prompts:
1. **Entity extraction** — `{ entities: [{ name, type }] }`
2. **Sentiment analysis** — `{ sentiment: string, confidence: number, reasoning: string }`
3. **Product catalog** — `{ products: [{ name, price, category, in_stock }] }`
4. **News summary** — `{ headline, summary, key_points: [], source }`

### Status bar
After each response, populate:
- `tokens` — `usage.total_tokens` from response
- `latency` — time from send to response in ms, formatted as `1.2s`
- `mode` — `"structured"` or `"unstructured"`
- `model` — model name used

### Error handling
- If the API call fails, display the error message in the response panel in a muted style
- If JSON parsing fails in structured mode, display the raw text with a note: `[parse error — raw output shown]`

---

## File structure

```
/
├── index.html
├── style.css
└── app.js
```

No frameworks. No npm. No bundler.

---

## Stretch goals (if time allows)

- Side-by-side model comparison: run the same prompt on two models simultaneously, display results in split panes
- Response metrics over session: track average latency and token usage across multiple sends
- Copy-to-clipboard button on the response panel
- Syntax highlighting on JSON output (can use a lightweight lib like `highlight.js` via CDN)
- Dark mode toggle (inverts the grid and surface colors)

---

## Deployment

1. Push to a GitHub repo
2. Enable GitHub Pages from the `main` branch root
3. Submit live URL to Canvas

---

## Notes for Claude Code

- Keep all logic in `app.js`. No modules (GitHub Pages serves flat files).
- The grid background should be done in CSS only — no canvas, no JS.
- The toggle switches should be CSS-only where possible; JS only for state.
- Dashed border on the schema textarea to visually distinguish it from the prompt.
- The send button should be the only element with a filled/inverted background.
- Structured mode textarea and schema dropdown should show/hide based on toggle state.
- On mobile (< 600px), stack the two columns vertically.

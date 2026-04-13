# BRIGHTSIDE — Product Review Transformer
## Claude Code Spec Document

---

## Project Overview

Build a single `index.html` web app called **Brightside** that transforms user input (feelings, rants, love letters, or pre-written reviews) into either a glowingly positive review or a scathing negative one — depending on where a master slider is set.

The slider controls everything: the app's name, the aesthetic, the color palette, the UI personality, and the AI's tone. One end is sunshine and rainbows. The other end is hellfire.

Deploy target: **GitHub Pages** (single `index.html`, no build step, no backend).

---

## Reference Implementation

> **IMPORTANT:** Before writing any API call logic, key-loading logic, or error handling, read the code in the `temp/` folder. That is the student's prior "LLM Switchboard" project. Use it as a direct reference for:
> - How to load `.env` API keys from a local file via a file input or fetch
> - How to structure OpenAI API calls (endpoint, headers, body format)
> - How to handle streaming vs. non-streaming responses
> - General error handling patterns
>
> Mirror those patterns in this project. Do not invent new approaches when a working reference exists.

---

## API Configuration

- **Provider:** OpenAI only. No Anthropic API (CORS issues on GitHub Pages).
- **Key loading:** Load from a `.env` file the user selects at runtime, or via a text input field. Store the key in memory only — never log it, never store it in localStorage.
- **Model selector:** Dropdown allowing user to pick from available OpenAI models. Suggested defaults: `gpt-4o`, `gpt-4o-mini`, `gpt-3.5-turbo`.
- **Response format:** Unstructured free-form text. No JSON schema required.
- **Markdown rendering:** Parse and render the AI's markdown output as formatted HTML. Use a CDN-loaded library (e.g. `marked.js` from cdnjs.cloudflare.com).

---

## The Master Slider — Core Mechanic

This is the centerpiece of the entire app. A wide, dramatic slider that runs from left (Brightside) to right (Darkside), with a gradient neutral zone in the middle.

### Slider States

| Position | Mode | Name Displayed |
|---|---|---|
| Far left | Full Brightside | "Brightside ☀️" |
| Center-left | Optimistic | "Looking Up" |
| Center | Neutral / Purgatory | "Meh." |
| Center-right | Pessimistic | "Cloudy" |
| Far right | Full Darkside | "Darkside 🔥" |

The slider should feel continuous — not just two modes with a binary toggle. Every CSS variable, color, and UI element should respond proportionally to slider position.

---

## Dual Aesthetic System

Both themes should be **over the top**. Do not be subtle.

### Brightside (Left End)

- **Colors:** Saturated yellows, hot pinks, sky blues, lime greens. White backgrounds. Pastel accents.
- **Typography:** Rounded, bubbly fonts. Consider Google Fonts: `Fredoka One`, `Baloo 2`, or `Nunito`.
- **Decorative elements:** Animated floating emoji (☀️ 🌈 ✨ 🧚 🌸 🦋), CSS sparkle effects, rainbow gradient borders, sun rays, cloud shapes.
- **Animations:** Bouncy, springy. Buttons wobble on hover. Cards float gently. Rainbows pulse.
- **Vibe:** A five-year-old designed a Vitamix ad at 2am on a sugar high.

### Darkside (Right End)

- **Colors:** Deep reds, charcoal blacks, ash grays, sulfur yellows, ember oranges. Dark backgrounds.
- **Typography:** Jagged or gothic-adjacent fonts. Consider: `Cinzel`, `Metal Mania`, or `UnifrakturMaguntia` (Google Fonts).
- **Decorative elements:** Animated flames (CSS or SVG), floating skull/fire emoji (🔥 💀 😈 ⛧), cracked textures, hellfire borders, ember particle effects.
- **Animations:** Flickering, pulsing, unstable. Buttons crack on hover. Text glitches slightly.
- **Vibe:** Satan wrote a Yelp review.

### Neutral Zone (Center)

- **Colors:** Desaturated grays, muted whites, flat UI.
- **Typography:** Default system sans-serif, no personality.
- **Decorative elements:** None. Bleak.
- **Vibe:** A government form.

---

## UI Layout

### Header

- App name displayed dynamically based on slider position.
- Subtitle line that also shifts tone. Examples:
  - Brightside: *"We find the silver lining in literally everything ✨"*
  - Neutral: *"We generate product reviews."*
  - Darkside: *"We expose the truth. The horrible, horrible truth. 🔥"*

### The Slider Section

- Visually large and prominent. This is the hero element.
- Label on left: Brightside branding. Label on right: Darkside branding.
- Track should display a gradient that transitions across the full spectrum.
- Thumb/handle should change style based on position (sunny emoji vs flame emoji).
- Current mode label displayed below the slider, updating in real time.

### Input Section

- **Product name field:** Text input. Placeholder text should match current vibe.
  - Brightside: *"What wonderful product are we celebrating today?"*
  - Darkside: *"Name your victim."*
- **Review / Feelings input:** Large textarea. Freeform. Placeholder examples:
  - Brightside: *"Tell us anything — a feeling, a complaint, a half-formed thought. We'll make it beautiful."*
  - Darkside: *"Paste your glowing review. We'll fix it."*
- Note: Both fields are optional-ish. The AI should handle any combination gracefully.

### Controls Row

- **Model selector:** Dropdown. Styled to match current theme.
- **Tone selector:** Dropdown or button group. Options should be thematic.
  - Brightside tones: `Wholesome`, `Enthusiastic`, `Unhinged Happy`, `Corporate Cheerful`
  - Darkside tones: `Bitter`, `Furious`, `Passive-Aggressive`, `Dramatic`
  - Neutral tones: `Balanced`, `Factual`
- **Length selector:** Short / Medium / Long
- **Generate button:** Big, central, styled dramatically to match current mode.

### Output Section

- Rendered markdown output displayed in a styled card.
- Card styling shifts with the slider (bright and rounded on Brightside, dark and angular on Darkside).
- Include a **Copy to Clipboard** button.
- Include a subtle **Regenerate** button.
- On loading state: show a themed loading animation.
  - Brightside: Spinning rainbow, bouncing stars, something delightful.
  - Darkside: Flickering flame, pulsing darkness, something ominous.

---

## AI Prompt Engineering

The system prompt sent to OpenAI should be dynamically constructed based on slider position. Key variables:

- **Slider value (0–100):** 0 = full Brightside, 100 = full Darkside, 50 = neutral.
- **Mode:** Derived from slider value.
- **Tone:** Selected by user.
- **Length:** Short (~100 words), Medium (~200 words), Long (~350 words).

### Brightside System Prompt Template

```
You are Brightside, an AI that transforms anything into a radiant, glowing product review. No matter what the user gives you — a complaint, a rant, raw feelings, an existing review — you find the silver lining and write a review that is [tone]. You are irrationally, enthusiastically positive. The product name is: [product]. Write a [length] review. Render your response in markdown with headers, stars (⭐), and enthusiastic language.
```

### Darkside System Prompt Template

```
You are Darkside, an AI that transforms anything into a scathing, devastating product review. No matter what the user gives you — praise, excitement, or raw feelings — you find every flaw and write a review that is [tone]. You are mercilessly, dramatically negative. The product name is: [product]. Write a [length] review. Render your response in markdown. Use dark humor. Do not hold back.
```

### Neutral Prompt Template

```
You are a balanced AI that writes honest product reviews. The product name is: [product]. Based on the user's input, write a [length] balanced review in markdown. Tone: [tone].
```

Blend between these prompts proportionally based on slider value. At 25 (slightly Brightside), lean heavily positive but acknowledge slight imperfections. At 75 (slightly Darkside), lean heavily negative with one grudging compliment.

---

## Stretch Goals (All Required)

These are part of the core assignment. Implement all of them.

### 1. Positivity Level — Baked into Slider
The master slider IS the positivity control. No separate slider needed. The slider value maps directly to how positive or negative the AI's tone is, in addition to controlling the UI theme.

### 2. Tone Selector
Implemented as a dropdown or button group in the controls row. Options are thematic and change based on slider position (see Controls Row section above).

### 3. Length Control
Short / Medium / Long selector. Implemented as a button group. Styled to match current theme.

### 4. Rich UI Components
The slider, animated decorative elements, dynamic theming, and loading states all count as rich UI components. Ensure all are polished and fully functional.

---

## Technical Requirements

- **Single file:** Everything in one `index.html`. Inline CSS and JS. No external files except CDN imports.
- **CDN libraries allowed:**
  - `marked.js` for markdown rendering (cdnjs.cloudflare.com)
  - Google Fonts for typography
  - Any other utility libraries from cdnjs if needed
- **No backend.** All API calls made directly from the browser to OpenAI's API.
- **API key handling:** User inputs their key at runtime (text field in the UI, clearly labeled). Store in a JS variable only. Never persist.
- **Error handling:** Show themed error messages if the API call fails. Brightside error: apologetic and sweet. Darkside error: sarcastic and grim.
- **Responsive:** Should work reasonably on mobile. The slider especially should be touch-friendly.

---

## CSS Architecture Suggestion

Use CSS custom properties (`--var`) for all theme-sensitive values. Update them via JavaScript when the slider moves. Example:

```css
:root {
  --bg-primary: #fff9f0;
  --text-primary: #333;
  --accent: #FFD700;
  --font-display: 'Fredoka One', cursive;
  --border-radius: 24px;
  --glow-color: rgba(255, 215, 0, 0.4);
}
```

The slider `oninput` handler should compute interpolated values between Brightside and Darkside palettes and update these variables in real time.

---

## File Structure

```
/
├── index.html       ← Entire app lives here
├── .env             ← User's API key (not committed, referenced at runtime)
└── temp/            ← Reference implementation (LLM Switchboard). READ THIS.
```

---

## Ethical Note (for context)

This app is for educational purposes. The FTC has banned fake AI-generated product reviews in real commercial contexts. This tool demonstrates LLM capabilities and prompt engineering — it is not intended for deceptive use.

---

## Summary Checklist

- [ ] Single `index.html`, GitHub Pages deployable
- [ ] OpenAI API only, key loaded at runtime into memory
- [ ] Master slider controls UI theme AND AI tone simultaneously
- [ ] Brightside aesthetic: rainbows, fairies, sunshine, over-the-top happy
- [ ] Darkside aesthetic: hellfire, demons, brimstone, devastatingly negative
- [ ] Neutral zone: bleak and personality-free
- [ ] Freeform input (product name + feelings/review textarea)
- [ ] Model selector dropdown
- [ ] Tone selector (thematic options per mode)
- [ ] Length control (Short / Medium / Long)
- [ ] Markdown rendering of AI output
- [ ] Copy to clipboard
- [ ] Regenerate button
- [ ] Themed loading states
- [ ] Themed error messages
- [ ] Dynamic system prompt construction based on slider value
- [ ] Reference `temp/` folder for all API call patterns

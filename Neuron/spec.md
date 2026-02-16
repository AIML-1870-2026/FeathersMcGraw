# Decision Neuron — spec.md
**Domain:** Should I pursue this professional development opportunity?
**Yes label:** Pursue It 🚀
**No label:** Pass for Now ✋
**Tagline:** "Weighing opportunity against reality — one synapse at a time."

---

## Inputs (Sliders)

All sliders range from **0.0 to 1.0** unless otherwise noted.

| # | Input | Display Label | Weight Sign | Default | Notes |
|---|-------|--------------|-------------|---------|-------|
| 1 | Relevance to my goals | Goal Alignment | `+2.5` | 0.5 | Most important factor — how well does this match where I'm headed? |
| 2 | Time commitment required | Time Cost | `-2.0` | 0.5 | High value = heavy time burden = pushes toward NO |
| 3 | Prestige / impact | Prestige & Impact | `+1.5` | 0.5 | Career visibility, resume value, meaningful outcome |
| 4 | How qualified I am | Qualification Fit | `+1.0` | 0.5 | Do I meet the requirements? |
| 5 | Financial cost | Financial Cost | `-0.8` | 0.5 | High value = expensive = pushes toward NO |

**Bias:** `0.0` — Neutral by default (50/50 without any input)

---

## Math

```
z = (goalAlignment × 2.5)
  + (timeCost × -2.0)
  + (prestigeImpact × 1.5)
  + (qualificationFit × 1.0)
  + (financialCost × -0.8)
  + bias (0.0)

probability = sigmoid(z) = 1 / (1 + e^(-z))

decision = probability >= 0.5 ? "Pursue It 🚀" : "Pass for Now ✋"
```

---

## Core UI Features

### 1. Input Panel
- 5 labeled sliders (0.0–1.0) with live numeric readout
- Each slider shows its weight sign (+/-) as a colored tag
- Positive weights: green tag | Negative weights: red tag

### 2. Neuron Output Panel
- Circular neuron icon that glows green (Pursue) or red (Pass)
- Large probability percentage display (e.g., "73% — Pursue It 🚀")
- Sigmoid "confident-o-meter" bar below the percentage
- Live math breakdown showing z score and each weighted input contribution

### 3. Decision Boundary Visualization (2D Plot)
- **X axis:** Goal Alignment (most important positive input)
- **Y axis:** Time Cost (most important negative input)
- Background color gradient: green region (Pursue) vs. red region (Pass)
- Gold decision boundary line at probability = 0.5
- Crosshair dot showing the current slider position in this 2D space
- Moving the bias slider shifts the entire boundary line

### 4. Step-by-Step Training Mode
- Click anywhere on the 2D plot to place a training point
- Toggle buttons to label placed points as **Pursue** or **Pass**
- **Step button:** Advances one perceptron learning iteration with animation — the decision boundary line visibly moves
- **Train button:** Runs 20 steps automatically with smooth animation
- **Reset button:** Clears all training points and resets weights to defaults
- Display panel showing: current weights, bias, step counter, training accuracy %

---

## Stretch Feature 1: Multi-Scenario Neuron

Four preset scenarios the user can switch between. Switching a scenario updates ALL labels, weights, bias, and celebration thresholds instantly.

| Scenario | Emoji | Domain Question | Yes | No |
|----------|-------|----------------|-----|----|
| Professional Opportunity | 🎓 | Should I pursue this? | Pursue It | Pass |
| Gym Day | 💪 | Should I go to the gym? | Let's Go | Rest Day |
| Order Food or Cook | 🍕 | Should I order out? | Order It | Cook |
| Apply to Research Program | 🔬 | Should I apply? | Apply Now | Not This Time |

Each scenario has its own:
- Input labels, weight values, and bias
- Custom "celebration" message when probability > 85%
- Custom color theme (optional)

"Create Your Own Scenario" panel (stretch within stretch):
- Editable title, emoji, 3–5 input labels, weight sliders, bias
- Saves to the scenario selector

---

## Stretch Feature 2: Two-Neuron Chain

A second neuron that takes Neuron 1's output as one of its inputs — the smallest glimpse of a network.

**Neuron 1** (existing) → outputs `a₁` (probability 0–1)

**Neuron 2** inputs:
| Input | Weight | Notes |
|-------|--------|-------|
| Neuron 1 output (a₁) | `+2.0` | Chain connection — animated synapse |
| Mentor/Advisor Support | `+1.5` | Do I have someone guiding me? |
| Gut Feeling | `+1.2` | Intuition — hard to quantify but real |
| Competing Priorities | `-1.8` | What else is demanding my time right now? |

**Neuron 2 bias:** `0.0`

**UI:**
- Two neuron circles connected by an animated synapse line
- The synapse weight is adjustable via slider
- The synapse pulses/glows when probability is flowing through it
- Math display expands to show both: `z₁ → a₁ → z₂ → final output`
- Final output displayed prominently below the chain

---

## Stretch Feature 3: Sensitivity Analysis

A line chart showing how much each input actually influences the neuron's output.

**How it works:**
- For each input, sweep it from 0 → 1 while holding all other inputs at their current slider values
- Plot all 5 curves on one chart
- Steep curve = high influence | Flat curve = low influence
- Time Cost and Financial Cost curves slope downward (negative weights)
- Vertical dashed marker on each curve shows the current slider value

**Additional element:**
- Horizontal sensitivity bar chart ranking all 5 inputs by influence at current values
- Labeled clearly: "Most influential → Least influential"
- Updates live as sliders change

---

## UI/UX Requirements

- **Color scheme:** Deep navy background, white text, green/red for yes/no, gold for boundary line
- **Font:** Clean sans-serif (Inter or system font)
- **Layout:** Single page, tabbed or sectioned (Core | Training | Chain | Sensitivity | Scenarios)
- **Responsive:** Works on mobile (stacked layout) and desktop (side-by-side panels)
- **Animations:**
  - Decision boundary line moves smoothly during training
  - Neuron icon pulses on state change
  - Synapse in two-neuron chain animates when chain is active
  - Probability bar fills with easing

---

## Deployment

- **Framework:** Vanilla HTML/CSS/JS (single file) OR React — your choice for Claude Code
- **Deploy to:** GitHub Pages at `https://aiml-1870-2026.github.io/[your-gamertag]/`
- **Submit:** Live URL to Canvas

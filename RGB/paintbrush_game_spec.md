# Paintbrush Color Matching Game - Comprehensive Specification

## Game Overview

A web-based color-matching game where players shoot paintbrushes at targets to create or match colors. Features three distinct game modes: 1-Player Challenge, 2-Player Competitive, and Palette Maker.

---

## Game Modes

### 1. One-Player Challenge Mode
**Objective:** Match target colors as accurately as possible through progressive levels

**Gameplay:**
- Player is shown a target color to match
- Choose between two sub-modes:
  - **RGB Target Mode:** Shoot three separate R, G, B targets sequentially
  - **Rainbow Square Mode:** Shoot twice on a single 2D color picker, shots combine into final color
- Must match the target color within the required accuracy to pass the level
- Difficulty increases with each level

**Progression System:**
- Level-based advancement
- Difficulty scaling factors:
  - **Target Distance:** Increases with levels (cannon moves further from targets)
  - **Target Size:** Decreases with levels (smaller bullseyes)
  - **Aiming Sensitivity:** Changes with levels (faster sweep speed, more precise timing required)
  - **Accuracy Required:** Tolerance for color match tightens with levels
- Game tracks: current level, attempts, accuracy percentage

### 2. Two-Player Competitive Mode
**Objective:** Best of 5 rounds - most accurate color matches wins

**Gameplay:**
- Split-screen interface (both players visible simultaneously)
- Same RGB Target or Rainbow Square sub-modes as 1-Player
- Both players shown the same target color each round
- Shooting sequence:
  1. Player 1 aims and locks in their shot
  2. Player 2 aims and locks in their shot
  3. Shots fire sequentially (Player 1's shot animates, then Player 2's)
  4. Both final colors compared to target
  5. Round winner determined by closest match
- First to win 3 rounds wins the game
- Display running score (e.g., "Player 1: 2 | Player 2: 1")

### 3. Palette Maker Mode
**Objective:** Creative mode - build custom color palettes inspired by preset themes

**Gameplay:**
- Player selects one of 20 preset palette themes
- Shown the reference palette (5-6 colors) as inspiration
- For each color in the palette sequence:
  1. Display a gradient square showing variations of that base color
     - One axis: brightness (light to dark)
     - Other axis: hue shift (warmer to cooler, neighboring colors)
     - Base color positioned near center
  2. Player shoots once on the gradient square
  3. Selected color is locked into their custom palette
  4. Move to next color in sequence
- After all colors: display completed custom palette
- **No scoring or judgment** - purely creative expression
- Export options provided

**20 Preset Palette Themes:**

*Nature (5):*
1. Ocean Depths - blues, teals, deep navy, seafoam
2. Desert Sunset - oranges, pinks, purples, warm earth tones
3. Forest Floor - greens, browns, moss, bark colors
4. Aurora Borealis - purples, greens, blues, cosmic colors
5. Autumn Leaves - reds, oranges, yellows, burnt browns

*Moods/Vibes (5):*
6. Cyberpunk Neon - hot pink, electric blue, toxic green, deep purple
7. Cozy Cabin - warm browns, soft creams, forest green, rust orange
8. Tropical Vacation - bright turquoise, coral, lime, sunny yellow
9. Midnight Jazz - deep blues, gold, burgundy, charcoal
10. Spring Morning - pastel pink, mint green, sky blue, butter yellow

*Art/Film (5):*
11. Wes Anderson Pastels - dusty pink, mint, mustard, powder blue
12. Film Noir - blacks, grays, white, deep red accent
13. Studio Ghibli - soft greens, sky blues, warm yellows, gentle reds
14. Pop Art Bold - primary red, yellow, blue, black, white
15. Vintage Polaroid - faded orange, muted teal, cream, sepia brown

*Design Classics (5):*
16. Complementary Contrast - blue/orange pair, purple/yellow pair
17. Analogous Harmony - gradient of neighboring colors (e.g., blue→teal→green)
18. Monochrome Elegance - five shades of one color (light to dark)
19. Triadic Balance - three colors equally spaced on color wheel
20. Earthy Neutrals - tans, grays, taupes, warm whites, soft blacks

**Export Formats:**
- PNG image (visual swatch display with all colors)
- JSON file (array of hex codes with palette name and color names)
- CSS variables (`:root` with `--color-1`, `--color-2`, etc.)
- Adobe Swatch (.ase) format for Adobe Creative Suite
- Procreate palette format (.swatches)

---

## Core Shooting Mechanics

### Cannon Interface
**Visual Design:**
- Paintbrush-shaped projectile in a cannon/launcher
- Cannon positioned at bottom/side of screen (mode-dependent)
- Clear visual indicator of current aim position
- Paint splatter effect on impact

**Aiming System (2-Axis Control):**

**X-Axis (Horizontal):**
- Sweeping crosshair/reticle that moves left-right automatically
- Continuous sweep motion (oscillates back and forth)
- Player times their click to capture the X position
- Sweep speed increases with difficulty level

**Y-Axis (Vertical):**
- Click-and-hold mechanic
- Press and hold mouse/key to "charge" vertical power
- Visual power meter fills as held
- Release to fire at that power level
- Longer hold = higher/further shot
- Power meter resets after each shot

**Precision:**
- Shots land exactly where aimed (no random spread/splatter affecting accuracy)
- Visual feedback shows exact impact point
- Paint splatter is cosmetic only

---

## RGB Target Mode Specifications

### Layout
- Three separate target gradients displayed simultaneously
- Labeled clearly: **R** (Red), **G** (Green), **B** (Blue)
- Each target is a vertical or horizontal gradient bar
  - Range: 0-255 for that color channel
  - Visual gradient from 0 (black/no color) to 255 (full intensity)

### Shooting Sequence
1. **Shoot Red target** → See R value selected (e.g., R: 240)
2. **Shoot Green target** → See combined R+G color preview (e.g., R: 240, G: 180 = orange-ish)
3. **Shoot Blue target** → See final RGB color (e.g., R: 240, G: 180, B: 50 = final orange)

### Visual Feedback
- After each shot: display the current cumulative color in a preview swatch
- Show numerical RGB values as they're locked in
- Final result: large color swatch with RGB values displayed

### Color Mixing Display
- Real-time color preview box that updates with each shot
- Formula displayed: `RGB(240, 180, 50)`
- Side-by-side comparison with target color (in challenge modes)

---

## Rainbow Square Mode Specifications

### Layout
- Single 2D color picker square (HSL or HSV space)
- X-axis: Hue (full spectrum, 0-360°)
- Y-axis: Saturation/Lightness gradient
- Visual: Full rainbow gradient square

### Shooting Sequence
1. **First shot** → Lock in Color 1, show selected color
2. **Second shot** → Lock in Color 2, show selected color
3. **Combine** → Display final mixed color (average or additive blend of the two)

### Color Mixing
- Mixing method: Additive RGB blending
  - Color1 RGB + Color2 RGB, divided by 2
  - OR: Blend mode options (multiply, overlay, etc.)
- Display both input colors and final result
- Show blend formula

---

## Difficulty Scaling (1-Player Mode)

### Level Progression Parameters

**Level 1-5 (Beginner):**
- Target distance: Close (large targets)
- Target size: Large (easy to hit)
- Sweep speed: Slow (0.5 oscillations/second)
- Accuracy required: Within ±30 RGB units per channel (Delta-E ≈ 40)
- Colors: Primary and secondary colors (simple)

**Level 6-10 (Intermediate):**
- Target distance: Medium
- Target size: Medium
- Sweep speed: Moderate (0.75 oscillations/second)
- Accuracy required: Within ±20 RGB units per channel (Delta-E ≈ 25)
- Colors: Tertiary colors, muted tones

**Level 11-15 (Advanced):**
- Target distance: Far
- Target size: Small
- Sweep speed: Fast (1 oscillation/second)
- Accuracy required: Within ±10 RGB units per channel (Delta-E ≈ 12)
- Colors: Complex colors, pastels, near-grays

**Level 16-20 (Expert):**
- Target distance: Very far
- Target size: Very small
- Sweep speed: Very fast (1.5 oscillations/second)
- Accuracy required: Within ±5 RGB units per channel (Delta-E ≈ 6)
- Colors: Subtle color differences, near-identical shades

**Level 21+ (Master):**
- Distance/size/speed continue to scale
- Accuracy: Within ±2-3 RGB units (Delta-E ≈ 3)
- Colors: Extremely subtle variations

### Color Accuracy Calculation
Use **Delta-E (CIE76)** or simple **Euclidean RGB distance**:

```
Euclidean RGB Distance = √[(R₁-R₂)² + (G₁-G₂)² + (B₁-B₂)²]
```

Or for more perceptually accurate:
```
Delta-E = √[(L₁-L₂)² + (a₁-a₂)² + (b₁-b₂)²]
```

**Pass/Fail Criteria:**
- If distance ≤ threshold for current level → **PASS** (advance to next level)
- If distance > threshold → **FAIL** (retry current level)
- Display accuracy percentage: `100% - (actual_distance / max_distance) × 100%`

---

## Two-Player Mode Specifications

### Split-Screen Layout
- Screen divided vertically or horizontally
- Each player's section shows:
  - Their cannon position
  - Aiming indicators
  - Preview of their accumulated color (in RGB mode)
  - Score/round counter

### Turn Sequence
1. Both players aim simultaneously (X-axis sweep is synchronized)
2. Player 1 locks in X position (clicks)
3. Player 2 locks in X position (clicks)
4. Player 1 locks in Y power (click-hold-release)
5. Player 2 locks in Y power (click-hold-release)
6. **OR** both lock in at the same time (async lock-in, then fire sequentially)
7. Animations play: Player 1's shot fires → impact → color shows
8. Then: Player 2's shot fires → impact → color shows
9. Compare both final colors to target color
10. Declare round winner
11. Next round begins (best of 5)

### Scoring Display
- Running tally: "Player 1: 2 | Player 2: 1"
- Visual indicator of who won each round (checkmarks, stars)
- Final screen: Winner announcement, accuracy stats for both players

### Match End
- Best of 5 rounds (first to 3 wins)
- Display winner with celebration animation
- Show detailed stats:
  - Average accuracy per player
  - Closest match of the game
  - Rematch option

---

## Palette Maker Mode Specifications

### Flow
1. **Palette Selection Screen**
   - Grid display of all 20 palette options
   - Each palette shown as small color swatches (5-6 colors)
   - Palette name displayed
   - Categorized or filterable by theme type

2. **Gradient Square Generation**
   - For each color in the selected palette:
   - Base color: The reference palette color (e.g., `#FF8C42` for orange)
   - Generate gradient square:
     - **X-axis:** Hue shift (±30° or neighboring colors)
       - Left side: Shift toward cooler/previous hue
       - Right side: Shift toward warmer/next hue
     - **Y-axis:** Brightness/Saturation
       - Top: Lighter, more saturated
       - Bottom: Darker, less saturated (toward brown/gray)
   - Base color positioned near center or slightly offset

3. **Shooting Phase**
   - Display gradient square for current color (Color 1 of 5)
   - Show reference palette at top with current color highlighted
   - Show progress: "Color 2 of 5"
   - Player aims and shoots once
   - Selected color adds to their custom palette preview
   - Move to next color gradient square
   - Repeat until all 5-6 colors complete

4. **Completion Screen**
   - Display final custom palette (large swatches)
   - Display original reference palette for comparison
   - Palette naming:
     - Auto-generate name based on color choices (e.g., "Dusty Ocean" if blues shifted toward gray)
     - Allow user to rename (text input)
   - Export options prominently displayed

### Gradient Square Algorithm

For a base color `RGB(r, g, b)`:

**Generate 2D gradient grid:**
```
For each pixel (x, y) in square:
  - hue_shift = map(x, 0, width, -30, +30)  // degrees
  - brightness_factor = map(y, 0, height, 1.5, 0.5)  // lighter to darker
  - saturation_factor = map(y, 0, height, 1.2, 0.6)  // more to less saturated
  
  Convert RGB → HSL
  Adjust: H += hue_shift, L *= brightness_factor, S *= saturation_factor
  Convert HSL → RGB
  Draw pixel at (x, y) with new RGB
```

This creates a smooth gradient field where:
- Moving horizontally shifts hue
- Moving vertically shifts brightness/saturation
- Center area stays close to base color

---

## UI/UX Requirements

### Main Menu
- Large, clear title: "Paintbrush Palette Game" (or chosen name)
- Three primary buttons:
  1. **1-Player Challenge**
  2. **2-Player Versus**
  3. **Palette Maker**
- Settings/Options button (sound, controls, difficulty presets)

### In-Game HUD Elements

**1-Player Challenge:**
- Current level number
- Target color swatch (large, prominent)
- Current attempt color (shows your progress)
- Accuracy meter/percentage
- Attempts counter
- Pause/Quit button

**2-Player Mode:**
- Split-screen divider
- Player 1 and Player 2 labels
- Round counter ("Round 3 of 5")
- Score display ("P1: 2 | P2: 1")
- Target color (shared, centered or duplicated)
- Individual color progress for each player

**Palette Maker:**
- Reference palette (top bar, always visible)
- Current color indicator ("Color 3 of 5")
- Gradient square (large, central)
- Custom palette preview (building in real-time)
- Back/Cancel button

### Visual Style
- Paintbrush and paint aesthetic throughout
- Splatter effects on successful hits
- Smooth, satisfying animations
- Clean, readable UI elements
- Colorful but not overwhelming

### Accessibility
- High contrast mode option
- Colorblind-friendly indicators (patterns, shapes, labels)
- Keyboard navigation support
- Clear visual and audio feedback

---

## Technical Requirements

### Platform
- **Web-based application** (HTML5, CSS3, JavaScript)
- Responsive design (desktop primary, tablet/mobile secondary)
- Modern browser support (Chrome, Firefox, Safari, Edge)

### Technologies
- **HTML5 Canvas** for rendering targets, cannon, shots
- **JavaScript/TypeScript** for game logic
- **CSS** for UI styling
- **Web Audio API** for sound effects (optional)
- **File System API / Download API** for palette exports

### Performance
- 60 FPS target for smooth animations
- Efficient canvas rendering (only redraw changed elements)
- Preload assets (images, sounds)
- Minimal load times

### File Exports (Palette Maker)

**PNG Export:**
```
Canvas-based image generation:
- 5-6 color swatches arranged horizontally or in grid
- Each swatch: 200x200px (or scalable)
- Palette name as text overlay
- Download as "palette-name.png"
```

**JSON Export:**
```json
{
  "palette_name": "My Autumn Sunset",
  "base_palette": "Desert Sunset",
  "colors": [
    {"name": "Coral Blaze", "hex": "#FF6B4A", "rgb": [255, 107, 74]},
    {"name": "Dusty Rose", "hex": "#C97C8A", "rgb": [201, 124, 138]},
    ...
  ]
}
```

**CSS Export:**
```css
:root {
  --palette-name: 'My Autumn Sunset';
  --color-1: #FF6B4A;
  --color-2: #C97C8A;
  --color-3: #8B5A8F;
  --color-4: #4A4E69;
  --color-5: #F4A261;
}
```

**Adobe Swatch (.ase):**
- Binary format following Adobe Swatch Exchange specification
- Use library like `ase-utils` for generation
- Include palette name and color names

**Procreate (.swatches):**
- JSON-based format specific to Procreate
- Structure:
```json
{
  "name": "My Autumn Sunset",
  "swatches": [
    {"red": 1.0, "green": 0.42, "blue": 0.29, "alpha": 1.0},
    ...
  ]
}
```

---

## Asset Requirements

### Graphics
- Paintbrush sprite (projectile)
- Cannon/launcher sprite
- Target gradient textures (R, G, B bars)
- Rainbow square gradient texture
- Paint splatter effects (multiple variations)
- UI buttons and icons
- Palette swatch template
- Background textures

### Sounds (Optional)
- Cannon firing sound
- Paint impact/splatter sound
- UI click sounds
- Success/fail indicators
- Level up fanfare
- Round win/lose sounds

### Fonts
- Readable, bold font for UI elements
- Playful/artistic font for titles
- Monospace font for RGB/hex values

---

## Implementation Notes

### Game State Management
Use a state machine pattern:
- `MAIN_MENU`
- `MODE_SELECT`
- `GAME_1P_RGB` / `GAME_1P_RAINBOW`
- `GAME_2P_RGB` / `GAME_2P_RAINBOW`
- `PALETTE_SELECT`
- `PALETTE_MAKER`
- `PALETTE_COMPLETE`
- `GAME_OVER`
- `PAUSE`

### Color Utilities
Create helper functions:
- `rgbToHex(r, g, b)`
- `hexToRgb(hex)`
- `rgbToHsl(r, g, b)`
- `hslToRgb(h, s, l)`
- `calculateDeltaE(color1, color2)`
- `generateGradientSquare(baseColor, width, height)`

### Canvas Rendering
Separate rendering layers:
- Background layer (static)
- Target layer (updates per shot)
- Projectile layer (animated)
- UI overlay (HUD elements)

Use double buffering for smooth animation.

### Difficulty Curve
Store difficulty parameters in a data structure:
```javascript
const difficultyLevels = [
  { level: 1, distance: 100, targetSize: 150, sweepSpeed: 0.5, tolerance: 30 },
  { level: 2, distance: 120, targetSize: 140, sweepSpeed: 0.55, tolerance: 28 },
  ...
];
```

### Palette Data Structure
```javascript
const palettes = {
  "ocean-depths": {
    name: "Ocean Depths",
    category: "Nature",
    colors: [
      { base: "#001F3F", name: "Deep Navy" },
      { base: "#0074D9", name: "Ocean Blue" },
      { base: "#39CCCC", name: "Teal" },
      { base: "#7FDBFF", name: "Aqua" },
      { base: "#ABEBC6", name: "Seafoam" }
    ]
  },
  ...
};
```

### Local Storage
Save player progress:
- Highest level reached (1-Player)
- Best accuracy scores
- Unlocked palettes (if adding unlock system)
- Settings/preferences

---

## Future Enhancement Ideas
(Not required for initial implementation, but considerations for expansion)

- **Online multiplayer** (real-time 2-player over network)
- **Daily challenges** (specific color to match, leaderboard)
- **Color theory tutorials** (teach complementary colors, etc.)
- **Custom palette creation** (freeform, not guided)
- **Palette sharing** (community gallery of user palettes)
- **Time attack mode** (match as many colors as possible in 60 seconds)
- **Precision mode** (extreme accuracy challenges)
- **Unlock system** (earn new brushes, effects, palettes)

---

## Success Metrics

### 1-Player Mode
- Completion rate per difficulty level
- Average accuracy across all attempts
- Time to complete levels

### 2-Player Mode
- Average match length
- Win rate balance (should be close to 50/50 if skill-matched)
- Rematch frequency

### Palette Maker
- Completion rate (% who finish a palette)
- Export rate (% who download their palette)
- Most popular base palettes
- Average time spent creating

---

## Development Milestones

**Phase 1: Core Mechanics (MVP)**
- [ ] Implement shooting mechanics (sweeping cannon, click-hold)
- [ ] Build RGB Target mode (1-Player)
- [ ] Basic color matching logic with accuracy calculation
- [ ] 5 levels with increasing difficulty
- [ ] Basic UI/HUD

**Phase 2: Additional Modes**
- [ ] Rainbow Square mode (1-Player)
- [ ] 2-Player split-screen implementation
- [ ] Best-of-5 round system
- [ ] Score tracking and winner declaration

**Phase 3: Palette Maker**
- [ ] Palette selection screen with 20 presets
- [ ] Gradient square generation algorithm
- [ ] Shooting/selection mechanic for palette building
- [ ] Custom palette preview and completion screen

**Phase 4: Export and Polish**
- [ ] Implement all 5 export formats
- [ ] Download/save functionality
- [ ] Visual polish (animations, effects, sounds)
- [ ] Accessibility features
- [ ] Responsive design

**Phase 5: Testing and Optimization**
- [ ] Playtesting and balance adjustments
- [ ] Performance optimization
- [ ] Bug fixes
- [ ] Cross-browser testing

---

## End of Specification

This document contains all requirements and design decisions for the Paintbrush Color Matching Game. Refer to individual sections for detailed implementation guidance.

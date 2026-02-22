# Readable Explorer - Comprehensive Project Specification

## Project Overview
An interactive React-based web application that helps users explore and understand text readability through color contrast, size adjustments, and accessibility guidelines. This educational tool combines WCAG compliance checking, color blindness simulation, and preset examples to create a comprehensive accessibility learning experience.

**Target Users**: Designers, developers, content creators, accessibility advocates, students learning about web accessibility

**Core Value**: Transform abstract accessibility guidelines into tangible, visual understanding through interactive experimentation.

---

## Design Direction: Playful Educational

### Aesthetic Concept: "Science Class Meets Playground"
Think of a friendly science teacher who makes learning fun - colorful, approachable, but still informative and precise.

### Visual Identity

#### Typography
- **Headers/Labels**: "Fredoka" or "Quicksand" (rounded, friendly sans-serif)
- **Technical Data**: "JetBrains Mono" or "Fira Code" (playful monospace for numbers/ratios)
- **Sample Text**: "Merriweather" or "Lora" (readable serif for testing, but user can change)
- **Body Text**: "Inter" or "Nunito" (clean, modern, readable)

#### Color Palette (for UI, not user-controlled text)
- **Primary Background**: Soft cream/off-white (`#FFF8F0` or `#F5F5F0`)
- **Accent Colors**: 
  - Success Green: `#10B981` (WCAG pass)
  - Warning Amber: `#F59E0B` (borderline)
  - Fail Red: `#EF4444` (WCAG fail)
  - Info Blue: `#3B82F6` (help/guidance)
  - Playful Purple: `#8B5CF6` (decorative accents)
- **Control Panel Background**: White with subtle drop shadow
- **Text**: Charcoal gray (`#1F2937`) for readability

#### Visual Style
- **Rounded corners** on all controls (8-12px border radius)
- **Soft shadows** for depth (not harsh)
- **Colorful icons** for different features
- **Smooth animations** (0.2s-0.3s transitions)
- **Emoji/Icon accents** in labels (🎨 for colors, 👁️ for vision, ✓ for pass)
- **Progress bars** and **badges** for visual feedback
- **Tooltips** with helpful explanations

#### Layout
- **Split-screen desktop layout**:
  - Left sidebar (320px): All controls, organized in collapsible sections
  - Right main area: Large text preview + results dashboard
- **Sticky header** with app title and quick stats
- **Footer** with attribution and GitHub link

### Micro-interactions & Delight
1. **Color transitions**: Smooth color changes (0.3s ease-in-out)
2. **Slider feedback**: Subtle haptic feel (scale animation on thumb)
3. **Threshold crossing**: Animated badge when passing/failing WCAG levels
4. **Vision mode switch**: Fade transition between color blindness filters
5. **Preset loading**: Ripple effect from clicked button
6. **Confetti or sparkles** when achieving AAA contrast (optional fun touch!)

---

## Core Features - Technical Specifications

### 1. Background Color Controls

**Components**:
- Three range sliders (R, G, B)
- Three number inputs (R, G, B)
- Color preview swatch (48px × 48px)
- Hex color display (read-only, e.g., "#FF5733")

**Specifications**:
- **Range**: 0-255 for each channel
- **Default**: `rgb(255, 255, 255)` (white)
- **Input validation**: 
  - Clamp values to 0-255
  - Parse integers only (no decimals)
  - Handle empty input gracefully
- **Synchronization**: 
  - Slider change → update input + preview + calculations
  - Input change → update slider + preview + calculations
  - Debounce not needed (React handles efficiently)

**React State**:
```javascript
const [bgColor, setBgColor] = useState({ r: 255, g: 255, b: 255 });
```

### 2. Text Color Controls

**Components**: Same as background color controls

**Specifications**:
- **Range**: 0-255 for each channel
- **Default**: `rgb(0, 0, 0)` (black)
- All other specs identical to background color

**React State**:
```javascript
const [textColor, setTextColor] = useState({ r: 0, g: 0, b: 0 });
```

### 3. Text Size Control

**Components**:
- Range slider (12-96)
- Number input with "px" label
- Visual size indicator (optional: small icon showing relative size)

**Specifications**:
- **Range**: 12px to 96px
- **Default**: 16px
- **Step**: 1px
- **Large text threshold**: ≥24px (or ≥18.67px if bold) for WCAG purposes
- **Input validation**: Clamp to 12-96 range

**React State**:
```javascript
const [fontSize, setFontSize] = useState(16);
```

### 4. Sample Text Display

**Components**:
- Editable textarea or contenteditable div
- Dropdown/buttons for preset text options
- Character counter (optional)

**Specifications**:
- **Default text**: "The quick brown fox jumps over the lazy dog. PACK MY BOX WITH FIVE DOZEN LIQUOR JUGS. 0123456789"
- **Editable**: Yes, users can type custom text
- **Preset phrases**:
  1. Pangram (default)
  2. "Heading 1" / "Heading 2" / "Body Text" (simulate different text types)
  3. Lorem ipsum paragraph
  4. "Button Text" / "CALL TO ACTION"
  5. "Error Message" / "Success Message"
- **Minimum size**: 500px wide × 300px tall
- **Styling applied**:
  - Background color from user controls
  - Text color from user controls
  - Font size from user controls
  - Smooth color transitions (0.3s)
  - Padding: 32px for comfortable reading

**React State**:
```javascript
const [sampleText, setSampleText] = useState("The quick brown fox...");
```

### 5. Luminosity Calculation & Display

**Algorithm**: WCAG 2.1 Relative Luminance

```javascript
function getLuminance(r, g, b) {
  // Convert RGB to sRGB (0-1 range)
  const rsRGB = r / 255;
  const gsRGB = g / 255;
  const bsRGB = b / 255;
  
  // Apply gamma correction
  const rLinear = rsRGB <= 0.03928 
    ? rsRGB / 12.92 
    : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  
  const gLinear = gsRGB <= 0.03928 
    ? gsRGB / 12.92 
    : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  
  const bLinear = bsRGB <= 0.03928 
    ? bsRGB / 12.92 
    : Math.pow((bsRGB + 0.055) / 1.055, 2.4);
  
  // Calculate luminance using WCAG coefficients
  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}
```

**Display**:
- **Format**: "0.XXX" (3 decimal places)
- **Label**: "Background Luminance: 0.XXX" and "Text Luminance: 0.XXX"
- **Location**: In results dashboard
- **Update**: Real-time as colors change

### 6. Contrast Ratio Calculation & Display

**Algorithm**: WCAG 2.1 Contrast Ratio

```javascript
function getContrastRatio(luminance1, luminance2) {
  const lighter = Math.max(luminance1, luminance2);
  const darker = Math.min(luminance1, luminance2);
  
  return (lighter + 0.05) / (darker + 0.05);
}
```

**Display**:
- **Format**: "X.XX:1" (2 decimal places, e.g., "4.52:1")
- **Prominence**: Large, bold display (32-48px font size)
- **Location**: Top of results dashboard
- **Color coding**: 
  - Red if < 3:1
  - Amber if 3:1 - 4.49:1
  - Green if ≥ 4.5:1
  - Darker green if ≥ 7:1 (AAA)
- **Update**: Real-time with smooth number transitions

---

## Stretch Goal A: Vision Simulation

### Implementation: Color Blindness Filters

**UI Components**:
- Radio button group or segmented control
- Options: Normal, Protanopia, Deuteranopia, Tritanopia, Monochromacy
- Icon/emoji for each type (optional: 👁️ 🔴 🟢 🔵 ⚫)

**Algorithm**: Color Transformation Matrices

Each type of color blindness is simulated by transforming the RGB values through a matrix multiplication. The matrices simulate how different cone cells (L, M, S) are affected.

```javascript
function simulateColorBlindness(r, g, b, type) {
  // Normalize RGB to 0-1
  const rgb = [r / 255, g / 255, b / 255];
  
  // Transformation matrices for each type
  const matrices = {
    normal: [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1]
    ],
    protanopia: [ // Red-blind (missing L-cones)
      [0.567, 0.433, 0],
      [0.558, 0.442, 0],
      [0, 0.242, 0.758]
    ],
    deuteranopia: [ // Green-blind (missing M-cones)
      [0.625, 0.375, 0],
      [0.7, 0.3, 0],
      [0, 0.3, 0.7]
    ],
    tritanopia: [ // Blue-blind (missing S-cones)
      [0.95, 0.05, 0],
      [0, 0.433, 0.567],
      [0, 0.475, 0.525]
    ],
    monochromacy: [ // Complete color blindness
      [0.299, 0.587, 0.114],
      [0.299, 0.587, 0.114],
      [0.299, 0.587, 0.114]
    ]
  };
  
  const matrix = matrices[type];
  
  // Apply matrix transformation
  const transformed = [
    matrix[0][0] * rgb[0] + matrix[0][1] * rgb[1] + matrix[0][2] * rgb[2],
    matrix[1][0] * rgb[0] + matrix[1][1] * rgb[1] + matrix[1][2] * rgb[2],
    matrix[2][0] * rgb[0] + matrix[2][1] * rgb[1] + matrix[2][2] * rgb[2]
  ];
  
  // Clamp to 0-1 and convert back to 0-255
  return {
    r: Math.round(Math.max(0, Math.min(1, transformed[0])) * 255),
    g: Math.round(Math.max(0, Math.min(1, transformed[1])) * 255),
    b: Math.round(Math.max(0, Math.min(1, transformed[2])) * 255)
  };
}
```

**Behavior**:
- Apply simulation to **both** background and text colors
- Show simulated colors in preview area
- Display warning: "Simulated view - results are approximate"
- Keep original colors visible (small swatches showing "actual" vs "simulated")
- Recalculate contrast ratio using simulated colors

**React State**:
```javascript
const [visionMode, setVisionMode] = useState('normal');
```

**Educational Notes to Display**:
- **Protanopia**: ~1% of males, difficulty with red
- **Deuteranopia**: ~1% of males, difficulty with green
- **Tritanopia**: <1% of population, difficulty with blue
- **Monochromacy**: Rare, complete color blindness

---

## Stretch Goal B: WCAG Compliance Indicator

### Implementation: Pass/Fail Status Badges

**WCAG 2.1 Level AA Requirements**:
- **Normal text**: Contrast ratio ≥ 4.5:1
- **Large text**: Contrast ratio ≥ 3:1
  - Large text defined as: ≥24px regular OR ≥18.67px bold

**WCAG 2.1 Level AAA Requirements** (optional to display):
- **Normal text**: Contrast ratio ≥ 7:1
- **Large text**: Contrast ratio ≥ 4.5:1

**UI Components**:
- Badge for "Normal Text (AA)" - shows PASS or FAIL
- Badge for "Large Text (AA)" - shows PASS or FAIL
- Optional: AAA badges as well
- Color coding:
  - Green badge with ✓: Pass
  - Red badge with ✗: Fail
- Display current text size and whether it qualifies as "large"

**Logic**:
```javascript
function checkWCAGCompliance(contrastRatio, fontSize, isBold = false) {
  const isLargeText = fontSize >= 24 || (fontSize >= 18.67 && isBold);
  
  return {
    AA: {
      normal: contrastRatio >= 4.5,
      large: contrastRatio >= 3.0
    },
    AAA: {
      normal: contrastRatio >= 7.0,
      large: contrastRatio >= 4.5
    },
    isLargeText: isLargeText,
    applicable: isLargeText ? 'large' : 'normal'
  };
}
```

**Display**:
```
Current Text Size: 16px (Normal Text)

WCAG AA Compliance:
✗ Normal Text (4.5:1 required) - Currently: 4.12:1
✓ Large Text (3:1 required) - Currently: 4.12:1

WCAG AAA Compliance:
✗ Normal Text (7:1 required) - Currently: 4.12:1
✗ Large Text (4.5:1 required) - Currently: 4.12:1
```

**Animations**:
- Badge changes from red → green (or vice versa) with a subtle "pop" scale animation
- Checkmark/X animates in when status changes

**React State**:
- Computed from existing state (contrast ratio + font size)
- No additional state needed

---

## Stretch Goal C: Preset Color Schemes

### Implementation: Quick-Load Color Combinations

**UI Components**:
- Grid of preset buttons (6-10 presets)
- Each button shows miniature preview of the color combo
- Organized into categories:
  - ✓ High Contrast (WCAG AAA)
  - ✓ Passes AA
  - ~ Borderline
  - ✗ Fails WCAG

**Preset Library**:

```javascript
const presets = [
  // High Contrast - AAA Compliant
  {
    name: "Black on White",
    category: "AAA",
    bgColor: { r: 255, g: 255, b: 255 },
    textColor: { r: 0, g: 0, b: 0 },
    ratio: 21.0 // theoretical perfect
  },
  {
    name: "White on Black",
    category: "AAA",
    bgColor: { r: 0, g: 0, b: 0 },
    textColor: { r: 255, g: 255, b: 255 },
    ratio: 21.0
  },
  {
    name: "Dark Blue Text",
    category: "AAA",
    bgColor: { r: 255, g: 255, b: 255 },
    textColor: { r: 0, g: 51, b: 102 }, // #003366
    ratio: 12.6
  },
  
  // AA Compliant
  {
    name: "Link Blue",
    category: "AA",
    bgColor: { r: 255, g: 255, b: 255 },
    textColor: { r: 0, g: 0, b: 238 }, // Standard link blue
    ratio: 8.6
  },
  {
    name: "Dark on Cream",
    category: "AA",
    bgColor: { r: 255, g: 248, b: 240 },
    textColor: { r: 51, g: 51, b: 51 },
    ratio: 11.7
  },
  {
    name: "Night Mode",
    category: "AA",
    bgColor: { r: 30, g: 30, b: 30 },
    textColor: { r: 230, g: 230, b: 230 },
    ratio: 12.8
  },
  
  // Borderline
  {
    name: "Medium Gray",
    category: "Borderline",
    bgColor: { r: 255, g: 255, b: 255 },
    textColor: { r: 118, g: 118, b: 118 }, // #767676 - exactly 4.5:1
    ratio: 4.5
  },
  {
    name: "Light Green on White",
    category: "Borderline",
    bgColor: { r: 255, g: 255, b: 255 },
    textColor: { r: 34, g: 139, b: 34 },
    ratio: 4.1
  },
  
  // Fails WCAG
  {
    name: "Yellow on White",
    category: "Fail",
    bgColor: { r: 255, g: 255, b: 255 },
    textColor: { r: 255, g: 255, b: 0 },
    ratio: 1.1 // Terrible!
  },
  {
    name: "Light Gray on White",
    category: "Fail",
    bgColor: { r: 255, g: 255, b: 255 },
    textColor: { r: 200, g: 200, b: 200 },
    ratio: 1.6
  },
  {
    name: "Pastel Purple",
    category: "Fail",
    bgColor: { r: 255, g: 240, b: 255 },
    textColor: { r: 200, g: 150, b: 255 },
    ratio: 2.3
  }
];
```

**Behavior**:
- Click preset → loads both bg and text colors
- Smooth transition animation (0.3s)
- Optional: Ripple effect from button
- Show which preset is currently active (if any)

**React Implementation**:
```javascript
const loadPreset = (preset) => {
  setBgColor(preset.bgColor);
  setTextColor(preset.textColor);
};
```

**Display**:
- Each preset button shows:
  - Tiny color preview (bg + text sample)
  - Name
  - Category badge (✓ AAA, ✓ AA, ~ Border, ✗ Fail)

---

## React Component Architecture

### Component Hierarchy

```
App
├── Header (title, quick stats)
├── ControlPanel (left sidebar)
│   ├── ColorControls (collapsible section)
│   │   ├── RGBSliders (background)
│   │   └── RGBSliders (text)
│   ├── FontSizeControl
│   ├── VisionSimulator (radio buttons)
│   └── PresetSelector (grid of buttons)
├── PreviewArea (right main section)
│   ├── SampleTextEditor (editable text + preset phrases)
│   └── ResultsDashboard
│       ├── ContrastRatioDisplay (big number)
│       ├── LuminanceDisplay
│       ├── WCAGComplianceIndicator (badges)
│       └── HelpTooltips
└── Footer
```

### Key Custom Hooks

```javascript
// Hook for color calculations
function useAccessibility(bgColor, textColor, fontSize) {
  const bgLuminance = useMemo(() => getLuminance(bgColor.r, bgColor.g, bgColor.b), [bgColor]);
  const textLuminance = useMemo(() => getLuminance(textColor.r, textColor.g, textColor.b), [textColor]);
  const contrastRatio = useMemo(() => getContrastRatio(bgLuminance, textLuminance), [bgLuminance, textLuminance]);
  const compliance = useMemo(() => checkWCAGCompliance(contrastRatio, fontSize), [contrastRatio, fontSize]);
  
  return { bgLuminance, textLuminance, contrastRatio, compliance };
}

// Hook for vision simulation
function useColorBlindness(color, mode) {
  return useMemo(() => simulateColorBlindness(color.r, color.g, color.b, mode), [color, mode]);
}
```

### State Management

**Global State** (in App component):
```javascript
const [bgColor, setBgColor] = useState({ r: 255, g: 255, b: 255 });
const [textColor, setTextColor] = useState({ r: 0, g: 0, b: 0 });
const [fontSize, setFontSize] = useState(16);
const [sampleText, setSampleText] = useState("The quick brown fox jumps over the lazy dog...");
const [visionMode, setVisionMode] = useState('normal');
```

**Derived State** (computed, not stored):
- Luminance values
- Contrast ratio
- WCAG compliance status
- Simulated colors (when vision mode active)
- Hex color strings

---

## Technical Requirements

### Dependencies
```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0"
}
```

**Optional**:
- CSS-in-JS library (styled-components or emotion) - or just plain CSS
- Framer Motion (for smooth animations) - or CSS transitions
- React Icons (for UI icons) - or emoji/SVG

### Browser Support
- Modern browsers (Chrome, Firefox, Safari, Edge)
- ES6+ JavaScript
- No need for IE11 support

### Performance Considerations
- Use `useMemo` for expensive calculations (luminance, contrast)
- Debounce not needed - React batches state updates efficiently
- CSS transitions for smooth color changes
- Component memoization if re-renders become an issue

### Accessibility (for the tool itself!)
- All controls keyboard accessible
- ARIA labels on sliders and inputs
- Proper heading hierarchy
- Focus indicators visible
- Color not sole indicator of meaning (use icons + text)

---

## File Structure

```
readable-explorer/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── Header.jsx
│   │   ├── ControlPanel.jsx
│   │   ├── RGBSliders.jsx
│   │   ├── FontSizeControl.jsx
│   │   ├── VisionSimulator.jsx
│   │   ├── PresetSelector.jsx
│   │   ├── PreviewArea.jsx
│   │   ├── SampleTextEditor.jsx
│   │   ├── ResultsDashboard.jsx
│   │   └── WCAGBadge.jsx
│   ├── utils/
│   │   ├── accessibility.js (WCAG calculations)
│   │   └── colorBlindness.js (simulation matrices)
│   ├── hooks/
│   │   └── useAccessibility.js
│   ├── data/
│   │   ├── presets.js (color scheme presets)
│   │   └── sampleTexts.js (preset phrases)
│   ├── styles/
│   │   ├── App.css
│   │   └── variables.css (CSS custom properties)
│   ├── App.jsx
│   └── index.js
├── package.json
└── README.md
```

---

## User Experience Flow

1. **Initial Load**:
   - Shows default black text on white background at 16px
   - Contrast ratio displays 21:1 (perfect!)
   - All WCAG badges show PASS
   - Normal vision mode selected

2. **Exploring Colors**:
   - User moves RGB sliders
   - Text preview smoothly transitions colors
   - Contrast ratio updates in real-time
   - WCAG badges flip from pass to fail (animated)
   - User can see exact moment when text becomes unreadable

3. **Vision Simulation**:
   - User selects "Protanopia"
   - Colors shift to show simulated view
   - Contrast ratio recalculates
   - User sees how color choices affect different users

4. **Loading Presets**:
   - User clicks "Yellow on White" preset
   - Colors animate to new values
   - Contrast ratio shows 1.1:1 - terrible!
   - All WCAG badges show FAIL
   - User learns what NOT to do

5. **Testing Custom Text**:
   - User types "LOGIN" button text
   - Increases font size to 24px
   - Text qualifies as "large" - WCAG threshold lowers to 3:1
   - Badge shows now passing for large text

---

## Success Criteria

### Core Functionality (Must Have)
- ✓ All RGB sliders work with bidirectional sync
- ✓ Font size slider works with bidirectional sync
- ✓ Contrast ratio calculates correctly (tested against known values)
- ✓ Luminance values display correctly
- ✓ Text preview updates smoothly in real-time

### Stretch Goals (All Implemented)
- ✓ Vision simulation works for all 5 modes
- ✓ WCAG compliance badges show correctly
- ✓ At least 10 preset color schemes load properly

### Polish (Nice to Have)
- ✓ Smooth animations and transitions
- ✓ Responsive layout (desktop-focused but graceful on larger tablets)
- ✓ Helpful tooltips and educational content
- ✓ Clean, playful design that's inviting to use
- ✓ No console errors
- ✓ Fast performance (no lag when moving sliders)

---

## Testing Checklist

### Functionality Tests
- [ ] Move background R slider → input and preview update
- [ ] Type "128" in background G input → slider and preview update
- [ ] Load "Black on White" preset → shows 21:1 ratio
- [ ] Load "Yellow on White" preset → shows ~1.1:1 ratio
- [ ] Change font size from 16px to 24px → WCAG status updates
- [ ] Switch to Protanopia → colors shift appropriately
- [ ] Type custom text → displays correctly
- [ ] Select preset phrase → text updates

### Edge Cases
- [ ] Type "300" in RGB input → clamps to 255
- [ ] Type "-50" in RGB input → clamps to 0
- [ ] Type "5" in font size → clamps to 12
- [ ] Type "150" in font size → clamps to 96
- [ ] Empty input → handles gracefully (defaults to last valid value)

### Visual Tests
- [ ] Colors transition smoothly (not jarring)
- [ ] WCAG badges animate when status changes
- [ ] Preset buttons show clear visual feedback
- [ ] Hover states work on all interactive elements
- [ ] Focus indicators visible for keyboard navigation

### WCAG Calculation Verification
Test against known values:
- [ ] `rgb(255, 255, 255)` luminance = 1.0
- [ ] `rgb(0, 0, 0)` luminance = 0.0
- [ ] `rgb(127, 127, 127)` luminance ≈ 0.212
- [ ] White on black ratio = 21:1
- [ ] `#767676` on white = 4.54:1 (approximately)

---

## Deployment

### Build Process
```bash
npm run build
```

### GitHub Pages Deployment
1. Create `gh-pages` branch
2. Build production version
3. Deploy build folder to GitHub Pages
4. Ensure proper base path configured

### Submission
- Live URL on GitHub Pages
- Source code repository (public)
- README with project description and screenshots

---

## Future Enhancements (Beyond Scope)

If time permits or for future iterations:
- Export color combinations as CSS/JSON
- Save favorite combos to localStorage
- Color picker alternative to sliders
- Font family selector
- Bold/italic toggle
- Gradient backgrounds
- Multiple text samples side-by-side
- Accessibility score (0-100)
- Share link with encoded state
- Dark mode for the tool UI itself

---

## Educational Resources to Link

In the UI, consider linking to:
- [WCAG 2.1 Contrast Guidelines](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Color Blindness Simulation](https://www.color-blindness.com/coblis-color-blindness-simulator/)

---

## Notes for Implementation

- Keep calculations in separate utility files for testing
- Comment complex formulas (especially gamma correction)
- Use CSS variables for theme colors
- Consider adding localStorage to persist user settings
- Add helpful placeholder text and tooltips
- Make error states clear and friendly
- Test on actual accessibility checking tools to verify accuracy

---

**This specification is comprehensive and ready for implementation. Good luck building your Readable Explorer! 🎨👁️✨**

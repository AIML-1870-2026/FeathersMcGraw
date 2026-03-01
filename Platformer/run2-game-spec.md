# Run 2 Clone - Multi-Agent Development Specification

## Project Overview
A browser-based 3D platformer game inspired by Run 2, where players control a stick figure character running through colorful 3D tunnels in space. The game features gravity-shifting mechanics where the player can run on walls and ceilings, with both level-based progression and infinite runner modes.

---

## 🤖 MULTI-AGENT ARCHITECTURE

This project is designed to be built by **THREE COORDINATED AGENTS** working in parallel:

### **AGENT 1: Core Engine & Physics** (`engine-agent`)
**Responsibility:** Three.js rendering, gravity mechanics, player physics, collision detection, camera system
**Output:** `game-engine.js` - The core rendering and physics engine

### **AGENT 2: Game Logic & Content** (`logic-agent`)
**Responsibility:** Level data, game state management, progression system, procedural generation, obstacle behavior
**Output:** `game-logic.js` - All game rules, level data, and state management

### **AGENT 3: UI/UX & Audio** (`ui-agent`)
**Responsibility:** All menus, HUD, settings, localStorage, audio system, visual polish/effects
**Output:** `game-ui.js` - Complete user interface and audio system

### **Integration:**
All three agents deliver their modules to a **final integrator** who combines them into a single HTML file with proper initialization order.

---

## 🔌 INTER-AGENT COMMUNICATION PROTOCOL

### Global Game State Object
All agents interact through a shared `GameState` object:

```javascript
window.GameState = {
  // Engine writes, Logic/UI reads
  rendering: {
    scene: null,
    camera: null,
    renderer: null,
    player: null,
    currentSurface: 0  // 0=floor, 1=right, 2=ceiling, 3=left
  },
  
  // Logic writes, Engine/UI reads
  gameplay: {
    mode: 'menu',  // 'menu', 'level', 'infinite', 'paused'
    currentLevel: 1,
    isPaused: false,
    isGameOver: false,
    playerAlive: true
  },
  
  // Logic writes, UI reads
  stats: {
    deaths: 0,
    distance: 0,
    levelDeaths: {}  // {1: 3, 2: 7, ...}
  },
  
  // UI writes, Logic/Engine reads
  settings: {
    sfxVolume: 80,
    musicVolume: 60,
    showControls: true
  },
  
  // UI writes, Logic reads
  progression: {
    highestUnlocked: 1,
    infiniteHighScore: 0
  }
};
```

### Event System
Agents communicate via custom events:

```javascript
// Engine → Logic
window.dispatchEvent(new CustomEvent('player:death'));
window.dispatchEvent(new CustomEvent('player:landed', {detail: {surface: 2}}));
window.dispatchEvent(new CustomEvent('player:collision', {detail: {obstacleType: 'gap'}}));

// Logic → Engine
window.dispatchEvent(new CustomEvent('game:start', {detail: {level: 1}}));
window.dispatchEvent(new CustomEvent('game:reset'));
window.dispatchEvent(new CustomEvent('level:complete'));

// Logic → UI
window.dispatchEvent(new CustomEvent('stats:update', {detail: {deaths: 5}}));
window.dispatchEvent(new CustomEvent('distance:update', {detail: {meters: 247}}));

// UI → Logic
window.dispatchEvent(new CustomEvent('menu:playLevel', {detail: {level: 1}}));
window.dispatchEvent(new CustomEvent('menu:infiniteMode'));
window.dispatchEvent(new CustomEvent('game:pause'));
window.dispatchEvent(new CustomEvent('game:resume'));
```

### API Contracts

**Engine exposes:**
```javascript
window.GameEngine = {
  init() → void
  startLevel(levelData) → void
  resetPlayer() → void
  updatePhysics(deltaTime) → void
  getCameraPosition() → {x, y, z}
  destroyLevel() → void
};
```

**Logic exposes:**
```javascript
window.GameLogic = {
  init() → void
  startLevel(levelNumber) → void
  startInfiniteMode() → void
  handlePlayerDeath() → void
  updateGameState(deltaTime) → void
  getLevelData(levelNumber) → LevelData
  generateInfiniteSegment() → SegmentData
};
```

**UI exposes:**
```javascript
window.GameUI = {
  init() → void
  showMainMenu() → void
  showLevelSelect() → void
  showPauseMenu() → void
  updateHUD(data) → void
  playSound(soundName) → void
  saveProgress() → void
  loadProgress() → SaveData
};
```

---

## Technical Stack

### Core Technologies
- **Rendering:** Three.js (WebGL) for full 3D graphics
- **Audio:** Web Audio API or Tone.js for sound effects and music
- **Storage:** localStorage for saving progress, high scores, and settings
- **File Structure:** Single HTML file with embedded JavaScript and CSS

### Browser Requirements
- Modern browsers with WebGL support
- Keyboard input (Arrow keys + Space)
- No mobile/touch support required for v1

---

## Game Modes

### 1. Level-Based Mode (Primary Mode)
- **Total Levels:** 10 handcrafted levels
- **Progression:** Linear unlock system (complete Level 1 to unlock Level 2, etc.)
- **Difficulty Curve:** Steady ramp - each level noticeably harder than the previous
- **Goal:** Reach the end of each level without falling into the void

### 2. Infinite Runner Mode
- **Unlock Condition:** Available from start
- **Generation:** Procedurally generated tunnel segments
- **Difficulty Scaling:** Obstacle frequency increases over time, speed remains constant
- **Goal:** Survive as long as possible, maximize distance traveled

---

## Core Gameplay Mechanics

### Player Character
- **Appearance:** Stick figure/humanoid representation
- **Rendering:** Simple 3D model (cylinders for limbs, sphere for head, or similar geometric primitives)
- **Size:** Proportional to tunnel size for clear collision detection

### Movement System
- **Auto-Run:** Character automatically moves forward at constant speed
- **Player Controls:**
  - **Left Arrow:** Move left along the tunnel surface
  - **Right Arrow:** Move right along the tunnel surface
  - **Spacebar:** Jump (perpendicular to current surface)

### Gravity Mechanics (CRITICAL FEATURE)
- **Surface Adherence:** Player runs on the "current" surface of the tunnel
- **Gravity Rotation:** When player moves over an edge (left/right), gravity rotates 90° to align with the new surface
- **Smooth Transitions:** Camera and player orientation smoothly rotate during surface changes
- **Visual Feedback:** Camera should clearly show which surface is "down" relative to the player

### Physics & Collision
- **Jump Arc:** Standard parabolic jump relative to current gravity direction
- **Landing:** Player sticks to the first surface they land on
- **Falling:** If player misses a surface during jump, they fall into the void → death
- **Tunnel Geometry:** Rectangular tunnel (4 surfaces: floor, left wall, ceiling, right wall)

---

## Level Design Specifications

### Visual Theme: Abstract Colorful
Each level has a distinct color scheme to provide visual variety and sense of progression.

**Suggested Color Palettes (per level):**
1. **Level 1:** Blues and purples (calming introduction)
2. **Level 2:** Greens and teals
3. **Level 3:** Oranges and yellows
4. **Level 4:** Pinks and magentas
5. **Level 5:** Reds and crimsons
6. **Level 6:** Cyans and deep blues
7. **Level 7:** Lime greens and electric yellows
8. **Level 8:** Violets and dark purples
9. **Level 9:** Fiery oranges and reds with black accents
10. **Level 10:** Rainbow/multi-color or stark black-and-white high contrast

**Background:**
- Starfield or abstract particle system appropriate to level color scheme
- Subtle motion (slowly rotating stars, drifting particles)

### Obstacle Types

#### 1. Gaps in the Tunnel Floor
- Missing segments of the current surface
- Require precise jumping to cross
- Varying widths (1-5 tiles for difficulty scaling)
- Can appear on any surface (floor, walls, ceiling)

#### 2. Gravity Flip Zones
- Special tiles that immediately rotate gravity 180° when stepped on
- Visually distinct (glowing, different texture/color)
- Force player to quickly adapt to inverted controls
- Used sparingly in early levels, more frequently in later levels

#### 3. Moving/Rotating Obstacles
- **Rotating Barriers:** Spinning obstacles that block path periodically
- **Oscillating Blocks:** Blocks that move in/out of the tunnel
- **Pendulum Hazards:** Swinging obstacles the player must time their movement around
- Speed and complexity increase in later levels

### Level Difficulty Progression

**Level 1-2 (Tutorial/Easy):**
- Simple gaps only
- Wide landing zones
- Few obstacles
- Straight or gently curving tunnel

**Level 3-4 (Easy-Medium):**
- Introduction of gravity flip zones
- Narrower gaps
- Simple moving obstacles
- More frequent surface transitions

**Level 5-6 (Medium):**
- Combination obstacles (gap + moving obstacle)
- Tighter timing requirements
- Multiple gravity flips in sequence
- Curved tunnel sections

**Level 7-8 (Medium-Hard):**
- Dense obstacle placement
- Rapid surface changes required
- Complex moving obstacle patterns
- Precision jumps with small landing zones

**Level 9-10 (Hard/Expert):**
- Gauntlet-style challenges
- Frame-perfect timing required
- All obstacle types combined
- Long sequences without checkpoints

### Level Length
- **Early Levels (1-3):** 30-60 seconds at constant speed
- **Mid Levels (4-7):** 60-90 seconds
- **Late Levels (8-10):** 90-120 seconds

---

## Infinite Mode Specifications

### Procedural Generation
- **Segment-Based:** Generate tunnel in chunks (segments) ahead of the player
- **Segment Length:** 20-30 tiles per segment
- **Look-Ahead:** Always have 3-5 segments generated ahead

### Difficulty Scaling
- **Obstacle Frequency:** Starts sparse, gradually increases
  - Distance 0-500m: 20% obstacle density
  - Distance 500-1000m: 35% obstacle density
  - Distance 1000-2000m: 50% obstacle density
  - Distance 2000m+: 65% obstacle density
- **Speed:** Remains constant throughout
- **Obstacle Variety:** All three obstacle types spawn, with randomized parameters (gap width, rotation speed, etc.)

### Procedural Rules
- Ensure levels are always theoretically completable
- No impossible jumps (gaps too wide, obstacles with no gaps in pattern)
- Minimum spacing between consecutive difficult obstacles
- Occasional "breathing room" segments with no obstacles

---

## Audio System

### Sound Effects (Required)
1. **Jump:** Short, crisp sound when spacebar pressed
2. **Land:** Subtle thud when player lands on surface
3. **Death/Fall:** Descending tone or "whoosh" when falling into void
4. **Surface Change:** Subtle "click" or "rotate" sound when gravity shifts
5. **UI Clicks:** Button press sounds for menu navigation

### Background Music (Required)
- **Style:** Upbeat, electronic/synthwave loop
- **Looping:** Seamless loop (no noticeable restart point)
- **Volume:** Background music should be quieter than sound effects
- **Separate Tracks (Optional):** Different music for menu vs. gameplay

### Audio Implementation
- Use Tone.js or Web Audio API
- Generate simple tones/synth sounds procedurally (no audio file dependencies preferred)
- All audio can be toggled on/off in settings

---

## User Interface & Screens

### Main Menu
**Layout:**
- Game title at top
- Three buttons (vertically centered):
  - "Play Levels"
  - "Infinite Mode"
  - "Settings"
  - "How to Play"
  
**Visual Style:**
- Match the colorful abstract theme
- Animated background (rotating shapes, particles)
- Clean, readable text

### Level Select Screen
**Layout:**
- Grid of level buttons (2x5 or similar)
- Each button shows:
  - Level number
  - Lock icon if not unlocked
  - Death count for that level (if played)
- "Back to Menu" button

**Functionality:**
- Only unlocked levels are clickable
- Clicking unlocked level starts that level immediately

### In-Game HUD (During Gameplay)
**Level Mode:**
- Current level number (top left)
- Death counter for current level (top left)
- Pause button or "ESC to pause" hint (top right)

**Infinite Mode:**
- Distance traveled in meters (center top)
- "ESC to pause" hint (top right)

### Pause Menu
**Appears when ESC pressed during gameplay:**
- Semi-transparent overlay over game (game freezes)
- Three buttons:
  - "Resume" (ESC again to resume)
  - "Restart Level" / "Restart Run"
  - "Quit to Menu"

### Settings Menu
**Options:**
- **Sound Effects Volume:** Slider (0-100%)
- **Music Volume:** Slider (0-100%)
- **Show Controls:** Toggle on/off in-game control hints
- "Back" button

**Layout:**
- Simple vertical list of settings
- Sliders or toggle switches
- Real-time audio preview when adjusting volumes

### Tutorial/Help Screen
**Content:**
- Control scheme diagram:
  - Arrow keys illustration
  - Spacebar illustration
  - ESC key mention
- Brief explanation of mechanics:
  - "Run on any surface"
  - "Jump to cross gaps"
  - "Gravity rotates when you move to new surface"
  - "Avoid falling into the void"
- "Got It" or "Back" button

**Trigger:**
- Auto-shows on first launch (localStorage flag)
- Accessible from main menu anytime

### Death/Game Over
**Level Mode:**
- Brief death animation (character falling/disappearing)
- Increment death counter
- Respawn at level start (or checkpoint if implemented)
- Small popup showing updated death count (1 second display)

**Infinite Mode:**
- Death animation
- Display final distance traveled
- "Try Again" button
- "Menu" button
- Option to display high score comparison

---

## Data Persistence (localStorage)

### Save Data Structure
```javascript
{
  "settings": {
    "sfxVolume": 80,
    "musicVolume": 60,
    "showControls": true,
    "tutorialSeen": true
  },
  "levelProgress": {
    "highestUnlocked": 5,
    "levelStats": {
      "1": { "deaths": 3, "completed": true },
      "2": { "deaths": 7, "completed": true },
      // ... etc
    }
  },
  "infiniteMode": {
    "highScore": 2847  // distance in meters
  }
}
```

### Save Triggers
- Settings: Immediately when changed
- Level completion: Immediately when level finished
- Death count: After each death
- High score: When run ends if new record

---

## Camera & Visual Presentation

### Camera System
- **Perspective:** Third-person chase camera behind player
- **Position:** Slightly above and behind the character
- **Rotation:** Smoothly rotates to match player's gravity orientation
- **Transition Smoothness:** 0.3-0.5 second lerp when gravity changes

### Tunnel Rendering
- **Tile-Based:** Tunnel is composed of discrete tiles/segments
- **Tile Size:** Uniform size, ~1.5x player character height
- **Segment Colors:** Tiles should have color variation within level's palette
- **Depth Rendering:** Use fog or fade-out for distant tunnel segments

### Visual Polish
- **Player Animation:** Subtle running animation (bobbing, limb movement)
- **Particle Effects:**
  - Small particles when landing
  - Trail effect when jumping
  - Explosion/dissipation when falling
- **Lighting:** Ambient lighting matching level color scheme
- **Shadows:** Optional, but adds visual depth

---

## Controls Summary

### Keyboard Controls
- **Arrow Left:** Move left (relative to player orientation)
- **Arrow Right:** Move right (relative to player orientation)
- **Spacebar:** Jump
- **ESC:** Pause/Unpause game
- **Enter:** Confirm menu selections (optional)

### Control Hints
- Display on first few levels (if showControls setting is on)
- Fade out after 10 seconds or first input
- Accessible in tutorial/help screen

---

## Implementation Priorities

### Phase 1: Core Mechanics (MVP)
1. Basic 3D tunnel rendering (Three.js setup)
2. Player character (simple stick figure)
3. Auto-run movement
4. Gravity rotation mechanics
5. Jump physics
6. Collision detection (gaps = death)
7. Single test level with gaps only

### Phase 2: Level System
1. 10 handcrafted level designs
2. Level progression/unlocking
3. Level select screen
4. Death counter tracking
5. All three obstacle types implemented

### Phase 3: Infinite Mode
1. Procedural generation system
2. Distance tracking
3. Difficulty scaling
4. High score saving

### Phase 4: UI/UX
1. Main menu
2. Pause menu
3. Settings menu
4. Tutorial screen
5. Visual polish (animations, particles)

### Phase 5: Audio
1. Sound effect generation/implementation
2. Background music loop
3. Volume controls

### Phase 6: Polish
1. Color schemes for all levels
2. Smooth camera transitions
3. Death animations
4. Visual effects
5. Performance optimization

---

## Technical Considerations

### Performance Targets
- Maintain 60 FPS on modern hardware
- Efficient object pooling for tunnel segments
- Destroy/remove off-screen segments
- Limit active particle effects

### Code Organization
- Modular structure even within single HTML file
- Clear separation of concerns:
  - Game state management
  - Rendering (Three.js)
  - Physics/collision
  - Input handling
  - Audio system
  - UI/menu system
  - Level data
  - Save/load system

### Browser Compatibility
- Target Chrome, Firefox, Safari, Edge (latest versions)
- WebGL required, fallback message if not supported
- localStorage required

---

## Success Criteria

The game is complete when:
1. ✅ All 10 levels are playable and beatable
2. ✅ Infinite mode generates endless playable content
3. ✅ Gravity mechanics work smoothly on all four tunnel surfaces
4. ✅ All UI screens are functional and navigable
5. ✅ Sound effects and music play correctly
6. ✅ Progress saves and loads correctly
7. ✅ Death counter and high scores persist
8. ✅ Game runs at 60 FPS without crashes
9. ✅ Tutorial explains controls clearly
10. ✅ Visual presentation matches abstract colorful theme

---

## Known Scope Limitations (Out of Scope for V1)

- Mobile/touch controls
- Multiplayer or leaderboards
- Level editor
- Multiple character skins/abilities
- Power-ups or collectibles
- Checkpoints within levels
- Custom keybinding
- Gamepad support

---

## Additional Notes for Claude Code

### Recommended Three.js Approach
- Use `BoxGeometry` for tunnel tiles
- Use basic shapes (cylinders, spheres) for stick figure
- Keep geometries simple for performance
- Use `MeshBasicMaterial` or `MeshLambertMaterial`

### Gravity Rotation Logic
- Track player's current surface (0=floor, 1=right wall, 2=ceiling, 3=left wall)
- When player crosses edge, increment/decrement surface index
- Rotate camera and gravity vector accordingly
- Use quaternion slerp for smooth rotation

### Collision Detection
- Raycast from player position to check for tiles below
- If no tile detected = falling = death
- Check jump trajectory intersects with solid tiles

### localStorage Best Practices
- Always wrap in try/catch (privacy mode may block)
- Provide graceful degradation if localStorage unavailable
- Validate data on load (corrupt data handling)

---

## Final Deliverable Format

- **Single HTML file** containing:
  - All JavaScript (Three.js imported via CDN)
  - All CSS styles (embedded)
  - Complete game logic
  - All level data
- **File size target:** <500KB (excluding Three.js CDN)
- **Name:** `run2-clone.html`
- **Documentation:** Brief comments explaining major systems

---

This specification provides all necessary details for implementing a faithful and polished Run 2-inspired game. Focus on getting the core gravity mechanics feeling smooth and responsive first, as this is the defining feature of the gameplay. Good luck!

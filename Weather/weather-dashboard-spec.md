# Weather Dashboard — Claude Code Spec

## Overview
A single-page weather dashboard that fetches real-time data from the OpenWeatherMap API. The core gimmick: every measurement has a dropdown to switch units, and the options range from standard to completely unhinged.

---

## API
- **Source:** OpenWeatherMap Current Weather API + UV Index endpoint
- **Base URL:** `https://api.openweathermap.org/data/2.5/weather?q={city}&appid={API_KEY}&units=metric`
- **UV:** `https://api.openweathermap.org/data/2.5/uvi?lat={lat}&lon={lon}&appid={API_KEY}`
- API key stored in a `.env` file as `OPENWEATHER_API_KEY`, loaded at build time (Vite or similar)

---

## Layout
- Simple centered card layout, one column on mobile, two-column grid on desktop
- Search bar at top (city name input + submit button)
- City name + country displayed as header once loaded
- Six measurement widgets below, each with:
  - Label
  - Big displayed value
  - Unit dropdown

---

## Widgets & Unit Conversions

### 1. Temperature
Raw value from API: `temp` in °C

| Unit | Label | Conversion |
|---|---|---|
| °C | Celsius | `temp_c` |
| °F | Fahrenheit | `temp_c * 9/5 + 32` |
| K | Kelvin | `temp_c + 273.15` |
| % Pizza Oven | % Pizza Oven | `(temp_c / 280) * 100` — assumes 280°C = 100% (standard pizza oven temp) |
| 🌍 Country Match | Country w/ same avg temp | Lookup table: map temp ranges to a country whose annual average matches. Display country name + flag emoji. Examples: 0°C→Canada, 10°C→UK, 20°C→Spain, 28°C→Thailand, 35°C→Mali. Build a table of ~15 countries covering -10°C to 40°C. |

---

### 2. Wind Speed
Raw value from API: `wind.speed` in m/s

This widget has **two dropdowns**: one for distance unit, one for time unit. The displayed value = `wind_ms × distance_factor × time_factor`.

**Distance units** (convert 1 meter into unit):

| Unit | Factor (per meter) |
|---|---|
| meters | 1 |
| km | 0.001 |
| Bananas | 5.0 (1 banana ≈ 0.2m) |
| Cats | 2.17 (1 cat ≈ 0.46m) |
| Football Fields | 0.01094 (1 field = 91.44m) |
| Human Ears | 15.38 (1 ear ≈ 0.065m) |

**Time units** (convert per-second into per-unit):

| Unit | Seconds in unit |
|---|---|
| second | 1 |
| hour | 3,600 |
| year | 31,536,000 |
| eon | 3.154 × 10¹⁶ |
| dog year | 220,903,200 (7 human years) |
| fortnight | 1,209,600 |
| moon | 2,551,392 (one lunar cycle ≈ 29.53 days) |

Display format: `"{value} {distance_unit} per {time_unit}"`
Use `toLocaleString()` for large numbers (eons will be wild).

---

### 3. Humidity
Raw value from API: `main.humidity` (%) + `main.temp` (°C for absolute humidity calculation)

Absolute humidity (g/m³) ≈ `(6.112 × e^(17.67 × temp_c / (temp_c + 243.5)) × humidity_pct × 2.1674) / (273.15 + temp_c)`

Then express as water bottles (500g each) filling a given container:

| Unit | Container Volume | Formula |
|---|---|---|
| Standard (%) | — | raw `humidity_pct` |
| Olympic Pools | 2,500 m³ | `abs_humidity_g_per_m3 × 2500 / 500` |
| Whale Bladders | 0.02 m³ (20L) | `abs_humidity_g_per_m3 × 0.02 / 0.5` |
| Yo Mamas | 0.2 m³ (large) | `abs_humidity_g_per_m3 × 0.2 / 0.5` |

Display: `"{value} water bottles per {container}"` (or just % for standard)

---

### 4. Pressure
Raw value from API: `main.pressure` in hPa → convert to Pascals: `pressure_pa = pressure_hpa × 100`

Pressure = force per area. Express as weight of object per m²:

| Unit | Label | Conversion |
|---|---|---|
| hPa | hPa | raw |
| mmHg | mmHg | `pressure_hpa × 0.75006` |
| Chimps/m² | Chimps per m² | `pressure_pa / (45 × 9.81)` — avg chimp ≈ 45kg |
| Feathers/m² | Feathers per m² | `pressure_pa / (0.00001 × 9.81)` — avg feather ≈ 0.01g |
| Barbells/m² | Barbells per m² | `pressure_pa / (20 × 9.81)` — Olympic bar ≈ 20kg |

Note: feathers/m² at sea level ≈ ~1 billion. Display this proudly.

---

### 5. Visibility
Raw value from API: `visibility` in meters

| Unit | Label | Conversion |
|---|---|---|
| km | Kilometers | `visibility / 1000` |
| mi | Miles | `visibility / 1609.34` |
| Free Throws | Free Throws | `visibility / 4.572` — free throw line = 15ft = 4.572m |
| Pencil Draws | Pencils | `visibility / 50000` — 1 pencil draws ~50km |
| Vatican Lengths | Vatican City lengths | `visibility / 1050` — Vatican is ~1.05km N→S |

---

### 6. UV Index
Raw value from API: UV index (float)

| Unit | Label | Conversion |
|---|---|---|
| Index | UV Index | raw value |
| Min to Burn | Min until caucasian sunburn | `Math.round(200 / uv_index)` — no sunscreen, skin type I. Show "∞" if UV < 1. |

---

## Additional Features
- **Geolocation button** — "Use my location" fetches lat/lon and reverse geocodes city name
- **Default city on load** — hardcode to `Omaha, NE` for development
- **Error states** — invalid city shows a friendly message
- **Loading state** — skeleton loaders or spinner on fetch
- **"Chaos" indicator** — small label on each widget that changes when a ridiculous unit is selected (e.g., "🤡 Chaos Mode")

---

## Tech Stack
- **Vanilla JS + Vite** (no framework, keeps it simple for a class project)
- **CSS** — custom properties, flexbox/grid, clean card design
- **No external UI libraries**
- Deployed to GitHub Pages via `vite build` + gh-pages

---

## File Structure
```
weather-dashboard/
├── index.html
├── main.js
├── style.css
├── units/
│   ├── temperature.js
│   ├── wind.js
│   ├── humidity.js
│   ├── pressure.js
│   ├── visibility.js
│   └── uv.js
├── api.js
├── .env
└── vite.config.js
```

Each `units/*.js` exports a conversion function and a units config array so widgets are self-contained.

---

## Notes for Claude Code
- All conversion math lives in `units/` — keep it isolated and testable
- The wind widget is the most complex UI — two independent dropdowns, value updates when either changes
- Country match for temperature needs a hardcoded lookup table of ~15 entries, no external call
- Format large numbers with `toLocaleString()` and include scientific notation fallback for eon-scale values
- Feathers/m² and eons will produce extremely large numbers — that's the joke, don't round aggressively

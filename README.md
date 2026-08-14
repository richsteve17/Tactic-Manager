# 📋 Tactic-Manager

**Tactical Football Match Engine & Visualizer**

A deterministic, tick-based football simulation engine and tactical board. Define formations, spatial shapes, pressing triggers, and transition behaviors, then watch the simulation resolve phases of play in real time.

---

## ⚡ Engine Architecture
- **Tick Engine (`src/engine/tick.ts`)**: Discrete time-step resolution of player positioning, passing lanes, spatial occupation, and duel physics.
- **Tactical Shapes & Presets (`src/presets/`)**: Pre-configured shapes (4-3-3, 4-2-3-1, 3-5-2, low block, Gegenpress) with configurable width, depth, and passing tempos.
- **Trigger System (`src/engine/triggers.ts`)**: Event-driven tactical triggers (pressing on heavy touch, counter-press on turnover, overlapping fullbacks).
- **Match Reports (`src/engine/report.ts`)**: Post-match expected goals (xG), heatmaps, pass network analysis, and phase breakdown.

---

## 🛠️ Stack
- React 18, TypeScript 5.6, Vite 5, Vitest

---

## 🚀 Running & Testing
```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Run engine unit tests
npm test
```

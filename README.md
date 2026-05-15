<div align="center">

# Incandescent Vision Lab

**A seamless blend of vintage interaction and modern technology. This project uses webcam-based hand tracking to let users virtually grab and pull a light chain, toggling the web page's light with fluid, responsive motion effects.**

[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646cff)](https://vite.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-4-38bdf8)](https://tailwindcss.com/)
[![Matter.js](https://img.shields.io/badge/Matter.js-0.20-4b5563)](https://brm.io/matter-js/)

</div>

<div align="center">
  <video src="https://github.com/user-attachments/assets/bf84bf7d-2ea6-475e-a507-f1cd25843ce2" width="720" controls muted autoplay loop></video>
</div>

---

## ✨ Concept

A physics-based **incandescent point-light simulator**. Unlike conventional global filters, all lighting effects radiate from a single coordinate—the bulb. Drag the chain, pull it down, and feel the light respond.

The chain hangs from the top center of the screen, physically simulated with Matter.js. **Grab it with your hand** (via webcam + MediaPipe) or **click and drag with your mouse**. Pull it past the stretch threshold, let go, and the virtual incandescent bulb toggles on or off with a satisfying sound.

---

## 🎥 How It Works

| Layer | Technology | Role |
|-------|-----------|------|
| **Hand Tracking** | [MediaPipe Hands](https://google.github.io/mediapipe/solutions/hands) | Real-time index-finger & thumb-tip detection via webcam |
| **Physics Engine** | [Matter.js](https://brm.io/matter-js/) | Simulated chain of constrained bodies with gravity, stiffness, and damping |
| **Lighting** | CSS `radial-gradient` + `mix-blend-mode` | Point-light attenuation, vignette, color temperature, and bloom |
| **UI** | React 19 + Tailwind CSS 4 | Fully configurable control panel with live sliders and color pickers |

> **Interaction**: Pinch your index finger and thumb together near the chain tip → the chain locks to your hand. Pull downward. When the chain stretches beyond the threshold (default 10% of its grabbed length), the bulb toggles and `light.wav` plays.

---

## 🚀 Quick Start

```bash
git clone <repo-url>
cd HandsControl-web
npm install
npm run dev
```

Open `http://localhost:5173` in your browser. Grant webcam access when prompted.

---

## 🕹️ Controls

### Mouse / Touch
- **Hover** over the chain tip → cursor changes to `grab`
- **Click & drag** the tip to stretch the chain
- **Release** past the threshold to toggle the light

### Hand Gesture (Webcam)
- Position your hand so your **index fingertip** and **thumb tip** are near the chain tip
- **Pinch** (bring fingertips together) → chain locks to your hand midpoint
- **Pull** the chain downward while maintaining the pinch
- **Release** the pinch past the stretch threshold → light toggles
- A **1.5‑second cooldown** prevents accidental double‑triggers

### Export & Import
- **Export** — saves all light parameters and chain configuration as a `.json` file
- **Import** — loads a previously exported preset, instantly restoring every slider value
- Both buttons are at the bottom of the control panel

---

## ⚙️ Configurable Parameters

### 💡 Light Source
| Parameter | Range | Description |
|-----------|-------|-------------|
| Bulb Intensity | 0–3 | Center brightness of the point light |
| Light Reach | 0.1–2× | Falloff distance multiplier |
| Color Temp | 2700–3000 K | Warm incandescent hue |

### 📍 Position
| Parameter | Description |
|-----------|-------------|
| Bulb Size | 16–1200 px |
| Bulb Image X / Y | Place the bulb anywhere on screen |
| Light Center X / Y | Independent light‑emission origin |

### 🌙 Night Effect
| Parameter | Range | Description |
|-----------|-------|-------------|
| Night Exposure | 0.05–1 | Ambient exposure in night mode |
| Blue Shift | 0–1 | Cool tone overlay strength |

### 🎛️ Environment
| Parameter | Range | Description |
|-----------|-------|-------------|
| Ambient Light | 0–1 | Residual light when off |
| Shadow Depth | 0–1 | Darkness in unlit areas |
| ISO Noise | 0–1 | Film‑grain overlay |

### ⛓️ Pull Chain

<details>
<summary><b>Structure</b></summary>

| Parameter | Range | Default |
|-----------|-------|---------|
| Chain Length | 5–40 segments | 20 |
| Segment Spacing | 6–40 px | 16 |
| Segment Radius | 2–15 px | 5 |

</details>

<details>
<summary><b>Elasticity</b></summary>

| Parameter | Range | Default | Effect |
|-----------|-------|---------|--------|
| Stiffness | 0.05–1 | 0.45 | Higher = tighter, less stretch |
| Damping | 0–0.5 | 0.22 | Higher = faster wobble decay |
| Friction | 0–0.1 | 0.025 | Air resistance on each segment |
| Bounce | 0–0.5 | 0.15 | Collision restitution |
| Tip Weight | 0.2–4× | 1.2 | Extra mass on the chain end |
| Gravity | 0.1–2 | 0.6 | Downward pull strength |

</details>

<details>
<summary><b>Colors</b></summary>

Each color has a **native color picker** and **alpha transparency slider**:

| Property | Default |
|----------|---------|
| Chain Line | `#dcb478` α=0.9 |
| Tip Fill | `#dcb478` α=0.7 |
| Glow | `#ffc850` α=0.35 |

When grabbed, colors are automatically brightened and saturated.

</details>

<details>
<summary><b>Appearance</b></summary>

| Parameter | Range | Default |
|-----------|-------|---------|
| Line Width | 1–10 px | 3 |
| Grab Width | 1–12 px | 4 |
| Glow Blur | 0–30 px | 8 |
| Glow Blur Grab | 0–40 px | 16 |

</details>

<details>
<summary><b>Interaction</b></summary>

| Parameter | Range | Default | Description |
|-----------|-------|---------|-------------|
| Grab Radius | 30–200 px | 90 | How close the hand must be to grab |
| Stretch Trigger | 3–50% | 10 | Stretch % before light toggles |
| Pinch Threshold | 15–100 px | 36 | Max distance for a “pinch” detection |

</details>

---

## 🏗️ Architecture

```
src/
├── App.tsx              # Root state, audio, chain config
├── LightCanvas.tsx       # Webcam + background + radial light layers
├── PullChain.tsx         # Matter.js physics chain + MediaPipe hand tracking
├── ControlPanel.tsx      # All sliders, color pickers, toggles
└── types.ts              # LightPreset and AppState interfaces
```

### Data Flow

```
App (state owner)
 ├─► LightCanvas (visual rendering)
 │     └─► PullChain (canvas overlay, physics, hand tracking)
 │            ├─ reads config props from App
 │            └─ calls onPullRelease() → handleToggleLight()
 └─► ControlPanel (settings UI)
       └─ modifies state via onChange callbacks
```

---

## 📦 Stack

| Dependency | Version | Purpose |
|------------|---------|---------|
| `react` / `react-dom` | ^19 | UI framework |
| `vite` | ^6 | Build tool |
| `tailwindcss` | ^4 | Utility CSS |
| `matter-js` | ^0.20 | Physics engine |
| `lucide-react` | ^1.16 | Icons |
| `@mediapipe/hands` | 0.4 | Hand landmark detection (CDN) |

---

## 📄 License

MIT

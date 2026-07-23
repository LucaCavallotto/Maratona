# Project Overview

**Maratona** is a professional-grade running calculator designed for performance-driven athletes and coaches. It provides high-precision tools for calculating training zones, pace, time, distance, unit conversions, and advanced race pacing strategies. The application emphasizes a "Calculator done right" philosophy, featuring a premium 3D flip-card interface that toggles between standard form inputs and interactive fine-tuning sliders.

### Core User Flow
1. **Mode Selection**: User selects calculation type (Quick DTP Input, Training Zones, Pace, Time, Distance, or Km-Mile Converter).
2. **Input Interaction**: User enters data via standard keyboard inputs, Quick DTP smart input (e.g. `10, ?, 4:30`), or switches to **Fine-tuning (Back face)** for tactile slider adjustments.
3. **Real-time Results & Telemetry**: Calculations update dynamically, providing detailed race predictions, 3-column split tables (**Km**, **Pace**, **Time**), and personalized 7-tier training zones.
4. **Advanced Race Strategy**: For Pace and Time calculations, users can dynamically modify pacing execution strategies using mutually exclusive modes:
   - **Half-Race Strategy**: Adjust Effort Ratio ($45\%$–$55\%$) for negative/positive splits while keeping target finish time exact.
   - **Progressive Pacing**: Adjust Pace Decrement ($0$–$5\text{ s/km}$) for continuous kilometer acceleration.
5. **Action Items**: Users can copy formatted results to the clipboard or reset for a new session.

---

# Technical Stack

| Area | Technology | Usage |
| :--- | :--- | :--- |
| **Frontend** | HTML5 | Semantically structured markup with ARIA accessibility. |
| **Styling** | Vanilla CSS | Custom design system using CSS Variables, Flexbox/Grid, and 3D Transforms. |
| **Logic** | Vanilla JavaScript | Modular ES Modules (ESM) with functional decomposition. |
| **Icons** | Bootstrap Icons | SVG-based iconography via CDN. |
| **Typography**| Google Fonts | 'Inter' (Sans-serif UI) and 'Roboto Mono' (Monospaced data telemetry). |
| **Deployment**| Static Hosting | Optimized for lightning-fast delivery (e.g., GitHub Pages). |

> [!NOTE]
> This is a **Zero-Dependency** project. No external frameworks (React/Vue/Tailwind) are used to ensure maximum performance, instant load times, and maintainability.

---

# Workflow & Rules

### Running the Project
* **Local Development**: Since the project uses ES Modules (`import`/`export`), it requires a local server. Use `npx live-server` or Python 3 (`python3 -m http.server 8000`).
* **Production**: Simply serve the root directory. No build step required.

### Coding Standards
* **HTML**: Use semantic tags (`<aside>`, `<main>`, `<section>`). Interactive elements must have descriptive `id` and `aria-label` attributes.
* **CSS**:
    * Follow the modular structure in `assets/css/`.
    * **NEVER** hardcode colors or spacing. Always use design tokens from `variables.css`.
    * Layout is structured via `layout.css`, components via `components.css`, results/strategy via `results.css`, and mobile responsive rules via `mobile.css`.
* **JavaScript**:
    * Keep logic modular: `calculators.js` for pure math, `ui-controller.js` for DOM manipulation & UI controls, `sliders.js` for fine-tuning range sliders, `utils.js` for formatting & parsing, and `main.js` for application orchestration.
    * Use `const` and `let` exclusively; avoid `var`.
    * Maintain strict separation between mathematical logic and UI updates.
    * Use custom DOM events (e.g. `strategyChanged`) for decoupled component communication.

### Commits & Documentation
* **Commits**: Use descriptive, imperative messages (e.g., `feat: add progressive pacing strategy slider`, `fix: equal vertical spacing in results grid`).
* **JSdoc**: Document complex mathematical functions in `calculators.js` using standard JSdoc comments.

---

# Design System & UI

### Typography
* **Primary (Sans-serif)**: `Inter` (used for UI elements, labels, and body text).
* **Data (Monospaced)**: `Roboto Mono` (used for tabular numbers, split tables, outputs, and metrics).

### Colors (Design Tokens)
* **Primary Action**: `--btn-primary-bg: #D9383A` (The Track Red) / Dark mode: `--btn-primary-bg: #EF4444`.
* **Dark Mode**: Seamless support implemented via `@media (prefers-color-scheme: dark)` and `[data-color-mode="dark"]`.

### Components
* **Inputs**: Custom styled `input-field` with focus states using `--input-focus-border`.
* **Sliders**: High-precision custom range inputs with dynamic boundary expansion and background gradient fill tracks.
* **Cards & Telemetry**: Minimalist `metric-card`, 3-column `.splits-table`, and interactive `.strategy-card`.

---

# Architecture

```text
RunTools/
├── index.html          # Main application structure & semantic markup
├── assets/
│   ├── css/
│   │   ├── variables.css   # Global design tokens and theme palettes
│   │   ├── base.css        # Resets and base element styles
│   │   ├── layout.css      # Grid and flexbox structure (Sidebar vs Main)
│   │   ├── components.css  # Buttons, inputs, dropdowns, range sliders
│   │   ├── results.css     # Result cards, splits telemetry & strategy styling
│   │   └── mobile.css      # Tablet and mobile optimizations
│   └── js/
│       ├── main.js         # Entry module, global event handlers & strategy listener
│       ├── calculators.js  # Core mathematical logic (zones, splits, strategy math)
│       ├── ui-controller.js# DOM rendering, strategy UI controls & visibility logic
│       ├── sliders.js      # Interactive slider system logic & 3D flip card state
│       └── utils.js        # Time formatting, validation & DTP smart input parser
├── GEMINI.md           # Developer context & project guidelines
└── README.md           # User-facing manual & documentation
```

---

# Lessons Learned

* **Slider Precision**: Use a "Relative Anchor" system for sliders to prevent rounding errors during bidirectional updates between distance, time, and pace.
* **3D Flip Performance**: Ensure `backface-visibility: hidden` is applied to avoid flickering in Safari during card flip animations.
* **Strategy Target Time Invariance**: In `calculateStrategySplits`, ensure total finish time ($T = D \times P_{avg}$) remains strictly constant regardless of Effort Ratio or Pace Decrement adjustments.
* **Uniform Grid Spacing**: Grouping top-level result sections (`.results-section`, `.splits-section`, `.strategy-section`) as sibling flex items inside `.result-grid` with `gap: 24px` and `margin: 0` ensures perfectly uniform vertical rhythm.
* **Dynamic DTP Component Visibility**: Always inspect `highlightLabel` / `unknownField` to correctly determine the target calculation variable (Pace, Time, or Distance) across both Quick DTP text expressions and standard form inputs.

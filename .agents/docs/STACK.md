# Technical Stack & Architecture

This document details the libraries, runtime tools, and custom algorithms that power the Code Landscape Viewer.

---

## 1. Core Framework & Routing
- **Svelte 5**: Leverages the new runes system (`$state`, `$derived`, `$effect`, `$bindable`, and `$state.snapshot`) for reactive bindings and state management.
- **SvelteKit**: Handles server-side rendering (SSR), layout routing, and backend endpoints.

---

## 2. Visualizations & Mathematics
- **HTML5 Canvas (2D Context)**: High-performance renderer capable of displaying hundreds of nodes and reference links at a continuous 60FPS.
- **D3.js (v7)**:
  - `d3-force`: Simulates spatial arrangement using gravity, charge, and link distance constraints in 2D Plane and 3D Tower layouts.
  - `d3-zoom`: Drives smooth pan and zoom translations.
- **GSAP (GreenSock)**:
  - Interpolates node spatial coordinate transformations during layout morphing.
  - Drives spring-back selection scaling and hover animation transitions.
  - Controls slide-in animations for the drawer panel.
- **Custom 3D Projection Engine**:
  - Implements vertical ($\phi$) and horizontal ($\theta$) camera orbit rotation matrix math.
  - Applies a painter's depth-sorting algorithm (`Painter's Algorithm`) to draw background nodes before foreground nodes for correct Z-index overlapping.
  - Projects 3D space `(x, y, z)` onto 2D screen coordinates `(px, py)` using perspective camera distance ratios.

---

## 3. Backend Parser & Code Insights
- **Repository Analyzer Endpoint**: Scans local directories or GitHub trees, filters generated/binary/vendor files, and returns a combined graph plus repository-intelligence payload.
- **Regex-Based Code Lexer**: Extracts imports, exports, classes, and route endpoints for JavaScript, TypeScript, Svelte, Python, and PHP files within the current analysis cap.
- **Repository Intelligence Layer**:
  - Detects likely stack and project type from manifests, dependencies, and conventional framework files.
  - Computes language breakdown, entry points, main folders, important files, suggested reading path, and health metrics.
  - Annotates graph nodes with architecture roles, import/dependent counts, importance score, deterministic risk score, risk level, and risk reasons.
- **Secure File Provider**: SvelteKit backend endpoint restricts reads to the active project workspace directory, sanitizing path traversals (`..`) and fetching remote GitHub blobs securely when needed.
- **PrismJS**: Renders on-demand syntax highlighting inside the glassmorphic slide-out code drawer.

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
- **AST Lexer**: Scans local or remote GitHub directories to map files, folders, and references.
- **Acorn Parser**: Parsers code tokens, classes, and exported symbols.
- **Secure File Provider**: SvelteKit backend endpoint restricts reads to the active project workspace directory, sanitizing path traversals (`..`) and fetching remote GitHub blobs securely when needed.
- **PrismJS**: Renders on-demand syntax highlighting inside the glassmorphic slide-out code drawer.

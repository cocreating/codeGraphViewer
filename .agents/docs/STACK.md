# Technical Stack & Architecture

This document details the libraries, runtime tools, and custom algorithms that power the Code Landscape Viewer.

---

## 1. Core Framework & Routing
- **Svelte 5**: Leverages the new runes system (`$state`, `$derived`, `$effect`, `$bindable`, and `$state.snapshot`) for reactive bindings and state management.
- **SvelteKit**: Handles server-side rendering (SSR), layout routing, and backend endpoints.
- **Default App Config**: `src/lib/config/defaults.js` defines the default mode, default focus mode, local repository presets, and the `flowParticles` block that controls the size, colour, glow, opacity, and speed of animated edge particles — all tuneable without touching renderer code.

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
- **Local Directory Browser (`/api/browse-local`)**: A SvelteKit GET endpoint that lists child directories at a given path using `fs.readdirSync`, strips build artifacts (`node_modules`, `.git`, `dist`, `vendor`, `__pycache__`), annotates each entry with `readable` (via `fs.accessSync`) and `hidden` (dotfile) flags, computes a set of root shortcuts (default repo, CWD, home, Downloads, filesystem root), and returns `{ currentPath, parentPath, roots, entries }` as JSON.
- **PrismJS**: Renders on-demand syntax highlighting inside the glassmorphic slide-out code drawer.

---

## 4. UI Architecture Patterns
- **Floating Collapsible Inspector**: The repository details panel is absolutely positioned inside a `canvas-stage` container so it overlays the live graph. State is driven by two Svelte 5 runes (`inspectorCollapsed`, `activeInspectorTab`). Selecting a canvas node auto-expands the panel and activates the *Selected* tab via `$effect`.
- **Tabbed Inspector Layout**: Four named tabs (Overview, Explorer, Selected, Nav) conditionally render their child component only when active, keeping DOM complexity low during tab switches.
- **In-App Folder Browser Modal**: A glassmorphic `folder-browser` dialog floats over a `folder-browser-backdrop`. State (`localBrowserOpen`, `localBrowserPath`, `localBrowserEntries`, `localBrowserRoots`, `localBrowserParentPath`, `localBrowserLoading`, `localBrowserError`) is managed entirely with Svelte 5 `$state` runes in `+page.svelte`. The backdrop element captures click events and closes the modal when the user clicks outside the dialog box.

---

## 5. Canvas Rendering Design

### Node Sizing
Node radii (`getNodeRadius`) are kept intentionally subtle to avoid visual clutter. Current baseline sizes: root 13 px, directory 7.5 px, file 5.5 px, class 4 px, export 3.5 px, endpoint/package 5 px. The heatmap overlay scales file nodes dynamically from 4 px (min) to 16 px (max) based on the selected metric ratio.

### D3 Force Tuning
The simulation is tuned for maximum readability:
- **Link distances**: hierarchy 55 px, contains 28 px, import 90 px — wide gaps let nodes breathe.
- **Charge repulsion**: root −280, directory −110, file −55, other −18 (scaled to 40% for graphs > 80 nodes).
- **Collision radius**: `getNodeRadius(type) + 10 px` padding prevents any overlap.
- **Center gravity**: 0.02 (small graphs) / 0.05 (large) — light enough that repulsion dominates and nodes spread naturally.
- **Initial scatter**: new nodes are placed at 120–300 px from centre so the simulation starts from an already-spread state.

### Edge Rendering
Three edge types are styled distinctly but kept visually quiet at rest:
- *Hierarchy*: solid, 0.6 px, 2.5% white opacity.
- *Contains*: dashed [2, 4], 0.7 px, 4.5% white opacity.
- *Import*: dashed [4, 5], 0.9 px, 13% purple opacity at rest; 1.4 px, 45% opacity when the edge is highlighted.
Small directional arrowheads (4 px) indicate flow direction on import and contains edges.

### Label Rendering
- **Visibility threshold**: root and directory labels are always shown; file labels appear at zoom `k > 0.9`; all other types at `k > 1.6`.
- **Pill background**: a rounded dark rectangle (`rgba(8,6,18, 0.58)`) is drawn behind every ambient label to ensure legibility on busy canvas backgrounds.
- **Colour scheme**: selected labels are bright white; directory labels use a soft teal tint (`#b2f5ea`); ambient file labels use `#c4bdd4`.

### Flow Particles (Configurable)
Animated dots travel along edges to indicate data/import direction. All visual properties are read from `DEFAULT_APP_CONFIG.flowParticles` (aliased as `PC` in `GraphCanvas.svelte`) and can be changed in `defaults.js` without touching the renderer:

| Config key | Default | Effect |
|---|---|---|
| `importRadius` | 1.4 px | Size of import-edge particles |
| `otherRadius` | 0.9 px | Size of hierarchy/contains particles |
| `importColor` | `[253, 224, 71]` | Amber-yellow fill (`#fde047`) |
| `importGlowColor` | `#fbbf24` | Shadow/glow colour |
| `importGlowBlur` | 6 | Ambient glow spread |
| `importGlowBlurActive` | 12 | Glow spread when edge is highlighted |
| `importOpacity` | 0.85 | Fill opacity |
| `importSpeed` | 0.38 | Travel speed (cycles/second) |
| `activeSpeedMultiplier` | 1.6 | Speed boost on selected edges |

# Technical Stack & Architecture

This document details the libraries, runtime tools, and custom algorithms that power the Code Landscape Viewer.

---

## 1. Core Framework & Routing
- **Svelte 5**: Leverages the new runes system (`$state`, `$derived`, `$effect`, `$bindable`, and `$state.snapshot`) for reactive bindings and state management.
- **SvelteKit**: Handles server-side rendering (SSR), layout routing, and backend endpoints.
- **Default App Config**: `src/lib/config/defaults.js` defines the default mode, default focus mode, and local repository presets used by the first-run experience.

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

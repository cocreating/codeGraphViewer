# Upgraded Code Landscape Viewer Walkthrough

We have transformed the static D3 canvas into an immersive, premium 3D constellation viewer featuring:
1. **Continuous 60FPS Render Loop** with custom particle animations representing data flow.
2. **GSAP-powered Interactions** for smooth camera transitions and spring-elastic node hovering/selections.
3. **Interactive 3D Orbit Mode** which projects the repository structure into depth layers.
4. **Independent Drag-and-Drop** physics for both 2D and 3D space, preventing conflicts with zoom/pan behaviors.
5. **Dependency Path Highlighting** which isolates selected node relationships by dimming unrelated files.
6. **Semantic Search & Camera Focus** to easily find and focus on modules within large codebases.
7. **Complexity Heatmap Overlay** which visually encodes file complexity and coupling using size and color-temperature scales.
8. **Slide-Out Glassmorphic Code Previewer** to view syntax-highlighted code contents directly inside the visualization.
9. **Spherical Constellation & Cylindrical Morphing View Modes** to transition nodes smoothly between Tower, Sphere, and Cylinder 3D shapes.
10. **Toggleable Interactive Help Info HUD** to reveal explanations and tips for every UI control as the user moves their cursor.
11. **Repository Overview Dashboard** with project type, stack detection, language breakdown, entry points, health metrics, risk hotspots, and reading path.
12. **Smart File Explorer** with role/risk filters, file-level metrics, graph selection, and deterministic risk ranking.
13. **Navigation Orientation Layer** with breadcrumbs, recent files, pinned files, graph focus modes, and Open in GitHub actions.
14. **Local-First Loading** which opens directly on the CodeGraphViewer local repository example and keeps GitHub analysis available as a secondary mode.
15. **Graph Visualization Orientation Upgrades** with semantic color modes, a minimap, selected-node focus strip, and dynamic legends.
16. **Floating Collapsible Inspector Panel** replacing the fixed sidebar with a glassmorphic overlay that hovers over the canvas and offers tabbed access to Overview, Explorer, Selected, and Nav sections.
17. **In-App Local Folder Browser** — a modal directory navigator that lets users browse their local filesystem to select a repository path without typing it manually.
18. **Graph Visual Refinement** — smaller nodes, wider D3 force spacing, softer edge lines, earlier and pill-backed text labels, and proportional aura glows for a less cluttered canvas.
19. **Configurable Flow Particles** — the amber-yellow glowing electrons (data-flow dots) that travel along edges are fully configurable via the `flowParticles` block in `defaults.js`.

---

## 1. 2D Plane Mode

In 2D Plane Mode, nodes spawn with a staggered entrance and float within a parallax space grid. Tiny glowing energy packets travel along the edges indicating reference/import flows.

![2D Plane Visualization](file:///Users/jasubal/.gemini/antigravity-ide/brain/4e2c3baf-b2ca-4298-8111-90888487e3c7/vite_config_selected_1783209546893.png)

---

## 2. 3D Orbit Mode

Clicking the **3D Orbit** toggle tilts the graph, positioning nodes on depth layers (`Z-axis`) depending on their level in the code hierarchy:
- **Root Node**: Forefront (closest to viewport)
- **Directories & Files**: Mid-depth layers
- **Classes, Exports, & Packages**: Deep background layers

Nodes and connections in the background are scaled down and faded automatically. Panning and zoom pinch operate in 3D, and **dragging the background orbits the camera** horizontally and vertically around the galaxy.

---

## 3. Step 1: Dependency Path Highlighting

When a node is selected (by clicking it directly on the canvas or through search):
- **Selected Node**: Glows with a pulsing neon purple selected boundary ring.
- **Direct Relationships**: Directly connected nodes (imports, folders, etc.) remain fully illuminated at `1.0` opacity.
- **Transitive Relationships**: Secondary connections are visible at a softer `0.65` opacity.
- **Background Noise**: Unrelated modules and connections fade to a dimmed `0.12` opacity, providing perfect structural isolation.
- **Active Flows**: Data packet particles speed up (`1.6x`) on the selected active pathways and are disabled on background paths.

---

## 4. Step 2: Semantic Search & Camera Focus

We have integrated a glassmorphic **Fuzzy Search Bar** inside the visualizer toolbar.
- **Fuzzy Search Matches**: Typing filters files, paths, roles, languages, risk levels, imports, exports, packages, classes, and endpoints reactively, rendering matching results in a glass dropdown with file-type legend dots.
- **Camera Focus Transition**: Selecting any match updates Svelte's selection state and triggers a smooth GSAP camera glide that centers and zooms the viewport directly onto the node.
- **Responsive Flex Layout**: The search bar participates in the header's flexbox, ensuring a clean horizontal alignment next to the mode toggle and zoom controllers.

---

## 5. Step 3: Complexity Heatmap Overlay

Selecting a complexity overlay from the dropdown menu temporarily overrides the visualization's default colors and sizes to reveal code smells instantly:
- **Available Metrics**:
  - *File Size*: Maps the raw size of files in bytes.
  - *Folder Depth*: Maps file layout nesting depth.
  - *Coupling (Imports)*: Maps internal dependency counts.
  - *Risk Score*: Maps deterministic maintenance risk based on size, coupling, dependents, nesting, and sensitive roles.
  - *Complexity Index*: Composite score weighing file size, imports, and classes.
- **Heat Gradient**: File nodes interpolate through a premium HSL heat gradient: Cyan (Low) -> Orange/Amber (Medium) -> Neon Red/Magenta (High).
- **Size Scaling**: File node radii scale dynamically from `6px` to `20px` based on their normalized metric ratio.
- **Background Dimming**: Directories, packages, and code symbols shrink and dim to a neutral slate gray, letting complex files float like glowing fireflies.
- **HUD Screen Legend**: A floating glass card draws at the bottom-right of the screen to display the active metric title and gradient scale. It remains fixed during zoom/pan operations.

---

## 6. Step 4: Slide-Out Glassmorphic Code Previewer

When a file node is selected, a prominent **View Source Code** button is rendered inside the Code Insights Panel. Clicking it slides open a full-height glass drawer:
- **Slide-in Animation**: A smooth GSAP transition slides the drawer from the right edge (`translate3d(100%, 0, 0) -> 0%`) and fades in a dark blurred glass backdrop overlay.
- **Dynamic Secure Fetching**: Svelte requests file contents from `/api/get-file-content` which reads files locally or pulls raw blobs via the GitHub API.
- **Syntax Highlighting**: Uses PrismJS core library to compile code contents into formatted CSS tokens (supporting Svelte, JS, TS, HTML, CSS, JSON, and C-like languages).
- **Scrollable Code View**: A dedicated code wrapper maintains correct line heights, a translucent custom scrollbar track, and responsive text sizing.

---

## 7. Step 5: Spherical Constellation & Cylindrical Morphing View Modes

In 3D mode, the **Layout Selector** dropdown lets users morph the node constellation smoothly between different spatial coordinates:
- **3D Tower Layout**: Arranges nodes by structural type in stacked depth layers, letting force simulation arrange them horizontally.
- **3D Sphere Layout**: Projects the codebase onto a Fibonacci spherical distribution, creating a neat sphere constellation. D3 forces are paused to lock the geometry.
- **3D Cylinder Layout**: Spans nodes in a double-helix cylinder spiral vertically, displaying codebase composition like DNA.
- **GSAP Morphing**: Switching between any layout triggers a 1.35s GSAP animation that smoothly interpolates every node's `(x, y, z)` position. Panning, zooming, and camera orbits remain fully active during and after the morphs.

---

## 8. Interactive Help Info HUD

We have added a toggleable **Interactive Help Info HUD** to assist users in navigating the visualizer:
- **Help Toggle**: A toolbar toggle button activates/deactivates the help card HUD.
- **Dynamic Descriptions**: When active, moving the cursor over any interactive button, select dropdown, tab, dashboard section, explorer control, or sidebar panel displays its dedicated header, function description, and action tips instantly.
- **Fade Transitions**: Features smooth Svelte fade transitions during hovered item switches.
- **A11y Compliant**: Designed with clean ARIA roles to keep HTML tags semantically correct.

---

## 9. Repository Overview Dashboard

After analysis, the sidebar shows an executive repository summary before the detailed node panel:
- **Repository Metadata**: Displays name, description, GitHub link, stars, forks, open issues, license, default branch, and last activity when GitHub metadata is available.
- **Detected Stack**: Infers technologies such as SvelteKit, Svelte, Next.js, Vue, Astro, Express, Laravel, WordPress, Django, Rails, Vite, D3, and GSAP from manifests and conventional files.
- **Project Type**: Classifies the repository as a frontend app, backend API, full-stack app, CLI tool, package/library, monorepo, documentation site, or generic code repository.
- **Health Metrics**: Shows deterministic complexity, import edge count, package count, and analysis coverage.
- **Entry Points & Reading Path**: Suggests the first files to inspect, including README, manifest/config files, framework entry points, important routes, APIs, components, and tests.
- **Risk Hotspots**: Lists files with elevated risk scores and lets the user select them directly in the graph.

---

## 10. Smart File Explorer

The Smart File Explorer turns the graph analysis into a sortable file investigation surface:
- **Role Filter**: Narrows files to architecture roles such as routing, API, components, styles, config, docs, tests, source, and assets.
- **Risk Filter**: Narrows files to low, medium, or high risk based on deterministic scoring.
- **Explorer Search**: Matches file name, path, role, language, imports, and exports.
- **File Metrics**: Shows role, language, size, import count, dependent count, and risk score for each row.
- **Graph Selection**: Clicking any row selects the same node in the graph and triggers the existing focus/highlight behavior.

---

## 11. Navigation Orientation Layer

The Navigation Panel keeps orientation and review actions visible while exploring:
- **Breadcrumbs**: Show the selected path from root through folder and file segments, with clickable parent levels.
- **Quick Actions**: Switch the graph to dependencies, dependents, related files, same-role files, pin the selected node, or open it in GitHub.
- **Graph Focus Modes**: Control what remains emphasized in the canvas: related neighborhood, dependencies, dependents, same architecture role, or all nodes.
- **Recently Viewed**: Tracks recently selected nodes during the current analysis session.
- **Pinned Files**: Lets users keep important files available while jumping around the graph.
- **Insight Quick Actions**: Mirrors the most common relationship actions in the selected-node details panel.

---

## 12. Local-First Loading

The app now starts in Local Repo mode and analyzes the CodeGraphViewer local repository by default:
- **Default Example**: The local CodeGraphViewer path is prefilled and loaded on first mount.
- **Local Repo Selector**: A compact selector switches between the CodeGraphViewer example and a custom local path.
- **Folder Browser**: The Browse button opens an in-app local directory navigator powered by `/api/browse-local`, letting users choose a readable folder and fill the absolute path automatically.
- **Example Action**: The Example button restores and analyzes the known local repository after experimenting with custom paths.
- **GitHub Mode**: GitHub URL analysis remains available from the mode tabs when remote repository exploration is needed.

---

## 13. Graph Visualization Orientation Upgrades

The graph now includes additional visual encodings for architecture and orientation:
- **Color Modes**: The toolbar can color nodes by structural type, architecture role, or risk level.
- **Dynamic Legend**: The legend changes with the selected color mode so color meaning stays explicit.
- **Minimap**: A top-right minimap shows the whole graph, active nodes, and the current viewport rectangle.
- **Selected Node Strip**: A compact overlay keeps the active node name, path, role, risk level, and focus mode visible while zoomed in.

---

## 14. Floating Collapsible Inspector Panel

The static fixed sidebar has been replaced by a **floating glassmorphic inspector** that overlays the bottom-right of the canvas:
- **Always-On-Top Position**: The panel floats over the graph using absolute positioning inside `canvas-stage`, so the full canvas remains explorable behind it.
- **Collapsible Header**: A compact header always shows the selected node (or repo/project name) and an Open/Hide toggle. Collapsing the panel reduces it to the header bar only.
- **Four Tabs**: The inspector body is divided into four independently scrollable sections:
  - *Overview*: Repository summary, detected stack, health metrics, entry points, risk hotspots.
  - *Explorer*: Smart File Explorer with role/risk/search filters.
  - *Selected*: Code Insights Panel for the active graph node (dependencies, exports, endpoints, view code action).
  - *Nav*: Navigation Panel with breadcrumbs, recent files, pinned files, and graph focus modes.
- **Auto-Switch on Selection**: Clicking any node in the graph automatically switches to the *Selected* tab and expands the panel if it was collapsed.
- **Help HUD Integration**: Hovering over the inspector triggers the `floating_inspector` help key, providing contextual tips in the Help Info HUD.

---

---

## 15. In-App Local Folder Browser

A new modal dialog enables navigating the local filesystem without leaving the app:
- **Browse Button**: Added next to the local path input field; opens the folder browser modal pre-seeded with the currently entered path.
- **Root Shortcuts**: The modal header lists quick-jump roots (default repo, home, project directory, Downloads, and filesystem root) resolved by the `/api/browse-local` endpoint.
- **Directory Navigation**: Clicking any listed folder navigates into it. A Back button climbs to `parentPath`. Hidden (`.`) and locked (permission-denied) folders are listed with visual badges but cannot be entered.
- **Use This Folder**: The footer action copies the currently browsed path into the local path input and closes the modal.
- **Backdrop Dismiss**: Clicking outside the modal dialog closes it without changing the path.
- **`/api/browse-local` Endpoint**: A new SvelteKit GET handler at `src/routes/api/browse-local/+server.js` reads `fs.readdirSync` results, filters out build artifacts (`node_modules`, `.git`, `dist`, etc.), checks read permissions via `fs.accessSync`, and returns `{ currentPath, parentPath, roots, entries }` as JSON.

---

## 16. Graph Visual Refinement

The node-and-edge canvas was refined for clarity, airiness, and legibility:

**Node sizes** reduced ~25% across all types:
| Type | Before | After |
|---|---|---|
| root | 16 px | 13 px |
| directory | 10 px | 7.5 px |
| file | 7.5 px | 5.5 px |
| class / export | 5.5 / 4.5 px | 4 / 3.5 px |

**Spacing & forces** expanded significantly:
- Initial scatter radius: 50–110 px → **120–300 px** (nodes start further apart)
- Link distances: hierarchy 30→55, contains 16→28, import 52→**90**
- Charge repulsion: root −150→−280, dir −60→−110, file −32→−**55**
- Collision padding: +4 → +**10** px buffer
- Center gravity strength halved so nodes aren't pulled back together

**Edge lines** softened:
- Hierarchy opacity 4% → 2.5%, contains 8% → 4.5%, import rest 25% → **13%**
- Import active stroke 1.75 px → 1.4 px; arrowheads 5 px → 4 px

**Labels** improved:
- Directory names always visible (like root), regardless of zoom
- File labels appear at `k > 0.9` instead of `k > 1.2`
- Normal font 9 px → **10 px**; directory labels tinted soft teal `#b2f5ea`
- Label offset from node edge 5 px → **7 px**
- Dark pill background `rgba(8,6,18, 0.58)` drawn behind each ambient label for contrast

---

## 17. Configurable Flow Particles

The animated dots travelling along graph edges — called **flow particles** (or data-flow electrons) — are now fully configurable without touching the renderer:
- **Location**: All particle settings live in the `flowParticles` block inside `src/lib/config/defaults.js`.
- **Colour**: Changed from purple (`#a855f7`) to **warm amber-yellow** (`#fde047` fill, `#fbbf24` glow) to be visually distinct from edge lines and node colours.
- **Size**: Import particles shrunk from 2.2 px → **1.4 px**; hierarchy/contains from 1.5 px → **0.9 px** — less visual noise at rest.
- **Glow**: Ambient blur 5 px → **6 px**; active/highlighted blur 8 px → **12 px** for stronger feedback on selected edges.
- **Config keys available**:
  - `importRadius` / `otherRadius` — dot size in canvas pixels
  - `importColor` / `otherColor` — `[r, g, b]` fill array
  - `importGlowColor` / `otherGlowColor` — CSS shadow colour string
  - `importGlowBlur` / `importGlowBlurActive` / `otherGlowBlur` — glow spread
  - `importOpacity` / `otherOpacity` — fill transparency (0–1)
  - `importSpeed` / `otherSpeed` — travel speed in cycles/second
  - `activeSpeedMultiplier` — speed boost when the edge is selected/highlighted

---

## 18. Advanced Semantic & Manual Layouts

We have expanded the visualization options with three additional layouts and sticky drag coordinate anchoring:

### Layout: Sticky Force 2D (`sticky_force`)
- Runs the active D3 physical force simulation but **freezes/locks** dragged nodes permanently in place when released.
- Pinned nodes stay fixed at their custom manual positions (`fx` and `fy` variables remain anchored) while other unpinned nodes continue to react to layout link and collision forces around them.
- A red **"Release Pinned (N)"** button appears in the toolbar when any nodes are frozen, allowing unpinning all nodes at once to return the graph to fluid simulation forces.

### Layout: Concentric Rings (`concentric`)
- Arranges modules in symmetric, structured orbital concentric rings based on node types.
- Center orbit (Radius 0) hosts the project root. Inner orbit hosts external packages. Mid orbit hosts directory containers. Outer orbit fanned out with individual files.
- Provides a clean bird's-eye schematic map of project depth and dependency tiers.

### Layout: Structured Grid (`grid`)
- Groups files neatly in rectangular cells matching their parent directories.
- Draws custom grid boundaries around each folder category with folder name labels in world space.
- Excellent for reading large codebases like standard maps or books, eliminating overlap entirely.

---

## 19. Canvas Label Controls & Zoom Optimization

We introduced on-screen label optimizations and custom header control widgets:

- **Constant Screen-Space Scaling**: Text labels, pill backgrounds, offsets, and corner radii scale inversely by `transform.k` (e.g. `baseFontSize / activeTransform.k`). This keeps the labels at a perfectly consistent on-screen size (9.5px - 11px) at all zoom levels, completely preventing overlapping and text ballooning when zooming in.
- **Interactive Font-Size Scaling (A- / A+)**: Reactive buttons added next to zoom controls allow the user to shrink (`A-`) or enlarge (`A+`) label text sizes between 40% and 250% scale. Tooltips display the current percentage.
- **Custom Label Color Picker**: A native color picker input next to the text controls lets users choose any color theme for the ambient file/module text labels, updating reactively.
- **Precise Help HUD Tooltips**: Dynamic layout-dependent and mode-dependent tooltips now populate the interactive Help Info HUD (e.g., explaining details for specific layouts, metric heatmaps, color modes, and canvas viewport properties on hover).

---

## 20. Restructured Repository Form Layout

- **Single-Row Controls**: Converted the repository source inputs (`.repo-source-row`) and analysis buttons (`.analysis-actions`) to flexbox layouts. Under GitHub mode, the GitHub URL, PAT input, and Analyze submit button sit aligned on a single row.
- **Responsive Layout**: Elements wrap vertically on mobile screens (max-width: 48em) to ensure usability.


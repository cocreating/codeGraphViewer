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

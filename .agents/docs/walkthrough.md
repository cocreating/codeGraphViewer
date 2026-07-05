# Upgraded Code Landscape Viewer Walkthrough

We have transformed the static D3 canvas into an immersive, premium 3D constellation viewer featuring:
1. **Continuous 60FPS Render Loop** with custom particle animations representing data flow.
2. **GSAP-powered Interactions** for smooth camera transitions and spring-elastic node hovering/selections.
3. **Interactive 3D Orbit Mode** which projects the repository structure into depth layers.
4. **Independent Drag-and-Drop** physics for both 2D and 3D space, preventing conflicts with zoom/pan behaviors.
5. **Dependency Path Highlighting** which isolates selected node relationships by dimming unrelated files.
6. **Semantic Search & Camera Focus** to easily find and focus on modules within large codebases.
7. **Complexity Heatmap Overlay** which visually encodes file complexity and coupling using size and color-temperature scales.

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

![3D Orbit Visualization](file:///Users/jasubal/.gemini/antigravity-ide/brain/4e2c3baf-b2ca-4298-8111-90888487e3c7/dash_check_2_1783209575507.png)

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
- **Fuzzy Search Matches**: Typing filters the files, modules, classes, and endpoints reactively, rendering matching results in a floating glass dropdown with file-type legend dots.
- **Camera Focus Transition**: Selecting any match updates Svelte's selection state and triggers a smooth GSAP camera glide that centers and zooms the viewport directly onto the node.
- **Responsive Flex Layout**: The search bar participates in the header's flexbox, ensuring a clean horizontal alignment next to the mode toggle and zoom controllers.

---

## 5. Step 3: Complexity Heatmap Overlay

Selecting a complexity overlay from the dropdown menu temporarily overrides the visualization's default colors and sizes to reveal code smells instantly:
- **Available Metrics**:
  - *File Size*: Maps the raw size of files in bytes.
  - *Folder Depth*: Maps file layout nesting depth.
  - *Coupling (Imports)*: Maps internal dependency counts.
  - *Complexity Index*: Composite score weighing file size, imports, and classes.
- **Heat Gradient**: File nodes interpolate through a premium HSL heat gradient: Cyan (Low) -> Orange/Amber (Medium) -> Neon Red/Magenta (High).
- **Size Scaling**: File node radii scale dynamically from `6px` to `20px` based on their normalized metric ratio.
- **Background Dimming**: Directories, packages, and code symbols shrink and dim to a neutral slate gray, letting complex files float like glowing fireflies.
- **HUD Screen Legend**: A floating glass card draws at the bottom-right of the screen to display the active metric title and gradient scale. It remains fixed during zoom/pan operations.

# Code Landscape Viewer - Interaction & Visuals Roadmap

This document outlines the architecture, accomplishments, and future milestones for the premium 3D Code Landscape visualizer.

---

## 🚀 Accomplished Milestones

### 1. Continuous 60FPS Animation Loop & Parallax Background
- **Implementation**: Replaced standard static D3 canvas rendering with a continuous `requestAnimationFrame` render loop.
- **Effects**:
  - A space-grid parallax background shifts at `0.15x` camera translation speed.
  - Tiny data packets travel along active reference lines to visualize import/dependant flow.

### 2. GSAP Camera Glides & Node Physics
- **Implementation**: Integrated GSAP (GreenSock) for spring-elastic animations.
- **Effects**:
  - Camera glides smoothly to center on selected nodes using a custom Ease curve.
  - Hovering scales nodes to `1.3x` dynamically; selecting scales them to `1.45x`.

### 3. Step 1: Dependency Path Highlighting & Cascading Impact Analysis
- **Implementation**: Calculated immediate and transitive dependency chains when a node is selected.
- **Effects**:
  - The selected node lights up with a pulsing purple neon ring.
  - Direct neighbors stay fully lit (`1.0` opacity).
  - Transitive neighbors render at `0.65` opacity.
  - Unrelated files and folders fade to `0.12` opacity, isolating the impact network.
  - Particles speed up (`1.6x`) on active paths and are disabled on background paths.

### 4. Step 2: Semantic Search & Camera Focus
- **Implementation**: Added a glassmorphic fuzzy-search input to the visualization toolbar.
- **Effects**:
  - Searches match node names and paths.
  - Shows results in a floating glass dropdown.
  - Clicking a result automatically selects the node, glides the camera to focus on it, and triggers the dependency path highlighting.

### 5. Step 3: File Complexity Heatmap Overlay
- **Implementation**: Enabled visual size-scaling and HSL gradient maps based on codebase metrics.
- **Effects**:
  - Support for multiple metrics: File Size (Bytes), Folder Depth, Imports Count, and Composite Complexity Index.
  - Normalizes metric values dynamically using reduce operations.
  - Overrides node size and color dynamically, highlighting complex source files on a glowing Cyan-to-Red gradient, while shrinking directories and packages to a dark neutral slate background.
  - Adds a floating canvas HUD legend panel at the bottom-right corner to show active metric labels and scale.

---

## 📅 Future Milestones

### Step 4: Slide-Out Glassmorphic Code Previewer [PLANNED]
- **Objective**: Allow users to inspect file code directly inside the visualizer without leaving the page.
- **Implementation Plan**:
  1. Design a glassmorphic side-drawer component that slides in from the right edge.
  2. Use GSAP for smooth slide-in transitions.
  3. Load selected file code from the local workspace/GitHub repository.
  4. Add syntax highlighting (e.g., using PrismJS or lightweight Monaco Editor).

### Step 5: Spherical Constellation & Cylindrical Morphing View Modes [PLANNED]
- **Objective**: Morph nodes smoothly between the default hierarchy tree (Tower) and alternative 3D shapes (Sphere, Cylinder).
- **Implementation Plan**:
  1. Add alternative layout position coordinate generators (e.g., spherical coordinate mapping).
  2. Store multiple coordinate targets (`x2d, y2d`, `x3d, y3d, z3d`, `xSphere, ySphere, zSphere`) on each node.
  3. Use GSAP to animate node coordinates `(x, y, z)` dynamically during mode switches, creating a fluid, morphing constellation effect.

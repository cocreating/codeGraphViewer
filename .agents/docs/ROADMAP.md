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
  - Normalizes metric values dynamically.
  - Overrides node size and color dynamically, highlighting complex source files on a glowing Cyan-to-Red gradient, while shrinking directories and packages to a dark neutral slate background.
  - Adds a floating canvas HUD legend panel at the bottom-right corner.

### 6. Step 4: Slide-Out Glassmorphic Code Previewer
- **Implementation**: Enabled side-drawer code loading and PrismJS syntax highlighting.
- **Effects**:
  - Adds a "View Source Code" button in the Code Insights Panel when a file node is selected.
  - Clicking it slides open a full-height glass drawer from the right edge of the viewport.
  - Fetches local or remote files securely, preventing path traversal vulnerabilities.
  - Syntax highlights code dynamically using PrismJS core bundle tomorrow theme.
  - Supports smooth GSAP closing and backdrop click dismissal.

### 7. Step 5: Spherical Constellation & Cylindrical Morphing View Modes
- **Implementation**: Created dynamic coordinate generators for Sphere and Cylinder shapes, and implemented GSAP coordinate interpolation.
- **Effects**:
  - Replaced the simple 3D Orbit toggle button with a glassmorphic View Mode Layout dropdown.
  - **3D Sphere**: Maps node positions onto a Fibonacci spherical distribution, creating a neat sphere constellation. Pauses D3 physics to lock shape.
  - **3D Cylinder**: Spirals node positions along a vertical double-helix cylinder, mapping codebase architecture like DNA. Pauses D3 physics.
  - **GSAP Morphing**: Switching modes triggers a 1.35s GSAP coordinates tween that smoothly morphs the layout.
  - **Interactive Dragging**: Supports direct manual node dragging in Sphere and Cylinder modes without physics interference.

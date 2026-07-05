# Visual Improvements Plan - Step 2: Semantic Search & Camera Glide Focus

We will implement the second visual improvement: **Semantic Search & Camera Glide Focus**. This will add a search input directly to the visualization toolbar. Searching and selecting a node will automatically trigger Svelte's selection state, isolate its dependencies, and glide the camera to focus on it.

## Proposed Changes

### Styles System

#### [MODIFY] [app.css](file:///Users/jasubal/AllMyCoding/CodeGraphViewer/src/app.css)
- Add CSS styles for the glassmorphic search input (`.search-input`), result dropdown container (`.search-dropdown`), result buttons (`.search-item`), and label truncations.

---

### Visualization Component

#### [MODIFY] [GraphCanvas.svelte](file:///Users/jasubal/AllMyCoding/CodeGraphViewer/src/lib/components/GraphCanvas.svelte)
We will make the following changes:

1. **State & Derived Runes**:
   - Add `$state` runes for `searchQuery` and `searchFocused`.
   - Add a Svelte 5 `$derived` rune `searchMatches` that filters `graphData.nodes` by matching node names.
2. **Select Handler**:
   - Implement `handleSelectMatch` that calls the parent selection callback `onSelectNode` and clears the search input.
3. **Toolbar UI Markup**:
   - Insert the glassmorphic search input and floating results dropdown in `visualizer-header`.

## Verification Plan

### Automated Tests
- Build and run the project (`npm run build`).

### Manual Verification
- Load the visualizer in the browser.
- Type in the search box (e.g., "server" or "app.css").
- Verify:
  - The drop-down displays matching items with matching icons.
  - Clicking an item selects it, dims the rest of the graph, and centers the camera on it.
  - Pressing Enter or clicking elsewhere hides the dropdown.

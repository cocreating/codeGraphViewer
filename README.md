# Code Landscape Viewer

Interactive GitHub and local repository visualizer for exploring project structure, imports, architecture roles, code insights, and maintenance risk.

## Features

- Analyze public GitHub repositories or local directories.
- Render a zoomable Canvas/D3 graph of folders, files, imports, packages, classes, exports, and API endpoints.
- Switch between 2D, 3D tower, sphere, and cylinder graph layouts.
- Search files, paths, roles, languages, risk levels, imports, exports, and endpoints.
- Inspect selected-node dependencies, dependents, impact radius, classes, exports, and endpoints.
- Open source files in a syntax-highlighted code drawer.
- View deterministic repository intelligence:
  - detected stack and project type
  - language breakdown
  - likely entry points
  - main folders
  - important files
  - health metrics
  - risk hotspots
  - suggested reading path
- Use the Smart File Explorer to filter by role, risk, path, imports, exports, and file metrics.
- Navigate with breadcrumbs, recently viewed files, pinned files, graph focus modes, and Open in GitHub actions.
- Enable Interactive Help Mode for contextual explanations of graph controls, dashboard sections, and explorer filters.

## Tech Stack

- SvelteKit and Svelte 5
- D3 force simulation and zoom
- Canvas 2D renderer
- GSAP transitions
- PrismJS syntax highlighting

## Development

```sh
npm install
npm run dev
```

Open the local URL printed by Vite.

## Build

```sh
npm run build
```

Preview the production build with:

```sh
npm run preview
```

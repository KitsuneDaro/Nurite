# Nurite

Nurite is a browser-based painting application built with React, TypeScript, Three.js, and WebGL shaders. It runs locally in the browser; project files are imported and exported on the client without a server.

GitHub Pages: <https://kitsunedaro.github.io/Nurite/>

## Requirements

- Node.js `^20.19.0` or `>=22.12.0` (the Pages workflow uses Node 22)
- npm
- A browser with WebGL support for the drawing canvas

Install dependencies and start the development server:

```sh
npm ci
npm run dev
```

Other useful commands:

```sh
npm run build    # TypeScript project build and Vite production build
npm run lint     # Oxlint
npm run preview  # Serve the production build locally
```

There is currently no test script. Run the build and lint commands after code changes.

## Features

- 1024 × 1024 paint canvas with round and flat brushes, normal and oil paint, eraser, and eyedropper.
- Hold the right mouse button over the canvas to temporarily use the eyedropper; the color is sampled on release, and releasing outside the canvas leaves the color unchanged.
- Brush size, brush direction following, color picker, editable color palette, and palette drag-and-drop ordering.
- Undo/redo history, canvas zoom and touch pinch zoom.
- Local `.nrt` project save/load and PNG export.
- Canvas texture debug views.
- Responsive desktop and mobile panels.

Some brush and paint options are intentionally disabled in the UI while under development. The available options and labels are defined in [`src/constants/paint.ts`](./src/constants/paint.ts) and their enabled states are configured in [`src/components/Tools/ToolsPanel/ToolsPanel.tsx`](./src/components/Tools/ToolsPanel/ToolsPanel.tsx).

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `Ctrl+S` / `Cmd+S` | Save project |
| `Ctrl+L`, `Ctrl+O` / `Cmd+L`, `Cmd+O` | Open project |
| `Ctrl+E` / `Cmd+E` | Export canvas image |
| `Ctrl+N` / `Cmd+N` | Create a new canvas |
| `Ctrl+D` / `Cmd+D` | Toggle texture debug mode |
| `Ctrl+Z` / `Cmd+Z` | Undo |
| `Ctrl+Shift+Z`, `Ctrl+Y` / `Cmd+Shift+Z`, `Cmd+Y` | Redo |
| `B` | Brush |
| `E` | Eraser |
| `S` | Eyedropper |
| `L` / `J` | Increase / decrease brush size by 1 px |
| `U` / `O` | Select previous / next palette color (wraps at either end) |
| `1`–`9` | Select palette colors 1–9 |
| `Tab` / `Shift+Tab` while navigating palette swatches | Focus and select the next / previous swatch |

Single-letter shortcuts are disabled while typing in text fields. Palette navigation works regardless of which UI control has focus. Project shortcuts retain their normal behavior, while text-field undo/redo remains under browser control. NEW and LOAD keep their unsaved-work confirmation.

## Project layout

```text
src/
  App.tsx                         Application state and top-level event wiring
  types.ts                        Shared brush, tool, and drawing types
  constants/paint.ts              Initial palette and brush/paint option definitions
  stores/paletteStore.ts          Persisted palette colors and selected swatch
  components/
    TopBar/                       Project name, NEW/SAVE/LOAD, image export
    Tools/                        Brush, paint, direction, tool, and history controls
    Color/                        Color picker, palette, and brush-size controls
    Canvas/
      CanvasToolbar/              Zoom and texture debug controls
      CanvasWorkspace/            Canvas interaction, pointer/touch, and stroke input
      ThreeCanvas/                Three.js renderer, shaders, history, and project files
  utils/
    ZipArchive.ts                 Client-side ZIP archive reader/writer
    canvasFileName.ts             Default and sanitized canvas filenames
    color.ts                      HSL/hex conversion
```

## Design and code map

### Application and UI state

[`src/App.tsx`](./src/App.tsx) coordinates the main canvas, tool and color panels, project operations, and unsaved/saved state. Keep presentation and specialized interactions in their corresponding components rather than adding UI internals here.

- [`src/components/TopBar/TopBar.tsx`](./src/components/TopBar/TopBar.tsx): project name/status, unsaved confirmation before NEW or LOAD, project save/load actions, and image export action.
- [`src/components/Tools/ToolsPanel/ToolsPanel.tsx`](./src/components/Tools/ToolsPanel/ToolsPanel.tsx): composes brush, paint, tool, direction, and undo/redo controls.
- [`src/components/Color/ColorPanel/ColorPanel.tsx`](./src/components/Color/ColorPanel/ColorPanel.tsx): composes color picker, palette, and brush-size controls.
- [`src/stores/paletteStore.ts`](./src/stores/paletteStore.ts): Zustand store persisted in browser local storage. Palette changes are also included in project files.
- [`src/components/MobilePanelNav/MobilePanelNav.tsx`](./src/components/MobilePanelNav/MobilePanelNav.tsx): mobile panel navigation.

### Drawing pipeline

- [`src/components/Canvas/CanvasWorkspace/CanvasWorkspace.tsx`](./src/components/Canvas/CanvasWorkspace/CanvasWorkspace.tsx) handles pointer/touch events, eyedropper selection, panning/zoom gestures, and the ThreeCanvas host.
- [`src/components/Canvas/CanvasWorkspace/useCanvasStroke.ts`](./src/components/Canvas/CanvasWorkspace/useCanvasStroke.ts) converts pointer input to drawing points/segments. Direction-following flat/square strokes resample input at a 2 px interval to avoid unstable rotation from uneven pointer events.
- [`src/components/Canvas/ThreeCanvas/ThreeCanvas.tsx`](./src/components/Canvas/ThreeCanvas/ThreeCanvas.tsx) exposes the renderer operations to React through a typed imperative handle.
- [`src/components/Canvas/ThreeCanvas/CanvasDrawingRenderer.ts`](./src/components/Canvas/ThreeCanvas/CanvasDrawingRenderer.ts) owns the WebGL rendering pipeline and coordinates its rendering helpers.
- [`src/components/Canvas/ThreeCanvas/rendering/`](./src/components/Canvas/ThreeCanvas/rendering/) contains texture copy, oil-surface map, display, and drawing-bound helpers.
- [`src/components/Canvas/ThreeCanvas/shaders/`](./src/components/Canvas/ThreeCanvas/shaders/) contains the brush coverage/distance, segment metadata, square brush, oil surface, and debug shader code. [`CanvasDrawingShader.ts`](./src/components/Canvas/ThreeCanvas/CanvasDrawingShader.ts) composes shader sources for the renderer.
- [`src/components/Canvas/ThreeCanvas/CanvasConstants.ts`](./src/components/Canvas/ThreeCanvas/CanvasConstants.ts) defines the 1024 px canvas size and stroke segment limit.

The renderer stores the canvas as five RGBA textures: metadata, color, and three drawing-state textures. See [`CanvasProjectFile.ts`](./src/components/Canvas/ThreeCanvas/CanvasProjectFile.ts) for the corresponding project texture names and [`CanvasDrawingRenderer.ts`](./src/components/Canvas/ThreeCanvas/CanvasDrawingRenderer.ts) for render-target use.

### Undo/redo

[`src/components/Canvas/ThreeCanvas/CanvasTextureHistory.ts`](./src/components/Canvas/ThreeCanvas/CanvasTextureHistory.ts) maintains texture snapshots per stroke in a six-slot ring, allowing up to five undo steps. History is stroke-based, not point-based. Importing or resetting a project replaces the history snapshots.

### Project files and browser storage

[`src/components/Canvas/ThreeCanvas/CanvasProjectFile.ts`](./src/components/Canvas/ThreeCanvas/CanvasProjectFile.ts) defines the project manifest, validates project settings/textures, and serializes project data. The `.nrt` extension is a ZIP archive; the archive contains `project.json` and five files in `textures/`. The internal format identifier is `webpainter-project`, currently version `2`; version 1 projects are migrated on load to the signed centered coordinates used by drawing-state A.

[`src/utils/ZipArchive.ts`](./src/utils/ZipArchive.ts) implements ZIP reading/writing in the browser. Do not introduce server calls for project save/load unless the product requirements change.

The selected palette and palette edits persist in browser local storage through Zustand. Project files independently capture the palette as it was when saved.

### Deployment

- [`vite.config.ts`](./vite.config.ts) sets Vite's `base` to `/Nurite/` for the project Pages site. If the repository/site path changes, update this value.
- [`index.html`](./index.html) contains document metadata and uses `%BASE_URL%` for the favicon URL.
- [`.github/workflows/node.js.yml`](./.github/workflows/node.js.yml) builds on pushes and pull requests to `main`; pushes to `main` upload `dist` and deploy it using GitHub Pages Actions.
- GitHub repository Pages settings must use **GitHub Actions** as the deployment source.

The Vite 8/Rolldown toolchain requires Node `^20.19.0 || >=22.12.0`; Node 18 is unsupported. The production build may emit a chunk-size advisory for the Three.js/WebGL application bundle. Analyze bundle composition before raising the warning limit.

## Working on the codebase

- Follow the existing component boundaries and shared types in `src/types.ts`.
- Preserve canvas texture dimensions, formats, and channel semantics; these are consumed by shaders and project serialization.
- When changing persisted palette data or the `.nrt` manifest, consider existing browser data and saved files.
- Test visual changes in both desktop and mobile layouts. Test drawing/history changes in a browser with WebGL.
- For a deployable change, verify `npm run build`, `npm run lint`, and the GitHub Actions Pages deployment.

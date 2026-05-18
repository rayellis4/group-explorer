# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Group Explorer 3.6 is a web-based visualization app for abstract algebra (group theory). It runs entirely in the browser with no build step — JS files are served in place as ES6 modules.

## Commands

### Type Checking (Flow)
```bash
npx flow                    # run Flow type checker
npx flow check js/Foo.js    # check a specific file
```
Flow is used primarily as inline documentation — type annotations clarify intent and data shapes. It rarely catches outright errors in practice (especially around JSON, which is inherently loosely typed).

Known debt: serialized JSON uses `type` or `class` discriminator fields inconsistently across the codebase — avoid adding more variants until this is resolved.

### Build (version stamping only)
```bash
make           # stamps GIT version into HTML pages and package.json
make clean     # remove backup files
```

### Tests
Tests are browser-based (Mocha + Chai via CDN). Open in a browser served over HTTP:
- `UnitTests.html` (root) — main test runner, imports from `tests/`
- `tests/UnitTests.html` — same file, must be accessed via HTTP (not `file://`)

Individual test files: `tests/BitSet_Tests.js`, `tests/GEUtils_Tests.js`, `tests/MathUtils_Tests.js`, `tests/Group_Tests.js`, `tests/Subgroup_Tests.js`, `tests/DefiningRelations_Tests.js`

To serve locally:
```bash
python3 -m http.server 8080   # then open http://localhost:8080/UnitTests.html
```

### Flow Type Generation (from three.js TypeScript defs)
```bash
npm run build:flowtypes
```

## Architecture

### MVVM Pattern

All visualizers (CycleGraph, Multtable, CayleyDiagram, SymmetryObject) follow a layered MVVM structure:

- **Model** (`js/*Model.js`) — visualizer state + `Group` reference, serializes via `toJSON`/`fromJSON`. E.g., `CycleGraphModel.js`, `MulttableModel.js`.
- **View** (`js/*View.js`) — rendering only (canvas/WebGL). E.g., `CycleGraphView.js`, `MulttableView.js`.
- **ViewUI** (`js/*ViewUI.js`) — gesture/input handling on top of a View. E.g., `CycleGraphViewUI.js`.
- **ViewModel** — lives inside control components like `HighlightControl.js`; mediates between Model and View.
- **Controller** (`js/CycleGraph.js`, `js/Multtable.js`, etc.) — essentially page factories: they orchestrate the model, view, and control pieces into a standalone visualizer page. The underlying pieces (Model, View, HighlightControl, etc.) are the same ones `Sheet*` assembles directly, without going through the page controller.

Pub/sub between layers uses `createModelProxy` from `js/GEUtils.js`, which returns a `SubscriptionProxy` wrapping the model — views subscribe and get notified on model changes.

**The Model serves a dual role**: it is both the MVVM reactive state and the serialization DTO for the Sheet system. `Sheet.html` embeds visualizations and can open a visualizer page (e.g. `CycleGraph.html`) as an editor; the complete display state is passed back and forth as the Model's JSON. This dual role is intentional — the Sheet's representation of a visualization *is* the model state, so splitting them would add ceremony without benefit.

**`highlightControl` is an opaque plugin slot**: when `HighlightControl` wires itself to a model, it registers itself in `model.highlightControl`. The model never inspects this field — it just carries it through `toJSON`/`fromJSON`. Each control component owns its own serialization slot; the controller doesn't need to know about them. The field type is `any` in Flow, reflecting this intentional opacity.

### Sheet System

`Sheet.html` is the most mathematically significant page in the application — it is where relationships *between* groups are shown, specifically homomorphisms (structure-preserving maps). The standalone visualizer pages show properties of a single group; Sheet is where group theory at the level of morphisms lives.

**Current state:** `SheetModel.js` is mid-refactor — not yet proper MVVM. Element classes hold direct view references and actively drive them (`redraw()`, `updateTransform()`, `updateZ()`). `addElement()` creates model and view together. Module-level global `sheetElements` Map rather than a class. `SheetViewUI.js` acts as a controller but isn't named as one.

**Target MVVM architecture:**

- **Model** — owns `sheetElements: Map<id, SheetElement>`, pure data: id, position (x,y,w,h,z), element type, and for visualizer elements an opaque `visualizer` JSON blob. No view references.
- **ViewModel** — mediates model↔view; drives view additions/removals on model changes. Clear must be sequenced explicitly: ViewModel calls `view.clear()` *before* clearing the model map — the subscription notification arrives after the map is already empty, too late for the view to know what to tear down.
- **View** (`SheetView`) — owns `elementViews: Map<id, SheetViewElement>`, the view-side parallel tracking map. Owns all live visualizer objects (canvases, WebGL contexts). Draws morphism arrows by computing endpoints from `unitSquarePositions` of source/destination visualizer view elements — no model involvement in geometry. CDElement WebGL context time-sharing (`activeElement`, `moveVisualizerToThis`) belongs here.
- **Control panel** (right-hand panel) — pure controller: manipulates model only, never touches view directly. Add element/visualizer → appends to `sheetElements`. Clear → coordinated clear (view first, then model). Import/Load → `fromJSON()`. Export/Save → `toJSON()`.

**Single entry point:** `fromJSON()` on the Model is the common path for all sheet data — control panel Import (textarea JSON paste), IndexedDB Load, and external generators (SolvableInfo, GroupInfo, etc.) all call it. It clears existing state then populates `sheetElements`.

**Element types:** NodeElements (CGElement/MTElement/CDElement visualizers, TextElement, RectangleElement) and LinkElements (ConnectingElement, MorphismElement). Each has its own editor: visualizer elements open the full visualizer page in a new browser tab (`?SheetEditor=true`) with changes posted back via `postMessage` as the user interacts; all other element types use inline dialogs on the Sheet page.

**CDElement WebGL constraint** (load-bearing, not a design lag): browsers support ~16 WebGL contexts; a sheet may contain dozens of Cayley diagrams. All CDElements share one renderer via `activeElement`/`moveVisualizerToThis()` time-sharing, caching inactive state as JSON. This constraint must be preserved in any refactor — it moves from model to view side, but stays.

**`visualizer` blob is opaque to Sheet** — the Model never inspects its contents. The stable interface Sheet needs from each visualizer: `groupURL`, `highlightColors` (read by MorphismView for many-arrows coloring and by generators for initial highlights), `toJSON()`/`fromJSON()`, `setSize()`.

**Sheet ↔ Editor roundtrip:** `SheetEditor.js` handles both sides of the cross-tab edit using `window.postMessage`; `toJSON()` is the wire format crossing the tab boundary. The CayleyDiagram editor currently polls rather than diffs — camera state is internal to THREE and not well-captured by `toJSON()`.

**Serialization cleanup needed:**
- Redundant top-level `groupURL` in VisualizerElement (already inside `visualizer` blob)
- `isShareable` in CDElement — WebGL optimization that leaks into persistent format
- `displayNeedsTextUpdate: false` in TextElement — runtime flag, not persistent state
- `diagram_name: null`, `chunk: null`, `highlightControl: null` — absent optionals cluttering JSON
- z-index values are artifact of insertion-order formula, not meaningful as stored values

### Core Data Layer

- `js/Group.js` — the central `Group` class holding the multiplication table, subgroups, conjugacy classes, element orders, etc.
- `js/Library.js` — manages the group library in `localStorage`; groups are loaded from `groups/*.group` XML files via HTTP and cached as `Group` objects.
- `js/BitSet.js` — fixed-size bit array (Uint32Array-backed) used throughout for element sets, subgroup membership, etc.
- `js/SubgroupLattice.js` / `js/Subgroup.js` — subgroup computation.
- `js/DefiningRelations.js` — group presentations and relations.

### Visualizer Pages

| Page | HTML | JS Controller | Model | View |
|---|---|---|---|---|
| Group Library | `GroupExplorer.html` | `js/GroupExplorer.js` | — | thumbnails via View factories |
| Cycle Graph | `CycleGraph.html` | `js/CycleGraph.js` | `CycleGraphModel.js` | `CycleGraphView.js` |
| Mult. Table | `Multtable.html` | `js/Multtable.js` | `MulttableModel.js` | `MulttableView.js` |
| Cayley Diagram | `CayleyDiagram.html` | `js/CayleyDiagram.js` | — | `CayleyDiagramView.js` (Three.js) |
| Symmetry Object | `SymmetryObject.html` | — | — | Three.js-based |
| Group Info | `GroupInfo.html` | `js/GroupInfo.js` | — | — |
| Sheets | `Sheet.html` | `js/Sheet.js` | `js/SheetModel.js` | `js/SheetView.js` |

### Shared Controls

- `js/ControlPanel.js` — sliding control panel shared by all visualizers; builds button tabs from `data-button` attributes on child `<div>`s.
- `js/HighlightControl.js` — subset/highlighting management (MVVM internally); used by all visualizers.
- `js/Gestures.js` — unified touch+mouse gesture recognition (select, drag, zoom, context menu).
- `js/UIComponents.js` — `makeFixedMenu`, `makeDetachedMenu`, `makeDialog` helpers.
- `js/MathML.js` — renders MathML group element labels.

### External Libraries

- Three.js r170 is vendored locally in `lib/three-170/`. Import via `lib/externals.js`:
  ```js
  import {THREE} from '../lib/externals.js'
  ```
- jQuery is not used in production code.

### Documentation / Flow Source Files

The `docs/` directory contains `*.js.md` files — these are the **actual source files**. The corresponding `js/` files are **symlinks** to them (e.g. `js/CycleGraphModel.js` → `docs/CycleGraphModel.js.md`), so the browser loads the same file that Flow type-checks. Editors that follow symlinks (e.g. Emacs) will transparently edit the `docs/` target regardless of which path is opened. The `.flowconfig` ignore list excludes files not yet fully Flow-annotated — they're commented out incrementally as annotation work progresses, to avoid an overwhelming error count. Note: git does not handle symlink↔regular-file type changes gracefully within a single commit; take care when adding new `js/`↔`docs/` pairs.

## Coding Style

Based on recent code (`js/HighlightControl.js`, `js/CycleGraphModel.js`, etc.):

- **Indentation**: 3 spaces
- **Prefer**: `const` > `let` > `var`
- **Naming**:
  - variables (local, instance, module-level): `camelCase`
  - true constants: `SNAKE_CASE` (e.g., `DEFAULT_MIN_CANVAS_HEIGHT`, `HIGHLIGHT_BACKGROUND`)
  - functions: `camelCase`
  - classes: `CamelCase`
  - HTML attribute values: `kebab-case`
- **Functions**: space between name and `(` in declaration, not in invocation — `function doThing (arg) {` / `doThing(arg)`
- **Private class members**: ES2022 `#field` / `#method()` syntax preferred; use `_field` prefix instead when the field needs to participate in serialization (since `#` fields are inaccessible outside the class)
- **No jQuery** in production code — use DOM APIs directly; jQuery appears only in the test runner HTML (`tests/UnitTests.html`) via CDN
- **Flow annotations**: all `.js` files begin with `// @flow` or `/* @flow`; inline type annotations use `/*: type */`; Flow-only blocks use `/*:: ... */`

### Style direction during refactor

The codebase mixes OO and functional styles intentionally, by layer:

- **Model layer** stays OO — class instances with persistent identity, pub/sub, and `toJSON`/`fromJSON` serialization are a natural fit for objects.
- **View/ViewUI layer** is being migrated toward functional style as modules are touched — closures for event handler state, module-level singletons instead of static classes, transformations expressed as functions rather than methods.
- **ViewModel** sits in between and may stay closer to OO since it manages stateful subscription handles; individual operations within it can still be written functionally.

Partly-migrated View modules are intentional — not all code has been reached yet. Don't interpret the inconsistency as an invitation to unify in either direction.

## Logging

`js/Log.js` exports `debug`, `info`, `warn`, `err` functions. Log level is set via URL params `?log=debug` or programmatically via `Log.setLogLevel('debug')`. Default log level is `warn`, default alert level is `err`.

To avoid evaluating expensive arguments when the level is inactive, pass a thunk for costly messages:
```js
Log.debug('simple message')                          // string fine for cheap messages
Log.debug(() => `expensive ${JSON.stringify(obj)}`)  // thunk: only evaluated if debug is active
```

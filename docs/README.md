# Group Explorer 3.7 — Developer Overview

*Group Explorer* is interactive visualization software for abstract algebra — specifically finite
group theory. It runs entirely in the browser, requires no installation, and is designed for
students and instructors building intuition about groups and their structure. (See the root
[README](../README.md) for the user-facing feature tour.)

This document is the developer-facing counterpart: how the codebase is organized, how its pieces
fit together, and a catalog of every module with a link to its source.

## General Organization

- A client-side web app with **no active backend** — everything runs in the browser. Static
  hosting is sufficient; there's nothing to deploy but files.
- **Seven interactive application pages**, each a standalone visualizer or tool, plus an
  initial landing page (`index.html`) and citation info (`citing.html`):
   * Group Library (`GroupExplorer.html`)
   * Cycle Graph (`CycleGraph.html`)
   * Multiplication Table (`Multtable.html`)
   * Cayley Diagram (`CayleyDiagram.html`)
   * Symmetry Object (`SymmetryObject.html`)
   * Group Info (`GroupInfo.html`)
   * Sheets (`Sheet.html`)
- Written in **TypeScript**, compiled by `tsc` straight to ES2022 JavaScript modules with no
  bundler — the compiled `js/*.js` files are what the browser loads directly, unbundled. See
  [ADR 001](./adr/001-type-annotation-policy.md) for why TypeScript over the Flow annotations the
  project used previously.
- A separate, unrelated MkDocs site (`help-src/` → `help/`) hosts *user-facing* help pages available
  in the app. Do not confuse them with this developer documentation.

## File Organization

| Path | Contents |
|---|---|
| `/` (repo root) | Landing page (`index.html`), citation info (`citing.html`), project `README.md`, and the seven generated `PAGE.html` files (see [Commands](#commands)) |
| `ts/` | TypeScript source — the actual source of record for application code |
| `js/` | Compiled output (`.js` + `.js.map`); committed to git so deployment needs no build step |
| `docs/` | This developer documentation, plus one `*.ts.md` symlink per `ts/*.ts` file (see below) and `docs/adr/` |
| `docs/adr/` | Architecture decision records |
| `tests/` | Unit tests (Mocha + Chai) — run headless via `npm test` or in a browser through `UnitTests.html`; `tests/node/` holds the headless environment shims |
| `groups/` | Group library `.group` JSON data files |
| `fgb_groups/` | Group library data files for groups 22 < \|G\| < 40 (deprecated, replaced by extended definitions in [AutoUpgrade](./AutoUpgrade.ts.md)) |
| `help-src/`, `help/`, `help-style/` | MkDocs source, build output, and theme for the user-facing help site |
| `style/`, `images/`, `fonts/`, `html/` | Static assets shared across pages |
| `lib/` | Vendored external libraries (Three.js) |
| `notes/` | Miscellaneous developer notes |

## Commands

- **`make VERSION=x.y.z`** — the full build: regenerates all seven `PAGE.html` files from
  `html/PageTemplate.html`, stamps the version into `README.md`/`index.html`/`package.json`
  consistently, compiles TypeScript (`npx tsc`), then runs `checkCodeFiles` (see [Things That Must
  Stay In Sync](#things-that-must-stay-in-sync)). Run without `VERSION=` to build/compile without
  touching the version. See the comments in [`makefile`](../makefile) before hand-editing a
  `PAGE.html` file or a version string directly — both are generated/kept-in-sync by this target
  and will be overwritten or drift out of sync otherwise.
- **`make checkCodeFiles`** — on its own, checks `js/*.js` against `AutoUpgrade`'s `codeFiles`
  list without doing a full build.
- **`make clean`** — remove editor backup files (`*~`).
- **`npx tsc -p .`** — compile TypeScript only, once.
- **`npx tsc --watch`** — incremental compile on save; the practical edit-debug loop day to day.
- **Tests** (`tests/*_Tests.js`, Mocha + Chai) run two ways from the same source files:

  - **Headless — `npm test`.** One-time setup: `npm install` (pulls the test-only devDeps —
    `mocha`, `chai`, `fake-indexeddb`, `linkedom`, `c8`, `three`). Then `npm test` runs the whole
    suite in Node. `tests/node/setup.mjs` and `tests/node/setup-library.mjs` (wired in via
    `.mocharc.json`) stand up just enough of a browser — a linkedom DOM, a `fake-indexeddb`, an
    in-process static file server over the repo root — then call
    [`AutoUpgrade.refreshGroupLibrary`](./AutoUpgrade.ts.md), the same routine `initialize()` runs
    on a version bump, to populate the library (base **and** extended, order 22–40). So the
    `*_Tests.js` files run unmodified against a real load path. Results print to the terminal
    (`N passing` / `N failing`, with a stack per failure). The headless run is currently fully
    green and matches the browser run.
    - **One file / one test** — `npx mocha tests/Foo_Tests.js` (the `.mocharc.json` require hooks
      still apply; the spec glob lives in the `npm test` script, so it isn't merged in), or
      `npm test -- --grep '<pattern>'` to filter by name across the whole suite.
    - **Watch** — `npm run test:watch` re-runs on save.
    - **Coverage** — `npm run coverage` runs the suite under `c8` (config in `.c8rc.json`),
      printing a per-file table mapped back through source maps to `ts/*.ts` lines and writing a
      drill-down HTML report to `coverage/index.html` (gitignored). `--all` is on, so every module
      appears — untested ones at 0% — the table skips 100%-covered files and shows full
      uncovered-line ranges, and the HTML report is the one to open for line-by-line detail.
      `npm run coverage:one -- tests/Foo_Tests.js` scopes the run to one test file and reports
      only the modules it actually loaded.
  - **In a browser — `tests/UnitTests.html`.** Serve the repo over HTTP and open it; this is the
    reference run for anything depending on real layout or WebGL. To exercise the
    `DefiningRelations` tests, load `GroupExplorer.html` first so the group library is in
    IndexedDB.
    ```bash
    python3 -m http.server 8080   # then open http://localhost:8080/.../group-explorer/tests/UnitTests.html
    ```
    or
    ```bash
    npm install -g http-server
    http-server                   # then open http://localhost:8080/.../group-explorer/tests/UnitTests.html
    ```
- **`mkdocs build`** / **`mkdocs serve`** — build or live-preview the separate user-facing help
  site (`help-src/` → `help/`; config in `mkdocs.yml` at the project root). `mkdocs serve` watches
  for changes at `127.0.0.1:8989`.

Primary development happens on Linux, but the `makefile` also needs to run unmodified on macOS —
some contributors build and test there. Its shell commands stick to a GNU/BSD-portable subset
(notably `sed`, where the two implementations disagree on in-place editing and multi-line-command
syntax); see the comments above `setVersion` in [`makefile`](../makefile) for the specific idiom.
Keep that in mind before adding a GNU-only convenience to a `make` recipe.

## Things That Must Stay In Sync

A handful of couplings between files aren't visible from reading any single one of them — miss
these and a change can look complete while silently breaking something later:

- **Adding a compiled module** → add its `js/*.js` path to the `codeFiles` list in
  [AutoUpgrade](./AutoUpgrade.ts.md). That list drives the cache-busting refetch on a version
  bump; leave a module out and a returning user's browser can keep serving a stale cached copy of
  it after upgrading everything else. This one's now caught automatically — `make`/
  `make VERSION=x.y.z` runs `checkCodeFiles` and fails the build if `js/*.js` and `codeFiles`
  have diverged — but it's listed here because it's exactly the couplings this section exists
  for, and the check only runs if you remember to build through `make`.
- **Adding a new application page** → add it to the `PAGES` list in [`makefile`](../makefile), or
  `make VERSION=x.y.z` won't generate or version-stamp its `PAGE.html`.
- **Adding a new node-element visualizer type to Sheet** → add it to
  `RemoteEditor.#editPageURLs` in [SheetModelEditors](./SheetModelEditors.ts.md), which maps each
  element type to the standalone page that edits it (e.g. `CDElement` → `CayleyDiagram.html`).
- **Adding a new field to a visualizer model** → add it to the `SHEET_UPDATE_FIELDS` array in
  the visualizer factory (e.g., [`CayleyDiagram.ts`](./CayleyDiagram.ts.md)) to make an update
  to that field trigger a change broadcast.
- **Adding a test file** (`tests/*_Tests.js`) → also add an `import` line for it in
  `tests/UnitTests.html`'s module `<script>`. `npm test` finds it by glob, but the browser run
  has an explicit import list and will silently skip a file that's missing from it.

This list is what's turned up in practice, not the result of a deliberate audit — treat it as a
starting point, not a complete one, and add to it when another one surfaces.

## Architecture

### Storage

Persistence uses IndexedDB via [StoredObjects](./StoredObjects.ts.md) (database `GE3`) to save
the group library, user settings, table configuration, and saved sheets between sessions.

In addition to IndexedDB data, there is a single entry `GE-version` in localStorage used by
[AutoUpgrade](./AutoUpgrade.ts.md) to determine whether to perform an upgrade.

There's no server-side storage anywhere in the app.

### Inter-page communication

Pages are otherwise independent, but two narrow channels connect them:

- **`BroadcastChannel('GE3-channel')`** — [Library](./Library.ts.md) and [Settings](./Settings.ts.md)
  broadcast group-library and settings changes to every open tab, so e.g. the Group Library page
  can refresh its listing when a group is added elsewhere.
- **`window.postMessage`** — the Sheet ↔ visualizer-editor roundtrip. `Sheet.html` can open a
  visualizer page (e.g. `CayleyDiagram.html`) in a new tab as an editor
  (`?SheetEditor=true`); [SheetEditor](./SheetEditor.ts.md) and
  [SheetModelEditors](./SheetModelEditors.ts.md) carry edits back as the user interacts.

In addition, the pages share the IndexedDB database; and one page can open another and pass it
parameters through its URL.

### Version upgrades

Each `PAGE.html` embeds its build version in a `<meta name="GE3-GITVersion">` tag, stamped by
`make VERSION=x.y.z` (see [Commands](#commands)). On load, [AutoUpgrade](./AutoUpgrade.ts.md)'s
`initialize()` compares that to the last-seen version cached in `localStorage['GE-version']`:

- **Versions match** — load the group library and settings from local storage as usual.
- **Versions differ** — re-fetch every application `.js`/`.html`/`.css` file with `cache: 'reload'`
  (bypassing the browser cache so stale code can't linger), refresh the group library from the
  server manifest, reload the extended-library manifest, then update `localStorage['GE-version']`
  to match.

That covers code and the group library, but not saved sheets — those carry their own, independent
format version in [SheetSerialization](./SheetSerialization.ts.md) (`CURRENT_FORMAT`, currently
`2`), which upgrades a stored sheet to the current format whenever it's read, regardless of
whether the page version changed.

### MVVM pattern

The large visualizer pages (Cycle Graph, Multiplication Table, Cayley Diagram, SymmetryObject),
the Sheet page, and the Group Info page share a layered MVVM structure:

- **Model** (`*Model.ts`) — visualizer state plus a `Group` reference; serializes via
  `toJSON`/`fromJSON`.
- **View** (`*View.ts`) — rendering only (canvas or WebGL).
- **ViewUI** (`*ViewUI.ts`) — gesture/input handling on top of a View.
- **ViewModel** — mediates between Model and View; for shared components like
  [HighlightControl](./HighlightControl.ts.md) it lives alongside the component rather than the
  page.
- **Controller** (e.g. [CycleGraph](./CycleGraph.ts.md)) — page factories that assemble Model,
  View, and control components into a standalone page. `Sheet.html` assembles the same
  Model/View/ViewUI/HighlightControl pieces directly, without going through a per-visualizer
  page controller.

Pub/sub between layers uses `createModelProxy` from [GEUtils](./GEUtils.ts.md), which wraps a
model in a `SubscriptionProxy` that views subscribe to.

**The Model plays a dual role**: it's both MVVM reactive state and the serialization DTO for the
Sheet system — `Sheet.html` embeds visualizations and can open a visualizer page as an editor,
passing the complete display state back and forth as the Model's JSON. That's intentional; the
Sheet's representation of a visualization *is* the model state.

### The Sheet system

`Sheet.html` is where relationships *between* groups are shown — either a homomorphism or a generic
relation like inclusion — as opposed to the single-group properties the other visualizer pages display.
It has its own full MVVM cluster: [SheetModel](./SheetModel.ts.md), [SheetView](./SheetView.ts.md),
[SheetViewModel](./SheetViewModel.ts.md), [SheetViewUI](./SheetViewUI.ts.md), and
[SheetControl](./SheetControl.ts.md) for the right-hand control panel.

`SheetModel.addObjectAsElement()` is the primitive that builds one element from plain JSON and
adds it to `sheetElements`; [SheetControl](./SheetControl.ts.md) calls it directly when the user
adds a single new element from the toolbar. `SheetModel.fromJSON()` is a bulk operation built on
top of it — it clears `sheetElements`, then calls `addObjectAsElement()` once per element in the
incoming array (topologically sorted so anchors precede their captions) — used for whole-sheet
replacement: control panel Import, IndexedDB Load, and the external generators that build sheets
programmatically (SolvableInfo, GroupInfo, etc.).

A freshly-created element's JSON starts out minimal — `SheetControl.addElement()` gives a new
`CDElement` just `{group_url}` — and completing it is each element class's own job, in its
`fromJSON()` here in [SheetModel](./SheetModel.ts.md), not SheetView's. `CDElement.fromJSON()` is
the concrete case: when `visualizerJSON` has neither a `layout` nor a real `diagram_control`, it
computes a default strategy (via [CayleyDiagramGenerator](./CayleyDiagramGenerator.ts.md)'s
`layoutCayleyDiagram`) and writes both back, so a brand-new element and one loaded from a saved
sheet go through the same completion path and SheetView never has to tell the difference.

The live visualizer for a node element lives in its [SheetView](./SheetView.ts.md) element; the
model element holds only the JSON the visualizer was last built from (`visualizerJSON`). What
SheetView needs from a visualizer is specified in `SheetVisualizerInterface<JSONType>` defined in
[SheetModel](./SheetModel.ts.md). Each visualizer's ViewModel (`CayleyDiagramViewModel`,
`CycleGraphViewModel`, `MulttableViewModel`) declares `implements SheetVisualizerInterface<...>`
against it — by design, so the compiler holds them to it going forward. The interface: `group`,
`highlightColors`, `canvas`, `getSize`/`setSize`/`resize`, `showGraphic`, `unitSquarePositions`
(used to compute morphism-arrow endpoints), `getImage`, and `toJSON`/`fromJSON`.

Two element families live on a sheet: NodeElements and LinkElements. Node elements can display a
cycle graph (`CGElement`), a multiplication table (`MTElement`), a Cayley diagram (`CDElement`), or
a text box (`TextElement`), which, without text, serves as a simple rectangle.  Their size and
position on the screen can be changed by drag-and-drop, wheel, and pinch gestures, and their z
positions can be edited using context menu selections. Link elements connect two node elements and are
either ConnectingElements (which depict a generic relationship, like inclusion depicted in the
subgroup lattice display) or MorphismElements (which depict homomorphisms between groups, and hence
can only connect visualizer elements). Link element size and position is determined by the nodes
they connect.  All elements are edited by code in [SheetModelEditors](./SheetModelEditors.ts.md).
For the visualizer elements this opens a full interactive visualizer page in a new tab, whose
changes are passed back to the Sheet page using postMessage as outlined above.  Other element types
are edited by inline dialogs, as described in
[help/rf-um-sheetwindow](https://nathancarter.github.io/group-explorer/help/rf-um-sheetwindow/).
Morphism element editing can
change the homomorphism [Mapping](./Mapping.ts.md) and the highlighting of the connected node
elements, as well as various display parameters.

**Load-bearing WebGL constraint**: browsers support only ~16 WebGL contexts, but a sheet may
contain dozens of Cayley diagrams. All `CDElement`s share one `CayleyDiagramViewModel`, held
statically by [`CDView`](./SheetView.ts.md) (`#sharedViewModel`, `#activeView`). A `CDView`'s
`get visualizer()` getter performs the handoff: if a different element currently holds the shared
view model, that element's live state is read back out and stashed as JSON on its own model
element (`modelElement.visualizerJSON`) before the shared view model is repointed at the
requesting element. This constraint lives in the View layer and must be preserved by any future
refactor.

Because the same model instance is reused across elements, hydrating it (`fromJSON`) has to be a
*total* operation, not a delta: an absent optional field means clear it, not leave whatever the
previous element had. `CayleyDiagramModel.highlightControl` got this wrong for a while —
`fromJSON` only ever applied a `highlight_control` when the incoming JSON had one, never cleared
it otherwise, so an element with no highlighting silently inherited whichever element previously
held the shared view model's. Any future optional field on a visualizer Model needs the same
discipline, and `canFastTrack()` (the same file) needs to keep agreeing: it must never skip
`fromJSON` while the shared model holds anything the target element hasn't confirmed it also has.

**Z ordering**: NodeElements get an even `z`; a newly-created element's initial value,
`z = 2 * (sheetElements.size + 1)` in `SheetModel.ts`, is just an insertion-order artifact. But
`z` isn't fixed at creation — the node context menu's Move Forward/Backward/to Front/to Back
options (`SheetViewUI.moveForward`/`moveBackward`/`moveToFront`/`moveToBack`) let the user
reassign it afterward, swapping with or jumping past neighboring nodes' `z` values, so a loaded
sheet's `z` values can reflect deliberate stacking choices and shouldn't be assumed to still
match insertion order. LinkElements never carry their own `z`: `LinkElement.z` derives from the
two nodes they connect, `Math.min(source.z, destination.z) - 1`, landing on an odd value strictly
below both endpoints — node `z`s are always even and link `z`s always odd, so the two never
collide. A `MorphismElement` with `showManyArrows` set is the one exception: its `z` is
`Math.max(source.z, destination.z) + 1`, placing its arrows above both nodes instead of below,
since a dense multi-arrow overlay needs to stay visible over the node artwork rather than hidden
beneath it.

### Generated groups

*Group Explorer* can create groups on the fly from a presentation (generators and relations)
instead of loading them from a `.group` file. These are identified by a `data:` URI instead of a
regular URL — `data:,//GE3/generated?presentation` — and are otherwise indistinguishable from
built-in library groups once created. Extended-library groups (the optional non-Abelian groups of
order 22–40) use the same mechanism under a second prefix,
[`EXTENDED_GROUP_PREFIX`](./AutoUpgrade.ts.md) (`data:,//GE3/extended?...`). The user-facing side
of this — the URI format, accepted presentation notations, and a walkthrough — is documented in
the help system's [Group Explorer Terminology](../help-src/rf-geterms.md#generated-groups) page;
this section covers the implementation.

[DefiningRelations.generateGroupFromPresentation](./DefiningRelations.ts.md) parses the presentation
and runs the Todd-Coxeter coset enumeration (Holt et. al., *Handbook of Computational Group Theory*,
Chapman & Hall, 2005, ch. 5) to build a multiplication table, returning `{multtable, generators}` —
or `null` if enumeration doesn't converge within `MAX_COSET_ENUMERATION_ITERATIONS`. This serves as
an implicit size guard as well as a malformed-presentation guard, since filling out the coset table
takes at least `|G|` iterations, so a group large enough to be a real problem tends to blow the cap
before it's ever built.

[Library.getGroupByURL](./Library.ts.md) drives the rest: it builds a `Group` from the multtable,
then checks [IsomorphicGroups.find](./IsomorphicGroups.ts.md) *before* doing anything else — if an
isomorphic group already exists in the library, that's returned and nothing new is saved,
preventing redundant duplicates. Only a genuinely new group gets decorated (name, presentation-
matching element representations, declared generators — see `decorateGeneratedGroup` in
[Library](./Library.ts.md)) and saved. Extended-library groups skip the isomorphism check — each
is curated with its own metadata (GAP id, alternate names, external links) and is expected to
exist independently even if isomorphic to something already in the library.

### External libraries

Three.js r170 is vendored locally in `lib/three-170/` — not installed via npm. It is the only
external library used at runtime. Import it via `lib/externals.js`, not a bare `three` specifier:

```js
import {THREE} from '../lib/externals.js'
```

### Documentation / source files

Every `ts/*.ts` file has a same-named symlink in `docs/` (e.g. `docs/GroupRegistry.ts.md` →
`../ts/GroupRegistry.ts`), so the module's embedded markdown documentation renders on GitHub while
the identical file is what `tsc` compiles. This file (`docs/README.md`) is itself the symlink
target for the project-root `CLAUDE.md` — the same convention, one level up. Editors that follow
symlinks transparently edit the `ts/`-side (or `docs/`-side) target regardless of which path is
opened; **tools that write in-place without following symlinks (e.g. plain `sed -i`, or any tool
that replaces-then-renames) will silently break the link**, turning it into a regular file. Prefer
editing through the symlink with a tool that resolves it, or edit the real path directly.

## Programming Style

- **Indentation**: 3 spaces
- **Prefer**: `const` > `let` > `var`
- **Naming**: variables/functions `camelCase`; true constants `SNAKE_CASE`; classes `CamelCase`;
  HTML attribute values `kebab-case`; less uniformly, JSON object field names are `snake_case`
- **Functions**: space between name and `(` in declarations (`function doThing (arg) {`), not in
  invocation (`doThing(arg)`)
- **Private class members**: use typescript `private` instead of ES2022 `#field`/`#method()`;
  `private _foo` is conventionally the hidden backing store for `foo` getter/setter methods.
- **Typing**: take advantage of typescript features. Don't just declare a type `any` or leave it to
  be inferred, use `unknown` instead and test for the correct type; but don't introduce tests where
  the code itself makes them unneeded, this clutters the code and makes the core logic harder to
  follow. For example, if the code creates a div with the id `foo`, assert that
  `document.getElementById('foo')` is non-null by `document.getElementById('foo')!` or
  `document.getElementById('foo') as HTMLDivElement`. Typing large pojo's is particularly
  encouraged, especially those underlying external interfaces or passed between sheets.
  When needed, modules that export a type `Foo` should also export a type guard `isFoo`.
  <br>Type coverage is measured with nodejs-based `type-coverage`: `npm run type-coverage`, or
  bare `npx type-coverage`. Config lives in `package.json`'s `typeCoverage` block — `atLeast: 100`
  (the run fails, non-zero exit, below that and names the offending node) with generated `**/*.d.ts`
  ignored, since tsc emits `any` for private class members whose types aren't nameable and that's
  its declaration emitter, not our source. The Go rewrite in typescript7 does not provide the
  programmatic compiler interface type-coverage uses, so we'll use typescript6 until this changes.
  It's slower, but this isn't a particularly large project.
- **No jQuery** in production code — DOM APIs directly
- Model layer stays OO (persistent identity, pub/sub, `toJSON`/`fromJSON` serialization suit
  objects); View/ViewUI layers lean functional as they're touched (closures for handler state,
  module-level singletons, transformations as functions). Partly-migrated View modules are
  intentional, not an invitation to unify in either direction.

### Logging

[Log](./Log.ts.md) exports `debug`/`info`/`warn`/`err`. Default log level is `warn`, default alert
level is `err`; set via URL params (`?log=debug&alert=warn`) or `Log.setLogLevel(string)`. Pass a
thunk for expensive debug messages so they're not evaluated unless the level is active:
`Log.debug(() => \`expensive ${JSON.stringify(obj)}\`)`.

A message at or above the alert level triggers a blocking `window.alert()` in addition to the
console, rate-limited by an `alertsRemaining` counter — this is built into `Log` itself, not a
separate mechanism. [AutoUpgrade](./AutoUpgrade.ts.md) additionally calls the browser's `alert()`
directly (bypassing `Log` entirely) for its own fetch-failure and corrupted-page-detection paths,
so those aren't subject to `Log`'s level filtering or rate limit. Worth knowing if you're driving
the app in a browser (e.g. for automated testing) — a blocking alert dialog stalls the page
differently than a log line would.

## Component Catalog

*The groupings below (Web pages, Web page components, Mathy components, Programming components,
...) are informal categories, negotiated for readability while writing this doc — not an enforced
taxonomy. Don't treat "does this belong under Mathy or Programming" as a rule to defend.*

### Web pages

**[GroupExplorer](./GroupExplorer.ts.md)** — displays the group library in table format, with
filtering by [Settings](./Settings.ts.md)' visibility rules.

- [GroupTable](./GroupTable.ts.md) — builds and fills the table
- [GroupTableUI](./GroupTableUI.ts.md) — sorting, column visibility, user interaction

**[CycleGraph](./CycleGraph.ts.md)** — large cycle graph visualizer.

- [CycleGraphModel](./CycleGraphModel.ts.md) — visualizer state
- [CycleGraphView](./CycleGraphView.ts.md) — draws the cycle graph on a 2D canvas
- [CycleGraphViewUI](./CycleGraphViewUI.ts.md) — zoom, pan, recenter

**[Multtable](./Multtable.ts.md)** — large multiplication table visualizer.

- [MulttableModel](./MulttableModel.ts.md) — visualizer state
- [MulttableView](./MulttableView.ts.md) — draws the table on a 2D canvas
- [MulttableViewUI](./MulttableViewUI.ts.md) — gesture handling
- [MulttableControl](./MulttableControl.ts.md) — display configuration panel

**[CayleyDiagram](./CayleyDiagram.ts.md)** — large Cayley diagram visualizer.

- [CayleyDiagramModel](./CayleyDiagramModel.ts.md) — visualizer state
- [CayleyDiagramView](./CayleyDiagramView.ts.md) — extends [AbstractDiagramDisplay](./AbstractDiagramDisplay.ts.md), renders with three.js
- [CayleyDiagramViewUI](./CayleyDiagramViewUI.ts.md) — drag-and-drop nodes, arrows, and chunks
- [CayleyDiagramControl](./CayleyDiagramControl.ts.md) — diagram strategy/layout control panel
- [CayleyViewControl](./CayleyViewControl.ts.md) — display parameters (zoom, line width, node radius)
- [CayleyDiagramGenerator](./CayleyDiagramGenerator.ts.md) — computes node/arrow/chunk layout geometry from a group and strategy

**[SymmetryObject](./SymmetryObject.ts.md)** — symmetry object visualizer.

- [SymmetryObjectView](./SymmetryObjectView.ts.md) — wraps an [AbstractDiagramDisplay](./AbstractDiagramDisplay.ts.md) to render the 3D object with three.js
- [SymmetryObjectControl](./SymmetryObjectControl.ts.md) — display configuration panel

**[GroupInfo](./GroupInfo.ts.md)** — assembles a page of group information from a set of
independent panel components, each displaying one facet of a group.

- [AbelianInfo](./AbelianInfo.ts.md) — whether the group is commutative
- [BasicFactInfo](./BasicFactInfo.ts.md) — basic facts (order, generators count, etc.)
- [ClassEquationInfo](./ClassEquationInfo.ts.md) — the class equation and conjugacy classes
- [CyclicInfo](./CyclicInfo.ts.md) — whether the group is cyclic
- [FileDataInfo](./FileDataInfo.ts.md) — provenance of the file the group was loaded from
- [GeneratorInfo](./GeneratorInfo.ts.md) — the group's generators
- [NamingSchemeInfo](./NamingSchemeInfo.ts.md) — available element-naming schemes
- [OrderClassInfo](./OrderClassInfo.ts.md) — element order classes
- [SolvableInfo](./SolvableInfo.ts.md) — solvability
- [SubgroupInfo](./SubgroupInfo.ts.md) — subgroup structure
- [UserNoteInfo](./UserNoteInfo.ts.md) — user-created notes (create/edit/save)
- [ViewInfo](./ViewInfo.ts.md) — visualization thumbnails, drawn by their respective visualizers
- [ZmnInfo](./ZmnInfo.ts.md) — whether the group is isomorphic to ℤ<sub>m</sub> × ℤ<sub>n</sub> for relatively prime *m*, *n*
- [ShowGAPCode](./ShowGAPCode.ts.md) — lets users interact with a live GAP server online to see how these properties are calculated

**Sheet** — see [The Sheet system](#the-sheet-system) above for the full module list.

### Web page components

Shared building blocks that pages wire together:

- **[Heading](./Heading.ts.md)** — the consistent page heading used across all GE3 pages.
- **[ControlPanel](./ControlPanel.ts.md)** — sliding control panel shared by all visualizers;
  builds button tabs from `data-button` attributes on child elements.
- **[HighlightControl](./HighlightControl.ts.md)** (+ [HighlightControlViewModel](./HighlightControlViewModel.ts.md),
  [HighlightControlView](./HighlightControlView.ts.md)) — subset/highlighting management, its own
  internal MVVM triad, used by every visualizer.
- **[Settings](./Settings.ts.md)** — manages user settings, broadcasting changes via `BroadcastChannel`.

### Display helpers

- **[UIComponents](./UIComponents.ts.md)** — `makeFixedMenu`, `makeDetachedMenu`, `makeDialog`
  helpers used throughout.
- **[Gestures](./Gestures.ts.md)** — unified touch+mouse gesture recognition (select, drag, zoom,
  context menu), used device-independently across the app.

### Mathy components

Domain logic for groups themselves:

- **[Group](./Group.ts.md)** — the central class holding a group's multiplication table,
  subgroups, conjugacy classes, element orders, and more.
- **[Subgroup](./Subgroup.ts.md)** — subgroup structure and utility functions, like enumerating its
  cosets or finding an isomorphic group
- **[SubgroupLattice](./SubgroupLattice.ts.md)** — find all subgroups of a group (cyclic extension method)
- **[DefiningRelations](./DefiningRelations.ts.md)** — converts a group presentation to/from a
  multiplication table (Todd-Coxeter coset enumeration).
- **[IsomorphicGroups](./IsomorphicGroups.ts.md)** — finds an isomorphic group already in the
  library, given a candidate group.
- **[Mapping](./Mapping.ts.md)** — represents a homomorphism between two groups, used by Sheet's
  MorphismElement.
- **[MathUtils](./MathUtils.ts.md)** — math support functions, e.g. integer factoring.

### Programming components

Generic, domain-agnostic infrastructure:

- **[BitSet](./BitSet.ts.md)** — fixed-size bit array (`Uint32Array`-backed) used throughout for
  element sets, subgroup membership, etc.
- **[GEUtils](./GEUtils.ts.md)** — general-purpose utilities used throughout GE3, including the
  `createModelProxy`/`SubscriptionProxy` pub/sub mechanism MVVM layers use to communicate.
- **[GroupRegistry](./GroupRegistry.ts.md)** — owns the in-memory collection of groups and exposes
  read-only queries over it; a leaf module with no dependency on Library, DefiningRelations, or
  IsomorphicGroups, so all three can depend on it without a cycle.
- **[Library](./Library.ts.md)** — manages the group library persisted in IndexedDB; the sole
  writer of the registry. Groups are loaded from `.group` files or generated from a presentation,
  and cached as `Group` objects.
- **[Log](./Log.ts.md)** — see [Logging](#logging) above.
- **[MathML](./MathML.ts.md)** (deprecated) — renders group element labels (defined as MathML
  in `.group` files) as HTML; replaced with HTML field values in JSON format `.group` files.
- **[StoredObjects](./StoredObjects.ts.md)** — see [Storage](#storage) above.
- **[XMLGroup](./XMLGroup.ts.md)** (deprecated) — creates a `Group` from a downloaded `.group` XML file;
  replaced with JSON format `.group` files handled in [Group](./Group.ts.md).

### Other programming components

- **[AutoUpgrade](./AutoUpgrade.ts.md)** — version synchronization and data migration for stored
  GE3 data.
- **[SheetSerialization](./SheetSerialization.ts.md)** — wraps/unwraps/deserializes Sheet JSON for
  storage and the editor postMessage roundtrip.

### Help system

A real, substantial feature in its own right — not a handful of tooltips.
[`help-src/`](../help-src/) is ~3700 lines across 28 Markdown files, built by MkDocs into
[`help/`](../help/) (see [Commands](#commands)):

- **Getting Started** — welcome page, multiplication table and Cayley diagram overviews
- **Tutorials** — a first tutorial, a discovery tutorial, and manipulation tutorials for
  multiplication tables, Cayley diagrams, and Sheets
- **User Manual** — one reference page per major UI area: Group Info pages, the group library,
  GAP integration, the large visualizers generally, then per-visualizer options (Cayley diagram,
  cycle graph, multiplication table, symmetry object), subset selection, 3D model viewing, Sheet
  options, and homomorphism editing
- **Terminology** — [group theory terms](../help-src/rf-groupterms.md) and
  [Group Explorer-specific terms](../help-src/rf-geterms.md) (including the user-facing side of
  [generated groups](#generated-groups))

This is entirely **user-facing** — written for people learning group theory or learning the UI,
not for developers. The [Generated groups](#generated-groups) split above is the model to follow:
when a feature has both a "how do I use this" side and a "how does this work" side, the user-facing
half belongs in `help-src/`, and the developer-facing half belongs here.

## Related documentation

- **[ADR log](./adr/)** — architecture decisions, including the [TypeScript adoption](./adr/001-type-annotation-policy.md)
  this whole `ts/`/`js/`/`docs/` layout follows from.


# Group Explorer 3.7rc26

*Group Explorer* is interactive visualization software for abstract algebra — specifically finite group theory. It runs entirely in the browser, requires no installation, and is designed for students and instructors building intuition about groups and their structure.

[Try it live.](https://nathancarter.github.io/group-explorer/)

![Samples of all large visualizers](images/screenshot-all-visualizers.png)

## What you can do

**Explore the group library.** The built-in library contains all groups of order 1–20 and a selection of larger groups, displayed with thumbnail visualizations. An extended library adds all non-Abelian groups of order <= 40, for more advanced study. You can also define your own groups from a presentation and use them anywhere a library group can be used.

**Visualize any group four ways.** Each group can be displayed as a Cayley diagram, multiplication table, cycle graph, or object of symmetry — all interactive, zoomable, and highlightable by subgroup or coset.

**Show relationships between groups on a Sheet.** A Sheet is a free-form canvas where you can place multiple visualizations side by side and draw morphisms between them. Arrows are colored by source or destination highlighting, making it easy to see how structure maps through a homomorphism. Sheets can be saved, exported, and shared.

## Running locally

A cloned copy of the repository can simply be served over HTTP, no build step required.

```bash
python3 -m http.server 8080
# then open http://localhost:8080/GroupExplorer.html
```
If you modify the typescript source code you must recompile it.

## Release notes

**3.7.0**
- Rewritten in typescript
- User-defined groups: define a group by generators and relations; stored locally and usable everywhere a library group can be used
- Extended library: all non-abelian groups of order 22–40 and selected notable large groups, controlled via the Settings dialog; extended groups generated on the fly from a built-in URN manifest (no separate files required)
- Settings dialog: control which groups appear in the library (extended, notable, generated); accessible from the menu on every page
- Configurable group table columns: choose which columns appear; sort order and column selection are saved between sessions
- Group table updates live when generated groups are created — no page refresh needed
- Custom group names: rename any group from its Group Info page
- Morphism arrows colored by source/destination highlighting
- Morphism editor: cancel restores previous highlights; push/pull redraws all connected morphisms
- Morphism shows image/pre-image of highlighted subset
- Morphism editor: inline highlight controls sync bidirectionally with any open external editor for that visualizer
- Subgroup lattice on Group Info page includes descriptive captions and compacted layout by conjugacy class
- Sheet titles displayed in the page heading bar
- Improved default Cayley diagram layouts, more representative of group structure
- Cayley diagram: snap-to-axis and coordinate axis display (View tab)
- Sheet backup/restore; stored sheets list with load, export, and rename
- Control panel swipe-to-hide on visualizer pages
- Hamburger menu replaces icon strip in page headers
- Groups stored in IndexedDB (no more localStorage size limits)
- jQuery removed from production code
- Help system: readable line width on wide monitors, display equations visually set off, terminology pages added to navigation

**3.6.1:** Fix error in normalizer calculation

**3.6.0:** Upgrade to jQuery 3.6.1, three.js r146

**3.4.0:** Multiplication table option to keep element colors fixed on reorganization

**3.3.0:** Group Info page improvements; internal refactoring

**3.2.0:** Sheets page with stored sheet support

**3.0.0:** First full-featured web release

## Contributing

The app is written in typescript and compiled into javascript. The [`README`](./docs/README.md) in `docs` directory provides a developer-oriented overview. If you'd like to contribute or report a bug, open an issue or pull request on GitHub.

You can easily add a specific group to your copy of the library using its presentation, as described in the [help pages](./help/rf-geterms#generated-groups). If you think the default library should be extended (maybe you have a more interesting Cayley diagram?) that's straightforward too — get in touch.

## Contributors

 * Ray Ellis — developed most of the web version
 * Nathan Carter — developed the original version; added sheets; authored the built-in help system

## License

[LGPL v3.0](https://www.gnu.org/licenses/lgpl-3.0.en.html)

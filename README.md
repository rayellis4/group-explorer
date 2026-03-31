
# Group Explorer 3.6

Group Explorer is visualization software for students and instructors of
abstract algebra, specifically group theory.  It has been around since 2005
as a desktop application, but was rewritten in 2019 as a web app.

## Status

**Release 3.7.0 (trim these before release)**
* generated groups: generate group from presentation (see rf-geterms.md)
  * allows integration of group not in library, isomorphic to a subgroup of known group
  * stored locally for later access; can be used in sheet, which can be exported transparently
* highlight control, subgroup info update (colored normal group, exposable info)
* color morphism arrows by source/destination highlighting
* stored sheet backup/restore
* add fgb groups
  * group explorer page displays default library, fgb groups, and generated groups
* improve default Cayley diagrams to be more representative of group structure
* subgroup lattice includes subgroup name + info (GroupInfo -> subgroups)
* Cayley diagram snap to axis, show coordinate axes (enabled in View tab)
* control panel swipe to hide
* upper right-hand menu replaces icons strip
* UI upgrade -- uniform move/resize,
* internal changes:
  * convert default .group format to JSON
  * move local storage to IndexedDB (avoid localStore size limitations)
  * store entire group library in memory (faster, simpler)
  * remove jquery dependency (except in GAP client)
  * maintain highlight control subsets, partitions with sheet elements

**Release 3.6.1:** Fix error in normalizer calculation

**Release 3.6.0:** Upgrade to jQuery 3.6.1, three.js r146

**Release 3.5.0:** Several minor bugfixes.

**Release 3.4.0:** In Multable, an option to keep element coloring fixed
on table reorganization.

**Release 3.3.0:** Removed modal editors from Group Info page; improved
version migration; internal improvements.

**Release 3.2.0:** A new Sheets page, with improved stored sheets capabilies.
Tell us what you think!

**Release 3.1.0:** A new Group Info page look.
Let us know what you think!

**Release 3.0.0:** First official full-featured release! It's not done yet, though.
We would still appreciate suggestions for enhancements or bug reports.

**Beta:** We would appreciate any bug reports during summer 2019, so that we
can have a polished and reliable version ready for students in Fall 2019
courses.

[Try it live here.](http://nathancarter.github.io/group-explorer/index.html)

![Samples of various group visualizations](images/screenshot-all-visualizers.png)

## Contributors

 * Ray Ellis
    * developed most of the web version
 * Nathan Carter
    * developed the original version
    * added sheets and some miscellany to the web version
    * authored the built-in help system

If you're interested in adding anything to this app, please talk to us!  It's all in pure JS, so you may already know everything you need to start coding.

If you have a request for particular groups you'd like to see added:  On the one hand, we've already added lots (all?) of the groups that are small enough to visualize sensibly (and a few that aren't!).  But we're still happy to discuss adding more if it would help your teaching or learning; it's easy to do by exporting the data from GAP.

## License

[LGPL v3.0](https://www.gnu.org/licenses/lgpl-3.0.en.html)

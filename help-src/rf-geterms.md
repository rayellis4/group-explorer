
This page is a dictionary of terms specific to *Group Explorer.* Many other
pages in the *Group Explorer* help link here to define terms. Unlike [the
group theory terminology page](rf-groupterms.md), these terms are not
well-known mathematical terms; they're used only in *Group Explorer.*

### Author of a group

The files which store group information are called group files, and they can
contain information about the original author of the file. This person
encoded the description of a finite group into *Group Explorer's* group
definition syntax so that *Group Explorer* could load and manipulate the
group. See also [URL of a group](#url-of-a-group).

### Date of last modification for a group

The date of last modification of a group actually refers to the date on
which the file from which the group was loaded was last modified. See also
[URL of a group](#url-of-a-group).

### URL of a group

Groups are stored on the *Group Explorer* website in files that end in the
extension `.group`, and then copied to the browser's local storage for faster
subsequent access. The group's URL is the web address (generally beginning with
`http://` or `https://`) of the `.group` file from which the group was loaded on
*Group Explorer's* website. Example:

`http://nathancarter.github.io/group-explorer/GroupInfo.html?groupURL=http://nathancarter.github.io/group-explorer/groups/Z_2%20x%20Z_4.group`

### Naming scheme (for group elements)

See [representation of a group](#representation-of-a-group).

### Representation of a group

In order to display the elements of a group on the screen, *Group Explorer*
needs to know their names. Although internally, *Group Explorer* stores
groups in a manner consistent with the mathematical abstractions that they
are, users prefer a prettier format. Each group file defines at least one
representation, or naming scheme--that is, a list of names, one for each
element of the group. Users can add additional representations (also called
naming schemes) by using the controls in [the group info
page](rf-um-groupwindow.md).

Note that group elements' representations should not be confused with group
presentations, which are embeddings of arbitrary groups into groups of
matrices. *Group Explorer* does not currently have any features related to
group presentations.

### Sheets

Sheets are a blank canvas on which the user can drop illustrations of a
group, homomorphisms to connect them, and pieces of text for description.
Thus groups need not be examined only in isolation; they can be compared to
other groups.

To open a new sheet click on the [page menu](#page-menu) icon in the upper
right-hand corner of the page and select the "New sheet" option.  For more
information, see [the introduction to sheets](tu-sheets.md) or the [reference
documentation on the sheet interface](rf-um-sheetwindow.md).

### Visualizers

*Group Explorer* uses the term visualizer to describe any of the various
mechanisms for obtaining pictures of a group. For instance, one way to
visualize a group is through its multiplication table, so we refer to
multiplication tables as "visualizers." *Group Explorer* contains four
types of visualizers: [multiplication
tables](rf-groupterms.md#multiplication-table), [cycle
graphs](rf-groupterms.md#cycle-graph), [cayley
diagrams](rf-groupterms.md#cayley-diagrams), and [objects of
symmetry](rf-groupterms.md#objects-of-symmetry).

### Generated Groups

*Group Explorer* can dynamically create groups that are not part of its built-in
library but can be treated just as if they were. These "generated groups" are
produced when needed, as in these circumstances:

- when displaying the groups isomorphic to the subgroups of a large group<br>
- when the URI for a generated group is specified in the page launch URL<br>
- when a generated group is embedded in a sheet definition exported from another
  environment

Once created, these groups

- are stored in the browser's local storage for faster future access
- function identically to built-in library groups
- can be listed in the main [*Group Explorer* window](rf-um-mainwindow.md)
  (newly generated groups may require a page refresh)
- have properties that can be examined on [Group Info pages](rf-um-groupwindow.md)
- can be visualized with any of the [large visualizers](rf-um-largewindow.md)
- can be included in [*Sheets*](rf-um-sheetwindow.md) with other groups
- can be [exported](rf-um-sheetwindow.md#export-import-backup-and-restore) to other
  browsers

Generated groups are distinguished by their URL format, which uses a [data URI
scheme](https://en.wikipedia.org/wiki/Data_URI_scheme) instead of a traditional
web address. For example:<br>
&emsp;&emsp;`data:,//GE3/generated?a,b:abAB,aaaaaa,aaabAAAB,bbbbbaaab,bbaabAABBB`

This format has three parts:

- `data:` - indicates this is embedded data rather than a file location
- `//GE3/generated` - identifies this as a *Group Explorer* generated group
- The text after `?` - defines the group using [generators and
  relations](rf-groupterms.md#definition-of-a-group-via-generators-and-relations)
  <br>(*Note:* capital letters in the relations represent inverse elements:
  A ≡ a<sup>-1</sup>. B ≡ b<sup>-1</sup>, etc.)

#### Example

Here's an example that lets you see generated groups in action:

1. Display the [Group Info page for
\(\mathbb{Z}_2\times\mathbb{Z}_3\times\mathbb{Z}_3\times\mathbb{Z}_4
\)](../../GroupInfo.html?groupURL=groups/Z_2%20x%20Z_3%20x%20Z_3%20x%20Z_4.group)

2. Find the "Subgroups" subsection and expand it by clicking on the '▶' twisty
   to the left. Scroll all the way to the bottom of the subgroup info table to
   \(H_{46}\), the next-to-last entry, and click on the `'A Generated Group of
   Order 36'` link. This will bring up the Group Info page for a new group,
   \(\mathbb{Z}_3\times\mathbb{Z}_3\times\mathbb{Z}_4\), isomorphic to
   \(H_{46}\). And even though this group isn't in *Group Explorer's* built-in
   library, the group info page displays all the information expected of a
   built-in group, including thumbnails of the visualizers and all the computed
   properties. You can even add custom element naming schemes and notes!
   
2. Click on the [cayley diagram](rf-groupterms.md#cayley-diagrams) in the generated
   group's info page to display the new group in a full-sized visualizer. The
   default layout doesn't show the
   \(\mathbb{Z}_3\times\mathbb{Z}_3\times\mathbb{Z}_4\) structure very well --
   see if you can [change to way the diagram is
   generated](rf-um-cd-options.md#the-diagram-tab) to improve it. The [cycle
   graph](rf-groupterms.md#cycle-graph) offers insight into the group's structure,
   too: note that there are four paths of nine elements around the
   circumference.
   
3. Back in the subgroup info table of the [Group Info page for
   \(\mathbb{Z}_2\times\mathbb{Z}_3\times\mathbb{Z}_3\times\mathbb{Z}_4
   \)](../../GroupInfo.html?groupURL=groups/Z_2%20x%20Z_3%20x%20Z_3%20x%20Z_4.group),
   click on one of the `embedding` or `short exact sequence` links for
   \(H_{46}\) to see the generated group shown in a sheet.

4. Display the [group library](../../GroupExplorer.html) page and look for
   groups named `'A Generated Group of Order ...'`. (If the page was already
   open you will have to refresh it manually to see your new additions.)  Make
   sure you've selected 'Show generated groups' from the [page
   menu](#page-menu); other options allow you to hide or delete generated
   groups, as discussed [here](rf-um-mainwindow.md#menu-top-right). (You don't need
   to worry about deleting the generated groups, by the way: if *Group Explorer*
   needs them again it'll just regenerate them.)

### Page Menu

All pages have a menu icon in the upper right-hand corner, indicated by a
so-called "hamburger" icon, \(\equiv\). In addition to page-specific options,
discussed separately with the various page descriptions, the menu contains a
link to the help documentation for the page being viewed, and a popup with
infomation about the copy of *Group Explorer* you're running:

![Screenshot of the GE3 help popup](GE3-help.png)

### Collapsible Sections

Many pages have collapsible sections, indicated by '▶' and '▼' characters to the
left of the main text. Often call "twisties", clicking on a '▶' character will
expand the section and change the symbol to a '▼'; clicking on a '▼' character
will collapse the section and change the symbol to a '▶'. See examples in the
[Group Info page](rf-um-groupwindow.md) and the [subset
options](rf-um-subsetlistbox.md).

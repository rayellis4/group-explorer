
The Group Info page is the main launchpad for exploring a single group in *Group
Explorer*. Open it by clicking a group's name or GAP ID in the [Group
Library](rf-um-mainwindow.md).

It consists of several collapsible sections, each with a heading and a body.
Clicking the heading (or the ▶ triangle beside it) expands or collapses
the body. The [page menu](rf-geterms.md#page-menu) offers **Expand all** and
**Collapse all** to open or close all sections at once.

It may help to open [an example Group Info
page](../../GroupInfo.html?groupURL=groups/Z_5.group) alongside this help page.

## Basic Facts

The first section shows fundamental data about the group:

- **Order** — the number of elements
- **GAP name** — the name used by the [GAP computer algebra system](rf-um-gap.md)
- **GAP ID** — the numeric ID in GAP's small group library
- **Other names** — alternative names the group is known by
- **Definition** — a presentation of the group by [generators and relations](rf-groupterms.md#definition-of-a-group-via-generators-and-relations)
- **Notes** — a short description of the group, when one is available
- **More info** — links to external resources about the group

A **Compute this in GAP** button appears for groups that have a GAP ID, opening
a panel with GAP code to recreate the group.

## Views

*Group Explorer* is about visualization, so the Views section is prominent.
The section heading shows a row of small thumbnails; expanding it reveals a full
table of every way to visualize the group, including all named [Cayley
diagrams](rf-groupterms.md#cayley-diagrams), a [multiplication
table](rf-groupterms.md#multiplication-table), a [cycle
graph](rf-groupterms.md#cycle-graph), and any [objects of
symmetry](rf-groupterms.md#objects-of-symmetry) the group possesses.

Clicking any image opens the corresponding full-screen visualizer.

## Computed properties

This section is a container of sub-sections, one for each property *Group
Explorer* computes automatically. Each sub-heading shows a one-line summary
(such as "yes" or "no"); expanding the body gives the reasoning, related
computations, and often sheet-based illustrations.

### Abelian Info

Whether the group is [abelian](rf-groupterms.md#abelian-group). For non-abelian
groups the body shows examples of pairs of elements that fail to commute.

### Class equation

The [class equation](rf-groupterms.md#class-equation) expresses the group order
as a sum of conjugacy class sizes. The body displays all [conjugacy
classes](rf-groupterms.md#conjugacy-classes) and verifies the equation.

### Cyclic group

Whether the group is [cyclic](rf-groupterms.md#cyclic-group). For cyclic groups
the body identifies a generator; for non-cyclic groups it explains why none
exists.

### Subgroups

The summary line shows the total subgroup count and how many are
[normal](rf-groupterms.md#normal-subgroup) (e.g. "6 (3 normal)"). The body
lists every subgroup. Normal subgroups are shown in **bold**. Expanding an
individual subgroup entry gives:

- its generators, order, and special properties (trivial, whole group,
  [Sylow](rf-groupterms.md#sylow-p-subgroup), etc.)
- links to open a sheet showing how it embeds in the whole group
- for normal subgroups, links to open a sheet showing the quotient group

The body also provides links to view the full [lattice of
subgroups](rf-groupterms.md#lattice-of-subgroups) as a sheet with each subgroup
shown as a Cayley diagram, cycle graph, or multiplication table. A second set of
links shows the lattice collapsed by [conjugacy
class](rf-groupterms.md#conjugacy-classes), with conjugate subgroup families
shown in matching colors.

### Order classes

Elements grouped by their [order](rf-groupterms.md#order-of-an-element-in-a-group),
with a count and list of elements for each order value.

### Solvable group

Whether the group is [solvable](rf-groupterms.md#solvable-group-solvable-decomposition).
For solvable groups the body describes the [solvable
decomposition](rf-groupterms.md#solvable-group-solvable-decomposition) — the
chain of normal subgroups with abelian quotients — and offers a link to open a
sheet illustrating it.

### ℤ_mn group

For groups of composite order, whether the group is isomorphic to a direct
product of cyclic groups ℤ_m × ℤ_n. If it is, the body links to a sheet
showing the isomorphism; if not, it explains why none exists.

## Generators

Groups can be [generated](rf-groupterms.md#generators-for-a-group-or-subgroup)
in many ways. Some groups come with several commonly-used generating sets built
in; if none is supplied, *Group Explorer* computes a minimal one when the group
is loaded. Each generating set is listed here.

CITE(VGT-1.4 VGT-2.3)

## Naming schemes

The structure of a group is independent of how its elements are labeled. A group
may come with several built-in naming schemes, and you can create your own. This
section shows all available schemes and lets you select which one is active.

User-defined schemes can be edited or removed here. The information is stored in
your browser and persists across sessions.

To add a new naming scheme, click "Click here to add a new
[representation](rf-geterms.md#representation-of-a-group) for this group." An
editor like the one below appears:

![Group element naming scheme interface](illustration-namescheme.png)

The left column shows the default element names, the center shows the current
naming as it will be rendered, and the right column contains a text area where
you can enter HTML. For example, to display the permutation (0 1 2) as
\(r^{-1}\), enter `<i>r</i><sup>-1</sup>`. Click "Display changes as they would
appear, without saving them" to preview the result in the center column. When
finished, click "Save changes and close editor" to commit.

A few notes:

- You may use any Unicode character, as well as HTML entities like &amp;Zopf;
  or &amp;#8484;.
- Names can be blank or non-unique — useful for saving partially completed work.
- HTML styling (e.g. color) may not render identically in every visualizer;
  multi-line names (containing `<br>` or `<hr>`) may not display as expected.
  Test your scheme in the visualizers to confirm it looks right.

Built-in naming schemes cannot be edited.

## Customizations

This section stores personal information about the group in your browser:

- **Group name** — a custom name for the group that appears in the page heading
  and elsewhere in the app.
- **Notes** — free-form personal notes, displayed as HTML (same rules as naming
  schemes above).

Both are preserved across sessions.

## File data

This section shows bibliographic data about the group definition — such as the
URL from which it was downloaded and its author. It appears only for groups that
include author information.

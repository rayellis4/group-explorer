
## What is a "large visualizer?"

Each [visualizer](rf-geterms.md#visualizers) in *Group Explorer* can show up
in three contexts: in a [group info page](rf-um-groupwindow.md), as an item
in a [sheet](rf-geterms.md#sheets), or in full detail in its own editable
window. This last case is the subject of this page.

Because each visualizer is different, this page covers just what all large
visualizer views have in common, and refers you to each visualizer's
individual interface page for specific information about each.

## Opening a large visualizer

You can obtain a large view of each visualizer one of two ways.

1.  Some pages contain links that will create a large visualizer for you.

    For instance, each [group info page](rf-um-groupwindow.md)
    has a Views section that gives a preview of every visualizer
    for the group and clicking any one opens a large copy
    in its own window. Thumbnails of each visualizer on
    [the main application page](rf-um-mainwindow.md) work the same way.

    In this case, although you can edit the appearance of the visualizer
    and save it as an image or print it, once you close the window,
    all your changes are lost.

2.  You can create visualizers in [sheets](rf-geterms.md#sheets)
    and double-click them to open a large version.

    In this case, the large view is linked to the small view in the sheet,
    and all changes made to the large view in its own window
    are reflected in the image on the sheet
    and will be saved if you save the sheet.

Here is a screenshot of a window viewing a large version of a Cayley
diagram.

![Screenshot of a large view of a Cayley diagram](illustration-largecd.png)

## Page structure

Every large visualizer page is split into two halves, like the one shown
above. The left half will always have the picture--the visualization. The
right half will be controls that allow you to edit the picture. You
can hide the right half by swiping right with your mouse or finger;
if it's hidden, swiping left from the edge of the screen will expose it.

If you perform any of the edits described with the controls below but then
wish to undo them and reset the large visualizer to its original state, just
reload the page in your browser.  Any changes you have made will be lost.

## Page Menu

In the upper right-hand corner of every page you will find a menu icon 

![Screenshot of the menu on the top right of a large visualizer
page](large-viz-menu.png)

with the following options:

#### Group Info

The first option takes you to the [Group Info page](rf-um-groupwindow.md), where
you can see all the information *Group Explorer* has about a given group.

#### Group Library

The second option takes you to the Group Library page, the [main page of the app
itself](rf-um-mainwindow.md).

#### New Sheet

The third option opens a blank sheet, into which you can insert visualizations
of any groups from the library and connect them with morphisms.  To read more on
sheets, see [the sheets tutorial](tu-sheets.md) or [the sheets
reference](rf-um-sheetwindow.md).

#### Help

This option opens the main help file page appropriate to the large visulizer you
have open. For more information on that controls pane, visit the documentation
on whichever large visualizer you're using:

*   [Documentation for large Cayley diagram interface](rf-um-cd-options.md)
*   [Documentation for large multiplication table interface](rf-um-mt-options.md)
*   [Documentation for large cycle graph interface](rf-um-cg-options.md)
*   [Documentation for large symmetry object interface](rf-um-os-options.md)

There are some controls in common among many of these visualizers; for
convenience, we provide links to their docuemntation here.

*   [Documentation for the subset options controls](rf-um-subsetlistbox.md)
*   [Documentation for controls for viewing 3D models](rf-um-modelview.md)

#### About GE3

Clicking this menu item pops up a box with information about the copy of
*Group Explorer* you're running:

![Screenshot of the GE3 help popup](GE3-help.png)

It includes a link to the [main *Group Explorer*
website](https://nathancarter.github.io/group-explorer), which will take you out
of the app itself and back to the home page of the entire project.

And it has a link to [the source code
repository](https://github.com/nathancarter/group-explorer) from which the
application and its website were built.  Visit that site if you would like to
see how the application was built, make suggestions for its improvement, report
an error in the documentation, or get involved in improving the software as a
developer.

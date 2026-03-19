/* @flow

# GroupTable component

This component creates and fills the table of group information that the
[GroupExplorer](./GroupExplorer.html.md) page displays.

```javascript
 */

import {createCayleyDiagramThumbnailView} from './CayleyDiagramView.js'
import {createUnlabelledCycleGraphView} from './CycleGraphView.js'
import {createMinimalMulttableView} from './MulttableView.js'
import {createStaticSymmetryObjectView} from './SymmetryObjectView.js'
import * as Library from './Library.js'

export {IMAGE_SIZE, display}

const IMAGE_SIZE = 96
/*
```
### display

Displays a table of the `groupUrls` in the `tableElement`
 * assumes the local copy of the library is up to date and does not check for updates
 * if the library doesn't alread have copies of the group visualizer thumbnails they are created
   and added
 * the page is displayed incrementally if it requires the time-consuming generation of thumbnails
     * a better user interface technique than waiting several seconds while the thumbnails are
       generated, then suddenly displaying the entire table
     * uses `setTimeout` without a delay

```javascript
 */
function display (tableElement, groupsToDisplay) {
   // create table headers
   tableElement.innerHTML = tableHTML(tableElement)

   document.getElementById('loadingMessage').classList.toggle('hidden')
   const generators = {}
   let updateLibrary = false

   for (const [inx, group] of groupsToDisplay.entries()) {
      const cayleyTitle = (group.cayleyDiagrams.length == 0)
         ? undefined
         : group.cayleyDiagrams[0].name

      const symmetryTitle = (group.symmetryObjects.length == 0)
         ? undefined
         : group.symmetryObjects[0].name

      // see whether group thumbnails have been generated and stored in localStorage
      if (group.thumbnails?.multtable == null) {
         // Create the generators the first time through for use by generateThumbnails
         if (generators.cayleyDiagramView == null) {
            generators.cayleyDiagramView = createCayleyDiagramThumbnailView({ height: IMAGE_SIZE, width: IMAGE_SIZE })
            generators.cycleGraphView = createUnlabelledCycleGraphView({ height: IMAGE_SIZE, width: IMAGE_SIZE })
            generators.multtableView = createMinimalMulttableView({ height: IMAGE_SIZE, width: IMAGE_SIZE })
            generators.symmetryObjectView = createStaticSymmetryObjectView({ height: IMAGE_SIZE, width: IMAGE_SIZE })
         }

         updateLibrary = true  // will cause last async task to update the local copy of the group library

         // create an async task to generate thumbnails
         setTimeout(() => {
            // display loading status message
            const loadingMessage = `Loading groups (${( (inx + 1) * 100 / groupsToDisplay) | 0}%)...`
            document.querySelector('#loadingMessage i').textContent = loadingMessage

            generateThumbnails(generators, group, cayleyTitle, symmetryTitle)  // generate thumbnails
            addToTable(tableElement, group, cayleyTitle)  // now add a new row to the table
         })
      } else {
         addToTable(tableElement, group, cayleyTitle)  // thumbnails aleady created, just add new row to table
      }
   }

   // generate the last async task, runs after all the rows has been generated and displayed
   setTimeout(() => {
      if (updateLibrary)
         Library.saveGroup(Library.getGroupsByOrder(1)[0])  // only force a write to localStorage once

      document.getElementById('loadingMessage').classList.toggle('hidden')
   })
}

function tableHTML (tableElement) {
   const tableElementId = tableElement.getAttribute('id')
   return `
       <style>
          .slowflash {
              color: #000000;
              -webkit-animation: flash linear 1s infinite;
              animation: flash linear 1s infinite;
          }
          @-webkit-keyframes flash,
          @keyframes flash {
          	0% { opacity: 1; }
          	50% { opacity: .1; }
          	100% { opacity: 1; }
          }

          #${tableElementId} a:link {
             color: black;
          }
          #${tableElementId} .center {
             text-align: center;
          }
          #${tableElementId} .diagram-header {
             min-width: 100px;
          }

          #${tableElementId},
          #${tableElementId} th,
          #${tableElementId} td {
             border: 1px solid #A0A0A0;
             border-collapse: collapse;
             vertical-align: middle;
          }
          #${tableElementId} thead {
             font-size: 1.2em;
             line-height: 1.2;
          }
          #${tableElementId} tbody {
             -webkit-user-select: none;                  /* prevents cut-and-paste in chrome, safari */
             -ms-user-select: none;                      /* prevents cut-and-paste in Microsoft edge */
             -moz-user-select: none;                     /* prevents cut-and-paste in firefox */
             -webkit-tap-highlight-color: transparent;   /* prevents anchor highlight on tap -- not in safari or firefox */
             -webkit-touch-callout: none;                /* prevents default tap-hold menu -- only on IOS */
          }
          #${tableElementId} tbody td:nth-child(1),
          #${tableElementId} tbody td:nth-child(2) {
             white-space: nowrap;
          }
          ${window.navigator.userAgent.includes('Chrome')
             ? '#' + tableElementId + ' tbody td:nth-child(4) { white-space: nowrap; }'
             : ''}
          #${tableElementId} tbody a {
             font-size: 1.5em;
             text-decoration: none;
          }
          #${tableElementId} tbody a:has(img) {
             display: block;
          }
          #${tableElementId} tbody a > img {
             display: block;
             min-width: 32px;
             min-height: 32px;
             max-width: 100px;
             max-height: 100px;
             height: 2em;
             width: 2em;
             margin: 0.1em auto;
          }
       </style>
       <thead id="group-table-head">
          <tr id="group-table-headers" height="32px">
             <th class="sortable">GAP&nbsp;ID</th>
             <th class="sortable">Name</th>
             <th class="sortable sort-down"><a href="help/rf-groupterms/index.html#order-of-a-group">Order</a></th>
             <th><a href="help/rf-groupterms/index.html#definition-of-a-group-via-generators-and-relations">Definition</a></th>
             <th class="diagram-header"><a href="help/rf-groupterms/index.html#cayley-diagrams">Cayley diagram</a></th>
             <th class="diagram-header"><a href="help/rf-groupterms/index.html#multiplication-table">Multiplication table</a></th>
             <th class="diagram-header"><a href="help/rf-groupterms/index.html#objects-of-symmetry">Object of symmetry</a></th>
             <th class="diagram-header"><a href="help/rf-groupterms/index.html#cycle-graph">Cycle graph</a></th>
          </tr>
          <tr id="loadingMessage" class="hidden">
             <th colspan="7">
                <center><i class="slowflash">Loading groups...</i></center>
             </th>
          </tr>
       </thead>
       <tbody id="group-table-body">
       </tbody>`
}
/*
```
### generateThumbnails

Called from [display](#display) to create the group's visualizer thumbnails and store them with the
group in the library.

```javascript
 */
function generateThumbnails (generators, group, cayleyTitle, symmetryTitle) {
   const thumbnails = group.thumbnails = group.thumbnails || {}

   if (thumbnails.cayleyDiagram == null) {
      generators.cayleyDiagramView.draw(group, cayleyTitle)
      group.thumbnails.cayleyDiagram = generators.cayleyDiagramView.getImage().src
   }

   if (thumbnails.multtable == null) {
      generators.multtableView.group = group;
      group.thumbnails.multtable = generators.multtableView.getImage().src
   }

   if (thumbnails.cycleGraph == null) {
      generators.cycleGraphView.group = group
      group.thumbnails.cycleGraph = generators.cycleGraphView.getImage().src
   }

   if (thumbnails.symmertyObject == null) {
      if (symmetryTitle == undefined) {
         group.thumbnails.symmetryObject = null
      } else {
         group.thumbnails.symmetryObject =
            generators.symmetryObjectView.setObject(group.symmetryObjects[0]).getImage().src
      }
   }
}
/*
```
### addToTable

Adds a row to the group table, assuming that group's visualizer thumbnails have already been
generated and stored with the group in the library.

```javascript
 */
function addToTable (tableElement, group, cayleyTitle) {
   const cayleyDiagramSelector =
      (cayleyTitle == null) ? '' : `&diagram=${encodeURIComponent(cayleyTitle)}`

   let symmetryObjectCell
   if (group.thumbnails.symmetryObject == null) {
      symmetryObjectCell = `<td class="center"><div>none</div></td>`
   } else {
      symmetryObjectCell =
         `<td class="symmetry-object center" title="Open Symmetry Object visualizer">
             <a href="SymmetryObject.html?groupURL=${group.URL}" target="_blank">
                <img src="${group.thumbnails.symmetryObject}" width="100px" height="100px">
             </a>
          </td>`
   }

   const groupLibrary = group.library || 'default'

   const rowHTML = [
      `<tr data-group="${group.URL}" data-library="${groupLibrary}">
          <td class="no-diagram center" title="Open Group Info page">
             <a href="GroupInfo.html?groupURL=${group.URL}" target="_blank">
                <div>${group.gapid}</div>
             </a>
          </td>
          <td class="no-diagram" title="Open Group Info page">
             <a href="GroupInfo.html?groupURL=${group.URL}" target="_blank">
                <div>${group.name}</div>
             </a>
          </td>
          <td class="no-diagram center">${ group.order }</td>
          <td title="Open Group Info page">
             <a href="GroupInfo.html?groupURL=${group.URL}" target="_blank">
                <div>${group.definition}</div>
             </a>
          </td>
          <td class="cayley-diagram center" title="Open Cayley Diagram visualizer">
             <a href="CayleyDiagram.html?groupURL=${group.URL}${cayleyDiagramSelector}" target="_blank">
                <img src="${group.thumbnails.cayleyDiagram}" width="100px" height="100px">
             </a>
          </td>
          <td class="multiplication-table center" title="Open Multiplication Table visualizer">
             <a href="Multtable.html?groupURL=${group.URL}" target="_blank">
                <img src="${group.thumbnails.multtable}" width="100px" height="100px">
             </a>
          </td>
          ${symmetryObjectCell}
          <td class="cycle-graph center" title="Open Cycle Graph visualizer">
             <a href="CycleGraph.html?groupURL=${group.URL}" target="_blank">
                <img src="${group.thumbnails.cycleGraph}" width="100px" height="100px">
             </a>
          </td>
       </tr>`
   ]

   tableElement.querySelector('tbody').insertAdjacentHTML('beforeend', rowHTML)
}

/*

# GroupTable component

This component creates and fills the table of group information that the
[GroupExplorer](./GroupExplorer.html.md) page displays.

Column definitions live in the exported `COLUMNS` array.  Each entry carries its own
header markup, sort comparator, and cell-rendering function — adding a new column is one
object in the array.  All columns are always rendered; visibility is toggled via CSS
classes on the `<table>` element (see `hide-{col-id}` rules in `tableHTML`).

```javascript
*/
import { createCayleyDiagramThumbnailView } from './CayleyDiagramView.js';
import { createUnlabelledCycleGraphView } from './CycleGraphView.js';
import { createMinimalMulttableView } from './MulttableView.js';
import { createSymmetryObjectThumbnailView } from './SymmetryObjectView.js';
import * as Library from './Library.js';
export const IMAGE_SIZE = 96;
export const COLUMNS = [
    {
        id: 'gap-id',
        label: 'GAP ID',
        headerHTML: 'GAP&nbsp;ID',
        defaultVisible: true,
        sortComparator: (v1, v2) => {
            const [[v11, v12], [v21, v22]] = [v1.split(','), v2.split(',')];
            return parseInt(v11) - parseInt(v21) || parseInt(v12) - parseInt(v22);
        },
        cellHTML: (group) => `<td class="no-diagram center" data-tooltip="Open Group Info page">
             <a href="GroupInfo.html?groupURL=${group.URL}" target="_blank">
                <div>${group.gapid}</div>
             </a>
          </td>`,
    },
    {
        id: 'name',
        label: 'Name',
        headerHTML: 'Name',
        defaultVisible: true,
        sortComparator: (v1, v2) => v1.replace('(', '').localeCompare(v2.replace('(', '')),
        cellHTML: (group) => `<td class="no-diagram" data-tooltip="Open Group Info page">
             <a href="GroupInfo.html?groupURL=${group.URL}" target="_blank">
                <div>${group.name}</div>
             </a>
          </td>`,
    },
    {
        id: 'order',
        label: 'Order',
        headerHTML: '<a href="help/rf-groupterms/index.html#order-of-a-group">Order</a>',
        defaultVisible: true,
        sortComparator: (v1, v2) => parseInt(v1) - parseInt(v2),
        cellHTML: (group) => `<td class="no-diagram center">${group.order}</td>`,
    },
    {
        id: 'definition',
        label: 'Definition',
        headerHTML: '<a href="help/rf-groupterms/index.html#definition-of-a-group-via-generators-and-relations">Definition</a>',
        defaultVisible: true,
        cellHTML: (group) => `<td class="no-diagram" data-tooltip="Open Group Info page">
             <a href="GroupInfo.html?groupURL=${group.URL}" target="_blank">
                <div>${group.definition}</div>
             </a>
          </td>`,
    },
    {
        id: 'subgroup-count',
        label: 'Subgroups',
        headerHTML: 'Subgroups',
        defaultVisible: false,
        sortComparator: (v1, v2) => parseInt(v1) - parseInt(v2),
        cellHTML: (group) => `<td class="no-diagram center">${group.subgroups.length}</td>`,
    },
    {
        id: 'is-abelian',
        label: 'Abelian',
        headerHTML: '<a href="help/rf-groupterms/index.html#abelian-group">Abelian</a>',
        defaultVisible: false,
        sortComparator: (v1, v2) => v1.localeCompare(v2),
        cellHTML: (group) => `<td class="no-diagram center">${group.isAbelian ? '✓' : ''}</td>`,
    },
    {
        id: 'is-cyclic',
        label: 'Cyclic',
        headerHTML: '<a href="help/rf-groupterms/index.html#cyclic-group">Cyclic</a>',
        defaultVisible: false,
        sortComparator: (v1, v2) => v1.localeCompare(v2),
        cellHTML: (group) => `<td class="no-diagram center">${group.isCyclic ? '✓' : ''}</td>`,
    },
    {
        id: 'is-simple',
        label: 'Simple',
        headerHTML: '<a href="help/rf-groupterms/index.html#simple-group">Simple</a>',
        defaultVisible: false,
        sortComparator: (v1, v2) => v1.localeCompare(v2),
        cellHTML: (group) => `<td class="no-diagram center">${group.isSimple ? '✓' : ''}</td>`,
    },
    {
        id: 'is-solvable',
        label: 'Solvable',
        headerHTML: '<a href="help/rf-groupterms/index.html#solvable-group-solvable-decomposition">Solvable</a>',
        defaultVisible: false,
        sortComparator: (v1, v2) => v1.localeCompare(v2),
        cellHTML: (group) => `<td class="no-diagram center">${group.isSolvable ? '✓' : ''}</td>`,
    },
    {
        id: 'cayley-diagram',
        label: 'Cayley diagram',
        headerHTML: '<a href="help/rf-groupterms/index.html#cayley-diagrams">Cayley diagram</a>',
        headerClass: 'diagram-header',
        defaultVisible: true,
        cellHTML: (group, { cayleyTitle }) => {
            const selector = cayleyTitle != null ? `&diagram=${encodeURIComponent(cayleyTitle)}` : '';
            return `<td class="cayley-diagram center" data-tooltip="Open Cayley Diagram visualizer">
             <a href="CayleyDiagram.html?groupURL=${group.URL}${selector}" target="_blank">
                <img src="${group.thumbnails.cayleyDiagram}" width="100px" height="100px">
             </a>
          </td>`;
        },
    },
    {
        id: 'multtable',
        label: 'Multiplication table',
        headerHTML: '<a href="help/rf-groupterms/index.html#multiplication-table">Multiplication table</a>',
        headerClass: 'diagram-header',
        defaultVisible: true,
        cellHTML: (group) => `<td class="multiplication-table center" data-tooltip="Open Multiplication Table visualizer">
             <a href="Multtable.html?groupURL=${group.URL}" target="_blank">
                <img src="${group.thumbnails.multtable}" width="100px" height="100px">
             </a>
          </td>`,
    },
    {
        id: 'symmetry-object',
        label: 'Symmetry object',
        headerHTML: '<a href="help/rf-groupterms/index.html#objects-of-symmetry">Object of symmetry</a>',
        headerClass: 'diagram-header',
        defaultVisible: true,
        cellHTML: (group) => group.thumbnails.symmetryObject == null
            ? `<td class="no-diagram center"><div>none</div></td>`
            : `<td class="symmetry-object center" data-tooltip="Open Symmetry Object visualizer">
                  <a href="SymmetryObject.html?groupURL=${group.URL}" target="_blank">
                     <img src="${group.thumbnails.symmetryObject}" width="100px" height="100px">
                  </a>
               </td>`,
    },
    {
        id: 'cycle-graph',
        label: 'Cycle graph',
        headerHTML: '<a href="help/rf-groupterms/index.html#cycle-graph">Cycle graph</a>',
        headerClass: 'diagram-header',
        defaultVisible: true,
        cellHTML: (group) => `<td class="cycle-graph center" data-tooltip="Open Cycle Graph visualizer">
             <a href="CycleGraph.html?groupURL=${group.URL}" target="_blank">
                <img src="${group.thumbnails.cycleGraph}" width="100px" height="100px">
             </a>
          </td>`,
    },
];
export function display(tableElement, groupsToDisplay) {
    tableElement.innerHTML = tableHTML(tableElement);
    document.getElementById('loadingMessage').classList.toggle('hidden');
    const imageGenerators = {};
    let updateLibrary = false;
    for (const [inx, group] of groupsToDisplay.entries()) {
        const cayleyTitle = group.cayleyDiagrams[0]?.name ?? null;
        const symmetryTitle = group.symmetryObjects[0]?.name ?? null;
        if (group.thumbnails?.multtable == null) {
            if (imageGenerators.cayleyDiagramView == null) {
                imageGenerators.cayleyDiagramView = createCayleyDiagramThumbnailView({ height: IMAGE_SIZE, width: IMAGE_SIZE });
                imageGenerators.cycleGraphView = createUnlabelledCycleGraphView({ height: IMAGE_SIZE, width: IMAGE_SIZE });
                imageGenerators.multtableView = createMinimalMulttableView({ height: IMAGE_SIZE, width: IMAGE_SIZE });
                imageGenerators.symmetryObjectView = createSymmetryObjectThumbnailView({ height: IMAGE_SIZE, width: IMAGE_SIZE });
            }
            updateLibrary = true;
            setTimeout(() => {
                const loadingMessage = `Loading groups (${((inx + 1) * 100 / groupsToDisplay.length) | 0}%)...`;
                document.querySelector('#loadingMessage i').textContent = loadingMessage;
                generateThumbnails(imageGenerators, group, cayleyTitle, symmetryTitle);
                addToTable(tableElement, group, cayleyTitle);
            });
        }
        else {
            addToTable(tableElement, group, cayleyTitle);
        }
    }
    setTimeout(() => {
        if (updateLibrary)
            Library.saveGroup(Library.getGroupsByOrder(1)[0]);
        document.getElementById('loadingMessage').classList.toggle('hidden');
    });
}
function tableHTML(tableElement) {
    const tableElementId = tableElement.getAttribute('id');
    // one hide-{id} rule per column; GroupTableUI toggles these classes on the table element
    const hideRules = COLUMNS.map((col) => `#${tableElementId}.hide-${col.id} th[data-col-id="${col.id}"],
       #${tableElementId}.hide-${col.id} td[data-col-id="${col.id}"] { display: none; }`).join('\n          ');
    const headers = COLUMNS.map((col) => {
        const classes = [col.sortComparator != null ? 'sortable' : '', col.headerClass || '']
            .filter(Boolean).join(' ');
        return `<th${classes ? ` class="${classes}"` : ''} data-col-id="${col.id}">${col.headerHTML}</th>`;
    }).join('\n             ');
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
             -webkit-user-select: none;
             -ms-user-select: none;
             -moz-user-select: none;
             -webkit-tap-highlight-color: transparent;
             -webkit-touch-callout: none;
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

          #${tableElementId} th.sortable {
             white-space: nowrap;
          }

          ${hideRules}
       </style>
       <thead id="group-table-head">
          <tr id="group-table-headers" height="32px">
             ${headers}
          </tr>
          <tr id="loadingMessage" class="hidden">
             <th colspan="${COLUMNS.length}">
                <center><i class="slowflash">Loading groups...</i></center>
             </th>
          </tr>
       </thead>
       <tbody id="group-table-body">
       </tbody>`;
}
/*
```
### generateThumbnails

Called from [display](#display) to create the group's visualizer thumbnails and store them with the
group in the library.

```javascript
*/
function generateThumbnails(generators, group, cayleyTitle, symmetryTitle) {
    const thumbnails = group.thumbnails = group.thumbnails ?? {};
    if (thumbnails.cayleyDiagram == null) {
        generators.cayleyDiagramView.draw(group, cayleyTitle);
        group.thumbnails.cayleyDiagram = generators.cayleyDiagramView.getImage().src;
    }
    if (thumbnails.multtable == null) {
        generators.multtableView.draw(group);
        group.thumbnails.multtable = generators.multtableView.getImage().src;
    }
    if (thumbnails.cycleGraph == null) {
        generators.cycleGraphView.draw(group);
        group.thumbnails.cycleGraph = generators.cycleGraphView.getImage().src;
    }
    if (thumbnails.symmetryObject == null) {
        if (symmetryTitle == null) {
            delete group.thumbnails.symmetryObject;
        }
        else {
            generators.symmetryObjectView.draw(group, group.symmetryObjects[0].name);
            group.thumbnails.symmetryObject = generators.symmetryObjectView.getImage().src;
        }
    }
}
/*
```
### addToTable

Adds a row to the group table for all columns.  Each `<td>` gets a `data-col-id` attribute
so that visibility CSS rules (and the mouse/touch handlers in GroupTableUI) can target cells
by column id rather than by position.

```javascript
*/
function addToTable(tableElement, group, cayleyTitle) {
    const aux = { cayleyTitle };
    const groupLibrary = group.library || 'default';
    const cells = COLUMNS.map((col) => col.cellHTML(group, aux).replace('<td', `<td data-col-id="${col.id}"`)).join('\n          ');
    tableElement.querySelector('tbody').insertAdjacentHTML('beforeend', `<tr data-group="${group.URL}" data-library="${groupLibrary}">
          ${cells}
       </tr>`);
}
//# sourceMappingURL=GroupTable.js.map
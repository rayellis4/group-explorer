/*

# ViewInfo

A [GroupInfo](./GroupInfo.html.md) component that displays thumbnails of the group visualizations
with links to their larger visualizers.

```javascript
 */
import { createCayleyDiagramThumbnailView } from './CayleyDiagramView.js';
import { createUnlabelledCycleGraphView } from './CycleGraphView.js';
import { createMinimalMulttableView } from './MulttableView.js';
import { createSymmetryObjectThumbnailView } from './SymmetryObjectView.js';
import * as GEUtils from './GEUtils.js';
import { IMAGE_SIZE } from './GroupTable.js';
import * as SheetModel from './SheetModel.js';
export function display(viewElementId, group) {
    const viewElement = document.getElementById(viewElementId);
    viewElement.innerHTML = makeViews(group, viewElementId);
    GEUtils.createActionHandler(viewElement, (action) => eval(action));
}
function makeViews(group, viewElementId) {
    const images = getImages(group);
    const htmlFragments = [
        `<style>
          #${viewElementId} .title {
             display: inline-block;
             width: 4em
          }
          #${viewElementId} .summary {
             vertical-align: top;
          }
          #${viewElementId} .summary img {
             height: 4vh;
             max-height: 5em;
             margin-right: 2em;
          }
          #${viewElementId} table {
             border-spacing: 1ch;
             border-collapse: unset;
          }
          #${viewElementId} table th {
             font-size: 1.2em;
          }
          #${viewElementId} table td {
             padding: unset;
             min-width: 20ch;
             text-align: center;
             vertical-align: top;
             line-height: 1.5em;
          }
       </style>
       <details open>
          <summary>
             <span class="title">Views</span>
             <span class="summary">
                <img src="${images[0][0]?.src}"/>
                <img src="${images[0][1]?.src}"/>
                <img src="${images[0][2]?.src}"/>`,
        (images[0][3] == null) ? '' : `<img src="${images[0][3].src}"/>`,
        `</span>
            </summary>`,
        ...formatViewTable(images),
        '</details>'
    ];
    return htmlFragments.join('');
    function formatViewTable(images) {
        const formatCol = ({ link, src, name = '' }) => `<a href="${link}"><img src="${src}"/><div>${name}</div></a>`;
        const formatRow = (row) => row.map((col) => `<td>${col ? formatCol(col) : ''}</td>`).join('');
        const htmlFragments = [
            `<table>
             <thead>
                <tr>
                   <th><a href="help/rf-groupterms/index.html#cayley-diagrams">Cayley Diagram</a></th>
                   <th><a href="help/rf-groupterms/index.html#cycle-graph">Cycle Graph</a></th>
                   <th><a href="help/rf-groupterms/index.html#multiplication-table">Multiplication Table</a></th>
                   <th><a href="help/rf-groupterms/index.html#objects-of-symmetry">Object of Symmetry</a></th>
                </tr>
             </thead>
             <tbody>`,
            ...images.map((row) => `<tr>${formatRow(row)}</tr>`).join(''),
            `</tbody>
          </table>
          <div>Click any view to open a copy for exploration.<br>
            To see all of these visualizations shown together on a sheet,
            <a href="" data-action="showAllVisualizersSheet(group)">click here</a>
          </div>`
        ];
        return htmlFragments;
    }
}
// Display rows of visualizer thumbnails
function getImages(group) {
    const THUMBNAIL_SIZE = { height: IMAGE_SIZE, width: IMAGE_SIZE };
    let cayleyDiagramGenerator;
    let cycleGraphView;
    let multtableView;
    let symmetryObjectView;
    const images = Array.from({ length: Math.max(1, group.cayleyDiagrams.length + 1, group.symmetryObjects.length) }, () => Array.from({ length: 4 }));
    // Create cayley diagram thumbnails
    for (let inx = 0; inx < group.cayleyDiagrams.length + 1; inx++) {
        if (cayleyDiagramGenerator == null) {
            cayleyDiagramGenerator = createCayleyDiagramThumbnailView(THUMBNAIL_SIZE);
        }
        const diagramName = group.cayleyDiagrams[inx]?.name;
        cayleyDiagramGenerator.draw(group, diagramName);
        images[inx][0] = {
            name: diagramName,
            link: `CayleyDiagram.html?groupURL=${group.URL}` + ((diagramName == null) ? '' : `&diagram=${diagramName}`),
            src: cayleyDiagramGenerator.getImage().src,
        };
    }
    // Create cycle graph thumbnail
    {
        let imageSource;
        if (group.thumbnails?.cycleGraph != null) {
            imageSource = group.thumbnails.cycleGraph;
        }
        else {
            cycleGraphView = createUnlabelledCycleGraphView(THUMBNAIL_SIZE);
            cycleGraphView.draw(group);
            imageSource = cycleGraphView.getImage().src;
        }
        images[0][1] = {
            link: `CycleGraph.html?groupURL=${group.URL}`,
            src: imageSource
        };
    }
    // Create multtable thumbnail
    {
        let imageSource;
        if (group.thumbnails?.multtable != null) {
            imageSource = group.thumbnails.multtable;
        }
        else {
            multtableView = createMinimalMulttableView(THUMBNAIL_SIZE);
            multtableView.draw(group);
            imageSource = multtableView.getImage().src;
        }
        images[0][2] = {
            link: `Multtable.html?groupURL=${group.URL}`,
            src: imageSource
        };
    }
    // Maybe create symmetry object thumbnails
    for (let inx = 0; inx < group.symmetryObjects.length; inx++) {
        const symmetryObjectName = group.symmetryObjects[inx].name;
        let imageSource;
        if (inx == 0 && group.thumbnails?.symmetryObject != null) {
            imageSource = group.thumbnails.symmetryObject;
        }
        else {
            if (symmetryObjectView == null) {
                symmetryObjectView = createSymmetryObjectThumbnailView(THUMBNAIL_SIZE);
            }
            symmetryObjectView.draw(group, symmetryObjectName);
            imageSource = symmetryObjectView.getImage().src;
        }
        images[inx][3] = {
            name: symmetryObjectName,
            link: `SymmetryObject.html?groupURL=${group.URL}&diagram=${symmetryObjectName}`,
            src: imageSource
        };
    }
    return images;
}
function showAllVisualizersSheet(group) {
    const iso = group.generators.map(g => [g, g]);
    const panelWidth = SheetModel.sheetPanelWidth();
    const W = Math.min(4 * window.innerHeight / 17, // generous scale for single-row sheet
    (window.innerWidth - panelWidth) / 4 // 3 viz + 2 half-gaps = 4W
    );
    const H = W;
    const gap = W / 2;
    const txtH = 0.3 * H;
    const totalW = 3 * W + 2 * gap;
    const L = (window.innerWidth - panelWidth - totalW) / 2;
    const vizY = 0.4 * (window.innerHeight - H); // center visualizers just above midline
    const allVisualizersSheet = [
        {
            className: 'CDElement', id: 'cd',
            groupURL: group.URL, diagram_name: group.cayleyDiagrams[0]?.name,
            x: L, y: vizY, w: W, h: H
        },
        {
            className: 'MTElement', id: 'mt',
            groupURL: group.URL,
            x: L + W + gap, y: vizY, w: W, h: H
        },
        {
            className: 'CGElement', id: 'cg',
            groupURL: group.URL,
            x: L + 2 * (W + gap), y: vizY, w: W, h: H
        },
        {
            className: 'TextElement',
            x: L, y: vizY + H, w: W, h: txtH,
            text: 'Cayley Diagram', fontSize: '1.25em', alignment: 'center', opacity: 0, anchor_id: 'cd'
        },
        {
            className: 'TextElement',
            x: L + W + gap, y: vizY + H, w: W, h: txtH,
            text: 'Multiplication Table', fontSize: '1.25em', alignment: 'center', opacity: 0, anchor_id: 'mt'
        },
        {
            className: 'TextElement',
            x: L + 2 * (W + gap), y: vizY + H, w: W, h: txtH,
            text: 'Cycle Graph', fontSize: '1.25em', alignment: 'center', opacity: 0, anchor_id: 'cg'
        },
        {
            className: 'MorphismElement', fontSize: '1.25em',
            source_id: 'cd', destination_id: 'mt',
            morphismName: '<i>id</i><sub>1</sub>',
            showInjectionSurjection: true, showManyArrows: true, definingPairs: iso
        },
        {
            className: 'MorphismElement', fontSize: '1.25em',
            source_id: 'mt', destination_id: 'cg',
            morphismName: '<i>id</i><sub>2</sub>',
            showInjectionSurjection: true, showManyArrows: true, definingPairs: iso
        }
    ];
    SheetModel.createNewSheet({ title: `All Visualizers for the Group ${group.name}`, elements: allVisualizersSheet });
}
//# sourceMappingURL=ViewInfo.js.map
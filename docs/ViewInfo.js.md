/* @flow

# ViewInfo

A [GroupInfo](./GroupInfo.html.md) component that displays thumbnails of the group visualizations
with links to their larger visualizers.

```javascript
 */
import { createCayleyDiagramThumbnailView} from './CayleyDiagramView.js'
import { createUnlabelledCycleGraphView } from './CycleGraphView.js'
import { createMinimalMulttableView } from './MulttableView.js'
import { createSymmetryObjectThumbnailView } from './SymmetryObjectView.js'
import * as GEUtils from './GEUtils.js'
import { IMAGE_SIZE } from './GroupTable.js'
import * as SheetModel from './SheetModel.js'

export {display}

function display (viewElementId, group) {
   const viewElement = document.getElementById(viewElementId)
   viewElement.innerHTML = makeViews(group, viewElementId)

   GEUtils.createActionHandler(viewElement, (action) => eval(action))
}

function makeViews (group, viewElementId) {
   const images = getImages(group)

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
                <img src="${images[0][0].src}"/>
                <img src="${images[0][1].src}"/>
                <img src="${images[0][2].src}"/>`,
                (images[0][3] == null) ? '' : `<img src="${images[0][3].src}"/>`,
            `</span>
            </summary>`,
            ...formatViewTable(images),
       '</details>'
   ]

   return htmlFragments.join('')

   function formatViewTable (images) {
      const formatCol = ({link, src, name=''}) => `<a href="${link}"><img src="${src}"/><div>${name}</div></a>`
      const formatRow = (row) => row.map((col) => `<td>${col ? formatCol(col) : ''}</td>`).join('')
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
      ]
      return htmlFragments
   }
}

// Display rows of visualizer thumbnails
function getImages (group) {
   const THUMBNAIL_SIZE = {height: IMAGE_SIZE, width: IMAGE_SIZE}
   let cayleyDiagramGenerator
   let cycleGraphView
   let multtableView
   let symmetryObjectView

   const images =  Array.from(
      {length: Math.max(1, group.cayleyDiagrams.length + 1, group.symmetryObjects.length)},
      () => Array.from({length: 4}))

   // Create cayley diagram thumbnails
   for (let inx = 0; inx < group.cayleyDiagrams.length + 1; inx++) {
      const image = images[inx][0] = {}
      image.name = group.cayleyDiagrams[inx]?.name
      image.link = `CayleyDiagram.html?groupURL=${group.URL}`
         + ((image.name == null) ? '' : `&diagram=${image.name}`)
      if (cayleyDiagramGenerator == null) {
         cayleyDiagramGenerator = createCayleyDiagramThumbnailView(THUMBNAIL_SIZE)
      }
      cayleyDiagramGenerator.draw(group, image.name)
      image.src = cayleyDiagramGenerator.getImage().src
   }

   // Create cycle graph thumbnail
   {
      const image = images[0][1] = {}
      image.link = `CycleGraph.html?groupURL=${group.URL}`
      if (group.thumbnails?.cycleGraph != null) {
         image.src = group.thumbnails.cycleGraph
      } else {
         cycleGraphView = createUnlabelledCycleGraphView(THUMBNAIL_SIZE)
         cycleGraphView.draw(group)
         image.src = cycleGraphView.getImage().src
      }
   }

   // Create multtable thumbnail
   {
      const image = images[0][2] = {}
      image.link = `Multtable.html?groupURL=${group.URL}`
      if (group.thumbnails?.multtable != null) {
         image.src = group.thumbnails.multtable
      } else {
         multtableView = createMinimalMulttableView(THUMBNAIL_SIZE)
         multtableView.draw(group)
         image.src = multtableView.getImage().src
      }
   }

   // Maybe create symmetry object thumbnails
   for (let inx = 0; inx < group.symmetryObjects.length; inx++) {
      const image = images[inx][3] = {}
      const symmetryObject = group.symmetryObjects[inx]
      image.link = `SymmetryObject.html?groupURL=${group.URL}&diagram=${symmetryObject.name}`
      image.name = symmetryObject.name
      if (inx == 0 && group.thumbnails?.symmetryObject != null) {
         image.src = group.thumbnails.symmetryObject
      } else {
         if (symmetryObjectView == null)
            symmetryObjectView = createSymmetryObjectThumbnailView(THUMBNAIL_SIZE)
         symmetryObjectView.draw(group, image.name)
         image.src = symmetryObjectView.getImage().src
      }
   }

   return images
}

function showAllVisualizersSheet (group) {
   SheetModel.createNewSheet(() => formatAllVisualizersSheet(group))
}

function formatAllVisualizersSheet (group) {
    const iso = group.generators.map( g => [ g, g ] )
    const allVisualizersSheet = [
        {
            className : 'TextElement',
            x : 60, y : 54, w : 800, h : 50,
            text : `All Visualizers for the Group ${group.name}`,
            fontSize : '20pt', alignment : 'center'
        },
        {
            className : 'TextElement',
            x : 60, y : 104, w : 200, h : 50,
            text : `Cayley Diagram`, alignment : 'center'
        },
        {
            className : 'TextElement',
            x : 360, y : 104, w : 200, h : 50,
            text : `Multiplication Table`, alignment : 'center'
        },
        {
            className : 'TextElement',
            x : 660, y : 104, w : 200, h : 50,
            text : `Cycle Graph`, alignment : 'center'
        },
        {
            className : `CDElement`,
            groupURL : group.URL,
            x : 60, y : 154, w : 200, h : 200
        },
        {
            className : `MTElement`,
            groupURL : group.URL,
            x : 360, y : 154, w : 200, h : 200
        },
        {
            className : `CGElement`,
            groupURL : group.URL,
            x : 660, y : 154, w : 200, h : 200
        },
        {
            className : `MorphismElement`,
            source_name : '4', destination_name : '5',
            name : '<i>id</i><sub>1</sub>',
            showInjectionSurjection : true, showManyArrows : true, definingPairs : iso
        },
        {
            className : `MorphismElement`,
            source_name : '5', destination_name : '6',
            name : '<i>id</i><sub>2</sub>',
            showInjectionSurjection : true, showManyArrows : true, definingPairs : iso
        }
    ]

    return allVisualizersSheet
}

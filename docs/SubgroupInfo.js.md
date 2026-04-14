/* @flow

# SubgroupInfo

A [GroupInfo](./GroupInfo.html.md) component that displays information about a group's subgroups,
including a table of the group's subgroups and some of their properties.

```javascript
 */
import {BitSet} from './BitSet.js'
import {createCayleyDiagramThumbnailView} from './CayleyDiagramView.js'
import * as GEUtils from './GEUtils.js'
import {IMAGE_SIZE} from './GroupTable.js'
import * as Library from './Library.js'
import * as MathUtils from './MathUtils.js'
import * as SheetModel from './SheetModel.js'

export {display}

/*::
import {Group} from './Group.js'

import type {
    JSONType,
    SheetElementJSON,
    RectangleElementJSON,
    TextElementJSON,
    VisualizerType,
    VisualizerElementJSON,
    ConnectingElementJSON,
    MorphismElementJSON
} from './SheetModel.js';

type DecoratedSubgroup = Subgroup & {_tierIndex?: number, _used?: boolean};
*/

function display (subgroupInfoElementId, group) {
   const cayleyDiagramThumbnailView = createCayleyDiagramThumbnailView( { width : IMAGE_SIZE, height : IMAGE_SIZE } );
   const subgroupInfoElement = document.getElementById(subgroupInfoElementId)
   subgroupInfoElement.innerHTML = makeSubgroupInfoContent(group, subgroupInfoElementId, cayleyDiagramThumbnailView)

   GEUtils.createActionHandler(subgroupInfoElement, (action) => eval(action))

   // create twisty details on the fly
   const generateDetail = (event) => {
      if (event.target.querySelector('div') == null) {
         const subgroupIndex = parseInt(event.target.getAttribute('subgroup'))
         const expandedContent = formatSubgroupListContent(group, subgroupIndex, cayleyDiagramThumbnailView)
         event.target.insertAdjacentHTML('beforeEnd', expandedContent)
         event.target.removeEventListener('toggle', generateDetail)
      }
   }
   Array.from(document.querySelectorAll('#subgroup-list details')).forEach((element) => {
      if (element.hasAttribute('subgroup')) {
         element.addEventListener('toggle', generateDetail)
      }
   })

   // rebuild content on representation change
   subgroupInfoElement.closest('.all-info')
      .addEventListener('representationChange',
          () => subgroupInfoElement.innerHTML = makeSubgroupInfoContent(group, subgroupInfoElementId))
}

function makeSubgroupInfoContent (group, subgroupInfoElementId, cayleyDiagramGenerator) {
   const htmlFragments = [
      `<style>
         #${subgroupInfoElementId} > details > div {
            margin-top: 1em;
         }
         #${subgroupInfoElementId} > details > summary + div {
            margin-top: 0;
         }
         #${subgroupInfoElementId} .normal-group {
            color: blue;
         }
         #subgroup-list {
            max-height: 75em;
            overflow-y: auto;
         }
       </style>
       <details>
       <summary>
           <span class="title">Subgroups</span>
           <span class="summary">${group.subgroups.length} (${group.subgroups.filter((H) => group.isNormal(H)).length} normal)</span>
       </summary>`,
         ...formatSubgroupInfoHeader(group),
      `<div id="subgroup-list">
         <ul>`,
            ...group.subgroups.map((_, subgroupIndex) => formatSubgroupListElement(group.subgroups[subgroupIndex])),
        `</ul>
       </div>`,
      `</details>`
   ]

   return htmlFragments.join('')
}

function formatSubgroupInfoHeader (group) {
   const htmlFragments = [
      `<div>All <a href="./help/rf-groupterms/index.html#subgroup">subgroups</a> of
          ${group.name} are listed below, together with their
          <a href="./help/rf-groupterms/index.html#generators-for-a-group-or-subgroup">generators</a>
          and the <a href="./help/rf-groupterms/index.html#order-of-a-subgroup">subgroup order</a>.
          <a href="./help/rf-groupterms/index.html#normal-subgroup">Normal subgroups</a> are shown in
          <span class="normal-group">blue</span>.</div>
       <button class="gap-compute" data-GAP="getting the list of all subgroups of a group">Compute this in GAP</button>
       <div>Further information is available by clicking the twisty to the left of the listing.
          This includes a brief description of the subgroup, a list of its elements, a link to the Group Info page of
          the <i>Group Explorer</i> library group that is
          <a href="./help/rf-groupterms/index.html#isomorphicm-isomorphic">isomorphic</a> to it,
          and a link to a sheet showing the subgroup's embedding in the group.
          In addition, if the subgroup is normal, it provides a link to a sheet showing a
          <a href="./help/rf-groupterms/index.html#short-exact-sequence">short exact sequence</a> which exhibits the
          <a href="./help/rf-groupterms/index.html#first-isomorphism-theorem">First Isomorphism Theorem</a>
          applied to the subgroup.</div>
       <button class="gap-compute" data-GAP="checking whether a subgroup is normal">Compute this in GAP</button>
       <div>The subgroups can also be shown arranged in a
          <a href="./help/rf-groupterms/index.html#lattice-of-subgroups">lattice</a>, each shown as
          highlighted portions of the whole group, connected by the identity (inclusion)
          homomorphism. You may see that lattice by
          <a href="" data-action="showSubgroupLattice(group, 'CDElement')">Cayley diagram</a>,
          <a href="" data-action="showSubgroupLattice(group, 'CGElement')">cycle graph</a>,
          <a href="" data-action="showSubgroupLattice(group, 'MTElement')">multiplication table</a>.
          (The subgroup labels in the sheets are colored by
             <a href="./help/rf-groupterms/index.html#conjugacy-classes">subgroup conjugacy class</a>.)
          You can also calculate it in GAP:</div>
          <button class="gap-compute" data-GAP="getting the lattice of subgroups of a group">Compute this in GAP</button>
          <div>And you can see the subgroups and their conjugacy classes arranged in a
          <a href="" data-action="showSubgroupLattice(group, 'TextElement', true)">reduced diagram</a>
          in which subgroups in the same conjugacy class are merged into a single node (which
          may not result in a true lattice!).</div>`,
       (group.isSimple)
          ? `<div>None of the subgroups on the list below is
               <a href="./help/rf-groupterms/index.html#normal-subgroup">normal</a>.
               For this reason, ${group.name} is a
               <a href="./help/rf-groupterms/index.html#simple-group">simple</a> group.</div>`
          : `<div>At least one of the subgroups on the list below is
               <a href="./help/rf-groupterms/index.html#normal-subgroup">normal</a>.
               For this reason, ${group.name} is not a
               <a href="./help/rf-groupterms/index.html#simple-group">simple</a> group.</div>`,
      `<button class="gap-compute" data-GAP="checking if a group is simple">Compute this in GAP</button>`
   ]

   return htmlFragments
}

function formatSubgroupListElement (subgroup) {
   const subgroupIndex = subgroup.group.subgroups.indexOf(subgroup)
   const txtName = () => `H_${subgroupIndex}`
   const htmlName = () => `<i>H</i><sub>${subgroupIndex}</sub>`

   const generators = subgroup.generators.toArray()
      .map( el => subgroup.group.representation[el] );

   let line;
   switch (subgroup.order) {
   case 0:
      line =
         `<li id="${txtName()}">
             <details subgroup="${subgroupIndex}">
                <summary>
                   <span class="normal-group title">
                      ${htmlName()} = ⟨ ${generators[0]} ⟩ is the trivial subgroup { ${generators[0]} }.
                   </span>
                </summary>
             </details>
          </li>`
      break
   case subgroup.group.order:
      line =
         `<li id="${txtName()}">
             <details subgroup="${subgroupIndex}">
                <summary>
                   <span class="normal-group title">
                      ${htmlName()} = ⟨ ${generators.join(', <wbr>')} ⟩ is the group itself.
                   </span>
                </summary>
             </details>
          </li>`
      break
   default:
      line =
         `<li id="${txtName()}">
             <details subgroup="${subgroupIndex}">
                <summary>
                   <span ${(subgroup.isNormal) ? 'class="normal-group title"' : 'class="title"'}>
                      ${htmlName()} = ⟨ ${generators.join(', <wbr>')} ⟩ is a subgroup of order ${subgroup.order}.
                   </span>
                </summary>
             </details>
          </li>`
      break
   }

   return line
}

function formatSubgroupListContent (group, subgroupIndex, cayleyDiagramGenerator) {
   const subgroup = group.subgroups[subgroupIndex]
   const elementRepresentations = subgroup.members.toArray().map(el => group.representation[el])
   const isomorphicGroup = subgroup.isomorphicGroup

   // create thumbnail if it doesn't exist already
   if (isomorphicGroup.thumbnails?.cayleyDiagram == null) {
      cayleyDiagramGenerator.draw(isomorphicGroup, isomorphicGroup.cayleyDiagrams[0]?.name)
      const imageSource = cayleyDiagramGenerator.getImage().src
      isomorphicGroup.thumbnails = isomorphicGroup.thumbnails || {}
      isomorphicGroup.thumbnails.cayleyDiagram = imageSource
      Library.saveGroup(isomorphicGroup)
   }

   const contentHTML = [
      '<div class="flex-h">',
      `<div><img src="${isomorphicGroup.thumbnails.cayleyDiagram}" style="width: 48px; height: 48px"></div>`,
      '<div class="stack-03em" style="margin-left: 1ch">',
         `<div><i>H</i><sub>${subgroupIndex}</sub>${shortDescription(group, subgroup)} is
             <a href="./help/rf-groupterms/index.html#isomorphism-isomorphic">isomorphic</a> to
             <a href="./GroupInfo.html?groupURL=${isomorphicGroup.URL}" target="_blank"
                >${isomorphicGroup.name}</a>. You can see the embedding by
             <a href="" data-action="showEmbeddingSheet(group, ${subgroupIndex}, 'CDElement')">Cayley diagram</a>,
             <a href="" data-action="showEmbeddingSheet(group, ${subgroupIndex}, 'CGElement')">cycle graph</a>,
             <a href="" data-action="showEmbeddingSheet(group, ${subgroupIndex}, 'MTElement')">multiplication table</a>.`,
         '</div>',
         (subgroup.isNormal)
            ? `<div>It is a <a href="./help/rf-groupterms/index.html#normal-subgroup">normal</a> subgroup.
                  See the <a href="./help/rf-groupterms/index.html#short-exact-sequence">short exact sequence</a>
                  exhibiting the
                  <a href="./help/rf-groupterms/index.html#quotient-group">quotient group</a>,
                  isomorphic to <a href="./GroupInfo.html?groupURL=${subgroup.isomorphicQuotientGroup.URL}" target="_blank"
                     >${subgroup.isomorphicQuotientGroup.name},</a> by
                  <a href="" data-action="showQuotientSheet(group, ${subgroupIndex}, 'CDElement')">Cayley diagram</a>,
                  <a href="" data-action="showQuotientSheet(group, ${subgroupIndex}, 'CGElement')">cycle graph</a>,
                  <a href="" data-action="showQuotientSheet(group, ${subgroupIndex}, 'MTElement')">multiplication table</a>.
               </div>`
            : '',
         `<div>The elements of <i>H</i><sub>${subgroupIndex}</sub> are { ${elementRepresentations.join(', ')} }.</div>`,
      `</div></div>`
   ].join('')

   return contentHTML
}

function shortDescription (group, subgroup /*: Subgroup */) {
   let rslt = '';

   const elements = subgroup.members.toArray();
   if (elements.length == 1) {
      rslt = ', the trivial subgroup, ';
   } else if (elements.length == group.order) {
      rslt = ', the whole group, '
      if (MathUtils.isPrimePower(group.order)) {
         const prime = MathUtils.getFactors(group.order)[0];
         rslt += `a <a href="./help/rf-groupterms/index.html#p-subgroup">
                         ${prime}-group</a>, `;
      }
   } else {
      // get first non-one element,
      // find prime for group,
      // test all other elements for even divisibility
      const subgroupElementOrders /*: Array<number> */ = elements.map( el => group.elementOrders[el] );
      const prime = MathUtils.getFactors(subgroupElementOrders[1])[0];
      if (subgroupElementOrders.every(el => el == 1 || el % prime == 0)) {
         if (group.order / subgroup.members.popcount() % prime != 0) {
            rslt = `, a <a href="./help/rf-groupterms/index.html#sylow-p-subgroup">
                        Sylow ${prime}-subgroup</a>, `;
         } else {
            rslt = `, a <a href="./help/rf-groupterms/index.html#p-subgroup">
                        ${prime}-subgroup</a>, `;
         }
      }
   };

   return rslt;
}

function highlightSubgroup ( group, H /*: Subgroup */, type ) {
   const highlightColor = (type == 'CDElement') ? 'hsl(0, 50%, 30%)' : 'hsl(0, 100%, 80%)'
   return Array( group.order ).fill( '' ).map( ( e /*: color */, i ) =>
      H.members.isSet( i ) ? highlightColor : e );
}

// Swiss army knife routine to display subgroup lattice for a group by
//   type (CDELement/CGElement/MTElement/TextElement)
//   reduced (boolean) -- elements organized (and highlighted) by subgroup conjugacy class
//   labelled (boolean) -- whether visualizer has label (ignored if type == TextElement)
function showSubgroupLattice (group, type, reduced = false, labelled = false) {
   SheetModel.createNewSheet(() => formatSubgroupLattice(group, type, reduced, labelled))
}

function formatSubgroupLattice (group, type, reduced, labelled) {
   labelled ||= (type == 'TextElement')
   const conjugateSubgroupClasses = group.getConjugateSubgroupClasses()
   const covering = reduced ? getSubgroupConjugacyClassCovering(group) : getSubgroupCovering(group)
   const subgroupOrders = getSubgroupOrders(group)
   const tiers = reduced
      ? conjugateSubgroupClasses.map((klass) => subgroupOrders.indexOf(group.subgroups[klass.first()].order))
      : group.subgroups.map((H) => subgroupOrders.indexOf(H.order))
   const chains = layoutNodes(tiers, covering)

   // Find the width of a sample caption
   //   'Cl(H_xx) (yy)' if reduced && some conjugacy class has order != 1
   //   'H_xx (order yy)' otherwise
   const {width: captionWidth} = !labelled
      ? {width: 0}
      : (reduced && conjugateSubgroupClasses.some((klass) => klass.popcount() != 1))
         ? captionSize(`<span style="white-space: nowrap">Cl(<i>H</i><sub>${group.order}</sub>) (${group.order})</span>`)
         : captionSize(`<span style="white-space: nowrap"><i>H</i><sub>${group.order}</sub> (order ${group.order})</span>`)

   // Find the size of the title
   const title = (reduced ? 'Reduced ' : '') + `Subgroup Lattice for the group ${group.name}`
   const {width: titleWidth, height: titleHeight} = captionSize(`<span style="font-size: 20pt">${title}</span>`)

   // Use tiers/chains from layoutNode to construct the sheet
   const hSize = Math.max(...chains) + 1
   const vSize = subgroupOrders.length
   const horizontalSpace = window.innerWidth
   const verticalSpace = window.innerHeight - document.querySelector('#heading').offsetHeight - 4 * titleHeight

   const naturalWidth = horizontalSpace / hSize
   const naturalHeight = verticalSpace / vSize
   const naturalSize = Math.min(200, naturalWidth, naturalHeight)

   const naturalCellSize = Math.max(naturalSize, 1.25 * 1.25 * captionWidth) // 10% padding, 10% margin around 20px text
   const latticeWidth = naturalCellSize * hSize
   const latticeHeight = naturalCellSize * vSize
   const scale = Math.min(1.0, horizontalSpace / latticeWidth, verticalSpace / latticeHeight)

   const cellWidth = (hSize <= 3) ? 0.15 * horizontalSpace : scale * naturalCellSize
   const cellHeight = verticalSpace / Math.max(3, vSize)
   const hMargin = Math.ceil( cellWidth * 0.1 )
   const vMargin = hMargin + Math.max(0, ( cellHeight - cellWidth ) / 2)
   const latticeTop = 4 * titleHeight
   const latticeLeft = (hSize * cellWidth > horizontalSpace) ? 0 : (horizontalSpace - hSize * cellWidth) / 2

   // Build the sheet
   const sheetElementsAsJSON = []

   // Add a title over the lattice, centered on the sheet
   sheetElementsAsJSON.push({
      className : 'TextElement',
      text : title,
      x : (horizontalSpace - titleWidth) / 2,
      y : 2 * titleHeight,
      w : 0,
      h : titleHeight,
      fontSize : '20pt',
      alignment : 'center'
   })

   if (type != 'TextElement') {  // labelled visualizer
      // find conjugacy class colors
      const nColors = conjugateSubgroupClasses.filter((klass) => klass.popcount() > 1).length
      const rainbow = Array.from({length: nColors}, (_, inx) => GEUtils.fromRainbow(inx / nColors, .4))
      const colors = conjugateSubgroupClasses.map((klass) => (klass.popcount() > 1) ? rainbow.pop() : '#d8d8d8')

      // find caption size in scratch element, and calculate scaled fontSize
      const {width: captionWidth} = captionSize(
         `<span style="white-space: nowrap"><i>H</i><sub>${group.order}</sub> (order ${group.order})</span>`
      )
      const fontSize = Math.min(20, 20 * (cellWidth - 2 * hMargin) / (captionWidth + 20)) + 'px'

      group.subgroups.forEach( (H /*: Subgroup */, subgroupIndex) => {
         sheetElementsAsJSON.push({
            className : type,
            name : `viz-${subgroupIndex}`,
            groupURL : group.URL,
            x : latticeLeft + chains[subgroupIndex] * cellWidth + hMargin,
            y : latticeTop + tiers[subgroupIndex] * cellHeight + vMargin,
            w : cellWidth - 2 * hMargin,
            h : cellHeight - 2 * vMargin,
            highlight_colors : [highlightSubgroup(group, H, type), [], []]
         })

         const conjugacyClass = conjugateSubgroupClasses.findIndex((klass) => klass.isSet(subgroupIndex))
         const caption = `<span style="white-space: nowrap"><i>H</i><sub>${subgroupIndex}</sub> (order ${H.order})</span>`

         sheetElementsAsJSON.push({
            className: 'TextElement',
            name: `sub-${subgroupIndex}`,
            anchor_name: `viz-${subgroupIndex}`,
            text: caption,
            fontColor: H.isNormal ? 'blue' : 'black',
            color: colors[conjugacyClass],
            alignment: 'center',
            fontSize: fontSize,
            x: latticeLeft + chains[subgroupIndex] * cellWidth + hMargin,
            y: latticeTop + tiers[subgroupIndex] * cellHeight + vMargin + cellHeight - 2 * vMargin,
            w: cellWidth - 2 * hMargin,
         })
      } )
   } else if (reduced) {
      // place each subgroup conjugacy class
      conjugateSubgroupClasses.forEach((classSubgroupsBitSet, classIndex) => {
         const classSubgroups = classSubgroupsBitSet.toArray()
         const isomorphicGroup = group.subgroups[classSubgroups[0]].isomorphicGroup
         const caption = (classSubgroups.length == 1)
            ? `<span style="white-space: nowrap"><i>H</i><sub>${classSubgroups[0]}</sub></span>`
            : `<span style="white-space: nowrap">Cl(<i>H</i><sub>${classSubgroups[0]}</sub>) (${classSubgroups.length})</span>`
         sheetElementsAsJSON.push({
            className: 'TextElement',
            name: `viz-${classIndex}`,
            text: caption,
            fontColor: 'black',
            fontSize: 20 * scale + 'px',
            color: '#d8d8d8',
            alignment: 'center',
            x: latticeLeft + chains[classIndex] * cellWidth + hMargin,
            y: latticeTop + tiers[classIndex] * cellHeight + vMargin,
            w: cellWidth - 2 * hMargin,
         })
      })
   }

   // add connections
   sheetElementsAsJSON.push(...getConnectionJSON(covering))

   return sheetElementsAsJSON
}

function getConnectionJSON (covering) {
   const connectionJSON = covering.map((targets, source) => {
      return targets.toArray().map((target) => {
         return {
            className: 'ConnectingElement',
            source_name: `viz-${source}`,
            destination_name: `viz-${target}`,
            thickness: 2,
            hasArrowhead: false
         }
      })
   })

   return connectionJSON.flat()
}

function captionSize (caption) {
   if (document.getElementById('subgroup-info-scratch') == null) {
      document.body.insertAdjacentHTML('afterbegin',
         `<div id="subgroup-info-scratch"
             style="position: absolute; z-index: -1; font-size: 20px; width: auto; height: auto; padding: 0"></div>`)
   }
   const scratch = document.getElementById('subgroup-info-scratch')
   scratch.innerHTML = caption

   return scratch.getBoundingClientRect()
}

function getSubgroupOrders (group) {
   const subgroupOrders = group.subgroups.reduce((uniqueOrders, H) => {
      if (!uniqueOrders.includes(H.order)) {
         uniqueOrders.push(H.order)
      }
      return uniqueOrders
   }, []).reverse()

   return subgroupOrders
}

function getSubgroupCovering (group) {
   const subgroupCovering = Array(group.subgroups.length)
   // group.subgroups is sorted in increasing subgroup order
   for (let inx = 0; inx < group.subgroups.length; inx++) {
      const inxMembers = group.subgroups[inx].members
      const containsInx = []
      for (let jnx = inx + 1; jnx < group.subgroups.length; jnx++) {
         const jnxMembers = group.subgroups[jnx].members
         // jnx contains inx and we have not found any other inx subgroup that it contains
         if (jnxMembers.contains(inxMembers) && containsInx.every((knx) => !jnxMembers.contains(group.subgroups[knx].members))) {
            containsInx.push(jnx)
         }
      }
      subgroupCovering[inx] = new BitSet(group.subgroups.length, containsInx)
   }
   return subgroupCovering
}

function getSubgroupConjugacyClassCovering (group) {
   // conjugate subgroup classes are sorted by increasing class order
   const subgroupCovering = getSubgroupCovering(group)
   const conjugateSubgroupClasses = group.getConjugateSubgroupClasses()
   const subgroupConjugacyClassCovering = Array(conjugateSubgroupClasses.length)
   for (let inx = 0; inx < conjugateSubgroupClasses.length; inx++) {
      const inxSubgroups = conjugateSubgroupClasses[inx]
      const containsInx = []
      for (let jnx = inx + 1; jnx < conjugateSubgroupClasses.length; jnx++) {
         const jnxSubgroups = conjugateSubgroupClasses[jnx].toArray()
         // if some subgroup of jnx directly contains any subgroup of inx
         if (jnxSubgroups.some((jnxSubgroup) => subgroupCovering[inxSubgroups.first()].isSet(jnxSubgroup))) {
            containsInx.push(jnx)
         }
      }
      subgroupConjugacyClassCovering[inx] = new BitSet(conjugateSubgroupClasses.length, containsInx)
   }

   return subgroupConjugacyClassCovering
}

// lays out subgroup and reduced subgroup lattices
// given: nodes organized by subgroup order (tier), and edges organized by source (node index)
// node corresponds to  subgroup or conjugacy class, edge is direct 'contained in' relation
// nodeTiers = Array<tier>
// edges[source node index] = Array<target node indices>
// produces: X,Y position for each node on the screen, list of connections
function layoutNodes (nodeTiers, edges) {
   const pathsUpFrom = (currentNode, nodePositions, unplacedNodes, position) => {
      unplacedNodes.clear(currentNode)
      nodePositions[currentNode] = position
      // find edges that start here and go to an as-yet unplaced node
      const targets = BitSet.intersection(edges[currentNode], unplacedNodes).toArray()
      targets.forEach((target, inx) => {
         position += (inx == 0) ? 0 : 1
         position = pathsUpFrom(target, nodePositions, unplacedNodes, position)
      })
      return position
   }

   const nodePositions = Array(nodeTiers.length)
   const todo = new BitSet(nodeTiers.length, Array.from({length: nodeTiers.length}, (_, inx) => inx))
   const maxPosition = pathsUpFrom(0, nodePositions, todo, 0)
   nodePositions[0] = nodePositions[nodePositions.length - 1] = maxPosition / 2

   return nodePositions
}

function showEmbeddingSheet (group, indexOfH /*: number */, type /*: VisualizerType */) {
   SheetModel.createNewSheet(() => formatEmbeddingSheet(group, indexOfH, type))
}

function formatEmbeddingSheet (group, indexOfH, type) {
   const H = group.subgroups[indexOfH]
   const libraryH = H.isomorphicGroup
   const embedding = H.isomorphicGroupEmbedding

   const embeddingSheet = [
      {
         className : 'TextElement',
         text : `Embedding ${libraryH.name} as <i>H</i><sub>${indexOfH}</sub> in ${group.name}`,
         x : 60, y : 54, w : 500, h : 40,
         fontSize : '20pt', alignment : 'center'
      },
      {
         className : type, groupURL : libraryH.URL,
         x : 60, y : 104, w : 200, h : 200,
         highlight_colors : [Array( libraryH.order ).fill( 'hsl(0, 100%, 80%)' ), [], []]
      },
      {
         className : type, groupURL : group.URL,
         x : 360, y : 104, w : 200, h : 200,
         highlight_colors : [Array( group.order ).fill( '' )
            .map( ( _, elt ) => embedding.indexOf( elt ) > -1 ? 'hsl(0, 100%, 80%)' : '' ), [], []]
      },
      {
         className : 'MorphismElement',
         source_name : '1', destination_name : '2', name : '<i>e</i>',
         definingPairs : libraryH.generators.map(gen => [gen, embedding[gen]]),
         showManyArrows : true, showInjectionSurjection: true
      }
   ]

   return embeddingSheet
}

function showQuotientSheet (group, indexOfN /*: number */, type /*: VisualizerType */) {
   SheetModel.createNewSheet(() => formatQuotientSheet(group, indexOfN, type))
}

function formatQuotientSheet (group, indexOfN, type) {
   const adj = Math.min(window.innerWidth, window.innerHeight)/1100
   const N = group.subgroups[indexOfN]
   const libraryQ = N.isomorphicQuotientGroup
   const quotientMap = N.isomorphicQuotientMap
   const libraryN = N.isomorphicGroup
   const embedding = N.isomorphicGroupEmbedding
   const L = 10 + 25*adj
   const T = 4 + 150*adj
   const W = 120*adj
   const H = W
   const gap = 100*adj

   function shrink ( order, x, y, w, h ) {
      const factor = 0.5 * ( 1 + order / group.order ),
            hMargin = ( w - factor * w ) / 2,
            vMargin = ( h - factor * h ) / 2;
      return {
         x : x + hMargin, y : y + vMargin, w : factor * w, h : factor * h
      };
   }
   const col1 = 'hsl(60, 100%, 60%)',
         col2 = 'hsl(240, 100%, 80%)',
         col3 = '',
         col4 = 'hsl(120, 100%, 50%)',
         col5 = 'hsl(120, 90%, 85%)',
         loc1 = shrink( 1, L, T, W, H ),
         loc2 = shrink( libraryN.order, L+W+gap, T, W, H ),
         loc3 = shrink( group.order, L+2*W+2*gap, T, W, H ),
         loc4 = shrink( libraryQ.order, L+3*W+3*gap, T, W, H ),
         loc5 = shrink( 1, L+4*W+4*gap, T, W, H ),
         high1 = Array( 1 ).fill( col1 ),
         high2 = Array( libraryN.order ).fill( col2 ),
         high3 = Array( group.order ).fill( col3 ),
         high4 = Array( libraryQ.order ).fill( col3 ),
         high5 = Array( 1 ).fill( col5 );
   embedding.map( elt => high3[elt] = col2 );
   high2[0] = col1;
   high3[0] = col1;
   high4[0] = col4;
   const quotientSheet = [
      {
         className : 'TextElement',
         x : L, y : T-100*adj, w : 5*W+4*gap, h : 50,
         text : `Short Exact Sequence showing ${group.name} / ${libraryN.name} ≅ ${libraryQ.name}`,
         fontSize : `${20*adj}pt`, alignment : 'center'
      },
      {
         className : 'TextElement',
         x : L, y : T-50, w : W, h : 50,
         text : 'ℤ<sub>1</sub>',
         alignment : 'center', fontSize : `${12*adj}pt`
      },
      {
         className : type, groupURL : './groups/Trivial.group',
         x : loc1.x, y : loc1.y, w : loc1.w, h : loc1.h,
         highlight_colors : [high1, [], []]
      },
      {
         className : 'TextElement',
         x : L+W+gap, y : T-50, w : W, h : 50,
         text : libraryN.name, alignment : 'center', fontSize : `${12*adj}pt`
      },
      {
         className : type, groupURL : libraryN.URL,
         x : loc2.x, y : loc2.y, w : loc2.w, h : loc2.h,
         highlight_colors : [high2, [], []]
      },
      {
         className : 'TextElement',
         x : L+2*W+2*gap, y : T-50, w : W, h : 50,
         text : group.name, alignment : 'center', fontSize : `${12*adj}pt`
      },
      {
         className : type, groupURL : group.URL,
         x : loc3.x, y : loc3.y, w : loc3.w, h : loc3.h,
         highlight_colors : [high3, [], []]
      },
      {
         className : 'TextElement',
         x : L+3*W+3*gap, y : T-50, w : W, h : 50,
         text : libraryQ.name, alignment : 'center', fontSize : `${12*adj}pt`
      },
      {
         className : type, groupURL : libraryQ.URL,
         x : loc4.x, y : loc4.y, w : loc4.w, h : loc4.h,
         highlight_colors : [high4, [], []]
      },
      {
         className : 'TextElement',
         x : L+4*W+4*gap, y : T-50, w : W, h : 50,
         text : 'ℤ<sub>1</sub>',
         alignment : 'center', fontSize : `${12*adj}pt`
      },
      {
         className : type, groupURL : './groups/Trivial.group',
         x : loc5.x, y : loc5.y, w : loc5.w, h : loc5.h,
         highlight_colors : [high5, [], []]
      },
      {
         className : 'TextElement',
         x : L+W+gap, y : T+H+25, w : W, h : 50,
         text : '<i>Im(id)</i> = <i>Ker(e)</i>',
         alignment : 'center', fontSize : `${12*adj}pt`
      },
      {
         className : 'TextElement',
         x : L+2*W+2*gap, y : T+H+25, w : W, h : 50,
         text : '<i>Im(e)</i> = <i>Ker(q)</i>',
         alignment : 'center', fontSize : `${12*adj}pt`
      },
      {
         className : 'TextElement',
         x : L+3*W+3*gap, y : T+H+25, w : W, h : 50,
         text : '<i>Im(q)</i> = <i>Ker(z)</i>',
         alignment : 'center', fontSize : `${12*adj}pt`
      },
      {
         className : 'MorphismElement', name : 'id',
         source_name : '2', destination_name : '4',
         showManyArrows : true, showInjectionSurjection : true,
         definingPairs : [ [ 0, 0 ] ]
      },
      {
         className : 'MorphismElement', name : 'e',
         source_name : '4', destination_name : '6',
         showManyArrows : true, showInjectionSurjection : true,
         definingPairs : libraryN.generators.map(gen => [gen, embedding[gen]])
      },
      {
         className : 'MorphismElement', name : 'q',
         source_name : '6', destination_name : '8',
         showManyArrows : true, showInjectionSurjection : true,
         definingPairs : group.generators.map(gen => [gen, quotientMap[gen]])
      },
      {
         className : 'MorphismElement', name : 'z',
         source_name : '8', destination_name : '10',
         showManyArrows : true, showInjectionSurjection : true,
         definingPairs : libraryQ.generators.map(gen => [gen, 0])
      }
   ]

   return quotientSheet
}

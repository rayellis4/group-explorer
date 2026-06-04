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

import {CayleyDiagramModel} from './CayleyDiagramModel.js'
import {CycleGraphModel} from './CycleGraphModel.js'
import {MulttableModel} from './MulttableModel.js'
import {THREE} from '../lib/externals.js'

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
           <span class="summary">${group.subgroups.length} (${group.subgroups.filter((H) => H.isNormal).length} normal)</span>
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
          <div>And you can see the subgroup lattice by conjugacy class by
          <a href="" data-action="showSubgroupLattice(group, 'CDElement', true)">Cayley diagram,</a>
          <a href="" data-action="showSubgroupLattice(group, 'CGElement', true)">cycle graph,</a> or
          <a href="" data-action="showSubgroupLattice(group, 'MTElement', true)">multiplication table,</a>
          where the subgroups in the same conjugacy class are merged into a single node.
          Elements shared by some subgroups in the class carry a white ring;
          elements shared by all are shown in gray.</div>`,
       (group.isSimple)
          ? `<div>None of the subgroups on the list below, other than the trivial subgroup and the group itself, is
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
      const pSubgroupInfo = subgroup.pSubgroupInfo
      if (pSubgroupInfo != null) {
         if (pSubgroupInfo.isSylow) {
            rslt = `, a <a href="./help/rf-groupterms/index.html#sylow-p-subgroup">
                        Sylow ${pSubgroupInfo.p}-subgroup</a>, `;
         } else {
            rslt = `, a <a href="./help/rf-groupterms/index.html#p-subgroup">
                        ${pSubgroupInfo.p}-subgroup</a>, `;
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

function getHighlightColors (group, count, type) {
   const highlightConfiguration = (type == 'CDElement')
      ? new CayleyDiagramModel(group).highlightConfiguration
      : (type == 'CGElement')
         ? new CycleGraphModel(group).highlightConfiguration
         : new MulttableModel(group).highlightConfiguration

   const s = highlightConfiguration.saturation[0]
   const l = highlightConfiguration.lightness[0]
   const offset = highlightConfiguration.hueOffset[0]

   const highlights = []
   for (let inx = 0; inx < count; inx++) {
      const h = inx / count
      const color = new THREE.Color(GEUtils.fromRainbow(h, s, l, offset))
      highlights.push(color)
   }

   return highlights
}

// Swiss army knife routine to display subgroup lattice for a group by
//   type (CDELement/CGElement/MTElement/TextElement)
//   reduced (boolean) -- elements organized (and highlighted) by subgroup conjugacy class
//   labelled (boolean) -- whether visualizer has label (ignored if type == TextElement)
function showSubgroupLattice (group, type, reduced = false, labelled = false) {
   labelled ||= (type == 'TextElement')
   const conjugateSubgroupClasses = group.conjugateSubgroupClasses
   const covering = reduced ? getSubgroupConjugacyClassCovering(group) : getSubgroupCovering(group)
   const subgroupOrders = group.subgroupOrders
      .map((count, inx) => (count == 0) ? null : inx)
      .filter((count) => count != null)
      .sort((a,b) => b - a)  // reverse sort as numbers
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

   // Use tiers/chains from layoutNode to construct the sheet
   const hSize = Math.max(...chains) + 1
   const vSize = subgroupOrders.length
   const horizontalSpace = window.innerWidth - SheetModel.sheetPanelWidth()
   const verticalSpace = window.innerHeight - document.getElementById('heading').offsetHeight

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
   const latticeTop = 0
   const latticeLeft = (hSize * cellWidth > horizontalSpace) ? 0 : (horizontalSpace - hSize * cellWidth) / 2

   // Build the sheet
   const sheetElementsAsJSON = []

   if (!reduced) {  // labelled visualizer
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
   } else {
      // place each subgroup conjugacy class
      conjugateSubgroupClasses.forEach((classSubgroupsBitSet, classIndex) => {
         const conjugacyClassSubgroups = classSubgroupsBitSet.toArray()
         const highlightColors = getHighlightColors(group, conjugacyClassSubgroups.length, type)
         const highlights = [[], [], []]
         const membershipCount = new Array(group.order).fill(0)
         conjugacyClassSubgroups.forEach((subgroupIndex, inx) => {
            group.subgroups[subgroupIndex].members.toArray().forEach((el) => {
               highlights[0][el] = '#' + highlightColors[inx].getHexString()
               membershipCount[el]++
            })
         })
         if (conjugacyClassSubgroups.length > 1) {
            membershipCount.forEach((count, el) => {
               if (count > 1) highlights[1][el] = 'white'
               if (count === conjugacyClassSubgroups.length) highlights[0][el] = '#b0b0b0'
            })
         }

         sheetElementsAsJSON.push({
            className : type,
            name : `viz-${classIndex}`,
            groupURL : group.URL,
            x : latticeLeft + chains[classIndex] * cellWidth + hMargin,
            y : latticeTop + tiers[classIndex] * cellHeight + vMargin,
            w : cellWidth - 2 * hMargin,
            h : cellHeight - 2 * vMargin,
            highlight_colors : highlights
         })

         const caption = (conjugacyClassSubgroups.length == 1)
            ? `<i>H</i><sub>${conjugacyClassSubgroups[0]}</sub>`
            : '<div>' + conjugacyClassSubgroups.map((subgroupIndex, inx) => {
                  const hslObject = highlightColors[inx].getHSL({})
                  const hslString = `hsl(${Math.round(hslObject.h * 360)} 100 40)`
                  return `<span style="color: ${hslString}"><i>H</i><sub>${subgroupIndex}</sub></span>`
               }).join(',<wbr>') + '</div>'
         sheetElementsAsJSON.push({
            className: 'TextElement',
            name: `sub-${classIndex}`,
            anchor_name: `viz-${classIndex}`,
            text: caption,
            fontColor: 'black',
            fontSize: 20 * scale + 'px',
            color: '#e9e9e9',
            alignment: 'center',
            x: latticeLeft + chains[classIndex] * cellWidth + hMargin,
            y: latticeTop + tiers[classIndex] * cellHeight + vMargin + cellHeight - 2 * vMargin,
            w: cellWidth - 2 * hMargin,
         })
      })
   }

   // add connections
   sheetElementsAsJSON.push(...getConnectionJSON(covering))

   const title = reduced
      ? `Reduced Subgroup Lattice for the group ${group.name}`
      : `Subgroup Lattice for the group ${group.name}`
   SheetModel.createNewSheet({title, elements: sheetElementsAsJSON})
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
   return GEUtils.measureHTML(caption, {fontSize: '20px', padding: '0'})
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
   const conjugateSubgroupClasses = group.conjugateSubgroupClasses
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
   const H = group.subgroups[indexOfH]
   const libraryH = H.isomorphicGroup
   const embedding = H.isomorphicGroupEmbedding

   const panelWidth = SheetModel.sheetPanelWidth()
   const W = Math.min(
       5 * window.innerHeight / 17,
       (window.innerWidth - panelWidth) / 2.5  // 2 viz + 1 half-gap = 2.5W
   )
   const Hv = W
   const gap = W / 2
   const totalW = 2 * W + gap
   const L = (window.innerWidth - panelWidth - totalW) / 2
   const vizY = 0.4 * (window.innerHeight - Hv)

   const embeddingSheet = [
      {
         className : type, groupURL : libraryH.URL, name: '1',
         x : L, y : vizY, w : W, h : Hv,
         highlight_colors : [Array( libraryH.order ).fill( 'hsl(0, 100%, 80%)' ), [], []]
      },
      {
         className : type, groupURL : group.URL, name: '2',
         x : L + W + gap, y : vizY, w : W, h : Hv,
         highlight_colors : [Array( group.order ).fill( '' )
            .map( ( _, elt ) => embedding.indexOf( elt ) > -1 ? 'hsl(0, 100%, 80%)' : '' ), [], []]
      },
      {
         className : 'MorphismElement', labelFontSize: '1.25em',
         source_name : '1', destination_name : '2', name : '<i>e</i>',
         definingPairs : libraryH.generators.map(gen => [gen, embedding[gen]]),
         showManyArrows : true, showInjectionSurjection: true
      }
   ]

   const title = `Embedding ${libraryH.name} as <i>H</i><sub>${indexOfH}</sub> in ${group.name}`
   SheetModel.createNewSheet({title: title, elements: embeddingSheet})
}

function showQuotientSheet (group, indexOfN /*: number */, type /*: VisualizerType */) {
   const N = group.subgroups[indexOfN]
   const libraryQ = N.isomorphicQuotientGroup
   const quotientMap = N.isomorphicQuotientMap
   const libraryN = N.isomorphicGroup
   const embedding = N.isomorphicGroupEmbedding

   const panelWidth = SheetModel.sheetPanelWidth()
   const W = Math.min(
       4 * window.innerHeight / 17,
       (window.innerWidth - panelWidth) / 7  // 5 viz + 4 half-gaps = 7W
   )
   const H = W
   const gap = W / 2
   const totalW = 5 * W + 4 * gap
   const L = (window.innerWidth - panelWidth - totalW) / 2
   const vizY = 0.4 * (window.innerHeight - H)
   const txtH = 0.3 * H

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
         loc1 = shrink( 1, L, vizY, W, H ),
         loc2 = shrink( libraryN.order, L+W+gap, vizY, W, H ),
         loc3 = shrink( group.order, L+2*W+2*gap, vizY, W, H ),
         loc4 = shrink( libraryQ.order, L+3*W+3*gap, vizY, W, H ),
         loc5 = shrink( 1, L+4*W+4*gap, vizY, W, H ),
         high1 = Array( 1 ).fill( col1 ),
         high2 = Array( libraryN.order ).fill( col2 ),
         high3 = Array( group.order ).fill( col3 ),
         high4 = Array( libraryQ.order ).fill( col3 ),
         high5 = Array( 1 ).fill( col5 );
   embedding.map( elt => high3[elt] = col2 );
   high2[0] = col1;
   high3[0] = col1;
   high4[0] = col4;
   const headerFontSize = '2em'
   const captionFontSize = '1.25em'
   const quotientSheet = [
      {
         className : 'TextElement',
         x : L, y : vizY - txtH, w : W, h : txtH,
         text : 'ℤ<sub>1</sub>',
         alignment : 'center', fontSize : headerFontSize, opacity : 0
      },
      {
         className : type, name : 'trivial1', groupURL : './groups/Trivial.group',
         x : loc1.x, y : loc1.y, w : loc1.w, h : loc1.h,
         highlight_colors : [high1, [], []]
      },
      {
         className : 'TextElement',
         x : L+W+gap, y : vizY - txtH, w : W, h : txtH,
         text : libraryN.name, alignment : 'center', fontSize : headerFontSize, opacity : 0
      },
      {
         className : type, name : 'n', groupURL : libraryN.URL,
         x : loc2.x, y : loc2.y, w : loc2.w, h : loc2.h,
         highlight_colors : [high2, [], []]
      },
      {
         className : 'TextElement',
         x : L+2*W+2*gap, y : vizY - txtH, w : W, h : txtH,
         text : group.name, alignment : 'center', fontSize : headerFontSize, opacity : 0
      },
      {
         className : type, name : 'g', groupURL : group.URL,
         x : loc3.x, y : loc3.y, w : loc3.w, h : loc3.h,
         highlight_colors : [high3, [], []]
      },
      {
         className : 'TextElement',
         x : L+3*W+3*gap, y : vizY - txtH, w : W, h : txtH,
         text : libraryQ.name, alignment : 'center', fontSize : headerFontSize, opacity : 0
      },
      {
         className : type, name : 'q', groupURL : libraryQ.URL,
         x : loc4.x, y : loc4.y, w : loc4.w, h : loc4.h,
         highlight_colors : [high4, [], []]
      },
      {
         className : 'TextElement',
         x : L+4*W+4*gap, y : vizY - txtH, w : W, h : txtH,
         text : 'ℤ<sub>1</sub>',
         alignment : 'center', fontSize : headerFontSize, opacity : 0
      },
      {
         className : type, name : 'trivial2', groupURL : './groups/Trivial.group',
         x : loc5.x, y : loc5.y, w : loc5.w, h : loc5.h,
         highlight_colors : [high5, [], []]
      },
      {
         className : 'TextElement',
         x : L+W+gap, y : vizY + H, w : W, h : txtH,
         text : '<i>Im(id)</i> = <i>Ker(e)</i>',
         alignment : 'center', fontSize : captionFontSize, opacity : 0, anchor_name : 'n'
      },
      {
         className : 'TextElement',
         x : L+2*W+2*gap, y : vizY + H, w : W, h : txtH,
         text : '<i>Im(e)</i> = <i>Ker(q)</i>',
         alignment : 'center', fontSize : captionFontSize, opacity : 0, anchor_name : 'g'
      },
      {
         className : 'TextElement',
         x : L+3*W+3*gap, y : vizY + H, w : W, h : txtH,
         text : '<i>Im(q)</i> = <i>Ker(z)</i>',
         alignment : 'center', fontSize : captionFontSize, opacity : 0, anchor_name : 'q'
      },
      {
         className : 'MorphismElement', name : 'id', labelFontSize: '1.25em',
         source_name : 'trivial1', destination_name : 'n',
         showManyArrows : true, showInjectionSurjection : true,
         definingPairs : [ [ 0, 0 ] ]
      },
      {
         className : 'MorphismElement', name : 'e', labelFontSize: '1.25em',
         source_name : 'n', destination_name : 'g',
         showManyArrows : true, showInjectionSurjection : true,
         definingPairs : libraryN.generators.map(gen => [gen, embedding[gen]])
      },
      {
         className : 'MorphismElement', name : 'q', labelFontSize: '1.25em',
         source_name : 'g', destination_name : 'q',
         showManyArrows : true, showInjectionSurjection : true,
         definingPairs : group.generators.map(gen => [gen, quotientMap[gen]])
      },
      {
         className : 'MorphismElement', name : 'z', labelFontSize: '1.25em',
         source_name : 'q', destination_name : 'trivial2',
         showManyArrows : true, showInjectionSurjection : true,
         definingPairs : libraryQ.generators.map(gen => [gen, 0])
      }
   ]

   const title = `Short Exact Sequence showing ${group.name} / ${libraryN.name} ≅ ${libraryQ.name}`
   SheetModel.createNewSheet({title: title, elements: quotientSheet})
}

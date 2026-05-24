/* @flow

# SolvableInfo

A [GroupInfo](./GroupInfo.html.md) component that displays information about a group's solvability,
including displaying a solvable decomposition by Cayley diagrams, multiplication table, or cycle
graph, on a [Sheet](./Sheet.html.md).

```javascript
 */
import {DEFAULT_SPHERE_COLOR} from './AbstractDiagramDisplay.js'
import * as GEUtils from './GEUtils.js'
import * as Library from './Library.js'
import * as Log from './Log.js'
import * as SheetModel from './SheetModel.js'

export {display}

function display (solvableGroupElementId, group) {
   const solvableGroupElement = document.getElementById(solvableGroupElementId)
   solvableGroupElement.innerHTML = makeSolvableGroupContent(group)

   GEUtils.createActionHandler(solvableGroupElement, (action) => eval(action))
}

function makeSolvableGroupContent (group) {
   const htmlFragments = [
      `<details>
          <summary>
             <span class="title">Solvable group</span>
             <span class="summary">${group.isSolvable ? 'yes' : 'no'}</span>
          </summary>`
   ]

   if (group.isAbelian) {
      htmlFragments.push(
         `<div>${group.name} is <a href="./help/rf-groupterms/index.html#solvable-group-solvable-decomposition">solvable</a>
            because it is <a href="./help/rf-groupterms/index.html#abelian-group">abelian</a>.</div>`)
   } else if (group.isSolvable) {
      let decomposition /*: Decomposition */ = []
      try {
         decomposition = findSolvableDecomposition(group.subgroups.at(-1))
         const decompositionDisplay = decomposition
            .map((H) => makeGroupRef(H.isomorphicGroup))
            .join(' ⊲ ')  // 'normal subgroup of' character, #22b2

         decomposition.reverse().pop()
         const decompositionExplained = decomposition.map((H, inx) =>
            (inx == decomposition.length - 1)
               ? `<div>The group ${makeGroupRef(H.isomorphicGroup)} is
                     <a href="./help/rf-groupterms/index.html#abelian-group">abelian</a>.</div>`
               : `<div>The <a href="./help/rf-groupterms/index.html#quotient-group">quotient</a> of
                     ${makeGroupRef(H.isomorphicGroup)}</a> by its
                     <a href="./help/rf-groupterms/index.html#normal-subgroup">normal subgroup</a>
                     <i>H</i><sub>${H.isomorphicGroup.subgroups.indexOf(decomposition[inx + 1])}</sub>
                     (<a href="./help/rf-groupterms/index.html#isomorphism-isomorphic">isomorphic</a> to
                     ${makeGroupRef(decomposition[inx + 1].isomorphicGroup)}) gives
                     ${makeGroupRef(decomposition[inx + 1].isomorphicQuotientGroup)}.</div>`
         )

         htmlFragments.push(
            `<div class="indent-children">${group.name} is a
               <a href="./help/rf-groupterms/index.html#solvable-group-solvable-decomposition">solvable</a>
               group by the following solvable decomposition:
               <div class="compact-lines">`,
                  ...decompositionExplained,
              `</div>
             </div>
            <div>In summary, ${decompositionDisplay}.</div>
            <div>You can see a diagram of all the groups in the solvable decomposition,
               including quotient maps, by
                  <a href="" data-action="showSolvableDecompositionSheet(group, 'CDElement')">Cayley diagram</a>,
                  <a href="" data-action="showSolvableDecompositionSheet(group, 'CGElement')">cycle graph</a>, or
                  <a href="" data-action="showSolvableDecompositionSheet(group, 'MTElement')">multiplication table</a>.
             </div>`)
        } catch (err) {
           const unknown_subgroup = decomposition.find((gr) => !'name' in gr)
           htmlFragments.push(
             `<div>Group Explorer is currently unable to determine whether ${group.name} is a
                <a href="./help/rf-groupterms/index.html#solvable-group-solvable-decomposition">solvable</a> group because
                   it does not have access to all the groups it needs. For example, there is a
                <a href="./help/rf-groupterms/index.html#normal-subgroup">normal subgroup</a>
                  of order ${unknown_subgroup.order} that yields an
                  <a href="./help/rf-groupterms/index.html#abelian-group">abelian</a>
                  <a href="./help/rf-groupterms/index.html#quotient-group">quotient</a> group, but that is not
                  <a href="./help/rf-groupterms/index.html#isomorphism-isomorphic">isomorphic</a> to any group in
                  the library currently loaded.</div>
              <div>You will need to more groups loaded (see <a href="">options window</a> for starters)
              to make this computation possible.</div>`)
        }
   } else {
      htmlFragments.push(
         `<div>${group.name} is not a
            <a href="./help/rf-groupterms/index.html#solvable-group-solvable-decomposition">solvable</a> group.</div>`)
      if (group.isSimple) {
         htmlFragments.push(
            `<div>In fact, it does not even have a
               <a href="./help/rf-groupterms/index.html#normal-subgroup">normal subgroup</a>
               that can be used to form an <a href="./help/rf-groupterms/index.html#abelian-group">abelian</a>
               <a href="./help/rf-groupterms/index.html#quotient-group">quotient</a> group.</div>`)
      }
    }

   htmlFragments.push(
      `<button class="gap-compute" data-GAP="checking if a group is solvable">Compute this in GAP</button>
      </details>`)

   return htmlFragments.join('')
}

function makeGroupRef(group /*: AugmentedGroup */) /*: string */ {
   const g = (Library.getGroupByURL(group.URL) == null) ? group.isIsomorphicTo : group
   if (g != null && ('name' in group)) {
      return `<a href="./GroupInfo.html?groupURL=${g.URL}" target="_blank">${g.name}</a>`
   } else {
      return ''
   }
}

function findSolvableDecomposition (subgroup) {
   let decomposition
   if (subgroup.order == 1) {
      decomposition = []
   } else {
      decomposition = findSolvableDecomposition(subgroup.isomorphicGroup.commutatorSubgroup)
   }
   decomposition.push(subgroup)

   return decomposition
}

function showSolvableDecompositionSheet (group /*: Group */, type /*: 'CDElement' | 'CGElement' | 'MTElement' */) {
    const D = findSolvableDecomposition(group.subgroups.at(-1))
    const panelWidth = SheetModel.sheetPanelWidth()
    const sheetHeight = window.innerHeight - document.getElementById('heading').offsetHeight
    const sheetWidth = window.innerWidth - panelWidth
    const n = D.length
    const W = Math.min(4 * sheetHeight / 17, 2 * sheetWidth / (3 * n - 1))
    const H = W
    const txtH = 0.3 * H
    const hgap = W / 2
    const vgap = 3 * W / 4
    const L = (sheetWidth - (n * (W + hgap) - hgap)) / 2
    const top = (sheetHeight - (5 * txtH + 2 * H + vgap)) / 2  // y of title row
    const vizY = top + 4 * txtH                                  // y of decomposition viz row
    const fontSize = 0.1 * H
    const bottomShift = vgap / 4

    // create sheet title and description
    const titleText = `Solvable Decomposition for the group ${group.name}`
    const sheetElementsAsJSON = [
        {
            className : 'TextElement',
            text : titleText,
            x : L, y : top, w : n*W + (n-1)*hgap, h : txtH,
           fontSize : SheetModel.fittedFontSize(titleText, n*W + (n-1)*hgap, 1.0, 3.0),
           alignment : 'center', opacity: 0
        },
        {
            className : 'TextElement',
            text : 'The top row is the solvable decomposition.  '
                + 'The bottom row are abelian quotient groups.',
            x : L, y : top + txtH, w : n*W + (n-1)*hgap, h : 2*txtH,
           fontSize : '1.25em', alignment : 'center', opacity: 0
        }
    ]
    const [s, l] = (type == 'CDElement') ? [0.53, .3] : [1, 0.8]
    let previousVizName
    D.forEach( ( entry, index ) => {
        const previous = (index == 0) ? null : D[index - 1]
        const vizName = `viz-${index}`
       // put name of group atop each element in top row, the decomposition
         sheetElementsAsJSON.push( {
            className : 'TextElement',
            text : entry.isomorphicGroup.name,
            x : L+index*W+index*hgap, y : top + 3*txtH, w : W, h : txtH,
            fontSize : SheetModel.fittedFontSize(entry.isomorphicGroup.name, W, 0.7, 1.25),
            alignment : 'center', opacity : 0
         } )
       if (index == 0) {
          // trivial group: shrink to W/3 and center in column
          sheetElementsAsJSON.push( {
             className : type, name : vizName,
             groupURL : entry.isomorphicGroup.URL,
             x : L + W/4, y : vizY + H/4, w : W/2, h : H/2,
             highlight_colors : [[GEUtils.fromRainbow(0, s, l)], [], []],
          } )
       } else {
          // current decomposition element
          const cosetColors = Array.from({length: previous.index},
             (_, inx) => GEUtils.fromRainbow(inx / previous.index, s, l))
          const highlights = []
          previous.leftCosets.forEach((coset, inx) => {
             coset.toArray().forEach((el) => highlights[el] = cosetColors[inx])
          })
          sheetElementsAsJSON.push( {
             className : type, name : vizName,
             groupURL : entry.isomorphicGroup.URL,
             x : L+index*W+index*hgap, y : vizY, w : W, h : H,
             highlight_colors : [highlights, [], []], organizing_subgroup: previous.subgroupIndex
          } )

          // morphism from previous decomposition element
          sheetElementsAsJSON.push( {
             className : 'MorphismElement',
             name : `<i>e</i><sub>${index}</sub>`,
             labelFontSize : `${fontSize}px`,
             source_name : previousVizName, destination_name : vizName,
             showManyArrows : true, arrowColor: 'source',
             definingPairs : previous.isomorphicGroup.generators.map(gen => [gen, previous.isomorphicGroupEmbedding[gen]])
          } )

          // quotient group
          const qVizName = `q-viz-${index}`
          const quotientGroupHighlights = []
          previous.leftCosets.forEach((coset, inx) => {
             quotientGroupHighlights[previous.isomorphicQuotientMap[coset.first()]] = cosetColors[inx]
          })
          sheetElementsAsJSON.push( {
             className : type, name : qVizName,
             groupURL : previous.isomorphicQuotientGroup.URL,
             x : L+index*W+index*hgap+bottomShift, y : vizY+H+vgap,
             w : W, h : H,
             highlight_colors : [quotientGroupHighlights, [], []]
          } )

          // quotient map
          sheetElementsAsJSON.push( {
             className : 'MorphismElement',
             name : `<i>q</i><sub>${index}</sub>`,
             labelFontSize : `${fontSize}px`,
             source_name : vizName, destination_name : qVizName,
             showManyArrows : true, arrowColor: 'source',
             definingPairs : entry.isomorphicGroup.generators.map(gen => [gen, previous.isomorphicQuotientMap[gen]])
          } )

          // quotient group name
          sheetElementsAsJSON.push( {
             className : 'TextElement',
             text : entry.isomorphicGroup.name + ' / '
                + previous.isomorphicGroup.name + ' ≅ '
                + previous.isomorphicQuotientGroup.name,
             x : L+index*W+index*hgap+bottomShift, y : vizY+2*H+vgap,
             w : W, h : txtH,
             fontSize : '1.25em', alignment : 'center', opacity: 0,
             anchor_name : qVizName
          } )
       }
       previousVizName = vizName
    })

    SheetModel.createNewSheet(sheetElementsAsJSON)
}

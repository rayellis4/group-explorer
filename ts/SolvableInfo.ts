/*

# SolvableInfo

A [GroupInfo](./GroupInfo.html.md) component that displays information about a group's solvability,
including displaying a solvable decomposition by Cayley diagrams, multiplication table, or cycle
graph, on a [Sheet](./Sheet.html.md).

```javascript
 */
import * as GEUtils from './GEUtils.js'
import * as Library from './Library.js'
import * as SheetModel from './SheetModel.js'

import type { Group } from './Group.ts'
import type { Subgroup } from './Subgroup.ts'

export function display (solvableGroupElementId: string, group: Group) {
   const solvableGroupElement = document.getElementById(solvableGroupElementId) as HTMLElement
   solvableGroupElement.innerHTML = makeSolvableGroupContent(group)

   GEUtils.createActionHandler(solvableGroupElement, (action) => eval(action))
}

function makeSolvableGroupContent (group: Group) {
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
      const decomposition: Subgroup[] = findSolvableDecomposition(group.subgroups.at(-1) as Subgroup)

      const decompositionDisplay = decomposition
         .map((H) => makeGroupRef(H.isomorphicGroup))
         .join(' ⊲ ')  // 'normal subgroup of' character, #22b2

      decomposition.reverse().pop()
      const decompositionExplanation = decomposition.map((H, inx) =>
         (inx == decomposition.length - 1)
            ? `<div>The group ${makeGroupRef(H.isomorphicGroup)} is
                  <a href="./help/rf-groupterms/index.html#abelian-group">abelian</a>.</div>`
            : `<div>The <a href="./help/rf-groupterms/index.html#quotient-group">quotient</a> of
                  ${makeGroupRef(H.isomorphicGroup)}</a> by its
                  <a href="./help/rf-groupterms/index.html#normal-subgroup">normal subgroup</a>
                  <i>H</i><sub>${H.isomorphicGroup.subgroups.indexOf(decomposition[inx + 1])}</sub>
                  (<a href="./help/rf-groupterms/index.html#isomorphism-isomorphic">isomorphic</a> to
                  ${makeGroupRef(decomposition[inx + 1].isomorphicGroup)}) gives
                  ${makeGroupRef(decomposition[inx + 1].isomorphicQuotientGroup as Group)}.</div>`
      )

      htmlFragments.push(
         `<div class="indent-children">${group.name} is a
             <a href="./help/rf-groupterms/index.html#solvable-group-solvable-decomposition">solvable</a>
             group by the following solvable decomposition:
             <div class="compact-lines">`,
               ...decompositionExplanation,
            `</div>
          </div>
          <div>In summary, ${decompositionDisplay}.</div>
          <div>You can see a diagram of all the groups in the solvable decomposition, including quotient maps, by
             <a href="" data-action="showSolvableDecompositionSheet(group, 'CDElement')">Cayley diagram</a>
             <a href="" data-action="showSolvableDecompositionSheet(group, 'CGElement')">cycle graph</a>, or
             <a href="" data-action="showSolvableDecompositionSheet(group, 'MTElement')">multiplication table</a>.
          </div>`)
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

function makeGroupRef (group: Group): string {
   return `<a href="./GroupInfo.html?groupURL=${group.URL}" target="_blank">${group.name}</a>`
}

function findSolvableDecomposition (subgroup: Subgroup): Subgroup[] {
   let decomposition: Subgroup[]
   if (subgroup.order == 1) {
      decomposition = []
   } else {
      decomposition = findSolvableDecomposition(subgroup.isomorphicGroup.commutatorSubgroup)
   }
   decomposition.push(subgroup)

   return decomposition
}

function showSolvableDecompositionSheet (group: Group, type: SheetModel.VisualizerType) {
    const D = findSolvableDecomposition(group.subgroups.at(-1) as Subgroup)
    const panelWidth = SheetModel.sheetPanelWidth()
    const sheetHeight = window.innerHeight - (document.getElementById('heading') as HTMLElement).offsetHeight
    const sheetWidth = window.innerWidth - panelWidth
    const n = D.length
    const W = Math.min(4 * sheetHeight / 17, 2 * sheetWidth / (3 * n - 1))
    const H = W
    const txtH = 0.3 * H
    const hgap = W / 2
    const vgap = 3 * W / 4
    const L = (sheetWidth - (n * (W + hgap) - hgap)) / 2
    const top = 0.4 * (sheetHeight - (3 * txtH + 2 * H + vgap))  // y of description row
    const vizY = top + txtH                                      // y of decomposition viz row
    const maxFittedFontSize = 1.5 + 0.5 * (H - 200) / 200
    const fittedFontSize = SheetModel.fittedFontSize(group.name, W, 0.7, maxFittedFontSize)
    const bottomShift = vgap / 4

    const titleText = `Solvable Decomposition for the group ${group.name}`
    const sheetElementsAsJSON: SheetModel.SheetElementRequest[] = [
        {
            className : 'TextElement',
            text : '(The top row is the solvable decomposition.  '
                + 'The bottom row is the abelian quotient groups.)',
            x : L, y : vizY+2*H+vgap+2*txtH, w : n*W + (n-1)*hgap, h : txtH,
            fontSize : '1.25em', alignment : 'center', opacity: 0
        }
    ]
    const [s, l] = (type == 'CDElement') ? [0.53, .3] : [1, 0.8]
    let previousVizName: Maybe<string>
    D.forEach( ( entry, index ) => {
        const vizName = `viz-${index}`
       // put name of group atop each element in top row, the decomposition
         sheetElementsAsJSON.push( {
            className : 'TextElement',
            text : entry.isomorphicGroup.name,
            x : L+index*W+index*hgap, y : top, w : W, h : txtH,
            fontSize: fittedFontSize,
            alignment : 'center', opacity : 0
         } )
       if (index == 0) {
          // trivial group: shrink to W/3 and center in column
          sheetElementsAsJSON.push( {
             className : type, id : vizName,
             groupURL : entry.isomorphicGroup.URL,
             x : L + W/4, y : vizY + H/4, w : W/2, h : H/2,
             highlight_colors : [[GEUtils.fromRainbow(0, s, l)], [], []],
          } )
       } else {
          const previous = D[index - 1]
          // current decomposition element
          const cosetColors = Array.from({length: previous.index},
             (_, inx) => GEUtils.fromRainbow(inx / previous.index, s, l))
          const highlights: Maybe<color>[] = []
          previous.leftCosets.forEach((coset, inx) => {
             coset.toArray().forEach((el) => highlights[el] = cosetColors[inx])
          })
          sheetElementsAsJSON.push( {
             className : type, id : vizName,
             groupURL : entry.isomorphicGroup.URL,
             x : L+index*W+index*hgap, y : vizY, w : W, h : H,
             highlight_colors : [highlights, [], []], organizing_subgroup: previous.subgroupIndex
          } )

          // morphism from previous decomposition element
          sheetElementsAsJSON.push( {
             className : 'MorphismElement',
             morphismName : `<i>e</i><sub>${index}</sub>`,
             fontSize : '1.25em',
             source_id : previousVizName as string, destination_id : vizName,
             showManyArrows : true, arrowColor: 'source',
             definingPairs : previous.isomorphicGroup.generators.map(gen => [gen, previous.isomorphicGroupEmbedding[gen]])
          } )

          // quotient group
          const qVizName = `q-viz-${index}`
          const quotientGroupHighlights: Maybe<color>[] = []
          previous.leftCosets.forEach((coset, inx) => {
             const previousQuotientMap = previous.isomorphicQuotientMap as groupElement[]
             quotientGroupHighlights[previousQuotientMap[coset.first() as groupElement]] = cosetColors[inx]
          })
          sheetElementsAsJSON.push( {
             className : type, id : qVizName,
             groupURL : (previous.isomorphicQuotientGroup as Group).URL,
             x : L+index*W+index*hgap+bottomShift, y : vizY+H+vgap,
             w : W, h : H,
             highlight_colors : [quotientGroupHighlights, [], []]
          } )

          // quotient map
          sheetElementsAsJSON.push( {
             className : 'MorphismElement',
             morphismName : `<i>q</i><sub>${index}</sub>`,
             fontSize : '1.25em',
             source_id : vizName, destination_id : qVizName,
             showManyArrows : true, arrowColor: 'source',
             definingPairs : entry.isomorphicGroup.generators
                .map(gen => [gen, (previous.isomorphicQuotientMap as groupElement[])[gen]])
          } )

          // quotient group name
          sheetElementsAsJSON.push( {
             className : 'TextElement',
             text : entry.isomorphicGroup.name + ' / '
                + previous.isomorphicGroup.name + ' ≅ '
                + (previous.isomorphicQuotientGroup as Group).name,
             x : L+index*W+index*hgap+bottomShift, y : vizY+2*H+vgap,
             w : W, h : txtH,
             fontSize : fittedFontSize, alignment : 'center', opacity: 0,
             anchor_id : qVizName
          } )
       }
       previousVizName = vizName
    })

    SheetModel.createNewSheet({title: titleText, elements: sheetElementsAsJSON})
}

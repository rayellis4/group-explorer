/* @flow

# ClassEquationInfo

A [GroupInfo](./GroupInfo.html.md) component that displays a group's class equation and conjugacy
class informaation.

```javascript
 */
import * as GEUtils from './GEUtils.js';
import * as SheetModel from './SheetModel.js';

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
 */

function display (classEquationInfoElementId, group) {
   const classEquationInfoElement = document.getElementById(classEquationInfoElementId)
   classEquationInfoElement.innerHTML = makeClassEquationContent(group)

   GEUtils.createActionHandler(classEquationInfoElement, (action) => eval(action))

   // rebuild content on representation change
   classEquationInfoElement.closest('.all-info')
      .addEventListener('representationChange', () => classEquationInfoElement.innerHTML = makeClassEquationContent(group))
}

function makeClassEquationContent (group) {
   const htmlFragments = [
      `<details>
          <summary>
             <span class="title">Class equation</span>
             <span class="summary">${classEquation(group)}</span>
          </summary>`
   ]

   htmlFragments.push(
      `<div class="indent-children">The <a href="./help/rf-groupterms/index.html#class-equation">class equation</a>
       describes the partitioning of the group by its
       <a href="./help/rf-groupterms/index.html#conjugacy-classes">conjugacy classes</a>:
       the sum of of the size of the conjugacy classes equals the
       <a href="./help/rf-groupterms/index.html#order-of-a-group">order of the group</a>.
       The class equation for ${group.name} is <div>${classEquation(group)}</div></div>`)

   if (group.isAbelian) {
      htmlFragments.push(
         `<div>Each of the ${group.order} elements in the group is in a conjugacy class of its own,
            because the group is abelian.</div>`)
   } else {
      htmlFragments.push(
         `<div class="indent-children">The <a href="./help/rf-groupterms/index.html#conjugacy-classes">conjugacy classes</a>
            used in the class equation are listed here:
            <ul>`,
               ...group.conjugacyClasses.map((conj) =>
                  ['<li>', conj.toArray().map((el) => group.representation[el]).join(', '), '</li>'].join('')),
           `</ul>
          </div>`)
   }

   htmlFragments.push(
      `<div>To see a visual representation of this class equation, click one of the following links:
          <br>
          Show me by
          <a href="" data-action="showAsSheet(group, 'CDElement')">Cayley diagrams</a>,
          <a href="" data-action="showAsSheet(group, 'MTElement')">multiplication tables</a>,
          or <a href="" data-action="showAsSheet(group, 'CGElement')">cycle graphs</a>.
       </div>
       <button class="gap-compute" data-GAP="computing the numbers in a class equation">Compute this in GAP</button>
       </details>`)

   return htmlFragments.join('')
}

function classEquation (group) {
   if (group.order > 5 && group.conjugacyClasses.every( (el) => el.popcount() == 1 )) {
      return `1 + 1 + ... (${group.order} times) ... + 1 = ${group.order}`
   } else {
      return group.conjugacyClasses
         .map( (el) => el.popcount() )
         .join(' + ') +
         ` = ${group.order}`
   }
}

function addHighlights (group, i /*: number */, array /*: ?Array<null | void | color> */) /*: Array<null | void | color> */ {
    if ( !array ) array = (Array( group.order ).fill('') /*: Array<null | void | string> */);
    return array.map( ( e, j ) => group.conjugacyClasses[i].isSet( j ) ? GEUtils.fromRainbow( i / group.conjugacyClasses.length ) : e );
}

function showAsSheet (group, type /*: VisualizerType*/) {
    const n = group.conjugacyClasses.length
    // If the group is abelian, it may have an equation like
    // 1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1=17, which we want to abbreviate
    // as 1+1+1+...+1=17, so we have "fake" values of n and i:
    const fakeN = (n > 6) ? 5 : n
    const numCols = fakeN + 1

    // responsive layout: center 50% of screen, matching SolvableInfo scale; clear of right panel
    const opFrac = 0.5   // +/= column width as fraction of visualizer width
    const W = Math.min(
        2 * window.innerHeight / 17,
        0.5 * window.innerWidth / (numCols + (numCols - 1) * opFrac)
    )
    const H = W
    const opW = opFrac * W
    const fontSize = 0.1 * H
    const numH = 3 * H / 8
    const titleH = 0.3 * H
    const totalW = numCols * W + (numCols - 1) * opW
    const L = (window.innerWidth - SheetModel.sheetPanelWidth() - totalW) / 2
    const T = (window.innerHeight - titleH - numH - H) / 2

    const sheetElementsAsJSON = [
        {
            className : 'TextElement',
            x : L, y : T, w : totalW, h : titleH,
            text : `Class Equation for the Group ${group.name}`,
            fontSize : SheetModel.fittedFontSize(`Class Equation for the Group ${group.name}`, totalW),
            alignment : 'center', opacity: 0
        }
    ]

    for (let i = 0; i < fakeN; i++) {
        const fakeIndex = (fakeN == n) ? i
            : (i < 3) ? i : (i == 3) ? -1 : n - 1
        const colX = L + i * (W + opW)
        const opX = colX + W
        const numY = T + titleH
        const vizY = T + titleH + numH

        if (fakeIndex == -1) {
            sheetElementsAsJSON.push(
                { className: 'TextElement', x: colX, y: numY, w: W, h: numH,
                  text: '...', fontSize: `${fontSize}px`, alignment: 'center', opacity: 0 },
                { className: 'TextElement', x: colX, y: vizY, w: W, h: H,
                  text: '...', fontSize: `${fontSize}px`, alignment: 'center', opacity: 0 }
            )
        } else {
            sheetElementsAsJSON.push(
                { className: 'TextElement', x: colX, y: numY, w: W, h: numH,
                  text: `${group.conjugacyClasses[fakeIndex].popcount()}`,
                  fontSize: `${fontSize}px`, alignment: 'center', opacity: 0 },
                { className: type, groupURL: group.URL, diagram_name: group.cayleyDiagrams[0]?.name,
                  x: colX, y: vizY, w: W, h: H,
                  highlight_colors: [addHighlights(group, fakeIndex), [], []] }
            )
        }

        sheetElementsAsJSON.push(
            { className: 'TextElement', x: opX, y: numY, w: opW, h: numH,
              text: (fakeIndex < n - 1) ? '+' : '=',
              fontSize: `${fontSize}px`, alignment: 'center', opacity: 0 },
            { className: 'TextElement', x: opX, y: vizY, w: opW, h: H,
              text: (fakeIndex < n - 1) ? '+' : '=',
              fontSize: `${fontSize}px`, alignment: 'center', opacity: 0 }
        )
    }

    // last column: group order and full group visualizer
    const lastX = L + fakeN * (W + opW)
    const numY = T + titleH
    const vizY = T + titleH + numH
    let highlights = null
    for (let i = 0; i < n; i++) highlights = addHighlights(group, i, highlights)
    sheetElementsAsJSON.push(
        { className: 'TextElement', x: lastX, y: numY, w: W, h: numH,
          text: `${group.order}`,
          fontSize: `${fontSize}px`, alignment: 'center', opacity: 0 },
        { className: type, groupURL: group.URL, diagram_name: group.cayleyDiagrams[0]?.name,
          x: lastX, y: vizY, w: W, h: H,
          highlight_colors: [highlights, [], []] }
    )

    SheetModel.createNewSheet(sheetElementsAsJSON)
}

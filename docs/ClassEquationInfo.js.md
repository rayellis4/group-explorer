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
   SheetModel.createNewSheet(() => formatAsSheet(group, type))
}

function formatAsSheet (group, type /*: VisualizerType*/) {
    const n = group.conjugacyClasses.length;
    // If the group is abelian, it may have an equation like
    // 1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1=17, which we want to abbreviate
    // as 1+1+1+...+1=17, so we have "fake" values of n and i:<
    const fakeN = ( group.isAbelian && group.order > 5 ) ? 5 : n;
    // Add title at top of sheet
    var sheetElementsAsJSON = [
        {
            className : 'TextElement',
            x : 60, y : 54, w : 150*fakeN+100, h : 50,
            text : `Class Equation for the Group ${group.name}`,
            fontSize : '20pt', alignment : 'center'
        }
    ];
    for ( var i = 0 ; i < fakeN ; i++ ) {
        const fakeIndex = ( fakeN == n ) ? i :
              ( i < 3 ) ? i : ( i == 3 ) ? -1 : n - 1;
        if ( fakeIndex == -1 ) { // draw the ellipses
            sheetElementsAsJSON.push( {
                className : 'TextElement',
                x : 60 + 150*i, y : 104, w : 100, h : 50,
                text : '...', alignment : 'center'
            } );
            sheetElementsAsJSON.push( {
                className : 'TextElement',
                x : 60 + 150*i, y : 191, w : 100, h : 50,
                text : '...', alignment : 'center'
            } );
        } else { // draw the acutal CC order and visualizer
            // Add each conjugacy class in two parts:
            // First, its order as an integer:
            sheetElementsAsJSON.push( {
                className : 'TextElement',
                x : 60 + 150*i, y : 104, w : 100, h : 50,
                text : `${group.conjugacyClasses[fakeIndex].popcount()}`,
                alignment : 'center'
            } );
            // Second, its visualization as highlighted elements in a visualizer:
            sheetElementsAsJSON.push( {
                className : type, groupURL : group.URL,
                x : 60 + 150*i, y : 154, w : 100, h : 100,
                highlights : { background : addHighlights(group, fakeIndex) }
            } );
        }
        // Then add a "+" or an "=" in each of those two rows
        // (always a "+" until the last step, which should be an "="):
        sheetElementsAsJSON.push( {
            className : 'TextElement',
            x : 160 + 150*i, y : 104, w : 50, h : 50,
            text : ( fakeIndex < n - 1 ) ? '+' : '=', alignment : 'center'
        } );
        sheetElementsAsJSON.push( {
            className : 'TextElement',
            x : 160 + 150*i, y : 191, w : 50, h : 50,
            text : ( fakeIndex < n - 1 ) ? '+' : '=', alignment : 'center'
        } );
    }
    // Add the group order in the top row:
    sheetElementsAsJSON.push( {
        className : 'TextElement',
        x : 60 + 150*fakeN, y : 104, w : 100, h : 50,
        text : `${group.order}`,
        alignment : 'center'
    } );
    // And the entire group, with rainbow highlighting by conjugacy classes,
    // in the bottom row:
    var highlights = null;
    for ( var i = 0 ; i < n ; i++ ) highlights = addHighlights(group, i, highlights);
    sheetElementsAsJSON.push( {
        className : type, groupURL : group.URL,
        x : 60 + 150*fakeN, y : 154, w : 100, h : 100,
        highlights : { background : ((highlights /*: any */) /*: Array<null | void | color> */) }
    } );

    return sheetElementsAsJSON
}

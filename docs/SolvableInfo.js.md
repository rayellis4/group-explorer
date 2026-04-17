/* @flow

# SolvableInfo

A [GroupInfo](./GroupInfo.html.md) component that displays information about a group's solvability,
including displaying a solvable decomposition by Cayley diagrams, multiplication table, or cycle
graph, on a [Sheet](./Sheet.html.md).

```javascript
 */
import {DEFAULT_SPHERE_COLOR} from './AbstractDiagramDisplay.js'
import {BitSet} from './BitSet.js'
import * as GEUtils from './GEUtils.js'
import {IsomorphicGroups} from './IsomorphicGroups.js'
import * as Library from './Library.js'
import * as Log from './Log.js'
import * as SheetModel from './SheetModel.js'

export {display}

/*::
import {Group} from './Group.js';

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

type AugmentedGroup = Group & {
    isIsomorphicTo?: Group,
    subgroupIndex?: number,
    subgroupIsomorphicTo?: Group,
    quotientIsomorphicTo?: Group
};
type Decomposition = Array<AugmentedGroup>;

type GroupWithMaybeDetails = {
    group: Group,
    embeddingFromPrevious?: Array<number>,
    quotientByPrevious?: Group,
    quotientMap?: Array<groupElement>
};
type GroupWithDetails = {
    group: Group,
    embeddingFromPrevious: Array<number>,
    quotientByPrevious: Group,
    quotientMap: Array<groupElement>
};
*/

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
         // decomposition = ((findSolvableDecomposition(group) /*: any */) /*: Decomposition */)
         decomposition = findSolvableDecomposition(group.subgroups[group.subgroups.length - 1])

         const decompositionDisplay = [...decomposition, group.subgroups[0]]
            .map(H => makeGroupRef(H.isomorphicGroup))
            .reverse()
            .join(' ⊲ ')  // 'normal subgroup of' character, #22b2

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

// given group, returns sequence of subgroups
function findSolvableDecomposition (subgroup, acc = []) /*: ?Decomposition */ {
   const subgroupAsGroup = subgroup.isomorphicGroup
   acc.push(subgroup)
    if (subgroupAsGroup.isAbelian) {
        return acc;
    }

    // search subgroups for normal subgroup with Abelian quotient group
   const subgroups = subgroupAsGroup
      .subgroups
      .filter((H) => H.order != 1 && H.order != subgroupAsGroup.order && H.isNormal)
   for (const H of subgroups) {
      if (H.isomorphicQuotientGroup.isAbelian) {
         return findSolvableDecomposition(H, acc)
      }
   }

   return undefined;
}

// Works very much like the previous function, but includes lots more
// details useful for illustrating the whole thing in a sheet.
// Assumes all groups in library loaded.
function getDetailedSolvableDecomposition ( G /*: Group */) /*: ?Array<GroupWithMaybeDetails> */ {
    const Z_1 = Library.getGroupsByOrder(1)[0]
    if ( !G.isSolvable ) {
        return null;
    }
    if ( G.isAbelian ) {
        return [
            {
                group : Z_1
            },
            {
                group : G,
                embeddingFromPrevious : [ 0 ],
                quotientByPrevious : G,
                quotientMap : G.elements.slice()
            }
        ];
    }
    for ( var i = 0 ; i < G.subgroups.length ; i++ ) {
        const H = G.subgroups[i];
        if ( H.order == 1 ) continue;
        if ( H.order == G.order ) continue;
        if ( !H.isNormal ) continue;
        const [ N, e ] = IsomorphicGroups.findEmbedding( G, H );
        const [ Q, q ] = IsomorphicGroups.findQuotient( G, H );
        if ( !Q.isAbelian ) continue;
        const D = getDetailedSolvableDecomposition( N );
        if ( !D ) continue;
        D.push( {
            group : G,
            embeddingFromPrevious : e,
            quotientByPrevious : Q,
            quotientMap : q
        } );
        return D;
    }
    const shortName = ((G /*: any */) /*: {shortName: ?string} */).shortName || '(unnamed)';
    Log.warn( `Warning!  The group ${shortName} was not solvable, `
              + 'but this function checked G.isSolvable at the outset!  '
              + 'Something is wrong.' );
    return null;
}

function showSolvableDecompositionSheet (group, type /*: VisualizerType */) {
   SheetModel.createNewSheet(formatSolvableDecompositionSheet(group, type))
}

function formatSolvableDecompositionSheet (group, type /*: VisualizerType */) {
    const D = getDetailedSolvableDecomposition( group );
    if ( !D ) return alert( 'Error computing solvable decomposition' );
    const n = D.length,
          L = 35, T = 179, txtH = 50, W = Math.floor( 600 / n ), H = W,
          hgap = Math.floor( W / 3 ), vgap = 100, bottomShift = vgap/4;
    // create sheet title and description
    var sheetElementsAsJSON = [
        {
            className : 'TextElement',
            text : `Solvable Decomposition for the group ${group.name}`,
            x : L, y : T - 3*txtH, w : n*W + (n-1)*hgap, h : txtH,
            fontSize : '20pt', alignment : 'center'
        },
        {
            className : 'TextElement',
            text : 'The top row is the solvable decomposition.  '
                + 'The bottom row are abelian quotient groups.',
            x : L, y : T - 2*txtH, w : n*W + (n-1)*hgap, h : txtH,
            alignment : 'center'
        }
    ];
    const red = 'hsl(0, 100%, 80%)';
    const notred = DEFAULT_SPHERE_COLOR;
    var previous = null, previousIndex = -1;
    D.map( ( entry, index ) => {
        // put name of group atop each element in top row, the decomposition
        const groupName = ((entry.group /*: any */) /*: {name?: string} */).name || '(unnamed)';
        sheetElementsAsJSON.push( {
            className : 'TextElement',
            text : groupName,
            x : L+index*W+index*hgap, y : T-txtH, w : W, h : txtH,
            alignment : 'center'
        } );
        // put visualizer for each element in top row, the decomposition
        const subgroupElts = entry.embeddingFromPrevious
           ? entry.embeddingFromPrevious.filter( ( value, index, self ) => self.indexOf( value ) === index )
           : [ 0 ];
        const subgroupBitSet = new BitSet( entry.group.order, subgroupElts );
        const elementOrder = entry.group.getCosets( subgroupBitSet )
              .map( coset => coset.toArray() )
              .reduce( ( list1 /*: Array<groupElement> */, list2 /*: Array<groupElement> */ ) => list1.concat( list2 ), [ ] );
        Log.debug( elementOrder );
        const highlight = elementOrder.map( ( elt, index ) => subgroupBitSet.get( index ) ? red : notred );
        sheetElementsAsJSON.push( {
            className : type,
            groupURL : ((entry.group /*: any */) /*: {URL?: string} */).URL || '(unknown)',
            x : L+index*W+index*hgap, y : T, w : W, h : H,
            highlight_colors : [highlight, [], []]
        } );
        // for every visualizer except the trivial group, add the
        // embedding map, the quotient group, the quotient map, and its name.
        const thisIndex = sheetElementsAsJSON.length - 1;
        if ( previous ) {
            const embeddingFromPrevious = ((entry /*: any */) /*: {embeddingFromPrevious: Array<number>} */).embeddingFromPrevious,
                  quotientByPrevious = ((entry /*: any */) /*: {quotientByPrevious: Group} */).quotientByPrevious,
                  quotientMap = ((entry /*: any */) /*: {quotientMap: Array<groupElement>} */).quotientMap;
            // embedding from previous
            sheetElementsAsJSON.push( {
                className : 'MorphismElement',
                name : `<i>e</i><sub>${index}</sub>`,
                source_name : `${previousIndex}`, destination_name : `${thisIndex}`,
                showManyArrows : true,
                definingPairs : previous.group.generators.map(gen => [gen, embeddingFromPrevious[gen]])
            } );
            // quotient group
            sheetElementsAsJSON.push( {
                className : type,
                groupURL : ((quotientByPrevious /*: any */) /*: {URL?: string} */).URL || '(unknown)',
                x : L+index*W+index*hgap+bottomShift, y : T+H+vgap,
                w : W, h : H,
                highlight_colors :
                    [quotientByPrevious.elements.map( (elt, idx) => idx ? notred : red ), [], []]
            } );
            const quotientIndex = sheetElementsAsJSON.length - 1;
            // quotient group name
            sheetElementsAsJSON.push( {
                className : 'TextElement',
                text : (((entry.group /*: any */) /*: {name?: string} */).name || '(unnamed)') + ' / '
                    + (((previous.group /*: any */) /*: {name?: string} */).name || '(unnamed)') + ' ≅ '
                    + (((entry.quotientByPrevious /*: any */) /*: {name?: string} */).name || '(unnamed)'),
                x : L+index*W+index*hgap+bottomShift, y : T+2*H+vgap+txtH/2,
                w : W, h : txtH,
                alignment : 'center'
            } );
            // quotient map
            sheetElementsAsJSON.push( {
                className : 'MorphismElement',
                name : `<i>q</i><sub>${index}</sub>`,
                source_name : `${thisIndex}`, destination_name : `${quotientIndex}`,
                showManyArrows : true,
                definingPairs : entry.group.generators.map(gen => [gen, quotientMap[gen]])
            } );
        }
        previous = entry;
        previousIndex = thisIndex;
    } );

    return sheetElementsAsJSON
}

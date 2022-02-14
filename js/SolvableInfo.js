// @flow

import BasicGroup from './BasicGroup.js';
import BitSet from './BitSet.js';
import IsomorphicGroups from './IsomorphicGroups.js';
import GEUtils from './GEUtils.js'
import * as Library from './Library.js';
import Log from './Log.js';
import Template from './Template.js';

import {DEFAULT_SPHERE_COLOR} from './AbstractDiagramDisplay.js';
import * as SheetModel from './SheetModel.js';

export {summary, display, showSolvableDecompositionSheet};

/*::
import XMLGroup from './XMLGroup.js';

import type { VisualizerName, SheetCreateJSON } from './SheetModel.js';

type AugmentedGroup = interface extends BasicGroup {
    isIsomorphicTo?: XMLGroup,
    subgroupIndex?: number,
    subgroupIsomorphicTo?: XMLGroup,
    quotientIsomorphicTo?: XMLGroup
}
type Decomposition = Array<AugmentedGroup>;

type BasicGroupWithMaybeDetails = {
    group: BasicGroup,
    embeddingFromPrevious?: Array<number>,
    quotientByPrevious?: BasicGroup,
    quotientMap?: Array<groupElement>
};
type BasicGroupWithDetails = {
    group: BasicGroup,
    embeddingFromPrevious: Array<number>,
    quotientByPrevious: BasicGroup,
    quotientMap: Array<groupElement>
};
*/

// Load templates
const SOLVABLE_GROUP_INFO_URL = './html/SolvableInfo.html';
const LoadPromise = GEUtils.ajaxLoad(SOLVABLE_GROUP_INFO_URL)

let Group;

function summary (Group /*: XMLGroup */) /*: string */ {
    return Group.isSolvable ? 'yes' : 'no';
}

async function display (Group /*: XMLGroup */, $wrapper /*: JQuery */) {
  const templates = await LoadPromise

  if ($('template[id|="solvable"]').length == 0) {
    $('body').append(templates);
  }

  $wrapper.html(formatSolvableInfo(Group));
}

function formatSolvableInfo (group /*: XMLGroup */) /*: DocumentFragment */ {
    Group = group;
    const $frag = $(document.createDocumentFragment());
    if (Group.isAbelian) {
        $frag.append(eval(Template.HTML('solvable-abelian-template')));
    } else if (Group.isSolvable) {
        let decomposition /*: Decomposition */ = [];
        try {
            decomposition = ((findSolvableDecomposition(Group) /*: any */) /*: Decomposition */);
            let decompositionDisplay = decomposition
                .reverse()
                .map( el => makeGroupRef(el) );
            decompositionDisplay.push(makeGroupRef(IsomorphicGroups.map[1][0]));
            decompositionDisplay = decompositionDisplay.reverse().join(' ⊲ ');  // 'normal subgroup of' character, #22b2
            $frag.append(eval(Template.HTML('solvable-isSolvable-template')));
            for (let i = 0; i < decomposition.length - 1; i++) {
                let g = decomposition[i];
                $frag.find('#solvable-decomposition')
                    .append(eval(Template.HTML('solvable-decomposition-element-template')));
            }
            let g = decomposition[decomposition.length - 1];
            $frag.find('#solvable-decomposition')
                .append(eval(Template.HTML('solvable-decomposition-termination-template')));
        } catch (err) {
            const unknown_subgroup = decomposition.find( (gr) => !gr.hasOwnProperty('name') );
            $frag.append(eval(Template.HTML('solvable-failure-template')));
        }
    } else {
        $frag.append(eval(Template.HTML('solvable-unsolvable-template')));
        if (Group.isSimple) {
            $frag.append(eval(Template.HTML('solvable-simple-template')));
        }
    }
    $frag.append(eval(Template.HTML('solvable-trailer-template')));

    return (($frag[0] /*: any */) /*: DocumentFragment */);
}

function makeGroupRef(group /*: AugmentedGroup */) /*: string */ {
    const g = (group.hasOwnProperty('name') ? group : group.isIsomorphicTo);
    if (g != undefined && g.hasOwnProperty('name')) {
        const G = ((g /*: any */) /*: XMLGroup */);
        return eval(Template.HTML('group-reference-template'));
    } else {
        return '';
    }
}

// given group, returns sequence of subgroups as BasicGroups
function findSolvableDecomposition(group /*: AugmentedGroup */) /*: ?Decomposition */ {
    if (group.isAbelian) {
        return [group];
    }

    // search subgroups for normal subgroup with Abelian quotient group
    const subgroups = group.subgroups;
    for (let i = 0; i < subgroups.length; i++) {
        const subgroup = subgroups[i];
        if (subgroup.order == 1 || subgroup.order == group.order || !subgroup.isNormal ) {
            continue;
        }

        // check that quotient group is Abelian
        const quotientGroup = group.getQuotientGroup(subgroup.members);
        if (!quotientGroup.isAbelian) {
            continue;
        }

        // convert subgroup to BasicGroup
        const subgroupAsGroup = (group.getSubgroupAsGroup(subgroup) /*: AugmentedGroup */);
        const decomposition = findSolvableDecomposition(subgroupAsGroup);
        if (decomposition == undefined) {
            throw {subgroupIndex: i};
        } else {
            subgroupAsGroup.isIsomorphicTo = ((IsomorphicGroups.find(subgroupAsGroup) /*: any */) /*: XMLGroup */);
            group.subgroupIndex = i;
            group.subgroupIsomorphicTo = subgroupAsGroup.isIsomorphicTo;
            group.quotientIsomorphicTo = ((IsomorphicGroups.find(quotientGroup) /*: any */) /*: XMLGroup */);
            decomposition.push(group);
            return decomposition;
        }
    }
    return undefined;
}

// Works very much like the previous function, but includes lots more
// details useful for illustrating the whole thing in a sheet.
// Assumes all groups in library loaded.
function getDetailedSolvableDecomposition ( G /*: BasicGroup */) /*: ?Array<BasicGroupWithMaybeDetails> */ {
    const Z_1 = ((Library.getAllLocalGroups().find( gp => gp.order == 1 ) /*: any */) /*: XMLGroup */);
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
        if ( !G.isNormal( H ) ) continue;
        var pair = IsomorphicGroups.findEmbedding( G, H );
        if ( !pair ) continue;
        const [ N, e ] = pair;
        pair = IsomorphicGroups.findQuotient( G, H );
        if ( !pair ) continue;
        const [ Q, q ] = pair;
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

function showSolvableDecompositionSheet ( type /*: VisualizerName */ ) /*: void */ {
    const D = getDetailedSolvableDecomposition( Group );
    if ( !D ) return alert( 'Error computing solvable decomposition' );
    const n = D.length,
          L = 25, T = 175, txtH = 50, W = Math.floor( 600 / n ), H = W,
          hgap = Math.floor( W / 3 ), vgap = 100, bottomShift = vgap/4;
    // create sheet title and description
    const sheetElementsAsJSON /*: Array<SheetCreateJSON> */ = [
        {
            className : 'TextElement',
            text : `Solvable Decomposition for the group ${Group.name}`,
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
        const subgroupElts = entry.embeddingFromPrevious ?
              entry.embeddingFromPrevious.filter( ( value, index, self ) =>
                                                  self.indexOf( value ) === index ) : [ 0 ];
        const subgroupBitSet = new BitSet( entry.group.order, subgroupElts );
        const elementOrder = entry.group.getCosets( subgroupBitSet )
              .map( coset => coset.toArray() )
              .reduce( ( list1 /*: Array<groupElement> */, list2 /*: Array<groupElement> */ ) => list1.concat( list2 ), [ ] );
        Log.debug( elementOrder );
        const highlight = elementOrder.map( ( elt, index ) =>
                                            subgroupBitSet.get( index ) ? red : notred );
        sheetElementsAsJSON.push( {
            className : type,
            groupURL : ((entry.group /*: any */) /*: {URL?: string} */).URL || '(unknown)',
            x : L+index*W+index*hgap, y : T, w : W, h : H,
          elements : elementOrder, highlights : { background : highlight }
        } );
        // for every visualizer except the trivial group, add the
        // embedding map, the quotient group, the quotient map, and its name.
        const thisIndex = sheetElementsAsJSON.length - 1;
        if ( previous ) {
            const embeddingFromPrevious = ((entry /*: any */) /*: {embeddingFromPrevious: Array<number>} */).embeddingFromPrevious,
                  quotientByPrevious = ((entry /*: any */) /*: {quotientByPrevious: BasicGroup} */).quotientByPrevious,
                  quotientMap = ((entry /*: any */) /*: {quotientMap: Array<groupElement>} */).quotientMap;
            // embedding from previous
            sheetElementsAsJSON.push( {
                className : 'MorphismElement',
                name : `<i>e</i><sub>${index}</sub>`,
                sourceId : previousIndex, destinationId : thisIndex,
                showManyArrows : true,
                definingPairs : previous.group.generators[0].map( gen =>
                                                                  [ gen, embeddingFromPrevious[gen] ] )
            } );
            // quotient group
            sheetElementsAsJSON.push( {
                className : type,
                groupURL : ((quotientByPrevious /*: any */) /*: {URL?: string} */).URL || '(unknown)',
                x : L+index*W+index*hgap+bottomShift, y : T+H+vgap,
                w : W, h : H,
                highlights : {
                    background : quotientByPrevious.elements.map( (elt, idx) => idx ? notred : red )
                }
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
                sourceId : thisIndex, destinationId : quotientIndex,
                showManyArrows : true,
                definingPairs : entry.group.generators[0].map( gen =>
                                                               [ gen, quotientMap[gen] ] )
            } );
        }
        previous = entry;
        previousIndex = thisIndex;
    } );
    SheetModel.createNewSheet(sheetElementsAsJSON)
}

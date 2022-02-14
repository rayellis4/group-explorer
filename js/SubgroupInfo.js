// @flow

import BasicGroup from './BasicGroup.js';
import {CayleyDiagramView, createUnlabelledCayleyDiagramView} from './CayleyDiagramView.js';
import GEUtils from './GEUtils.js'
import IsomorphicGroups from './IsomorphicGroups.js';
import Log from './Log.js';
import MathUtils from './MathUtils.js';
import Subgroup from './Subgroup.js';
import Template from './Template.js';

import {actionClickHandler} from '../GroupInfo.js';

import * as SheetModel from './SheetModel.js';

export {summary, display, showSubgroupLattice, showEmbeddingSheet, showQuotientSheet};

/*::
import XMLGroup from './XMLGroup.js'

import type { VisualizerName, SheetCreateJSON } from './SheetModel.js';

// type DecoratedSubgroup = Subgroup & {_tierIndex?: number, _used?: boolean};
interface DecoratedSubgroup extends Subgroup {
    _tierIndex?: number;
    _used?: boolean;
}
*/

// Load templates
const SUBGROUP_INFO_URL = './html/SubgroupInfo.html';
const LoadPromise = GEUtils.ajaxLoad(SUBGROUP_INFO_URL)

// Module variables
let Group /*: XMLGroup */;
let Cayley_Diagram_View	/*: CayleyDiagramView */;

function summary (group /*: XMLGroup */) /*: string */ {
    return `${group.subgroups.length} subgroups`;
}

async function display (group /*: XMLGroup */, $wrapper /*: JQuery */) {
  const templates = await LoadPromise

  if ($('template[id|="subgroups"]').length == 0) {
    $('body').append(templates);
  }

  $wrapper.html(formatSubgroupInfo(group));
}

function formatSubgroupInfo (group /*: XMLGroup */) /*: DocumentFragment */ {
    Group = group;
    Cayley_Diagram_View = createUnlabelledCayleyDiagramView( { width : 50, height : 50 } );

    const $frag = $(document.createDocumentFragment())
          .append(eval(Template.HTML('subgroups-header-template')));

    if (Group.isSimple) {
        $frag.find('#not-simple').remove();
    } else {
        $frag.find('#simple').remove();
    }

    for (let inx = 0; inx < Group.subgroups.length; inx++) {
        $frag.find('tbody').append(subgroupInfo(inx)).html();
    }

    if ($frag.find('li.subgroups-no-isomorphism').length == 0) {
        $frag.find('#subgroups-no-isomorphism-reason').remove();
    }
    if ($frag.find('li.subgroups-no-quotient-group').length == 0) {
        $frag.find('#subgroups-no-quotient-group-reason').remove();
    }

    return (($frag[0] /*: any */) /*: DocumentFragment */);
}

function subgroupInfo (index /*: number */) {
   const subgroup = Group.subgroups[index];
   const subgroupOrder = subgroup.members.popcount();
   const optionalDescription = shortDescription(subgroup);
   const element_representations = subgroup.members.toArray().map( el => Group.representation[el] );

   const $row = $(eval(Template.HTML('subgroups-data-row-template')));

   let isomorphicGroup = IsomorphicGroups.findForSubgroup(Group, subgroup)
   if (isomorphicGroup == undefined) {
      $row.find('ul').append(eval(Template.HTML('subgroups-no-isomorphism-template')));
   } else {
      // FIXME -- get CayleyDiagram to build for unnamed BasicGroup
      if (!isomorphicGroup.hasOwnProperty('name'))
         Log.err('trying to build CayleyDiagram for unnamed BasicGroup in SubgroupInfo');
      // Use cached Cayley diagram where possible
      const cached_thumbnail = ((isomorphicGroup /*: any */) /*: XMLGroup */).CayleyThumbnail;
      let image /*: Image */;
      if (cached_thumbnail != undefined) {
         image = (($('<img>').attr({src: cached_thumbnail})[0] /*: any */) /*: Image */);
      } else {
         Cayley_Diagram_View.setDiagram( ((isomorphicGroup /*: any */) /*: XMLGroup */) );
         image = Cayley_Diagram_View.getImage();
      }
      image.height = image.width = 50;
      $row.find('.image').html('').append(image);
      $row.find('ul').append(eval(Template.HTML('subgroups-isomorphism-template')));
   }

   if (Group.isNormal(subgroup)) {
      if (subgroupOrder == 1) {
         isomorphicGroup = Group;
      } else {
         const quotientGroup = Group.getQuotientGroup(subgroup.members);
         isomorphicGroup = IsomorphicGroups.find(quotientGroup);
      }

      if (isomorphicGroup === undefined) {
         $row.find('ul').append(eval(Template.HTML('subgroups-no-quotient-group-template')));
      } else {
         $row.find('ul').append(eval(Template.HTML('subgroups-quotient-group-template')));
      }
   }

   return $row;
}

function shortDescription (subgroup /*: Subgroup */) {
   let rslt = '';

   const elements = subgroup.members.toArray();
   if (elements.length == 1) {
      rslt = ', the trivial subgroup, ';
   } else if (elements.length == Group.order) {
      rslt = ', the whole group, '
      if (MathUtils.isPrimePower(Group.order)) {
         const prime = MathUtils.getFactors(Group.order)[0];
         rslt += `a <a href="./help/rf-groupterms/index.html#p-subgroup">
                         ${prime}-group</a>, `;
      }
   } else {
      // get first non-one element,
      // find prime for group,
      // test all other elements for even divisibility
      const subgroupElementOrders /*: Array<number> */ = elements.map( el => Group.elementOrders[el] );
      const prime = MathUtils.getFactors(subgroupElementOrders[1])[0];
      if (subgroupElementOrders.every(el => el == 1 || el % prime == 0)) {
         if (Group.order / subgroup.members.popcount() % prime != 0) {
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

function highlightSubgroup ( H /*: Subgroup */ ) {
   return Array( Group.order ).fill( '' ).map( ( e /*: color */, i ) =>
      H.members.isSet( i ) ? 'hsl(0, 100%, 80%)' : e );
}
function showSubgroupLattice ( type /*: VisualizerName */ ) {
   // Handy function
   function subset ( H /*: Subgroup */, K /*: Subgroup */ ) /*: boolean */ { return K.members.contains( H.members ); }
   // Let's tier the group's subgroups by order.
   var subgroupTiers /*: Array<Array<DecoratedSubgroup>> */ = [ ];
   for ( var i = 0 ; i < Group.subgroups.length ; i++ ) {
      const sgp /*: DecoratedSubgroup */ = Group.subgroups[i];
      var existingTier /*: Array<DecoratedSubgroup> */ = (subgroupTiers.find( ( tier ) => tier[0].order == sgp.order ) /*: any */);
      if ( existingTier )
         existingTier.push( sgp );
      else
         subgroupTiers.push( [ sgp ] );
   }
   // Now sort those tiers with the smallest subgroups first, largest later.
   // Sort the original list of subgroups as well.
   subgroupTiers.sort( ( tiera, tierb ) => tiera[0].order - tierb[0].order );
   subgroupTiers.map( ( tier, i ) => tier.map( sgp => {
      sgp._tierIndex = i;
      sgp._used = false;
   } ) );
   // We wish to organize each tier so that connections between tiers are least tangled.
   // We begin by getting a list of the tiers' orders.
   const tierOrders = subgroupTiers.map( ( tier ) => tier[0].order );
   // We now compute a series of paths from {e} to G, passing through as many subgroups
   // as possible, so we can form chains that should be vertically arranged.
   // As we place subgroups in a chain, we remove them from placement in other chains.
   function pathsUpFrom ( H /*: DecoratedSubgroup */) /*: Array<Array<null | DecoratedSubgroup>> */ {
      H._used = true;
      // This is a recursive walk through the graph, turning it into a tree.
      if ( H._tierIndex == subgroupTiers.length - 1 ) {
         // Base case: We've already reached the top node.
         // Thus there is one path up, the one-step path containing just H, which is G.
         return [ [ H ] ];
      } else {
         // Find the tier containing the next subgroup we can walk to.
         var result /*: Array<Array<null | DecoratedSubgroup>> */ = [ ];
         var initialSegment /*: Array<null | DecoratedSubgroup> */ = [ H ];
         for ( var tierIdx = ((H._tierIndex /*: any */) /*: integer */) + 1 ; tierIdx < subgroupTiers.length ; tierIdx++ ) {
            subgroupTiers[tierIdx]
               .filter( (K /*: DecoratedSubgroup */) => subset( H, K ) && !K._used )
               .map( (K) => {
                  pathsUpFrom( K )
                     .map( (path /*: Array<null | DecoratedSubgroup> */) => {
                        result.push( initialSegment.concat( path ) );
                        initialSegment[0] = null;
                     } );
               } );
            initialSegment.push( null );
         }
         if ( initialSegment[0] != null ) result.push( initialSegment );
         return result;
      }
   }
   const chains = pathsUpFrom( Group.subgroups[0] );
   // Now we write a function that uses the chains structure to compute a position on
   // the sheet for a visualizer of the subgroup.
   const hSize = chains.length, vSize = chains[0].length,
         cellWidth = Math.min( 300, Math.ceil( 0.9 * Math.min(window.innerWidth / hSize, window.innerHeight / (1.5 * vSize)) ) ),
         cellHeight = cellWidth * 1.5,
         hMargin = Math.ceil( cellWidth * 0.1 ),
         vMargin = hMargin + ( cellHeight - cellWidth ) / 2,
         latticeTop = 100, latticeLeft = 50,
         zz = 3;
   function subgroupPosition ( H  /*: Subgroup */ ) /*: {x: number, y: number} */ {
      var x, y;
      if ( ( H.order == 1 ) || ( H.order == Group.order ) ) {
         x = chains.length * cellWidth / 2 - cellWidth / 2;
         y = ( H.order == 1 ) ? cellHeight * ( vSize - 1 ) : 0;
      } else {
         const hIndex = chains.indexOf( chains.find(
            chain => chain.indexOf( H ) > -1 ) );
         x = hIndex * cellWidth;
         const vIndex = vSize - 1 - chains[hIndex].indexOf( H );
         y = vIndex * cellHeight;
      }
      return { x : latticeLeft + x, y : latticeTop + y };
   }
   // Build a sheet with subgroups shown at those locations.
   const sheetElementsAsJSON /*: Array<SheetCreateJSON> */ = [ ];
   Group.subgroups.map( (H /*: Subgroup */) => {
      const pos = subgroupPosition( H );
      sheetElementsAsJSON.push( {
         className : type, groupURL : Group.URL,
         x : pos.x + hMargin, y : pos.y + vMargin,
         w : cellWidth - 2 * hMargin, h : cellHeight - 2 * vMargin,
         highlights : { background : highlightSubgroup( H ) }
      } );
            
      
/* Haas diagram?
      if (type === 'TextElement') {
         const subgroupIndex = Group.subgroups.findIndex((g) => g == H)
         const caption = `<span display="inline-block"><i>H</i><sub>${subgroupIndex}</sub>&nbsp;=&nbsp⟨ </span>` +
            H.generators.toArray().map((gen) => '<span display="inline-block">' + Group.representation[gen]).join(', </span>') +
            '</span>&nbsp;⟩'
         console.log(caption)
         const myHMargin = hMargin
         sheetElement = {
            className: 'TextElement',
            text: caption,
            fontColor: 'black',
            color: '#d8d8d8',
            alignment: 'center',
            fontSize: cellHeight/15 + 'px',
            x: pos.x + myHMargin,
            y: pos.y + vMargin,
            w: cellWidth - 2 * myHMargin,
            h: 0
         }
*/

   } );
   // Connect every pair of subgroups that don't have an intermediate connection.
   function existsIntermediateSubgroup ( H /*: Subgroup */, K /*: Subgroup */ ) /*: boolean */ {
      for ( var i = 0 ; i < Group.subgroups.length ; i++ ) {
         const considerMe = Group.subgroups[i];
         if ( ( H != considerMe ) && ( K != considerMe )
           && subset( H, considerMe ) && subset( considerMe, K ) )
            return true;
      }
      return false;
   }
   Group.subgroups.map( ( H /*: Subgroup */, i /*: number */ ) => {
      Group.subgroups.map( ( K, j ) => {
         if ( ( H != K ) && subset( H, K ) && !existsIntermediateSubgroup( H, K ) ) {
            sheetElementsAsJSON.push( {
                className : 'ConnectingElement',
                sourceId : i.toString(), destinationId : j.toString(),
                thickness : 2, hasArrowhead : false
            } );
         }
      } );
   } );
   // Add a title.
   sheetElementsAsJSON.push( {
      className : 'TextElement',
      text : `Subgroup Lattice for the Group ${Group.name}`,
      x : latticeLeft, y : latticeTop / 2,
      w : hSize * cellWidth, h : latticeTop / 2,
      fontSize : '20pt', alignment : 'center'
   } );
   // Show the sheet.
   SheetModel.createNewSheet(sheetElementsAsJSON);
}

function showEmbeddingSheet ( indexOfH /*: number */, type /*: VisualizerName */ ) {
   const H = Group.subgroups[indexOfH],
         [ libraryH, embedding ] = ((IsomorphicGroups.findEmbedding( Group, H ) /*: any */) /*: [XMLGroup, Array<groupElement>] */);
   SheetModel.createNewSheet( [
      {
         className : 'TextElement',
         text : `Embedding ${libraryH.name} as <i>H</i><sub>${indexOfH}</sub> in ${Group.name}`,
         x : 50, y : 50, w : 500, h : 40,
         fontSize : '20pt', alignment : 'center'
      },
      {
         className : type, groupURL : libraryH.URL,
         x : 50, y : 100, w : 200, h : 200,
         highlights : {
            background : Array( libraryH.order ).fill( 'hsl(0, 100%, 80%)' )
         }
      },
      {
         className : type, groupURL : Group.URL,
         x : 350, y : 100, w : 200, h : 200,
         highlights : {
            background : Array( Group.order ).fill( '' ).map( ( _, elt ) =>
               embedding.indexOf( elt ) > -1 ? 'hsl(0, 100%, 80%)' : '' )
         }
      },
      {
         className : 'MorphismElement',
         sourceId : '1', destinationId : '2', name : '<i>e</i>',
         definingPairs : libraryH.generators[0].map( gen =>
            [ gen, embedding[gen] ] ),
         showManyArrows : true, showInjectionSurjection : true
      }
   ] )
}

function showQuotientSheet ( indexOfN /*: number */, type /*: VisualizerName */) {
   const adj = Math.min(window.innerWidth, window.innerHeight)/1100
   const N = Group.subgroups[indexOfN],
         [ libraryQ, quotientMap ] = ((IsomorphicGroups.findQuotient( Group, N ) /*: any */) /*: [XMLGroup, Array<groupElement>] */),
         [ libraryN, embedding ] = ((IsomorphicGroups.findEmbedding( Group, N ) /*: any */) /*: [XMLGroup, Array<groupElement>] */),
         L = 25*adj, T = 150*adj, W = 120*adj, H = W, gap = 100*adj;
   function shrink ( order, x, y, w, h ) {
      const factor = 0.5 * ( 1 + order / Group.order ),
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
         loc3 = shrink( Group.order, L+2*W+2*gap, T, W, H ),
         loc4 = shrink( libraryQ.order, L+3*W+3*gap, T, W, H ),
         loc5 = shrink( 1, L+4*W+4*gap, T, W, H ),
         high1 = Array( 1 ).fill( col1 ),
         high2 = Array( libraryN.order ).fill( col2 ),
         high3 = Array( Group.order ).fill( col3 ),
         high4 = Array( libraryQ.order ).fill( col3 ),
         high5 = Array( 1 ).fill( col5 );
   embedding.map( elt => high3[elt] = col2 );
   high2[0] = col1;
   high3[0] = col1;
   high4[0] = col4;
   SheetModel.createNewSheet( [
      {
         className : 'TextElement',
         x : L, y : T-100*adj, w : 5*W+4*gap, h : 50,
         text : `Short Exact Sequence showing ${Group.name} / ${libraryN.name} ≅ ${libraryQ.name}`,
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
         highlights : { background : high1 }
      },
      {
         className : 'TextElement',
         x : L+W+gap, y : T-50, w : W, h : 50,
         text : libraryN.name, alignment : 'center', fontSize : `${12*adj}pt`
      },
      {
         className : type, groupURL : libraryN.URL,
         x : loc2.x, y : loc2.y, w : loc2.w, h : loc2.h,
         highlights : { background : high2 }
      },
      {
         className : 'TextElement', h : 50,
         x : L+2*W+2*gap, y : T-50, w : W,
         text : Group.name, alignment : 'center', fontSize : `${12*adj}pt`
      },
      {
         className : type, groupURL : Group.URL,
         x : loc3.x, y : loc3.y, w : loc3.w, h : loc3.h,
         highlights : { background : high3 }
      },
      {
         className : 'TextElement', h : 50,
         x : L+3*W+3*gap, y : T-50, w : W,
         text : libraryQ.name, alignment : 'center', fontSize : `${12*adj}pt`
      },
      {
         className : type, groupURL : libraryQ.URL,
         x : loc4.x, y : loc4.y, w : loc4.w, h : loc4.h,
         highlights : { background : high4 }
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
         highlights : { background : high5 }
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
         sourceId : 2, destinationId : 4,
         showManyArrows : true, showInjectionSurjection : true,
         definingPairs : [ [ 0, 0 ] ]
      },
      {
         className : 'MorphismElement', name : 'e',
         sourceId : 4, destinationId : 6,
         showManyArrows : true, showInjectionSurjection : true,
         definingPairs : libraryN.generators[0].map( gen => [ gen, embedding[gen] ] )
      },
      {
         className : 'MorphismElement', name : 'q',
         sourceId : 6, destinationId : 8,
         showManyArrows : true, showInjectionSurjection : true,
         definingPairs : Group.generators[0].map( gen => [ gen, quotientMap[gen] ] )
      },
      {
         className : 'MorphismElement', name : 'z',
         sourceId : 8, destinationId : 10,
         showManyArrows : true, showInjectionSurjection : true,
         definingPairs : libraryQ.generators[0].map( gen => [ gen, 0 ] )
      }
   ] );
}

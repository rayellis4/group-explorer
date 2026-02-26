// @flow

import {BitSet} from './BitSet.js';
import * as DefiningRelations from './DefiningRelations.js'
import * as GEUtils from './GEUtils.js';
import * as Library from './Library.js';

/*::
import {Group} from './Group.js'
import {Subgroup} from './Subgroup.js'
 */

export class IsomorphicGroups {
   static find (G /*: Group */) /*: ?Group */ {
      function subgroupOrders (subgroups /*: Array<Subgroup> */) {
         return subgroups.reduce((acc /*: Array<number> */, H) => {
            acc[H.order] = (acc[H.order] == null) ? 1 : ++acc[H.order]
            return acc
         }, []).filter((order) => order != null)
      }

      // filter by candidate group properties
      const isomorphicCandidates = Library.getGroupsByOrder(G.order)
         .filter( H => GEUtils.equals(G.orderClassSizes, H.orderClassSizes) )
         .filter( H => GEUtils.equals(subgroupOrders(G.subgroups), subgroupOrders(H.subgroups)) )

      // we have all groups of order <= 20 in group library, and all non-abelian group <= 40
      const isomorphicGroup = (isomorphicCandidates.length == 1 && (G.order <= 20 || (!G.isAbelian && G.order <= 40)))
         ? isomorphicCandidates[0]
         : isomorphicCandidates.find( H => IsomorphicGroups.isomorphism(H, G) != undefined )

      return isomorphicGroup
   }

   // returns isomorphism from G to H, or undefined if none can be found
   static isomorphism (G /*: Group */, H /*: Group */) /*: ?Array<groupElement> */ {
      if (G.order != H.order || G == H) {
         return null;
      }

      if (G.order == 1) {
         return [0];
      }

      // returns arrays of generators for H that match orders in req
      function* matchingGenerators (
         req /*: Array<groupElement> */,
         avail /*: Array<BitSet> */,
         sel /*: Array<groupElement> */ = []
      ) /*: Generator<Array<groupElement>, ?Array<groupElement>, Array<groupElement>> */ {
         if (req.length == 0) {
            yield sel;
         } else if (!avail[req[0]].isEmpty()) {
            // pick one from avail according to order in req and add it to sel
            for (const el of avail[req[0]].toArray()) { // allElements()) {
               const newReq = req.slice(1);
               const newAvail = avail.slice();
               newAvail[req[0]] = newAvail[req[0]].clone();
               const newSel = sel.slice();
               newSel.push(el);
               newAvail[req[0]].clear(el);
               yield *matchingGenerators(newReq, newAvail, newSel);
            }
         }
      }

      // ToDo: pick the G or H with fewer known generators
      //   or maybe lower gen*orderClassSize product?
      const G_gens = G.generators;
      const requiredOrders = G_gens.map(el => G.elementOrders[el]);
      const availableElements = H.elementOrders.reduce(
         (acc /*: Array<BitSet> */, order, el) => {
            if (acc[order] === undefined) {
               acc[order] = new BitSet(G.order);
            }
            acc[order].set(el);
            return acc;
         },
         []
      );

      bigLoop:
      for (const h_gens of matchingGenerators(requiredOrders, availableElements)) {
         const g_gens = G_gens.slice();

         // create map, add identity
         const g2h /*: Array<groupElement> */ = new Array(G.order);
         g2h[0] = 0;

         // map generators
         g_gens.forEach( (_,inx) => g2h[g_gens[inx]] = h_gens[inx] );

         const rslt = new BitSet(G.order).set(0);

         const gensUsed = [g_gens.pop() /*:: as any as groupElement */]
         for (let g = gensUsed[0], s = g; g != 0; g = G.mult(g, s)) {
            rslt.set(g);
            g2h[G.mult(g, s)] = H.mult(g2h[g], g2h[s]);
         }

         while (g_gens.length != 0) {
            gensUsed.push(g_gens.pop() /*:: as any as groupElement */)
            const prevRslt = rslt.toArray();  // H_{i-1}
            const coset_reps = [0];
            for (const g of coset_reps) {
               for (const s of gensUsed) {
                  const gXs = G.mult(g, s);
                  g2h[G.mult(g, s)] = H.mult(g2h[g], g2h[s]);
                  if (!rslt.isSet(gXs)) {
                     coset_reps.push(gXs);
                     for (const h of prevRslt) { // H_{i-1} X (g X s)
                        rslt.set(G.mult(h, gXs));
                        g2h[G.mult(h, gXs)] = H.mult(g2h[h], g2h[gXs]);
                     }
                  }
               }
            }
         }

         // check that g_gens really generates group
         if (rslt.popcount() != G.order) {
            continue bigLoop;
         }

         // check that g2h is a mapping
         if ( !GEUtils.equals(g2h.slice().sort( (a,b) => a - b ), G.elements) ) {
            continue bigLoop;
         }

         // check that mapping is a homomorphism
         for (const i of G.elements) {
            for (const j of G.elements) {
               if (g2h[G.mult(i, j)] != H.mult(g2h[i], g2h[j])) {
                  continue bigLoop;
               }
            }
         }

         return g2h;
      }

      return null
   }

   // findEmbedding(G,H), with H a subgroup of G, returns a pair [H',f]
   // such that H' is in the groups library and f is an embedding of H'
   // into G and onto H.  f is stored as an array such that f[i] means f(i),
   // for all i in H'.
   static findEmbedding (G /*: Group */, H /*: Subgroup */) /*: [Group, Array<groupElement>] */ {
      const [groupH, indexInParent] = G.getSubgroupAsGroup( H )
      let libraryH = IsomorphicGroups.find( groupH )
      if ( libraryH == null ) {
         const presentation = DefiningRelations.makePresentation(groupH)
         libraryH = DefiningRelations.generateGroupFromPresentation(presentation)
         Library.saveGroup(libraryH)
      }
      const almostF = IsomorphicGroups.isomorphism( libraryH, groupH );
      if (almostF == null) {
         throw new Error('IsomorphicGroup.findEmbedding error:\n' +
            `error finding subgroup embedding in ${G.shortName} (${G.gapid || ''})`)
      }

      return [ libraryH, almostF.map( elt => indexInParent[elt] ) ]
   }

   // findQuotient(G,N), with N a normal subgroup of G, returns a pair [Q,q]
   // such that Q is in the groups library and q is an onto map from G to Q
   // with kernel K.  q is stored as an array such that q[i] means q(i),
   // for all i in G.
   static findQuotient (G /*: Group */, N /*: Subgroup */) /*: [Group, Array<groupElement>] */ {
      if ( !N.isNormal )
         throw new Error('IsomorphicGroup.findQuotient error:\n' +
            `called to find quotient of non-normal subgroup of ${G.shortName} (${G.gapid || ''})`)
      const [groupQ, cosetIndices] = G.getQuotientGroup( N.members )
      let libraryQ = IsomorphicGroups.find( groupQ )
      if ( libraryQ == null ) {
         const presentation = DefiningRelations.makePresentation(groupQ)
         libraryQ = DefiningRelations.generateGroupFromPresentation(presentation)
         Library.saveGroup(libraryQ)
      }
      const almostMap = IsomorphicGroups.isomorphism( groupQ, libraryQ );
      if (almostMap == null) {
         throw new Error('IsomorphicGroup.findQuotient error:\n' +
            `error finding quotient map in ${G.shortName} (${G.gapid || ''})`)
      }

      return [ libraryQ, G.elements.map( elt => almostMap[cosetIndices[elt]] ) ]
   }
}

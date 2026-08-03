/*
# IsomorphicGroups

Finds isomorphic group from group library

```js
 */

import { BitSet } from './BitSet.js';
import * as GEUtils from './GEUtils.js';
import * as Library from './Library.js';

import type { Group } from './Group.js'

export function find (G: Group): Maybe<Group> {
      // we have all groups of order <= 20 in group library, and all non-abelian group <= 40
      // if we're down to one candidate group then it's guaranteed to be the one
      function testCandidates (candidates: Group[]) {
         return (candidates.length == 1 && (G.order <= 20 || (!G.isAbelian && G.order <= 40)))
      }

      // filter by candidate group properties
      let candidates = Library.getGroupsByOrder(G.order)
         .filter(H => G.isAbelian == H.isAbelian)
         .filter(H => GEUtils.equals(G.orderClassSizes, H.orderClassSizes))

      if (testCandidates(candidates)) {
         return candidates[0]
      }

      // filter candidates by subgroup structure
      candidates = candidates.filter(H => GEUtils.equals(G.subgroupOrders, H.subgroupOrders))
      if (testCandidates(candidates)) {
         return candidates[0]
      }

      const result = candidates.find(H => isomorphism(H, G) != undefined)

      return result
   }

   // returns isomorphism from G to H, or undefined if none can be found
export function isomorphism (G: Group, H: Group): Maybe<groupElement[]> {
      if (G.order != H.order || G == H) {
         return null;
      }

      if (G.order == 1) {
         return [0];
      }

      // ToDo: pick the G or H with fewer known generators
      //   or maybe lower gen*orderClassSize product?
      const G_gens = G.generators;
      const requiredOrders = G_gens.map(el => G.elementOrders[el]);
      const availableElements = H.elementOrders.reduce<BitSet[]>(
         (acc: BitSet[], order, el) => {
            if (acc[order] === undefined) {
               acc[order] = new BitSet(G.order);
            }
            acc[order].set(el);
            return acc;
         }, [])

      bigLoop:
      for (const h_gens of matchingGenerators(requiredOrders, availableElements)) {
         const g_gens = G_gens.slice();

         // create map, add identity
         const g2h: groupElement[] = new Array(G.order);
         g2h[0] = 0;

         // map generators
         g_gens.forEach( (_,inx) => g2h[g_gens[inx]] = h_gens[inx] );

         const rslt = new BitSet(G.order).set(0);

         const gensUsed = [g_gens.pop() as groupElement]
         for (let g = gensUsed[0], s = g; g != 0; g = G.mult(g, s)) {
            rslt.set(g);
            g2h[G.mult(g, s)] = H.mult(g2h[g], g2h[s]);
         }

         while (g_gens.length != 0) {
            gensUsed.push(g_gens.pop() as groupElement)
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

   // returns arrays of generators for H that match orders in req
   function* matchingGenerators (
      req: integer[],
      avail: BitSet[],
      sel: groupElement[] = []
   ): Generator<groupElement[]> {
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

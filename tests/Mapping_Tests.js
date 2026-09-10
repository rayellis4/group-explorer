// Unit tests for Mapping -- a (partial or total) homomorphism-candidate from one group to
// another, defined by generator->image pairs and extended by group multiplication.

import { Mapping } from '../js/Mapping.js'
import * as Library from '../js/Library.js'

// ---- fixtures ---------------------------------------------------------------

let Z2, Z3, Z4, Z6, S3

before(async function () {
   this.timeout(5000)
   await Library.loadLibrary()
   Z2 = Library.getGroupByURL('../groups/Z_2.group')
   Z3 = Library.getGroupByURL('../groups/Z_3.group')
   Z4 = Library.getGroupByURL('../groups/Z_4.group')
   Z6 = Library.getGroupByURL('../groups/Z_6.group')
   S3 = Library.getGroupByURL('../groups/S_3.group')
   // sanity: element 0 is the identity, orders are as the rest of the suite assumes
   expect(Z4.elementOrders).to.deep.equal([1, 4, 2, 4])
   expect(S3.elementOrders).to.deep.equal([1, 3, 3, 2, 2, 2])
})

// ---- tests ----------------------------------------------------------------

describe('Mapping', function () {

   describe('construction', function () {
      it('a fresh mapping fixes the identity and leaves everything else unmapped', function () {
         const m = new Mapping(Z4, Z4)
         expect(m.image[0]).to.equal(0)
         expect(m.image.slice(1)).to.deep.equal([undefined, undefined, undefined])
         expect(m.definingPairs).to.deep.equal([])
      })

      it('applies the defining pairs passed to the constructor', function () {
         const m = new Mapping(Z4, Z2, [[1, 1]])
         expect(m.definingPairs).to.deep.equal([[1, 1]])
         // 1->1 forces 2->0, 3->1 by multiplication in Z4 / Z2
         expect(m.image).to.deep.equal([0, 1, 0, 1])
      })
   })

   describe('extend / addDefiningPair', function () {
      it('propagates an image through group multiplication', function () {
         const m = new Mapping(Z6, Z6)
         m.addDefiningPair(1, 2)
         // 1->2 in Z6 gives the "multiply by 2" endomorphism
         expect(m.image).to.deep.equal([0, 2, 4, 0, 2, 4])
      })

      it('extend returns the mapping (chainable)', function () {
         const m = new Mapping(Z4, Z2)
         expect(m.extend(1, 1)).to.equal(m)
      })
   })

   describe('removeDefiningPair', function () {
      it('drops a pair and re-derives the image from what is left', function () {
         const m = new Mapping(Z3, Z3, [[1, 1]])
         expect(m.image).to.deep.equal([0, 1, 2])
         m.removeDefiningPair(1)
         expect(m.definingPairs).to.deep.equal([])
         expect(m.image[0]).to.equal(0)
         expect(m.image[1]).to.equal(undefined)
         expect(m.image[2]).to.equal(undefined)
      })
   })

   describe('clone', function () {
      it('copies defining pairs and image into an independent mapping', function () {
         const original = new Mapping(Z4, Z4, [[1, 1]])
         const copy = original.clone()
         copy.addDefiningPair(2, 0)
         expect(original.definingPairs).to.deep.equal([[1, 1]])
         expect(copy.definingPairs).to.deep.equal([[1, 1], [2, 0]])
      })
   })

   describe('fullMapping', function () {
      it('returns the total image when the defining pairs determine it', function () {
         const m = new Mapping(Z2, Z4, [[1, 2]])
         expect(m.fullMapping).to.deep.equal([0, 2])
      })

      it('searches for a homomorphism when the mapping is only partial', function () {
         // no defining pairs -> the trivial homomorphism is the one it finds
         const m = new Mapping(Z4, Z4)
         expect(m.fullMapping).to.deep.equal([0, 0, 0, 0])
      })

      it('caches the searched-for mapping across repeated reads', function () {
         const m = new Mapping(Z4, Z4)                     // partial -> fullMapping runs a search
         const first = m.fullMapping
         expect(m.fullMapping).to.equal(first)             // same array reference, not re-searched
      })

      it('reflects new defining pairs after the cache is invalidated', function () {
         const m = new Mapping(Z4, Z4)
         expect(m.fullMapping).to.deep.equal([0, 0, 0, 0]) // trivial hom, from the search
         m.addDefiningPair(1, 1)                            // now pinned to the identity
         expect(m.fullMapping).to.deep.equal([0, 1, 2, 3])
      })
   })

   describe('isHomomorphism', function () {
      it('is true for the identity automorphism', function () {
         expect(new Mapping(Z3, Z3, [[1, 1]]).isHomomorphism).to.equal(true)
      })

      it('is true for the trivial map', function () {
         expect(new Mapping(Z3, Z3, []).isHomomorphism).to.equal(true)
      })

      it('is true for the sign map S_3 -> Z_2', function () {
         // S_3 generators are [1, 3]: element 1 is a 3-cycle (even -> 0),
         // element 3 is a transposition (odd -> 1)
         const sign = new Mapping(S3, Z2, [[1, 0], [3, 1]])
         expect(sign.isHomomorphism).to.equal(true)
         expect(sign.fullMapping).to.deep.equal([0, 0, 0, 1, 1, 1])
      })

      it('is false when a defining pair violates a relation', function () {
         // Z_2's generator has order 2; sending it to an order-3 element of Z_3 cannot be a hom
         const bad = new Mapping(Z2, Z3, [[1, 1]])
         expect(bad.isHomomorphism).to.equal(false)
      })
   })

   describe('isInjective / isSurjective', function () {
      it('identity automorphism of Z_3 is injective and surjective', function () {
         const m = new Mapping(Z3, Z3, [[1, 1]])
         expect(m.isInjective).to.equal(true)
         expect(m.isSurjective).to.equal(true)
      })

      it('trivial map Z_3 -> Z_3 is neither injective nor surjective', function () {
         const m = new Mapping(Z3, Z3, [])
         expect(m.isInjective).to.equal(false)
         expect(m.isSurjective).to.equal(false)
      })

      it('embedding Z_2 -> Z_4 is injective but not surjective', function () {
         const m = new Mapping(Z2, Z4, [[1, 2]])
         expect(m.isInjective).to.equal(true)
         expect(m.isSurjective).to.equal(false)
      })

      it('quotient Z_4 -> Z_2 is surjective but not injective', function () {
         const m = new Mapping(Z4, Z2, [[1, 1]])
         expect(m.isSurjective).to.equal(true)
         expect(m.isInjective).to.equal(false)
      })

      it('Z_6 -> Z_6 by "multiply by 2" is neither (image is the order-3 subgroup)', function () {
         const m = new Mapping(Z6, Z6, [[1, 2]])
         expect(m.isInjective).to.equal(false)
         expect(m.isSurjective).to.equal(false)
      })
   })

   describe('validTargets', function () {
      it('lists every element the generator can map to and still admit a homomorphism', function () {
         expect(new Mapping(Z4, Z2).validTargets(1)).to.deep.equal([0, 1])
      })

      it('is just the identity when an order obstruction blocks everything else', function () {
         // order(Z_2 generator) = 2 does not admit a nontrivial map into Z_3
         expect(new Mapping(Z2, Z3).validTargets(1)).to.deep.equal([0])
      })

      it('Z_3 -> S_3: the generator can go to the identity or either 3-cycle', function () {
         expect(new Mapping(Z3, S3).validTargets(1)).to.deep.equal([0, 1, 2])
      })
   })

   describe('validSources', function () {
      it('lists the unmapped domain elements that can map to a given target', function () {
         // only the order-4 elements of Z_4 can map onto Z_2's involution
         expect(new Mapping(Z4, Z2).validSources(1)).to.deep.equal([1, 3])
      })

      it('with no target, lists every currently unmapped domain element', function () {
         expect(new Mapping(Z4, Z2).validSources(undefined)).to.deep.equal([1, 2, 3])
      })
   })
})

// @flow
/*
 * Class holds group definition
 */
/*
```js
 */
import {BitSet} from './BitSet.js';
import * as DefiningRelations from './DefiningRelations.js';
import * as GEUtils from './GEUtils.js'
import * as MathUtils from './MathUtils.js';
import {Subgroup} from './Subgroup.js';
import {SubgroupLattice} from './SubgroupLattice.js';

/*::
import type {Tree} from './GEUtils.js';
import type {SubgroupJSON} from './Subgroup.js';

export type GroupJSON = {
   multtable: Array<Array<groupElement>>;
   ...
};

// patches until these parts are annotated
type XMLCayleyDiagram = any;
type XMLSymmetryObject = any;

type BriefXMLGroupJSON = {
   name: html,
   shortName: string,
   author: string,
   notes: string,
   phrase: html,
   representations: Array<Array<html>>,
   representationIndex: number,
   cayleyDiagrams: Array<XMLCayleyDiagram>,
   symmetryObjects: Array<XMLSymmetryObject>,
   multtable: Array<Array<number>>
};
 */
export class Group {
   // Calculated group properties
   multtable /*: Array<Array<groupElement>> */

   /*
    * How representations work:
    *   representationIndex >= 0 => representation = representations[index]
    *   representationIndex < 0 => representation = userRepresentation[-(representationIndex + 1)]
    *
    * (representationIndex is an integer, not an object reference, so Group can be easily serialized)
    */
   representations /*: Array<Array<html>> */
   representationIndex /*: number */                 = 0

   // Properties from .group file
   names /*: Array<html> */                          = ['Unnamed Group']
   gapname /*: ?string */
   gapid /*: ?string */
   shortName /*: string */                           = 'Unnamed Group'
   links /*: ?Array<string> */
   declaredGenerators /*: ?Array<Array<groupElement>> */
   definition /*: ?html */
   phrase /*: html */                                = ''
   notes /*: string */                               = ''
   author /*: string */                              = ''
   cayleyDiagrams /*: Array<XMLCayleyDiagram> */     = []
   symmetryObjects /*: Array<XMLSymmetryObject> */   = []

   // Group properties set elsewhere
   library /*: void | 'fgb' | 'generated' */
   lastModifiedOnServer /*: ?string */
   URL /*: string */

   constructor () {
   }

   static fromMulttable (multtable /*: Array<Array<groupElement>> */) /*: Group */ {
      const G = new Group()

      G.multtable = multtable
      G.names = [`An unknown group of order ${G.order}`]
      G.representations = [Array.from({length: G.order}, (_, inx) => '' + inx)]

      return G
   }

   // reads .group file from distribution
   static fromGroupFileJSON (json /*: GroupJSON */) /*: Group */ {
      const G = Object.assign(new Group(), json)
      return G
   }

   // reads group from IndexedDB GeneralStore.GroupLibrary
   static fromLocalCopyJSON (json /*: any */) /*: Group */ {
      return Group.fromGroupFileJSON(json)
   }

   /////////////////////// Assigned values

   get name () /*: html */ {
      return this.customName ?? this.names[0]
   }

   get customName () /*: html */ {
      return this.custom?.name
   }

   set customName (customName /*: html */) {
      if (customName != null && customName.length != 0) {
         if (this.custom == null) {
            this.custom = {}
         }
         this.custom.name = customName
      } else if (this.custom != null) {
         delete this.custom.name
         if (Object.keys(this.custom) == 0) {
            delete this.custom
         }
      }
   }

   get other_names () /*: Array<string> */ {
      return (this.customName == null) ? this.names.slice(1) : this.names
   }

   get representation () /*: Array<html> */ {
      const inx = this.representationIndex
      return (inx < 0) ? this.userRepresentations[-(inx + 1)] : this.representations[inx]
   }

   set representation (representation /*: Array<html> */) {
      const inx = this.representations.findIndex((el) => el == representation)
      if (inx >= 0) {
         this.representationIndex = inx
      } else {
         const jnx = this.userRepresentations.findIndex((el) => el == representation)
         if (jnx >= 0) {
            this.representationIndex = -(jnx + 1)
         } else {
            this.representationIndex = 0
         }
      }
   }

   get representationIsUserDefined () /*: boolean */ {
      return this.representationIndex < 0
   }

   get userRepresentations () /*: Array<Array<html>> */ {
      if (this.custom?.representations == null) {
         if (this.custom == null) {
            this.custom = {}
         }
         this.custom.representations = []
      }

      return this.custom.representations
   }

   deleteUserRepresentation (userIndex /*: number */) {
      this.userRepresentations.splice(userIndex, 1);
      if (-(userIndex + 1) > this.representationIndex) {
         this.representationIndex += 1
      } else if (-(userIndex + 1) ===  this.representationIndex) {
         this.representationIndex = 0
      }
   }

   // length of longest label, rendered as HTML at font-size = 20px
   get longestHTMLLabel () /*: number */ {
      const dummy = document.createElement('div')
      dummy.innerHTML = this.representation.reduce((html, label) => html + label + '<br>', ''),
      Object.assign(dummy.style, { left: '0', top: `${this.order + 10}em`, position: 'absolute', fontSize: '40px' })
      document.body.append(dummy)
      const longestHTMLLabel = dummy.offsetWidth / 40
      dummy.remove()

      this.#setProperty('longestHTMLLabel', longestHTMLLabel)

      return this.longestHTMLLabel
   }

   get userNotes () /*: string */ {
      return this.custom?.notes ?? ''
   }

   set userNotes (userNotes /*: string */) {
      if (this.custom == null) {
         this.custom = {}
      }
      this.custom.notes = userNotes
   }

   ////////////////////////// Calculated values

   get center () /*: Subgroup */ {
      this.#setProperty('center', this.#getCenter())
      return this.center
   }

   get commutator () /*: Subgroup */ {
      this.#setProperty('commutator', this.#getCommutator())
      return this.commutator
   }

   get conjugacyClasses () /*: Array<BitSet> */ {
      this.#setProperty('conjugacyClasses', this.#getConjugacyClasses(this.elements))
      return this.conjugacyClasses
   }

   get conjugateSubgroupClasses () /*: Array<BitSet> */ {
      this.#setProperty('conjugateSubgroupClasses', this.#getConjugateSubgroupClasses())
      return this.conjugateSubgroupClasses
   }

   get elementPowers () /*: Array<BitSet> */ {
      this.#setElementPowersAndPrimePowers()
      return this.elementPowers
   }

   get elementPrimePowers () /*: Array<BitSet> */ {
      this.#setElementPowersAndPrimePowers()
      return this.elementPrimePowers
   }

   get elementOrders () /*: Array<number> */ {
      this.#setProperty('elementOrders', this.elementPowers.map(el => el.popcount()))
      return this.elementOrders
   }

   get elements ()  /*: Array<groupElement> */ {
      return [...this.multtable[0]]
   }

   get generators () /*: Array<groupElement> */ {
      const generators = this.declaredGenerators?.[0] || this.subgroups[this.subgroups.length - 1].generators.toArray()
      return generators
   }

   get isGenerated () /*: boolean */ {
      this.#setProperty('isGenerated', this.URL.startsWith(DefiningRelations.GENERATED_GROUP_PREFIX))
      return this.isGenerated
   }

   get inverses () /*: Array<groupElement> */ {
      this.#setProperty('inverses', this.elements.map((el) => this.multtable[el].indexOf(0)))
      return this.inverses
   }

   get isAbelian () /*: boolean */ {
      this.#setProperty('isAbelian', this.nonAbelianExample == null)
      return this.isAbelian
   }

   get isCyclic () /*: boolean */ {
      this.#setProperty('isCyclic', this.elementOrders.some((el) => el == this.order))
      return this.isCyclic
   }

   get isSimple () /*: boolean */ {
      this.#setProperty('isSimple', this.subgroups.length > 2
         && !this.subgroups.some((H, inx) => H.isNormal && inx != 0 && inx != (this.subgroups.length - 1)))
      return this.isSimple
   }

   get isSolvable () /*: boolean */ {
      this.#setSubgroupsAndSolvable()
      return this.isSolvable
   }

   get nonAbelianExample () /*: ?[groupElement, groupElement] */ {
      let nonAbelianExample = null
      loop: for (const i of this.generators)
         for (const j of this.generators)
            if (this.multtable[i][j] != this.multtable[j][i]) {
               nonAbelianExample = [i,j]
               break loop
            }
      this.#setProperty('nonAbelianExample', nonAbelianExample)
      return this.nonAbelianExample
   }

   get order () /*: number */ {
      return this.multtable.length
   }

   get orderClasses () /*: Array<BitSet> */ {
      this.#setProperty('orderClasses', this.#getOrderClasses(this.elementOrders))
      return this.orderClasses
   }

   get orderClassSizes () /*: Array<number> */ {
      const orderClassSizes = GEUtils.countBy(this.elementOrders, (el) => el)
      orderClassSizes[0] = 0
      this.#setProperty('orderClassSizes', orderClassSizes)
      return this.orderClassSizes
   }

   get relations () /*: Array<Array<groupElement>> */ {
      this.#setProperty('relations', DefiningRelations.findRelations(this))
      return this.relations
   }

   get subgroups () /*: Array<Subgroup> */ {
      this.#setSubgroupsAndSolvable()
      return this.subgroups
   }

   get subgroupOrders () /*: Array<number> */ {
      this.#setProperty('subgroupOrders', GEUtils.countBy(this.subgroups, (H) => H.order))
      return this.subgroupOrders
   }

   ////////////////////////// Private helper functions

   #setProperty (propertyName, value) {
      Object.defineProperty(this, propertyName, {
         value: value,
         enumerable: false
      })
   }

   #setElementPowersAndPrimePowers () {
      const [elementPowers, elementPrimePowers] = this.#getElementPowers(this)
      this.#setProperty('elementPowers', elementPowers)
      this.#setProperty('elementPrimePowers', elementPrimePowers)
   }

   #setSubgroupsAndSolvable () {
      const [subgroups, isSolvable] = SubgroupLattice.getSubgroups(this)
      this.#setProperty('subgroups', subgroups)
      this.#setProperty('isSolvable', isSolvable)
   }

   #getCenter () /*: Subgroup */ {
      const centerElements = new BitSet(this.order)
      const generators = [0, ...this.generators]
      for (let inx = 0; inx < this.order; inx++) {
         let ok = true
         for (let jnx = 0; jnx < generators.length; jnx++) {
            if (this.mult(generators[jnx], this.elements[inx]) != this.mult(this.elements[inx], generators[jnx])) {
               ok = false
               break;
            }
         }
         if (ok) {
            centerElements.set(inx)
         }
      }

      const center = this.subgroups.find((H) => H.members.contains(centerElements))

      return center
   }

   #getCommutator () /*: Subgroup */ {
      // the smallest subgroup that contains the commutators i^-1 * j^-1 * i * j for all generator pairs
      const generatorCommutators = new BitSet(this.order)
      const gens = [0, ...this.generators]
      for (const x of gens)
         for (const y of gens)
            generatorCommutators.set(this.mult(this.mult(this.inverses[x], this.inverses[y]),this.mult(x, y)))

      const commutator = this.subgroups.find((H) => H.members.contains(generatorCommutators))

      return commutator
   }

   // creates conjugacy classes for element array, which may be the elements of a subgroup
   #getConjugacyClasses (elements /*: Array<groupElement> */) /*: Array<BitSet> */ {
      const conjugacyClasses /*: Array<BitSet> */ = []

      const todo /*: BitSet */ = new BitSet(this.order, elements)

      while (todo.popcount() > 0) {
         const currentElement /*: groupElement */ = todo.pop()
         const conjugacyClass /*: BitSet */ = this.elements
            .reduce((conjugacyClass, el) => conjugacyClass.set(this.conjugate(currentElement, el)), new BitSet(this.order))
         todo.subtract(conjugacyClass)
         conjugacyClasses.push(conjugacyClass)
      }

      conjugacyClasses.sort((a /*: BitSet */, b /*: BitSet */) => a.popcount() - b.popcount())

      return conjugacyClasses
   }

   #getConjugateSubgroupClasses () /*: Array<BitSet> */ {
      const conjugateSubgroupClasses = []
      this.subgroups.forEach((H, hIndex) => {
         let conjugacyClass = conjugateSubgroupClasses.find((klass) => {
            const K = this.subgroups[klass.first()]
            return H.order == K.order
               && this.elements.some((g) =>
                  H.members.toArray()
                     .reduce((conjugateMembers, h) => conjugateMembers.set(this.conjugate(h, g)), new BitSet(this.order))
                     .equals(K.members))
         })
         if (conjugacyClass == null) {
            conjugacyClass = new BitSet(this.subgroups.length)
            conjugateSubgroupClasses.push(conjugacyClass)
         }
         conjugacyClass.set(hIndex)  // sets at least one element of a newly created BitSet
      })

      return conjugateSubgroupClasses
   }

   // needs fixing to work for general set of elements (not just entire group)?
   #getElementPowers (group /*: Group */) /*: [Array<BitSet>, Array<BitSet>] */ {
      const powers = [], primePowers = [];
      for (let g = 0; g < group.order; g++) {
         const elementPowers = new BitSet(group.order, [0]),
               elementPrimePowers = new BitSet(group.order);
         for (let i = 1, prevAcc = g, acc = g;
              prevAcc != 0;
              i++, prevAcc = acc, acc = group.multtable[g][acc]) {
               elementPowers.set(acc);
               if (MathUtils.isPrime(i))
                  elementPrimePowers.set(acc);
          }
          powers.push(elementPowers);
          primePowers.push(elementPrimePowers);
      }
      return [powers, primePowers];
   }

   #getOrderClasses (elementOrders /*: Array<number> */) /*: Array<BitSet> */ {
      const orderClasses = elementOrders.reduce((orderClasses, elementOrder, element) => {
         if (orderClasses[elementOrder] == null) {
            orderClasses[elementOrder] = new BitSet(this.order)
         }
         orderClasses[elementOrder].set(element)
         return orderClasses
      }, [])

      return orderClasses;
   }

   ////////////////////////// Public functions

   mult (a /*: groupElement */, b /*: groupElement */) /*: groupElement */ {
      return this.multtable[a % this.order][b % this.order];
   }

   // g h g⁻¹
   conjugate (h /*: groupElement */, g /*: groupElement */) /*: groupElement */ {
      return this.multtable[g][this.multtable[h][this.inverses[g]]]
   }

   // takes bitset or array of generators; return bitset
   // note: depends on knowing this.subgroups, can only be run after SubgroupLattice
   closure (generators /*: BitSet | Array<groupElement> */) /*: BitSet */ {
      const gens = Array.isArray(generators) ? new BitSet(this.order, generators) : generators
      const rslt = this.subgroups.find((H) => H.members.contains(gens)).members

      return rslt
   }

   getElementPowerArray (element /*: groupElement */) /*: Array<groupElement> */ {
      const result = [0];
      for (let g = element; g != 0; g = this.mult(element, g)) {
         result.push(g);
      }
      return result;
   }

   getSubgroupByElements (elements /*: BitSet | Array<groupElement> */) /*: ?Subgroup */ {
      const elts = Array.isArray(elements) ? new BitSet(this.order, elements) : elements
      const subgroup = this.subgroups.find((H) => H.members.equals(elts))
      return subgroup
   }
}
/*
```
*/

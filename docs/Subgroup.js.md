// @flow
/*
 *   subgroup structure -- containing group, and generator, member, bitsets
 */
import {BitSet} from './BitSet.js';
import * as DefiningRelations from './DefiningRelations.js'
import {Group} from './Group.js'
import * as IsomorphicGroups from './IsomorphicGroups.js'
import * as Library from './Library.js'
import * as MathUtils from './MathUtils.js'

/*::
import type {Group} from './Group.js'
import type {BitSetJSON} from './BitSet.js';

export type SubgroupJSON = {
   group: string,
   generators: BitSetJSON,
   members: BitSetJSON,
};
*/
export class Subgroup {
   group /*: Group */
   generators /*: BitSet */
   members /*: BitSet */

   constructor(group /*: ?Group */,
               generators /*: Array<number> */ = [],
               members /*: Array<number> */ = []) {
      // just make an empty Subgroup if called with undefined arguments
      if (group != undefined) {
         this.group = group;
         this.generators = new BitSet(group.order, generators);
         this.members = new BitSet(group.order, members);
      }
   }

   // clone/copy all fields
   clone () /*: Subgroup */ {
      const clone = new Subgroup()
      clone.group = this.group
      clone.generators = this.generators.clone()
      clone.members = this.members.clone()

      return clone
   }

   setAllMembers() /*: Subgroup */ {
      this.members.setAll();
      return this;
   }

   toString() /*: string */ {
      return `generators: ${this.generators.toString()}; ` +
             `members: ${this.members.toString()}`;
   }

   get order() /*: number */ {
      this.#setProperty('order', this.members.popcount())
      return this.order
   }

   get index() /*: number */ {
      this.#setProperty('index', this.group.order/this.order)
      return this.index
   }

   get isCyclic () /*: boolean */ {
      this.#setProperty('isCyclic', this.generators.popcount() == 1)
      return this.isCyclic
   }

   get isNormal() /*: boolean */ {
      this.#setProperty('isNormal', this.#subgroupIsNormal())
      return this.isNormal;
   }

   get isomorphicGroup () /*: Group */ {
      this.#setIsomorphicGroupAndEmbedding()
      return this.isomorphicGroup
   }

   get isomorphicGroupEmbedding () /*: Array<groupElement> */ {
      this.#setIsomorphicGroupAndEmbedding()
      return this.isomorphicGroupEmbedding
   }

   get isomorphicQuotientGroup () /*: ?Group */ {
      this.#setQuotientGroupAndMap()
      return this.isomorphicQuotientGroup
   }

   get isomorphicQuotientMap () /*: ?Array<groupElement> */ {
      this.#setQuotientGroupAndMap()
      return this.isomorphicQuotientMap
   }

   get leftCosets () {
      this.#setProperty('leftCosets', this.#getCosets('left'))
      return this.leftCosets
   }

   get rightCosets () {
      this.#setProperty('rightCosets', this.#getCosets('right'))
      return this.rightCosets
   }

   get subgroupIndex () /*: number */ {
      this.#setProperty('subgroupIndex', this.group.subgroups.findIndex((H) => H.members.equals(this.members)))
      return this.subgroupIndex
   }

   ////////////////////////// Private helper functions

   #getCosets (side)  /*: Array<BitSet> */ {
      const mult = (side == 'left')
         ? (a /*: groupElement */, b /*: groupElement */) => this.group.multtable[a][b]
         : (a /*: groupElement */, b /*: groupElement */) => this.group.multtable[b][a]
      const cosets = [this.members.clone()];
      const todo = new BitSet(this.group.order).setAll().subtract(this.members);
      const subgroupArray = this.members.toArray()

      for (;;) {
         const g = todo.pop();
         if (g == undefined) break;
         const newCoset = new BitSet(this.group.order);
         subgroupArray.forEach( el => newCoset.set(mult(g, el)) );
         cosets.push(newCoset);
         todo.subtract(newCoset);
      }

      return cosets;
   }

   #getLibraryGroup (G) /*: Group */ {
      let libraryGroup = IsomorphicGroups.find(G)
      if (libraryGroup == null) {
         const presentation = DefiningRelations.makePresentation(G)
         const presentationURL = DefiningRelations.GENERATED_GROUP_PREFIX + '?' + presentation
         libraryGroup = Library.getGroupByURL(presentationURL)
      }
      return libraryGroup
   }

   // call N = this a normal subgroup and G = this.group,
   // getQuotientGroup() // returns a pair [Q,q]
   // such that Q is in the groups library and q is an onto map from G to Q
   // with kernel K.  q is stored as an array such that q[i] means q(i),
   // for all i in G.
   #getQuotientGroup () /*: [Group, Array<groupElement>] */ {
      const cosets = this.leftCosets
      const quotientOrder = cosets.length;
      const cosetReps = cosets.map((coset /*: BitSet */) => coset.first())
      const elementToCoset = []
      cosets.forEach((coset, inx) => coset.toArray().forEach((elt) => elementToCoset[elt] = inx))

      const multtable /*: Array<Array<groupElement>> */ =
         Array.from({length: quotientOrder}, (_, inx) => {
            return Array.from({length: quotientOrder}, (_, jnx) => {
               return elementToCoset[this.group.multtable[cosetReps[inx]][cosetReps[jnx]]]
            })
         })

      const quotientGroup = Group.fromMulttable(multtable)
      const libraryGroup = this.#getLibraryGroup(quotientGroup)
      const isomorphism = IsomorphicGroups.isomorphism(quotientGroup, libraryGroup)
      if (isomorphism == null) {
         throw new Error('Subgroup.getQuotientGroup error:\n' +
            `error finding quotient map in ${this.group.shortName} (${this.group.gapid || ''})`)
      }

      return [libraryGroup, this.group.elements.map((elt) => isomorphism[elementToCoset[elt]])]
   }

   // call H = this and G = this.group, getSubgroupAsGroup()  returns a pair [H',f]
   // such that H' is in the groups library and f is an embedding of H'
   // into G and onto H.  f is stored as an array such that f[i] means f(i),
   // for all i in H'.
   #getSubgroupAsGroup () /*: [Group, Array<groupElement>] */ {
      const subgroupToParent = this.members.toArray();
      const parentToSubgroup /*: Array<groupElement> */ = subgroupToParent.reduce(
         (acc, el, inx) => { acc[el] = inx; return acc; }, new Array(this.group.order)
      );

      const multtable /*: Array<Array<groupElement>> */ =
         Array.from({length: this.order}, (_, inx) => {
            return Array.from({length: this.order}, (_, jnx) => {
               return parentToSubgroup[this.group.multtable[subgroupToParent[inx]][subgroupToParent[jnx]]]
            })
         })

      const subgroupAsGroup = Group.fromMulttable(multtable)
      const libraryGroup = this.#getLibraryGroup(subgroupAsGroup)
      const isomorphism = IsomorphicGroups.isomorphism(libraryGroup, subgroupAsGroup)
      if (isomorphism == null) {
         throw new Error('Subgroup.getSubgroupAsGroup error:\n' +
            `error finding subgroup embedding in ${this.group.shortName} (${this.group.gapid || ''})`)
      }

      return [libraryGroup, isomorphism.map((elt) => subgroupToParent[elt])]
   }

   #setProperty (propertyName, value) {
      Object.defineProperty(this, propertyName, {
         value: value,
         enumerable: false
      })
   }

   #setIsomorphicGroupAndEmbedding () {
      const [isomorphicGroup, isomorphicGroupEmbedding] = this.#getSubgroupAsGroup(this.group, this)
      this.#setProperty('isomorphicGroup', isomorphicGroup)
      this.#setProperty('isomorphicGroupEmbedding', isomorphicGroupEmbedding)
   }

   #setQuotientGroupAndMap () {
      const [isomorphicQuotientGroup, isomorphicQuotientMap] = this.isNormal
         ? this.#getQuotientGroup(this.group, this)
         : [null, null]
      this.#setProperty('isomorphicQuotientGroup', isomorphicQuotientGroup)
      this.#setProperty('isomorphicQuotientMap', isomorphicQuotientMap)
   }

   #subgroupIsNormal () /*: boolean */ {
      const isNormal = (this.group.isAbelian)
         ? true
         : this.group.generators.every((g) =>
              this.generators.toArray().every((h) =>
                 this.members.isSet(this.group.conjugate(h, g))))

      return isNormal
   }

   ////////////////////////// Public methods

   getPSubgroupInfo () /*: ?{p: number, isSylow?: boolean} */ {
      const subgroupElements = this.members.toArray()
      const subgroupElementOrders /*: Array<number> */ = subgroupElements.map( el => this.group.elementOrders[el] )
      const prime = MathUtils.getFactors(subgroupElementOrders[1])[0]
      let result
      if (subgroupElementOrders.every(el => el == 1 || el % prime == 0)) {
         result = {p: prime}
         if (this.group.order / subgroupElements.length % prime != 0) {
            result.isSylow = true
         }
      }
      return result
   }
}

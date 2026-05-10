// @flow
/*
 *   subgroup structure -- containing group, and generator, member, bitsets
 */
import {BitSet} from './BitSet.js';
import {Group} from './Group.js'
import * as IsomorphicGroups from './IsomorphicGroups.js'
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

   #setProperty (propertyName, value) {
      Object.defineProperty(this, propertyName, {
         value: value,
         enumerable: false
      })
   }

   #setIsomorphicGroupAndEmbedding () {
      const [isomorphicGroup, isomorphicGroupEmbedding] = IsomorphicGroups.findEmbedding(this.group, this)
      this.#setProperty('isomorphicGroup', isomorphicGroup)
      this.#setProperty('isomorphicGroupEmbedding', isomorphicGroupEmbedding)
   }

   #setQuotientGroupAndMap () {
      const [isomorphicQuotientGroup, isomorphicQuotientMap] = this.isNormal
         ? IsomorphicGroups.findQuotient(this.group, this)
         : [null, null]
      this.#setProperty('isomorphicQuotientGroup', isomorphicQuotientGroup)
      this.#setProperty('isomorphicQuotientMap', isomorphicQuotientMap)
   }

   #subgroupIsNormal () /*: boolean */ {
      if (this.group.isAbelian) {
         return true
      }

      for (let g of this.group.generators) {
         for (let h of this.generators.toArray()) {
            if (! this.members.isSet(this.group.conjugate(h, g))) {
               return false;
            }
         }
      }

      return true;
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

   // assumes subgroup is normal
   getQuotientGroup () /*: [Group, Array<groupElement>] */ {
      const cosets = this.leftCosets
      const quotientOrder = cosets.length;
      const cosetReps = cosets.map( (coset /*: BitSet */) => ((coset.first() /*: any */) /*: groupElement */) );
      const elementMap = [];
      for (let i = 0; i < cosets.length; i++) {
         for (const j of cosets[i].toArray()) {
            elementMap[j] = i;
         }
      }
      const newMult /*: Array<Array<groupElement>> */ = cosets.map(_ => Array(quotientOrder));
      for (let i = 0; i < quotientOrder; i++) {
         for (let j = 0; j < quotientOrder; j++) {
            const ii = cosetReps[i],
                  jj = cosetReps[j];
            newMult[i][j] = elementMap[this.group.mult(ii, jj)];
         }
      }
      var result = Group.fromMulttable(newMult)
      return [result, elementMap]
   }

   // save generators in _loadedGenerators?
   getSubgroupAsGroup () /*: [Group, Array<groupElement>] */ {
      const subgroupBitset = this.members;
      const subgroupElements = subgroupBitset.toArray();
      const subgroupOrder = subgroupElements.length;
      const subgroupElementInverse /*: Array<groupElement> */ = subgroupElements.reduce(
         (acc, el, inx) => { acc[el] = inx; return acc; }, new Array(this.group.order)
      );
      const newMult /*: Array<Array<groupElement>> */ =
         subgroupElements.map(_ => new Array(subgroupOrder));
      for (let i = 0; i < subgroupOrder; i++) {
         for (let j = 0; j < subgroupOrder; j++) {
            newMult[i][j] = subgroupElementInverse[
               this.group.multtable[subgroupElements[i]][subgroupElements[j]]];
         }
      }
      var result = Group.fromMulttable(newMult)
      return [result, subgroupElements]
   }
}

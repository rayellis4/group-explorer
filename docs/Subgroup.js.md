// @flow
/*
 *   subgroup structure -- containing group, and generator, member, bitsets
 */
import {BitSet} from './BitSet.js';
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
   _isNormal /*: boolean */
   _isomorphicGroup /*: Group */
   _isomorphicGroupEmbedding /*: Array<groupElement> */
   _isomorphicQuotientGroup /*: Group */
   _isomorphicQuotientMap /*: Array<groupElement> */

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

   // reference to containing group is useful,
   //   but it creates a circular data structure that can't be serialized in JSON
   //   we replace that reference here with group.URL and resolve it later
   toJSON () /*: SubgroupJSON */ {
      const result = {
         group: this.group.URL,
         generators: this.generators.toJSON(),
         members: this.members.toJSON()
      }

      return result
   }

   static parseJSON (jsonObject /*: SubgroupJSON */) /*: Subgroup */ {
      const subgroup = new Subgroup()
      const maybeGroup = Library.getAllGroups().find((G) => G.URL == jsonObject.group)
      if (maybeGroup != null) {
         subgroup.group = maybeGroup
      }
      subgroup.generators = new BitSet().fromJSON(jsonObject.generators)
      subgroup.members = new BitSet().fromJSON(jsonObject.members)

      return subgroup;
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
      return this.members.popcount();
   }

   get index() /*: number */ {
      return this.group.order/this.order;
   }

   get isCyclic () /*: boolean */ {
      return this.generators.popcount() == 1
   }

   get isNormal() /*: boolean */ {
      if (this._isNormal == undefined) {
         this._isNormal = this.group.isNormal(this);
      }
      return this._isNormal;
   }

   setIsomorphicGroupAndEmbedding () {
      if (this._isomorphicGroup == null || this._isomorphicGroupEmbedding == null) {
         // $FlowExpectedError[unsupported-syntax]
         [this._isomorphicGroup, this._isomorphicGroupEmbedding] =
            IsomorphicGroups.findEmbedding(this.group, this)
         Library.saveGroup(this.group)
      }
   }

   get isomorphicGroup () /*: Group */ {
      if (this._isomorphicGroup == null) {
         this.setIsomorphicGroupAndEmbedding()
      }

      return this._isomorphicGroup
   }

   get isomorphicGroupEmbedding () /*: Array<groupElement> */ {
      if (this._isomorphicGroupEmbedding == null) {
         this.setIsomorphicGroupAndEmbedding()
      }

      return this._isomorphicGroupEmbedding
   }

   setQuotientGroupAndMap () {
      if (this._isomorphicQuotientGroup == null || this._isomorphicQuotientMap == null) {
         // $FlowExpectedError[unsupported-syntax]
         [this._isomorphicQuotientGroup, this._isomorphicQuotientMap] =
            IsomorphicGroups.findQuotient(this.group, this)
         Library.saveGroup(this.group)
      }
   }

   get isomorphicQuotientGroup () /*: ?Group */ {
      if (!this.isNormal) {
         return null
      } else if (this._isomorphicQuotientGroup == null) {
         this.setQuotientGroupAndMap()
      }

      return this._isomorphicQuotientGroup
   }

   get isomorphicQuotientMap () /*: ?Array<groupElement> */ {
      if (!this.isNormal) {
         return null
      } else if (this._isomorphicQuotientMap == null) {
         this.setQuotientGroupAndMap()
      }

      return this._isomorphicQuotientMap
   }

   get pSubgroupInfo () /*: ?{p: number, isSylow?: boolean} */ {
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

// @flow
/*
 *   subgroup structure -- containing group, and generator, member, contains, containedIn bitsets
 */
import BitSet from './BitSet.js';
import IsomorphicGroups from './IsomorphicGroups.js'
import * as Library from './Library.js'

/*::
import type Group from './Group.js'
import type {BitSetJSON} from './BitSet.js';

export type SubgroupJSON = {
   generators: BitSetJSON,
   members: BitSetJSON,
   _isNormal: boolean,
   contains: BitSetJSON,
   containedIn: BitSetJSON
};
*/

export default
class Subgroup {
/*::
   group: Group;
   generators: BitSet;
   members: BitSet;
   _isNormal: boolean;
   contains: BitSet;
   containedIn: BitSet;
 */
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
   toJSON () {
      const result = {}
      for (const [key, value] of Object.entries(this)) {
         if (value?.constructor?.name === 'Group') {
            result[key] = value.URL
         } else {
            result[key] = value
         }
      }
      return result
   }

   static parseJSON (jsonObject /*: SubgroupJSON */) /*: Subgroup */ {
      const subgroup = Object.assign(new Subgroup(), jsonObject)
      subgroup.generators = BitSet.parseJSON(jsonObject.generators)
      subgroup.members = BitSet.parseJSON(jsonObject.members)

      return subgroup;
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

   get isomorphicGroup () /*: Group */ {
      if (this._isomorphicGroup == null) {
         [this._isomorphicGroup, this._isomorphicGroupEmbedding] =
            IsomorphicGroups.findEmbedding(this.group, this)
         Library.saveGroup(this.group)
      } else if (   typeof this._isomorphicGroup == 'object'
                 && this._isomorphicGroup?.constructor.name != 'Group'
      ) {
         this._isomorphicGroup = Library.getGroupByURL(this._isomorphicGroup.URL)
         Library.saveGroup(this.group)
      } else if (typeof this._isomorphicGroup == 'string') {
         this._isomorphicGroup = Library.getGroupByURL(this._isomorphicGroup)
         Library.saveGroup(this.group)
      }

      return this._isomorphicGroup
   }

   get isomorphicGroupEmbedding () /*: Array<groupElement> */ {
      if (this._isomorphicGroupEmbedding == null) {
         this._isomorphicGroup = null
         this.isomorphicGroup
      }

      return this._isomorphicGroupEmbedding
   }

   get isomorphicQuotientGroup () /*: Group */ {
      if (!this.isNormal)
         return null

      if (this._isomorphicQuotientGroup == null) {
         [this._isomorphicQuotientGroup, this._isomorphicQuotientMap] =
            IsomorphicGroups.findQuotient(this.group, this)
         Library.saveGroup(this.group)
      } else if (   typeof this._isomorphicQuotientGroup == 'object'
                 && this._isomorphicQuotientGroup?.constructor.name != 'Group'
      ) {
         this._isomorphicQuotientGroup = Library.getGroupByURL(this._isomorphicQuotientGroup.URL)
         Library.saveGroup(this.group)
      } else if (typeof this._isomorphicQuotientGroup == 'string') {
         this._isomorphicQuotientGroup = Library.getGroupByURL(this._isomorphicQuotientGroup)
         Library.saveGroup(this.group)
      }

      return this._isomorphicQuotientGroup
   }

   get isomorphicQuotientMap () /*: Array<groupElement> */ {
      if (this._isomorphicQuotientMap == null) {
         this._isomorphicQuotientGroup = null
         this.isomorphicQuotientGroup
      }

      return this._isomorphicQuotientMap
   }

   // clone/copy all fields
   clone () /*: Subgroup */ {
      const clone = Subgroup.parseJSON(JSON.parse(JSON.stringify(this)))
      for (const [key, value] of Object.entries(this)) {
         if (value?.constructor?.name === 'Group') {
            clone[key] = this[key]
         }
      }

      return clone
   }
}

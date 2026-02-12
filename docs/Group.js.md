// @flow
/*
 * Class holds group definition
 */
/*
```js
 */
import BitSet from './BitSet.js';
import * as DefiningRelations from './DefiningRelations.js';
import * as MathUtils from './MathUtils.js';
import Subgroup from './Subgroup.js';
import SubgroupLattice from './SubgroupLattice.js';

/*::
import type {Tree} from './GEUtils.js';
import type {SubgroupJSON} from './Subgroup.js';

export type GroupJSON = {
   multtable: Array<Array<groupElement>>,
   _subgroups: Array<SubgroupJSON>
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
export default class Group {
   multtable /*: Array<Array<groupElement>> */
   order /*: number */
   elements /*: Array<groupElement> */
   inverses /*: Array<groupElement> */
   nonAbelianExample /*: ?[groupElement, groupElement] */
   isAbelian /*: boolean */
   elementPowers /*: Array<BitSet> */
   elementPrimePowers /*: Array<BitSet> */
   elementOrders /*: Array<number> */
   isCyclic /*: boolean */
   orderClasses /*: Array<BitSet> */
   _orderClassSizes /*: Array<number> */
   conjugacyClasses /*: Array<BitSet> */
   _subgroups /*: Array<Subgroup> */
   _subgroupOrders /*: Array<number> */
   _isSolvable /*: boolean */
   _isSimple /*: boolean */
   _cosetIndices /*: ?Array<groupElement> */  // _cosetIndices[element in parent group] = coset index / element in quotient group
   _indexInParentGroup /*: ?Array<groupElement> */ // _indexInParentGroup[element index in subgroup] = element index in parent group
   relations /*: Array<Array<groupElement>> */
   _conjugateSubgroupClasses /*: Array<BitSet> */

   // Properties fom .group file with defaults calculated from multtable
   /*
    * A hack:
    *   representationIndex >= 0 => representation = representations[index]
    *   representationIndex < 0 => representation = userRepresentation[-(representationIndex + 1)]
    *
    * (representationIndex is an integer, not an object reference, so Group can be easily serialized)
    */
   representations /*: Array<Array<html>> */
   userRepresentations /*: Array<Array<html>> */     = []
   representationIndex /*: number */                 = 0
   _longestHTMLLabel /*: number */

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
   lastModifiedOnServer /*: ?string */
   URL /*: string */
   userNotes /*: string */                           = ''

   constructor () {
   }

   static fromMulttable (multtable /*: Array<Array<groupElement>> */) /*: Group */ {
      const G = new Group()

      G.multtable = multtable
      setFieldsFromMulttable(G)

      G.names = [`An unknown group of order ${G.order}`]
      G.representations = [Array.from({length: G.order}, (_, inx) => '' + inx)]
      ;[G._subgroups, G._isSolvable] = SubgroupLattice.getSubgroups(G)
      G.relations = DefiningRelations.findRelations(G)

      return G
   }

   static fromGroupFileJSON (json /*: GroupJSON */) /*: Group */ {
      // $FlowFixMe[incompatible-type] -- figure out what will be stored in indexedDB
      // $FlowExpectedError[unsafe-object-assign]
      const G = Object.assign(new Group(), json)
      setFieldsFromMulttable(G)

      ;[G._subgroups, G._isSolvable] = SubgroupLattice.getSubgroups(G)
      G.relations = DefiningRelations.findRelations(G)

      return G
   }

   static fromLocalCopyJSON (json /*: any */) /*: Group */ {
      // remove CayleyThumbnail, if it exists
      delete json.CayleyThumbnail
      delete json.rowHTML

      // convert name, other_names to names array
      const names = []
      if ('name' in json) {
	 if (json.name != null) {
            names.push(json.name)
	 }
	 delete json.name
      }
      if ('other_names' in json) {
	 if (json.other_names != null) {
            names.push(json.other_names)
	 }
	 delete json.other_names
      }
      if (json.names != null) {
	 names.push(...json.names)
      }
      json.names = names

      // should have either _XML_generators (from XML) or generators (from JSON), but not both
      if (json._XML_generators != null) {   // convert _XML_generators to declaredGenerators
	 json.declaredGenerators = json._XML_generators
	 delete json._XML_generators
      } else if (json.generators != null) { // convert generators to declaredGenerators
	 json.declaredGenerators = json.generators
	 delete json.generators
      }

      // $FlowExpectedError[unsafe-object-assign]
      const G = Object.assign(new Group(), json)

      // fix BitSets, circular reference in subgroups
      json._subgroups.forEach((subgroupJSON, inx) => {
	 G._subgroups[inx] = Subgroup.parseJSON(subgroupJSON)
	 G._subgroups[inx].group = G
      })

      // fix BitSets in
      ;['conjugacyClasses', 'elementPowers', 'elementPrimePowers', 'orderClasses']
	 .forEach(
            (field) => json[field].forEach((js,inx) => G[field][inx] = BitSet.parseJSON(js))
	 )

      return G
   }

   findNonAbelianExample () /*: ?[groupElement, groupElement] */ {
      for (let i = 1; i < this.order; i++) {
         for (let j = i; j < this.order; j++) {
            if (this.multtable[i][j] != this.multtable[j][i]) {
               return [i,j];
            }
         }
      }
   }

   deleteUserRepresentation (userIndex /*: number */) {
      this.userRepresentations.splice(userIndex, 1);
      if (-(userIndex + 1) > this.representationIndex) {
         this.representationIndex += 1
      } else if (-(userIndex + 1) ===  this.representationIndex) {
         this.representationIndex = 0
      }
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

   // length of longest label, rendered as HTML at font-size = 20px
   get longestHTMLLabel () /*: number */ {
      if (this._longestHTMLLabel == null) {
         const dummy = document.createElement('div')
         dummy.innerHTML = this.representation.reduce((html, label) => html + label + '<br>', ''),
         Object.assign(dummy.style, { left: 0, top: `${this.order + 10}em`, position: 'absolute', fontSize: '40px' })
         document.body.append(dummy)
         this._longestHTMLLabel = dummy.offsetWidth / 40
         dummy.remove()
      }

      return this._longestHTMLLabel
   }

   get name () /*: html */ {
      return this.names[0]
   }

   get other_names () {
      return this.names.slice(1)
   }

   get isGenerated () /*: boolean */ {
      return this.URL.startsWith(DefiningRelations.GENERATED_GROUP_PREFIX)
   }

   get generators () /*: Array<groupElement> */ {
      return this.declaredGenerators?.[0] || this.subgroups[this.subgroups.length - 1].generators.toArray()
   }

   // calculate subgroups on demand -- slows down initial load too much (still true?)
   get subgroups () /*: Array<Subgroup> */ {
      if (this._subgroups == null) {
         const [tmp1, tmp2] = SubgroupLattice.getSubgroups(this);
         this._subgroups = tmp1;
         this._isSolvable = tmp2;
      }
      return this._subgroups;
   }

   get isSolvable () /*: boolean */ {
      if (this._isSolvable == null) {
         this.subgroups;  // side effect is determining solvability
      }
      return this._isSolvable;
   }

   get isSimple () /*: boolean */ {
      if (this._isSimple == null) {
         this._isSimple =
            this.subgroups.length > 2 &&
            !this.subgroups.some(
               (el, inx) => this.isNormal(el) && inx != 0 && inx != (this.subgroups.length - 1) );
      }
      return this._isSimple;
   }

   get orderClassSizes () /*: Array<number> */ {
      if (this._orderClassSizes == null) {
         this._orderClassSizes = this.orderClasses.reduce( (sizes, bitset) => {
            if (bitset != undefined)
               sizes.push(bitset.popcount());
            return sizes;
         }, [] );
      }
      return this._orderClassSizes;
   }

   get subgroupOrders () /*: Array<number> */ {
      if (this._subgroupOrders == null) {
         this._subgroupOrders =
            this.subgroups.map(subgroup => subgroup.order)
                .filter( (subgroupOrder /*: number */) => subgroupOrder < this.order);
      }
      return this._subgroupOrders;
   }

   // g h g⁻¹
   conjugate (h /*: groupElement */, g /*: groupElement */) /*: groupElement */ {
      return this.multtable[g][this.multtable[h][this.inverseOf(g)]]
   }

   inverseOf (g /*: groupElement */) /*: groupElement */ {
      return this.multtable[g].indexOf(0)
   }

   isNormal (subgroup /*: Subgroup */) /*: boolean */ {
      if (this.isAbelian) {
         return true;
      }

      const conj =
         (a /*: groupElement */, b /*: groupElement */) => this.multtable[a][this.multtable[b][this.inverses[a]]];

      for (let g of this.generators) {
         for (let h of subgroup.generators.toArray()) {
            if (! subgroup.members.isSet(conj(g, h))) {
               return false;
            }
         }
      }

      return true;
   }

   // takes bitset or array of generators; return bitset
   closure (generators /*: BitSet | Array<groupElement> */) /*: BitSet */ {
      const mult = (a /*: groupElement */, b /*: groupElement */) => this.multtable[a][b];
      const gens = Array.isArray(generators) ? [...generators]  : generators.toArray();
      const rslt = new BitSet(this.order).set(0);
      if (gens.length == 0) {
         return rslt;
      }
      const gensUsed = [((gens.pop() /*: any */) /*: groupElement */)];
      for (let g = gensUsed[0], s = g; g != 0; g = mult(g, s)) {
         rslt.set(g);
      }

      while (gens.length != 0) {
         gensUsed.push(((gens.pop() /*: any */) /*: groupElement */));
         const prevRslt = rslt.toArray();  // H_{i-1}
         const coset_reps = [0];
         for (const g of coset_reps) {
            for (const s of gensUsed) {
               const g_X_s = mult(g, s);
               if (!rslt.isSet(g_X_s)) {
                  coset_reps.push(g_X_s);
                  for (const h of prevRslt) { // H_{i-1} X (g X s)
                     rslt.set(mult(h, g_X_s));
                  }
               }
            }
         }
      }
      return rslt;
   }

   // needs fixing to work for general set of elements (not just entire group)
   getElementPowers (group /*: Group */) /*: [Array<BitSet>, Array<BitSet>] */ {
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

   // needs fixing to work for general set of elements (not just entire group)
   getOrderClasses (elementOrders /*: Array<number> */) /*: Array<BitSet> */ {
      const numOrderClasses = Math.max(...elementOrders) + 1;
      const orderClasses = Array.from( {length: numOrderClasses}, () => new BitSet(this.order) );
      elementOrders.forEach( (elementOrder, element) => orderClasses[elementOrder].set(element) );
      return orderClasses;
   }

   // creates conjugacy classes for element array, which may be the elements of a subgroup
   getConjugacyClasses (elements /*: Array<groupElement> */) /*: Array<BitSet> */ {
      const conj =
         (a /*: groupElement */, b /*: groupElement */) => this.multtable[a][this.multtable[b][this.inverses[a]]];

      // create map with key:value where key is sum of values, value is array of bitsets
      const conjugacyClasses /*: Map<number, Array<BitSet>> */ = new Map();

      outerLoop: for (let i = 0; i < elements.length; i++) {
         let conjugacyClass = new BitSet(this.order);
         for (let j = 0; j < elements.length; j++) {
            conjugacyClass.set(conj(elements[j],elements[i]));
         }
         // calculate key, add to Map
         let key = conjugacyClass.arr.reduce((sum,el) => sum + el, 0);
         const vals = conjugacyClasses.get(key);
         if (vals != undefined) {
            for (let j = 0; j < vals.length; j++) {
               if (conjugacyClass.equals(vals[j])) {
                  continue outerLoop;
               }
            }
            vals.push(conjugacyClass);
            conjugacyClasses.set(key, vals);
         } else {
            conjugacyClasses.set(key, [conjugacyClass]);
         }
      }

      const result /*: Array<BitSet> */= [];
      conjugacyClasses.forEach(el => { result.push(...el) });

      const sortedResult  = result.sort( (a /*: BitSet */, b /*: BitSet */) => a.popcount() - b.popcount() );
      return sortedResult;
   }

   getConjugateSubgroupClasses () /*: Array<BitSet> */ {
      if (this._conjugateSubgroupClasses == null) {
         this._conjugateSubgroupClasses = []
         this.subgroups.forEach((H, hIndex) => {
            let conjugacyClass = this._conjugateSubgroupClasses.find((klass) => {
               // $FlowFixMe -- klass is a BitSet with at least one element set 
               const K = this.subgroups[klass.first()]
               return H.order == K.order
                  && this.elements.some((g) =>
                        H.members.toArray()
                           .reduce((conjugateMembers, h) => conjugateMembers.set(this.conjugate(h, g)), new BitSet(this.order))
                           .equals(K.members))
            })
            if (conjugacyClass == null) {
               conjugacyClass = new BitSet(this.subgroups.length)
               this._conjugateSubgroupClasses.push(conjugacyClass)
            }
            conjugacyClass.set(hIndex)  // sets at least one element of a newly created BitSet
         })
      }
      return this._conjugateSubgroupClasses
   }

   getCosets (subgroupBitset /*: BitSet */, isLeft /*: ?boolean */ = true)  /*: Array<BitSet> */ {
      const mult = isLeft
         ? (a /*: groupElement */, b /*: groupElement */) => this.multtable[a][b]
         : (a /*: groupElement */, b /*: groupElement */) => this.multtable[b][a]
      const cosets = [subgroupBitset];
      const todo = new BitSet(this.order).setAll().subtract(subgroupBitset);
      const subgroupArray = subgroupBitset.toArray();

      for (;;) {
         const g = todo.pop();
         if (g == undefined) break;
         const newCoset = new BitSet(this.order);
         subgroupArray.forEach( el => newCoset.set(mult(g, el)) );
         cosets.push(newCoset);
         todo.subtract(newCoset);
      }

      return cosets;
   }

   // assumes subgroup is normal
   getQuotientGroup (subgroupBitset /*: BitSet */) /*: [Group, Array<groupElement>] */ {
      const cosets = this.getCosets(subgroupBitset, true);
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
            newMult[i][j] = elementMap[this.mult(ii, jj)];
         }
      }
      var result = Group.fromMulttable(newMult)
      return [result, elementMap]
   }

   // save generators in _loadedGenerators?
   getSubgroupAsGroup (subgroup /*: Subgroup */) /*: [Group, Array<groupElement>] */ {
      const subgroupBitset = subgroup.members;
      const subgroupElements = subgroupBitset.toArray();
      const subgroupOrder = subgroupElements.length;
      const subgroupElementInverse = subgroupElements.reduce(
         (acc,el,inx) => { acc[el] = inx; return acc; }, new Array(this.order)
      );
      const newMult = subgroupElements.map(_ => new Array(subgroupOrder));
      for (let i = 0; i < subgroupOrder; i++) {
         for (let j = 0; j < subgroupOrder; j++) {
            newMult[i][j] = subgroupElementInverse[
               this.multtable[subgroupElements[i]][subgroupElements[j]]];
         }
      }
      var result = Group.fromMulttable(newMult)
      return [result, subgroupElements]
   }

   mult (a /*: groupElement */, b /*: groupElement */) /*: groupElement */ {
      return this.multtable[a % this.order][b % this.order];
   }

   elementPowerArray (element /*: groupElement */) /*: Array<groupElement> */ {
      const result = [0];
      for (let g = element; g != 0; g = this.mult(element, g)) {
         result.push(g);
      }
      return result;
   }

   center () /*: Array<groupElement> */ {
      const result = []
      const generators = this.generators
      for (let inx = 0; inx < this.order; inx++) {
         let ok = true
         for (let jnx = 0; jnx < generators.length; jnx++) {
            if (this.mult(generators[jnx], this.elements[inx]) != this.mult(this.elements[inx], generators[jnx])) {
               ok = false
               break;
            }
         }
         if (ok) {
            result.push(inx)
         }
      }
      return result
   }

   toBriefJSON () /*: BriefXMLGroupJSON */ {
      return {
         name: this.name,
         shortName: this.shortName,
         author: this.author,
         notes: this.notes,
         phrase: this.phrase,
         representations: this.representations,
         representationIndex: this.representationIndex,
         cayleyDiagrams: this.cayleyDiagrams,
         symmetryObjects: this.symmetryObjects,
         multtable: this.multtable
      }
   }
}

function setFieldsFromMulttable (G /*: Group */) {
   G.order = G.multtable.length
   G.elements = G.multtable[0]
   G.inverses = G.elements.map(el => G.multtable[el].indexOf(0))
   G.nonAbelianExample = G.findNonAbelianExample()
   G.isAbelian = (G.nonAbelianExample == undefined)
   // $FlowExpectedError[unsupported-syntax]
   ;[G.elementPowers, G.elementPrimePowers] = G.getElementPowers(G)
   G.elementOrders = G.elementPowers.map(el => el.popcount())
   G.isCyclic = G.elementOrders.some((el /*: number */) => el == G.order)
   G.orderClasses = G.getOrderClasses(G.elementOrders)
   G.conjugacyClasses = G.getConjugacyClasses(G.elements)
}
/*
```
*/

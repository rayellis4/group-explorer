/*
# Group

Class holds group definition

```js
 */
import { BitSet } from './BitSet.js';
import * as DefiningRelations from './DefiningRelations.js';
import * as GEUtils from './GEUtils.js'
import * as Library from './Library.js'
import * as MathUtils from './MathUtils.js';
import * as ShowGAPCode from './ShowGAPCode.js'
import { SubgroupLattice } from './SubgroupLattice.js';

import type { Subgroup } from './Subgroup.js'

/*::
import type {SubgroupJSON} from './Subgroup.js';

export type GroupJSON = {
   multtable: Array<Array<groupElement>>;
   ...
};

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
// patches until these parts are annotated
import type { XMLCayleyDiagram, XMLSymmetryObject } from './XMLGroup.js'

export type ThumbnailsType = {
   cayleyDiagram: string,
   multtable: string,
   cycleGraph: string,
   symmetryObject?: string
}
export type CustomType = {
   name?: html,
   representations?: html[][],
   representationIndex?: integer,
   notes?: html
}
type GroupJSON = {
   URL: string,
   author: string,
   cayleyDiagrams: XMLCayleyDiagram[],
   custom: CustomType,
   declaredGenerators: Maybe<groupElement[][]>,
   definition: Maybe<html>,
   gapid?: string,
   gapname?: string,
   lastModifiedOnServer?: Maybe<string>,
   library?: void | 'extended' | 'notable' | 'generated',
   links: Maybe<string[]>,
   multtable: groupElement[][],
   names: html[],
   notes: string,
   phrase: html,
   representations: html[][],
   shortName: string,
   symmetryObjects: XMLSymmetryObject[],
   thumbnails?: ThumbnailsType,
}
export type GroupFileJSON = GroupJSON

export class Group {
   // Calculated group properties
   multtable: groupElement[][]                 

   /*
    * How representations work:
    *   representationIndex >= 0 => representation = representations[index]
    *   representationIndex < 0 => representation = userRepresentation[-(representationIndex + 1)]
    *
    * (representationIndex is an integer, not an object reference, so Group can be easily serialized)
    */
   representations: html[][]                             = []

   // Properties from .group file
   names: html[]                                         = ['Unnamed Group']
   gapname?: string
   shortName: string                                     = 'Unnamed Group'
   links: Maybe<string[]>                                = null
   declaredGenerators: Maybe<groupElement[][]>           = null
   definition: Maybe<html>                               = null
   phrase: html                                          = ''
   notes: string                                         = ''
   author: string                                        = ''
   cayleyDiagrams: XMLCayleyDiagram[]                    = []
   symmetryObjects: XMLSymmetryObject[]                  = []
   custom: CustomType                                    = {}

   // Group properties set elsewhere
   library?: void | 'extended' | 'notable' | 'generated'
   lastModifiedOnServer?: Maybe<string>
   thumbnails?: ThumbnailsType
   URL: string                                           = ''

   constructor (multtable: groupElement[][]) {
      this.multtable = multtable
   }

   static fromMulttable (multtable: groupElement[][]): Group {
      const G = new Group(multtable)

      G.names = [`An unknown group of order ${G.order}`]
      G.representations = [Array.from({length: G.order}, (_, inx) => '' + inx)]

      return G
   }

   // reads .group file from distribution
   static fromGroupFileJSON (json: GroupJSON): Group {
      const G = Object.assign(new Group(json.multtable), json)
      return G
   }

   // reads group from IndexedDB GeneralStore.GroupLibrary
   static fromLocalCopyJSON (json: GroupFileJSON): Group {
      return Group.fromGroupFileJSON(json)
   }

   /////////////////////// Assigned values

   get name (): html {
      return this.customName ?? this.names[0]
   }

   get customName (): html | undefined {
      return this.custom.name
   }

   set customName (customName: html) {
      if (customName != null && customName.length != 0) {
         this.custom.name = customName
      } else {
         delete this.custom.name
      }
   }

   get gapid (): string {
      if (!('_gapid_lock' in this)) {
         const groupURL = this.URL
         Object.defineProperty(this, '_gapid_lock', {
            value: true,
            enumerable: false,
            configurable: true  // so it can be removed later
         })
         window.setTimeout(async () => {
            const presentation = new URL(groupURL).search.slice(1)
            try {
               const {gapid, gapname} = await ShowGAPCode.resolveGAPInfo(presentation)
               const group = Library.getGroupByURL(groupURL)  // make sure the group hasn't been deleted
               if (group != null && (group.gapid != gapid || group.gapname != gapname)) {
                  group.gapid = gapid
                  group.gapname = gapname
                  Library.saveGroup(group)
               }
            } catch (_error) { }
            if ('_gapid_lock' in this) delete this._gapid_lock
         }, 0)
      }

      return `${this.order},??`
   }

   set gapid (gapid: string) {
      if (gapid != null && !gapid.endsWith('??')) {
         Object.defineProperty(this, 'gapid', {
            value: gapid,
            enumerable: true,  // serialize gapid if it is set
            writable: true
         })
      }
   }
   
   get other_names (): string[] {
      return (this.customName == null) ? this.names.slice(1) : this.names
   }

   get representation (): html[] {
      const inx = this.representationIndex
      return (inx < 0) ? this.userRepresentations[-(inx + 1)] : this.representations[inx]
   }

   set representation (representation: html[]) {
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

   get representationIndex (): number {
      return this.custom.representationIndex ?? 0
   }

   set representationIndex (representationIndex) {
      this.custom.representationIndex = representationIndex
   }

   get representationIsUserDefined (): boolean {
      return this.representationIndex < 0
   }

   get userRepresentations (): html[][] {
      if (this.custom.representations == null) {
         this.custom.representations = []
      }

      return this.custom.representations
   }

   set userRepresentations (userRepresentations: html[][]) {
      this.custom.representations = userRepresentations
   }

   deleteUserRepresentation (userIndex: number) {
      this.userRepresentations.splice(userIndex, 1);
      if (-(userIndex + 1) > this.representationIndex) {
         this.representationIndex += 1
      } else if (-(userIndex + 1) ===  this.representationIndex) {
         this.representationIndex = 0
      }
   }

   // length of longest label, rendered as HTML at font-size = 20px
   get longestHTMLLabel (): number {
      const dummy = document.createElement('div')
      dummy.innerHTML = this.representation.reduce<html>((html, label) => html + label + '<br>', ''),
      Object.assign(dummy.style, { left: '0', top: `${this.order + 10}em`, position: 'absolute', fontSize: '40px' })
      document.body.append(dummy)
      const longestHTMLLabel = dummy.offsetWidth / 40
      dummy.remove()

      this.setProperty<typeof this.longestHTMLLabel>('longestHTMLLabel', longestHTMLLabel)

      return this.longestHTMLLabel
   }

   get userNotes (): string {
      return this.custom.notes ?? ''
   }

   set userNotes (userNotes: string) {
      this.custom.notes = userNotes
   }

   ////////////////////////// Calculated values

   get center(): Subgroup {
      this.setProperty<typeof this.center>('center', this.getCenter())
      return this.center
   }

   get commutatorSubgroup (): Subgroup {
      // subgroup generated by the commutators i^-1 * j^-1 * i * j for all element pairs
      // also: the smallest normal subgroup which has an abelian quotient
      this.setProperty<typeof this.commutatorSubgroup>('commutatorSubgroup',
         this.subgroups.find((H) => H.isNormal && H.isomorphicQuotientGroup?.isAbelian)!)
      return this.commutatorSubgroup
   }

   get conjugacyClasses (): BitSet[] {
      this.setProperty<typeof this.conjugacyClasses>('conjugacyClasses', this.getConjugacyClasses(this.elements))
      return this.conjugacyClasses
   }

   get conjugateSubgroupClasses (): BitSet[] {
      this.setProperty<typeof this.conjugateSubgroupClasses>('conjugateSubgroupClasses',
         this.getConjugateSubgroupClasses())
      return this.conjugateSubgroupClasses
   }

   get elementPowers (): BitSet[] {
      this.setElementPowersAndPrimePowers()
      return this.elementPowers
   }

   get elementPrimePowers (): BitSet[] {
      this.setElementPowersAndPrimePowers()
      return this.elementPrimePowers
   }

   get elementOrders (): number[] {
      this.setProperty<typeof this.elementOrders>('elementOrders', this.elementPowers.map(el => el.popcount()))
      return this.elementOrders
   }

   get elements (): groupElement[] {
      return [...this.multtable[0]]
   }

   get generators (): groupElement[] {
      const generators = this.declaredGenerators?.[0] || this.subgroups[this.subgroups.length - 1].generators.toArray()
      return generators
   }

   get inverses (): groupElement[] {
      this.setProperty<typeof this.inverses>('inverses', this.elements.map((el) => this.multtable[el].indexOf(0)))
      return this.inverses
   }

   get isAbelian (): boolean {
      this.setProperty<typeof this.isAbelian>('isAbelian', this.nonAbelianExample == null)
      return this.isAbelian
   }

   get isCyclic (): boolean {
      this.setProperty<typeof this.isCyclic>('isCyclic', this.elementOrders.some((el) => el == this.order))
      return this.isCyclic
   }

   get isSimple (): boolean {
      this.setProperty<typeof this.isSimple>('isSimple', this.order > 1
         && !this.subgroups.some((H) => H.isNormal && H.order != 1 && H.order != this.order))
      return this.isSimple
   }

   get isSolvable (): boolean {
      this.setSubgroupsAndSolvable()
      return this.isSolvable
   }

   get nonAbelianExample (): Maybe<[groupElement, groupElement]> {
      let nonAbelianExample = null as Maybe<[groupElement, groupElement]>
      loop: for (const i of this.generators)
         for (const j of this.generators)
            if (this.multtable[i][j] != this.multtable[j][i]) {
               nonAbelianExample = [i,j]
               break loop
            }
      this.setProperty<typeof this.nonAbelianExample>('nonAbelianExample', nonAbelianExample)
      return this.nonAbelianExample
   }

   get nontrivialProperNormalSubgroups (): Subgroup[] {
      this.setProperty<typeof this.nontrivialProperNormalSubgroups>('nontrivialProperNormalSubgroups',
         this.nontrivialProperSubgroups.filter((H) => H.isNormal))
      return this.nontrivialProperNormalSubgroups
   }

   get nontrivialProperSubgroups (): Subgroup[] {
      this.setProperty<typeof this.nontrivialProperSubgroups>('nontrivialProperSubgroups',
         this.subgroups.filter((H) => H.order != 1 && H.order != this.order))
      return this.nontrivialProperSubgroups
   }

   get normalSubgroups (): Subgroup[] {
      this.setProperty<typeof this.normalSubgroups>('normalSubgroups', this.subgroups.filter((H) => H.isNormal))
      return this.normalSubgroups
   }

   get order (): number {
      return this.multtable.length
   }

   get orderClasses (): BitSet[] {
      this.setProperty<typeof this.orderClasses>('orderClasses', this.getOrderClasses(this.elementOrders))
      return this.orderClasses
   }

   get orderClassSizes (): number[] {
      const orderClassSizes = GEUtils.countBy<groupElement>(this.elementOrders, (el) => el)
      orderClassSizes[0] = 0
      this.setProperty<typeof this.orderClassSizes>('orderClassSizes', orderClassSizes)
      return this.orderClassSizes
   }

   get relations (): groupElement[][] {
      this.setProperty<typeof this.relations>('relations', DefiningRelations.findRelations(this))
      return this.relations
   }

   get subgroups (): Subgroup[] {
      this.setSubgroupsAndSolvable()
      return this.subgroups
   }

   get subgroupOrders (): number[] {
      this.setProperty<typeof this.subgroupOrders>('subgroupOrders',
         GEUtils.countBy<Subgroup>(this.subgroups, (H) => H.order))
      return this.subgroupOrders
   }

   ////////////////////////// Private helper functions

   private setProperty<T> (propertyName: string, value: T) {
      Object.defineProperty(this, propertyName, {
         value: value,
         enumerable: false
      })
   }

   private setElementPowersAndPrimePowers () {
      const [elementPowers, elementPrimePowers] = this.getElementPowers(this)
      this.setProperty<typeof this.elementPowers>('elementPowers', elementPowers)
      this.setProperty<typeof this.elementPrimePowers>('elementPrimePowers', elementPrimePowers)
   }

   private setSubgroupsAndSolvable () {
      const [subgroups, isSolvable] = SubgroupLattice.getSubgroups(this)
      this.setProperty<typeof this.subgroups>('subgroups', subgroups)
      this.setProperty<typeof this.isSolvable>('isSolvable', isSolvable)
   }

   private getCenter (): Subgroup {
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

      const center = this.subgroups.find((H) => H.members.contains(centerElements)) as Subgroup

      return center
   }

   // creates conjugacy classes for element array, which may be the elements of a subgroup
   private getConjugacyClasses (elements: groupElement[]): BitSet[] {
      const conjugacyClasses: BitSet[] = []

      const todo: BitSet = new BitSet(this.order, elements)

      while (todo.popcount() > 0) {
         const currentElement: groupElement = todo.pop() as number
         const conjugacyClass: BitSet = this.elements
            .reduce<BitSet>(
               (conjugacyClass, el) => conjugacyClass.set(this.conjugate(currentElement, el)), new BitSet(this.order))
         todo.subtract(conjugacyClass)
         conjugacyClasses.push(conjugacyClass)
      }

      conjugacyClasses.sort((a: BitSet, b: BitSet) => a.popcount() - b.popcount())

      return conjugacyClasses
   }

   private getConjugateSubgroupClasses (): BitSet[] {
      const conjugateSubgroupClasses: BitSet[] = []
      this.subgroups.forEach((H, hIndex) => {
         let conjugacyClass = conjugateSubgroupClasses.find((klass) => {
            const K = this.subgroups[klass.first() as number]
            return H.order == K.order
               && this.elements.some((g) =>
                  H.members.toArray()
                     .reduce<BitSet>(
                        (conjugateMembers, h) => conjugateMembers.set(this.conjugate(h, g)), new BitSet(this.order))
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
   private getElementPowers (group: Group): [BitSet[], BitSet[]] {
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

   private getOrderClasses (elementOrders: number[]): BitSet[] {
      const orderClasses = elementOrders.reduce<BitSet[]>(
         (orderClasses: BitSet[], elementOrder, element) => {
            if (orderClasses[elementOrder] == null) {
               orderClasses[elementOrder] = new BitSet(this.order)
            }
            orderClasses[elementOrder].set(element)
            return orderClasses
         }, [])

      return orderClasses;
   }

   ////////////////////////// Public functions

   mult (a: groupElement, b: groupElement): groupElement {
      return this.multtable[a % this.order][b % this.order];
   }

   // g h g⁻¹
   conjugate (h: groupElement, g: groupElement): groupElement {
      return this.multtable[g][this.multtable[h][this.inverses[g]]]
   }

   // takes bitset or array of generators; return bitset
   // note: depends on knowing this.subgroups, can only be run after SubgroupLattice
   closure (generators: BitSet | groupElement[]): BitSet {
      const gens = Array.isArray(generators) ? new BitSet(this.order, generators) : generators
      const rslt = this.subgroups.find((H) => H.members.contains(gens))?.members as BitSet

      return rslt
   }

   getElementPowerArray (element: groupElement): groupElement[] {
      const result = [0];
      for (let g = element; g != 0; g = this.mult(element, g)) {
         result.push(g);
      }
      return result;
   }

  getSubgroupByElements (elements: BitSet | groupElement[]): Maybe<Subgroup> {
      const elts = Array.isArray(elements) ? new BitSet(this.order, elements) : elements
      const subgroup = this.subgroups.find((H) => H.members.equals(elts))
      return subgroup
   }
}
/*
```
 */

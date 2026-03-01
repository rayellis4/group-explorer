/* @flow
# HighlightControlViewModel - ViewModel for Subset and Highlighting

HighlightControlViewModel implements the ViewModel layer of HighlightControl's MVVM pattern.
It manages display item state (subgroups, user subsets, partitions), highlight computation,
and serialization for Sheet ↔ Editor navigation.

```js
 */
import {BitSet} from './BitSet.js'
import * as GEUtils from './GEUtils.js'
import * as Log from './Log.js'
import {SubgroupLattice} from './SubgroupLattice.js'
import {THREE} from '../lib/externals.js'
/*::
import {CycleGraphModel} from './CycleGraphModel.js'
import type {Updatable, SubscriptionProxy} from './GEUtils.js'
import {Group} from './Group.js'

type HighlightControlJSON = {
  nextId: number,
  nextSubsetIndex: number,
  highlightedItem: number | void,
  displayItems: Array<any>,
  ...
}
 */
export {HighlightControlViewModel}
/*
```
## ViewModel
```js
 */
class HighlightControlViewModel /*:: implements Updatable */ {
   #model /*: CycleGraphModel */
   #view /*: HighlightControlView */

   nextId /*: number */
   nextSubsetIndex /*: number */
   highlightedItem /*: ?DisplayItem */ = null
   displayItems /*: Array<?DisplayItem> */ = []

   constructor (model /*: SubscriptionProxy<CycleGraphModel> */) {
      this.model = model
   }

   get group () /*: Group */ {
      return this.model.group
   }

   get highlights () /*: Array<Array<?color>> */ {
      return this.model.highlights
   }

   get highlightTypes () /*: Array<string> */ {
      return this.model.highlightConfiguration.highlightTypes
   }

   get view () /*: HighlightControlView */ {
      return this.#view  // this could also add it to an Array or Map
   }

   set view (view /*: HighlightControlView */) {
      this.#view = view
      this.displayItems
         .filter((item) => item instanceof Subgroop || item instanceof Subset || item instanceof PartitioningScheme)
         .forEach((item) => view.addElement(item))
      if (this.highlightedItem != null) {
         this.highlightItem(this.highlightedItem.id, 0)
      }
   }

   get model () /*: CycleGraphModel */ {
      return this.#model
   }

   set model (model /*: SubscriptionProxy<CycleGraphModel> */) {
      this.#model = model

      this.nextId = 0
      this.nextSubsetIndex = 0
      this.group.subgroups.forEach((_subgroup, inx) => this.#createItem(new Subgroop(this, inx)))
      this.#model = (model /*:: as any as CycleGraphModel */)

      model.highlightControl = this  // enter a reference to us in the model (this could also add it to an Array or Map)
      model.$subscribe(this, 'highlights')
   }

   toJSON () /*: HighlightControlJSON */ {
      const highlightControlJSON = {
         nextId: this.nextId,
         nextSubsetIndex: this.nextSubsetIndex,
         highlightedItem: this.highlightedItem?.id,
         displayItems: this.displayItems.map((item) => item?.toJSON())
      }

      return highlightControlJSON
   }

   fromJSON (jsonObject /*: HighlightControlJSON */) {
      const classMap /*: {[string]: Class<DisplayItem>} */ = {
         DisplayItem: DisplayItem,
         AbstractSubset: AbstractSubset,
         Subgroop: Subgroop,
         Subset: Subset,
         Partition: Partition,
         ConjugacyClass: ConjugacyClass,
         OrderClass: OrderClass,
         Coset: Coset,
         PartitioningScheme: PartitioningScheme,
         ConjugacyClasses: ConjugacyClasses,
         OrderClasses: OrderClasses,
         Cosets: Cosets
      }

      this.nextId = jsonObject.nextId
      this.nextSubsetIndex = jsonObject.nextSubsetIndex
      this.displayItems.length = 0
      jsonObject.displayItems.forEach((jsonObject, inx) => {
         const displayItem = new (classMap[jsonObject.class])(this)
         this.displayItems[inx] = displayItem.fromJSON(jsonObject)
      })
      if (jsonObject.highlightedItem != null) {
         this.highlightItem(jsonObject.highlightedItem, 0)
      } else {
         this.highlightedItem = null
      }

      if (this.view != null) {
         this.view.clearAll()
         this.view = this.view  // triggers download of all displayItems to this.view
      }
   }

/************************************************************/

   #createItem (item /*: DisplayItem */) /*: DisplayItem */ {
      item.id = this.nextId++
      this.displayItems[item.id] = item

      if (item instanceof Subset) {
         item.subsetIndex = this.nextSubsetIndex++
      } else if (item instanceof PartitioningScheme) {
         item.partitions.forEach((partition) => {
            partition.id = this.nextId++
            this.displayItems[partition.id] = partition
         })
      }

      this.view?.addElement(item)
      return item
   }

   #matchingSubsets (elements /*: BitSet */) /*: Array<Subgroop | Subset>*/ {
      const matchingSubsets = this.displayItems
         .filter((displayItem) =>
            (displayItem instanceof Subgroop || displayItem instanceof Subset) && elements.equals(displayItem.elements))

      return matchingSubsets
   }

   async createAndConfirmSubset (elements /*: BitSet */, explanation /*: html */) /*: Promise<?Subset> */ {
      const matchingSubsets = this.#matchingSubsets(elements)

      let result
      if (matchingSubsets.length == 0) {
         result = this.createSubset(elements)
      } else {
         const confirmation = await this.view.confirmSubsetSave(matchingSubsets, explanation)
         result = confirmation ? this.createSubset(elements) : null
      }

      return result
   }

   createSubset (elements /*: BitSet */) /*: Subset */ {
      return this.#createItem(new Subset(this, elements))
   }

   createConjugacyClasses () {
      this.#createItem(new ConjugacyClasses(this))
   }

   createOrderClasses () {
      this.#createItem(new OrderClasses(this))
   }

   createCosets (subgroopId /*: integer */, side /*: string */) {
      const subgroop = this.displayItems[subgroopId]
      if (subgroop instanceof Subgroop) {
         this.#createItem(new Cosets(this, subgroop, side))
      }
   }

   createDerivedSubset (
      type /*: 'closure' | 'normalizer' | 'intersection' | 'union' | 'elementwiseProduct' */,
      subsetId /*: integer */,
      subset2Id /*: integer */
   ) {
      const subset = this.displayItems[subsetId]
      const subset2 = this.displayItems[subset2Id]
      if (subset instanceof AbstractSubset && (subset2 == null || subset2 instanceof AbstractSubset)) {
         const derivedSubset = (subset2 == null) ? subset[type] : subset[type](subset2)
         const matchingSubsets = this.#matchingSubsets(derivedSubset)
         if  (matchingSubsets.length == 0) {
            this.createSubset(derivedSubset)
         } else {
            this.view.confirmSubsetSave(matchingSubsets, null, type, subset, subset2)
               .then((confirmation) => confirmation && this.createSubset(derivedSubset))
         }
      }
   }

   destroyItem (itemId /*: integer */) {
      const item = this.displayItems[itemId]
      if (item != null) {
         this.view.removeElement(item)
         this.displayItems[itemId] = null
      }
   }

/************************************************************/

   #generateHighlights (item /*: DisplayItem */, highlightTypeIndex /*: integer */) /*: Array<?color> */ {
      let highlights /*: Array<?color> */ = []

      const s = this.model.highlightConfiguration.saturation[highlightTypeIndex]
      const l = this.model.highlightConfiguration.lightness[highlightTypeIndex]
      const offset = this.model.highlightConfiguration.hueOffset[highlightTypeIndex]
      if (item instanceof PartitioningScheme) {
         item.partitions.forEach((partition, inx) => {
            const h = inx / item.partitions.length
            const color = '#' + new THREE.Color(GEUtils.fromRainbow(h, s, l, offset)).getHexString()
            partition.elements.toArray().forEach((element) => highlights[element] = color)
         })
      } else if (item instanceof AbstractSubset) {
         const h = 0
         const color = '#' + new THREE.Color(GEUtils.fromRainbow(h, s, l, offset)).getHexString()
         item.elements.toArray().forEach((element) => highlights[element] = color)
      }

      return highlights
   }

   highlightItem (itemId /*: integer */, highlightTypeIndex /*: integer */) {
      const item = this.displayItems[itemId]
      if (item == null) {
         return
      }

      this.highlights[highlightTypeIndex] = this.#generateHighlights(item, highlightTypeIndex)
      this.updateModel('highlights', this.highlights)
      this.highlightedItem = (highlightTypeIndex == 0) ? item : this.highlightedItem
   }

   toggleColorHighlight (subsetId /*: integer */) {
      const maybeItem = this.displayItems[subsetId]
      if (maybeItem == null) {
         return
      }

      const item = (maybeItem instanceof Partition) ? maybeItem.partitioningScheme : maybeItem
      const maybeHighlights = this.#generateHighlights(item, 0)
      if (  this.highlights[0].length != maybeHighlights.length
         || this.highlights[0].some((val, inx) => val != maybeHighlights[inx])
      ) {
         this.highlights[0] = maybeHighlights
         this.updateModel('highlights', this.highlights)
         this.highlightedItem = item
      } else {  // clear highlights
         this.updateModel('highlights', [[], this.highlights[1], this.highlights[2]])
         this.highlightedItem = null
      }
   }

   clearAllHighlights () {
      this.updateModel('highlights', [[], [], []])
   }

/************************************************************/

   canShowConjugacyClasses () /*: boolean */ {
      return this.displayItems.find((item) => item instanceof ConjugacyClasses) == null
   }

   canShowOrderClasses () /*: boolean */ {
      return this.displayItems.find((item) => item instanceof OrderClasses) == null
   }

   canShowCosets (subgroopId /*: number */, side /*: string */) /*: boolean */ {
      return this.displayItems
         .find((item) => item instanceof Cosets && item.subgroop.id == subgroopId && item.side == side) == null
   }

/************************************************************/

   updateModel (field /*: string */, value /*: any */) {
      switch (field) {
      case 'highlights':
         this.model['highlights'] = value
         break
      }
   }

   update (field /*: string */, value /*: any */) {
      switch (field) {
      case 'highlights':
         this.view?.updateHighlightMark()
         break
      }
   }
}
/*
```
## ViewModel Helper Classes
```
VIEW MODEL HIERARCHY (Domain Objects - No HTML/DOM knowledge)
├─ DisplayItem (abstract base)
│  ├─ AbstractSubset (abstract - represents subset of group elements)
│  │  ├─ Subgroop (one of the group's mathematical subgroups)
│  │  ├─ Subset (user-defined subset)
│  │  └─ Partition (element of a partitioning scheme)
│  │     ├─ ConjugacyClass (element of conjugacy class partition)
│  │     ├─ OrderClass (element of order class partition)
│  │     └─ Coset (element of coset partition)
│  └─ PartitioningScheme (abstract - collection of disjoint partitions)
│     ├─ ConjugacyClasses (all conjugacy classes)
│     ├─ OrderClasses (all order classes)
│     └─ Cosets (all left/right cosets of a subgroup)

```js
 */
class DisplayItem {
   id /*: number */
   viewModel /*: HighlightControlViewModel */

   constructor (viewModel /*: HighlightControlViewModel */) {
      this.viewModel = viewModel
   }

   toJSON () {
      const jsonObject = {
         class: 'DisplayItem',
         id: this.id
      }
      return jsonObject
   }

   fromJSON (jsonObject) {
      this.id = jsonObject.id
      return this
   }
}

class AbstractSubset extends DisplayItem {
   elements /*: BitSet */

   get closure () /*: BitSet */ {
      return this.viewModel.group.closure(this.elements)
   }

   union (other /*: AbstractSubset */) /*: BitSet */ {
      return BitSet.union(this.elements, other.elements)
   }

   intersection (other /*: AbstractSubset */) /*: BitSet */ {
      return BitSet.intersection(this.elements, other.elements)
   }

   elementwiseProduct (other /*: AbstractSubset */) /*: BitSet */ {
      const elementwiseProductElements = new BitSet(this.viewModel.group.order)
      for (let i = 0; i < this.elements.len; i++) {
         if (this.elements.isSet(i)) {
            for (let j = 0; j < other.elements.len; j++) {
               if (other.elements.isSet(j)) {
                  elementwiseProductElements.set(this.viewModel.group.multtable[i][j])
               }
            }
         }
      }
      return elementwiseProductElements
   }

   toJSON () {
      const jsonObject = super.toJSON()
      jsonObject.class = 'AbstractSubset'
      jsonObject.elements = this.elements.toJSON()
      return jsonObject
   }

   fromJSON (jsonObject) {
      super.fromJSON(jsonObject)
      this.elements = new BitSet().fromJSON(jsonObject.elements)
      return this
   }
}

class Subgroop extends AbstractSubset {
   kind = 'Subgroop'
   subgroupIndex /*: number */

   constructor(viewModel /*: HighlightControlViewModel */, subgroupIndex /*: number */) {
      super(viewModel)

      this.subgroupIndex = subgroupIndex
      this.elements = viewModel.group.subgroups[subgroupIndex].members
   }

   get normalizer () /*: BitSet */ {
      const normalizerElements = new SubgroupLattice(this.viewModel.group)
         .findNormalizer(this.viewModel.group.subgroups[this.subgroupIndex]).members

      return normalizerElements
   }

   get leftCosets () /*: Cosets */ {
      return new Cosets(this.viewModel, this, 'left')
   }

   get rightCosets () /*: Cosets */ {
      return new Cosets(this.viewModel, this, 'right')
   }

   toJSON () {
      const jsonObject = super.toJSON()
      jsonObject.class = 'Subgroop'
      jsonObject.subgroupIndex = this.subgroupIndex
      return jsonObject
   }

   fromJSON (jsonObject) {
      super.fromJSON(jsonObject)
      this.subgroupIndex = jsonObject.subgroupIndex
      return this
   }
}

class Subset extends AbstractSubset {
   kind = 'Subset'
   subsetIndex /*: number */

   constructor (viewModel /*: HighlightControlViewModel */, elements /*: void | Array<groupElement> | BitSet */) {
      super(viewModel)

      if (elements === undefined) {
         this.elements = new BitSet(viewModel.group.order)
      } else if (elements instanceof BitSet) {
         this.elements = elements
      } else if (Array.isArray(elements)) {
         this.elements = new BitSet(viewModel.group.order, elements)
      } else {
         Log.err(`invalid argument ${elements} passed to HighlightControl.Subset constructor`)
      }
   }

   toJSON () {
      const jsonObject = super.toJSON()
      jsonObject.class = 'Subset'
      jsonObject.subsetIndex = this.subsetIndex
      return jsonObject
   }

   fromJSON (jsonObject)  {
      super.fromJSON(jsonObject)
      this.subsetIndex = jsonObject.subsetIndex
      return this
   }
}

class Partition extends AbstractSubset {
   partitioningScheme /*: PartitioningScheme */
   subIndex /*: number */

   constructor (
      viewModel /*: HighlightControlViewModel */,
      partitioningScheme /*: PartitioningScheme */,
      subIndex /*: number */,
      elements /*: BitSet */
   ) {
      super(viewModel)

      this.partitioningScheme = partitioningScheme
      this.subIndex = subIndex
      this.elements = elements
   }

   toJSON () {
      const jsonObject = super.toJSON()
      jsonObject.class = 'Partition'
      jsonObject.partitioningScheme = this.partitioningScheme.id
      jsonObject.subIndex = this.subIndex
      return jsonObject
   }

   fromJSON (jsonObject) {
      super.fromJSON(jsonObject)
      this.subIndex = jsonObject.subIndex
      this.partitioningScheme = this.viewModel.displayItems.find((item) => item?.id == jsonObject.partitioningScheme)
      this.partitioningScheme.partitions[jsonObject.subIndex] = this
      return this
   }
}

class ConjugacyClass extends Partition {
   kind = 'ConjugacyClass'
   toJSON () {
      const jsonObject = super.toJSON()
      jsonObject.class = 'ConjugacyClass'
      return jsonObject
   }
}

class OrderClass extends Partition {
   kind = 'OrderClass'
   toJSON () {
      const jsonObject = super.toJSON()
      jsonObject.class = 'OrderClass'
      return jsonObject
   }
}

class Coset extends Partition {
   kind = 'Coset'
   toJSON () {
      const jsonObject = super.toJSON()
      jsonObject.class = 'Coset'
      return jsonObject
   }
}

class PartitioningScheme extends DisplayItem {
   partitions /*: Array<Partition> */ = []

   toJSON () {
      const jsonObject = super.toJSON()
      jsonObject.class = 'PartitioningScheme'
      return jsonObject
   }
}

class ConjugacyClasses extends PartitioningScheme {
   kind = 'ConjugacyClasses'
   constructor (viewModel /*: HighlightControlViewModel */) {
      super(viewModel)

      viewModel.group.conjugacyClasses
         .forEach((conjugacyClass, inx) => {
            const newConjugacyClass = new ConjugacyClass(viewModel, this, inx, conjugacyClass)
            this.partitions.push(newConjugacyClass)
         })
   }

   toJSON () {
      const jsonObject = super.toJSON()
      jsonObject.class = 'ConjugacyClasses'
      return jsonObject
   }
}

class OrderClasses extends PartitioningScheme {
   kind = 'OrderClasses'
   constructor (viewModel /*: HighlightControlViewModel */) {
      super(viewModel)

      viewModel.group.orderClasses
         .filter((orderClass) => orderClass.popcount() != 0)
         .forEach((orderClass, inx) => {
            const newOrderClass = new OrderClass(viewModel, this, inx, orderClass)
            this.partitions.push(newOrderClass)
         })
   }

   toJSON () {
      const jsonObject = super.toJSON()
      jsonObject.class = 'OrderClasses'
      return jsonObject
   }
}

class Cosets extends PartitioningScheme {
   kind = 'Cosets'
   subgroop /*: Subgroop */
   side /*: string */

   constructor(viewModel /*: HighlightControlViewModel */, subgroop /*: Subgroop */, side /*: string */) {
      super(viewModel)

      this.subgroop = subgroop
      this.side = side

      if (subgroop != null) {
         viewModel.group.getCosets(subgroop.elements, this.isLeft)
            .forEach((coset, inx) => {
               const newCoset = new Coset(viewModel, this, inx, coset)
               this.partitions.push(newCoset)
            })
      }
   }

   get isLeft () /*: boolean */ {
      return (this.side == 'left')
   }

   toJSON () {
      const jsonObject = super.toJSON()
      jsonObject.class = 'Cosets'
      jsonObject.subgroop = this.subgroop.id
      jsonObject.side = this.side
      return jsonObject
   }

   fromJSON (jsonObject) /*: this */ {
      super.fromJSON(jsonObject)
      this.subgroop = this.viewModel.displayItems.find((item) => item?.id == jsonObject.subgroop)
      this.side = jsonObject.side
      return this
   }
}

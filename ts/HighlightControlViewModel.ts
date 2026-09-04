/*
# HighlightControlViewModel - ViewModel for Subset and Highlighting

HighlightControlViewModel implements the ViewModel layer of HighlightControl's MVVM pattern.
It manages display item state (subgroups, user subsets, partitions), highlight computation,
and serialization for Sheet ↔ Editor navigation.

```js
 */
import { BitSet, BitSetJSON } from './BitSet.js'
import * as GEUtils from './GEUtils.js'
import * as Log from './Log.js'
import { SubgroupLattice } from './SubgroupLattice.js'
import * as THREE from '../lib/externals.js'

import type { Group } from './Group.js'
import type { Updatable, SubscriptionProxy } from './GEUtils.js'
import type { HighlightControlView } from './HighlightControlView.js'

export type {
   DisplayItem,
   AbstractSubset,
   Subgroop,
   Subset,
   Partition,
   ConjugacyClass,
   OrderClass,
   Coset,
   PartitioningScheme,
   ConjugacyClasses,
   OrderClasses,
   Cosets
}

export interface HighlightControlModelInterface {
   group: Group,
   highlightColors: Maybe<color>[][],
   highlightConfiguration: {  // visualizer-specific highlight parameters
      highlightTypes: string[],
      saturation: number[],
      lightness: number[],
      hueOffset: number[]
   },
   highlightControl?: HighlightControlJSON | (object & Serializable<HighlightControlJSON>)
}

export type HighlightControlJSON = {
   next_id: number,
   next_subset_index: number,
   highlighted_items: Maybe<number>[],
   display_map: displayItemJSON[]
}
type sides = 'left' | 'right'
type displayItemJSON = {
   id: number,
   class_name: string,
   elements?: BitSetJSON,
   subgroup_index?: integer,
   subset_index?: integer,
   partitioning_scheme?: integer,
   sub_index?: integer,
   subgroop_id?: integer,
   side?: sides
}
/*
```
## ViewModel

**Instance Variables**:
  *  [displayItem](#viewmodel-helper-classes) -- objects displayed in the HighlightControl user interface
  *  model -- the visualizer-wide Model in this MVVM pattern to which this ViewModel subscribes
  *  view -- the View in this MVVM pattern which this ViewModel manages and from which it receives events
  *  nextId -- the next id that will be assigned to a displayItem
  *  nextSubsetIndex -- the next subgroup id that will be assigned to a subset (e.g., S_n)
  *  highlightedItems -- array of highlighted
  *  displayMap -- a map of all display items by id
```js
 */
export class HighlightControlViewModel implements Updatable, Serializable<HighlightControlJSON> {
   private _model!: SubscriptionProxy<HighlightControlModelInterface>
   private _view!: HighlightControlView
   nextId: number = 0
   nextSubsetIndex: number = 0
   highlightedItems: Maybe<DisplayItem>[] = [null, null, null]
   displayMap: Map<number, DisplayItem> = new Map()

   constructor (model: SubscriptionProxy<HighlightControlModelInterface>) {
      this._model = model

      model.$subscribe(this, 'highlightColors')

      if (model.highlightControl == null) {
         // initialize displayMap with model.group's subgroups
         this.group.subgroups.forEach((_H, inx) => {
            const newSubgroop = new Subgroop(this, inx)
            newSubgroop.id = this.nextId++
            this.displayMap.set(newSubgroop.id, newSubgroop)
         })

         // If model.highlightColors is set, determine which subgroups are highlighted
         // (For now, only consider highlights of a single color that highlight a subgroup:
         // this covers editing an element of a subgroup lattice display, for example.)
         // ToDo: recognize other highlight patterns (conjugacy classes, cosets)
         if (model.highlightColors.some((colors) => colors.some((item) => item != null))) {
            model.highlightColors.forEach((highlightColors, inx) => {
               const oneColor = highlightColors.find((color) => color != null && color != '')
               if (highlightColors.every((color) => color == oneColor || color == null || color == '')) {
                  const highlightedElements = new BitSet(this.group.order)
                  highlightColors.forEach((color, inx) => {
                     if (color == oneColor) {
                        highlightedElements.set(inx)
                     }
                  })
                  const subgroupIndex = this.group.subgroups.findIndex((H) => highlightedElements.equals(H.members))
                  const highlightedItem = Array.from(this.displayMap)
                     .find(([_inx, subgroop]) => 'subgroupIndex' in subgroop && subgroop.subgroupIndex == subgroupIndex)?.[1]
                  this.highlightedItems[inx] = highlightedItem
               }
            })
         }

         this.fromJSON(this.toJSON())
      } else {
         if (GEUtils.isSerializable<HighlightControlJSON>(model.highlightControl)) {
            this.fromJSON(model.highlightControl.toJSON())
         } else {
            this.fromJSON(model.highlightControl)
         }
      }

      model.highlightControl = this
   }

   get group (): Group {
      return this.model.group
   }

   get highlightColors (): Maybe<color>[][] {
      return this.model.highlightColors
   }

   get highlightTypes (): string[] {
      return this.model.highlightConfiguration.highlightTypes
   }

   get view (): HighlightControlView {
      return this._view  // this could also add it to an Array or Map
   }

   set view (view: HighlightControlView) {
      this._view = view
      Array.from(this.displayMap.values())
         .filter((item) => item instanceof Subgroop || item instanceof Subset || item instanceof PartitioningScheme)
         .forEach((item) => view.addElement(item))
      if (this.highlightedItems[0] != null) {
         this.highlightItem(this.highlightedItems[0].id, 0)
      }
   }

   get model (): HighlightControlModelInterface {
      return this._model
   }

   toJSON (): HighlightControlJSON {
      const highlightControlJSON = {
         next_id: this.nextId,
         next_subset_index: this.nextSubsetIndex,
         highlighted_items: this.highlightedItems?.map((item) => item?.id) ?? [] as Maybe<DisplayItem>[],
         display_map: Array.from(this.displayMap.values()).map((item) => item.toJSON())
      }

      return highlightControlJSON
   }

   fromJSON (jsonObject: HighlightControlJSON) {
      type Constructor = new (arg0: HighlightControlViewModel, ...args: any[]) => DisplayItem
      const classMap: Record<string, Constructor> = {
         Subgroop: Subgroop,
         Subset: Subset,
         ConjugacyClass: ConjugacyClass,
         OrderClass: OrderClass,
         Coset: Coset,
         ConjugacyClasses: ConjugacyClasses,
         OrderClasses: OrderClasses,
         Cosets: Cosets
      }

      this.nextId = jsonObject.next_id
      this.nextSubsetIndex = jsonObject.next_subset_index
      this.displayMap.clear()
      jsonObject.display_map.forEach((displayItemJSON) => {
         const displayItem = new (classMap[displayItemJSON.class_name])(this).fromJSON(displayItemJSON)
         this.displayMap.set(displayItemJSON.id, displayItem)
      })
      this.highlightedItems = jsonObject.highlighted_items.map((item) => item ? this.displayMap.get(item) : null)

      if (this.view != null) {
         this.view.clearAll()
         this.view = this.view  // triggers download of all displayItems to this.view
      }
   }
/**
```
### Create / Destroy display items
```js
 */
   private createItem (item: DisplayItem): DisplayItem {
      item.id = this.nextId++
      this.displayMap.set(item.id, item)

      if (item instanceof Subset) {
         item.subsetIndex = this.nextSubsetIndex++
      } else if (item instanceof PartitioningScheme) {
         item.partitions.forEach((partition) => {
            partition.id = this.nextId++
            this.displayMap.set(partition.id, partition)
         })
      }

      this.triggerModelUpdate()
      this.view?.addElement(item)
      return item
   }

   private matchingSubsets (elements: BitSet): Array<Subgroop | Subset> {
      const matchingSubsets = Array.from(this.displayMap.values())
         .filter((displayItem) => displayItem instanceof Subgroop || displayItem instanceof Subset)
         .filter((displayItem) => elements.equals(displayItem.elements))

      return matchingSubsets
   }

   async createAndConfirmSubset (elements: BitSet, explanation: html): Promise<Maybe<Subset>> {
      const matchingSubsets = this.matchingSubsets(elements)

      let result: Maybe<Subset>
      if (matchingSubsets.length == 0) {
         result = this.createSubset(elements)
      } else {
         const confirmation = await this.view.confirmSubsetSave(matchingSubsets, explanation)
         result = confirmation ? this.createSubset(elements) : null
      }

      return result
   }

   createSubset (elements: BitSet): Subset {
      return this.createItem(new Subset(this, elements)) as Subset
   }

   createConjugacyClasses () {
      this.createItem(new ConjugacyClasses(this)) as ConjugacyClasses
   }

   createOrderClasses () {
      this.createItem(new OrderClasses(this))
   }

   createCosets (subgroopId: integer, side: sides) {
      const subgroop = this.displayMap.get(subgroopId)
      if (subgroop instanceof Subgroop) {
         this.createItem(new Cosets(this, subgroop, side))
      }
   }

   createDerivedSubset (
      type: 'closure' | 'normalizer' | 'intersection' | 'union' | 'elementwiseProduct',
      subsetId: integer,
      subset2Id: integer
   ) {
      const subset = this.displayMap.get(subsetId)
      const subset2 = this.displayMap.get(subset2Id)
      if (subset instanceof AbstractSubset && (subset2 == null || subset2 instanceof AbstractSubset)) {
         const derivedSubset = (subset2 != null)
            ? subset[type as 'intersection' | 'union' | 'elementwiseProduct'](subset2)
            : (type == 'normalizer' && 'normalizer' in subset)
               ? (subset as Subgroop).normalizer
               : subset.closure
         const matchingSubsets = this.matchingSubsets(derivedSubset)
         if  (matchingSubsets.length == 0) {
            this.createSubset(derivedSubset)
         } else {
            this.view.confirmSubsetSave(matchingSubsets, null, type, subset, subset2)
               .then((confirmation) => confirmation && this.createSubset(derivedSubset))
         }
      }
   }

   destroyItem (itemId: integer) {
      const clearItemHighlight = (item: DisplayItem) => {
         this.highlightedItems = this.highlightedItems.map((highlightedItem) => {
            return (highlightedItem == item) ? null : highlightedItem
         })
      }

      const item = this.displayMap.get(itemId)
      if (item != null) {
         if (item instanceof PartitioningScheme) {
            item.partitions.forEach((partition) => {
               this.view.removeElement(partition)
               this.displayMap.delete(partition.id)
               clearItemHighlight(partition)
            })
         }
         clearItemHighlight(item)
         this.view.removeElement(item)
         this.displayMap.delete(itemId)
         this.updateHighlightColors()
      }
   }
/**
```
### Manage display item highlighting
```js
 */
   private updateHighlightColors () {
      const highlightColors = this.highlightedItems.map((item, inx) => {
         let highlight: Maybe<color>[] = []
         if (item == null) {
            return highlight
         }
         const s = this.model.highlightConfiguration.saturation[inx]
         const l = this.model.highlightConfiguration.lightness[inx]
         const offset = this.model.highlightConfiguration.hueOffset[inx]
         if (item instanceof PartitioningScheme) {
            item.partitions.forEach((partition, jnx) => {
               const h = jnx / item.partitions.length
               const color = '#' + new THREE.Color(GEUtils.fromRainbow(h, s, l, offset)).getHexString()
               partition.elements.toArray().forEach((element) => highlight[element] = color)
            })
         } else if (item instanceof AbstractSubset) {
            const h = 0
            const color = '#' + new THREE.Color(GEUtils.fromRainbow(h, s, l, offset)).getHexString()
            item.elements.toArray().forEach((element) => highlight[element] = color)
         }

         return highlight
      })

      this.view?.updateHighlightMark()
      this.updateModel('highlightColors', highlightColors)
   }

   highlightItem (itemId: integer, highlightTypeIndex: integer) {
      const item = this.displayMap.get(itemId)
      this.highlightedItems[highlightTypeIndex] = item
      this.updateHighlightColors()
   }

   toggleColorHighlight (itemId: integer) {
      const item = this.displayMap.get(itemId)
      this.highlightedItems[0] = (this.highlightedItems[0] == item) ? null : item
      this.updateHighlightColors()
   }

   clearAllHighlightColors () {
      this.highlightedItems = [null, null, null]
      this.updateHighlightColors()
   }
   /**
```
### Predicates for displaying various partitioning schemes
```js
 */
   canShowConjugacyClasses (): boolean {
      return Array.from(this.displayMap.values()).find((item) => item instanceof ConjugacyClasses) == null
   }

   canShowOrderClasses (): boolean {
      return Array.from(this.displayMap.values()).find((item) => item instanceof OrderClasses) == null
   }

   canShowCosets (subgroopId: number, side: sides): boolean {
      return Array.from(this.displayMap.values())
         .find((item) => item instanceof Cosets && item.subgroop.id == subgroopId && item.side == side) == null
   }
/**
```
### Receiving and pushing updates to/from this.#model
```js
 */
   updateModel (field: string, value: unknown) {
      switch (field) {
      case 'highlightColors':
         this.model['highlightColors'] = value as Maybe<color>[][]
         break
      }
   }

   // notify highlightControl subscribers (e.g. SheetEditor broadcast) that structural state changed
   private triggerModelUpdate () {
      this._model.$touch('highlightControl')
   }

   update (field: string, _value: unknown) {
      switch (field) {
         case 'highlightColors':
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
   id!: number
   viewModel: HighlightControlViewModel
   className!: string

   constructor (viewModel: HighlightControlViewModel) {
      this.viewModel = viewModel
   }

   toJSON (): displayItemJSON {
      const jsonObject = {
         id: this.id,
         class_name: this.className
      }
      return jsonObject
   }

   fromJSON (jsonObject: displayItemJSON): this {
      this.id = jsonObject.id
      return this
   }
}

class AbstractSubset extends DisplayItem {
   elements!: BitSet

   get closure (): BitSet {
      return this.viewModel.group.closure(this.elements)
   }

   union (other: AbstractSubset): BitSet {
      return BitSet.union(this.elements, other.elements)
   }

   intersection (other: AbstractSubset): BitSet {
      return BitSet.intersection(this.elements, other.elements)
   }

   elementwiseProduct (other: AbstractSubset): BitSet {
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

   toJSON (): displayItemJSON {
      const jsonObject = super.toJSON()
      jsonObject.elements = this.elements.toJSON()
      return jsonObject
   }

   fromJSON (jsonObject: displayItemJSON): this {
      super.fromJSON(jsonObject)
      this.elements = new BitSet().fromJSON(jsonObject.elements as BitSetJSON)
      return this
   }
}

class Subgroop extends AbstractSubset {
   className = 'Subgroop'
   subgroupIndex: integer

   constructor(viewModel: HighlightControlViewModel, subgroupIndex: number) {
      super(viewModel)

      this.subgroupIndex = subgroupIndex
      this.elements = viewModel.group.subgroups[subgroupIndex]?.members
   }

   get normalizer (): BitSet {
      const normalizerElements = new SubgroupLattice(this.viewModel.group)
         .findNormalizer(this.viewModel.group.subgroups[this.subgroupIndex]).members

      return normalizerElements
   }

   get leftCosets (): Cosets {
      return new Cosets(this.viewModel, this, 'left')
   }

   get rightCosets (): Cosets {
      return new Cosets(this.viewModel, this, 'right')
   }

   toJSON (): displayItemJSON {
      const jsonObject = super.toJSON()
      jsonObject.subgroup_index = this.subgroupIndex
      return jsonObject
   }

   fromJSON (jsonObject: displayItemJSON): this {
      super.fromJSON(jsonObject)
      this.subgroupIndex = jsonObject.subgroup_index as integer
      return this
   }
}

class Subset extends AbstractSubset {
   className = 'Subset'
   subsetIndex!: integer

   constructor (viewModel: HighlightControlViewModel, elements: void | Array<groupElement> | BitSet) {
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

   toJSON (): displayItemJSON {
      const jsonObject = super.toJSON()
      jsonObject.subset_index = this.subsetIndex
      return jsonObject
   }

   fromJSON (jsonObject: displayItemJSON): this {
      super.fromJSON(jsonObject)
      this.subsetIndex = jsonObject.subset_index as integer
      return this
   }
}

class Partition extends AbstractSubset {
   partitioningScheme: PartitioningScheme
   subIndex: number

   constructor (
      viewModel: HighlightControlViewModel,
      partitioningScheme: PartitioningScheme,
      subIndex: number,
      elements: BitSet
   ) {
      super(viewModel)

      this.partitioningScheme = partitioningScheme
      this.subIndex = subIndex
      this.elements = elements
   }

   toJSON (): displayItemJSON {
      const jsonObject = super.toJSON()
      jsonObject.partitioning_scheme = this.partitioningScheme.id
      jsonObject.sub_index = this.subIndex
      return jsonObject
   }

   fromJSON (jsonObject: displayItemJSON): this {
      super.fromJSON(jsonObject)
      this.subIndex = jsonObject.sub_index as integer
      this.partitioningScheme = Array.from(this.viewModel.displayMap.values())
         .find((item) => item.id == jsonObject.partitioning_scheme as integer) as PartitioningScheme
      this.partitioningScheme.partitions[jsonObject.sub_index as integer] = this
      return this
   }
}
 
class ConjugacyClass extends Partition {
   className = 'ConjugacyClass'
}

class OrderClass extends Partition {
   className = 'OrderClass'
}

class Coset extends Partition {
   className = 'Coset'
}

class PartitioningScheme extends DisplayItem {
   partitions: Partition[] = []
}

class ConjugacyClasses extends PartitioningScheme {
   className = 'ConjugacyClasses'
   constructor (viewModel: HighlightControlViewModel) {
      super(viewModel)

      viewModel.group.conjugacyClasses
         .forEach((conjugacyClass, inx) => {
            const newConjugacyClass = new ConjugacyClass(viewModel, this, inx, conjugacyClass)
            this.partitions.push(newConjugacyClass)
         })
   }
}

class OrderClasses extends PartitioningScheme {
   className = 'OrderClasses'
   constructor (viewModel: HighlightControlViewModel) {
      super(viewModel)

      viewModel.group.orderClasses
         .filter((orderClass) => orderClass.popcount() != 0)
         .forEach((orderClass, inx) => {
            const newOrderClass = new OrderClass(viewModel, this, inx, orderClass)
            this.partitions.push(newOrderClass)
         })
   }
}

class Cosets extends PartitioningScheme {
   className = 'Cosets'
   subgroop: Subgroop
   side: sides

   constructor(viewModel: HighlightControlViewModel, subgroop: Subgroop, side: sides) {
      super(viewModel)

      this.subgroop = subgroop
      this.side = side

      if (subgroop != null) {
         const subgroup = viewModel.group.subgroups[subgroop.subgroupIndex]
         const cosets = (side == 'left') ? subgroup.leftCosets : subgroup.rightCosets
         cosets.forEach((coset, inx) => {
            const newCoset = new Coset(viewModel, this, inx, coset)
            this.partitions.push(newCoset)
         })
      }
   }

   toJSON (): displayItemJSON {
      const jsonObject = super.toJSON()
      jsonObject.subgroop_id = this.subgroop.id
      jsonObject.side = this.side
      return jsonObject
   }

   fromJSON (jsonObject: displayItemJSON): this {
      super.fromJSON(jsonObject)
      this.subgroop = Array.from(this.viewModel.displayMap.values())
         .find((item) => item.id == jsonObject.subgroop_id as integer) as Subgroop
      this.side = jsonObject.side as sides
      return this
   }
}

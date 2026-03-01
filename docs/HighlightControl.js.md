/* @flow
# HighlightControl - Subset and Highlighting Management

HighlightControl manages user-defined subsets, partitions, and element highlighting for
Group Explorer visualizations. It implements the MVVM (Model-View-ViewModel) pattern to
separate concerns and enable state serialization for Sheet ↔ Editor navigation.

```js
 */
import {BitSet} from './BitSet.js'
import * as GEUtils from './GEUtils.js'
import * as Log from './Log.js'
import {SubgroupLattice} from './SubgroupLattice.js'
import {makeFixedMenu, makeDetachedMenu, makeDialog} from './UIComponents.js'
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
export {addControl}
/*
```
## AddControl

```js
 */
function addControl (
   highlightControlElement /*: HTMLElement */,
   modelProxy /*: SubscriptionProxy<CycleGraphModel> */,
   initialJSON /*: HighlightControlJSON */
) {
   const viewModel = new ViewModel(modelProxy)  // create ViewModel and connect to Model
   if (initialJSON != null) {
      viewModel.fromJSON(initialJSON)
   }
   new View(viewModel, highlightControlElement) // create View and connect to ViewModel
}
/*
```
## ViewModel
```js
 */
class ViewModel /*:: implements Updatable */ {
   #model /*: CycleGraphModel */
   #view /*: View */

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

   get view () /*: View */ {
      return this.#view  // this could also add it to an Array or Map
   }

   set view (view /*: View */) {
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
   viewModel /*: ViewModel */

   constructor (viewModel /*: ViewModel */) {
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

   constructor(viewModel /*: ViewModel */, subgroupIndex /*: number */) {
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

   constructor (viewModel /*: ViewModel */, elements /*: void | Array<groupElement> | BitSet */) {
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
      viewModel /*: ViewModel */,
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
   constructor (viewModel /*: ViewModel */) {
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
   constructor (viewModel /*: ViewModel */) {
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

   constructor(viewModel /*: ViewModel */, subgroop /*: Subgroop */, side /*: string */) {
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
/*
```
## View
```js
 */
class View {
   viewModel /*: ViewModel */
   rootElement /*: HTMLElement */
   itemMap /*: Array<?DisplayItemView> */ = []
   constructor (viewModel /*: ViewModel */, rootElement /*: HTMLElement */) {
      this.viewModel = viewModel
      this.rootElement = rootElement

      // Create document fragment to lay out HighlightControl UI and
      rootElement.insertAdjacentHTML('beforeend', View.highlightControlHTML)

      makeFixedMenu(document.getElementById('subset-page'), (action, event) => {
         Log.debug(`View.constructor executing ${action}`)
         eval(action)
      })

      this.updateHighlightMark()

      // setup finished, let viewModel add its items
      viewModel.view = this
   }

   addElement (displayItem /*: DisplayItem */) {
      new DisplayItemView(displayItem, this)
      this.updateHighlightMark()
   }

   allConjugacyClassesHTML () /*: html */ {
      const html =
         `<li data-action="this.viewModel.createConjugacyClasses()">
         all conjugacy classes <i>CC</i><sub>i</sub>
         </li>`
      return html
   }

   allOrderClassesHTML () /*: html */ {
      const html =
         `<li data-action="this.viewModel.createOrderClasses()">
         all order classes <i>OC</i><sub>i</sub>
         </li>`
      return html
   }

   makeLongList (
      subsetView /*: AbstractSubsetView */,
      htmlGenerator /*: (AbstractSubsetView, AbstractSubsetView) => string */
   ) /*: html */ {
      const result = this.viewModel.displayItems.reduce(
         (list /*: Array<html> */, item) => {
            if (item instanceof AbstractSubset && subsetView.id != item.id) {
               const itemView = this.itemMap[item.id]
               list.push(htmlGenerator(subsetView, itemView))
            }
            return list
         }, [])
         .join('')
      return result
   }

   removeElement (displayItem /*: DisplayItem */) {
      const displayItemView = this.itemMap[displayItem.id]
      if (displayItemView != null) {
         displayItemView.destroy()
         this.itemMap[displayItem.id] = null
         this.updateHighlightMark()
      }
   }

   #showHeaderMenu (event /*: MouseEvent */) {
      const headerMenu =
         `<ul id="header-menu">
            <li data-action="this.makeSubsetEditor()">Create ${this.nextSubsetName()}</li>
            <hr>
            ${(this.viewModel.canShowOrderClasses() || this.viewModel.canShowConjugacyClasses())
               ? `<li class="inline-submenu">Compute
                     <ul id="compute-menu">
                        ${this.viewModel.canShowConjugacyClasses() ? this.allConjugacyClassesHTML() : ''}
                        ${this.viewModel.canShowOrderClasses() ? this.allOrderClassesHTML() : ''}
                     </ul>
                  </li>`
               : ''}
            <li data-action="this.viewModel.clearAllHighlights()">Clear all highlighting</li>
          </ul>`

      makeDetachedMenu(headerMenu, event)
         .then((action, _event) => eval(action))
   }

   showItemMenu (event /*: MouseEvent */, subsetId /*: number */) {
      const menu = this.itemMap[subsetId].menu
      const actionElement = (event.target.closest('[data-action]') /*:: as any as HTMLElement */)
      actionElement.style.backgroundColor = 'var(--list-highlight)'
      makeDetachedMenu(menu, event)
         .then(
            (action) => {
               actionElement.style.backgroundColor = ''  // clear highlight
               if (action != null) {
                  Log.debug(`View.showItemMenu executing ${action}`)
                  eval(action)
               }
            })
   }

   intersectionItemHTML (subsetView /*: AbstractSubsetView */, otherSubsetView /*: AbstractSubsetView */) /*: html */ {
      return `
         <li data-action="this.viewModel.createDerivedSubset('intersection',${subsetView.id},${otherSubsetView.id})"
            >the intersection of ${subsetView.name} with ${otherSubsetView.name}</li>`
   }

   unionItemHTML (subsetView /*: AbstractSubsetView */, otherSubsetView /*: AbstractSubsetView */) /*: html */ {
      return `
         <li data-action="this.viewModel.createDerivedSubset('union',${subsetView.id},${otherSubsetView.id})"
            >the union of ${subsetView.name} with ${otherSubsetView.name}</li>`
   }

   elementwiseProductItemHTML (subsetView /*: AbstractSubsetView */, otherSubsetView /*: AbstractSubsetView */) /*: html */ {
      return `
         <li data-action="this.viewModel.createDerivedSubset('elementwiseProduct',${subsetView.id},${otherSubsetView.id})"
            >the elementwise product of ${subsetView.name} with ${otherSubsetView.name}</li>`
   }

   highlightItemHTML (itemView /*: DisplayItemView */) /*: html */ {
      const html = [
         '<ul>'
      ]
      this.viewModel.highlightTypes.forEach((highlightType, inx) => html.push(
         `<li data-action="this.viewModel.highlightItem(${itemView.id}, ${inx})">by ${highlightType}</li>`
      ))
      html.push(
         '</ul>'
      )

      return html.join('')
   }

   updateHighlightMark () {
      window.setTimeout(() => {
         // clear current highlight markings
         document.querySelectorAll('#subset-page .highlight-mark')
            .forEach((element) => element.classList.remove('highlight-mark'))

         if (this.viewModel.highlightedItem != null) {
            this.itemMap[this.viewModel.highlightedItem.id].highlight()
         }
      }, 0)
   }

   async confirmSubsetSave (
      matchingSubsets /*: Array<Subgroop | Subset> */,
      explanation /*: ?html */,
      type /*: 'closure' | 'normalizer' | 'union' | 'intersection' | 'elementwiseProduct' | void */,
      subset /*: ?AbstractSubset */,
      subset2 /*: ?AbstractSubset */
   ) /*: Promise<boolean> */ {
      if (explanation == null) {
         const subsetView = this.itemMap[subset.id]
         const subset2View = this.itemMap[subset2?.id]
         explanation = (subset2View == null)
            ? subsetView[`${type}Explanation`]
            : subsetView[`${type}Explanation`](subset2View)
      }

      const matchingSubsetViews = matchingSubsets.map((subset) => this.itemMap[subset.id])
      const matchingSubsetString = matchingSubsetViews.reduce((subsetString, subsetView, inx) => {
         if (inx != 0) {
            if (inx == matchingSubsets.length - 1) {
               if (matchingSubsets.length > 2) {
                  subsetString += ','
               }
               subsetString += ' and '
            } else if (inx != 0) {
               subsetString += ', '
            }
         }
         return subsetString + subsetView.name
      }, '')

      const subsetElements = matchingSubsets[0].elements.toArray()
      const subsetElementHTML = subsetElements
         .map((element) => this.viewModel.group.representation[element])
         .join(', ')

      const confirmationHTML =
         `<div style="text-wrap: auto; width: 70ch; resize: none;">
             <p>The subset { ${subsetElementHTML} } of ${this.viewModel.group.name} was computed as follows:</p>` +
            '<p>' + explanation + '</p>' +
            `<p style="text-align: center; color: red">This subset is equivalent to ${matchingSubsetString}.</p>
             <p>Would you like to add this subset to the list as <i>S</i><sub>${this.viewModel.nextSubsetIndex}</sub>?</p>
             <div style="display: flex; justify-content: flex-end; gap: 2ch">
                <button data-value="true">Yes, add a new subset</button>
                <button data-value="false">No, forget it</button>
             </div>
          </div>`

      const location = {clientX: 'calc(3ch + (100% - 70ch) / 2)', clientY: 'calc(3em + (100% - 15em) / 4)'}
      const confirmationDialog = makeDialog(confirmationHTML, location)

      const confirmation = await new Promise/*:: <boolean> */((resolve, _reject) => {
         confirmationDialog.addEventListener('click', (event) => {
            const dataValue = event.target.closest('button[data-value]')?.getAttribute('data-value')
            if (dataValue != null) {
               confirmationDialog.remove()
               resolve(dataValue == 'true')
            }
         })
      })

      return confirmation
   }

   nextSubsetName () /*: html */ {
      return `<i>S</i><sub>${this.viewModel.nextSubsetIndex}</sub>`
   }

   makeSubsetEditor (subsetId /*: ?integer */) {
      const subset = (subsetId == null) ? null : this.viewModel.displayItems[subsetId]

      if (subset instanceof Subset) {
         new SubsetEditor(this.viewModel, this.itemMap[subsetId].name, subset.elements)
      } else {
         new SubsetEditor(this.viewModel, this.nextSubsetName(), new BitSet(this.viewModel.group.order))
      }
   }

   clearAll () {
      this.itemMap.forEach((itemView) => itemView?.htmlElement?.remove())
      this.itemMap.length = 0
   }

   static highlightControlHTML /*: html */ =
      `<style>
          #subset-page {
              -webkit-user-select: none;
              -webkit-tap-highlight-color: transparent;
              background-color: white;
              white-space: nowrap;
              touch-action: pan-y;
              min-width: 100%;
              font-size: 1em;
          }
          #subset-page li:not(:has(> ul)):hover,
          #subset-page li:has(> ul.hidden):hover {
              background-color: unset;
          }
          #subset-page .menu-label {
             font-size: 1.25em;
             margin-bottom: 0.2em;
             display: inline-block;
          }
          #subset-page .placeholder:after {
             font-style: italic;
             content: "(None)";
          }
          #subset-page ul {
             padding-inline-start: 0.5em;
             display: flex;
             flex-direction: column;
             margin-top: 0;
          }
          #subset-page ul > li {
             flex: 1 1 1.5em;  /* make li at least 1.5em, about the height of a superscript */
          }
          #subset-page .menu-label:hover,
          #subset-page .placeholder:hover,
          #subset-page li:hover > details > summary {
             background-color: #FFB886;   /* orange-tan (~light salmon) */
          }
          #subset-page li > details > *:not(summary) {
             white-space: normal;
             padding-left: 1.5em;
          }
          #subset-page .normal-group {
             color: blue;
          }
          #subset-page .highlight-mark summary {
             background-color: yellow;
          }
       </style>
       <div id="subset-page" class="box stack-08em fill-v scrollable">
          <details open id="subgroups">
             <summary><span class="menu-label" data-action2="this.#showHeaderMenu(event)"
                >Subgroups</span>
             </summary>
             <ul></ul>
          </details>

          <details open id="subsets">
             <summary><span class="menu-label" data-action2="this.#showHeaderMenu(event)"
                >User-defined subsets</span>
             </summary>
             <ul>
                <li class="placeholder" data-action="this.#showHeaderMenu(event)"
                   data-action2="this.#showHeaderMenu(event)"></li>
             </ul>
          </details>

          <details open id="partitions">
             <summary><span class="menu-label" data-action2="this.#showHeaderMenu(event)"
                >Partitions</span>
             </summary>
             <ul>
                <li class="placeholder" data-action="this.#showHeaderMenu(event)"
                   data-action2="this.#showHeaderMenu(event)"></li>
             </ul>
          </details>
       </div>`
 }
/*
```
## DisplayItemView
```js
 */
class DisplayItemView {
   item          /*: DisplayItem */
   view          /*: View */
   viewModel     /*: ViewModel */
   htmlElement   /*: ?HTMLElement */           // Subgroop, Subset, Partition items
   partitionViews /*: Array<DisplayItemView> */ // PartitioningScheme items
   schemeView    /*: ?DisplayItemView */        // Partition items: back-reference to parent scheme view

   constructor (item /*: DisplayItem */, view /*: View */, schemeView /*: ?DisplayItemView */ = null) {
      this.item = item
      this.view = view
      this.viewModel = view.viewModel
      this.schemeView = schemeView
      view.itemMap[item.id] = this

      if (item instanceof PartitioningScheme) {
         this.#buildScheme()
      } else if (item.kind === 'Subgroop' || item.kind === 'Subset') {
         this.htmlElement = GEUtils.generateElements(this.displayLine)[0]
         this.#appendToSection()
      }
      // Partition items: htmlElement and DOM insertion handled by #mountPartition, called from schemeView
   }

   get id ()          /*: number */      { return this.item.id }
   get rootElement () /*: HTMLElement */ { return this.view.rootElement }
   get elements ()    /*: BitSet */      { return this.item.elements }

   // ---- name ----------------------------------------------------------------

   get name () /*: html */ {
      const item = this.item
      let name = ''
      switch (item.kind) {
      case 'Subgroop':       name = `<i>H</i><sub>${item.subgroupIndex}</sub>`;   break
      case 'Subset':         name = `<i>S</i><sub>${item.subsetIndex}</sub>`;     break
      case 'ConjugacyClass': name = `<i>CC</i><sub>${item.subIndex}</sub>`;       break
      case 'OrderClass':     name = `<i>OC</i><sub>${item.subIndex}</sub>`;       break
      case 'Coset': {
         const rep = this.viewModel.group.representation[item.elements.first()]
         const subgroopName = this.view.itemMap[item.partitioningScheme.subgroop.id].name
         name = item.partitioningScheme.isLeft ? rep + subgroopName : subgroopName + rep
         break
      }
      case 'ConjugacyClasses':
      case 'OrderClasses':
      case 'Cosets':
         name = `{ ${this.partitionViews[0].name} ... ${this.partitionViews.at(-1).name} }`
         break
      default: throw new Error(`DisplayItemView.name: unknown kind '${item.kind}'`)
      }
      return name
   }

   // ---- displayLine ---------------------------------------------------------

   get displayLine () /*: html */ {
      let displayLine = ''   // PartitioningScheme kinds have no line of their own; children have lines
      switch (this.item.kind) {
      case 'Subgroop':         displayLine = this.#subgroopDisplayLine();         break
      case 'Subset':           displayLine = this.#subsetDisplayLine();           break
      case 'ConjugacyClass':   displayLine = this.#conjugacyClassDisplayLine();   break
      case 'OrderClass':       displayLine = this.#orderClassDisplayLine();       break
      case 'Coset':            displayLine = this.#cosetDisplayLine();            break
      case 'ConjugacyClasses':
      case 'OrderClasses':
      case 'Cosets':                                                               break
      default: throw new Error(`DisplayItemView.displayLine: unknown kind '${this.item.kind}'`)
      }
      return displayLine
   }

   // ---- menu ----------------------------------------------------------------

   get menu () /*: html */ {
      let menu = ''
      switch (this.item.kind) {
      case 'Subgroop':         menu = this.#subgroopMenu();    break
      case 'Subset':           menu = this.#subsetMenu();      break
      case 'ConjugacyClass':
      case 'OrderClass':
      case 'Coset':            menu = this.#partitionMenu();   break
      case 'ConjugacyClasses':
      case 'OrderClasses':
      case 'Cosets':                                           break
      default: throw new Error(`DisplayItemView.menu: unknown kind '${this.item.kind}'`)
      }
      return menu
   }

   // ---- lifecycle -----------------------------------------------------------

   destroy () {
      if (this.item instanceof PartitioningScheme) {
         this.partitionViews.forEach((pv) => pv.destroy())
         if (this.rootElement.querySelectorAll('#partitions li').length == 1) {
            this.rootElement.querySelectorAll('#partitions .placeholder').forEach((el) => el.style.display = '')
         }
      } else if (this.item.kind === 'Subset') {
         if (this.htmlElement.parentElement.querySelectorAll('li').length == 2) {
            this.htmlElement.parentElement.querySelectorAll('li.placeholder')
               .forEach((el) => el.style.display = '')
         }
         this.htmlElement.remove()
      } else {
         this.htmlElement?.remove()
      }
   }

   highlight () {
      if (this.item instanceof PartitioningScheme) {
         this.partitionViews.forEach((pv) => pv.highlight())
      } else {
         this.htmlElement?.classList.add('highlight-mark')
      }
   }

   // ---- helpers shared by displayLine / menu --------------------------------

   get clickAction () /*: html */ {
      return `data-action="event.preventDefault(); this.viewModel.toggleColorHighlight(${this.id})"`
   }

   get contextAction () /*: html */ {
      return `data-action2="this.showItemMenu(event, ${this.id})"`
   }

   get info () /*: html */ {
      const baseInfo = (() => {
         const subsetElements = this.elements.toArray().map((el) => this.viewModel.group.representation[el])
         const subsetElementList = subsetElements.join(', <wbr>')
         return `<div>The elements of ${this.name} are:
            <div style="white-space: nowrap; max-width: 25em; padding-left: 1em">${subsetElementList}</div>
         </div>`
      })()

      if (this.item.kind === 'Subgroop') {
         const subgroup = this.viewModel.group.subgroups[this.item.subgroupIndex]
         let subgroopInfo = `<div>${this.name} is a ${subgroup.isNormal ? 'normal' : ''} subgroup of ${this.viewModel.group.name}`
         if (subgroup.isomorphicGroup == null) {
            subgroopInfo += `; it is not isomorphic any group in GE3`
         } else {
            subgroopInfo += `, isomorphic to <a href="./GroupInfo.html?groupURL=${subgroup.isomorphicGroup.URL}" target="_blank">${subgroup.isomorphicGroup.name}</a>`
         }
         subgroopInfo += '</div>'
         if (subgroup.isNormal) {
            subgroopInfo += `<div>The quotient group ${this.viewModel.group.name}/${this.name} is`
            if (subgroup.isomorphicQuotientGroup == null) {
               subgroopInfo += ` not isomorphic to any group in GE3`
            } else {
               subgroopInfo += ` isomorphic to <a href="./GroupInfo.html?groupURL=${subgroup.isomorphicQuotientGroup.URL}">${subgroup.isomorphicQuotientGroup.name}</a>`
            }
            subgroopInfo += '</div>'
         }
         return subgroopInfo + baseInfo
      }

      if (this.item.kind === 'Subset') {
         const subgroop = this.viewModel.displayItems
            .filter((el) => el instanceof Subgroop)
            .find((subgroop) => this.viewModel.group.subgroups[subgroop.subgroupIndex].members.equals(this.elements))
         if (subgroop == null) {
            return baseInfo
         } else {
            const subgroopView = this.view.itemMap[subgroop.id]
            return `<div>${this.name} is identical to ${subgroopView.name}</div>` + subgroopView.info
         }
      }

      return baseInfo  // ConjugacyClass, OrderClass, Coset
   }

   get closureExplanation () /*: html */ {
      return `It is the closure of ${this.name}, ⟨ ${this.name} ⟩. This means that it
         is the smallest subgroup of ${this.viewModel.group.name} which contains ${this.name}.`
   }

   get normalizerExplanation () /*: html */ {
      return `It is the normalizer of ${this.name}, Norm(${this.name}). This means that it
         is the largest subgroup of ${this.viewModel.group.name} in which ${this.name} is normal.`
   }

   unionExplanation (otherView /*: DisplayItemView */) /*: html */ {
      return `It is the union of ${this.name} with ${otherView.name}.`
   }

   intersectionExplanation (otherView /*: DisplayItemView */) /*: html */ {
      return `It is the intersection of ${this.name} with ${otherView.name}.`
   }

   elementwiseProductExplanation (otherView /*: DisplayItemView */) /*: html */ {
      return `It is the elementwise product of ${this.name} with ${otherView.name}. This means that it
         is the set of all elements <i>ab</i> in ${this.viewModel.group.name}, with <i>a</i> from ${this.name}
         and b from ${otherView.name}. Note that the elementwise product operation is not
         necessarily commutative.`
   }

   get elementRepresentations () /*: Array<html> */ {
      const result = []
      for (let i = 0; i < this.elements.len && result.length < 3; i++) {
         if (this.elements.isSet(i)) {
            result.push(this.viewModel.group.representation[i])
         }
      }
      if (this.elements.popcount() > 3) {
         result.push('...')
      }
      return result
   }

   get elementString () /*: string */ { return '[' + this.elements.toString() + ']' }

   // ---- private: constructor helpers ----------------------------------------

   #buildScheme () {
      // All PartitioningScheme subclasses build partition views the same way
      this.partitionViews = this.item.partitions.map((partition) => new DisplayItemView(partition, this.view, this))
      this.rootElement.querySelectorAll('#partitions .placeholder').forEach((el) => el.style.display = 'none')
      this.partitionViews.forEach((pv) => pv.#mountPartition())
   }

   #appendToSection () {
      if (this.item.kind === 'Subgroop') {
         this.rootElement.querySelector('#subgroups ul').append(this.htmlElement)
         this.htmlElement.querySelector('details').addEventListener('toggle', (event) => {
            event.target.insertAdjacentHTML('beforeend', this.info)
         }, {once: true})
      } else if (this.item.kind === 'Subset') {
         this.rootElement.querySelector('#subsets ul')?.append(this.htmlElement)
         this.rootElement.querySelectorAll('#subsets li.placeholder').forEach((el) => el.style.display = 'none')
      }
   }

   #mountPartition () {
      this.htmlElement = GEUtils.generateElements(this.displayLine)[0]
      this.rootElement.querySelector('#partitions ul').append(this.htmlElement)
   }

   // ---- private: displayLine implementations --------------------------------

   #subgroopDisplayLine () /*: html */ {
      const item = this.item
      const generators = this.viewModel.group.subgroups[item.subgroupIndex].generators.toArray()
                            .map((el) => this.viewModel.group.representation[el])
      switch (item.subgroupIndex) {
      case 0:
         return `<li id="${this.id}">
               <details subgroup="${this.id}"><summary><span class="normal-group" ${this.clickAction} ${this.contextAction}>
                   ${this.name} = ⟨ ${generators[0]} ⟩ is the trivial subgroup { ${generators[0]} }.
               </span></summary></details>
            </li>`
      case this.viewModel.group.subgroups.length - 1:
         return `<li id="${this.id}">
               <details subgroup="${this.id}"><summary><span class="normal-group" ${this.clickAction} ${this.contextAction}>
                   ${this.name} = ⟨ ${generators.join(', <wbr>')} ⟩ is the group itself.
               </span></summary></details>
            </li>`
      default: {
         const isNormal = this.viewModel.group.subgroups[item.subgroupIndex].isNormal
         return `<li id="${this.id}">
               <details subgroup="${this.id}"><summary><span ${isNormal ? 'class="normal-group"' : ''} ${this.clickAction} ${this.contextAction}>
                  ${this.name} = ⟨ ${generators.join(', <wbr>')} ⟩ is a subgroup of order ${this.viewModel.group.subgroups[item.subgroupIndex].order}.
               </span></summary></details>
            </li>`
      }
      }
   }

   #subsetDisplayLine () /*: html */ {
      const numElements = this.elements.popcount()
      const elements = this.elements.toArray().slice(0, 3).map((el) => this.viewModel.group.representation[el])
      if (numElements > 3) elements.push('...')
      return `<li id="${this.id}">
            <details><summary><span ${this.clickAction} ${this.contextAction}>
               ${this.name} = { ${elements.join(', <wbr>')} } is
                  ${numElements == 0 || numElements == this.viewModel.group.order ? 'the' : 'a'} subset of size ${numElements}.
            </span></summary>${this.info}</details>
         </li>`
   }

   #conjugacyClassDisplayLine () /*: html */ {
      return `<li id="${this.id}" class="conjugacyClass">
            <details><summary><span ${this.clickAction} ${this.contextAction}>
               ${this.name} = <wbr>{ ${this.elementRepresentations.join(', <wbr>')} } is a conjugacy class of size ${this.elements.popcount()}.
            </span></summary>${this.info}</details>
         </li>`
   }

   #orderClassDisplayLine () /*: html */ {
      return `<li id="${this.id}" class="orderClass">
            <details><summary><span ${this.clickAction} ${this.contextAction}>
               ${this.name} = <wbr>{ ${this.elementRepresentations.join(', <wbr>')} } is an order class of size ${this.elements.popcount()}.
            </span></summary>${this.info}</details>
         </li>`
   }

   #cosetDisplayLine () /*: html */ {
      const cosets = this.item.partitioningScheme
      return `<li id="${this.id}" class="${cosets.side}coset${cosets.subgroop.id}">
            <details><summary><span ${this.clickAction} ${this.contextAction}>
               ${this.name} = <wbr>{ ${this.elementRepresentations.join(', <wbr>')} } is the
               ${cosets.isLeft ? 'left' : 'right'} coset of ${this.view.itemMap[cosets.subgroop.id].name} by
               ${this.viewModel.group.representation[this.elements.toArray()[0]]}.
            </span></summary>${this.info}</details>
         </li>`
   }

   // ---- private: menu implementations ---------------------------------------

   #subgroopMenu () /*: html */ {
      return `
         <ul id="subgroup-menu">
            <li data-action="this.makeSubsetEditor()">Create ${this.view.nextSubsetName()}</li>
            <hr>
            <li class="inline-submenu">Compute
               <ul id="compute-menu">
                  ${this.viewModel.canShowConjugacyClasses() ? this.view.allConjugacyClassesHTML() : ''}
                  ${this.viewModel.canShowOrderClasses() ? this.view.allOrderClassesHTML() : ''}
                  <li data-action="this.viewModel.createDerivedSubset('normalizer', ${this.id})"
                     >the normalizer of ${this.name}, Norm(${this.name})</li>
                  ${this.viewModel.canShowCosets(this.id, 'left')
                     ? `<li data-action="this.viewModel.createCosets(${this.id},'left')"
                           >all left cosets <i>g</i>${this.name} of ${this.name}</li>`
                     : ''}
                  ${this.viewModel.canShowCosets(this.id, 'right')
                     ? `<li data-action="this.viewModel.createCosets(${this.id},'right')"
                           >all right cosets ${this.name}<i>g</i> of ${this.name}</li>`
                     : ''}
                  <li class="detached-submenu">an intersection
                     <ul id="intersection-menu">
                        ${this.view.makeLongList(this, this.view.intersectionItemHTML)}
                     </ul>
                  </li>
                  <li class="detached-submenu">a union
                     <ul id="union-menu">
                        ${this.view.makeLongList(this, this.view.unionItemHTML)}
                     </ul>
                  </li>
                  <li class="detached-submenu">an elementwise product
                     <ul id="elementwise-product-menu">
                        ${this.view.makeLongList(this, this.view.elementwiseProductItemHTML)}
                     </ul>
                  </li>
               </ul>
            </li>
            <li class="inline-submenu">Highlight item
               ${this.view.highlightItemHTML(this)}
            </li>
            <li data-action="this.viewModel.clearAllHighlights()">Clear all highlighting</li>
         </ul>`
   }

   #subsetMenu () /*: html */ {
      return `
         <ul id="subset-menu">
            <li data-action="this.makeSubsetEditor(${this.id})">Edit list of elements in ${this.name}</li>
            <li data-action="this.viewModel.destroyItem(${this.id})">Delete ${this.name}</li>
            <li data-action="this.makeSubsetEditor()">Create ${this.view.nextSubsetName()}</li>
            <hr>
            <li class="inline-submenu">Compute
               <ul id="compute-menu">
                  ${this.viewModel.canShowConjugacyClasses() ? this.view.allConjugacyClassesHTML() : ''}
                  ${this.viewModel.canShowOrderClasses() ? this.view.allOrderClassesHTML() : ''}
                  <li data-action="this.viewModel.createDerivedSubset('closure', ${this.id})"
                     >the closure of ${this.name}, ⟨ ${this.name} ⟩</li>
                  <li class="detached-submenu">an intersection
                     <ul id="intersection-menu">
                        ${this.view.makeLongList(this, this.view.intersectionItemHTML)}
                     </ul>
                  </li>
                  <li class="detached-submenu">a union
                     <ul id="union-menu">
                        ${this.view.makeLongList(this, this.view.unionItemHTML)}
                     </ul>
                  </li>
                  <li class="detached-submenu">an elementwise product
                     <ul id="elementwise-product-menu">
                        ${this.view.makeLongList(this, this.view.elementwiseProductItemHTML)}
                     </ul>
                  </li>
               </ul>
            </li>
            <li class="inline-submenu">Highlight item
               ${this.view.highlightItemHTML(this)}
            </li>
            <li data-action="this.viewModel.clearAllHighlights()">Clear all highlighting</li>
         </ul>`
   }

   #partitionMenu () /*: html */ {
      return `
         <ul id="partition-menu">
            <li data-action="this.viewModel.destroyItem(${this.schemeView.id})"
               >Delete partition ${this.schemeView.name}</li>
            <li data-action="this.makeSubsetEditor()">Create ${this.view.nextSubsetName()}</li>
            <hr>
            <li class="inline-submenu">Compute
               <ul id="compute-menu">
                  ${this.viewModel.canShowConjugacyClasses() ? this.view.allConjugacyClassesHTML() : ''}
                  ${this.viewModel.canShowOrderClasses() ? this.view.allOrderClassesHTML() : ''}
                  <li data-action="this.viewModel.createDerivedSubset('closure', ${this.id})"
                     >the closure of ${this.name}, ⟨ ${this.name} ⟩</li>
                  <li class="detached-submenu">an intersection
                     <ul id="intersection-menu">
                        ${this.view.makeLongList(this, this.view.intersectionItemHTML)}
                     </ul>
                  </li>
                  <li class="detached-submenu">a union
                     <ul id="union-menu">
                        ${this.view.makeLongList(this, this.view.unionItemHTML)}
                     </ul>
                  </li>
                  <li class="detached-submenu">an elementwise product
                     <ul id="elementwise-product-menu">
                        ${this.view.makeLongList(this, this.view.elementwiseProductItemHTML)}
                     </ul>
                  </li>
               </ul>
            </li>
            <li class="inline-submenu">Highlight item
               ${this.view.highlightItemHTML(this)}
            </li>
            <li class="inline-submenu">Highlight partition
               ${this.view.highlightItemHTML(this.schemeView)}
            </li>
            <li data-action="this.viewModel.clearAllHighlights()">Clear all highlighting</li>
         </ul>`
   }
}

/*
```
## SubsetEditor

```js
 */
class SubsetEditor {
   editorDialog /*: HTMLElement */
   viewModel /*: ViewModel */

   constructor (viewModel /*: ViewModel */, setName /*: html */, setElements /*: BitSet */) {
      this.viewModel = viewModel

      const subset = []
      const complement = []
      for (const el of viewModel.group.elements) {
         const listElement =
            `<li data-element="${el}" data-action="this.swapElement(${el})">${viewModel.group.representation[el]}</li>`
         if (setElements.isSet(el))
            subset.push(listElement)
         else
            complement.push(listElement)
      }
      const subsetList = subset.join('')
      const complementList = complement.join('')

      const subsetEditorHTML =
         `<div id="subset-editor" class="flex-v">
             <div id="subset-editor-title" class="centered">Edit subset ${setName}</div>
             <div id="subset-editor-body" class="flex-v stretch">
                <div id="subset-editor-info"
                   >Move elements of ${setName} from one column to the other by clicking/tapping them.</div>
                <div class="flex-h stretch">
                   <div id="subset-editor-subset" class="subset flex-v">
                      <div class="centered">Elements in ${setName}</div>
                      <ul id="subset-elements" class="elements stretch scrollable">${subsetList}</ul>
                      <button id="cancel-button" data-action="this.close()">Cancel</button>
                   </div>
                   <div id="subset-editor-complement" class="subset flex-v stretch">
                      <div class="centered">Elements not in ${setName}</div>
                      <ul id="complement-elements" class="elements stretch scrollable">${complementList}</ul>
                      <button id="ok-button" data-action="this.accept()">OK</button>
                   </div>
                </div>
             </div>
             <style>
                #subset-editor {
                   min-width: 35em;
                   min-height: 20em;
                   padding: 0;
                   overflow-x: hidden;
                }
                #subset-editor-body {
                   padding: 0.3ch;
                }
                #subset-editor-info {
                   line-height: 1;
                   white-space: normal;
                   margin-top: 0.5em;
                }
                #subset-editor .centered {
                   text-align: center;
                }
                #subset-editor-title {
                   font-size: 1.5rem;
                   padding-top: 0.15em;  /* Title doesn't have any descenders so it looks off-center */
                   background-color: var(--dialog-header-background);
                }
                #subset-editor ul {
                   height: 0;  /* otherwise element gets sized to max-content on first display */
                   background-color: var(--gray0);
                   border: var(--dark-border);
                   list-style: none;
                   margin-block-end: 0;
                   margin-block-start: 0;
                   overflow: hidden auto;
                   padding-inline-start: 0.5ch;
                   white-space: nowrap;
                   position: unset;
                   width: unset;
                   resize: unset;
                }
                #subset-editor .subset {
                   width: 50%;
                   margin: 0 0.2ch;
                }
                #subset-editor button {
                   width: 8ch;
                   margin: 0.2em auto;
                }
             </style>
          </div>`

      this.editorDialog = makeDialog(subsetEditorHTML, {clientX: 0, clientY: 0})

      // Center grid
      const subsetEditor = document.getElementById('subset-editor')
      subsetEditor.style.left =
         `${Math.max(0.1 * window.innerWidth, 0.5 * (window.innerWidth - subsetEditor.offsetWidth))}px`
      subsetEditor.style.top =
         `${Math.max(0.1 * window.innerHeight, 0.2 * (window.innerHeight - subsetEditor.offsetHeight))}px`

      // register action handler
      GEUtils.createActionHandler(this.editorDialog,
         (action) => {
            Log.debug(`SubsetEditor.constructor executing ${action}`)
            eval(action)
         })
   }

   close () {
      this.editorDialog.remove()
   }

   async accept () {
      const subsetElementArray = Array
         .from(this.editorDialog.querySelectorAll('#subset-elements > li'))
         .map((el) => parseInt(el.getAttribute('data-element')))
      const subsetElements = new BitSet(this.viewModel.group.order, subsetElementArray)

      const explanation = 'The elements were chosen in the Subset Editor.'

      const confirmedSubset = await this.viewModel.createAndConfirmSubset(subsetElements, explanation)

      if (confirmedSubset != null) {
         this.close()
      }
   }

   swapElement (elementNumber /*: number */) {
      // find list containing this element, either elements in list or elements not in list
      const selectedListElement = this.editorDialog.querySelector(`[data-element="${elementNumber}"]`)
      const containingList = selectedListElement?.closest('ul[id]')
      const destinationList = (containingList?.getAttribute('id') == 'subset-elements')
         ? this.editorDialog.querySelector('#complement-elements')
         : (containingList?.getAttribute('id') == 'complement-elements')
            ? this.editorDialog.querySelector('#subset-elements')
            : null
      if (selectedListElement == null || destinationList == null) {
         return
      }
      // move element to sorted location in destination list
      const toListElements = Array
         .from(destinationList.querySelectorAll('li'))
         .map((el) => parseInt(el.getAttribute('data-element')))
      if (   toListElements.length == 0
          || toListElements[toListElements.length - 1] < elementNumber
      ) {
         destinationList.append(selectedListElement)
      } else { // find first element larger than element number and insert selected list element before it
         const inx = toListElements.findIndex((el) => el > elementNumber)
         destinationList.children[inx].insertAdjacentElement('beforebegin', selectedListElement)
      }
   }
}

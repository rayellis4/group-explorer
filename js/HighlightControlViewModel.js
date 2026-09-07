/*
# HighlightControlViewModel - ViewModel for Subset and Highlighting

HighlightControlViewModel implements the ViewModel layer of HighlightControl's MVVM pattern.
It manages display item state (subgroups, user subsets, partitions), highlight computation,
and serialization for Sheet ↔ Editor navigation.

```js
 */
import { BitSet } from './BitSet.js';
import * as GEUtils from './GEUtils.js';
import * as Log from './Log.js';
import { SubgroupLattice } from './SubgroupLattice.js';
import * as THREE from '../lib/externals.js';
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
export class HighlightControlViewModel {
    _model;
    _view;
    nextId = 0;
    nextSubsetIndex = 0;
    highlightedItems = [null, null, null];
    displayMap = new Map();
    constructor(model) {
        this._model = model;
        model.$subscribe(this, 'highlightColors');
        if (model.highlightControl == null) {
            // initialize displayMap with model.group's subgroups
            this.group.subgroups.forEach((_H, inx) => {
                const newSubgroop = new Subgroop(this, inx);
                newSubgroop.id = this.nextId++;
                this.displayMap.set(newSubgroop.id, newSubgroop);
            });
            // If model.highlightColors is set, determine which subgroups are highlighted
            // (For now, only consider highlights of a single color that highlight a subgroup:
            // this covers editing an element of a subgroup lattice display, for example.)
            // ToDo: recognize other highlight patterns (conjugacy classes, cosets)
            if (model.highlightColors.some((colors) => colors.some((item) => item != null))) {
                model.highlightColors.forEach((highlightColors, inx) => {
                    const oneColor = highlightColors.find((color) => color != null && color != '');
                    if (highlightColors.every((color) => color == oneColor || color == null || color == '')) {
                        const highlightedElements = new BitSet(this.group.order);
                        highlightColors.forEach((color, inx) => {
                            if (color == oneColor) {
                                highlightedElements.set(inx);
                            }
                        });
                        const subgroupIndex = this.group.subgroups.findIndex((H) => highlightedElements.equals(H.members));
                        const highlightedItem = Array.from(this.displayMap)
                            .find(([_inx, subgroop]) => 'subgroupIndex' in subgroop && subgroop.subgroupIndex == subgroupIndex)?.[1];
                        this.highlightedItems[inx] = highlightedItem;
                    }
                });
            }
            this.fromJSON(this.toJSON());
        }
        else {
            if (GEUtils.isSerializable(model.highlightControl)) {
                this.fromJSON(model.highlightControl.toJSON());
            }
            else {
                this.fromJSON(model.highlightControl);
            }
        }
        model.highlightControl = this;
    }
    get group() {
        return this.model.group;
    }
    get highlightColors() {
        return this.model.highlightColors;
    }
    get highlightTypes() {
        return this.model.highlightConfiguration.highlightTypes;
    }
    get view() {
        return this._view; // this could also add it to an Array or Map
    }
    set view(view) {
        this._view = view;
        Array.from(this.displayMap.values())
            .filter((item) => item instanceof Subgroop || item instanceof Subset || item instanceof PartitioningScheme)
            .forEach((item) => view.addElement(item));
        if (this.highlightedItems[0] != null) {
            this.highlightItem(this.highlightedItems[0].id, 0);
        }
    }
    get model() {
        return this._model;
    }
    toJSON() {
        const highlightControlJSON = {
            next_id: this.nextId,
            next_subset_index: this.nextSubsetIndex,
            highlighted_items: this.highlightedItems?.map((item) => item?.id) ?? [],
            display_map: Array.from(this.displayMap.values()).map((item) => item.toJSON())
        };
        return highlightControlJSON;
    }
    fromJSON(jsonObject) {
        const classMap = {
            Subgroop: Subgroop,
            Subset: Subset,
            ConjugacyClass: ConjugacyClass,
            OrderClass: OrderClass,
            Coset: Coset,
            ConjugacyClasses: ConjugacyClasses,
            OrderClasses: OrderClasses,
            Cosets: Cosets
        };
        this.nextId = jsonObject.next_id;
        this.nextSubsetIndex = jsonObject.next_subset_index;
        this.displayMap.clear();
        jsonObject.display_map.forEach((displayItemJSON) => {
            const displayItem = new (classMap[displayItemJSON.class_name])(this).fromJSON(displayItemJSON);
            this.displayMap.set(displayItemJSON.id, displayItem);
        });
        this.highlightedItems = jsonObject.highlighted_items.map((item) => item ? this.displayMap.get(item) : null);
        if (this.view != null) {
            this.view.clearAll();
            this.view = this.view; // triggers download of all displayItems to this.view
        }
    }
    /**
    ```
    ### Create / Destroy display items
    ```js
     */
    createItem(item) {
        item.id = this.nextId++;
        this.displayMap.set(item.id, item);
        if (item instanceof Subset) {
            item.subsetIndex = this.nextSubsetIndex++;
        }
        else if (item instanceof PartitioningScheme) {
            item.partitions.forEach((partition) => {
                partition.id = this.nextId++;
                this.displayMap.set(partition.id, partition);
            });
        }
        this.triggerModelUpdate();
        this.view?.addElement(item);
        return item;
    }
    matchingSubsets(elements) {
        const matchingSubsets = Array.from(this.displayMap.values())
            .filter((displayItem) => displayItem instanceof Subgroop || displayItem instanceof Subset)
            .filter((displayItem) => elements.equals(displayItem.elements));
        return matchingSubsets;
    }
    async createAndConfirmSubset(elements, explanation) {
        const matchingSubsets = this.matchingSubsets(elements);
        let result;
        if (matchingSubsets.length == 0) {
            result = this.createSubset(elements);
        }
        else {
            const confirmation = await this.view.confirmSubsetSave(matchingSubsets, explanation);
            result = confirmation ? this.createSubset(elements) : null;
        }
        return result;
    }
    createSubset(elements) {
        return this.createItem(new Subset(this, elements));
    }
    createConjugacyClasses() {
        this.createItem(new ConjugacyClasses(this));
    }
    createOrderClasses() {
        this.createItem(new OrderClasses(this));
    }
    createCosets(subgroopId, side) {
        const subgroop = this.displayMap.get(subgroopId);
        if (subgroop instanceof Subgroop) {
            this.createItem(new Cosets(this, subgroop, side));
        }
    }
    createDerivedSubset(type, subsetId, subset2Id) {
        const subset = this.displayMap.get(subsetId);
        const subset2 = this.displayMap.get(subset2Id);
        if (subset instanceof AbstractSubset && (subset2 == null || subset2 instanceof AbstractSubset)) {
            const derivedSubset = (subset2 != null)
                ? subset[type](subset2)
                : (type == 'normalizer' && 'normalizer' in subset)
                    ? subset.normalizer
                    : subset.closure;
            const matchingSubsets = this.matchingSubsets(derivedSubset);
            if (matchingSubsets.length == 0) {
                this.createSubset(derivedSubset);
            }
            else {
                this.view.confirmSubsetSave(matchingSubsets, null, type, subset, subset2)
                    .then((confirmation) => confirmation && this.createSubset(derivedSubset));
            }
        }
    }
    destroyItem(itemId) {
        const clearItemHighlight = (item) => {
            this.highlightedItems = this.highlightedItems.map((highlightedItem) => {
                return (highlightedItem == item) ? null : highlightedItem;
            });
        };
        const item = this.displayMap.get(itemId);
        if (item != null) {
            if (item instanceof PartitioningScheme) {
                item.partitions.forEach((partition) => {
                    this.view.removeElement(partition);
                    this.displayMap.delete(partition.id);
                    clearItemHighlight(partition);
                });
            }
            clearItemHighlight(item);
            this.view.removeElement(item);
            this.displayMap.delete(itemId);
            this.updateHighlightColors();
        }
    }
    /**
    ```
    ### Manage display item highlighting
    ```js
     */
    updateHighlightColors() {
        const highlightColors = this.highlightedItems.map((item, inx) => {
            let highlight = [];
            if (item == null) {
                return highlight;
            }
            const s = this.model.highlightConfiguration.saturation[inx];
            const l = this.model.highlightConfiguration.lightness[inx];
            const offset = this.model.highlightConfiguration.hueOffset[inx];
            if (item instanceof PartitioningScheme) {
                item.partitions.forEach((partition, jnx) => {
                    const h = jnx / item.partitions.length;
                    const color = '#' + new THREE.Color(GEUtils.fromRainbow(h, s, l, offset)).getHexString();
                    partition.elements.toArray().forEach((element) => highlight[element] = color);
                });
            }
            else if (item instanceof AbstractSubset) {
                const h = 0;
                const color = '#' + new THREE.Color(GEUtils.fromRainbow(h, s, l, offset)).getHexString();
                item.elements.toArray().forEach((element) => highlight[element] = color);
            }
            return highlight;
        });
        this.view?.updateHighlightMark();
        this.updateModel('highlightColors', highlightColors);
    }
    highlightItem(itemId, highlightTypeIndex) {
        const item = this.displayMap.get(itemId);
        this.highlightedItems[highlightTypeIndex] = item;
        this.updateHighlightColors();
    }
    toggleColorHighlight(itemId) {
        const item = this.displayMap.get(itemId);
        this.highlightedItems[0] = (this.highlightedItems[0] == item) ? null : item;
        this.updateHighlightColors();
    }
    clearAllHighlightColors() {
        this.highlightedItems = [null, null, null];
        this.updateHighlightColors();
    }
    /**
 ```
 ### Predicates for displaying various partitioning schemes
 ```js
  */
    canShowConjugacyClasses() {
        return Array.from(this.displayMap.values()).find((item) => item instanceof ConjugacyClasses) == null;
    }
    canShowOrderClasses() {
        return Array.from(this.displayMap.values()).find((item) => item instanceof OrderClasses) == null;
    }
    canShowCosets(subgroopId, side) {
        return Array.from(this.displayMap.values())
            .find((item) => item instanceof Cosets && item.subgroop.id == subgroopId && item.side == side) == null;
    }
    /**
    ```
    ### Receiving and pushing updates to/from this.#model
    ```js
     */
    updateModel(field, value) {
        switch (field) {
            case 'highlightColors':
                this.model['highlightColors'] = value;
                break;
        }
    }
    // notify highlightControl subscribers (e.g. SheetEditor broadcast) that structural state changed
    triggerModelUpdate() {
        this._model.$touch('highlightControl');
    }
    update(field, _value) {
        switch (field) {
            case 'highlightColors':
                this.view?.updateHighlightMark();
                break;
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
    id;
    viewModel;
    className;
    constructor(viewModel) {
        this.viewModel = viewModel;
    }
    toJSON() {
        const jsonObject = {
            id: this.id,
            class_name: this.className
        };
        return jsonObject;
    }
    fromJSON(jsonObject) {
        this.id = jsonObject.id;
        return this;
    }
}
class AbstractSubset extends DisplayItem {
    elements;
    get closure() {
        return this.viewModel.group.closure(this.elements);
    }
    union(other) {
        return BitSet.union(this.elements, other.elements);
    }
    intersection(other) {
        return BitSet.intersection(this.elements, other.elements);
    }
    elementwiseProduct(other) {
        const elementwiseProductElements = new BitSet(this.viewModel.group.order);
        for (let i = 0; i < this.elements.len; i++) {
            if (this.elements.isSet(i)) {
                for (let j = 0; j < other.elements.len; j++) {
                    if (other.elements.isSet(j)) {
                        elementwiseProductElements.set(this.viewModel.group.multtable[i][j]);
                    }
                }
            }
        }
        return elementwiseProductElements;
    }
    toJSON() {
        const jsonObject = super.toJSON();
        jsonObject.elements = this.elements.toJSON();
        return jsonObject;
    }
    fromJSON(jsonObject) {
        super.fromJSON(jsonObject);
        this.elements = new BitSet().fromJSON(jsonObject.elements);
        return this;
    }
}
class Subgroop extends AbstractSubset {
    className = 'Subgroop';
    subgroupIndex;
    constructor(viewModel, subgroupIndex) {
        super(viewModel);
        this.subgroupIndex = subgroupIndex;
        this.elements = viewModel.group.subgroups[subgroupIndex]?.members;
    }
    get normalizer() {
        const normalizerElements = new SubgroupLattice(this.viewModel.group)
            .findNormalizer(this.viewModel.group.subgroups[this.subgroupIndex]).members;
        return normalizerElements;
    }
    get leftCosets() {
        return new Cosets(this.viewModel, this, 'left');
    }
    get rightCosets() {
        return new Cosets(this.viewModel, this, 'right');
    }
    toJSON() {
        const jsonObject = super.toJSON();
        jsonObject.subgroup_index = this.subgroupIndex;
        return jsonObject;
    }
    fromJSON(jsonObject) {
        super.fromJSON(jsonObject);
        this.subgroupIndex = jsonObject.subgroup_index;
        return this;
    }
}
class Subset extends AbstractSubset {
    className = 'Subset';
    subsetIndex;
    constructor(viewModel, elements) {
        super(viewModel);
        if (elements === undefined) {
            this.elements = new BitSet(viewModel.group.order);
        }
        else if (elements instanceof BitSet) {
            this.elements = elements;
        }
        else if (Array.isArray(elements)) {
            this.elements = new BitSet(viewModel.group.order, elements);
        }
        else {
            Log.err(`invalid argument ${elements} passed to HighlightControl.Subset constructor`);
        }
    }
    toJSON() {
        const jsonObject = super.toJSON();
        jsonObject.subset_index = this.subsetIndex;
        return jsonObject;
    }
    fromJSON(jsonObject) {
        super.fromJSON(jsonObject);
        this.subsetIndex = jsonObject.subset_index;
        return this;
    }
}
class Partition extends AbstractSubset {
    partitioningScheme;
    subIndex;
    constructor(viewModel, partitioningScheme, subIndex, elements) {
        super(viewModel);
        this.partitioningScheme = partitioningScheme;
        this.subIndex = subIndex;
        this.elements = elements;
    }
    toJSON() {
        const jsonObject = super.toJSON();
        jsonObject.partitioning_scheme = this.partitioningScheme.id;
        jsonObject.sub_index = this.subIndex;
        return jsonObject;
    }
    fromJSON(jsonObject) {
        super.fromJSON(jsonObject);
        this.subIndex = jsonObject.sub_index;
        this.partitioningScheme = Array.from(this.viewModel.displayMap.values())
            .find((item) => item.id == jsonObject.partitioning_scheme);
        this.partitioningScheme.partitions[jsonObject.sub_index] = this;
        return this;
    }
}
class ConjugacyClass extends Partition {
    className = 'ConjugacyClass';
}
class OrderClass extends Partition {
    className = 'OrderClass';
}
class Coset extends Partition {
    className = 'Coset';
}
class PartitioningScheme extends DisplayItem {
    partitions = [];
}
class ConjugacyClasses extends PartitioningScheme {
    className = 'ConjugacyClasses';
    constructor(viewModel) {
        super(viewModel);
        viewModel.group.conjugacyClasses
            .forEach((conjugacyClass, inx) => {
            const newConjugacyClass = new ConjugacyClass(viewModel, this, inx, conjugacyClass);
            this.partitions.push(newConjugacyClass);
        });
    }
}
class OrderClasses extends PartitioningScheme {
    className = 'OrderClasses';
    constructor(viewModel) {
        super(viewModel);
        viewModel.group.orderClasses
            .filter((orderClass) => orderClass.popcount() != 0)
            .forEach((orderClass, inx) => {
            const newOrderClass = new OrderClass(viewModel, this, inx, orderClass);
            this.partitions.push(newOrderClass);
        });
    }
}
class Cosets extends PartitioningScheme {
    className = 'Cosets';
    subgroop;
    side;
    constructor(viewModel, subgroop, side) {
        super(viewModel);
        this.subgroop = subgroop;
        this.side = side;
        if (subgroop != null) {
            const subgroup = viewModel.group.subgroups[subgroop.subgroupIndex];
            const cosets = (side == 'left') ? subgroup.leftCosets : subgroup.rightCosets;
            cosets.forEach((coset, inx) => {
                const newCoset = new Coset(viewModel, this, inx, coset);
                this.partitions.push(newCoset);
            });
        }
    }
    toJSON() {
        const jsonObject = super.toJSON();
        jsonObject.subgroop_id = this.subgroop.id;
        jsonObject.side = this.side;
        return jsonObject;
    }
    fromJSON(jsonObject) {
        super.fromJSON(jsonObject);
        this.subgroop = Array.from(this.viewModel.displayMap.values())
            .find((item) => item.id == jsonObject.subgroop_id);
        this.side = jsonObject.side;
        return this;
    }
}
//# sourceMappingURL=HighlightControlViewModel.js.map
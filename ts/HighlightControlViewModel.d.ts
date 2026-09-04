import { BitSet, BitSetJSON } from './BitSet.js';
import type { Group } from './Group.js';
import type { Updatable, SubscriptionProxy } from './GEUtils.js';
import type { HighlightControlView } from './HighlightControlView.js';
export type { DisplayItem, AbstractSubset, Subgroop, Subset, Partition, ConjugacyClass, OrderClass, Coset, PartitioningScheme, ConjugacyClasses, OrderClasses, Cosets };
export interface HighlightControlModelInterface {
    group: Group;
    highlightColors: Maybe<color>[][];
    highlightConfiguration: {
        highlightTypes: string[];
        saturation: number[];
        lightness: number[];
        hueOffset: number[];
    };
    highlightControl?: HighlightControlJSON | (object & Serializable<HighlightControlJSON>);
}
export type HighlightControlJSON = {
    next_id: number;
    next_subset_index: number;
    highlighted_items: Maybe<number>[];
    display_map: displayItemJSON[];
};
type sides = 'left' | 'right';
type displayItemJSON = {
    id: number;
    class_name: string;
    elements?: BitSetJSON;
    subgroup_index?: integer;
    subset_index?: integer;
    partitioning_scheme?: integer;
    sub_index?: integer;
    subgroop_id?: integer;
    side?: sides;
};
export declare class HighlightControlViewModel implements Updatable, Serializable<HighlightControlJSON> {
    private _model;
    private _view;
    nextId: number;
    nextSubsetIndex: number;
    highlightedItems: Maybe<DisplayItem>[];
    displayMap: Map<number, DisplayItem>;
    constructor(model: SubscriptionProxy<HighlightControlModelInterface>);
    get group(): Group;
    get highlightColors(): Maybe<color>[][];
    get highlightTypes(): string[];
    get view(): HighlightControlView;
    set view(view: HighlightControlView);
    get model(): HighlightControlModelInterface;
    toJSON(): HighlightControlJSON;
    fromJSON(jsonObject: HighlightControlJSON): void;
    /**
    ```
    ### Create / Destroy display items
    ```js
     */
    private createItem;
    private matchingSubsets;
    createAndConfirmSubset(elements: BitSet, explanation: html): Promise<Maybe<Subset>>;
    createSubset(elements: BitSet): Subset;
    createConjugacyClasses(): void;
    createOrderClasses(): void;
    createCosets(subgroopId: integer, side: sides): void;
    createDerivedSubset(type: 'closure' | 'normalizer' | 'intersection' | 'union' | 'elementwiseProduct', subsetId: integer, subset2Id: integer): void;
    destroyItem(itemId: integer): void;
    /**
    ```
    ### Manage display item highlighting
    ```js
     */
    private updateHighlightColors;
    highlightItem(itemId: integer, highlightTypeIndex: integer): void;
    toggleColorHighlight(itemId: integer): void;
    clearAllHighlightColors(): void;
    /**
 ```
 ### Predicates for displaying various partitioning schemes
 ```js
  */
    canShowConjugacyClasses(): boolean;
    canShowOrderClasses(): boolean;
    canShowCosets(subgroopId: number, side: sides): boolean;
    /**
    ```
    ### Receiving and pushing updates to/from this.#model
    ```js
     */
    updateModel(field: string, value: unknown): void;
    private triggerModelUpdate;
    update(field: string, _value: unknown): void;
}
declare class DisplayItem {
    id: number;
    viewModel: HighlightControlViewModel;
    className: string;
    constructor(viewModel: HighlightControlViewModel);
    toJSON(): displayItemJSON;
    fromJSON(jsonObject: displayItemJSON): this;
}
declare class AbstractSubset extends DisplayItem {
    elements: BitSet;
    get closure(): BitSet;
    union(other: AbstractSubset): BitSet;
    intersection(other: AbstractSubset): BitSet;
    elementwiseProduct(other: AbstractSubset): BitSet;
    toJSON(): displayItemJSON;
    fromJSON(jsonObject: displayItemJSON): this;
}
declare class Subgroop extends AbstractSubset {
    className: string;
    subgroupIndex: integer;
    constructor(viewModel: HighlightControlViewModel, subgroupIndex: number);
    get normalizer(): BitSet;
    get leftCosets(): Cosets;
    get rightCosets(): Cosets;
    toJSON(): displayItemJSON;
    fromJSON(jsonObject: displayItemJSON): this;
}
declare class Subset extends AbstractSubset {
    className: string;
    subsetIndex: integer;
    constructor(viewModel: HighlightControlViewModel, elements: void | Array<groupElement> | BitSet);
    toJSON(): displayItemJSON;
    fromJSON(jsonObject: displayItemJSON): this;
}
declare class Partition extends AbstractSubset {
    partitioningScheme: PartitioningScheme;
    subIndex: number;
    constructor(viewModel: HighlightControlViewModel, partitioningScheme: PartitioningScheme, subIndex: number, elements: BitSet);
    toJSON(): displayItemJSON;
    fromJSON(jsonObject: displayItemJSON): this;
}
declare class ConjugacyClass extends Partition {
    className: string;
}
declare class OrderClass extends Partition {
    className: string;
}
declare class Coset extends Partition {
    className: string;
}
declare class PartitioningScheme extends DisplayItem {
    partitions: Partition[];
}
declare class ConjugacyClasses extends PartitioningScheme {
    className: string;
    constructor(viewModel: HighlightControlViewModel);
}
declare class OrderClasses extends PartitioningScheme {
    className: string;
    constructor(viewModel: HighlightControlViewModel);
}
declare class Cosets extends PartitioningScheme {
    className: string;
    subgroop: Subgroop;
    side: sides;
    constructor(viewModel: HighlightControlViewModel, subgroop: Subgroop, side: sides);
    toJSON(): displayItemJSON;
    fromJSON(jsonObject: displayItemJSON): this;
}

export { HighlightControlViewModel };
declare class HighlightControlViewModel {
    #private;
    nextId: any;
    nextSubsetIndex: any;
    highlightedItems: null[];
    displayMap: Map<any, any>;
    constructor(model: any);
    get group(): any;
    get highlightColors(): any;
    get highlightTypes(): any;
    get view(): any;
    set view(view: any);
    get model(): any;
    set model(model: any);
    reset(): void;
    toJSON(): {
        next_id: any;
        next_subset_index: any;
        highlighted_items: any[];
        display_map: any[];
    };
    fromJSON(jsonObject: any): void;
    createAndConfirmSubset(elements: any, explanation: any): Promise<any>;
    createSubset(elements: any): any;
    createConjugacyClasses(): void;
    createOrderClasses(): void;
    createCosets(subgroopId: any, side: any): void;
    createDerivedSubset(type: any, subsetId: any, subset2Id: any): void;
    destroyItem(itemId: any): void;
    highlightItem(itemId: any, highlightTypeIndex: any): void;
    toggleColorHighlight(itemId: any): void;
    clearAllHighlightColors(): void;
    /**
 ```
 ### Predicates for displaying various partitioning schemes
 ```js
  */
    canShowConjugacyClasses(): boolean;
    canShowOrderClasses(): boolean;
    canShowCosets(subgroopId: any, side: any): boolean;
    /**
    ```
    ### Receiving and pushing updates to/from this.#model
    ```js
     */
    updateModel(field: any, value: any): void;
    update(field: any, value: any): void;
}

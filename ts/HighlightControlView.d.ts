export { HighlightControlView };
declare class HighlightControlView {
    #private;
    viewModel: any;
    rootElement: any;
    itemMap: never[];
    constructor(viewModel: any, rootElement: any);
    addElement(displayItem: any): void;
    allConjugacyClassesHTML(): string;
    allOrderClassesHTML(): string;
    makeLongList(subsetView: any, htmlGenerator: any): any;
    removeElement(displayItem: any): void;
    showItemMenu(event: any, subsetId: any): void;
    intersectionItemHTML(subsetView: any, otherSubsetView: any): string;
    unionItemHTML(subsetView: any, otherSubsetView: any): string;
    elementwiseProductItemHTML(subsetView: any, otherSubsetView: any): string;
    highlightItemHTML(itemView: any): string;
    updateHighlightMark(): void;
    confirmSubsetSave(matchingSubsets: any, explanation: any, type: any, subset: any, subset2: any): Promise<unknown>;
    nextSubsetName(): string;
    makeSubsetEditor(subsetId: any): void;
    clearAll(): void;
    static highlightControlHTML: string;
}

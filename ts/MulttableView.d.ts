export { createMinimalMulttableView, createLargeMulttableView, createInteractiveMulttableView, };
export declare class MulttableViewModel {
    #private;
    get view(): any;
    set view(view: any);
    get model(): any;
    set model(multtableModel: any);
    get coloration(): any;
    get colorReordering(): any;
    get elements(): any;
    get group(): any;
    get highlightColors(): any;
    get organizingSubgroup(): any;
    get separation(): any;
    update(field: any, value: any): void;
    makeLayout(organizingSubgroupIndex: any): any;
    chooseSubgroup(G: any): any;
    layoutSubgroup(G: any, H: any): any;
    layoutNormalSubgroup(G: any, H: any): any;
    layoutNonNormalSubgroup(G: any, H: any): any[];
    setSize(x: any, y: any): void;
    resize(): void;
    showGraphic(): void;
    unitSquarePositions(): any;
    getImage(): any;
    get canvas(): any;
    toJSON(): any;
    fromJSON(jsonObject: any): void;
    draw(group: any): void;
}
export declare class MulttableView {
    canvas: HTMLCanvasElement;
    context: CanvasRenderingContext2D | null;
    is_minimal_view: any;
    show_request: boolean;
    transform: any;
    translate: {
        dx: number;
        dy: number;
    };
    zoomFactor: number;
    constructor(options?: {});
    get size(): {
        w: number;
        h: number;
    };
    set size(newSize: {
        w: number;
        h: number;
    });
    getSize(): {
        w: number;
        h: number;
    };
    setSize(w: any, h: any): void;
    resize(): void;
    get group(): any;
    get elements(): any;
    get highlightColors(): any;
    get organizingSubgroup(): any;
    get separation(): any;
    get coloration(): any;
    get colorReordering(): any;
    getImage(): HTMLImageElement;
    showGraphic(): void;
    queueShowGraphic(): void;
    drawSimpleView(): void;
    drawFullView(): void;
    drawBorder(x: any, y: any, scale: any, color: any): void;
    drawCorner(x: any, y: any, scale: any, color: any): void;
    drawLabel(x: any, y: any, element: any, scale: any, fontScale: any, labels: any): void;
    drawPermutationLabel(x: any, y: any, element: any, scale: any, fontScale: any, permutationLabels: any): void;
    resetZoom(): void;
    zoom(factor: any): this;
    move(deltaX: any, deltaY: any): this;
    xy2rowXcol(canvasX: any, canvasY: any): {
        col: number;
        row: number;
    } | null;
    unitSquarePosition(element: any): {
        x: number;
        y: number;
    };
    unitSquarePositions(): any;
    get colors(): any;
    get stride(): any;
    get table_size(): any;
    position(index: any): any;
    index(position: any): number | undefined;
    clampedIndex(position: any): number;
}
declare function createMinimalMulttableView(options?: {}): MulttableViewModel;
declare function createLargeMulttableView(model: any, options?: {}): MulttableViewModel;
declare function createInteractiveMulttableView(model: any, options?: {}): MulttableViewModel;

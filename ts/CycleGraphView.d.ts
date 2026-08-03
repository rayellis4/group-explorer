export { CycleGraphViewModel, CycleGraphView, createUnlabelledCycleGraphView, createLargeCycleGraphView, createInteractiveCycleGraphView };
declare class CycleGraphViewModel {
    #private;
    get view(): any;
    set view(view: any);
    get model(): any;
    set model(cycleGraphModel: any);
    get group(): any;
    get highlightColors(): any;
    update(field: any, value: any): void;
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
declare class CycleGraphView {
    viewModel: any;
    bbox: any;
    canvas: HTMLCanvasElement;
    closestTwoPositions: any;
    context: CanvasRenderingContext2D | null;
    cyclePaths: any;
    cycles: any;
    displays_labels: any;
    options: {};
    partIndices: any;
    positions: any;
    radius: any;
    rings: any;
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
    getImage(): HTMLImageElement;
    queueShowGraphic(): void;
    showGraphic(): void;
    drawGraphic(): void;
    reset(): void;
    zoom(factor: any): this;
    move(deltaX: any, deltaY: any): this;
    select(screenX: any, screenY: any): any;
    unitSquarePosition(element: any): {
        x: number;
        y: number;
    };
    unitSquarePositions(): any;
    get group(): any;
    get highlightColors(): any;
    orbitOf(g: any): number[];
    raiseToThe(h: any, n: any): number;
    howSoonDoesOrbitIntersect(g: any, array: any): any;
    bestPowerRelativeTo(h: any, g: any): number;
    layoutElementsAndPaths(): void;
    findClosestTwoPositions(): void;
}
declare function createUnlabelledCycleGraphView(options?: {}): CycleGraphViewModel;
declare function createLargeCycleGraphView(model: any, options?: {}): CycleGraphViewModel;
declare function createInteractiveCycleGraphView(model: any, options?: {}): CycleGraphViewModel;

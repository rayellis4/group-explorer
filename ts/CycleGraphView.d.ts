import * as GEUtils from './GEUtils.js';
import * as THREE from '../lib/externals.js';
export { CycleGraphViewModel, CycleGraphView, createUnlabelledCycleGraphView, createLargeCycleGraphView, createInteractiveCycleGraphView };
import type { CycleGraphJSON, CycleGraphModel } from './CycleGraphModel.js';
import type { Group } from './Group.js';
export type CycleGraphOptions = {
    container?: Maybe<HTMLElement>;
    group?: Group;
    height?: float;
    width?: float;
};
type Coordinate = {
    x: float;
    y: float;
};
type Path = {
    pts: Coordinate[];
    partIndex?: number;
    part?: groupElement[][];
    cycleIndex?: number;
    cycle?: groupElement[];
    pathIndex?: number;
};
declare class CycleGraphViewModel implements GEUtils.Updatable {
    #private;
    get view(): CycleGraphView;
    set view(view: CycleGraphView);
    get model(): CycleGraphModel;
    set model(cycleGraphModel: GEUtils.SubscriptionProxy<CycleGraphModel>);
    get group(): Group;
    get highlightColors(): Maybe<color>[][];
    update(field: string, value: any): void;
    setSize(x: number, y: number): void;
    resize(): void;
    showGraphic(): void;
    unitSquarePositions(): THREE.Vector2[];
    getImage(): HTMLImageElement;
    get canvas(): HTMLCanvasElement;
    toJSON(): CycleGraphJSON;
    fromJSON(jsonObject: CycleGraphJSON): void;
    draw(group: Group): void;
}
declare class CycleGraphView {
    viewModel: CycleGraphViewModel;
    bbox: {
        left: float;
        right: float;
        top: float;
        bottom: float;
    };
    canvas: HTMLCanvasElement;
    closestTwoPositions: number;
    context: CanvasRenderingContext2D;
    cyclePaths: Path[];
    cycles: groupElement[][];
    displays_labels: boolean;
    options: CycleGraphOptions;
    partIndices: number[];
    positions: Coordinate[];
    radius: number;
    rings: number[];
    show_request: boolean;
    transform: THREE.Matrix3;
    translate: {
        dx: number;
        dy: number;
    };
    zoomFactor: number;
    constructor(options?: CycleGraphOptions);
    get size(): {
        w: float;
        h: float;
    };
    set size(newSize: {
        w: float;
        h: float;
    });
    getSize(): {
        w: float;
        h: float;
    };
    setSize(w: float, h: float): void;
    resize(): void;
    getImage(): HTMLImageElement;
    queueShowGraphic(): void;
    showGraphic(): void;
    drawGraphic(): void;
    reset(): void;
    zoom(factor: float): this;
    move(deltaX: float, deltaY: float): this;
    select(screenX: number, screenY: number): Maybe<groupElement>;
    unitSquarePosition(element: groupElement): {
        x: float;
        y: float;
    };
    unitSquarePositions(): THREE.Vector2[];
    get group(): Group;
    get highlightColors(): Maybe<color>[][];
    orbitOf(g: groupElement): groupElement[];
    raiseToThe(h: groupElement, n: number): groupElement;
    howSoonDoesOrbitIntersect(g: groupElement, array: groupElement[]): number;
    bestPowerRelativeTo(h: groupElement, g: groupElement): number;
    layoutElementsAndPaths(): void;
    findClosestTwoPositions(): void;
}
declare function createUnlabelledCycleGraphView(options?: CycleGraphOptions): CycleGraphViewModel;
declare function createLargeCycleGraphView(model: GEUtils.SubscriptionProxy<CycleGraphModel>, options?: CycleGraphOptions): CycleGraphViewModel;
declare function createInteractiveCycleGraphView(model: GEUtils.SubscriptionProxy<CycleGraphModel>, options?: CycleGraphOptions): CycleGraphViewModel;

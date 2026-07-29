import * as GEUtils from './GEUtils.js';
import * as THREE from '../lib/externals.js';
import type { Updatable, SubscriptionProxy } from './GEUtils.ts';
import type { Group } from './Group.ts';
import type { MulttableModel, MulttableColoration, MulttableColorReordering, MulttableJSON } from './MulttableModel.ts';
import type { SheetVisualizerInterface } from './SheetModel.ts';
import type { Subgroup } from './Subgroup.ts';
export type MulttableViewOptions = {
    container?: HTMLElement;
    group?: Group;
    height?: number;
    width?: number;
};
export declare class MulttableViewModel implements Updatable, SheetVisualizerInterface<MulttableJSON> {
    #private;
    get view(): MulttableView;
    set view(view: MulttableView);
    get model(): MulttableModel;
    get modelProxy(): GEUtils.SubscriptionProxy<MulttableModel>;
    set model(multtableModel: SubscriptionProxy<MulttableModel>);
    get coloration(): MulttableColoration;
    get colorReordering(): MulttableColorReordering;
    get elements(): groupElement[];
    get group(): Group;
    get highlightColors(): Maybe<color>[][];
    get organizingSubgroup(): number;
    get separation(): number;
    update(field: string, value: any): void;
    makeLayout(organizingSubgroupIndex: number): Array<groupElement>;
    chooseSubgroup(G: Group): Subgroup;
    layoutSubgroup(G: Group, H: Subgroup): groupElement[];
    layoutNormalSubgroup(G: Group, H: Subgroup): groupElement[];
    layoutNonNormalSubgroup(G: Group, H: Subgroup): Array<groupElement>;
    getSize(): {
        w: number;
        h: number;
    };
    setSize(w: number, h: number): void;
    resize(): void;
    showGraphic(): void;
    unitSquarePositions(): THREE.Vector2[];
    getImage(): HTMLImageElement;
    get canvas(): HTMLCanvasElement;
    toJSON(): MulttableJSON;
    fromJSON(jsonObject: MulttableJSON): void;
    draw(group: Group): void;
}
export declare class MulttableView {
    canvas: HTMLCanvasElement;
    context: CanvasRenderingContext2D;
    is_minimal_view: boolean;
    show_request: boolean;
    transform: THREE.Matrix3;
    translate: {
        dx: number;
        dy: number;
    };
    viewModel: MulttableViewModel;
    zoomFactor: number;
    constructor(options?: MulttableViewOptions);
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
    setSize(w: number, h: number): void;
    resize(): void;
    get group(): Group;
    get elements(): groupElement[];
    get highlightColors(): Maybe<color>[][];
    get organizingSubgroup(): number;
    get separation(): number;
    get coloration(): MulttableColoration;
    get colorReordering(): MulttableColorReordering;
    getImage(): HTMLImageElement;
    showGraphic(): void;
    queueShowGraphic(): void;
    drawSimpleView(): void;
    drawFullView(): void;
    drawBorder(x: number, y: number, scale: number, color: color): void;
    drawCorner(x: number, y: number, scale: number, color: color): void;
    drawLabel(x: number, y: number, element: number, scale: number, fontScale: number, labels: HTMLCanvasElement[]): void;
    drawPermutationLabel(x: number, y: number, element: number, scale: number, fontScale: number, permutationLabels: Array<void | Array<string>>): void;
    resetZoom(): void;
    zoom(factor: number): this;
    move(deltaX: number, deltaY: number): this;
    xy2rowXcol(canvasX: number, canvasY: number): Maybe<{
        row: number;
        col: number;
    }>;
    unitSquarePosition(element: groupElement): {
        x: number;
        y: number;
    };
    unitSquarePositions(): Array<THREE.Vector2>;
    get colors(): Maybe<color>[];
    get stride(): number;
    get table_size(): number;
    position(index: number): number;
    index(position: number): void | number;
    clampedIndex(position: number): number;
}
export declare function createMinimalMulttableView(options?: MulttableViewOptions): MulttableViewModel;
export declare function createLargeMulttableView(model: GEUtils.SubscriptionProxy<MulttableModel>, options?: MulttableViewOptions): MulttableViewModel;
export declare function createInteractiveMulttableView(model: GEUtils.SubscriptionProxy<MulttableModel>, options?: MulttableViewOptions): MulttableViewModel;

import * as THREE from '../lib/externals.js';
import { CayleyDiagramModel, CayleyDiagramModelJSON } from './CayleyDiagramModel.js';
import { CycleGraphJSON } from './CycleGraphModel.js';
import { MulttableJSON } from './MulttableModel.js';
import type { CayleyDiagramViewModel } from './CayleyDiagramView.ts';
import type { CycleGraphViewModel } from './CycleGraphView.ts';
import type { SubscriptionProxy } from './GEUtils.ts';
import type { HighlightControlModelInterface } from './HighlightControl.ts';
import type { MulttableViewModel } from './MulttableView.ts';
import type * as SheetModel from './SheetModel.ts';
import type { SheetViewModel, SheetElement, NodeElement, TextElement, VisualizerElement, CDElement, CGElement, MTElement, LinkElement, ConnectingElement, MorphismElement } from './SheetViewModel.ts';
export declare let graphicRect: DOMRect;
export declare let zoomFactor: float;
export declare function init(): void;
export declare function modelToDisplay(pt: THREE.Vector2): THREE.Vector2;
export declare function displayToModel(pt: THREE.Vector2): THREE.Vector2;
export declare function fromEvent(event: MouseEvent | TouchEvent | Touch): THREE.Vector2;
export declare function pan(dx: float, dy: float): void;
export declare function zoom(scaleFactor: float): void;
export declare function redrawAll(): void;
export declare function redrawLinksFor(modelElement: NodeElement): void;
export declare class View {
    #private;
    viewModel: SheetViewModel;
    viewElements: Map<string, SheetView>;
    constructor(viewModel: SheetViewModel, _rootElement: HTMLElement);
    get zoomFactor(): float;
    viewportOrigin(): THREE.Vector2;
    viewportScale(): float;
    addElement(modelElement: SheetElement): void;
    removeElement(modelElement: SheetElement): void;
    clear(): void;
    moveElement(modelElement: NodeElement): void;
    resizeElement(modelElement: NodeElement): void;
    getVisualizerJSON(modelElement: VisualizerElement): unknown;
    updateVisualizer(modelElement: VisualizerElement, json: unknown): void;
}
export declare abstract class SheetView {
    view: View;
    modelElement: SheetElement;
    domElement: HTMLElement;
    constructor(view: View, modelElement: SheetElement, domElement?: HTMLElement);
    abstract redraw(): void;
    abstract updateTransform(): void;
    destroy(): void;
    updateZ(): void;
}
export declare abstract class NodeView extends SheetView {
    modelElement: NodeElement;
    constructor(view: View, modelElement: NodeElement, domElement?: HTMLElement);
    get center(): THREE.Vector2;
    get rect(): DOMRect;
    get position(): THREE.Vector2;
    get size(): THREE.Vector2;
}
export declare class TextView extends NodeView {
    modelElement: TextElement;
    constructor(view: View, modelElement: TextElement, domElement?: HTMLElement);
    updateTransform(): void;
    redraw(): void;
}
export declare abstract class VisualizerView extends NodeView {
    modelElement: VisualizerElement & {
        onVisualizerChange?: (json: unknown) => void;
    };
    domElement: HTMLCanvasElement;
    unitSquarePositions: Array<THREE.Vector2>;
    lastZoom: float;
    protected _highlightSubscriber: {
        update: (field: string, value: unknown) => void;
    };
    constructor(view: View, modelElement: VisualizerElement, domElement?: HTMLElement);
    abstract get visualizer(): CayleyDiagramViewModel | CycleGraphViewModel | MulttableViewModel;
    abstract updateFromJSON(json: unknown): void;
    updateTransform(): void;
    redraw(): void;
    restoreHighlights(snapshot: NonNullable<SheetModel.VisualizerElementJSON['visualizerJSON']['highlight_colors']>[number]): void;
    get highlightModelProxy(): SubscriptionProxy<HighlightControlModelInterface>;
    getVisualizerJSON(): CycleGraphJSON;
}
export declare class CGView extends VisualizerView {
    modelElement: CGElement;
    cgViewModel: CycleGraphViewModel;
    constructor(view: View, modelElement: CGElement);
    updateFromJSON(json: CycleGraphJSON): void;
    get visualizer(): CycleGraphViewModel;
}
export declare class MTView extends VisualizerView {
    modelElement: MTElement;
    mtViewModel: MulttableViewModel;
    constructor(view: View, modelElement: MTElement);
    updateFromJSON(json: MulttableJSON): void;
    get visualizer(): MulttableViewModel;
}
export declare class CDView extends VisualizerView {
    #private;
    modelElement: CDElement & {
        onVisualizerChange?: (json: unknown) => void;
    };
    private _highlightModelProxy;
    constructor(view: View, modelElement: CDElement);
    initializeLayout(): void;
    get visualizer(): CayleyDiagramViewModel;
    get highlightModelProxy(): SubscriptionProxy<CayleyDiagramModel>;
    updateFromJSON(json: CayleyDiagramModelJSON): void;
    destroy(): void;
    redraw(): void;
    restoreHighlights(snapshot: NonNullable<SheetModel.VisualizerElementJSON['visualizerJSON']['highlight_colors']>[number]): void;
}
declare class Arrow {
    static PIXELS_PER_INCH: number;
    line: HTMLCanvasElement;
    head: HTMLCanvasElement;
    lineWidth: float;
    color: color;
    highlightColor: Maybe<color>;
    constructor(container: HTMLElement, lineWidth?: number, color?: color);
    drawBase(lineWidth: float, color: color): void;
    update(start: THREE.Vector2, // model coords; container div is CSS-scaled by zoomFactor so these map correctly to display pixels
    end: THREE.Vector2, lineWidth?: number, headOffset?: float, color?: color): void;
}
export declare abstract class LinkView extends SheetView {
    modelElement: LinkElement;
    arrow: Arrow;
    constructor(view: View, modelElement: LinkElement);
    get destination(): NodeElement;
    get destinationView(): NodeView;
    get source(): NodeElement;
    get sourceView(): NodeView;
    getCrossingEndpoints(): [THREE.Vector2, THREE.Vector2];
}
export declare class ConnectingView extends LinkView {
    modelElement: ConnectingElement;
    constructor(view: View, modelElement: ConnectingElement);
    updateTransform(): void;
    redraw(): void;
}
export declare class MorphismView extends LinkView {
    modelElement: MorphismElement;
    label: HTMLElement;
    arrows: Arrow[];
    position: THREE.Vector2;
    labelContent: html;
    constructor(view: View, modelElement: MorphismElement);
    get destination(): VisualizerElement;
    get destinationView(): VisualizerView;
    get source(): VisualizerElement;
    get sourceView(): VisualizerView;
    updateTransform(): void;
    redraw(): void;
    drawLabel(): void;
    getLabel(): string;
    drawSingleLine(): void;
    drawManyLines(): void;
}
export {};

import { AbstractDiagramDisplay } from './AbstractDiagramDisplay.js';
import { CayleyDiagramModel } from './CayleyDiagramModel.js';
import * as THREE from '../lib/externals.js';
export { DEFAULT_SPHERE_COLOR as DEFAULT_NODE_COLOR } from './AbstractDiagramDisplay.js';
import type { ArrowGenerator, StrategyParameters } from './CayleyDiagramGenerator.ts';
import type { CayleyDiagramModelJSON } from './CayleyDiagramModel.ts';
import type { Group } from './Group.ts';
import type { Updatable, SubscriptionProxy } from './GEUtils.ts';
import type { SheetVisualizerInterface } from './SheetModel.ts';
export type { Layout, Direction, StrategyParameters } from './CayleyDiagramGenerator.ts';
import type { LineType, AbstractDiagramDisplayOptions } from './AbstractDiagramDisplay.ts';
export type { LineType } from './AbstractDiagramDisplay.ts';
export type SphereUserData = {
    node: NodeType;
    ring_highlight?: THREE.Sprite;
    square_highlight?: THREE.Sprite;
    label?: THREE.Sprite;
};
export type LineUserData = {
    arrow: ArrowType;
    arrowhead?: THREE.ArrowHelper;
};
export type ChunkUserData = {
    chunk: ChunkType;
};
export type POV = {
    position: THREE.Vector3;
    up: THREE.Vector3;
};
export type NodeType = {
    position: THREE.Vector3;
    element: groupElement;
    label: html;
    color: color;
};
export type ArrowType = {
    start_node: NodeType;
    end_node: NodeType;
    generator: groupElement;
    bidirectional: boolean;
    thirdPoint: THREE.Vector3;
    keepCurved: boolean;
    offset: Maybe<float>;
    color: color;
};
export type ChunkType = {
    box: THREE.Matrix4;
    name: html;
    widths: THREE.Vector3;
    nodes: NodeType[];
};
export type LayoutType = {
    pov: POV;
    nodes: NodeType[];
    arrows: ArrowType[];
    chunks: ChunkType[];
};
export type Vector3JSON = {
    x: number;
    y: number;
    z: number;
};
export type Matrix4JSON = {
    elements: number[];
};
export type POVJSON = {
    position: Vector3JSON;
    up: Vector3JSON;
};
export type NodeJSON = {
    position: Vector3JSON;
    element: groupElement;
    label: html;
    color: color;
};
export type ArrowJSON = {
    start_element: groupElement;
    end_element: groupElement;
    generator: groupElement;
    bidirectional: boolean;
    thirdPoint: Vector3JSON;
    keepCurved: boolean;
    offset: Maybe<float>;
    color: color;
};
export type ChunkJSON = {
    box: Matrix4JSON;
    name: html;
    widths: Vector3JSON;
    nodes: groupElement[];
};
export type LayoutJSON = {
    pov: POVJSON;
    nodes: NodeJSON[];
    arrows: ArrowJSON[];
    chunks: ChunkJSON[];
};
export type CayleyDiagramJSON = {
    background: color;
    cameraJSON: Object;
    cameraUp: {
        x: float;
        y: float;
        z: float;
    };
    fog_level: float;
    line_width: number;
    sphere_base_radius: float;
    sphere_scale_factor: float;
    zoom_level: number;
    arrowhead_placement: float;
    label_scale_factor: float;
    groupURL: string;
    right_multiply: boolean;
    arrows: ArrowJSON[];
    nodes: NodeJSON[];
    chunk?: integer;
    diagram_name?: string;
    strategy_parameters?: StrategyParameters[];
    color_highlights?: color[];
    ring_highlights?: Maybe<color>[];
    square_highlights?: Maybe<color>[];
};
export type CayleyDiagramViewOptions = {
    group?: Group;
    diagramName?: string;
    container?: HTMLElement;
} & AbstractDiagramDisplayOptions;
export declare function layoutToJSON(layout: LayoutType): Maybe<LayoutJSON>;
export declare function layoutFromJSON(json: LayoutJSON): LayoutType;
export declare class CayleyDiagramViewModel implements Updatable, SheetVisualizerInterface<CayleyDiagramModelJSON> {
    private _model;
    private _view;
    private static modelFields;
    get group(): Group;
    get highlightColors(): Maybe<color>[][];
    set highlightColors(highlightColors: Maybe<color>[][]);
    get view(): CayleyDiagramView;
    get model(): CayleyDiagramModel;
    get modelProxy(): SubscriptionProxy<CayleyDiagramModel>;
    setModel(model: SubscriptionProxy<CayleyDiagramModel>): void;
    setView(view: CayleyDiagramView): void;
    update(field: string, value: unknown): void;
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
    toJSON(): CayleyDiagramModelJSON;
    fromJSON(jsonObject: CayleyDiagramModelJSON): void;
    draw(group: Group, diagramName?: string, strategyParameters?: StrategyParameters[], arrowGenerators?: ArrowGenerator[]): void;
}
export declare class CayleyDiagramView extends AbstractDiagramDisplay {
    viewModel: CayleyDiagramViewModel;
    display_labels: boolean;
    _label_scale_factor: float;
    _arrowhead_placement: float;
    _group: Group;
    _right_multiply: boolean;
    color_highlights: Maybe<color>[];
    ring_highlights: Maybe<color>[];
    square_highlights: Maybe<color>[];
    constructor(options?: CayleyDiagramViewOptions);
    getObjectsAtPoint(x: number, y: number): THREE.Object3D[];
    drawFromModel({ position, up }: {
        position: THREE.Vector3;
        up: THREE.Vector3;
    }, nodes: NodeType[], arrows: ArrowType[]): void;
    deleteAllObjects(): void;
    enableTrackballControl(container?: Maybe<HTMLElement>): void;
    get sphere_scale_factor(): float;
    set sphere_scale_factor(new_scale_factor: float);
    createSpheres(sphere_data: NodeType[]): void;
    moveSphere(sphere: THREE.Mesh, position: THREE.Vector3, moveContainingChunk?: boolean): void;
    unitSquarePosition(element: groupElement): {
        x: float;
        y: float;
    };
    unitSquarePositions(): THREE.Vector2[];
    deleteAllSpheres(): void;
    drawAllHighlights(): void;
    drawHighlight(sphere: THREE.Mesh, shape: 'ring' | 'square', highlight_color: color): void;
    updateHighlightRadius(): void;
    clearHighlightDefinitions(): void;
    deleteAllHighlights(): void;
    get label_scale_factor(): float;
    set label_scale_factor(label_scale_factor: float);
    createLabels(): void;
    updateLabelRadius(old_sphere_radius: float, new_sphere_radius: float): void;
    deleteAllLabels(): void;
    get arrowhead_placement(): float;
    set arrowhead_placement(arrowhead_placement: float);
    createLines(line_data: ArrowType[]): void;
    colorAllLines(): void;
    createStraightLine(line_datum: ArrowType): void;
    createCurvedLine(line_datum: ArrowType): void;
    createArrowhead(line_datum: ArrowType, curve: THREE.Curve<THREE.Vector3>, curve_length: float): THREE.ArrowHelper;
    offsetAroundSpheres(line_datum: ArrowType): Maybe<float>;
    redrawAllLines(): void;
    redrawLines(lines: LineType[]): void;
    deleteLines(lines: LineType[]): void;
    get chunks(): THREE.Object3D<THREE.Object3DEventMap>[];
    createChunks(chunk_data: ChunkType[]): void;
    deleteAllChunks(): void;
    moveChunkTo(chunk: THREE.Mesh, position: THREE.Vector3): void;
    get arrows(): LineType[];
    get group(): Group;
    set group(group: Group);
    get nodes(): THREE.Mesh[];
    get layout(): LayoutType;
}
export declare function createCayleyDiagramThumbnailView(options?: CayleyDiagramViewOptions): CayleyDiagramViewModel;
export declare function createStaticCayleyDiagramView(model: SubscriptionProxy<CayleyDiagramModel>, options?: CayleyDiagramViewOptions): CayleyDiagramViewModel;
export declare function createInteractiveCayleyDiagramView(model: SubscriptionProxy<CayleyDiagramModel>, options?: CayleyDiagramViewOptions): CayleyDiagramViewModel;

import { AbstractDiagramDisplay } from './AbstractDiagramDisplay.js';
import { CayleyDiagramModel } from './CayleyDiagramModel.js';
import * as THREE from '../lib/externals.js';
export { DEFAULT_SPHERE_COLOR as DEFAULT_NODE_COLOR } from './AbstractDiagramDisplay.js';
import type { ArrowGenerator, StrategyParameters } from './CayleyDiagramGenerator.ts';
import type { CayleyDiagramModelJSON } from './CayleyDiagramModel.js';
import type { Group } from './Group.js';
import type { Updatable, SubscriptionProxy } from './GEUtils.js';
export type { Layout, Direction, StrategyParameters } from './CayleyDiagramGenerator.ts';
import type { LineType, AbstractDiagramDisplayOptions } from './AbstractDiagramDisplay.ts';
export type { LineType } from './AbstractDiagramDisplay.ts';
export type POV = {
    position: THREE.Vector3;
    up: THREE.Vector3;
};
export type NodeData = {
    position: THREE.Vector3;
    element: groupElement;
    label: html;
    color: color;
};
export type ArrowData = {
    start_node: NodeData;
    end_node: NodeData;
    generator: groupElement;
    bidirectional: boolean;
    thirdPoint: THREE.Vector3;
    keepCurved: boolean;
    offset: Maybe<float>;
    color: color;
};
export type ChunkData = {
    box: THREE.Matrix4;
    name: html;
    widths: THREE.Vector3;
    nodes: NodeData[];
};
export type LayoutData = {
    pov: POV;
    nodes: NodeData[];
    arrows: ArrowData[];
    chunks: ChunkData[];
};
export type SphereUserData = {
    node: NodeData;
    ring_highlight?: THREE.Sprite;
    square_highlight?: THREE.Sprite;
    label?: THREE.Sprite;
};
export type LineUserData = {
    arrow: ArrowData;
    arrowhead?: THREE.ArrowHelper;
};
type NodeDataJSON = {
    position: {
        x: float;
        y: float;
        z: float;
    };
    element: groupElement;
    label: html;
};
type ArrowDataJSON = {
    start_element: groupElement;
    end_element: groupElement;
    generator: groupElement;
    thirdPoint: {
        x: float;
        y: float;
        z: float;
    };
    offset: Maybe<float>;
    color: color;
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
    arrows: ArrowDataJSON[];
    nodes: NodeDataJSON[];
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
export declare class CayleyDiagramViewModel implements Updatable {
    #private;
    get group(): Group;
    get view(): CayleyDiagramView;
    get model(): CayleyDiagramModel;
    setModel(model: SubscriptionProxy<CayleyDiagramModel>): void;
    setView(view: CayleyDiagramView): void;
    updateModel(field: keyof CayleyDiagramModel, value: any): void;
    update(field: string, value: any): void;
    setSize(x: number, y: number): void;
    resize(): void;
    showGraphic(): void;
    unitSquarePositions(): THREE.Vector2[];
    getImage(): HTMLImageElement;
    get canvas(): HTMLCanvasElement;
    toJSON(): CayleyDiagramModelJSON;
    fromJSON(jsonObject: CayleyDiagramModelJSON): void;
    draw(group: Group, diagramNameOrStrategies: string | StrategyParameters[] | undefined, arrowGenerators?: ArrowGenerator[]): void;
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
    }, nodes: NodeData[], arrows: ArrowData[]): void;
    deleteAllObjects(): void;
    get sphere_scale_factor(): float;
    set sphere_scale_factor(new_scale_factor: float);
    createSpheres(sphere_data: NodeData[]): void;
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
    createLines(line_data: ArrowData[]): void;
    colorAllLines(): void;
    createStraightLine(line_datum: ArrowData): void;
    createCurvedLine(line_datum: ArrowData): void;
    createArrowhead(line_datum: ArrowData, curve: THREE.Curve<THREE.Vector3>, curve_length: float): THREE.ArrowHelper;
    offsetAroundSpheres(line_datum: ArrowData): Maybe<float>;
    redrawAllLines(): void;
    redrawLines(lines: LineType[]): void;
    deleteLines(lines: LineType[]): void;
    get chunks(): THREE.Object3D<THREE.Object3DEventMap>[];
    createChunks(chunk_data: ChunkData[]): void;
    deleteAllChunks(): void;
    moveChunkTo(chunk: THREE.Mesh, position: THREE.Vector3): void;
    get arrows(): LineType[];
    get group(): Group;
    set group(group: Group);
    get nodes(): THREE.Mesh[];
}
export declare function createCayleyDiagramThumbnailView(options?: CayleyDiagramViewOptions): CayleyDiagramViewModel;
export declare function createStaticCayleyDiagramView(model: SubscriptionProxy<CayleyDiagramModel>, options?: CayleyDiagramViewOptions): CayleyDiagramViewModel;
export declare function createInteractiveCayleyDiagramView(model: SubscriptionProxy<CayleyDiagramModel>, options?: CayleyDiagramViewOptions): CayleyDiagramViewModel;

import * as THREE from '../lib/externals.js';
import { BitSet } from './BitSet.js';
import type { NodeType, LayoutType } from "./CayleyDiagramModel.js";
import type { Group } from './Group.ts';
type LineDirection = 'X' | 'Y' | 'Z';
type PlaneDirection = 'YZ' | 'XZ' | 'XY';
export type Layout = 'linear' | 'circular' | 'rotated';
export type Direction = LineDirection | PlaneDirection;
export type StrategyParameters = {
    generator: groupElement;
    layout: Layout;
    direction: Direction;
    nestingLevel: number;
};
export type ArrowGenerator = {
    generator: groupElement;
    color: color;
};
export declare const DIRECTION_INDEX: {
    X: number;
    Y: number;
    Z: number;
    YZ: number;
    XZ: number;
    XY: number;
};
export declare const AXIS_NAME: LineDirection[];
export declare function layoutCayleyDiagram(group: Group, nameOrStrategies?: string | StrategyParameters[] | undefined, arrowGenerators?: Maybe<ArrowGenerator[]>, rightMultiply?: boolean, chunkSubgroupIndex?: Maybe<integer>): LayoutType;
export declare function getDefaultStrategies(group: Group): StrategyParameters[];
export declare function getPOV(chunkOrNodePositions: Chunk | {
    position: THREE.Vector3;
}[], generatesFromStrategy: boolean): {
    position: THREE.Vector3;
    up: THREE.Vector3;
};
export declare function nextArrowColor(colorsUsed?: color[]): color;
declare class AbstractLayoutStrategy {
    generator: groupElement;
    readonly layout: Layout;
    direction: Direction;
    directionIndex: integer;
    nesting_level: integer;
    elements: Maybe<BitSet>;
    constructor(generator: groupElement, direction: Direction, nesting_level: integer);
    get strategyParameters(): StrategyParameters;
    transformChild(child: Chunk | NodeType, transform: THREE.Matrix4): void;
    layoutChunk(chunk: Chunk): Chunk;
    layoutNodes(_chunk: Chunk): void;
}
declare class Chunk {
    #private;
    chunks: Chunk[];
    leaves: NodeType[];
    position: THREE.Vector3;
    strategy: AbstractLayoutStrategy;
    transformedChunkBox: THREE.Matrix4;
    originalChunkSize: THREE.Vector3;
    constructor(children: Chunk[] | NodeType[], strategy?: AbstractLayoutStrategy);
    get children(): Chunk[] | NodeType[];
    get isLeaf(): boolean;
    get allChildNodes(): NodeType[];
    get leftBoundary(): Chunk[];
    getNodeAncestry(node: NodeType): (Chunk | NodeType)[];
    setPositionFromChildren(): this;
    transform(transform: THREE.Matrix4): void;
}
export {};

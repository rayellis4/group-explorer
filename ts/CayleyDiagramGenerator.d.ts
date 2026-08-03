import type { LayoutType } from "./CayleyDiagramModel.js";
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
export declare function nextArrowColor(colorsUsed?: color[]): color;
export {};

import { Mapping, definingPairType } from './Mapping.js';
import * as THREE from '../lib/externals.js';
import type { ArrowGenerator, StrategyParameters } from './CayleyDiagramGenerator.ts';
import type { CayleyDiagramModelJSON } from './CayleyDiagramModel.js';
import type { CycleGraphJSON } from './CycleGraphModel.ts';
import type { Group } from './Group.ts';
import type { MulttableJSON } from './MulttableModel.ts';
export type VisualizerType = 'CDElement' | 'MTElement' | 'CGElement';
export type ConcreteSheetTypes = {
    TextElement: TextElementJSON;
    CDElement: CDElementJSON;
    CGElement: CGElementJSON;
    MTElement: MTElementJSON;
    ConnectingElement: ConnectingElementJSON;
    MorphismElement: MorphismElementJSON;
};
export type SheetTypes = {
    VisualizerElement: SheetTypes['CDElement'] | SheetTypes['CGElement'] | SheetTypes['MTElement'];
    NodeElement: SheetTypes['TextElement'] | SheetTypes['VisualizerElement'];
    LinkElement: SheetTypes['ConnectingElement'] | SheetTypes['MorphismElement'];
} & ConcreteSheetTypes;
export type SheetJSON = SheetTypes[keyof SheetTypes];
export type alignmentType = 'left' | 'center' | 'right';
export type arrowColorType = 'none' | 'source' | 'destination';
export interface SheetVisualizerInterface<JSONType> {
    group: Group;
    highlightColors: Maybe<color>[][];
    canvas: HTMLCanvasElement;
    getSize: () => {
        w: number;
        h: number;
    };
    setSize: (w: number, h: number) => void;
    resize: () => void;
    showGraphic: () => void;
    unitSquarePositions: () => THREE.Vector2[];
    getImage: () => HTMLImageElement;
    toJSON: () => JSONType;
    fromJSON: (jsonObject: JSONType) => void;
}
export interface SheetElementJSON {
    id?: string;
}
export interface NodeElementJSON extends SheetElementJSON {
    x: float;
    y: float;
    w: float;
    h?: float;
    z?: float;
    anchor_id?: string;
}
export interface TextElementJSON extends NodeElementJSON {
    className: 'TextElement';
    alignment?: alignmentType;
    color?: color;
    fontSize?: string;
    fontColor?: string;
    isPlainText?: boolean;
    opacity?: float;
    text?: string;
}
export interface VisualizerElementJSON extends NodeElementJSON {
    visualizerJSON: {
        group_url: string;
        highlight_colors?: Maybe<color>[][];
    };
}
export interface CDElementJSON extends VisualizerElementJSON {
    className: 'CDElement';
    visualizerJSON: CayleyDiagramModelJSON;
}
export interface CGElementJSON extends VisualizerElementJSON {
    className: 'CGElement';
    visualizerJSON: CycleGraphJSON;
}
export interface MTElementJSON extends VisualizerElementJSON {
    className: 'MTElement';
    visualizerJSON: MulttableJSON;
}
export interface LinkElementJSON extends SheetElementJSON {
    source_id: string;
    destination_id: string;
}
export interface ConnectingElementJSON extends LinkElementJSON {
    className: 'ConnectingElement';
    thickness?: float;
    color?: color;
    hasArrowhead?: boolean;
}
export interface MorphismElementJSON extends LinkElementJSON {
    className: 'MorphismElement';
    morphismName?: string;
    arrowColor?: arrowColorType;
    arrowMargin?: number;
    definingPairs?: definingPairType[];
    fontSize?: Maybe<string>;
    showDomainAndCodomain?: boolean;
    showDefiningPairs?: boolean;
    showInjectionSurjection?: boolean;
    showManyArrows?: boolean;
    useMulttableSourceTopRow?: boolean;
    useMulttableDestinationTopRow?: boolean;
}
export declare function sheetPanelWidth(): number;
export declare function fittedFontSize(html: html, maxWidth: float, min?: float, max?: float): string;
export declare class SheetModel {
    #private;
    nextId: number;
    classMap: Record<keyof ConcreteSheetTypes, new (...args: any[]) => {
        fromJSON(jsonObject: unknown): any;
    }>;
    get sheetElements(): Map<string, SheetElement>;
    toJSON(): SheetJSON[];
    fromJSON(json: string | SheetJSON[]): void;
    addObjectAsElement(plainObject: SheetJSON, className: keyof ConcreteSheetTypes): SheetElement;
    canConnect(linkElementOrType: LinkElement | 'ConnectingElement' | 'MorphismElement', sourceElementOrId: SheetElement | string, destinationElementOrId: SheetElement | string): boolean;
}
export declare abstract class SheetElement {
    #private;
    id: string;
    className: keyof ConcreteSheetTypes;
    constructor(model: SheetModel, id: string);
    get model(): SheetModel;
    abstract get z(): integer;
    toJSON(): SheetElementJSON;
    fromJSON(_jsonObject: SheetElementJSON): this;
}
export declare abstract class NodeElement extends SheetElement {
    x: float;
    y: float;
    w: float;
    h: float;
    z: integer;
    anchor_id: Maybe<string>;
    isNode: boolean;
    constructor(model: SheetModel, id: string);
    toJSON(): NodeElementJSON;
    fromJSON(jsonObject: NodeElementJSON): this;
}
export declare class TextElement extends NodeElement {
    readonly className: keyof ConcreteSheetTypes;
    text: string;
    color: color;
    opacity: float;
    fontSize: string;
    fontColor: color;
    alignment: alignmentType;
    isPlainText: boolean;
    toJSON(): TextElementJSON;
    fromJSON(jsonObject: TextElementJSON): this;
}
export declare abstract class VisualizerElement extends NodeElement {
    group: Group;
    visualizerJSON: {
        group_url: string;
        highlight_colors?: Maybe<color>[][];
    };
    isVisualizer: boolean;
    fromJSON(jsonObject: VisualizerElementJSON): this;
}
export declare class CDElement extends VisualizerElement {
    readonly className: keyof ConcreteSheetTypes;
    visualizerJSON: CayleyDiagramModelJSON;
    toJSON(): CDElementJSON;
    fromJSON(jsonObject: CDElementJSON): this;
}
export declare class CGElement extends VisualizerElement {
    readonly className: keyof ConcreteSheetTypes;
    visualizerJSON: CycleGraphJSON;
    toJSON(): CGElementJSON;
    fromJSON(jsonObject: CGElementJSON): this;
}
export declare class MTElement extends VisualizerElement {
    readonly className: keyof ConcreteSheetTypes;
    visualizerJSON: MulttableJSON;
    organizingSubgroup: integer;
    separation: float;
    toJSON(): MTElementJSON;
    fromJSON(jsonObject: MTElementJSON): this;
}
export declare abstract class LinkElement extends SheetElement {
    source: NodeElement;
    destination: NodeElement;
    isLink: boolean;
    get z(): integer;
    toJSON(): LinkElementJSON;
    fromJSON(jsonObject: LinkElementJSON): this;
}
export declare class ConnectingElement extends LinkElement {
    readonly className: keyof ConcreteSheetTypes;
    thickness: float;
    color: color;
    hasArrowhead: boolean;
    toJSON(): ConnectingElementJSON;
    fromJSON(jsonObject: ConnectingElementJSON): this;
}
export declare class MorphismElement extends LinkElement {
    #private;
    source: VisualizerElement;
    destination: VisualizerElement;
    readonly className: keyof ConcreteSheetTypes;
    morphismName: string;
    showDomainAndCodomain: boolean;
    showDefiningPairs: boolean;
    showInjectionSurjection: boolean;
    showManyArrows: boolean;
    arrowColor: arrowColorType;
    arrowMargin: number;
    fontSize: Maybe<string>;
    useMulttableSourceTopRow: boolean;
    useMulttableDestinationTopRow: boolean;
    mapping: Mapping;
    get z(): integer;
    toJSON(): MorphismElementJSON;
    fromJSON(jsonObject: MorphismElementJSON): this;
}
export interface SheetElementRequest {
    className: keyof SheetTypes;
    id?: string;
    x?: float;
    y?: float;
    w?: float;
    h?: float;
    anchor_id?: string;
    alignment?: alignmentType;
    color?: color;
    fontSize?: string;
    fontColor?: string;
    opacity?: float;
    text?: string;
    groupURL?: string;
    highlight_colors?: Maybe<color>[][];
    arrow_generators?: ArrowGenerator[];
    diagram_name?: string;
    strategy_parameters?: StrategyParameters[];
    organizing_subgroup?: integer;
    source_id?: string;
    destination_id?: string;
    thickness?: float;
    hasArrowhead?: boolean;
    morphismName?: string;
    arrowColor?: arrowColorType;
    definingPairs?: definingPairType[];
    showInjectionSurjection?: boolean;
    showManyArrows?: boolean;
}
export declare function createNewSheet(arg: {
    title: string;
    elements: SheetElementRequest[];
} | SheetElementRequest[]): void;
export declare function loadPassedSheet(sheetModel: SheetModel): Promise<Maybe<string>>;

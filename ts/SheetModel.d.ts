import { Mapping, definingPairType } from './Mapping.js';
import type { ArrowGenerator, StrategyParameters } from './CayleyDiagramGenerator.ts';
import type { Group } from './Group.ts';
export type VisualizerType = 'CDElement' | 'MTElement' | 'CGElement';
type ConcreteSheetElementClass = TextElement | CDElement | CGElement | MTElement | ConnectingElement | MorphismElement;
type ConcreteSheetElementClassName = 'TextElement' | 'CDElement' | 'CGElement' | 'MTElement' | 'ConnectingElement' | 'MorphismElement';
export type SheetJSON = NodeElementJSON | VisualizerElementJSON | LinkElementJSON | TextElementJSON | CDElementJSON | CGElementJSON | MTElementJSON | ConnectingElementJSON | MorphismElementJSON;
export type alignmentType = 'left' | 'center' | 'right';
type arrowColorType = 'none' | 'source' | 'destination';
interface SheetElementFields {
    id?: string;
}
export interface NodeElementFields extends SheetElementFields {
    x: float;
    y: float;
    w: float;
    h?: float;
    z?: float;
    anchor_id?: string;
}
export interface TextElementFields extends NodeElementFields {
    alignment?: alignmentType;
    color?: color;
    fontSize?: string;
    fontColor?: string;
    isPlainText?: boolean;
    opacity?: float;
    text?: string;
}
export interface VisualizerElementFields extends NodeElementFields {
    groupURL: string;
    highlight_colors?: Maybe<color>[][];
    visualizer?: unknown;
}
export interface CDElementFields extends VisualizerElementFields {
    arrow_generators?: ArrowGenerator[];
    chunk_subgroup_index?: integer;
    diagram_control?: unknown;
    diagram_name?: string;
    strategy_parameters?: StrategyParameters[];
}
export interface CGElementFields extends VisualizerElementFields {
}
export interface MTElementFields extends VisualizerElementFields {
    color_reordering?: 'topRowFixed' | 'elementColorsFixed';
    coloration?: 'rainbow' | 'grayscale' | 'none';
    elements?: groupElement[];
    organizing_subgroup?: integer;
    separation?: float;
}
export interface LinkElementFields extends SheetElementFields {
    source_id: string;
    destination_id: string;
}
export interface ConnectingElementFields extends LinkElementFields {
    thickness?: float;
    color?: color;
    hasArrowhead?: boolean;
}
export interface MorphismElementFields extends LinkElementFields {
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
export interface SheetElementJSON extends SheetElementFields {
    className: ConcreteSheetElementClassName;
}
export interface NodeElementJSON extends NodeElementFields {
    className: 'TextElement' | 'CDElement' | 'CGElement' | 'MTElement';
}
export interface TextElementJSON extends TextElementFields {
    className: 'TextElement';
}
export interface VisualizerElementJSON extends VisualizerElementFields {
    className: 'CDElement' | 'CGElement' | 'MTElement';
}
export interface CDElementJSON extends CDElementFields {
    className: 'CDElement';
}
export interface CGElementJSON extends CGElementFields {
    className: 'CGElement';
}
export interface MTElementJSON extends MTElementFields {
    className: 'MTElement';
}
export interface LinkElementJSON extends LinkElementFields {
    className: 'ConnectingElement' | 'MorphismElement';
}
export interface ConnectingElementJSON extends ConnectingElementFields {
    className: 'ConnectingElement';
}
export interface MorphismElementJSON extends MorphismElementFields {
    className: 'MorphismElement';
}
export declare function sheetPanelWidth(): number;
export declare function fittedFontSize(html: html, maxWidth: float, min?: float, max?: float): string;
export declare class SheetModel {
    #private;
    nextId: number;
    classMap: Record<string, new (...args: any[]) => {
        fromJSON(jsonObject: unknown): ConcreteSheetElementClass;
    }>;
    get sheetElements(): Map<string, SheetElement>;
    toJSON(): SheetJSON[];
    fromJSON(json: string | SheetJSON[]): void;
    addObjectAsElement(plainObject: SheetJSON, className: string): SheetElement;
    canConnect(linkElementOrType: LinkElement | 'ConnectingElement' | 'MorphismElement', sourceElementOrId: SheetElement | string, destinationElementOrId: SheetElement | string): boolean;
}
export declare abstract class SheetElement {
    #private;
    id: string;
    className: string;
    constructor(model: SheetModel, id: string);
    get model(): SheetModel;
    abstract get z(): integer;
    toJSON(): SheetElementJSON;
    fromJSON(jsonObject: SheetElementJSON): this;
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
    className: string;
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
    highlightColors: Maybe<color>[][];
    visualizer: unknown;
    isVisualizer: boolean;
    toJSON(): VisualizerElementJSON;
    fromJSON(jsonObject: VisualizerElementJSON): this;
}
export declare class CDElement extends VisualizerElement {
    className: string;
    diagramControl?: Record<string, unknown>;
    toJSON(): CDElementJSON;
    fromJSON(jsonObject: CDElementJSON): this;
}
export declare class CGElement extends VisualizerElement {
    className: string;
}
export declare class MTElement extends VisualizerElement {
    className: string;
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
    className: string;
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
    className: string;
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
export declare function createNewSheet(arg: {
    title: string;
    elements: SheetJSON[];
} | SheetJSON[]): void;
export declare function loadPassedSheet(sheetModel: SheetModel): Promise<Maybe<string>>;
export {};

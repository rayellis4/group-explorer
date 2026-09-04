import * as SheetView from './SheetView.js';
import type * as THREE from 'three';
import type { Updatable, SubscriptionProxy } from './GEUtils.ts';
import { SheetModel, SheetJSON } from './SheetModel.js';
import * as SheetModel_ from './SheetModel.js';
interface SheetViewExtensions<T> {
    viewElement: T;
    destroy: () => void;
}
interface NodeExtensions<T> extends SheetViewExtensions<T> {
    move: (dx: float, dy: float) => void;
    resize: (dw: float, dh: float) => void;
    copy: () => NodeElement;
}
interface VisualizerExtensions<T> extends NodeExtensions<T> {
    getVisualizerJSON: () => unknown;
    updateVisualizer: (json: unknown) => void;
}
export interface SheetElement extends SheetModel_.SheetElement, SheetViewExtensions<SheetView.SheetView> {
}
export interface NodeElement extends SheetModel_.NodeElement, NodeExtensions<SheetView.NodeView> {
}
export interface TextElement extends SheetModel_.TextElement, NodeExtensions<SheetView.TextView> {
}
export interface VisualizerElement extends SheetModel_.VisualizerElement, VisualizerExtensions<SheetView.VisualizerView> {
}
export interface CDElement extends SheetModel_.CDElement, VisualizerExtensions<SheetView.CDView> {
}
export interface CGElement extends SheetModel_.CGElement, VisualizerExtensions<SheetView.CGView> {
}
export interface MTElement extends SheetModel_.MTElement, VisualizerExtensions<SheetView.MTView> {
}
export interface LinkElement extends SheetModel_.LinkElement, SheetViewExtensions<SheetView.LinkView> {
    source: NodeElement;
    destination: NodeElement;
}
export interface ConnectingElement extends SheetModel_.ConnectingElement, SheetViewExtensions<SheetView.ConnectingView> {
    source: NodeElement;
    destination: NodeElement;
}
export interface MorphismElement extends SheetModel_.MorphismElement, SheetViewExtensions<SheetView.MorphismView> {
    source: VisualizerElement;
    destination: VisualizerElement;
}
export declare class SheetViewModel implements Updatable {
    private _model;
    private _view;
    constructor(model: SubscriptionProxy<SheetModel>);
    get model(): SheetModel;
    set model(model: SubscriptionProxy<SheetModel>);
    get view(): SheetView.View;
    set view(view: SheetView.View);
    get modelElements(): Map<string, SheetElement>;
    update(_field: string, value: unknown): void;
    addElement(element: SheetElement): void;
    viewportOrigin(): THREE.Vector2;
    viewportScale(): float;
    move(id: string, dx: number, dy: number): void;
    resize(id: string, dw: number, dh: number): void;
    addObjectAsElement(plainObject: SheetJSON, className: keyof SheetModel_.ConcreteSheetTypes): SheetElement;
    removeElement(element: SheetElement): void;
    getVisualizerJSON(id: string): unknown;
    updateVisualizer(id: string, json: unknown): void;
}
export {};

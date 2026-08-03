import { AbstractDiagramDisplay } from './AbstractDiagramDisplay.js';
import * as THREE from '../lib/externals.js';
import type { CayleyDiagramModel, POV } from './CayleyDiagramModel.ts';
import type { Group } from './Group.ts';
import type { Updatable, SubscriptionProxy } from './GEUtils.ts';
import type { AbstractDiagramDisplayOptions } from './AbstractDiagramDisplay.ts';
export type SymmetryObjectViewOptions = {
    group?: Group;
    diagramName?: string;
} & AbstractDiagramDisplayOptions;
type PathType = {
    vertices: THREE.Vector3[];
    color: color;
};
type SymmetryObjectLayout = {
    pov: POV;
    spheres: {
        position: THREE.Vector3;
        radius: float;
        color: color;
    }[];
    paths: PathType[];
};
export declare class SymmetryObjectViewModel implements Updatable {
    #private;
    get group(): Group;
    get view(): AbstractDiagramDisplay;
    get model(): CayleyDiagramModel;
    setModel(model: SubscriptionProxy<CayleyDiagramModel>): void;
    setView(view: AbstractDiagramDisplay): void;
    updateModel(field: string, value: any): void;
    update(field: string, value: any): void;
    resize(): void;
    showGraphic(): void;
    getImage(): HTMLImageElement;
    draw(group: Group, diagramName: string): void;
}
export declare function createSymmetryObjectThumbnailView(options?: SymmetryObjectViewOptions): SymmetryObjectViewModel;
export declare function createSymmetryObjectView(model: SubscriptionProxy<CayleyDiagramModel>, options?: SymmetryObjectViewOptions): SymmetryObjectViewModel;
export declare function layoutSymmetryObject(group: Group, symmetryObjectName: string): SymmetryObjectLayout;
export {};

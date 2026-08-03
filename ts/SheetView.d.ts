export declare let graphicRect: DOMRect;
export declare let zoomFactor: number;
export declare function init(): void;
export declare function modelToDisplay(pt: any): any;
export declare function displayToModel(pt: any): any;
export declare function fromEvent(event: any): any;
export declare function pan(dx: any, dy: any): void;
export declare function zoom(scaleFactor: any): void;
export declare function redrawAll(): void;
export declare function redrawLinksFor(modelElement: any): void;
export declare class View {
    #private;
    viewModel: any;
    viewElements: Map<any, any>;
    constructor(viewModel: any, rootElement: any);
    get zoomFactor(): number;
    viewportOrigin(): any;
    viewportScale(): number;
    addElement(modelElement: any): void;
    removeElement(modelElement: any): void;
    clear(): void;
    moveElement(modelElement: any): void;
    resizeElement(modelElement: any): void;
    getVisualizerJSON(modelElement: any): any;
    updateVisualizer(modelElement: any, json: any): void;
}

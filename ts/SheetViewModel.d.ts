export { SheetViewModel };
declare class SheetViewModel {
    #private;
    constructor(model: any);
    get model(): any;
    set model(model: any);
    get view(): any;
    set view(view: any);
    get modelElements(): any;
    update(field: any, value: any): void;
    addElement(element: any): void;
    viewportOrigin(): any;
    viewportScale(): any;
    move(id: any, dx: any, dy: any): void;
    resize(id: any, dw: any, dh: any): void;
    addObjectAsElement(plainObject: any, className: any): any;
    removeElement(element: any): void;
    getVisualizerJSON(id: any): any;
    updateVisualizer(id: any, json: any): void;
}

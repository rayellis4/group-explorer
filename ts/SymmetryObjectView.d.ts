export { layoutSymmetryObject, createSymmetryObjectThumbnailView, createSymmetryObjectView };
declare class SymmetryObjectViewModel {
    #private;
    get group(): any;
    get view(): any;
    get model(): any;
    setModel(model: any): void;
    setView(view: any): void;
    updateModel(field: any, value: any): void;
    update(field: any, value: any): void;
    resize(): void;
    showGraphic(): void;
    getImage(): any;
    draw(group: any, diagramName: any): void;
}
declare function createSymmetryObjectThumbnailView(options?: {}): SymmetryObjectViewModel;
declare function createSymmetryObjectView(model: any, options?: {}): SymmetryObjectViewModel;
declare function layoutSymmetryObject(group: any, symmetryObjectName: any): {
    pov: {
        position: any;
        up: any;
    };
    spheres: any;
    paths: any;
};

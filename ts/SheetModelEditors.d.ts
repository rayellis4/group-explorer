export { TextEditor, ConnectionEditor, MorphismEditor, RemoteEditor };
declare class SheetElementEditor {
    modelElement: any;
    initialJSON: any;
    location: any;
    editor: Element;
    constructor(modelElement: any, dialogHTML: any, location: any);
    onInput(event: any): void;
    commit(): void;
    destroy(): void;
    rollback(): void;
    updateModelElement(): void;
    exit(): void;
}
declare class TextEditor extends SheetElementEditor {
    constructor(textElement: any, location: any);
    updateModelElement(): void;
}
declare class ConnectionEditor extends SheetElementEditor {
    constructor(connectingElement: any, location: any);
    updateModelElement(): void;
}
declare class MorphismEditor extends SheetElementEditor {
    constructor(morphismElement: any, location: any);
    updateModelElement(): void;
    rollback(): void;
    fillDefiningPairs(): void;
    onInput(event: any): void;
    setupMorphismAdd(): void;
    showDomainChoices(): void;
    showCodomainChoices(): void;
    setupDomainChoice(codomainSelection: any): void;
    setupCodomainChoice(domainSelection: any): void;
    updatePreview(): void;
    addDefiningPair(): void;
    removeDefiningPair(domainElement: any): void;
    pushSourceThroughMorphism(): void;
    pullTargetThroughMorphism(): void;
}
declare class RemoteEditor {
    #private;
    static editElement(modelElement: any): void;
    static pushToEditor(elementId: any, json: any): void;
}

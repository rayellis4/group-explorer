import type { SheetElement, TextElement, VisualizerElement, ConnectingElement, MorphismElement } from './SheetViewModel.ts';
import type * as SheetModel from './SheetModel.ts';
declare abstract class SheetElementEditor {
    modelElement: SheetElement;
    initialJSON: SheetModel.SheetJSON;
    location: NumberLocation;
    editor: HTMLElement;
    constructor(modelElement: SheetElement, dialogHTML: html, location: NumberLocation);
    onInput(event: Event): void;
    commit(): void;
    destroy(): void;
    rollback(): void;
    abstract updateModelElement(): void;
    exit(): void;
}
export declare class TextEditor extends SheetElementEditor {
    modelElement: TextElement;
    constructor(textElement: TextElement, location: NumberLocation);
    updateModelElement(): void;
}
export declare class ConnectionEditor extends SheetElementEditor {
    modelElement: ConnectingElement;
    constructor(connectingElement: ConnectingElement, location: NumberLocation);
    updateModelElement(): void;
}
export declare class MorphismEditor extends SheetElementEditor {
    modelElement: MorphismElement;
    sourceHighlightSnapshot: Maybe<color>[];
    destHighlightSnapshot: Maybe<color>[];
    constructor(morphismElement: MorphismElement, location: NumberLocation);
    updateModelElement(): void;
    rollback(): void;
    fillDefiningPairs(): void;
    onInput(event: Event): void;
    setupMorphismAdd(): void;
    showDomainChoices(): void;
    showCodomainChoices(): void;
    setupDomainChoice(codomainSelection: groupElement): void;
    setupCodomainChoice(domainSelection: groupElement): void;
    updatePreview(): void;
    addDefiningPair(): void;
    removeDefiningPair(domainElement: groupElement): void;
    pushSourceThroughMorphism(): void;
    pullTargetThroughMorphism(): void;
}
export declare class RemoteEditor {
    private static messageHandler;
    private static editorWindows;
    private static editPageURLs;
    static editElement(modelElement: VisualizerElement & {
        onVisualizerChange?: (json: unknown) => void;
    }): void;
    static pushToEditor(elementId: string, json: unknown): void;
}
export {};

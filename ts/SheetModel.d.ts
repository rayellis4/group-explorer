export { SheetModel, createNewSheet, loadPassedSheet, sheetPanelWidth, fittedFontSize };
declare function sheetPanelWidth(): number;
declare function fittedFontSize(html: any, maxWidth: any, min?: number, max?: number): string;
declare class SheetModel {
    #private;
    nextId: number;
    get sheetElements(): Map<any, any>;
    toJSON(): any[];
    fromJSON(json: any): void;
    addObjectAsElement(plainObject: any, className: any): any;
    canConnect(linkType: any, source: any, destination: any): any;
}
declare function createNewSheet(arg: any): void;
declare function loadPassedSheet(sheetModel: any): Promise<any>;

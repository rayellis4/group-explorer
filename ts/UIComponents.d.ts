export { positionElement, // only used in GroupTableUI
makeFixedMenu, makeDetachedMenu, makeTooltip, makeMockSelect, makeDialog };
declare function makeFixedMenu(element: any, callback: any): void;
declare function makeDetachedMenu(html: any, location: any): Promise<unknown>;
declare function makeTooltip(html: any, location: any): void;
declare function makeMockSelect(rootElement: any, choices: any): Promise<unknown>;
declare function makeDialog(html: any, location: any, modalCallback?: (ev: any) => any): Element;
declare function positionElement(element: any, { clientX, clientY }: {
    clientX: any;
    clientY: any;
}): void;

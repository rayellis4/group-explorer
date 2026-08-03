interface StringLocation {
    clientX: string;
    clientY: string;
}
type ClientLocation = NumberLocation | StringLocation;
export declare function makeFixedMenu(element: HTMLElement, callback: (action: string, event: Event) => void): void;
export declare function makeDetachedMenu(html: html, location: ClientLocation): Promise<Maybe<string>>;
export declare function makeTooltip(html: html, location: ClientLocation): void;
export type mockSelectChoiceItem = {
    value: string;
    label?: html;
    selectedLabel?: html;
};
type mockSelectChoice = {
    header: html;
    choices: mockSelectChoice[];
} | mockSelectChoiceItem;
export declare function makeMockSelect(rootElement: HTMLElement, choices: mockSelectChoice[]): Promise<string>;
export declare function makeDialog(html: html, location: ClientLocation, modalCallback?: (event: Event) => void): HTMLElement;
export declare function positionElement(element: HTMLElement, { clientX, clientY }: ClientLocation): void;
export {};

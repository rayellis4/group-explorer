export declare class ControlPanel {
    controlPanelElement: HTMLElement;
    grabHandle: HTMLElement;
    controlContainer: HTMLElement;
    lastEvent: Event;
    constructor(controlPanel: HTMLElement);
    static addPanel(controlPanel: HTMLElement): void;
    addControllers(controls: HTMLElement[]): void;
    move(_startEvent: PointerEvent, previousEvent: PointerEvent, currentEvent: PointerEvent): void;
}

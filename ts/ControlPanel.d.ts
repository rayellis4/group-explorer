export declare class ControlPanel {
    controlPanelElement: any;
    grabHandle: HTMLElement | null;
    controlContainer: HTMLElement | null;
    lastEvent: any;
    constructor(controlPanel: any);
    static addPanel(controlPanel: any): void;
    addControllers(controls: any): void;
    move(_startEvent: any, previousEvent: any, currentEvent: any): void;
}

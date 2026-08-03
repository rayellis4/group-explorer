export type SelectCallback = (event: PointerEvent | MouseEvent) => void;
export declare function recognizeSelect(element: HTMLElement, callback: SelectCallback): void;
export type ContextMenuCallback = (event: PointerEvent) => void;
export type ContextMenuOptions = {
    returnOnLongTapTimeout?: boolean;
};
export declare function recognizeContextMenu(element: HTMLElement, callback: ContextMenuCallback, options?: ContextMenuOptions): void;
export type DragAndDropCallback = (startEvent: PointerEvent, previousEvent: PointerEvent, currentEvent: PointerEvent, isDrop: boolean) => void;
export type DragAndDropOptions = {
    returnOnLongTapTimeout?: boolean;
    rightClick?: boolean;
};
export declare function recognizeDragAndDrop(element: HTMLElement, callback: DragAndDropCallback, passedOptions?: DragAndDropOptions): void;
export type PinchCallback = (startEvent: TouchEvent, previousEvent: TouchEvent, currentEvent: TouchEvent, isFinal: boolean) => void;
export type WheelCallback = (event: WheelEvent) => void;
export type ZoomCallback = (scaleFactor: number, isFinal: boolean) => void;
export declare function recognizeZoom(element: HTMLElement, zoomCallback: ZoomCallback): void;
export type MoveResizeCallback = (deltaX: number, deltaY: number, deltaWidth: number, deltaHeight: number, isDrop?: boolean, movingElement?: Element) => void;
export type ResizeCoefficient = {
    l: number;
    t: number;
    w: number;
    h: number;
};
export declare function recognizeMoveResize(element: HTMLElement, callback: MoveResizeCallback): void;
export declare function isLongTap(startEvent: PointerEvent, endEvent: PointerEvent): boolean;

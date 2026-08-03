export { recognizeSelect, recognizeContextMenu, recognizeDragAndDrop, recognizeZoom, recognizeMoveResize, isLongTap };
declare function recognizeSelect(element: any, callback: any): void;
declare function recognizeContextMenu(element: any, callback: any, options?: {
    returnOnLongTapTimeout: boolean;
}): void;
declare function recognizeDragAndDrop(element: any, callback: any, passedOptions?: {}): void;
declare function recognizeZoom(element: any, zoomCallback: any): void;
declare function recognizeMoveResize(element: any, callback: any): void;
declare function isLongTap(startEvent: any, endEvent: any): boolean;

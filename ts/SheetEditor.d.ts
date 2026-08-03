export { broadcastChange, getInitialData, enableChangeBroadcast, listenForSheetUpdates };
declare let broadcastChange: () => void;
declare function getInitialData(): Promise<{
    elementId: any;
    json: any;
}>;
declare function enableChangeBroadcast(jsonGenerator: any): void;
declare function listenForSheetUpdates(fromJSONCallback: any): void;

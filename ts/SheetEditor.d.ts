export declare let broadcastChange: () => void;
export declare function getInitialData(): Promise<{
    elementId: string;
    json: unknown;
}>;
export declare function enableChangeBroadcast(jsonGenerator: () => {
    elementId: string;
    json: unknown;
}): void;
export declare function listenForSheetUpdates(fromJSONCallback: (json: any) => unknown): void;

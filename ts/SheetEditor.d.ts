import type { SubscriptionProxy } from './GEUtils.ts';
export declare function getInitialData(): Promise<{
    elementId: string;
    json: unknown;
}>;
export declare function enableModelChangeBroadcast(elementId: string, model: SubscriptionProxy<{
    toJSON: () => unknown;
}>, fields: string[]): void;
export declare function listenForSheetUpdates(fromJSONCallback: (json: any) => unknown): void;

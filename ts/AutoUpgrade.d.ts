export declare const EXTENDED_GROUP_PREFIX = "data:,//GE3/extended";
export type ExtendedManifestEntry = {
    presentation: string;
    gapid: string;
    gapname: string;
    names: string[];
    link?: string;
    phrase?: string;
};
export declare function isExtendedManifestEntry(arg: unknown): arg is ExtendedManifestEntry;
export declare function refreshGroupLibrary(baseURL: string): Promise<void>;
export declare function version(): string | null;
export declare function initialize(): Promise<void>;

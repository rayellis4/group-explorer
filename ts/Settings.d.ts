export type SettingsType = {
    showExtendedLt32?: boolean;
    showExtendedGe32?: boolean;
    showNotable?: boolean;
    showGenerated?: boolean;
};
type SettingsUpdate = {
    source: 'settings';
    values: SettingsType;
};
export declare function isSettingsUpdate(message: unknown): message is SettingsUpdate;
export declare function loadSettings(): Promise<void>;
export declare function getFilterConfig(): SettingsType;
export declare function showDialog(): void;
export {};

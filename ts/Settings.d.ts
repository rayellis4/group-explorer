export type SettingsType = {
    showExtendedLt32?: boolean;
    showExtendedGe32?: boolean;
    showNotable?: boolean;
    showGenerated?: boolean;
};
export declare function loadSettings(): Promise<void>;
export declare function getFilterConfig(): SettingsType;
export declare function showDialog(): void;

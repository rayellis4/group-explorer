export { getFilterConfig, loadSettings, showDialog };
declare function loadSettings(): Promise<void>;
declare function getFilterConfig(): {
    showExtendedLt32: boolean;
    showExtendedGe32: boolean;
    showNotable: boolean;
    showGenerated: boolean;
};
declare function showDialog(): void;

export type TableConfig = {
    visible: {
        [key: string]: boolean;
    };
    sort: {
        id: string;
        dir: string;
    };
};
type ConfigChangeCallback = (patch: {
    [key: string]: any;
}) => void;
export declare function addGestures(table: HTMLElement, { config, onConfigChange: callback }: {
    config: TableConfig;
    onConfigChange: ConfigChangeCallback;
}): void;
export {};

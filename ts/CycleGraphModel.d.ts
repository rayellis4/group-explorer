export declare class CycleGraphModel {
    group: any;
    highlightConfiguration: {
        highlightTypes: string[];
        saturation: number[];
        lightness: number[];
        hueOffset: number[];
    };
    highlightColors: never[][];
    highlightControl: null;
    constructor(group: any);
    toJSON(): {
        group_url: any;
        highlight_colors: never[][];
        highlight_control: any;
    };
    fromJSON(json: any): this;
}

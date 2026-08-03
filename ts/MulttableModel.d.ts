export declare class MulttableModel {
    group: any;
    highlightColors: any;
    highlightConfiguration: {
        highlightTypes: string[];
        saturation: number[];
        lightness: number[];
        hueOffset: number[];
    };
    organizingSubgroup: any;
    separation: any;
    coloration: any;
    colorReordering: any;
    elements: any;
    highlightControl: any;
    constructor(group: any);
    reset(): void;
    toJSON(): {
        group_url: any;
        highlight_colors: any;
        organizing_subgroup: any;
        separation: any;
        coloration: any;
        color_reordering: any;
        elements: any;
        highlight_control: any;
    };
    fromJSON(json: any): this;
}

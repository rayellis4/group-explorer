import { Group } from './Group.js';
export type MulttableColoration = 'rainbow' | 'grayscale' | 'none';
export type MulttableColorReordering = 'topRowFixed' | 'elementColorsFixed';
export type MulttableJSON = {
    group_url: string;
    highlight_colors?: Maybe<color>[][];
    highlight_control?: any;
    organizing_subgroup?: number;
    separation?: number;
    coloration?: MulttableColoration;
    color_reordering?: MulttableColorReordering;
    elements?: groupElement[];
};
export declare class MulttableModel {
    group: Group;
    highlightColors: Maybe<color>[][];
    highlightConfiguration: {
        highlightTypes: string[];
        saturation: number[];
        lightness: number[];
        hueOffset: number[];
    };
    organizingSubgroup: number;
    separation: number;
    coloration: 'rainbow' | 'grayscale' | 'none';
    colorReordering: 'topRowFixed' | 'elementColorsFixed';
    elements: groupElement[];
    highlightControl: any;
    constructor(group: Group);
    reset(): void;
    toJSON(): MulttableJSON;
    fromJSON(json: MulttableJSON): this;
}

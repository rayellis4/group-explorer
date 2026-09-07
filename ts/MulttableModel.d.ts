import { Serializable } from './GEUtils.js';
import { Group } from './Group.js';
import { HighlightControlJSON } from './HighlightControl.js';
export type MulttableColoration = 'rainbow' | 'grayscale' | 'none';
export type MulttableColorReordering = 'topRowFixed' | 'elementColorsFixed';
export type MulttableJSON = {
    group_url: string;
    highlight_colors?: Maybe<color>[][];
    highlight_control?: HighlightControlJSON;
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
    highlightControl: HighlightControlJSON | (object & Serializable<HighlightControlJSON>);
    constructor(group: Group);
    reset(): void;
    toJSON(): MulttableJSON;
    fromJSON(json: MulttableJSON): this;
}

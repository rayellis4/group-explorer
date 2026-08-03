import type { Group } from './Group.js';
import type { HighlightControlModelInterface } from './HighlightControl.js';
export type CycleGraphJSON = {
    group_url: string;
    highlight_colors?: Maybe<color>[][];
    highlight_control?: any;
};
export declare class CycleGraphModel implements HighlightControlModelInterface {
    group: Group;
    highlightColors: Maybe<color>[][];
    highlightConfiguration: {
        highlightTypes: string[];
        saturation: number[];
        lightness: number[];
        hueOffset: number[];
    };
    highlightControl: any;
    constructor(group: Group);
    reset(): void;
    toJSON(): CycleGraphJSON;
    fromJSON(json: CycleGraphJSON): this;
}

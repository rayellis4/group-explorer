import type { Group } from './Group.js';
import type { HighlightControlModelInterface, HighlightControlJSON } from './HighlightControl.js';
export type CycleGraphJSON = {
    group_url: string;
    highlight_colors?: Maybe<color>[][];
    highlight_control?: HighlightControlJSON;
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
    highlightControl: HighlightControlJSON | (object & Serializable<HighlightControlJSON>);
    constructor(group: Group);
    reset(): void;
    toJSON(): CycleGraphJSON;
    fromJSON(json: CycleGraphJSON): this;
}

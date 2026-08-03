import type { SubscriptionProxy } from './GEUtils.js';
import type { Group } from './Group.js';
export interface HighlightControlModelInterface {
    group: Group;
    highlightColors: Maybe<color>[][];
    highlightConfiguration: {
        highlightTypes: string[];
        saturation: number[];
        lightness: number[];
        hueOffset: number[];
    };
    highlightControl: any;
}
export declare function addControl(highlightControlElement: HTMLElement, modelProxy: SubscriptionProxy<HighlightControlModelInterface>): void;

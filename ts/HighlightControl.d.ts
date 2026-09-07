import type { SubscriptionProxy } from './GEUtils.js';
import type { HighlightControlModelInterface } from './HighlightControlViewModel.js';
export type { HighlightControlModelInterface, HighlightControlJSON } from './HighlightControlViewModel.ts';
export declare function addControl(highlightControlElement: HTMLElement, modelProxy: SubscriptionProxy<HighlightControlModelInterface>): void;

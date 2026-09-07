export { equals, fromRainbow, isTouchDevice, measureHTML, htmlToContext, escapeHTML, generateElements, createActionHandler, createModelProxy, countBy, isSerializable, };
export { version } from './AutoUpgrade.js';
declare function equals(a: any[], b: any[]): boolean;
declare function fromRainbow(hue: float, saturation?: float, lightness?: float, offset?: float): color;
declare function isTouchDevice(): boolean;
declare function measureHTML(html: html, style?: {
    [key: string]: string;
}): DOMRect;
declare function htmlToContext(html: html, style: {
    [key: string]: string;
}, context: CanvasRenderingContext2D, center: {
    x: number;
    y: number;
}): void;
declare function escapeHTML(string: string): Maybe<html>;
declare function generateElements(html: html): HTMLCollection;
declare function createActionHandler(element: Element, actionCallback: (arg: string) => void): void;
export interface Updatable {
    update(field: string, value: unknown): void;
}
export type SubscriptionProxy<T> = T & {
    $subscribe: (subscriber: Updatable, field: string) => void;
    $unsubscribe: (subscriber: Updatable, field: string) => void;
    $touch: (field: string) => void;
};
declare function createModelProxy<T extends object>(model: T): SubscriptionProxy<T>;
declare function countBy<T>(valueArray: T[], indexMap: (el: T) => number): number[];
export interface Serializable<T> {
    toJSON: () => T;
    fromJSON: (json: T) => void;
}
declare function isSerializable<T>(value: unknown): value is Serializable<T>;

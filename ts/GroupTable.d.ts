import type { Group } from './Group.ts';
export declare const IMAGE_SIZE = 96;
type Aux = {
    cayleyTitle: Maybe<string>;
};
export type sortComparator = (v1: string, v2: string) => number;
type ColumnDef = {
    id: string;
    label: string;
    headerHTML: string;
    headerClass?: string;
    defaultVisible: boolean;
    sortComparator?: sortComparator;
    cellHTML: (group: Group, aux: Aux) => string;
};
export declare const COLUMNS: ColumnDef[];
export declare function display(tableElement: HTMLElement, groupsToDisplay: Group[]): void;
export {};

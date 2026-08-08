import type { Group } from './Group.js';
export declare function findRelations(group: Group, generators?: groupElement[]): groupElement[][];
export declare function makePresentation(group: Group): string;
export declare function generateGroupFromPresentation(presentation: string): Maybe<{
    multtable: number[][];
    generators: groupElement[];
}>;
export declare function parseFormattedPresentation(presentation: string): [string[], string[]];

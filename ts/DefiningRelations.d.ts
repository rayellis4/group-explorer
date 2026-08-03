import { Group } from './Group.js';
export { findRelations, makePresentation, generateGroupFromPresentation, parseFormattedPresentation, GENERATED_GROUP_PREFIX, };
export { EXTENDED_GROUP_PREFIX } from './AutoUpgrade.js';
declare const GENERATED_GROUP_PREFIX = "data:,//GE3/generated";
declare function findRelations(group: Group, generators?: groupElement[]): groupElement[][];
declare function makePresentation(group: Group): string;
declare function generateGroupFromPresentation(presentation: string): Maybe<Group>;
declare function parseFormattedPresentation(presentation: string): [string[], string[]];

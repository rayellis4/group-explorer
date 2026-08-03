import { Group } from './Group.js';
export { findRelations, makePresentation, generateGroupFromPresentation, parseFormattedPresentation, GENERATED_GROUP_PREFIX, };
export { EXTENDED_GROUP_PREFIX } from './AutoUpgrade.js';
declare const GENERATED_GROUP_PREFIX = "data:,//GE3/generated";
declare function findRelations(group: any, generators?: any): any[][];
declare function makePresentation(group: any): string;
declare function generateGroupFromPresentation(presentation: any): Group | null;
declare function parseFormattedPresentation(presentation: any): any[];

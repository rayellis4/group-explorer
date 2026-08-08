import { Group } from './Group.js';
import type { GroupFileJSON } from './Group.js';
export { getAllGroups, getGroupsByOrder } from './GroupRegistry.js';
export declare const GENERATED_GROUP_PREFIX = "data:,//GE3/generated";
export { EXTENDED_GROUP_PREFIX } from './AutoUpgrade.js';
export declare function loadLibrary(): Promise<void>;
export declare function loadFromStoredGroups(storedGroups: {
    [key: string]: GroupFileJSON;
}): void;
export declare function deleteGroups(groups: Group[]): void;
export declare function getGroupByURL(url: string): Maybe<Group>;
export declare function loadFromPageURL(): Promise<Group>;
export declare function saveGroup(group: Maybe<Group>): void;
export declare function updateAllGroups(manifestURLs: string[]): Promise<void>;

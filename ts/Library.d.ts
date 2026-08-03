import { Group } from './Group.js';
import type { GroupFileJSON } from './Group.js';
export { allVisibleGroups, deleteGroups, getAllGroups, getGroupsByOrder, getGroupByURL, isEmpty, loadFromPageURL, loadFromStoredGroups, loadLibrary, saveGroup, updateAllGroups };
declare function loadLibrary(): Promise<void>;
declare function loadFromStoredGroups(storedGroups: {
    [key: string]: GroupFileJSON;
}): void;
declare function deleteGroups(groups: Group[]): void;
declare function getAllGroups(): Group[];
declare function allVisibleGroups(filterConfig: {
    [key: string]: any;
}): Group[];
declare function getGroupsByOrder(order: integer): Group[];
declare function getGroupByURL(url: string): Maybe<Group>;
declare function isEmpty(): boolean;
declare function loadFromPageURL(): Promise<Group>;
declare function saveGroup(group: Maybe<Group>): void;
declare function updateAllGroups(manifestURLs: string[]): Promise<void>;

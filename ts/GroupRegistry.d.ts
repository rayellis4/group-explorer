import type { Group } from './Group.js';
export { groups, getAllGroups, getGroupsByOrder, getVisibleGroups, };
export type GroupRegistryType = {
    [key: string]: Group;
};
declare const groups: GroupRegistryType;
declare function getAllGroups(): Group[];
declare function getGroupsByOrder(order: integer): Group[];
declare function getVisibleGroups(filterConfig: {
    [key: string]: any;
}): Group[];

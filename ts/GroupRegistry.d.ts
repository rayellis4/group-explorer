import type { Group } from './Group.ts';
import type { SettingsType } from './Settings.ts';
export { groups, getAllGroups, getGroupsByOrder, getVisibleGroups, };
export type GroupRegistryType = {
    [key: string]: Group;
};
declare const groups: GroupRegistryType;
declare function getAllGroups(): Group[];
declare function getGroupsByOrder(order: integer): Group[];
type filterType = {
    groupVisibility?: {
        [key: html]: 'shown' | 'hidden';
    };
} & SettingsType;
declare function getVisibleGroups(filterConfig: filterType): Group[];

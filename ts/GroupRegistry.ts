/*
# GroupRegistry

Owns the in-memory collection of groups and exposes read-only queries over it.

This is a leaf module: it has no dependency on Library, DefiningRelations, or
IsomorphicGroups, so all three can depend on it without creating a cycle.
Library.js is the only module that writes to the registry (via the `groups`
export) -- DefiningRelations and IsomorphicGroups only ever read from it.

Method overview:
 * getAllGroups -- return array of all groups in the registry
 * getGroupsByOrder -- return array of groups in the registry of a given order

```js
*/

import type { Group } from './Group.ts'
import type { SettingsType } from './Settings.ts'

export {
   groups,
   getAllGroups,
   getGroupsByOrder,
   getVisibleGroups,
}

export type GroupRegistryType = {[key: string]: Group}

const groups: GroupRegistryType = {}

// return array of all groups in the registry
function getAllGroups (): Group[] {
   return Object.values(groups)
}

// return array of groups in the registry of the given order
function getGroupsByOrder (order: integer): Group[] {
   return Object.values(groups).filter((group) => group.order == order)
}

// return groups visible under the given filter config (from Settings.getFilterConfig())
type filterType = { groupVisibility?: { [key: html]: 'shown' | 'hidden' } } & SettingsType
function getVisibleGroups (filterConfig: filterType): Group[] {
   const groupVisibility = filterConfig.groupVisibility ?? {}
   return getAllGroups().filter((group) => {
      const override = groupVisibility[group.URL]
      if (override != null) return override === 'shown'
      switch (group.library) {
         case 'extended':   return group.order < 32 ? filterConfig.showExtendedLt32 : filterConfig.showExtendedGe32
         case 'notable':    return filterConfig.showNotable
         case 'generated':  return filterConfig.showGenerated
         default:           return true  // group in default library
      }
   })
}

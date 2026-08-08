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

import type { Group } from './Group.js'

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
function getVisibleGroups (filterConfig: {[key: string]: any}): Group[] {
   const groupVisibility = filterConfig.groupVisibility ?? {}
   return getAllGroups().filter((group) => {
      const override = groupVisibility[group.URL]
      if (override != null) return override === 'shown'
      const lib = group.library
      if (lib == null)                         return true
      if (lib === 'extended') return group.order < 32 ? filterConfig.showExtendedLt32 : filterConfig.showExtendedGe32
      if (lib === 'notable')                   return filterConfig.showNotable
      if (lib === 'generated')                 return filterConfig.showGenerated
      return true
   })
}

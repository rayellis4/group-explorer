/*
# Library

Class manages group definitions stored in localStorage

It is the sole writer of the registry; GroupRegistry is a leaf module
so [DefiningRelations](./DefiningRelations.ts.md) and
[IsomorphicGroups](./IsomorphicGroups.ts.md) can read it without a dependency cycle.

Group definitions are stored as JSON strings, keyed by the URL from which the
group was fetched, or the URI from which the group was generated.
The group objects created from these JSON strings are cached as key-value pairs
in library.

Method overview (* are exported):
 * absoluteURL -- get absolute URL from relative
 * dataToGroup -- make group object from JSON string, XML string
 * deleteGroups* -- remove groups from Library
 * decorateGeneratedGroup -- add some basic properties to generated group
 * formatGenerators -- format array of generators for use in generated group definition
 * formatRelators -- format array of relators for use in generated group definition
 * formatRelator -- format single relator for use in generated group definition
 * getGroupByURL* -- return group from library by URL, generating it is needed
 * getStoredGroups -- get group library from local store
 * loadFromPageURL* -- get groupURL from window.location.href and return Promise to load it
 * loadFromStoredGroups* -- populate in-memory library from object
 * loadLibrary* -- load library from object store
 * saveGroup* -- store group in Library
 * updateAllGroups* -- refresh remote groups from server

```js
*/

import { EXTENDED_GROUP_PREFIX } from './AutoUpgrade.js'
import { BitSet } from './BitSet.js'
import * as DefiningRelations from './DefiningRelations.js'
import { Group } from './Group.js'
import * as GroupRegistry from './GroupRegistry.js'
import * as IsomorphicGroups from './IsomorphicGroups.js'
import * as Log from './Log.js'
import * as StoredObjects from './StoredObjects.js'
import * as XMLGroup from './XMLGroup.js'

import type { GroupFileJSON } from './Group.js'
import type { Subgroup } from './Subgroup.js'

export { getAllGroups, getGroupsByOrder } from './GroupRegistry.js'

export const GENERATED_GROUP_PREFIX = "data:,//GE3/generated"
export {EXTENDED_GROUP_PREFIX} from './AutoUpgrade.js'

const library = GroupRegistry.groups

export async function loadLibrary () {
   const storedGroups = await getStoredGroups()
   Object.keys(library).forEach((key) => delete library[key])  // clear library
   Object.assign(library, storedGroups)
}

// Populate the in-memory library from a raw stored-groups object (used during DB migration,
// when the DB connection isn't available for a normal loadLibrary() call)
export function loadFromStoredGroups (storedGroups: unknown) {
   // FIXME: check for valid input -- it's coming from conversion
   Object.entries(storedGroups as Record<string, GroupFileJSON>).forEach(([key, value]) => {
      library[key] = Group.fromLocalCopyJSON(value)
   })
}

// get absolute URL from relative
function absoluteURL (url: string): string {
   return new URL(url, window.location.href).href
}

function dataToGroup (data: unknown, contentType: string = ''): Group {
  let group: Group
  if (typeof data === 'string' && data.startsWith('{')) {
     group = Group.fromGroupFileJSON(JSON.parse(data))
  } else if (typeof data === 'string' && data.startsWith('<!DOCTYPE groupexplorerml>')) {
     group = XMLGroup.fromGroupFileXML(data)
  } else if (contentType.includes('xml')) {
     group = XMLGroup.fromGroupFileXML(data as string)
  } else if (contentType.includes('json')) {
     group = Group.fromGroupFileJSON(data as GroupFileJSON)
  } else {
     throw (new Error('Unrecognizable data in Library:dataToGroup'))
  }

  return group
}

// delete array of groups from library and update local store
export function deleteGroups (groups: Group[]) {
   for (const group of groups) {
      delete library[group.URL]
      deletedGroupURLs.push(group.URL)
   }
   scheduleLocalStoreUpdate()
}

// Fill in name, definition, declared generators, and presentation-matching element
// representations for a freshly-generated group that has no isomorph already in the registry.
function decorateGeneratedGroup (
   group: Group,
   generatorNames: string[],
   relators: string[],
   generatorElements: groupElement[]
): void {
   const namePrefix = `A Generated Group of Order ${group.order}`
   const nameSuffix = Math.max(
      ...GroupRegistry.getGroupsByOrder(group.order)
         .filter((G) => G.name.startsWith(namePrefix))
         .map((G) => G.name.slice(namePrefix.length).match(/\d/))
         .map((match) => parseInt((match as RegExpMatchArray)[0])),
      -1)
   group.names = [namePrefix + ` (${nameSuffix + 1})`]
   group.shortName = `Generated_${group.order}`
   group.definition = `⟨${formatGenerators(generatorNames)} : ${formatRelators(relators)}⟩`
   group.notes = 'Generated from definition'
   group.declaredGenerators = []

   // put generators from group.subgroups first if it's shorter
   const groupAsSubgroup = group.subgroups.at(-1) as Subgroup
   if (groupAsSubgroup.generators.popcount() < generatorElements.length) {
      group.declaredGenerators.push(groupAsSubgroup.generators.toArray())
   }
   group.declaredGenerators.push(generatorElements)

   // generate element representations that match the presentation
   const reps: string[] = Array(group.order)
   reps[0] = generatorNames.includes('e')  // 'e' if it's not a generator; else 0 if group is Abelian, or 1 if not
      ? (group.isAbelian ? '0' : '1')
      : 'e'
   const queue: [groupElement, string][] = [[0, '']]
   const todo = new BitSet(group.order).setAll()
   todo.clear(0)
   while (todo.popcount() != 0) {
      const [el, rep]: [groupElement, string] = queue.shift() as [groupElement, string]
      for (let genIndex = 0; genIndex < generatorElements.length; genIndex++) {
         const el_x_gen = group.multtable[el][generatorElements[genIndex]]
         if (reps[el_x_gen] == null) {
            todo.clear(el_x_gen)
            reps[el_x_gen] = rep + generatorNames[genIndex]
            queue.push([el_x_gen, reps[el_x_gen]])
         }
      }
   }
   group.representations = [reps.map((rep) => formatRelator(rep))]
}

function formatGenerators (generators: string[]) {
   const formattedGenerators = generators
      .map((gen) => `<i>${gen}</i>`)
      .join(', ')

   return formattedGenerators
}

function formatRelators (relators: string[]) {
   const formattedRelators = relators
      .map((relator) => formatRelator(relator) + '=<wbr>')
      .join('') + '1'

   return formattedRelators
}

function formatRelator (relator: string) {
   const translatedRelator = []
   let currentChar = relator.charAt(0)
   let currentCount = 1
   for (let inx = 1; inx <= relator.length; inx++) {
      const char = relator.charAt(inx)
      if (char == currentChar) {
         currentCount++
      } else {
         translatedRelator.push(`<i>${currentChar.toLowerCase()}</i>`)
         if (currentChar == currentChar.toUpperCase()) {
            translatedRelator.push(`<sup>-${currentCount}</sup>`)
         } else if (currentCount > 1) {
            translatedRelator.push(`<sup>${currentCount}</sup>`)
         }
         currentChar = char
         currentCount = 1
      }
   }

   return translatedRelator.join('')
}

// returns group from library by URL, generating it if needed
export function getGroupByURL (url: string): Maybe<Group> {
   let group: Maybe<Group> = library[absoluteURL(url)]
   if (group == null) {
      const presentation = new URL(url).search.slice(1)
      if (url.startsWith(GENERATED_GROUP_PREFIX)) {
         const result = DefiningRelations.generateGroupFromPresentation(presentation)
         if (result != null) {
            const candidate = Group.fromMulttable(result.multtable)
            // library invariant: groups are unique up to isomorphism -- prefer an existing
            // match over decorating and saving a redundant generated duplicate
            const isomorphicGroup = IsomorphicGroups.find(candidate)
            if (isomorphicGroup != null) {
               group = isomorphicGroup
            } else {
               const [generatorNames, relators] = DefiningRelations.parseFormattedPresentation(presentation)
               decorateGeneratedGroup(candidate, generatorNames, relators, result.generators)
               candidate.library = 'generated'
               candidate.URL = url
               saveGroup(candidate)
               group = candidate
            }
         }
      } else if (url.startsWith(EXTENDED_GROUP_PREFIX)) {
         // extended-library groups are curated by presentation, not deduplicated against
         // isomorphic library entries -- each carries its own manifest metadata (GAP id, etc.)
         const result = DefiningRelations.generateGroupFromPresentation(presentation)
         if (result != null) {
            const candidate = Group.fromMulttable(result.multtable)
            const [generatorNames, relators] = DefiningRelations.parseFormattedPresentation(presentation)
            decorateGeneratedGroup(candidate, generatorNames, relators, result.generators)
            candidate.library = 'extended'
            candidate.URL = url
            saveGroup(candidate)
            group = candidate
         }
      }
   }

   return group
}

// Read group library from local store
async function getStoredGroups (): Promise<GroupRegistry.GroupRegistryType> {
   const storedGroupsJSON = ((await StoredObjects.getGroupLibrary()) || {}) as Record<string, GroupFileJSON>
   const storedGroups = {} as GroupRegistry.GroupRegistryType
   Object.entries(storedGroupsJSON).forEach(([key, value]) => storedGroups[key] = Group.fromLocalCopyJSON(value))

   return storedGroups
}

// get groupURL from page invocation and return promise for resolution from cache or download
export async function loadFromPageURL (): Promise<Group> {
   try {
      const hrefURL = new URL(window.location.href)
      const groupURL = hrefURL.searchParams.get('groupURL')
      let result: Maybe<Group> = null
      if (groupURL != null) {
         result = getGroupByURL(groupURL)
         if (result == null) {
            if (groupURL.startsWith(GENERATED_GROUP_PREFIX) || groupURL.startsWith(EXTENDED_GROUP_PREFIX)) {
               throw new Error(`Failed to generate group from URI "${groupURL}"`)
            } else {
               result = await downloadGroup(groupURL)
            }
         }
      } else if (hrefURL.searchParams.get('waitForMessage') != null) {
         result = await waitForGroupInMessage()
      } else {  // no groupURL, no waitForMessage
         throw new Error("error in URL: can't find groupURL query parameter")
      }

      return result as Group
   } catch (error: unknown) {
      Log.err(`Unable to load page from URL ${window.location.href}:\n${(error as Error).message}`)
      throw(error)
   }

   async function downloadGroup (url: string): Promise<Group> {
      const groupURL = absoluteURL(url)
      const result: Promise<Group> = new Promise((resolve, reject) => {
         window.fetch(groupURL)
            .then(async (response) => {
               try {
                  if (response.ok) {
                     const data = await response.text()
                     const contentType = response.headers.get('content-type') ?? ''
                     const remoteGroup = dataToGroup(data, contentType)
                     if (remoteGroup == null) {
                        reject(new Error(
                           `Error reading ${groupURL}: unknown content type ${contentType}`,
                           {cause: response}))
                     } else {
                        remoteGroup.lastModifiedOnServer = response.headers.get('last-modified')
                        remoteGroup.URL = groupURL
                        saveGroup(remoteGroup)
                        resolve(remoteGroup)
                     }
                  } else {
                     const errorMsg = `\nError fetching ${groupURL}` +
                        `\nReason: ${response.statusText || 'N/A'}` +
                        `\nHTTP status code: ${response.status || 'N/A'}`
                     reject(new Error(errorMsg, {cause: response}))
                  }
               } catch (parseError) {
                  reject(new Error(`Error parsing ${groupURL}`, {cause: parseError}))
               }
            })
            .catch((error: Error) => {
               throw new Error(`${error.name} on fetch from ${groupURL}`, {cause: error})
            })
      })

      return result
   }

   // FIXME: remove this function or test it
   function waitForGroupInMessage (): Promise<Group> {
      return new Promise((resolve, reject) => {
         /*
          * When this page is loaded in an iframe, the parent window can
          * indicate which group to load by passing the full JSON
          * definition of the group in a postMessage() call to this
          * window, with the format { type: 'load group', group: G },
          * where G is the JSON data in question.
          */
         window.addEventListener('message', function (event: MessageEvent<unknown>) {
            const eventData = event.data
            if (eventData == null) {
               Log.err('empty message received in Library.js:')
               Log.err(eventData)
               reject(new Error('empty message received in Library.js'))
            } else if (typeof eventData === 'object' && 'type' in eventData && eventData.type === 'load group') {
               const loadGroupMessage = eventData
               try {
                  if ('group' in loadGroupMessage && typeof loadGroupMessage.group === 'object') {
                     // FIXME: this does *NOT* work, it just keeps the compiler happy
                     const group = dataToGroup(loadGroupMessage.group as GroupFileJSON, 'json')
                     if (group != null) {
                        library[group.shortName] = group
                        resolve(group)
                     }
                  }
                  reject(new Error('unable to understand loadGroupMessage'))
               } catch (error) {
                  reject(error)
               }
            } else {
               Log.err('unknown message received in Library.js:')
               Log.err(eventData)
               reject(new Error('unknown message received in Library.js'))
            }
         }, false)
      })
   }
}

// updates library group definitions and schedules local store update
export function saveGroup (group: Maybe<Group>) {
   if (group != null) {
      if (library[group.URL] == null) {
         createdGroupURLs.push(group.URL)
      } else {
         updatedGroupURLs.push(group.URL)
      }
      library[group.URL] = group
   }
   scheduleLocalStoreUpdate()
}

type LibraryUpdate = {
   source: 'library',
   created: string[],
   updated: string[],
   deleted: string[]
}

export function isLibraryUpdate(message: unknown): message is LibraryUpdate {
   return message != null
      && typeof message === 'object'
      && 'source' in message
      && message.source === 'library'
      && Array.isArray((message as Record<string, unknown>).created)
      && Array.isArray((message as Record<string, unknown>).updated)
      && Array.isArray((message as Record<string, unknown>).deleted)
}

// schedule local store group library update
let savedTimeoutID: Maybe<number> = null
const createdGroupURLs: string[] = []
const updatedGroupURLs: string[] = []
const deletedGroupURLs: string[] = []
function scheduleLocalStoreUpdate () {
   if (savedTimeoutID != null) {
      window.clearTimeout(savedTimeoutID)
   }
   savedTimeoutID = window.setTimeout(async () => {
      savedTimeoutID = null
      let maybeMessage: Maybe<LibraryUpdate> = null
      if (createdGroupURLs.length != 0 || updatedGroupURLs.length != 0 || deletedGroupURLs.length != 0) {
         maybeMessage = {
            source: 'library',
            created: [...createdGroupURLs],
            updated: [...updatedGroupURLs],
            deleted: [...deletedGroupURLs]
         }
         createdGroupURLs.length = 0
         updatedGroupURLs.length = 0
         deletedGroupURLs.length = 0
      }
      await StoredObjects.saveGroupLibrary(library)  // wait for store to complete before exiting
      if (maybeMessage != null) {
         const channel = new BroadcastChannel('GE3-channel')
         channel.postMessage(maybeMessage)
         channel.close()
      }
   })
}

// Update all groups in library and from the provided manifest URL list
export async function updateAllGroups (manifestURLs: string[]) {
   // replace latest group definitions from server in library
   await loadLibrary()
   const updateGroup = async (groupURL: string): Promise<void> => {
      const localGroup = getGroupByURL(groupURL)

      const options: RequestInit = { cache: 'no-cache', mode: 'no-cors' }
      if (localGroup?.lastModifiedOnServer != null) {
         options.headers = { 'If-Modified-Since': localGroup.lastModifiedOnServer }
      }

      const response: Response = await window.fetch(groupURL, options)

      if (response.status == 200) {  // response status == 304 if not modified
         const text = await response.text()
         const freshGroup = dataToGroup(text)
         freshGroup.lastModifiedOnServer = response.headers.get('last-modified')
         freshGroup.URL = groupURL

         // preserve user customization
         if (localGroup?.custom != null) {
            Object.assign(freshGroup.custom, localGroup.custom)
         }

         library[groupURL] = freshGroup
      }
   }

   // Collect URLs from the current library and the provided manifest URLs and update them
   await loadLibrary()

   const allURLs: Set<string> = new Set()
   Object.values(library || {}).filter((group) => !group.URL.startsWith('data:')).forEach((group) => allURLs.add(group.URL))
   manifestURLs.forEach((url) => allURLs.add(url))

   // complete updates
   await Promise.all(Array.from(allURLs).map((url) => updateGroup(url)))

   // and save library
   await StoredObjects.saveGroupLibrary(library)
}

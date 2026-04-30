// @flow

/*
 * Class manages group definitions stored in localStorage
 *
 * Group definitions are stored as JSON strings, keyed by the URL from which the
 * group was fetched, or the URN from which the group was generated.
 * The group objects created from these JSON strings are cached as key-value pairs
 * in library.
 *
 * Method overview:
 *   absoluteURL -- get absolute URL from relative
 *   dataToGroup -- make group object from JSON string, XML string
 *   deleteGroups -- remove groups from Library
 *   getAllGroups -- return array of groups from Library
 *   getGroupByURL -- return group from Library
 *   getStoredGroups -- get group library from local store
 *   isEmpty -- true if Library contains no groups
 *   loadFromPageURL -- get groupURL from window.location.href and return Promise to load it
 *   saveGroup -- store group in Library
 *   saveLibrary -- save library to local store
 *   updateAllGroups -- refresh remote groups from server
 */

import * as DefiningRelations from './DefiningRelations.js'
import {Group} from './Group.js'
import * as IsomorphicGroups from './IsomorphicGroups.js'
import * as Log from './Log.js'
import * as StoredObjects from './StoredObjects.js'
import * as XMLGroup from './XMLGroup.js'

export {
   deleteGroups,
   getAllGroups,
   getGroupsByOrder,
   getGroupByURL,
   isEmpty,
   loadFromPageURL,
   loadFromStoredGroups,
   loadLibrary,
   saveGroup,
   updateAllGroups
}

/*::
import type { MSG_loadGroup } from './SheetModel.js'
export type libraryType = {[key: string]: Group}
*/

let library /*: libraryType */ = {}

async function loadLibrary () {
   library = await getStoredGroups()
}

// Populate the in-memory library from a raw stored-groups object (used during DB migration,
// when the DB connection isn't available for a normal loadLibrary() call)
function loadFromStoredGroups (storedGroups /*: {[key: string]: any} */) {
   Object.entries(storedGroups).forEach(([key, value]) => {
      library[key] = Group.fromLocalCopyJSON(value)
   })
}

// get absolute URL from relative
function absoluteURL (url /*: string */) /*: string */ {
   return new URL(url, window.location.href).href
}

function dataToGroup (data /*: any */, contentType /*: string */ = '') /*: Group */ {
  let group /*: Group */
  if (typeof data === 'string' && data.startsWith('{')) {
     group = Group.fromGroupFileJSON(JSON.parse(data))
  } else if (typeof data === 'string' && data.startsWith('<!DOCTYPE groupexplorerml>')) {
     group = XMLGroup.fromGroupFileXML(data)
  } else if (contentType.includes('xml')) {
     group = XMLGroup.fromGroupFileXML(data)
  } else if (contentType.includes('json')) {
     group = Group.fromGroupFileJSON(JSON.parse(data))
  } else {
     throw (new Error('Unrecognizable data in Library:dataToGroup'))
  }

  return group
}

// delete array of groups from library and update local store
function deleteGroups (groups /*: Array<Group> */) {
   for (const group of groups) {
      delete library[group.URL]
   }
   scheduleLocalStoreUpdate()
}

// return array of groups from library
function getAllGroups () /*: Array<Group> */ {
   return ((Object.values(library) /*: any */) /*: Array<Group> */)
}

function getGroupsByOrder (order /*: integer */) /*: Array<Group> */ {
   return Object.values(library).filter((group) => group.order == order)
}

// returns group from library by URL, generating it if needed
function getGroupByURL (url /*: string */) /*: ?Group */ {
   let group /*: ?Group */ = library[absoluteURL(url)]
   if (group == null && url.startsWith(DefiningRelations.GENERATED_GROUP_PREFIX)) {
      const presentation = new URL(url).search.slice(1)
      group = DefiningRelations.generateGroupFromPresentation(presentation)
      saveGroup(group)
   }

   return group
}

// Read group library from local store
async function getStoredGroups () /*: Promise<libraryType> */ {
   const storedGroups = (await StoredObjects.getGroupLibrary()) || {}
   Object.entries(storedGroups).forEach(([key, value]) => storedGroups[key] = Group.fromLocalCopyJSON(value))

   return storedGroups
}

// return 'true' if library is empty
function isEmpty () /*: boolean */ {
   return Object.keys(library).length === 0
}

// get groupURL from page invocation and return promise for resolution from cache or download
async function loadFromPageURL () /*: Promise<Group> */ {
   const hrefURL = new URL(window.location.href)
   const groupURL = hrefURL.searchParams.get('groupURL')
   let result
   if (groupURL != null) {
      const group = getGroupByURL(groupURL)
      if (group == null) {
         result = downloadGroup(groupURL)
      } else if (groupURL.startsWith(DefiningRelations.GENERATED_GROUP_PREFIX)) {
         const maybeIsomorphicGroup = IsomorphicGroups.find(group)
         if (maybeIsomorphicGroup == null) {
            result = group
         } else {
            deleteGroups([group])  // getGroupByURL will generate non-null group
            result = maybeIsomorphicGroup
         }
      } else {
         result = group
      }
   } else if (hrefURL.searchParams.get('waitForMessage') !== null) {
      result = waitForGroupInMessage()
   }

   if (result == null) {
      throw new Error("error in URL: can't find groupURL query parameter")
   }

   return result

   async function downloadGroup (url /*: string */) /*: Promise<Group> */ {
      const groupURL = absoluteURL(url)
      const result /*: Promise<Group> */ = new Promise((resolve, reject) => {
         window.fetch(groupURL)
            .then(async (response) => {
               try {
                  if (response.ok) {
                     const data = await response.text()
                     const contentType = response.headers.get('content-type')
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
            .catch((error) => {
               throw new Error(`${error.name} on fetch from ${groupURL}`, {cause: error})
            })
      })

      return result
   }

   function waitForGroupInMessage () /*: Promise<Group> */ {
      return new Promise((resolve, reject) => {
         /*
          * When this page is loaded in an iframe, the parent window can
          * indicate which group to load by passing the full JSON
          * definition of the group in a postMessage() call to this
          * window, with the format { type: 'load group', group: G },
          * where G is the JSON data in question.
          */
         window.addEventListener('message', function (event /*: MessageEvent */) {
            const eventData = (event.data /*: any */)
            if (typeof eventData === 'undefined') {
               Log.err('empty message received in Library.js:')
               Log.err(eventData)
               reject(new Error('empty message received in Library.js'))
            } else if (eventData.type === 'load group') {
               const loadGroupMessage /*: MSG_loadGroup */ = eventData
               try {
                  if (typeof loadGroupMessage.group === 'object') {
                     const group = dataToGroup(loadGroupMessage.group, 'json')
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
function saveGroup (group /*: ?Group */) {
   if (group != null) {
      library[group.URL] = group
   }
   scheduleLocalStoreUpdate()
}

// schedule local store group library update
let savedTimeoutID /*: ?TimeoutID */ = null
function scheduleLocalStoreUpdate () {
   if (savedTimeoutID != null) {
      window.clearTimeout(savedTimeoutID)
   }
   savedTimeoutID = window.setTimeout(async () => {
      savedTimeoutID = null
      await StoredObjects.saveGroupLibrary(library)  // wait for store to complete before exiting
   })
}

// Update all groups in library and from the provided manifest URL list
async function updateAllGroups (manifestURLs /*: Array<string> */) {
   // replace latest group definitions from server in library
   await loadLibrary()
   const updateGroup = async (groupURL /*: string */) /*: Promise<void> */ => {
      const localGroup = getGroupByURL(groupURL)

      const options /*: RequestOptions */ = { cache: 'no-cache', mode: 'no-cors' }
      if (localGroup?.lastModifiedOnServer != null) {
         options.headers = { 'If-Modified-Since': localGroup.lastModifiedOnServer }
      }

      const response /*: Response */ = await window.fetch(groupURL, options)

      if (response.status == 200) {  // response status == 304 if not modified
         const text = await response.text()
         const freshGroup = dataToGroup(text)
         freshGroup.lastModifiedOnServer = response.headers.get('last-modified')
         freshGroup.URL = groupURL

         // preserve user customization
         freshGroup.custom = localGroup?.custom

         library[groupURL] = freshGroup
      }
   }

   // Collect URLs from the current library and the provided manifest URLs and update them
   await loadLibrary()

   const allURLs /*: Set<string> */ = new Set()
   Object.values(library || {}).filter((group) => !group.isGenerated).forEach((group) => allURLs.add(group.URL))
   manifestURLs.forEach((url) => allURLs.add(url))

   // complete updates
   await Promise.all(Array.from(allURLs).map((url) => updateGroup(url)))

   // and save library
   await StoredObjects.saveGroupLibrary(library)
}

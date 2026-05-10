// @flow

import * as Library from './Library.js'
import * as Log from './Log.js'
import {serializeSheet, deserializeSheet} from '../js/SheetSerialization.js'

export {
   // Group library routines
   getGroupLibrary,
   saveGroupLibrary,

   // Preference routines
   getPreference,
   setPreference,
   removePreference,

   // Stored sheet routines
   getStoredSheet,
   saveStoredSheet,
   removeStoredSheet,
   listStoredSheets,

   // Passed sheet routines
   getPassedSheet,
   setPassedSheet,

   // Passed JSON routines
   getPassedJSON,
   setPassedJSON,
}

/*::
import type {libraryType} from './Library.js'
 */

const DB_NAME = 'GE3'
const DB_VERSION = 2
const GENERAL_STORE = 'GeneralStore'
const SHEET_STORE = 'StoredSheets'
const SHEET_BACKUP_STORE = 'StoredSheetsBackup'  // created during migration, kept as safety net
const GROUP_LIBRARY_KEY = 'GroupLibrary'
const PREFERENCES_KEY = 'Preferences'
const PASSED_SHEET_KEY = 'PassedSheet'
const PASSED_JSON_KEY = 'PassedJSON'

async function getObjectStore (objectStoreName /*: string */, mode /*: 'readwrite' | 'readonly' */) {
   const db = await openDatabase()
   const result = db
      .transaction(objectStoreName, mode)  // if this fails then we might need to retry once
      .objectStore(objectStoreName)
   return result
}

async function openDatabase () /*: Promise<IDBDatabase> */ {
   return new Promise((resolve, reject) => {
      const request /*: IDBOpenDBRequest */ = window.indexedDB.open(DB_NAME, DB_VERSION)
      request.onupgradeneeded = async (ev) => {
         switch (ev.oldVersion) {
         case 0: await migrateToV1(ev)
         case 1: await migrateToV2(ev)
         }
      }
      request.onsuccess = (ev) => {
         const database /*: IDBDatabase */ = ev.target.result
         resolve(database)
      }
      request.onerror = (ev) => {
         Log.err(`Error opening indexedDB database GE3`)
         reject(ev)
      }
      request.onblocked = (ev) => {
         Log.err('indexedDB upgrade blocked -- close all GE3 tabs to continue')
         reject(ev)
      }
   })
}

function completeRequest (request /*: IDBRequest */) /*: Promise<mixed> */ {
  const result = new Promise((resolve, reject) => {
      request.transaction.oncomplete = () => resolve(request.result)
      request.transaction.onerror = () => reject(request.error)
   })

   return result
}

//////////
// Generic access routines
//////////

async function get (objectStoreName /*: string */, key /*: string */) /*: Promise<mixed> */ {
   const request = (await getObjectStore(objectStoreName, 'readonly')).get(key)
   return completeRequest(request)
}

async function put (objectStoreName /*: string */, key /*: string */, value /*: mixed */) {
   const request = (await getObjectStore(objectStoreName, 'readwrite')).put(value, key)
   return completeRequest(request)
}

async function remove (objectStoreName /*: string */, key /*: string */) {  // since 'delete' is a javascript keyword
   const request = (await getObjectStore(objectStoreName, 'readwrite')).delete(key)
   return completeRequest(request)
}

async function getAllKeys (objectStoreName /*: string */) /*: Promise<Array<string>> */ {
   const request = (await getObjectStore(objectStoreName, 'readonly')).getAllKeys()
   return ((completeRequest(request) /*: any */) /*: Promise<Array<string>> */)
}

//////////
// Group library routines
//////////

async function getGroupLibrary () /*: Promise<libraryType> */ {
   return ((get(GENERAL_STORE, GROUP_LIBRARY_KEY) /*: any */) /*: Promise<libraryType> */)
}

async function saveGroupLibrary (groupLibrary /*: libraryType */) /*: Promise<mixed> */ {
   return put(GENERAL_STORE, GROUP_LIBRARY_KEY, groupLibrary)
}

//////////
// Preference routines
//////////

// cache preferences locally to enable client code serialization
let preferences /*: {[key: string]: mixed} */ = {}

// workaround to avoid flow parse error on top-level await
;(async () => {
   preferences = ((await get(GENERAL_STORE, PREFERENCES_KEY) /*: any */) /*: {[key: string]: mixed} */) || {}
})()

function getPreference (key /*: string */) /*: mixed */ {
   return preferences[key]
}

function setPreference (key /*: string */, value /*: mixed */) /*: Promise<mixed> */ {
   preferences[key] = value
   return updatePreferences()
}

function removePreference (key /*: string */) /*: Promise<mixed> */ {
   delete(preferences[key])
   return updatePreferences()
}

async function updatePreferences () /*: Promise<mixed> */ {
   return put(GENERAL_STORE, PREFERENCES_KEY, preferences)
}

//////////
// Stored Sheet routines
//////////

async function getStoredSheet (sheetName /*: string */) /*: Promise<mixed> */ {
   const wrappedSheet = await get(SHEET_STORE, sheetName)
   return deserializeSheet(wrappedSheet)
}

async function saveStoredSheet (sheetName /*: string */, sheet /*: mixed */) /*: Promise<mixed> */ {
   const wrappedSheet = serializeSheet(sheet)
   return put(SHEET_STORE, sheetName, wrappedSheet)
}

async function removeStoredSheet (sheetName /*: string */) /*: Promise<mixed> */ {
   return remove(SHEET_STORE, sheetName)
}

async function listStoredSheets () /*: Promise<Array<string>> */ {
   return getAllKeys(SHEET_STORE)
}

//////////
// Passed Sheet routines
//////////

async function getPassedSheet () /*: Promise<mixed> */ {
   return get(GENERAL_STORE, PASSED_SHEET_KEY)
}

async function setPassedSheet (passedSheet /*: mixed */) /*: Promise<mixed> */ {
   return put(GENERAL_STORE, PASSED_SHEET_KEY, passedSheet)
}

//////////
// Passed JSON routine
//////////

async function getPassedJSON () /*: Promise<mixed> */ {
   return get(GENERAL_STORE, PASSED_JSON_KEY)
}

async function setPassedJSON (passedJSON /*: mixed */) /*: Promise<mixed> */ {
   return put(GENERAL_STORE, PASSED_JSON_KEY, passedJSON)
}

//////////
// Migration routines
//////////

// initializes indexedDB database ('migrate from revision 0')
// sets up IDBObjectStore and migrates data from localstore 'sheets' value
async function migrateToV1 (versionChangeEvent /*: any */) {
   // Create IDBObjectStore where Key is sheet name, Value is sheet JSON ($rev$ 2)
   versionChangeEvent.target.result.createObjectStore(SHEET_STORE)

   // get old stored sheets from localStorage
   // convert each stored sheet and save it to IndexedDB
   const oldSheetStore = localStorage.getItem('sheets')
   if (oldSheetStore != null) {
      const transaction = versionChangeEvent.target.transaction
      const storedSheets = transaction.objectStore(SHEET_STORE)
      const oldSheets = JSON.parse(oldSheetStore)
      if (Object.keys(oldSheets).length === 0) {
         localStorage.removeItem('sheets')
      } else {
         for (const [sheetName, oldSheet] of Object.entries(oldSheets)) {
            const newSheet = convertV0ToV1(oldSheet)  /* convertV0ToV1 == convertFromOldJSON */
            const putRequest = storedSheets.put(JSON.stringify(newSheet), sheetName)
            await new Promise((resolve, reject) => {
               putRequest.onsuccess = () => resolve(putRequest.result)
               putRequest.onerror = () => reject(putRequest.error)
            })
         }
      }
   }
}

// Create version 2 IndexedDB with SHEET_STORE
// Migrate 'groups' object from localStorage to GROUP_LIBRARY_KEY in GENERAL_STORE
async function migrateToV2 (ev /*: any */) {
   // clean up local storage from previous versions
   //   ;['mathjax_stylesheet', 'sheets', 'passedSheet'].forEach((key) => localStorage.removeItem(key))

   await migrateGroupsToV2(ev)
   await migrateSheetsToV2(ev)
}

async function migrateGroupsToV2 (ev /*: any */) {
   // create GENERAL_STORE objectStore
   const objectStore = ev.target.result.createObjectStore(GENERAL_STORE)

   // copy Groups from localStorage to indexedDB
   const groupString = localStorage.getItem('groups')
   const groups = (groupString == null) ? Object.create(null) : JSON.parse(groupString)

   Object.values(groups).forEach((G) => {
      // move name, other_names into names
      if ('name' in G) {
         G.names = [G.name]
         delete G.name
      }
      if ('other_names' in G) {
         G.names.push(...G.other_names)
         delete G.other_names
      }
      
      // user representations
      if ('userRepresentations' in G) {
         if (Array.isArray(G.userRepresentations) && G.userRepresentations.length > 0) {
            if (G.custom == null) {
               G.custom = {}
            }
            G.custom.representations = G.userRepresentations
         }
         delete G.userRepresentations
      }

      // notes
      if ('userNotes' in G) {
         if (G.userNotes != null && G.userNotes.length != 0) {
            if (G.custom == null) {
               G.custom = {}
            }
            G.custom.notes = G.userNotes
         }
         delete G.userNotes
      }

      // should have either _XML_generators (from XML) or generators (from JSON), but not both
      if (G._XML_generators != null) {   // convert _XML_generators to declaredGenerators
	 G.declaredGenerators = G._XML_generators
         delete G._XML_generators
      } else if (G.generators != null) { // convert generators to declaredGenerators
	 G.declaredGenerators = G.generators
         delete G.generators
      }

      // clean out all cached values
      delete G.conjugacyClasses
      delete G.elementOrders
      delete G.elementPowers
      delete G.elementPrimePowers
      delete G.elements
      delete G.inverses
      delete G.isAbelian
      delete G.isCyclic
      delete G.nonAbelianExample
      delete G.order
      delete G.orderClasses
      delete G.relations
      delete G._isSimple
      delete G._isSolvable
      delete G._subgroups
      delete G._orderClassSizes
      delete G._subgroupOrders
      delete G._cosetIndices
      delete G._indexInParentGroup
      delete G.CayleyThumbnail
      delete G.rowHTML
   })

   // convert format to that used in IndexedDB
   await new Promise((resolve, reject) => {
      const putRequest = objectStore.put(groups, GROUP_LIBRARY_KEY)
      putRequest.onsuccess = (ev) => resolve(ev.target.result)
      putRequest.onerror = (ev) => reject(ev)
   })

   // delete groups from localStorage
   // localStorage.removeItem('groups')
}

// use upgrade transaction's object store directly — cannot open a new connection during onupgradeneeded
async function migrateSheetsToV2 (ev /*: any */) {
   const transaction = ev.target.transaction
   const sheetStore = transaction.objectStore(SHEET_STORE)
   const backupStore = ev.target.result.createObjectStore(SHEET_BACKUP_STORE)

   // Library.getGroupByURL is needed by migrateSheetToV2 (for layoutCayleyDiagram).
   // The normal loadLibrary() path can't be used here (it would open a new DB connection).
   // Groups were just moved to GENERAL_STORE by migrateGroupsToV2 — read them directly
   // from the upgrade transaction and populate the in-memory library.
   const idbRequest = (request /*: IDBRequest */) => new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
   })
   const storedGroups = (await idbRequest(transaction.objectStore(GENERAL_STORE).get(GROUP_LIBRARY_KEY))) ?? {}
   Library.loadFromStoredGroups(storedGroups)

   const sheetNames = ((await idbRequest(sheetStore.getAllKeys()) /*: any */) /*: Array<string> */)
   for (const sheetName of sheetNames) {
      const v1SheetJSONString = await idbRequest(sheetStore.get(sheetName))
      await idbRequest(backupStore.put(v1SheetJSONString, sheetName))  // back up V1 before converting
      try {
         const v2SheetJSON = deserializeSheet(v1SheetJSONString)
         await idbRequest(sheetStore.put(serializeSheet(v2SheetJSON), sheetName))
      } catch (err) {
         Log.err(`migrateSheetsToV2: failed to migrate '${sheetName}', left unchanged: ${err}`)
      }
   }
}

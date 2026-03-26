// @flow

import {layoutCayleyDiagram} from './CayleyDiagramGenerator.js'
import * as Library from './Library.js'
import * as Log from './Log.js'
import * as MathML from './MathML.js'
import {THREE} from '../lib/externals.js'

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
   migrateSheetToV2,
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
   
function cleanColorList (colorList /*: Array<?color> */, nullish /*: ?color */ = null) /*: Array<?color> */ {
   const result /*: Array<?color> */ =
      (colorList == null) ? [] : colorList.map((color) => (color == nullish) ? null : color)

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
   return get(SHEET_STORE, sheetName)
}

async function saveStoredSheet (sheetName /*: string */, sheet /*: mixed */) /*: Promise<mixed> */ {
   const sheetJSON = (typeof sheet == 'string') ? migrateSheetToV2(sheet) : sheet
   return put(SHEET_STORE, sheetName, sheetJSON)
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
// Accumulated migration routines
//////////

// Create version 2 IndexedDB with SHEET_STORE
// Migrate 'groups' object from localStorage to GROUP_LIBRARY_KEY in GENERAL_STORE
async function migrateToV2 (ev /*: any */) {
   await migrateGroupsToV2(ev)
   await migrateSheetsToV2(ev)
}

async function migrateGroupsToV2 (ev /*: any */) {
   // create GENERAL_STORE objectStore
   const objectStore = ev.target.result.createObjectStore(GENERAL_STORE)

   // copy Groups from localStorage to indexedDB
   const groupString = localStorage.getItem('groups')
   const groups = (groupString == null) ? Object.create(null) : JSON.parse(groupString)

   await new Promise((resolve, reject) => {
      const putRequest = objectStore.put(groups, GROUP_LIBRARY_KEY)
      putRequest.onsuccess = (ev) => resolve(ev.target.result)
      putRequest.onerror = (ev) => reject(ev)
   })

   // delete groups from localStorage
   localStorage.removeItem('groups')
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
         const v2SheetJSON = migrateSheetToV2(v1SheetJSONString)
         await idbRequest(sheetStore.put(v2SheetJSON, sheetName))
      } catch (err) {
         Log.err(`migrateSheetsToV2: failed to migrate '${sheetName}', left unchanged: ${err}`)
      }
   }
}

// Exported sheet upgrade anticipates other use cases in SheetControl.js
// Can also get here from Sheet when importing from the clipboard or a file
function migrateSheetToV2 (sheet /*: mixed */) /*: mixed */ {
   if (typeof sheet != 'string') {
      return sheet
   }

   const jsonObjects = JSON.parse(sheet)

   const upgradeCandidates = jsonObjects
      .filter((jsonObject) =>
         jsonObject.visualizer != null && !('highlight_colors' in jsonObject.visualizer))
   if (upgradeCandidates.length == 0) {
      return jsonObjects
   }

   for (const jsonObject of upgradeCandidates) {
      const visualizer = jsonObject.visualizer
      delete jsonObject._visualizer  // delete _visualizer (legacy)
      delete jsonObject.isClean      // runtime flag, not persistent state

      let newHighlights /*: Array<Array<?color>> */ = []
      switch (jsonObject.className) {
      case 'CDElement': {
         visualizer.line_width = null  // material has changed meaning of 'line width', just use default
         newHighlights.push(
            cleanColorList(visualizer?.color_highlights, '#8c8c8c'),  // CayleyDiagramView.DEFAULT_NODE_COLOR
            cleanColorList(visualizer?.ring_highlights, null),
            cleanColorList(visualizer?.square_highlights, null)
         )
         delete visualizer.color_highlights
         delete visualizer.ring_highlights
         delete visualizer.square_highlights

         // convert camera: extract position from column-major matrix[12,13,14], use cameraUp for up
         const matrix = visualizer.cameraJSON?.object?.matrix
         const position = matrix
            ? {x: matrix[12], y: matrix[13], z: matrix[14]}
            : {x: 0, y: 0, z: 3}
         const up = visualizer.cameraUp ?? {x: 0, y: 1, z: 0}
         delete visualizer.cameraJSON
         delete visualizer.cameraUp

         // convert nodes: add color field
         const nodes = (visualizer.nodes ?? []).map((node) => ({...node, color: null}))
         const nodeMap = new Map(nodes.map((node) => [node.element, node]))

         // convert arrows: start_element/end_element → start_node/end_node
         const arrows = (visualizer.arrows ?? []).map(({start_element, end_element, ...rest}) => ({
            ...rest,
            start_node: nodeMap.get(start_element) ?? {element: start_element},
            end_node: nodeMap.get(end_element) ?? {element: end_element}
         }))

         const group = Library.getGroupByURL(visualizer.groupURL)
         const layout = layoutCayleyDiagram(
            group,
            visualizer.strategy_parameters,
            (visualizer.arrows ?? [])
               .filter((arrow) => arrow.start_element == 0)
               .map((arrow) => ({generator: arrow.generator, color: arrow.color})),
            visualizer.right_multiply,
            (visualizer.chunk == null || visualizer.chunk === 0) ? null : visualizer.chunk
         )
         const chunks = layout.chunks?.map((chunk) => {
            return {
               box: chunk.box,
               name: chunk.name,
               nodes: chunk.nodes.map((node) => nodeMap.get(node.element)),
               widths: chunk.widths
            }
         }) ?? []

         visualizer.view_state = {pov: {position, up}, nodes, arrows, chunks: chunks}
         delete visualizer.nodes
         delete visualizer.arrows

         // consolidate diagram layout fields into diagram_control
         // chunk: 0 in V1 UI meant 'no chunking' (same visual as trivial subgroup)
         visualizer.diagram_control = {
            diagram_name: visualizer.diagram_name ?? null,
            strategy_parameters: visualizer.strategy_parameters ?? [],
            chunk_subgroup_index: (visualizer.chunk == null || visualizer.chunk === 0)
               ? null : visualizer.chunk
         }
         delete visualizer.diagram_name
         delete visualizer.strategy_parameters
         delete visualizer.chunk

         // rename groupURL → group_url; drop fields not in new model
         visualizer.group_url = visualizer.groupURL
         delete visualizer.groupURL
         delete visualizer.right_multiply
         delete visualizer.sphere_base_radius
         break
      }
      case 'CGElement':
         newHighlights.push(
            cleanColorList(visualizer?.highlights?.background, null),
            cleanColorList(visualizer?.highlights?.border, null),
            cleanColorList(visualizer?.highlights?.top, null)
         )
         delete visualizer.highlights
         visualizer.group_url = visualizer.groupURL
         delete visualizer.groupURL
         break
      case 'MTElement':
         newHighlights.push(
            cleanColorList(visualizer?.highlights?.background, '#E5E5E5'),  // MulttableView.DEFAULT_BACKGROUND
            cleanColorList(visualizer?.highlights?.border, null),
            cleanColorList(visualizer?.highlights?.corner, null)
         )
         delete visualizer.highlights
         visualizer.group_url = visualizer.groupURL
         delete visualizer.groupURL
         break
      }
      visualizer.highlight_colors = newHighlights
   }

   return jsonObjects
}

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
            const newSheet = convertFromOldJSON(((oldSheet /*: any */) /*: Array<Obj> */))
            const putRequest = storedSheets.put(JSON.stringify(newSheet), sheetName)
            await new Promise((resolve, reject) => {
               putRequest.onsuccess = () => resolve(putRequest.result)
               putRequest.onerror = () => reject(putRequest.error)
            })
         }
      }
   }
}

/*
 * Convert from original Sheet JSON to current $rev$ 2
 *    Link:
 *      fromIndex -> sourceId
 *      toIndex -> destinationId
 *    Connection:
 *      useArrowhead -> hasArrowhead
 *      arrowheadSize not used?
 *    Morphism:
 *      showInjSurj -> showInjectionSurjection
 *      showDomAndCod -> showDomainAndCodomain
 *      arrowMargin was expressed in pixels, is now a percentage of the center-to-center distance
 */
function convertFromOldJSON (oldJSONArray /*: Array<Obj> */) /*: Array<Obj> */ {
  const pixelsPerModelUnit = Math.min(window.innerWidth, window.innerHeight - 71)
  for (let inx = 0; inx < oldJSONArray.length; inx++) {
    const json = oldJSONArray[inx]

    // account for padding in old wrapper, #graphic offset from window, different padding in heading
    json.x += 10
    json.y += 10 - SheetView.graphicRect.y - 6

    // convert arrowMargin from pixels offset to percentage of center-to-center distance
    if (json.arrowMargin !== undefined) {
      const from = oldJSONArray[json.fromIndex]
      const fromCenter = new THREE.Vector2(from.x + from.w / 2, from.y + from.h / 2)
      const to = oldJSONArray[json.toIndex]
      const toCenter = new THREE.Vector2(to.x + to.w / 2, to.y + to.h / 2)
      const centerToCenter = fromCenter.sub(toCenter).length() * pixelsPerModelUnit
      json.arrowMargin *= 1 / centerToCenter
    }

    // re-write fromIndex to sourceId, toIndex to destinationId
    if (json.fromIndex !== undefined) {
      json.sourceId = json.fromIndex + ''
      delete json.fromIndex
    }
    if (json.toIndex !== undefined) {
      json.destinationId = json.toIndex + ''
      delete json.toIndex
    }

    // re-write useArrowhead to hasArrowhead
    if (json.useArrowhead !== undefined) {
      json.hasArrowhead = json.useArrowhead
      delete json.useArrowhead
    }

    // re-write showInjSurj to showInjectionSurjection
    if (json.showInjSurj !== undefined) {
      json.showInjectionSurjection = json.showInjSurj
      delete json.showInjSurj
    }

    // re-write showDomAndCod to showDomainAndCodomain
    if (json.showDomAndCod !== undefined) {
      json.showDomainAndCodomain = json.showDomAndCod
      delete json.showDomAndCod
    }

    // convert node labels from MathML to HTML
    if (json.nodes != null) {
      for (const node of json.nodes) {
        node.label = MathML.toHTML(node.label)
      }
    }

    // convert old CDElement JSON
    if (json.className === 'CDElement' && json.camera_matrix != null) {
      const visualizer = {
        arrowhead_placement: json.arrowhead_placement,
        arrows: json.arrows,
        background: json.background,
        cameraJSON: {
          metadata: {
            type: 'Object'
          },
          object: {
            aspect: 1,
            far: 2000,
            filmGauge: 35,
            filmOffset: 0,
            focus: 10,
            fov: 45,
            layers: 1,
            matrix: json.camera_matrix,
            near: 0.1,
            type: 'PerspectiveCamera',
            zoom: 1
          }
        },
        cameraUp: new THREE.Vector3(...json.camera_up),
        chunk: json.chunk,
        color_highlights: json.color_highlights,
        fog_level: json.fog_level,
        groupURL: json.groupURL,
        label_scale_factor: json.label_scale_factor,
        line_width: json.line_width,
        nodes: json.nodes,
        right_multiply: json.right_multiply,
        ring_highlights: json.ring_highlights,
        sphere_base_radius: json.sphere_base_radius,
        sphere_scale_factor: json.sphere_scale_factor,
        square_highlights: json.square_highlights,
        strategy_parameters: json.strategy_parameters,
        zoom_level: json.zoom_level
      }
      json.visualizer = visualizer
      json.isClean = false
      delete json.arrowhead_placement
      delete json.arrows
      delete json.background
      delete json.camera_matrix
      delete json.camera_up
      delete json.chunk
      delete json.color_highlights
      delete json.fog_level
      delete json.label_scale_factor
      delete json.line_width
      delete json.nodes
      delete json.right_multiply
      delete json.ring_highlights
      delete json.sphere_base_radius
      delete json.sphere_scale_factor
      delete json.square_highlights
      delete json.strategy_parameters
      delete json.zoom_level
    }
  }

  return oldJSONArray
}

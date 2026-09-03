/*
# StoredObjects

Persists various objects in local IndexedDB database

```js
 */
import * as Library from './Library.js';
import * as Log from './Log.js';
import { deserializeSheet } from './SheetSerialization.js';
export { 
// Group library routines
getGroupLibrary, saveGroupLibrary, 
// Settings routines
getSettings, saveSettings, 
// Table config routines
getTableConfig, saveTableConfig, 
// Stored sheet routines
getStoredSheet, saveStoredSheet, removeStoredSheet, listStoredSheets, 
// Passed sheet routines
getPassedSheet, setPassedSheet, 
// Passed JSON routines
getPassedJSON, setPassedJSON, };
const DB_NAME = 'GE3';
const DB_VERSION = 2;
const GENERAL_STORE = 'GeneralStore';
const SHEET_STORE = 'StoredSheets';
const SHEET_BACKUP_STORE = 'StoredSheetsBackup'; // created during migration, kept as safety net
const GROUP_LIBRARY_KEY = 'GroupLibrary';
const SETTINGS_KEY = 'Settings';
const PASSED_SHEET_KEY = 'PassedSheet';
const PASSED_JSON_KEY = 'PassedJSON';
const TABLE_CONFIG_KEY = 'TableConfig';
async function getObjectStore(objectStoreName, mode) {
    const db = await openDatabase();
    const result = db
        .transaction(objectStoreName, mode)
        .objectStore(objectStoreName);
    return result;
}
async function openDatabase() {
    return new Promise((resolve, reject) => {
        const openRequest = window.indexedDB.open(DB_NAME, DB_VERSION);
        openRequest.onupgradeneeded = async (ev) => {
            switch (ev.oldVersion) {
                case 0: await migrateToV1(openRequest);
                case 1: await migrateToV2(openRequest);
            }
        };
        openRequest.onsuccess = (_ev) => {
            const database = openRequest.result;
            resolve(database);
        };
        openRequest.onerror = (ev) => {
            Log.err(`Error opening indexedDB database GE3`);
            reject(ev);
        };
        openRequest.onblocked = (ev) => {
            Log.err('indexedDB upgrade blocked -- close all GE3 tabs to continue');
            reject(ev);
        };
    });
}
function completeRequest(request) {
    const result = new Promise((resolve, reject) => {
        const transaction = request.transaction;
        if (transaction != null) {
            transaction.oncomplete = () => resolve(request.result);
            transaction.onerror = () => reject(request.error);
        }
        else {
            reject(new Error('failed to get IndexeddDB transaction'));
        }
    });
    return result;
}
//////////
// Generic access routines
//////////
async function get(objectStoreName, key) {
    const request = (await getObjectStore(objectStoreName, 'readonly')).get(key);
    return completeRequest(request);
}
async function put(objectStoreName, key, value) {
    const request = (await getObjectStore(objectStoreName, 'readwrite')).put(value, key);
    return completeRequest(request);
}
async function remove(objectStoreName, key) {
    const request = (await getObjectStore(objectStoreName, 'readwrite')).delete(key);
    return completeRequest(request);
}
async function getAllKeys(objectStoreName) {
    const request = (await getObjectStore(objectStoreName, 'readonly')).getAllKeys();
    return completeRequest(request);
}
//////////
// Group library routines
//////////
async function getGroupLibrary() {
    return get(GENERAL_STORE, GROUP_LIBRARY_KEY);
}
async function saveGroupLibrary(groupLibrary) {
    return put(GENERAL_STORE, GROUP_LIBRARY_KEY, groupLibrary);
}
//////////
// Settings routines
//////////
function getSettings() {
    return get(GENERAL_STORE, SETTINGS_KEY);
}
function saveSettings(settings) {
    return put(GENERAL_STORE, SETTINGS_KEY, settings);
}
//////////
// Table config routines
//////////
function getTableConfig() {
    return get(GENERAL_STORE, TABLE_CONFIG_KEY);
}
function saveTableConfig(config) {
    return put(GENERAL_STORE, TABLE_CONFIG_KEY, config);
}
//////////
// Stored Sheet routines
//////////
async function getStoredSheet(sheetName) {
    return get(SHEET_STORE, sheetName);
}
async function saveStoredSheet(sheetName, sheet) {
    return put(SHEET_STORE, sheetName, sheet);
}
async function removeStoredSheet(sheetName) {
    return remove(SHEET_STORE, sheetName);
}
async function listStoredSheets() {
    return getAllKeys(SHEET_STORE);
}
//////////
// Passed Sheet routines
//////////
async function getPassedSheet() {
    return get(GENERAL_STORE, PASSED_SHEET_KEY);
}
async function setPassedSheet(passedSheet) {
    return put(GENERAL_STORE, PASSED_SHEET_KEY, passedSheet);
}
//////////
// Passed JSON routine
//////////
async function getPassedJSON() {
    return get(GENERAL_STORE, PASSED_JSON_KEY);
}
async function setPassedJSON(passedJSON) {
    return put(GENERAL_STORE, PASSED_JSON_KEY, passedJSON);
}
//////////
// Migration routines
//////////
// initializes indexedDB database ('migrate from revision 0')
// sets up IDBObjectStore and migrates data from localstore 'sheets' value
async function migrateToV1(openRequest) {
    // Create IDBObjectStore where Key is sheet name, Value is sheet JSON ($rev$ 2)
    openRequest.result.createObjectStore(SHEET_STORE);
    // get old stored sheets from localStorage
    // convert each stored sheet and save it to IndexedDB
    const oldSheetStore = localStorage.getItem('sheets');
    if (oldSheetStore != null) {
        const oldSheets = JSON.parse(oldSheetStore);
        if (Object.keys(oldSheets).length === 0) {
            localStorage.removeItem('sheets');
        }
        else {
            const transaction = openRequest.transaction; // not sure what to do if it fails
            const newSheetStore = transaction.objectStore(SHEET_STORE);
            for (const [sheetName, oldSheet] of Object.entries(oldSheets)) {
                const newSheet = deserializeSheet(oldSheet); // CHECKME against type of v0 stored sheet
                const putRequest = newSheetStore.put(JSON.stringify(newSheet), sheetName);
                await new Promise((resolve, reject) => {
                    putRequest.onsuccess = () => resolve(putRequest.result);
                    putRequest.onerror = () => reject(putRequest.error);
                });
            }
        }
    }
}
// Create version 2 IndexedDB with SHEET_STORE
// Migrate 'groups' object from localStorage to GROUP_LIBRARY_KEY in GENERAL_STORE
async function migrateToV2(openRequest) {
    // clean up local storage from previous versions
    //   ;['mathjax_stylesheet', 'sheets', 'passedSheet'].forEach((key) => localStorage.removeItem(key))
    await migrateGroupsToV2(openRequest);
    await migrateSheetsToV2(openRequest);
}
async function migrateGroupsToV2(openRequest) {
    // create GENERAL_STORE objectStore
    const objectStore = openRequest.result.createObjectStore(GENERAL_STORE);
    // copy Groups from localStorage to indexedDB
    const groupString = localStorage.getItem('groups');
    const groups = (groupString == null) ? Object.create(null) : JSON.parse(groupString);
    Object.values(groups).forEach((G) => {
        // move name, other_names into names
        const names = G.names ?? [];
        if ('name' in G) {
            names.push(G.name);
            delete G.name;
        }
        if ('other_names' in G) {
            names.push(...G.other_names);
            delete G.other_names;
        }
        G.names = names;
        // add custom field
        const custom = {};
        // user representations
        if ('userRepresentations' in G) {
            if (Array.isArray(G.userRepresentations) && G.userRepresentations.length > 0) {
                custom.representations = G.userRepresentations;
            }
            delete G.userRepresentations;
        }
        // representationIndex
        if ('representationIndex' in G) {
            if (G.representationIndex !== 0) {
                custom.representationIndex = G.representationIndex;
            }
            delete G.representationIndex;
        }
        // notes
        if ('userNotes' in G) {
            if (typeof G.userNotes === 'string' && G.userNotes.length != 0) {
                custom.notes = G.userNotes;
            }
            delete G.userNotes;
        }
        G.custom = custom;
        // should have either _XML_generators (from XML) or generators (from JSON), but not both
        if (G._XML_generators != null) { // convert _XML_generators to declaredGenerators
            G.declaredGenerators = G._XML_generators;
            delete G._XML_generators;
        }
        else if (G.generators != null) { // convert generators to declaredGenerators
            G.declaredGenerators = G.generators;
            delete G.generators;
        }
        // clean out all cached values
        delete G.conjugacyClasses;
        delete G.elementOrders;
        delete G.elementPowers;
        delete G.elementPrimePowers;
        delete G.elements;
        delete G.inverses;
        delete G.isAbelian;
        delete G.isCyclic;
        delete G.nonAbelianExample;
        delete G.order;
        delete G.orderClasses;
        delete G.relations;
        delete G._isSimple;
        delete G._isSolvable;
        delete G._subgroups;
        delete G._orderClassSizes;
        delete G._subgroupOrders;
        delete G._cosetIndices;
        delete G._indexInParentGroup;
        delete G.CayleyThumbnail;
        delete G.rowHTML;
    });
    // convert format to that used in IndexedDB
    await new Promise((resolve, reject) => {
        const putRequest = objectStore.put(groups, GROUP_LIBRARY_KEY);
        putRequest.onsuccess = (_ev) => resolve(openRequest.result);
        putRequest.onerror = (ev) => reject(ev);
    });
    // delete groups from localStorage
    // localStorage.removeItem('groups')
}
// use upgrade transaction's object store directly — cannot open a new connection during onupgradeneeded
async function migrateSheetsToV2(openRequest) {
    const transaction = openRequest.transaction;
    const sheetStore = transaction.objectStore(SHEET_STORE);
    const backupStore = openRequest.result.createObjectStore(SHEET_BACKUP_STORE);
    // Library.getGroupByURL is needed by migrateSheetToV2 (for layoutCayleyDiagram).
    // The normal loadLibrary() path can't be used here (it would open a new DB connection).
    // Groups were just moved to GENERAL_STORE by migrateGroupsToV2 — read them directly
    // from the upgrade transaction and populate the in-memory library.
    const idbRequest = (request) => new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
    const storedGroups = (await idbRequest(transaction.objectStore(GENERAL_STORE).get(GROUP_LIBRARY_KEY)));
    Library.loadFromStoredGroups(storedGroups);
    const sheetNames = await idbRequest(sheetStore.getAllKeys());
    for (const sheetName of sheetNames) {
        const v1SheetJSONString = await idbRequest(sheetStore.get(sheetName));
        await idbRequest(backupStore.put(v1SheetJSONString, sheetName)); // back up V1 before converting
        try {
            const v2SheetJSON = deserializeSheet(v1SheetJSONString); // CHECKME?
            await idbRequest(sheetStore.put(v2SheetJSON, sheetName));
        }
        catch (err) {
            Log.err(`migrateSheetsToV2: failed to migrate '${sheetName}', left unchanged: ${err}`);
        }
    }
}
//# sourceMappingURL=StoredObjects.js.map
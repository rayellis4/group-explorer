/* @flow

# SheetControl component

Displays elements that control the SheetView:
 * add Rectangle and Text Box elements
 * add CayleyDiagram, Multtable, and CycleGraph elements for Library groups
 * store, display, update, and delete Sheet images from local indexedDB storage
 * import and export Sheet images as JSON

The factory method [addControl](#addcontrol) is the only object exported.
It is called from Sheet.html during [initialization](./Sheet.html.md#initialization-javascript)
to populate the `sheet-control` component in the ControlPanel.

Internal functions include
 * [Element creation functions](#element-creation-functions)
   * [showGroupSelect](#showgroupselect)
 * [Stored sheet functions](#stored-sheet-functions)
   * [showStoredSheet](#showstoredsheet)
   * [showStoredSheetMenu](#showstoredsheetmenu)
   * [showCreateSheetDialog](#showcreatesheetdialog)
   * [showExportSheetDialog](#showexportsheetdialog)
   * [showImportSheetDialog](#showimportsheetdialog)
   * [showBackupSheetDialog](#showbackupsheetdialog)
   * [showRestoreSheetDialog](#showrestoresheetdialog)

The HTML for the control panel, including its CSS styling, is in
[sheetControlHTML](#sheetcontrolhtml).

```javascript
 */
import * as Library from './Library.js'
import * as GEUtils from './GEUtils.js'
import * as Heading from './Heading.js'
import * as SheetModel from './SheetModel.js'
import * as StoredObjects from './StoredObjects.js'
import * as View from './SheetView.js'
import {makeFixedMenu, makeDetachedMenu, makeMockSelect, makeDialog} from './UIComponents.js'

export {addControl}
/*
```
### addControl

Factory method adds this

```javascript
 */
function addControl (sheetControlElement) {
   sheetControlElement.innerHTML = sheetControlHTML

   // setup initial group selection in visualizer-select-group MockSelect
   const mockSelectGroup = document.getElementById('visualizer-select-group')
   const trivialGroup = Library.getGroupsByOrder(1)[0]
   mockSelectGroup.setAttribute('data-value', trivialGroup.URL)
   mockSelectGroup.innerHTML = trivialGroup.name

   // set up stored sheets list
   showStoredSheets()

   makeFixedMenu(sheetControlElement, (action) => eval(action))

   // raise menu by right-click also
   document.getElementById('stored-sheet-list').addEventListener('contextmenu', (rightClickEvent) => {
      const action = rightClickEvent.target.closest('[data-action]')?.getAttribute('data-action')
      if (action != null) {
         eval(action)
      }
   })
}
/*
```
## Element creation functions

### showGroupSelect

```javascript
 */
function showGroupSelect () {
   const sortedGroups = Library
      .getAllGroups()
      .sort((g, h) => g.order - h.order)
   const groupChoices = sortedGroups.map((g) => { return {value: g.URL, label: g.name} })
   const mockSelectGroup = document.getElementById('visualizer-select-group')
   makeMockSelect(mockSelectGroup, groupChoices)
       .then(
          (_choice) => {},
          () => {}
       )
}

function addElement (className /*: string */) {
  const groupURL = document.getElementById('visualizer-select-group').getAttribute('data-value')
  const { width, height } = View.graphicRect
  const scale = Math.min(width, height)
  const { x, y } = new View.GraphicUnits().toSheetUnits() // upper-left corner of #graphic
  const element /*: {[key: string]: any} */= { x: x, y: y, w: 0.1 * scale, h: 0.1 * scale, groupURL: groupURL }
  if (className === 'RectangleElement') {
    className = 'TextElement'
    element.text = ''
    element.color = '#DDDDDD'
  } else if (className === 'TextElement') {
    element.text = 'Enter text'
    element.color = '#DDDDDD'
    element.opacity = '0.5'
    element.fontSize = '1.25rem'
    delete element.w
    delete element.h
  } else if (className === 'CDElement') {
     element.highlightColors = {}
  }
  SheetModel.addElement(element, className)
}
/*
```
## Stored sheet functions

### showStoredSheet

```javascript
 */
async function showStoredSheets () {
   const sheetList = document.getElementById('stored-sheet-list')
   const sheetChoices = (await StoredObjects.listStoredSheets()).sort()
   sheetList.innerHTML = ''
   if (sheetChoices.length === 0) {
      sheetList.insertAdjacentHTML('beforeend', '<li><i>(None)</i></li>')
   } else {
      sheetChoices.forEach((sheetChoice) => {
         sheetList.insertAdjacentHTML('beforeend',
            `<li data-action="showStoredSheetMenu(event, '${sheetChoice}')">${sheetChoice}</li>`)
      })
   }
}
/*
```
### showStoredSheetMenu

```javascript
 */
function showStoredSheetMenu (event, storedSheet /*: string */) {
   const storedSheetMenu = [
      '<ul>',
      (storedSheet == null)
         ? ''
         : `<li data-action="loadSheet('${storedSheet}')">Load to current sheet</li>
            <li data-action="saveSheet('${storedSheet}')">Update from current sheet</li>
            <li data-action="renameSheet('${storedSheet}', event)">Rename sheet</li>
            <li data-action="deleteSheet('${storedSheet}')">Delete</li>
            <hr>`,
      `     <li data-action="showCreateSheetDialog(event)">Save current sheet</li>
            <li data-action="showExportSheetDialog(event)">Export current sheet</li>
            <li data-action="showImportSheetDialog(event)">Import to current sheet</li>
            <li data-action="showBackupSheetsDialog(event)">Backup stored sheets</li>
            <li data-action="showRestoreSheetsDialog(event)">Restore from backup</li>
            <li data-action="showStoredSheets()">Refresh list</li>
      </ul>`].join('')
   makeDetachedMenu(storedSheetMenu, event)
      .then( (action) => eval(action) )
}

// set in load, save, destroy, rename
function displaySheetName (sheetName /*: ?string */ = null) {
   Heading.setTitle(sheetName || 'Group Explorer Sheet')
}

function loadSheet (sheetName /*: string */) {
   SheetModel.clear()
   View.redrawAll()
   displaySheetName(sheetName)
   StoredObjects.getStoredSheet(sheetName)
      .then((jsonObject) => {
         SheetModel.fromJSONObject(jsonObject)
      })
}

function saveSheet (sheetName /*: string */) {
   displaySheetName(sheetName)
   StoredObjects.saveStoredSheet(sheetName, SheetModel.toJSON())
}

async function renameSheet (sheetName /*: string */, location) {
   const sheetContent = await StoredObjects.getStoredSheet(sheetName)
   const newName = await showNameSheetDialog(location, sheetName, sheetContent)
   if (newName != null) {
      await StoredObjects.removeStoredSheet(sheetName)
      displaySheetName(newName)
      showStoredSheets()
   }
}

function deleteSheet (sheetName /*: string */) {
   if (window.confirm(`Are you sure you want to delete stored sheet ${sheetName}?\nThis cannot be undone.`)) {
      StoredObjects.removeStoredSheet(sheetName)
         .then(() => showStoredSheets())
   }
}
/*
```
### showCreateSheetDialog

```javascript
 */

function showCreateSheetDialog (location) {
   showNameSheetDialog(location, null, SheetModel.toJSON())
}

async function showNameSheetDialog (location, sheetName, sheetContent) {
   const placeHolder = sheetName || 'New sheet name'
   const createSheetDialogHTML =
     `<div id="new-sheet-dialog" data-action="() => {}" class="flex-v"
           style="min-width: 25em; min-height: 8em; max-height: 8em">
         <div>Enter new stored sheet name (may have HTML):</div>
         <div class="stretch flex-v" style="justify-content: center">
            <input id="new-sheet-value" type="text" placeholder="${placeHolder}" minlength="1" maxlength="120"
                    style="font-size: inherit; width: 100%">
         </div>
         <div style="padding: 0.5em 2em 0">
            <button data-action="saveNewSheet()" style="width: 5em">OK</button>
            <button data-action="close(null)" style="width: 5em; float: right"">Cancel</button>
         </div>
      </div>`

   const dialog = makeDialog(createSheetDialogHTML, location)

   const allNames = await StoredObjects.listStoredSheets()

   const newName = new Promise((resolve, _reject) => {
      GEUtils.createActionHandler(dialog, (action) => eval(action))

      document.getElementById('new-sheet-value')
         .addEventListener('keydown', (event) => {
            if (event.key == 'Enter')
               saveNewSheet()
         })

      function close (newName) {
         dialog.remove()
         resolve(newName)
      }

      function saveNewSheet() {
         const newSheetName = document.getElementById('new-sheet-value').value
         if (newSheetName === '') {
            alert('Empty sheet name -- click "Cancel" to dismiss')
         } else {
            if (allNames.includes(newSheetName)) {
               alert(`A stored sheet named "${newSheetName}" already exists`)
            } else {
               StoredObjects.saveStoredSheet(newSheetName, sheetContent)
                  .then(() => {
                     showStoredSheets()
                     displaySheetName(newSheetName)
                     close(newSheetName)
                  })
            }
         }
      }
   })

   return await newName
}
/*
```
### showExportSheetDialog

```javascript
 */
function showExportSheetDialog (location) {
   const modelJSON = JSON.stringify(SheetModel.toJSON())

   const exportSheetDialogHTML =
      `<div id="export-sheet-dialog" class="flex-v" style="min-height: 15em; min-width: 60ch; overflow: hidden">
         <style>
                   #export-sheet-dialog button {
                      padding-left: 2ch;
                      padding-right: 2ch;
                      max-width: max-content;
                   }
         </style>
         <div>Sheet export data display:</div>
         <textarea id="export-sheet-value" class="stretch fill-h scrollable" cols="40" rows="5"
            style="font-size: inherit; margin: 0.5em 0; resize: none">${modelJSON}</textarea>
         <div style="display: flex; justify-content: space-around">
            <button data-action="dialog.remove()">Dismiss</button>
         </div>
      </div>`

   const dialog = makeDialog(exportSheetDialogHTML, location)
   GEUtils.createActionHandler(dialog, (action) => eval(action))
}
/*
```
### showImportSheetDialog

```javascript
 */
function showImportSheetDialog (location) {
   const importSheetDialogHTML =
     `<div id="import-sheet-dialog" class="flex-v" style="min-height: 15em; min-width: 60ch; overflow: hidden">
         <div>Enter sheet data to import (JSON):</div>
         <textarea id="import-sheet-value" class="stretch fill-h scrollable" cols="40" rows="5"
                   style="font-size: inherit; margin: 0.5em 0; resize: none"></textarea>
         <div style="padding: 0.5em 2em 0">
            <button style="width: 5em" data-action="importFromTextarea()">Import</button>
            <button style="width: 5em; float: right" data-action="dialog.remove()">Cancel</button>
         </div>
      </div>`

   const dialog = makeDialog(importSheetDialogHTML, location)
   GEUtils.createActionHandler(dialog, (action) => eval(action))

   function importFromTextarea () {
      const jsonString = document.getElementById('import-sheet-value').value
      if (jsonString !== '') {
         SheetModel.fromJSONObject(StoredObjects.migrateSheetToV2(jsonString))
      }
      dialog.remove()
   }
}

async function showBackupSheetsDialog (location) {
   const allSheets = (await StoredObjects.listStoredSheets()).sort()

   const backupSheetsDialogHTML = [
      `<div id="backup-sheets-dialog" class="flex-v" style="min-height: 13em; min-width: 50ch; width: 60ch; overflow: hidden">
         <style>
                   #backup-sheets-dialog button {
                      padding-left: 2ch;
                      padding-right: 2ch;
                   }
                   #backup-sheets-buttons button {
                      width: 12ch;
                   }
                   #backup-sheets-choices {
                      font-size: inherit;
                      margin: 0.5em 0;
                      overflow: hidden auto;
                      text-wrap: auto;
                      user-select: text;
                      background-color: white;
                      border: 1px solid black;
                   }
         </style>
         <div style="display: inline-flex"><span>Check the sheets to back up:</span>
            <div class="fill-h" style="display: inline-flex; justify-content: flex-end">
               <button data-action="markAllSheets()" style="font-size: 1em; margin: 0 1ch">Mark all</button>
               <button data-action="clearAllSheets()" style="font-size: 1em">Clear all</button>
         </div></div>
         <div id="backup-sheets-choices" class="stretch fill-h scrollable">`
   ]
   for (const sheet of allSheets) {
      backupSheetsDialogHTML.push(
        `<input type="checkbox" name="${sheet}" checked>
            <label for="${sheet}">${sheet}</label><br>`
      )
   }
   backupSheetsDialogHTML.push(
        `</div>
        <div id="backup-sheets-file-name-container" class="hidden">
            Download file name:
            <input id="backup-sheets-file-name" type="text"></input>
         </div>
         <div>Copy backup to:</div>
         <div id="backup-sheets-buttons" class="flex-h" style="flex-wrap: wrap; justify-content: space-around">
            <button data-action="dialog.remove()">Cancel</button>
            <button class="backup-target-button" data-action="backupToClipboard()">Clipboard</button>
            <button class="backup-target-button" data-action="setupFileDownload()">File</button>
            <a id="backup-act-anchor" class="hidden" target="_blank">
               <button data-action="downloadToFile()">Download</button></a>
         </div>
      </div>`
   )

   const dialog = makeDialog(backupSheetsDialogHTML.join(''), location)
   GEUtils.createActionHandler(dialog, (action) => eval(action))

   function markAllSheets () {
      document.querySelectorAll('#backup-sheets-choices input').forEach((checkbox) => checkbox.checked = true)
   }

   function clearAllSheets () {
      document.querySelectorAll('#backup-sheets-choices input').forEach((checkbox) => checkbox.checked = false)
   }

   async function backupToClipboard () {
      const checkedSheetsJSONString = await getCheckedSheetsJSONString()
      await navigator.clipboard.writeText(checkedSheetsJSONString)
      dialog.remove()
   }

   function setupFileDownload () {
      document.getElementById('backup-sheets-file-name-container').classList.remove('hidden')
      document.querySelectorAll('#backup-sheets-buttons button.backup-target-button')
         .forEach((button) => button.classList.add('hidden'))
      document.getElementById('backup-act-anchor').classList.remove('hidden')
   }

   async function downloadToFile () {
      const checkedSheetsJSONString = await getCheckedSheetsJSONString()
      const anchor = document.querySelector('#backup-sheets-buttons a')
      let downloadFileName = document.getElementById('backup-sheets-file-name').value
      if (!downloadFileName?.length) {
         downloadFileName = 'download.sheet'
      }
      anchor.setAttribute('download', downloadFileName)
      anchor.setAttribute('href', 'data:,' + encodeURIComponent(checkedSheetsJSONString))
      anchor.click()
      dialog.remove()
   }

   async function getCheckedSheetsJSONString () {
      const checkedSheetNames = Array
         .from(document.querySelectorAll('#backup-sheets-choices input:checked'))
         .map((checkbox) => checkbox.name)
      const checkedSheetsJSON = await Promise
         .allSettled(checkedSheetNames
            .map((sheetName) => StoredObjects.getStoredSheet(sheetName)))

      let checkedSheetsJSONString = '['
      for (const inx in checkedSheetNames) {
         checkedSheetsJSONString += (checkedSheetsJSONString.length > 1 ? ',' : '')
            + JSON.stringify({sheetName: checkedSheetNames[inx], sheetJSON: checkedSheetsJSON[inx].value})
      }
      checkedSheetsJSONString += ']'

      return checkedSheetsJSONString
   }
}

async function showRestoreSheetsDialog (location) {
   const allSheets = (await StoredObjects.listStoredSheets()).sort()

   const restoreSheetsDialogHTML =
      `<div id="restore-sheets-dialog" class="flex-v" style="min-height: 13em; min-width: 50ch; width: 60ch; overflow: hidden">
         <style>
                   #restore-sheets-dialog button {
                      padding-left: 2ch;
                      padding-right: 2ch;
                   }
                   #restore-sheets-buttons button {
                      width: 12ch;
                   }
                   #restore-sheets-choices {
                      font-size: inherit;
                      margin: 0.5em 0;
                      overflow: hidden auto;
                      text-wrap: auto;
                      user-select: text;
                      background-color: white;
                      border: 1px solid black;
                   }
         </style>
         <div style="display: inline-flex"><span>Check the sheets to restore:</span>
            <div class="fill-h" style="display: inline-flex; justify-content: flex-end">
               <button data-action="markAllSheets()" style="font-size: 1em; margin: 0 1ch">Mark all</button>
               <button data-action="clearAllSheets()" style="font-size: 1em">Clear all</button>
         </div></div>
         <div id="restore-sheets-choices" class="stretch fill-h scrollable"></div>
         <div>Restore sheet(s) from:</div>
         <div id="restore-sheets-buttons" class="flex-h" style="justify-content: space-around">
            <button data-action="dialog.remove()">Cancel</button>
            <button class="restore-source-button" data-action="restoreFromClipboard()">Clipboard</button>
            <button class="restore-source-button" data-action="restoreFromFile()">File</button>
            <button class="restore-act-button hidden">Restore</button>
         </div>
         <div class="hidden">
            <input type="file" id="restore-sheets-file-input" accept=".txt,.csv,.html,.css,.js,.json,.xml,.md,.sheet">
         </div>
      </div>`

   const dialog = makeDialog(restoreSheetsDialogHTML, location)
   GEUtils.createActionHandler(dialog, (action) => eval(action))

   function restoreFromClipboard () {
      navigator.clipboard.readText()
         .then((jsonString) => storeJSON(jsonString))
   }

   function restoreFromFile () {
      const filePicker = document.getElementById('restore-sheets-file-input')
      filePicker.click()
      filePicker.addEventListener('cancel', dialog.remove)
      filePicker.addEventListener('change', restoreSheetData)

      function restoreSheetData () {
         const pickedFile = filePicker.files?.[0]
         const fileReader = new FileReader()
         fileReader.addEventListener('loadend', (loadEndEvent) => storeJSON(loadEndEvent.target.result))
         fileReader.readAsText(pickedFile)
      }
   }

   function closeDialog () {
      dialog.remove()
      window.setTimeout(() => showStoredSheets(), 0)
   }

   async function storeJSON (restoredJSONString) {
      // display names from restoredJSONString
      if (restoredJSONString !== '') {
         let restoredJSONObject = JSON.parse(restoredJSONString)
         if (restoredJSONObject[0].sheetName == null) {
            StoredObjects.saveStoredSheet('unknown sheet', restoredJSONString)
            closeDialog()
         } else {
            const restoreSheetsChoices = restoredJSONObject
               .map(({sheetName}) => 
                  `<input type="checkbox" name="${sheetName}" checked>
                      <label for="${sheetName}">${sheetName}</label><br>`)
            document.getElementById('restore-sheets-choices').innerHTML = restoreSheetsChoices

            // hide source buttons, show action ones
            Array.from(document.querySelectorAll('#restore-sheets-buttons button.restore-source-button'))
               .forEach((el)  => el.classList.add('hidden'))
            const restoreButton = document.querySelector('#restore-sheets-buttons button.restore-act-button')
            restoreButton.classList.remove('hidden')
            
            // wait for button to act
            restoreButton.addEventListener('click', () => {
               const sheetNamesToRestore = Array
                  .from(document.querySelectorAll('#restore-sheets-choices input:checked'))
                  .map((checkbox) => checkbox.name)
               Promise
                  .allSettled(sheetNamesToRestore
                     .map((sheetNameToRestore) => {
                        const sheetJSON = restoredJSONObject
                           .find(({sheetName}) => sheetName == sheetNameToRestore).sheetJSON
                        return StoredObjects.saveStoredSheet(sheetNameToRestore, sheetJSON)
                     })
                  )
                  .then(() => closeDialog())
            })
         }
      }
   }
}

function clearCurrentSheet () {
   SheetModel.clear()
   displaySheetName()
}
/*
```
### sheetControlHTML

```javascript
 */
const sheetControlHTML =
     `<div>
         Add element:
         <div class="flex-h fill-h">
            <button data-action="addElement('RectangleElement')">Rectangle</button>
            <button data-action="addElement('TextElement')">Text box</button>
         </div>
      </div>

      <div class="stack-08em">
         Add visualizer for group:
         <div id="visualizer-select-group" class="mock-select" data-action="showGroupSelect()"></div>

         <div class="flex-h fill-h">
            <button data-action="addElement('CDElement')" style="min-width: 7.5ch">Cayley<br>diagram</button>
            <button data-action="addElement('MTElement')"                         >Multiplication<br>table</button>
            <button data-action="addElement('CGElement')" style="min-width: 7.5ch">Cycle<br>graph</button>
         </div>
      </div>

      <div>
         Stored sheets:
         <ul id="stored-sheet-list" data-action="showStoredSheetMenu(event)" class="stack-03em box"></ul>
      </div>

      <div class="flex-h fill-h">
         <button data-action="View.redrawAll()">Redraw</button>
         <button data-action="clearCurrentSheet()">Clear</button>
      </div>
      <style>
       #sheet-control {
          background-color: var(--controls-background);
          font-size: 1.25rem;
       }

       #visualizer-select-group {
          text-align: center;
          font-size: 1em !important;
       }

       #stored-sheet-list {
          line-height: 1;
          max-height: 20em;
          min-height: 5em;
          overflow-y: auto;
          background-color: var(--gray0);
          border: var(--dark-border);
          border-radius: var(--border-radius);
       }
      </style>`

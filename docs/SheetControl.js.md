/* @flow

# SheetControl component

Displays elements that control the SheetView:
 * add Rectangle and Text Box elements
 * add CayleyDiagram, Multtable, and CycleGraph elements for Library groups
 * store, display, update, and delete Sheet images from local indexedDB storage
 * import and export Sheet images as JSON

The factory method [addControl](#addcontrol) is the only object exported.

```javascript
 */
import * as Library from './Library.js'
import * as GEUtils from './GEUtils.js'
import * as Heading from './Heading.js'
import {serializeSheet, deserializeSheet} from './SheetSerialization.js'
import * as StoredObjects from './StoredObjects.js'
import {makeFixedMenu, makeDetachedMenu, makeMockSelect, makeDialog} from './UIComponents.js'

export {addControl}
/*
```
### addControl
```javascript
 */
function addControl (sheetControlElement, sheetModelProxy, sheetViewModel) {
   const viewModel = new ViewModel(sheetModelProxy, sheetViewModel)
   new View(viewModel, sheetControlElement)
}
/*
```
## ViewModel
```javascript
 */
class ViewModel {
   #model
   #sheetViewModel
   #view

   constructor (sheetModelProxy, sheetViewModel) {
      this.#model = sheetModelProxy
      this.#sheetViewModel = sheetViewModel
   }

   get view () { return this.#view }
   set view (view) { this.#view = view }

   viewportOrigin () { return this.#sheetViewModel.viewportOrigin() }
   viewportScale () { return this.#sheetViewModel.viewportScale() }

   addElement (className /*: string */, groupURL /*: string */) {
      const {x, y} = this.viewportOrigin()
      const scale = this.viewportScale()
      const element /*: {[key: string]: any} */ = { x, y, w: 0.1 * scale, h: 0.1 * scale, groupURL }
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
      this.#model.addObjectAsElement(element, className)
   }

   toJSON () {
      return this.#model.toJSON()
   }

   fromJSON (json /*: string */) {
      this.#model.fromJSON(json)
   }

   clearSheet () {
      this.#model.sheetElements.clear()
   }

   async loadSheet (sheetName /*: string */) {
      const jsonObject = await StoredObjects.getStoredSheet(sheetName)
      this.#model.fromJSON(jsonObject)
   }

   saveSheet (sheetName /*: string */) {
      StoredObjects.saveStoredSheet(sheetName, this.#model.toJSON())
   }

   async deleteSheet (sheetName /*: string */) {
      await StoredObjects.removeStoredSheet(sheetName)
   }
}
/*
```
## View
```javascript
 */
class View {
   viewModel /*: ViewModel */
   rootElement /*: HTMLElement */

   constructor (viewModel /*: ViewModel */, rootElement /*: HTMLElement */) {
      this.viewModel = viewModel
      this.viewModel.view = this
      this.rootElement = rootElement
      rootElement.innerHTML = View.getViewHTML()

      // setup initial group selection
      const mockSelectGroup = rootElement.querySelector('#visualizer-select-group')
      const trivialGroup = Library.getGroupsByOrder(1)[0]
      mockSelectGroup.setAttribute('data-value', trivialGroup.URL)
      mockSelectGroup.innerHTML = trivialGroup.name

      this.showStoredSheets()

      const addElement = (className) => this.addElement(className)
      const showGroupSelect = () => this.showGroupSelect()
      const showStoredSheetMenu = (event, name) => this.showStoredSheetMenu(event, name)
      const redrawAll = () => {}  // TODO: wire to SheetViewModel.redrawAll()
      const clearCurrentSheet = () => this.clearCurrentSheet()
      makeFixedMenu(rootElement, (action) => eval(action))

      rootElement.querySelector('#stored-sheet-list').addEventListener('contextmenu', (ev) => {
         const action = ev.target.closest('[data-action]')?.getAttribute('data-action')
         if (action != null) {
            const showStoredSheetMenu = (event, name) => this.showStoredSheetMenu(event, name)
            eval(action)
         }
      })
   }

   displaySheetName (sheetName /*: ?string */ = null) {
      Heading.setTitle(sheetName || 'Group Explorer Sheet')
   }

   showGroupSelect () {
      const sortedGroups = Library.getAllGroups().sort((g, h) => g.order - h.order)
      const groupChoices = sortedGroups.map((g) => ({value: g.URL, label: g.name}))
      const mockSelectGroup = this.rootElement.querySelector('#visualizer-select-group')
      makeMockSelect(mockSelectGroup, groupChoices).then(() => {}, () => {})
   }

   addElement (className /*: string */) {
      const groupURL = this.rootElement.querySelector('#visualizer-select-group').getAttribute('data-value')
      this.viewModel.addElement(className, groupURL)
   }

   async showStoredSheets () {
      const sheetList = this.rootElement.querySelector('#stored-sheet-list')
      const sheetChoices = (await StoredObjects.listStoredSheets()).sort()
      sheetList.innerHTML = ''
      if (sheetChoices.length === 0) {
         sheetList.insertAdjacentHTML('beforeend', '<li><i>(None)</i></li>')
      } else {
         sheetChoices.forEach((sheetChoice) => {
            sheetList.insertAdjacentHTML('beforeend',
               `<li data-action="showStoredSheetMenu(event, '${GEUtils.escapeHTML(sheetChoice)}')">${sheetChoice}</li>`)
         })
      }
   }

   showStoredSheetMenu (event, storedSheet /*: string */) {
      const escapedString = GEUtils.escapeHTML(storedSheet)
      const storedSheetMenu = [
         '<ul>',
         (storedSheet == null) ? '' :
            `<li data-action="loadSheet('${escapedString}')">Load to current sheet</li>
             <li data-action="saveSheet('${escapedString}')">Update from current sheet</li>
             <li data-action="renameSheet('${escapedString}', event)">Rename sheet</li>
             <li data-action="deleteSheet('${escapedString}')">Delete</li>
             <hr>`,
         `<li data-action="showCreateSheetDialog(event)">Save current sheet</li>
          <li data-action="showExportSheetDialog(event)">Export current sheet</li>
          <li data-action="showImportSheetDialog(event)">Import to current sheet</li>
          <li data-action="showBackupSheetsDialog(event)">Backup stored sheets</li>
          <li data-action="showRestoreSheetsDialog(event)">Restore from backup</li>
          <li data-action="showStoredSheets()">Refresh list</li>
         </ul>`
      ].join('')

      const loadSheet = (name) => this.loadSheet(name)
      const saveSheet = (name) => this.saveSheet(name)
      const renameSheet = (name, ev) => this.renameSheet(name, ev)
      const deleteSheet = (name) => this.deleteSheet(name)
      const showCreateSheetDialog = (ev) => this.showCreateSheetDialog(ev)
      const showExportSheetDialog = (ev) => this.showExportSheetDialog(ev)
      const showImportSheetDialog = (ev) => this.showImportSheetDialog(ev)
      const showBackupSheetsDialog = (ev) => this.showBackupSheetsDialog(ev)
      const showRestoreSheetsDialog = (ev) => this.showRestoreSheetsDialog(ev)
      const showStoredSheets = () => this.showStoredSheets()

      makeDetachedMenu(storedSheetMenu, event).then((action) => eval(action))
   }

   async loadSheet (sheetName /*: string */) {
      await this.viewModel.loadSheet(sheetName)
      this.displaySheetName(sheetName)
   }

   saveSheet (sheetName /*: string */) {
      this.viewModel.saveSheet(sheetName)
      this.displaySheetName(sheetName)
      this.showStoredSheets()
   }

   async renameSheet (sheetName /*: string */, location) {
      const sheetContent = await StoredObjects.getStoredSheet(sheetName)
      const newName = await this.showNameSheetDialog(location, sheetName, sheetContent)
      if (newName != null) {
         await this.viewModel.deleteSheet(sheetName)
         this.displaySheetName(newName)
         this.showStoredSheets()
      }
   }

   deleteSheet (sheetName /*: string */) {
      if (window.confirm(`Are you sure you want to delete stored sheet ${sheetName}?\nThis cannot be undone.`)) {
         this.viewModel.deleteSheet(sheetName).then(() => this.showStoredSheets())
      }
   }

   clearCurrentSheet () {
      this.viewModel.clearSheet()
      this.displaySheetName()
   }

   showCreateSheetDialog (location) {
      this.showNameSheetDialog(location, null, this.viewModel.toJSON())
   }

   async showNameSheetDialog (location, sheetName, sheetContent) {
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
               if (event.key == 'Enter') saveNewSheet()
            })

         const close = (newName) => {
            dialog.remove()
            resolve(newName)
         }

         const saveNewSheet = () => {
            const newSheetName = document.getElementById('new-sheet-value').value
            if (newSheetName === '') {
               alert('Empty sheet name -- click "Cancel" to dismiss')
            } else if (allNames.includes(newSheetName)) {
               alert(`A stored sheet named "${newSheetName}" already exists`)
            } else {
               StoredObjects.saveStoredSheet(newSheetName, sheetContent)
                  .then(() => {
                     this.showStoredSheets()
                     this.displaySheetName(newSheetName)
                     close(newSheetName)
                  })
            }
         }
      })

      return await newName
   }

   showExportSheetDialog (location) {
      const modelJSON = JSON.stringify(serializeSheet(this.viewModel.toJSON()))
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

   showImportSheetDialog (location) {
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

      const importFromTextarea = () => {
         const jsonString = document.getElementById('import-sheet-value').value
         if (jsonString !== '') {
            this.viewModel.fromJSON(deserializeSheet(jsonString))
         }
         dialog.remove()
      }
   }

   async showBackupSheetsDialog (location) {
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
           `<input type="checkbox" name="${GEUtils.escapeHTML(sheet)}" checked>
              <label for="${GEUtils.escapeHTML(sheet)}">${sheet}</label><br>`
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

      const markAllSheets = () => {
         document.querySelectorAll('#backup-sheets-choices input').forEach((cb) => cb.checked = true)
      }

      const clearAllSheets = () => {
         document.querySelectorAll('#backup-sheets-choices input').forEach((cb) => cb.checked = false)
      }

      const backupToClipboard = async () => {
         const checkedSheetsJSONString = await getCheckedSheetsJSONString()
         await navigator.clipboard.writeText(checkedSheetsJSONString)
         dialog.remove()
      }

      const setupFileDownload = () => {
         document.getElementById('backup-sheets-file-name-container').classList.remove('hidden')
         document.querySelectorAll('#backup-sheets-buttons button.backup-target-button')
            .forEach((button) => button.classList.add('hidden'))
         document.getElementById('backup-act-anchor').classList.remove('hidden')
      }

      const downloadToFile = async () => {
         const checkedSheetsJSONString = await getCheckedSheetsJSONString()
         const anchor = document.querySelector('#backup-sheets-buttons a')
         let downloadFileName = document.getElementById('backup-sheets-file-name').value
         if (!downloadFileName?.length) downloadFileName = 'download.sheet'
         anchor.setAttribute('download', downloadFileName)
         anchor.setAttribute('href', 'data:,' + encodeURIComponent(checkedSheetsJSONString))
         anchor.click()
         dialog.remove()
      }

      const getCheckedSheetsJSONString = async () => {
         const checkedSheetNames = Array
            .from(document.querySelectorAll('#backup-sheets-choices input:checked'))
            .map((checkbox) => checkbox.name)
         const checkedSheetsJSON = await Promise
            .allSettled(checkedSheetNames.map((name) => StoredObjects.getStoredSheet(name)))

         const result = []
         for (const inx in checkedSheetNames) {
            const namedSheet = 
               {sheetName: checkedSheetNames[inx], sheetJSON: serializeSheet(checkedSheetsJSON[inx].value)}
            result.push(namedSheet)
         }

         return JSON.stringify(result)
      }
   }

   async showRestoreSheetsDialog (location) {
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

      const markAllSheets = () => {
         document.querySelectorAll('#restore-sheets-choices input').forEach((cb) => cb.checked = true)
      }

      const clearAllSheets = () => {
         document.querySelectorAll('#restore-sheets-choices input').forEach((cb) => cb.checked = false)
      }

      const restoreFromClipboard = () => {
         navigator.clipboard.readText().then((jsonString) => storeJSON(jsonString))
      }

      const restoreFromFile = () => {
         const filePicker = document.getElementById('restore-sheets-file-input')
         filePicker.click()
         filePicker.addEventListener('cancel', dialog.remove)
         filePicker.addEventListener('change', () => {
            const pickedFile = filePicker.files?.[0]
            const fileReader = new FileReader()
            fileReader.addEventListener('loadend', (ev) => storeJSON(ev.target.result))
            fileReader.readAsText(pickedFile)
         })
      }

      const closeDialog = () => {
         dialog.remove()
         window.setTimeout(() => this.showStoredSheets(), 0)
      }

      const storeJSON = async (restoredJSONString) => {
         if (restoredJSONString !== '') {
            let restoredJSONObject = JSON.parse(restoredJSONString)
            if (  !Array.isArray(restoredJSONObject)
               && restoredJSONObject.version != null
               && restoredJSONObject.sheet.sheetName == null
            ) {
               StoredObjects.saveStoredSheet('unnamed sheet', deserializeSheet(restoredJSONObject))
               closeDialog()
            } else if (restoredJSONObject.length > 0 && restoredJSONObject[0].sheetName == null) {
                  StoredObjects.saveStoredSheet('unnamed sheet', deserializeSheet(JSON.stringify(restoredJSONObject)))
                  closeDialog()
            } else {
               const restoreSheetsChoices = restoredJSONObject
                  .map(({sheetName}) =>
                     `<input type="checkbox" name="${GEUtils.escapeHTML(sheetName)}" checked>
                         <label for="${GEUtils.escapeHTML(sheetName)}">${sheetName}</label><br>`)
                  .join('')
               document.getElementById('restore-sheets-choices').innerHTML = restoreSheetsChoices

               Array.from(document.querySelectorAll('#restore-sheets-buttons button.restore-source-button'))
                  .forEach((el) => el.classList.add('hidden'))
               const restoreButton = document.querySelector('#restore-sheets-buttons button.restore-act-button')
               restoreButton.classList.remove('hidden')

               restoreButton.addEventListener('click', () => {
                  const sheetNamesToRestore = Array
                     .from(document.querySelectorAll('#restore-sheets-choices input:checked'))
                     .map((checkbox) => checkbox.name)
                  Promise
                     .allSettled(sheetNamesToRestore.map((name) => {
                        const sheetJSON = restoredJSONObject.find(({sheetName}) => sheetName == name).sheetJSON
                        return StoredObjects.saveStoredSheet(name, deserializeSheet(sheetJSON))
                     }))
                     .then(() => closeDialog())
               })
            }
         }
      }
   }

   static getViewHTML () {
      return `<div>
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
         <button data-action="redrawAll()">Redraw</button>
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
   }
}

/* @flow

# SheetModelEditors

 * [SheetModelEditor](#sheetmodeleditor)
 * [RectangleEditor](#rectangleeditor)
 * [TextEditor](#texteditor)
 * [ConnectionEditor](#connectioneditor)
 * [MorphismEditor](#morphismeditor)
 * [RemoteEditor](#remoteeditor)

```javascript
 */

import * as Log from './Log.js'
import * as GEUtils from './GEUtils.js'
import * as SheetModel from './SheetModel.js'
import * as StoredObjects from './StoredObjects.js'
import {THREE} from '../lib/externals.js'
import {makeDialog, makeMockSelect} from './UIComponents.js'

export {RectangleEditor, TextEditor, ConnectionEditor, MorphismEditor, RemoteEditor}
/*
```
### SheetElementEditor
```javascript
 */
class SheetElementEditor {
   constructor (modelElement, dialogHTML, location) {
      this.modelElement = modelElement
      this.initialJSON = modelElement.toJSON()
      this.location = location

      this.editor = makeDialog(dialogHTML, location)
      const dialog = this.editor.classList.contains('dialog') ? this.editor : this.editor.querySelector('.dialog')
      GEUtils.createActionHandler(dialog, (action) => eval(action))
      dialog.addEventListener('input', (ev) => this.onInput(ev))
   }

   onInput (event) {
      const maybeSynced = event.target.closest('.synced')
      if (maybeSynced != null) {
         maybeSynced.parentElement
            .querySelectorAll('.synced')
            .forEach((el) => {
               if (el != maybeSynced) {
                  el.value = maybeSynced.value
               }
            })
      }
      this.updateModelElement()
      this.modelElement.redraw()
   }

   commit () {
      this.exit()
   }

   destroy () {
      this.modelElement.destroy()
      this.exit()
   }

   rollback () {
      this.modelElement.fromJSON(this.initialJSON)
      this.modelElement.redraw()
      this.exit()
   }

   updateModelElement () {
      /* Subclass responsibility */
   }

   exit () {
      this.editor.remove()
   }
}
/*
```
### RectangleEditor
```javascript
 */
class RectangleEditor extends SheetElementEditor {
   constructor (rectangleElement, location) {
      const rectangleEditorHTML = `
         <div id="rectangle-editor" style="padding: 0 1em">
            <p>Background color:<br>
               <input id="rectangle-editor-color" type="color" style="margin-left: 1em"
                  value="#${new THREE.Color(rectangleElement.color).getHexString()}">
            </p>
            <p>
               <button data-action="this.commit()">OK</button>
               <button data-action="this.rollback()">Cancel</button>
            </p>
         </div>`
      super(rectangleElement, rectangleEditorHTML, location)
   }

   updateModelElement () {
      const rectangle = this.modelElement
      rectangle.color = document.getElementById('rectangle-editor-color').value.trim()
   }
}
/*
```
### TextEditor
```javascript
 */
class TextEditor extends SheetElementEditor {
   constructor (textElement, location) {
      const textEditorHTML = `
         <div id="text-editor" class="box stack-15.em flex-v">
             <div class="stretch">Text:<br>
                 <textarea id="text-editor-text" rows="4" cols="60">${textElement.text}</textarea><br>
                 <input id="text-editor-html" type="checkbox" ${textElement.isPlainText ? '' : 'checked="true"'}>
                 <label for="text-editor-html">Display as HTML</label>
             </div>
             <div>Text color:
                 <input id="text-editor-text-color" type="color"
                    value="#${new THREE.Color(textElement.fontColor).getHexString()}">
             </div>
             <div>Text size:
                 <input id="text-editor-font-size" class="synced" type="text" size="3"
                    value="${parseInt(window.getComputedStyle(textElement.viewElement.domElement).fontSize)}">
                 <label id="text-editor-font-size-units" for="font-size">px</label>
                 <br>
                 <input class="synced" type="range" min="8" max="64"
                    value="${parseInt(window.getComputedStyle(textElement.viewElement.domElement).fontSize)}">
             </div>
             <div id="text-editor-alignments">Text alignment:<br>
                 <input id="text-editor-align-left" value="left" name="alignment" type="radio"
                        ${(textElement.alignment == 'left') ? 'checked="true"' : ''}>
                 <label for="text-editor-align-left">left</label>
                 <input id="text-editor-align-center" value="center" name="alignment" type="radio"
                        ${(textElement.alignment == 'center') ? 'checked="true"' : ''}>
                 <label for="text-editor-align-center">center</label>
                 <input id="text-editor-align-right" value="right" name="alignment" type="radio"
                        ${(textElement.alignment == 'right') ? 'checked="true"' : ''}>
                 <label for="text-editor-align-right">right</label>
             </div>
             <div>Background color:
                 <input id="text-editor-color" type="color"
                    value="#${new THREE.Color(textElement.color).getHexString()}">
             </div>
             <div>Background opacity:
                 <input id="text-editor-opacity" class="synced" type="text" size="3"
                    value="${textElement.opacity}"><br>
                 <input class="synced" type="range" min="0" max="1" step="0.01"
                    value="${textElement.opacity}">
             </div>
             <div class="flex-h">
                <button data-action="this.commit()">OK</button>
                <button data-action="this.rollback()">Cancel</button>
             </div>
             <style>
                #text-editor {
                   font-size: 1.2em;
                }
                #text-editor-text {
                   width: 100%;
                   height: calc(100% - 4em);
                   resize: none;
                }
                #text-editor-text-color,
                #text-editor-color {
                   margin-left: 1em;
                }
                #text-editor-font-size,
                #text-editor-opacity {
                   margin-left: 1em;
                   text-align: center;
                }
                #text-editor [type="range"] {
                   margin: 0 5%;
                }
                #text-editor-align-left {
                   margin-left: 3em;
                }
                #text-editor-alignments {
                   margin-block-end: 0;
                }
                #text-editor > div:has(button) {
                   margin-top: 0.2em;
                   justify-content: space-evenly;
                }
                #text-editor button {
                   width: 8ch;
                }
             </style>
         </div>`
      super(textElement, textEditorHTML, location)
   }

   updateModelElement () {
      const textBox = this.modelElement
      textBox.text = document.getElementById('text-editor-text').value.trim()
      textBox.isPlainText = !document.getElementById('text-editor-html').checked
      textBox.fontColor = document.getElementById('text-editor-text-color').value
      textBox.fontSize = document.getElementById('text-editor-font-size').value.trim() + 'px'
      textBox.alignment = this.editor.querySelector('[type="radio"]:checked').value
      textBox.color = document.getElementById('text-editor-color').value
      textBox.opacity = document.getElementById('text-editor-opacity').value
   }
}
/*
```
### ConnectionEditor
```javascript
 */
class ConnectionEditor extends SheetElementEditor {
   constructor (connectingElement, location) {
      const connectionEditorHTML = `
         <div id="connection-editor" class="box stack-08em" style="resize: none">
             <div>Line color:
                 <input id="connection-editor-color" type="color"
                    value="#${new THREE.Color(connectingElement.color).getHexString()}">
             </div>
             <div>Line thickness:
                 <input id="connection-editor-thickness" class="synced" type="text" size="3"
                        value="${connectingElement.thickness}"><br>
                 <input class="synced" type="range" min="1" max="20"
                        value="${connectingElement.thickness}">
             </div>
             <div><input id="connection-editor-draw-arrowhead" type="checkbox"
                       ${connectingElement.hasArrowhead ? 'checked="true"' : ''}>
                 <label for="drawArrowhead">Draw arrowhead</label>
             </div>
             <div class="flex-h">
                <button data-action="this.commit()">OK</button>
                <button data-action="this.rollback()">Cancel</button>
                <button data-action="this.destroy()">Delete</button>
             </div>
             <style>
                #connection-editor {
                   resize: none;
                   min-width: 15em;
                   font-size: 1.2em;
                }
                #connection-editor [type="color"] {
                   margin-left: 1em;
                }
                #connection-editor [type="text"] {
                   margin-left: 1em;
                   text-align: center;
                }
                #connection-editor [type="range"] {
                   margin: 0 5%;
                }
                #connection-editor > div:has(button) {
                   justify-content: space-evenly;
                }
                #connection-editor button {
                   width: 8ch;
                   margin: 0 0.5ch;
                }
             </style>
         </div>`

      super(connectingElement, connectionEditorHTML, location)
   }

   updateModelElement () {
      const connection = this.modelElement
      connection.color = document.getElementById('connection-editor-color').value
      connection.thickness = parseInt(document.getElementById('connection-editor-thickness').value)
      connection.hasArrowhead = document.getElementById('connection-editor-draw-arrowhead').checked
   }
}
/*
```
### MorphismEditor
```javascript
 */
class MorphismEditor extends SheetElementEditor {
   constructor (morphismElement, location) {
      const morphismEditorHTML = `
         <div id="morphism-editor" class="sheet-editor box stack-03em" style="resize: none">
             <div>Morphism name:
                 <input id="morphism-editor-name" type="text" value="${morphismElement.name}">
             </div>
             <div><input id="morphism-editor-show-domain-codomain" type="checkbox"
                  ${morphismElement.showDomainAndCodomain ? 'checked="true"' : ''}>
                 <label for="morphism-editor-show-domain-codomain">Show domain and codomain</label>
             </div>
             <div><input id="morphism-editor-show-defining-pairs" type="checkbox"
                  ${morphismElement.showDefiningPairs ? 'checked="true"' : ''}>
                 <label for="morphism-editor-show-defining-pairs">Show defining pairs</label>
             </div>
             <div><input id="morphism-editor-show-injection-surjection" type="checkbox"
                  ${morphismElement.showInjectionSurjection ? 'checked="true"' : ''}>
                 <label for="morphism-editor-show-injection-surjection">Show injective/surjective</label>
             </div>
             <div><input id="morphism-editor-show-many-arrows" type="checkbox"
                  ${morphismElement.showManyArrows ? 'checked="true"' : ''}>
                 <label for="morphism-editor-show-many-arrows">Draw multiple arrows</label>
             </div>` +
            ((morphismElement.source instanceof SheetModel.MTElement)
               ? `<div><input id="morphism-editor-multtable-source-top-row" type="checkbox"
                     ${morphismElement.useMulttableSourceTopRow ? 'checked="true"' : ''}>
                    <label for="morphism-editor-multtable-source-top-row"
                       >Use top row of source multtable for morphisms</label>
                  </div>`
               : '') +
            ((morphismElement.destination instanceof SheetModel.MTElement)
               ? `<div><input id="morphism-editor-multtable-destination-top-row" type="checkbox"
                     ${morphismElement.useMulttableDestinationTopRow ? 'checked="true"' : ''}>
                    <label for="morphism-editor-multtable-destination-top-row"
                       >Use top row of destination multtable for morphisms</label>
                  </div>`
               : '') +
            `<div id="morphism-arrow-color">Arrow color:<br>
                 <input id="morphism-arrow-color-none" value="left" name="arrow-color" type="radio"
                    ${(morphismElement.arrowColor == 'none') ? 'checked="true"' : ''}>
                 <label for="morphism-arrow-color-none">none</label>
                 <input id="morphism-arrow-color-source" value="center" name="arrow-color" type="radio"
                    ${(morphismElement.arrowColor == 'source') ? 'checked="true"' : ''}>
                 <label for="morphism-arrow-color-source">source</label>
                 <input id="morphism-arrow-color-destination" value="right" name="arrow-color" type="radio"
                    ${(morphismElement.arrowColor == 'destination') ? 'checked="true"' : ''}>
                 <label for="morphism-arrow-color-destination">destination</label>
             </div>
             <div>Arrows margin:
                 <input id="morphism-editor-arrow-margin" class="synced" type="text" size="3"
                        value="${100*morphismElement.arrowMargin}"><br>
                 <input class="synced" type="range" min="0" max="5" step="0.1"
                        value="${100*morphismElement.arrowMargin}">
             </div>
             <div>Define homomorphism:
                <table id="defining-pair-table">
                   <thead>
                      <tr>
                          <th>This element</th>
                          <th>Maps to this</th>
                          <th>Delete</th>
                      </tr>
                   </thead>
                   <tbody></tbody>
                </table>
             </div>
             <div id="morphism-add-defining-pair">
                 <button data-action="this.addDefiningPair()">Add</button>
                 <span id="morphism-name">${morphismElement.name}</span>
                 (<div id="domain-select" class="mock-select" data-action="this.showDomainChoices()"></div>)
                 =
                 <div id="codomain-select" class="mock-select" data-action="this.showCodomainChoices()"></div>
             </div>
             <details id="morphism-preview">
                 <summary>Full morphism mapping:</summary>
                 <table id="morphism-preview-table" class="scrollable-body">
                     <thead>
                         <tr>
                             <th>This element</th>
                             <th>Maps to this</th>
                         </tr>
                     </thead>
                     <tbody></tbody>
                 </table>
             </details>
             <div id="morphism-editor-buttons" class="flex-h">
                 <button data-action="this.commit()">OK</button>
                 <button data-action="this.rollback()">Cancel</button>
                 <button data-action="this.destroy()">Delete</button>
             </div>
             <style>
                #morphism-editor {
                    font-size: 1.25em;
                    min-width: 30em;
                    height: fit-content !important;
                }
                #morphism-editor[style*=height] {
                    min-width: unset;
                }
                #morphism-editor [type="text"] {
                   font-size: 1em;
                   margin-left: 1em;
                   text-align: center;
                }
                #morphism-editor [type="range"] {
                   margin: 0 5%;
                }

                /* Style tables
                 */
                .sheet-editor table {
                   font-size: 1em;
                   line-height: 1.2;
                   margin: 0 auto;
                   border: var(--dark-border);
                   border-radius: var(--border-radius);
                   border-spacing: 0;
                }
                .sheet-editor th,
                .sheet-editor td {
                   white-space: nowrap;
                }
                .sheet-editor th {
                   padding: 0.2em 1ch 0;
                }
                .sheet-editor td {
                   padding: 0.2em 0.5ch;
                   background-color: var(--gray0);
                   border-top: var(--light-border);
                }
                .sheet-editor td + td {
                   border-left: var(--light-border);
                }
                .sheet-editor tbody tr:last-child td:first-child {
                   border-bottom-left-radius: var(--border-radius);
                }
                .sheet-editor tbody tr:last-child td:last-child {
                   border-bottom-right-radius: var(--border-radius);
                }

                .sheet-editor table.scrollable-body thead tr {
                   display: block;
                }
                .sheet-editor table.scrollable-body tbody {
                   display: block;
                   overflow-y: auto;
                   max-height: 25em;
                   width: 100%;
                }

                #morphism-arrow-color-none {
                  margin-left: 3em;
                }

                /* Defining pair table
                 */
                #defining-pair-table th {
                   padding: 0.2em 2ch 0;
                }
                #defining-pair-table th:last-child {
                   padding: 0.2em 1ch 0;
                }
                #defining-pair-table td:last-child {
                   text-align: center;
                }

                /* Add defining pair
                */
                #morphism-add-defining-pair {
                   display: flex;
                   align-items: center;
                   justify-content: center;
                }
                #morphism-add-defining-pair button {
                   margin-right: 0.5em;
                }
                #domain-select,
                #codomain-select {
                   margin-left: 0.5ch;
                   margin-right: 0.5ch;
                   background-image: var(--light-gradient);
                }

                /* Action buttons
                 */
                #morphism-editor-buttons {
                   justify-content: space-evenly;
                }
                #morphism-editor-buttons button {
                   width: 8ch;
                   margin:0 0.5ch;
                }

             </style>
         </div>`
      super(morphismElement, morphismEditorHTML, location)

      // set column widths in defining pair table
      const DISPLAY_FONT_SIZE = 20
      const domainHeaderSize = document.querySelector('#defining-pair-table th:first-child').getBoundingClientRect().width
      const codomainHeaderSize = document.querySelector('#defining-pair-table th:nth-child(2)').getBoundingClientRect().width
      const removeColumnSize = document.querySelector('#defining-pair-table th:nth-child(3)').getBoundingClientRect().width
      const maxDomainContent = this.modelElement.source.group.longestHTMLLabel * DISPLAY_FONT_SIZE
      const maxCodomainContent = this.modelElement.destination.group.longestHTMLLabel * DISPLAY_FONT_SIZE

      const adjustedStyle =
         `<style>
             #morphism-editor th:first-child,
             #morphism-editor td:first-child {
                width: ${Math.max(domainHeaderSize, maxDomainContent)}px;
             }
             #morphism-editor th:nth-child(2),
             #morphism-editor td:nth-child(2) {
                width: ${Math.max(codomainHeaderSize, maxCodomainContent)}px;
             }
             #defining-pair-table th:nth-child(3),
             #defining-pair-table td:nth-child(3) {
                width: ${removeColumnSize}px;
             }
          </style>`
      this.editor.insertAdjacentHTML('beforeend', adjustedStyle)

      const domainSelect = document.getElementById('domain-select')
      domainSelect.style.minWidth = `calc(${maxDomainContent}px + ${getComputedStyle(domainSelect).width})`
      const codomainSelect = document.getElementById('codomain-select')
      codomainSelect.style.minWidth = `calc(${maxCodomainContent}px + ${getComputedStyle(codomainSelect).width})`

      this.fillDefiningPairs()
      this.setupMorphismAdd()
      this.updatePreview()
   }

   updateModelElement () {
      const morphism = this.modelElement
      morphism.name = document.getElementById('morphism-editor-name').value.trim()
      morphism.showDomainAndCodomain = document.getElementById('morphism-editor-show-domain-codomain').checked
      morphism.showDefiningPairs = document.getElementById('morphism-editor-show-defining-pairs').checked
      morphism.showInjectionSurjection = document.getElementById('morphism-editor-show-injection-surjection').checked
      morphism.showManyArrows = document.getElementById('morphism-editor-show-many-arrows').checked
      morphism.arrowColor = document.getElementById('morphism-arrow-color-source').checked
         ? 'source'
         : document.getElementById('morphism-arrow-color-destination').checked
            ? 'destination'
            : 'none'

      morphism.arrowMargin = parseFloat(document.getElementById('morphism-editor-arrow-margin').value)/100
      if (morphism.source instanceof SheetModel.MTElement) {
         morphism.useMulttableSourceTopRow =
            document.getElementById('morphism-editor-multtable-source-top-row').checked
      }
      if (morphism.destination instanceof SheetModel.MTElement) {
         morphism.useMulttableDestinationTopRow =
            document.getElementById('morphism-editor-multtable-destination-top-row').checked
      }
   }

   fillDefiningPairs () {
      const tbody = document.querySelector('#defining-pair-table tbody')
      if (this.modelElement.mapping.definingPairs.length === 0) {
         tbody.innerHTML =
            `<tr>
                <td colspan="3">
                   <center><i>No pairs added yet</i></center>
                </td>
             </tr>`
      } else {
         tbody.innerHTML = ''
         this.modelElement.mapping.definingPairs.forEach(
            ([domainElement, codomainElement]) => {
               const definingPairRow =
                  `<tr id="defining-pair-${domainElement}">
                      <td>${this.modelElement.source.group.representation[domainElement]}</td>
                      <td>${this.modelElement.destination.group.representation[codomainElement]}</td>
                      <td data-action="this.removeDefiningPair(${domainElement})">⌫</td>
                   </tr>`
               tbody.insertAdjacentHTML('beforeend', definingPairRow)
            })
      }
   }

   setupMorphismAdd () {
      if (this.modelElement.mapping.image.includes(undefined)) {
         // domain selection is first unmapped source
         const domainSelection = this.modelElement.mapping.image.findIndex((el) => el === undefined)
         document.getElementById('domain-select').setAttribute('data-value', domainSelection)
         document.getElementById('domain-select').innerHTML =
            this.modelElement.source.group.representation[domainSelection]

         this.setupCodomainChoice(domainSelection)

         document.getElementById('morphism-add-defining-pair').classList.remove('hidden')
      } else {
         document.getElementById('morphism-add-defining-pair').classList.add('hidden')
      }
   }

   showDomainChoices () {
      const codomainChoice = parseInt(document.getElementById('codomain-select').getAttribute('data-value'))
      const validSources = this.modelElement.mapping.validSources(codomainChoice)
      const choices = validSources.map((source) => [source, this.modelElement.source.group.representation[source]])
      makeMockSelect(document.getElementById('domain-select'), choices)
         .then(
            (domainChoice) => this.setupCodomainChoice(domainChoice),
            () => {}
         )
   }

   showCodomainChoices () {
      const domainChoice = parseInt(document.getElementById('domain-select').getAttribute('data-value'))
      const validTargets = this.modelElement.mapping.validTargets(domainChoice)
      const choices = validTargets.map((target) => [target, this.modelElement.destination.group.representation[target]])
      makeMockSelect(document.getElementById('codomain-select'), choices)
         .then(
            (codomainChoice) => this.setupDomainChoice(codomainChoice),
            () => {}
         )
   }
      // save old choice if it still works...
   // domain choice is first valid source  of codomain selection
   setupDomainChoice (codomainSelection) {
      const currentDomainSelection = parseInt(document.getElementById('domain-select').getAttribute('data-value'))
      const validSources = this.modelElement.mapping.validSources(codomainSelection)
      if (!validSources.includes(currentDomainSelection)) {
         const validDomainSelection = validSources[0]
         document.getElementById('domain-select').setAttribute('data-value', validDomainSelection)
         document.getElementById('domain-select').innerHTML =
            this.modelElement.source.group.representation[validDomainSelection]
      }
   }

   // codomain choice is first valid target of domain selection
   setupCodomainChoice (domainSelection) {
      const currentCodomainSelection = parseInt(document.getElementById('codomain-select').getAttribute('data-value'))
      const validTargets = this.modelElement.mapping.validTargets(domainSelection)
      if (!validTargets.includes(currentCodomainSelection)) {
         const validCodomainSelection = validTargets[0]
         document.getElementById('codomain-select').setAttribute('data-value', validCodomainSelection)
         document.getElementById('codomain-select').innerHTML =
            this.modelElement.destination.group.representation[validCodomainSelection]
      }
   }

   updatePreview () {
      const previewTable = document.getElementById('morphism-preview-table')
      if (previewTable.style.display !== 'none') {
         const previewTableBody = previewTable.querySelector('tbody')
         previewTableBody.innerHTML = ''
         this.modelElement.mapping.fullMapping.forEach(
            (codomainElement, domainElement) => {
               const morphismPreviewRow =
                  `<tr>
                      <td>${this.modelElement.source.group.representation[domainElement]}</td>
                      <td>${this.modelElement.destination.group.representation[codomainElement]}</td>
                   </tr>`
               previewTableBody.insertAdjacentHTML('beforeend', morphismPreviewRow)
            })
      }
   }

   addDefiningPair () {
      const domainElement = parseInt(document.getElementById('domain-select').getAttribute('data-value'))
      const codomainElement = parseInt(document.getElementById('codomain-select').getAttribute('data-value'))
      this.modelElement.mapping.addDefiningPair(domainElement, codomainElement)
      this.fillDefiningPairs()

      // propagate changes to rest of display
      this.updatePreview()
      this.setupMorphismAdd()
      this.updateModelElement()
      this.modelElement.redraw()
   }

   removeDefiningPair(domainElement /*: groupElement */) {
      this.modelElement.mapping.removeDefiningPair(domainElement)
      this.fillDefiningPairs()

      // propagate changes to rest of display
      this.updatePreview()
      this.setupMorphismAdd()
      this.updateModelElement()
      this.modelElement.redraw()
   }
}
/*
```
### RemoteEditor
```javascript
 */
class RemoteEditor {
    constructor (modelElement /*: Model.VisualizerElement */) {
        const editPageURLs = {
            MTElement: './Multtable.html',
            CGElement: './CycleGraph.html',
            CDElement: './CayleyDiagram.html'
        }
        const editPageURL = editPageURLs[modelElement.className] +
            `?SheetEditor=true&groupURL=${modelElement.group.URL}` +
            (window.location.href.includes('log=debug') ? '&log=debug' : '')

        // open visualizer/editor window
        const otherWin = window.open(editPageURL)

        // save modelElement.visualizer JSON in indexedDB
        // open visualizer/editor window
        // and add message handler to receive updates from editor
        StoredObjects.setPassedJSON(modelElement.visualizer.toJSON())
            .then(() => {
                otherWin.addEventListener('message', (messageEvent) => {
                    Log.debug('SheetModelEditor received msg', messageEvent.data)
                    if (messageEvent.data != null) {
                        modelElement.visualizer.fromJSON(messageEvent.data.json)
                        modelElement.redraw()
                        if (modelElement instanceof SheetModel.CDElement) {
                            modelElement.markDirty()  // mark model element 'dirty'
                        }
                    }
                 })
             })
    }
}

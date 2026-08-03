/*

# SheetModelEditors

 * [SheetModelEditor](#sheetmodeleditor)
 * [RectangleEditor](#rectangleeditor)
 * [TextEditor](#texteditor)
 * [ConnectionEditor](#connectioneditor)
 * [MorphismEditor](#morphismeditor)
 * [RemoteEditor](#remoteeditor)

```javascript
 */

import {DEFAULT_SPHERE_COLOR} from './AbstractDiagramDisplay.js'
import * as Log from './Log.js'
import * as GEUtils from './GEUtils.js'
import * as StoredObjects from './StoredObjects.js'
import * as THREE from '../lib/externals.js'
import {makeDialog, makeMockSelect, mockSelectChoiceItem, } from './UIComponents.js'
import {redrawLinksFor} from './SheetView.js'
import {addControl as addHighlightControl} from './HighlightControl.js'

import type { SheetViewModel, SheetElement, NodeElement, TextElement, VisualizerElement, CDElement, 
   CGElement, MTElement, LinkElement, ConnectingElement, MorphismElement } from './SheetViewModel.ts'
import type * as SheetModel from './SheetModel.ts'
/*
```
### SheetElementEditor
```javascript
 */
abstract class SheetElementEditor {
   modelElement: SheetElement
   initialJSON: SheetModel.SheetElementJSON
   location: NumberLocation
   editor: HTMLElement

   constructor (modelElement: SheetElement, dialogHTML: html, location: NumberLocation) {
      this.modelElement = modelElement
      this.initialJSON = JSON.parse(JSON.stringify(modelElement.toJSON()))
      this.location = location

      this.editor = makeDialog(dialogHTML, location)
      const dialog = this.editor.classList.contains('dialog')
         ? this.editor
         : this.editor.querySelector('.dialog') as HTMLElement
      GEUtils.createActionHandler(dialog, (action) => eval(action))
      dialog.addEventListener('input', (ev) => this.onInput(ev))
   }

   onInput (event: Event) {
      const maybeSynced = (event.target as HTMLElement).closest('.synced') as Maybe<HTMLInputElement>
      if (maybeSynced != null) {
         (maybeSynced.parentElement as HTMLElement)
            .querySelectorAll('.synced')
            .forEach((el) => {
               if (el != maybeSynced) {
                  (el as HTMLInputElement).value = maybeSynced.value
               }
            })
      }
      this.updateModelElement()
      this.modelElement.viewElement?.redraw()
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
      this.modelElement.viewElement?.redraw()
      this.exit()
   }

   abstract updateModelElement (): void

   exit () {
      this.editor.remove()
   }
}
/*
```
### TextEditor
```javascript
 */
export class TextEditor extends SheetElementEditor {
   declare modelElement: TextElement
   
   constructor (textElement: TextElement, location: NumberLocation) {
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
      textBox.text = (document.getElementById('text-editor-text') as HTMLTextAreaElement).value.trim()
      textBox.isPlainText = !(document.getElementById('text-editor-html') as HTMLInputElement).checked
      textBox.fontColor = (document.getElementById('text-editor-text-color') as HTMLInputElement).value
      textBox.fontSize = (document.getElementById('text-editor-font-size') as HTMLInputElement).value.trim() + 'px'
      textBox.alignment =
         (this.editor.querySelector('[type="radio"]:checked') as HTMLInputElement).value as SheetModel.alignmentType
      textBox.color = (document.getElementById('text-editor-color') as HTMLInputElement).value
      textBox.opacity = parseInt((document.getElementById('text-editor-opacity') as HTMLInputElement).value)
   }
}
/*
```
### ConnectionEditor
```javascript
 */
export class ConnectionEditor extends SheetElementEditor {
   declare modelElement: ConnectingElement

   constructor (connectingElement: ConnectingElement, location: NumberLocation) {
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
      connection.color = (document.getElementById('connection-editor-color') as HTMLInputElement).value
      connection.thickness = parseInt((document.getElementById('connection-editor-thickness') as HTMLInputElement).value)
      connection.hasArrowhead = (document.getElementById('connection-editor-draw-arrowhead') as HTMLInputElement).checked
   }
}
/*
```
### MorphismEditor
```javascript
 */
export class MorphismEditor extends SheetElementEditor {
   declare modelElement: MorphismElement
   sourceHighlightSnapshot!: Maybe<color>[]
   destHighlightSnapshot!: Maybe<color>[]

   constructor (morphismElement: MorphismElement, location: NumberLocation) {
      const morphismEditorHTML = `
         <div id="morphism-editor" class="sheet-editor box stack-03em" style="resize: none">
             <div>Morphism name:
                 <input id="morphism-editor-name" type="text" value="${morphismElement.morphismName}">
             </div>
                 <details open><summary>Options:</summary>
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
            ((morphismElement.source .className === 'MTElement')
               ? `<div><input id="morphism-editor-multtable-source-top-row" type="checkbox"
                     ${morphismElement.useMulttableSourceTopRow ? 'checked="true"' : ''}>
                    <label for="morphism-editor-multtable-source-top-row"
                       >Use top row of source multtable for morphisms</label>
                  </div>`
               : '') +
            ((morphismElement.destination .className === 'MTElement')
               ? `<div><input id="morphism-editor-multtable-destination-top-row" type="checkbox"
                     ${morphismElement.useMulttableDestinationTopRow ? 'checked="true"' : ''}>
                    <label for="morphism-editor-multtable-destination-top-row"
                       >Use top row of destination multtable for morphisms</label>
                  </div>`
               : '') +
            `<div>Arrows margin:
                 <input id="morphism-editor-arrow-margin" class="synced" type="text" size="3"
                        value="${100*morphismElement.arrowMargin}"><br>
                 <input class="synced" type="range" min="0" max="5" step="0.1"
                        value="${100*morphismElement.arrowMargin}">
             </div>
             <div id="morphism-arrow-color">Arrow color:
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
             </details>
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
                 <span id="morphism-name">${morphismElement.morphismName}</span>
                 (<div id="domain-select" class="mock-select" data-action="this.showDomainChoices()"></div>)
                 =
                 <div id="codomain-select" class="mock-select" data-action="this.showCodomainChoices()"></div>
             </div>
             <details id="morphism-domain-highlights">
                 <summary>Domain highlights</summary>
                 <div id="morphism-domain-highlight-control" class="morphism-highlights"></div>
                 <div class="flex-h" style="justify-content: center; margin-top: 0.5em">
                    <button data-action="this.pushSourceThroughMorphism()">Push source ➛ image</button>
                 </div>
             </details>
             <details id="morphism-codomain-highlights">
                 <summary>Codomain highlights</summary>
                 <div id="morphism-codomain-highlight-control" class="morphism-highlights"></div>
                 <div id="morphism-subgroup-transform-warning" style="text-align: center"></div>
                 <div class="flex-h" style="justify-content: center; margin-top: 0.5em">
                    <button data-action="this.pullTargetThroughMorphism()">Pull destination ➛ preimage</button>
                 </div>
             </details>
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
                .morphism-highlights {
                   font-size: 0.8em;
                   max-height: 25em;
                   overflow: hidden auto;
                   border: 1px solid #ccc;
                   border-radius: 4px;
                   background: #f5f5f5;
                   padding: 0.3em 0.5em;
                   margin: 0.3em 0;
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
                 #morphism-editor-buttons,
                 #morphism-subgroup-transform-buttons {
                   justify-content: space-evenly;
                }
                #morphism-editor-buttons button {
                   width: 8ch;
                   margin:0 0.5ch;
                }

             </style>
         </div>`
      super(morphismElement, morphismEditorHTML, location)

      this.sourceHighlightSnapshot = [...morphismElement.source.highlightColors[0]]
      this.destHighlightSnapshot = [...morphismElement.destination.highlightColors[0]]

      // set column widths in defining pair table
      const DISPLAY_FONT_SIZE = 20
      const domainHeaderSize =
         (document.querySelector('#defining-pair-table th:first-child') as HTMLElement).getBoundingClientRect().width
      const codomainHeaderSize =
         (document.querySelector('#defining-pair-table th:nth-child(2)') as HTMLElement).getBoundingClientRect().width
      const removeColumnSize =
         (document.querySelector('#defining-pair-table th:nth-child(3)') as HTMLElement).getBoundingClientRect().width
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

      const domainSelect = document.getElementById('domain-select') as HTMLElement
      domainSelect.style.minWidth = `calc(${maxDomainContent}px + ${getComputedStyle(domainSelect).width})`
      const codomainSelect = document.getElementById('codomain-select') as HTMLElement
      codomainSelect.style.minWidth = `calc(${maxCodomainContent}px + ${getComputedStyle(codomainSelect).width})`

      this.fillDefiningPairs()
      this.setupMorphismAdd()
      this.updatePreview()

      addHighlightControl(
         document.getElementById('morphism-domain-highlight-control') as HTMLElement,
         morphismElement.source.viewElement.highlightModelProxy)
      addHighlightControl(
         document.getElementById('morphism-codomain-highlight-control') as HTMLElement,
         morphismElement.destination.viewElement.highlightModelProxy)
   }

   updateModelElement () {
      const morphism = this.modelElement
      morphism.morphismName =
         (document.getElementById('morphism-editor-name') as HTMLInputElement).value.trim()
      morphism.showDomainAndCodomain = 
         (document.getElementById('morphism-editor-show-domain-codomain') as HTMLInputElement).checked
      morphism.showDefiningPairs =
         (document.getElementById('morphism-editor-show-defining-pairs') as HTMLInputElement).checked
      morphism.showInjectionSurjection =
         (document.getElementById('morphism-editor-show-injection-surjection') as HTMLInputElement).checked
      morphism.showManyArrows =
         (document.getElementById('morphism-editor-show-many-arrows') as HTMLInputElement).checked
      morphism.arrowColor =
         (document.getElementById('morphism-arrow-color-source') as HTMLInputElement).checked
            ? 'source'
            : (document.getElementById('morphism-arrow-color-destination') as HTMLInputElement).checked
               ? 'destination'
               : 'none'

      morphism.arrowMargin =
         parseFloat((document.getElementById('morphism-editor-arrow-margin') as HTMLInputElement).value)/100
      if (morphism.source .className === 'MTElement') {
         morphism.useMulttableSourceTopRow =
            (document.getElementById('morphism-editor-multtable-source-top-row') as HTMLInputElement).checked
      }
      if (morphism.destination .className === 'MTElement') {
         morphism.useMulttableDestinationTopRow =
            (document.getElementById('morphism-editor-multtable-destination-top-row') as HTMLInputElement).checked
      }
   }

   rollback () {
      this.modelElement.source.viewElement.restoreHighlights(this.sourceHighlightSnapshot)
      this.modelElement.destination.viewElement.restoreHighlights(this.destHighlightSnapshot)
      redrawLinksFor(this.modelElement.source)
      redrawLinksFor(this.modelElement.destination)
      super.rollback()
   }

   fillDefiningPairs () {
      const tbody = document.querySelector('#defining-pair-table tbody') as HTMLElement
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
            ([domainElement, codomainElement]: [groupElement, groupElement]) => {
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

   onInput (event: Event) {
      // sync name
      if ((event.target as HTMLInputElement).getAttribute('id') == ('morphism-editor-name')) {
         (document.getElementById('morphism-name') as HTMLInputElement).innerHTML =
            (event.target as HTMLInputElement).value
      }

      // clear warning message
      (document.getElementById('morphism-subgroup-transform-warning') as HTMLElement).innerHTML = ''

      super.onInput(event)
   }

   setupMorphismAdd () {
      if (this.modelElement.mapping.image.includes(undefined)) {
         // domain selection is first unmapped source
         const domainSelection = this.modelElement.mapping.image.findIndex((el) => el == null)
         ;(document.getElementById('domain-select') as HTMLElement).setAttribute('data-value', domainSelection.toString())
         ;(document.getElementById('domain-select') as HTMLElement).innerHTML =
            this.modelElement.source.group.representation[domainSelection]

         this.setupCodomainChoice(domainSelection)

         ;(document.getElementById('morphism-add-defining-pair') as HTMLElement).classList.remove('hidden')
      } else {
         ;(document.getElementById('morphism-add-defining-pair') as HTMLElement).classList.add('hidden')
      }
   }

   showDomainChoices () {
      const codomainChoice =
         parseInt((document.getElementById('codomain-select') as HTMLElement).getAttribute('data-value') as string)
      const validSources = this.modelElement.mapping.validSources(codomainChoice)
      const choices: mockSelectChoiceItem[] = validSources.map((source) => {
         return {value: source.toString(), label: this.modelElement.source.group.representation[source]}
      }).sort((a, b) => a.label.localeCompare(b.label))
      makeMockSelect(document.getElementById('domain-select') as HTMLElement, choices)
         .then(
            (domainChoice) => this.setupCodomainChoice(parseInt(domainChoice)),
            () => {}
         )
   }

   showCodomainChoices () {
      const domainChoice =
         parseInt((document.getElementById('domain-select') as HTMLElement).getAttribute('data-value') as string)
      const validTargets = this.modelElement.mapping.validTargets(domainChoice)
      const choices: mockSelectChoiceItem[] = validTargets.map((target) => {
         return {value: target.toString(), label: this.modelElement.destination.group.representation[target]}
      }).sort((a, b) => a.label.localeCompare(b.label))
      makeMockSelect(document.getElementById('codomain-select') as HTMLElement, choices)
         .then(
            (codomainChoice) => this.setupDomainChoice(parseInt(codomainChoice)),
            () => {}
         )
   }
   // save old choice if it still works...
   // domain choice is first valid source  of codomain selection
   setupDomainChoice (codomainSelection: groupElement) {
      const currentDomainSelection =
         parseInt((document.getElementById('domain-select') as HTMLElement).getAttribute('data-value') as string)
      const validSources = this.modelElement.mapping.validSources(codomainSelection)
      if (!validSources.includes(currentDomainSelection)) {
         const validDomainSelection = validSources[0]
         ;(document.getElementById('domain-select') as HTMLElement).setAttribute('data-value', validDomainSelection.toString())
         ;(document.getElementById('domain-select') as HTMLElement).innerHTML =
            this.modelElement.source.group.representation[validDomainSelection]
      }
   }

   // codomain choice is first valid target of domain selection
   setupCodomainChoice (domainSelection: groupElement) {
      const currentCodomainSelection =
         parseInt((document.getElementById('codomain-select') as HTMLElement).getAttribute('data-value') as string)
      const validTargets = this.modelElement.mapping.validTargets(domainSelection)
      if (!validTargets.includes(currentCodomainSelection)) {
         const validCodomainSelection = validTargets[0]
         ;(document.getElementById('codomain-select') as HTMLElement).setAttribute('data-value', validCodomainSelection.toString())
         ;(document.getElementById('codomain-select') as HTMLElement).innerHTML =
            this.modelElement.destination.group.representation[validCodomainSelection]
      }
   }

   updatePreview () {
      const previewTable = document.getElementById('morphism-preview-table') as HTMLElement
      if (previewTable.style.display !== 'none') {
         const previewTableBody = previewTable.querySelector('tbody') as HTMLElement
         previewTableBody.innerHTML = ''
         this.modelElement.mapping.fullMapping.forEach(
            (codomainElement: groupElement, domainElement: groupElement) => {
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
      const domainElement =
         parseInt((document.getElementById('domain-select') as HTMLElement).getAttribute('data-value') as string)
      const codomainElement =
         parseInt((document.getElementById('codomain-select') as HTMLElement).getAttribute('data-value') as string)
      this.modelElement.mapping.addDefiningPair(domainElement, codomainElement)
      this.fillDefiningPairs()

      // propagate changes to rest of display
      this.updatePreview()
      this.setupMorphismAdd()
      this.updateModelElement()
      this.modelElement.viewElement?.redraw()
   }

   removeDefiningPair(domainElement: groupElement) {
      this.modelElement.mapping.removeDefiningPair(domainElement)
      this.fillDefiningPairs()

      // propagate changes to rest of display
      this.updatePreview()
      this.setupMorphismAdd()
      this.updateModelElement()
      this.modelElement.viewElement?.redraw()
   }

   pushSourceThroughMorphism () {
      const fullMapping = this.modelElement.mapping.fullMapping
      const colorMap = new Map()
      // generate color map of destination elements that are the image of highlighted elements in source
      this.modelElement.source.viewElement.visualizer.model.highlightColors[0]
         .forEach((color: Maybe<color>, inx: integer) => {
            if (color != null && color != DEFAULT_SPHERE_COLOR) {
               colorMap.set(fullMapping[inx], new THREE.Color(color))
            }
         })

      // convert colorMap to destination's coniguration
      const destinationHighlightConfig = this.modelElement.destination.viewElement.visualizer.model.highlightConfiguration
      const destinationSaturation = destinationHighlightConfig.saturation[0]
      const destinationLightness = destinationHighlightConfig.lightness[0]
      colorMap.forEach((color) =>
         color.set(GEUtils.fromRainbow(color.getHSL({}).h, destinationSaturation, destinationLightness)))

      // highlight image in destination
      const destinationHighlights = this.modelElement.destination.viewElement.visualizer.model.highlightColors[0]
      this.modelElement.destination.viewElement.visualizer.model.group.elements
         .forEach((inx: integer) => {
            const c = colorMap.get(inx)
            destinationHighlights[inx] = c != null ? ('#' + c.getHexString()) : null
         })
      this.modelElement.destination.viewElement.visualizer.model.$touch('highlightColors')
      this.modelElement.destination.viewElement.redraw()
      redrawLinksFor(this.modelElement.destination)
   }

   pullTargetThroughMorphism () {
      const inverseMapping = new Map<groupElement, groupElement[]>()
      this.modelElement.mapping.fullMapping.forEach((dest, src) => {
         if (!inverseMapping.has(dest)) {
            inverseMapping.set(dest, [])
         }
         (inverseMapping.get(dest) as groupElement[]).push(src)
      })
      const colorMap = new Map()

      // generate color map of source elements whose images are highlighted elements in destination
      let incompletePreImage = false
      this.modelElement.destination.viewElement.visualizer.model.highlightColors[0]
         .forEach((color: Maybe<color>, dest: integer) => {
            if (color != null && color != DEFAULT_SPHERE_COLOR) {
               if (inverseMapping.has(dest)) {
                  (inverseMapping.get(dest) as groupElement[]).forEach((src) => colorMap.set(src, new THREE.Color(color)))
               } else {
                  incompletePreImage = true
               }
            }
         })
      if (incompletePreImage) {
         // set warning message, cleared next time onInput runs
         const message = '(Warning: Some highlighted elements have no pre-image)'
         ;(document.getElementById('morphism-subgroup-transform-warning') as HTMLElement).innerHTML = message
      }

      // convert colorMap to source's configuration
      const sourceHighlightConfig = this.modelElement.source.viewElement.visualizer.model.highlightConfiguration
      const sourceSaturation = sourceHighlightConfig.saturation[0]
      const sourceLightness = sourceHighlightConfig.lightness[0]
      colorMap.forEach((color) =>
         color.set(GEUtils.fromRainbow(color.getHSL({}).h, sourceSaturation, sourceLightness)))

      // highlight pre-image in source
      const sourceHighlights = this.modelElement.source.viewElement.visualizer.model.highlightColors[0]
      this.modelElement.source.viewElement.visualizer.model.group.elements.forEach((inx: groupElement) => {
         sourceHighlights[inx] = colorMap.has(inx) ? ('#' + colorMap.get(inx).getHexString()) : null
      })
      this.modelElement.source.viewElement.visualizer.model.$touch('highlightColors')
      this.modelElement.source.viewElement.redraw()
      redrawLinksFor(this.modelElement.source)
   }
}
/*
```
### RemoteEditor
```javascript
 */
export class RemoteEditor {
   static #messageHandler: (messageEvent: MessageEvent) => void  // singleton message handler to update visualizers
   static #editorWindows = new Map()  // elementId → editor window reference

   static #editPageURLs: Record<string, string> = {
      MTElement: './Multtable.html',
      CGElement: './CycleGraph.html',
      CDElement: './CayleyDiagram.html'
   }

   static editElement (modelElement: VisualizerElement & {onVisualizerChange?: (json: unknown) => void}) {
      // create listener instance, if needed; holds reference to Model instance
      if (RemoteEditor.#messageHandler == null) {
         const model = modelElement.model
         RemoteEditor.#messageHandler = (messageEvent: MessageEvent) => {
            if (messageEvent.data?.source != 'editor')
               return
            const {elementId, json} = messageEvent.data
            Log.debug(`RemoteEditor received msg for modelElement ${elementId}`, json)
            ;(model.sheetElements.get(elementId) as VisualizerElement)?.updateVisualizer?.(json)
         }
         window.addEventListener('message', RemoteEditor.#messageHandler)
      }

      // open visualizer/editor window; store reference for Sheet→Editor push
      const editPageURL = `${RemoteEditor.#editPageURLs[modelElement.className]}?SheetEditor` +
         (window.location.href.includes('log=debug') ? '&log=debug' : '')  // open in debug if we're in debug
      const editorWindow = window.open(editPageURL)
      RemoteEditor.#editorWindows.set(modelElement.id, editorWindow)

      // register push callback on modelElement so CDView's subscriber can trigger it
      modelElement.onVisualizerChange = (json) => RemoteEditor.pushToEditor(modelElement.id, json)

      // store initial message
      const initialMessage = {
         elementId: modelElement.id,
         json: modelElement.getVisualizerJSON()
      }
      StoredObjects.setPassedJSON(initialMessage)
   }

   // push updated JSON to an open editor tab for this element, if one exists
   static pushToEditor (elementId: string, json: unknown) {
      const editorWindow = RemoteEditor.#editorWindows.get(elementId)
      if (editorWindow == null || editorWindow.closed) {
         RemoteEditor.#editorWindows.delete(elementId)
         return
      }
      editorWindow.postMessage({source: 'sheet', elementId: elementId, json: json}, '*')
   }
}

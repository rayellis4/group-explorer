/* @flow

# SheetViewUI

<b>User inputs, responses:</b>
* select (left-click/tap) -- highlight node for move, resize
     * move node with left-button/one-finger drag and drop
     * resize node with left-button drag on resize handle, pinch on touch screen
     * left-click/tap anywhere to de-select and clear highlight
* context menu (right-click/long tap) -- raise context menu
     * resize
         * highlights node for move, resize
     * edit
         * raises element editing dialog for text nodes, connections, morphisms
         * invokes visualizer for Cayley diagram, multtable, and cycle graph nodes
     * group info
         * brings up relevant GroupInfo page
     * copy
         * makes copy of node on top of original (without links)
     * make connection/map
         * 'Select target' element pops up, then left-click/tap on target
         * valid targets will be highlighted when moving mouse/finger over them without clicking
     * move forward/backward, move to front/back
         * change element z-index
     * delete
         * remove element and all links from sheet
* left-button/one-finger drag and drop -- move node
* mouse wheel/pinch -- zoom entire sheet
* right-button/two-finger drag -- pan entire sheet
```javascript
 */

/* global TouchEvent */

import * as GEUtils from './GEUtils.js'
import * as Model from './SheetModel.js'
import * as View from './SheetView.js'
import {TextEditor, ConnectionEditor, MorphismEditor, RemoteEditor} from './SheetModelEditors.js'
import {
   makeDetachedMenu,
   makeDialog
} from './UIComponents.js'
import {
   recognizeSelect,
   recognizeContextMenu,
   recognizeDragAndDrop,
   recognizeZoom,
   recognizeMoveResize
} from './Gestures.js'

/*::
import type {CayleyDiagramJSON} from './CayleyDiagramView.js'
import type {CycleGraphJSON} from './CycleGraphView.js'
import type {MulttableJSON} from './MulttableView.js'

type VizDispJSON = CayleyDiagramJSON | CycleGraphJSON | MulttableJSON
 */

export { init }

/*
## init

Top level sheet controller, recognizes top-level user inputs
````javascript
 */
function init (viewModel, displayElement) {
   new SheetEventUI(viewModel, displayElement)
}

class SheetEventUI {
   viewModel /*: SheetViewModel */
   rootElement /*: HTMLElement */
   #redrawTimer /*: ?TimeoutID */ = null

   constructor (viewModel, rootElement) {
      this.viewModel = viewModel
      this.rootElement = rootElement

      this.setupSelect()
      this.setupContextMenu()
      this.setupMove()
      this.setupDragAndDrop()
      this.setupZoom()
   }

   // Click / tap, then drag to move; or drag resize handle / pinch-spread to resize
   setupSelect () {
   // Select element for resize
   recognizeSelect(this.rootElement,
      (event) => {
         const selectedElement = document
            .elementFromPoint(event.clientX, event.clientY)  // element under mouse click
            .closest('.NodeElement, .LinkElement')  // closest containing Node/Link
         const modelElement = this.viewModel.modelElements.get(selectedElement?.getAttribute('id'))
         if (modelElement?.isNode) {
            if (modelElement.anchor_id == null) {
               this.resizeElement(modelElement)
            }
         } else if (modelElement?.isLink) {
            const clickedElement = document.elementFromPoint(event.clientX, event.clientY)
            const viewElement = modelElement.viewElement
            const arrow = viewElement?.arrows?.find((arrow) => arrow.line == clickedElement || arrow.head == clickedElement)
                  ?? viewElement?.arrow
            if (arrow != null) {
               arrow.highlightColor = (arrow.highlightColor == null) ? '#00ff00' : null
               viewElement.redraw()
            }
         }
      })
   }

   resizeElement (modelElement) {
      // raise domElement z-index to show above other elements
      const domElement = document.querySelector(`[id="${modelElement.id}"]`)
      const originalZIndex = domElement.style.zIndex
      domElement.style.zIndex = 1000

      // create modal shield above entire #graphic or #display or body
      const {left: ghostLeft, top: ghostTop, width: ghostWidth, height: ghostHeight} = domElement.getBoundingClientRect()
      const resizeHTML =
         `<div id="sheet-resize-ghost" style="width: ${ghostWidth}px; height: ${ghostHeight}px;">
             <style>
                #sheet-resize-ghost {
                   position: absolute;
                   background-color: var(--clear);
                   outline: 2px dotted #AAAAFF;
                   outline-offset: 10px;
                   border-radius: unset;
                }
                #sheet-resize-ghost > .resize-handle {
                   display: ${GEUtils.isTouchDevice() ? 'none' : 'block'};
                }
             </style>
          </div>`
      const sheetResizeModal = makeDialog(resizeHTML,
         {clientX: ghostLeft, clientY: ghostTop},
         (_clickEvent) => {
            sheetResizeModal.remove()
            domElement.style.zIndex = originalZIndex
            this.viewModel.view.viewElements.get(modelElement.id)?.redraw()
         })

      let timerId = null
      const onMoveResize = (dx, dy, dw, dh, _isDrop) => {
         if (timerId == null) {
            timerId = window.setTimeout(() => {
               if (dx != 0 || dy != 0) {
                  this.viewModel.move(modelElement.id, dx, dy)
               }

               if (dw != 0 || dh != 0) {
                  this.viewModel.resize(modelElement.id, dw, dh)
               }

               syncGhostWithModel()

               timerId = null
            }, 0)
         }
      }

      const ghostElement = document.getElementById('sheet-resize-ghost')
      recognizeMoveResize(ghostElement, onMoveResize)

      function syncGhostWithModel () {
         const domElementPosition = domElement.getBoundingClientRect()
         ghostElement.style.left = `${domElementPosition.left}px`
         ghostElement.style.top = `${domElementPosition.top}px`
         ghostElement.style.width = `${domElementPosition.width}px`
         ghostElement.style.height = `${domElementPosition.height}px`
      }
   }

   // Right click / long tap to display context menu on Node or raise editor directly on Link
   setupContextMenu () {
      recognizeContextMenu(this.rootElement,
         (event) => {
            const selectedElement = document.elementFromPoint(event.clientX, event.clientY)
            const domElement = selectedElement.closest('.NodeElement, .LinkElement')
            const elementId = domElement?.getAttribute('id')
            const modelElement = this.viewModel.modelElements.get(elementId)
            if (modelElement == null) {
               View.redrawAll()
            } else if (modelElement.isLink) {
               this.getEditor(modelElement, event)
            } else if (modelElement.isNode) {
               this.makeContextMenu(modelElement, event)
            }
         })
   }

   // Displays and executes functions from [SheetView](./SheetView.js.md) context menu (right-click/long tap).
   makeContextMenu (modelElement, event) {
      const contextMenuHTML = [
         `<ul id="element-context-menu" data-action="() => void 0">
         <li data-action="this.resizeElement(modelElement)">Resize</li>
         <li data-action="this.getEditor(modelElement, event)">Edit</li>`,
         (modelElement.isVisualizer)
            ? '<li data-action="openInfo()">Group Info</li>'
            : '',
         `<li data-action="modelElement.copy()">Copy</li>
         <hr>
         <li data-action="this.createConnection(modelElement)">Create Connection</li>`,
         (modelElement.isVisualizer)
            ? `<li data-action="this.createMorphism(modelElement)">Create Map</li>`
            : '',
         `<li data-action="this.setAnchor(modelElement)">Set Anchor</li>`,
         (modelElement.anchor_id != null)
            ? `<li data-action="this.removeAnchor(modelElement)">Remove Anchor</li>`
            : '',
         `<hr>
         <li data-action="this.moveForward(modelElement)">Move Forward</li>
         <li data-action="this.moveBackward(modelElement)">Move Backward</li>
         <li data-action="this.moveToFront(modelElement)">Move to Front</li>
         <li data-action="this.moveToBack(modelElement)">Move to Back</li>
         <hr>
         <li data-action="this.viewModel.removeElement(modelElement)">Delete</li>
         </ul>`
      ].join('')

      const openInfo = () => window.open('./GroupInfo.html?groupURL=' + modelElement.group.URL)
      makeDetachedMenu(contextMenuHTML, event)
         .then((action) => {
            eval(action)
         })
   }

   // Left click drag to move element
   setupMove () {
      let redrawTimerId = null
      recognizeMoveResize (this.rootElement,
         (dx, dy, _dw, _dh, _isDrop, domElement) => {
            if (domElement != null && redrawTimerId == null) {
               const element = this.viewModel.modelElements.get(domElement.getAttribute('id'))
               const id = element?.anchor_id ?? element?.id
               redrawTimerId = window.setTimeout(() => {
                  if (dx != 0 || dy != 0) {
                     this.viewModel.move(id, dx, dy)
                  }

                  redrawTimerId = null
               }, 0)
            }
         })
   }

   // Right click drag to pan sheet
   setupDragAndDrop () {
      recognizeDragAndDrop (this.rootElement,
         (_startEvent, previousEvent, endEvent, _isDrop) => {
            const previousPosition = new View.WindowUnits(previousEvent)
            const newPosition = new View.WindowUnits(endEvent)
            const movement = previousPosition.sub(newPosition)
            View.pan(-movement.x, -movement.y)

            this.scheduleRedraw()
         },
         {rightClick: true}
      )
   }

   // Resize sheet with mouse wheel if no element is selected
   setupZoom () {
      recognizeZoom(this.rootElement,
      (zoomFactor) => {
         View.zoom(1 + zoomFactor)
         this.scheduleRedraw()
      })
   }

   // For operations that may be performed repeatedly in rapid succession, like zoom and pan,
   // don't attempt to redraw the sheet on every event, but only periodically
   scheduleRedraw () {
      if (this.#redrawTimer != null) {
         window.clearTimeout(this.#redrawTimer)
      }

      const allVisualizerElements = Array
         .from(this.viewModel.modelElements.values())
         .filter((el) => el.isVisualizer)
         .sort((a, b) => (a?.group?.URL == b?.group?.URL) ? 0 : (a?.group?.URL < b?.group?.URL) ? -1 : 1)

      this.#redrawTimer = window.setTimeout((els) => {
         els.forEach((el) => el.viewElement?.redraw())
         this.#redrawTimer = null
      }, 250, allVisualizerElements)
   }

   getEditor (modelElement, event) {
      if (modelElement.isVisualizer) {
         RemoteEditor.editElement(modelElement)
      } else if (modelElement.className === 'ConnectingElement' || modelElement.className === 'MorphismElement') {
         new (modelElement.className === 'MorphismElement' ? MorphismEditor : ConnectionEditor)(modelElement, event)
      } else {
         new TextEditor(modelElement, event)  // TextElement and RectangleElement
      }
   }

   moveForward (modelElement) {
      const above = this.#nodesSortedByZ().find((el) => el.z > modelElement.z)
      if (above != null) {
         ;[modelElement.z, above.z] = [above.z, modelElement.z]
         modelElement.viewElement?.updateZ()
         above.viewElement?.updateZ()
      }
   }

   moveBackward (modelElement) {
      const below = this.#nodesSortedByZ().reverse().find((el) => el.z < modelElement.z)
      if (below != null) {
         ;[modelElement.z, below.z] = [below.z, modelElement.z]
         modelElement.viewElement?.updateZ()
         below.viewElement?.updateZ()
      }
   }

   moveToFront (modelElement) {
      const nodes = this.#nodesSortedByZ()
      const maxZ = nodes[nodes.length - 1]?.z ?? modelElement.z
      if (modelElement.z < maxZ) {
         modelElement.z = maxZ + 2
         modelElement.viewElement?.updateZ()
      }
   }

   moveToBack (modelElement) {
      const nodes = this.#nodesSortedByZ()
      const minZ = nodes[0]?.z ?? modelElement.z
      if (modelElement.z > minZ) {
         modelElement.z = Math.max(2, minZ - 2)
         modelElement.viewElement?.updateZ()
      }
   }

   #nodesSortedByZ () {
      return Array.from(this.viewModel.modelElements.values())
         .filter((el) => el.isNode)
         .sort((a, b) => a.z - b.z)
   }

   createConnection (source) {
      const test = (target, source) => this.validLinkTarget(target, source, () => true)
      const action = (destination) => this.makeLink('ConnectingElement', source, destination)
      this.createLink(source, 'Target', test, action)
   }

   createMorphism (source) {
      const test = (target, source) => this.validLinkTarget(target, source, (dest) => dest.isNode)
      const action = (destination) => this.makeLink('MorphismElement', source, destination)
      this.createLink(source, 'Target', test, action)
   }

   setAnchor (source) {
      const test = (target, source) => this.validAnchor(target, source)
      const action = (destination) => this.makeAnchor(source, destination)
      this.createLink(source, 'Anchor', test, action)
   }

   removeAnchor (modelElement) {
      modelElement.anchor_id = null
   }

   createLink (source, type, validTarget, clickAction) {
      const location = {
         clientX: source.viewElement.modelElement.x + 0.5 * source.viewElement.modelElement.w,
         clientY: source.viewElement.modelElement.y + 0.5 * source.viewElement.modelElement.h
      }
      const linkingDialogHTML =
         `<div id=linking-dialog style="resize: none">
             <center>Select ${type}</center>
             <center><button data-action="{}">Cancel</button></center>
          </div>`

      const linkingDialog = makeDialog(linkingDialogHTML, location, (ev) => onclick(ev))

      linkingDialog.addEventListener('pointermove',
         (event) => {
            const maybeTarget = document
               .elementsFromPoint(event.clientX, event.clientY)
               .find((element) => element.classList.contains('NodeElement'))

            if (maybeTarget == null) {
               document.querySelectorAll('.outlined').forEach((el) => el.classList.remove('outlined'))
            } else if (!maybeTarget.classList.contains('outlined')) {
               document.querySelectorAll('.outlined').forEach((el) => el.classList.remove('outlined'))
               if (validTarget(maybeTarget, source) != null) {
                  maybeTarget.classList.add('outlined')
               }
            }
         })

      const onclick = (event) => {
         document.querySelectorAll('.outlined').forEach((el) => el.classList.remove('outlined'))
         const actionElement = event.target.closest('[data-action]')
         const action = actionElement?.getAttribute('data-action')
         if (linkingDialog.contains(actionElement) && action != null) {
            linkingDialog.remove()
            eval(action)
         } else {
            const maybeTarget = document
               .elementsFromPoint(event.clientX, event.clientY)
               .find((element) => element.classList.contains('NodeElement'))
            if (maybeTarget != null) {
               const destination = validTarget(maybeTarget, source)
               if (destination != null) {
                  linkingDialog.remove()
                  clickAction(destination)
               }
            }
         }
      }
   }

   validLinkTarget (maybeTarget, source, targetTest) {
      const maybeDestination = this.viewModel.modelElements.get(maybeTarget.getAttribute('id'))
      if (maybeDestination == null) return null
      const isSource = maybeDestination === source
      const isLinkedToSource = Array.from(this.viewModel.modelElements.values())
         .some((el) => el.isLink &&
            ((el.source === source && el.destination === maybeDestination) ||
             (el.source === maybeDestination && el.destination === source)))
      return (targetTest(maybeDestination) && !isSource && !isLinkedToSource) ? maybeDestination : null
   }

   makeLink (type, source, destination) {
      const linkJson = { source_name: source.name, destination_name: destination.name }
      const link = this.viewModel.addObjectAsElement(linkJson, type)

      const editPosition = source.viewElement.center
         .add(destination.viewElement.center)
         .multiplyScalar(0.5).toWindowUnits()
      this.getEditor(link, {clientX: editPosition.x, clientY: editPosition.y})
   }

   validAnchor (maybeTarget, source) {
      const maybeDestination = this.viewModel.modelElements.get(maybeTarget.getAttribute('id'))
      return (maybeDestination == null || maybeDestination == source) ? null : maybeDestination
   }

   makeAnchor (source, destination) {
      if (this.validAnchor(destination.viewElement.domElement, source)) {
         this.viewModel.move(source.id, destination.x - source.x, destination.y + destination.h -  source.y)
         this.viewModel.resize(source.id, destination.w - source.w, 0)
         source.anchor_id = destination.id
      }
   }
}

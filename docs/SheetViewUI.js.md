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
function init (viewModel) {
   const displayElement = document.getElementById('graphic')

   let domElement = null
   let modelElement = null
   let redrawTimer = null

   // Select element for resize
   recognizeSelect(displayElement,
      (event) => {
         const domElement = document.elementFromPoint(event.clientX, event.clientY)
         if (domElement.closest('.NodeElement') != null) {
            const id = domElement.closest('.NodeElement').getAttribute('id')
            const modelElement = viewModel.modelElements.get(id)
            const maybeSummary = document.elementFromPoint(event.clientX, event.clientY).closest('summary')
            if (maybeSummary == null) {
               if (id != null) {
                  resizeElement(id)
               }
            } else {
               maybeSummary.closest('details').addEventListener('toggle', (ev) => {
                  if (modelElement != null) {
                     if (ev.newState == 'closed') {
                        modelElement.move((modelElement.w - modelElement.closedWidth) / 2, 0)
                        modelElement.fontSize = modelElement.closedFontSize
                        modelElement.w = modelElement.closedWidth
                        modelElement.h = modelElement.closedHeight
                        modelElement.z = modelElement.closedZ
                        modelElement.displayNeedsTextUpdate = true
                     } else if (ev.oldState == 'closed') {
                        modelElement.closedFontSize = modelElement.fontSize
                        modelElement.closedWidth = modelElement.w
                        modelElement.closedHeight = modelElement.h
                        modelElement.closedZ = modelElement.z
                        modelElement.fontSize = (parseInt(modelElement.fontSize) < 20) ? '20px' : modelElement.fontSize,
                        modelElement.w = null
                        modelElement.h = null
                        modelElement.z = 2 * (Model.sheetElements.size + 1)
                        // calculate size of open details element
                        modelElement.redraw()
                        // reset x, y so center is where it was when details were opened
                        modelElement.move((modelElement.closedWidth - modelElement.w) / 2, 0)
                     }
                     modelElement.redraw()
                  }
               }, {once: true})
            }
         } else if (domElement.closest('.LinkElement') != null) {
            const modelElement = Model.sheetElements.get(domElement.closest('.LinkElement').getAttribute('id'))
            const viewElement = modelElement.viewElement
            const arrow = viewElement.arrows?.find((arrow) => arrow.line == domElement || arrow.head == domElement)
                  || viewElement.arrow
            if (arrow != null) {
               arrow.highlightColor = (arrow.highlightColor == null) ? '#00ff00' : null  // toggle arrow highlight color
            }
            modelElement.redraw()
         }
      })

   // Right click / long tap to display context menu or raise editor directly
   recognizeContextMenu(displayElement,
      (event) => {
         domElement = document.elementFromPoint(event.clientX, event.clientY).closest('.NodeElement, .LinkElement')
         modelElement = domElement ? Model.sheetElements.get(domElement.getAttribute('id')) : null
         if (modelElement instanceof Model.LinkElement) {
            modelElement.getEditor(event)
         } else if (modelElement instanceof Model.NodeElement) {
            makeContextMenu(modelElement, event)
         } else if (modelElement == null) {
            View.redrawAll()
         }
      })

   let redrawTimerId = null
   recognizeMoveResize (displayElement,
      (dx, dy, _dw, _dh, _isDrop, domElement) => {
         if (domElement != null && redrawTimerId == null) {
            const id = domElement.getAttribute('id')
            redrawTimerId = window.setTimeout(() => {
               if (dx != 0 || dy != 0) {
                  viewModel.move(id, dx, dy)
               }

               redrawTimerId = null
            }, 0)
         }
      })

   // Drag and drop to pan sheet
   recognizeDragAndDrop (displayElement,
      (_startEvent, previousEvent, endEvent, _isDrop) => {
         const previousPosition = new View.WindowUnits(previousEvent)
         const newPosition = new View.WindowUnits(endEvent)
         const movement = previousPosition.sub(newPosition)
         View.pan(-movement.x, -movement.y)

         scheduleRedraw()
      },
      {rightClick: true}
   )

   // Resize sheet from mouse wheel
   recognizeZoom(displayElement,
      (zoomFactor) => {
         View.zoom(1 + zoomFactor)
         scheduleRedraw()
      })

   // Operations that may be performed repeatedly in rapid succession, like zoom and pan,
   // don't attempt to redraw the sheet on every event, but only periodically
   function scheduleRedraw () {
      if (redrawTimer != null) {
         window.clearTimeout(redrawTimer)
      }

      const redrawNodes = (nodes) => {
         nodes.forEach((node) => node.redraw())
         redrawTimer = null
      }

      const allNodes = Array
         .from(((Model.sheetElements.values() /*: any */) /*: Iterator<Model.VisualizerElement> */))
         .filter((el) => el instanceof Model.VisualizerElement)
         .map((el) => ((el /*: any */) /*: Model.VisualizerElement */))
         .sort((a, b) => (a?.group?.URL == b?.group?.URL) ? 0 : (a?.group?.URL < b?.group?.URL) ? -1 : 1)

      redrawTimer = window.setTimeout(redrawNodes, 250, allNodes)
   }
}
/*
```
## resize
```javascript
 */
function resizeElement (id) {
   const modelElement = viewModel.modelElements.get(id)
   // raise domElement z-index to show above other elements
   const domElement = viewModel.view.viewElements.get(id).domElement
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
         viewModel.view.viewElements.get(id)?.redraw()
      })

   const ghostElement = document.getElementById('sheet-resize-ghost')

   recognizeMoveResize(ghostElement, onMoveResize)

   let timerId = null
   function onMoveResize (dx, dy, dw, dh, _isDrop) {
      if (timerId == null) {
         timerId = window.setTimeout(() => {
            if (dx != 0 || dy != 0) {
               viewModel.move(modelElement.id, dx, dy)
            }

            if (dw != 0 || dh != 0) {
               viewModel.resize(modelElement.id, dw, dh)
            }

            syncGhostWithModel()

            timerId = null
         }, 0)
      }
   }

   function syncGhostWithModel () {
      const domElementPosition = domElement.getBoundingClientRect()
      ghostElement.style.left = `${domElementPosition.left}px`
      ghostElement.style.top = `${domElementPosition.top}px`
      ghostElement.style.width = `${domElementPosition.width}px`
      ghostElement.style.height = `${domElementPosition.height}px`
   }
}
/*
```
## makeContextMenu

Displays and executes functions from [SheetView](./SheetView.js.md) context menu (right-click/long tap).

```javascript
 */
function makeContextMenu (modelElement, event) {
   const contextMenuHTML = [
      `<ul id="element-context-menu" data-action="() => void 0">
              <li data-action="resizeElement(modelElement)">Resize</li>
              <li data-action="modelElement.getEditor(event)">Edit</li>`,
      (modelElement instanceof Model.VisualizerElement)
         ? '<li data-action="openInfo(event)">Group Info</li>'
         : '',
      `<li data-action="modelElement.copy()">Copy</li>
              <hr>
              <li data-action="createConnection(modelElement, event)">Create Connection</li>`,
      (modelElement instanceof Model.VisualizerElement)
         ? `<li data-action="createMorphism(modelElement, event)">Create Map</li>`
         : '',
      `<hr>
              <li data-action="modelElement.moveForward()">Move Forward</li>
              <li data-action="modelElement.moveBackward()">Move Backward</li>
              <li data-action="modelElement.moveToFront()">Move to Front</li>
              <li data-action="modelElement.moveToBack()">Move to Back</li>
              <hr>
              <li data-action="modelElement.destroy()">Delete</li>
          </ul>`
   ].join('')
   makeDetachedMenu(contextMenuHTML, event)
      .then((action) => {
         eval(action)
      })

   const openInfo = (event) => {
      window.open('./GroupInfo.html?groupURL=' + modelElement.group.URL)
   }
}
/*
```
## Link functions

### createConnection
```javascript
 */
function createConnection (source, event) {
   createLink(source, event, 'ConnectingElement')
}
/*
```
### createMorphism
```javascript
 */
function createMorphism (source, event) {
   createLink(source, event, 'MorphismElement', (destination) => destination instanceof Model.VisualizerElement)
}
/*
```
### createLink
```javascript
 */
function createLink (source, event, linkType, targetTest = () => true) {
    const linkingDialogHTML =
       `<div id=linking-dialog style="resize: none">
           <center>Select target</center>
           <center><button data-action="{}">Cancel</button></center>
        </div>`

   const linkingDialog = makeDialog(linkingDialogHTML, event, (ev) => onclick(ev))

   linkingDialog.addEventListener('pointermove',
      (event) => {
         // element under event
         const maybeTarget = document
            .elementsFromPoint(event.clientX, event.clientY)
            .find((element) => element.classList.contains('NodeElement'))

         // if cursor is not over an element clear all outlines and return
         if (maybeTarget == null) {
            document.querySelectorAll('.outlined').forEach((element) => element.classList.remove('outlined'))
            return
         }

         // if maybeTarget is already outlined there's nothing to do
         if (!maybeTarget.classList.contains('outlined')) {
            // clear all outlines and outline this element if it's a valid target
            document.querySelectorAll('.outlined').forEach((element) => element.classList.remove('outlined'))
            const destination = getValidDestination(maybeTarget)
            if (destination != null) {
               maybeTarget.classList.add('outlined')
            }
         }
      })

   const onclick = (event) => {
         document.querySelectorAll('.outlined').forEach((element) => element.classList.remove('outlined'))
      const actionElement = event.target.closest('[data-action]')
      const action = actionElement?.getAttribute('data-action')
      if (linkingDialog.contains(actionElement) && action != null) {
         linkingDialog.remove()
         eval(action)
      } else {
         // find candidate target as topmost element at event coordinates
         const maybeTarget = document
            .elementsFromPoint(event.clientX, event.clientY)
            .find((element) => element.classList.contains('NodeElement'))
         // if it's a valid target
         if (maybeTarget != null) {
            const destination = getValidDestination(maybeTarget)
            if (destination != null) {
               linkingDialog.remove()

               // create a connection from source to candidate target
               const linkJson = { sourceId: source.id, destinationId: destination.id }
               const link = Model.addElement(linkJson, linkType)

               // create and place editor
               const editPosition = source.viewElement.center
                  .add(destination.viewElement.center)
                  .multiplyScalar(0.5)
                  .toWindowUnits()
               link.getEditor(editPosition)
            }
         }
      }
   }

   function getValidDestination (maybeTarget) {
      const maybeDestinationId = maybeTarget.getAttribute('id')
      const maybeDestination = Model.sheetElements.get(maybeDestinationId)
      const isSource = (maybeDestination === source)
      const isLinkedToSource =
         maybeDestination.links.some((link) => link.source === source || link.destination === source)
      return (targetTest(maybeDestination) && !isSource && !isLinkedToSource) ? maybeDestination : null
   }
}

/*

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
import * as SheetModel from './SheetModel.js'
import * as SheetViewModel from './SheetViewModel.js'
import * as SheetView from './SheetView.js'
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

/*
## init

Top level sheet controller, recognizes top-level user inputs
````javascript
 */
export function init (viewModel: SheetViewModel.SheetViewModel, displayElement: HTMLElement) {
   new SheetEventUI(viewModel, displayElement)
}

class SheetEventUI {
   viewModel: SheetViewModel.SheetViewModel
   rootElement: HTMLElement
   #redrawTimer: Maybe<TimeoutID> = null

   constructor (viewModel: SheetViewModel.SheetViewModel, rootElement: HTMLElement) {
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
      recognizeSelect(this.rootElement,      // Select element for resize
         (event: MouseEvent) => {
            const clickedElement = document.elementFromPoint(event.clientX, event.clientY) as Maybe<HTMLElement>
            const selectedNodeOrLink = clickedElement?.closest('.NodeElement, .LinkElement') as Maybe<HTMLElement>
            const modelElement = this.viewModel.modelElements.get(selectedNodeOrLink?.getAttribute('id') ?? '')
            if (modelElement == null)
               return
            if ('isNode' in modelElement) {
               this.resizeElement(modelElement as SheetViewModel.NodeElement)
            } else if ('isLink' in modelElement) {
               const viewElement = modelElement.viewElement as SheetView.LinkView
               let arrow
               if ('arrows' in viewElement) {
                  arrow = (viewElement as SheetView.MorphismView).arrows
                     .find((arrow) => arrow.line == clickedElement || arrow.head == clickedElement)
               }
               if (arrow == null) {
                  arrow = viewElement.arrow
               }
               if (arrow != null) {
                  arrow.highlightColor = (arrow.highlightColor == null) ? '#00ff00' : null
                  viewElement.redraw()
               }
            }
         })
   }

   resizeElement (modelElement: SheetViewModel.NodeElement) {
      // raise domElement z-index to show above other elements
      const domElement = document.querySelector(`[id="${modelElement.id}"]`) as HTMLElement
      const originalZIndex = domElement.style.zIndex
      domElement.style.zIndex = '1000'

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


      // listen for changes in ghost style with MutationObserver, sync ghost and model at end of event loop
      let timerId: Maybe<number> = null
      const mutationObserver = new MutationObserver(() => {
         if (timerId == null) {
            timerId = window.setTimeout(() => {
               const ghostRect = document.getElementById('sheet-resize-ghost')?.getBoundingClientRect()
               if (ghostRect != null) {
                  const modelRect = modelElement.viewElement.domElement.getBoundingClientRect()
                  const dx = ghostRect.left - modelRect.left
                  const dy = ghostRect.top - modelRect.top
                  const dw = ghostRect.width - modelRect.width
                  const dh = ghostRect.height - modelRect.height

                  if (dx != 0 || dy != 0) {
                     if (modelElement.anchor_id != null) {
                        this.viewModel.move(modelElement.anchor_id, dx, dy)
                     } else {
                        modelElement.move(dx, dy)
                     }
                  }

                  if (dw != 0 || dh != 0) {
                     modelElement.resize(modelElement.anchor_id != null ? 0 : dw, dh)
                  }
               }
               timerId = null
            }, 0)
         }
      })

      const sheetResizeModal = makeDialog(resizeHTML,
         {clientX: ghostLeft, clientY: ghostTop},
         (_clickEvent) => {
            sheetResizeModal.remove()
            domElement.style.zIndex = originalZIndex
            this.viewModel.view.viewElements.get(modelElement.id)?.redraw()
            mutationObserver.disconnect()
         })

      const ghostElement = document.getElementById('sheet-resize-ghost') as HTMLElement
      mutationObserver.observe(ghostElement, {attributeFilter: ['style']})
   }

   // Right click / long tap to display context menu on Node or raise editor directly on Link
   setupContextMenu () {
      recognizeContextMenu(this.rootElement,
         (event: MouseEvent) => {
            const selectedElement = document.elementFromPoint(event.clientX, event.clientY) as Maybe<HTMLElement>
            const domElement = selectedElement?.closest('.NodeElement, .LinkElement') as Maybe<HTMLElement>
            const elementId = domElement?.getAttribute('id')
            const modelElement = this.viewModel.modelElements.get(elementId ?? '')
            if (modelElement == null) {
               SheetView.redrawAll()
            } else if ('isLink' in modelElement) {
               this.getEditor(modelElement as SheetViewModel.LinkElement, event)
            } else if ('isNode' in modelElement) {
               this.makeContextMenu(modelElement as SheetViewModel.NodeElement, event)
            }
         })
   }

   // Displays and executes functions from [SheetView](./SheetView.js.md) context menu (right-click/long tap).
   makeContextMenu (modelElement: SheetViewModel.NodeElement, event: MouseEvent) {
      const contextMenuHTML = [
         `<ul id="element-context-menu" data-action="() => void 0">
         <li data-action="this.resizeElement(modelElement)">Resize</li>
         <li data-action="this.getEditor(modelElement, event)">Edit</li>`,
         ('isVisualizer' in modelElement)
            ? '<li data-action="openInfo()">Group Info</li>'
            : '',
         `<li data-action="modelElement.copy()">Copy</li>
         <hr>
         <li data-action="this.createConnection(modelElement)">Create Connection</li>`,
         ('isVisualizer' in modelElement)
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

      const openInfo = () =>
         window.open('./GroupInfo.html?groupURL=' + (modelElement as SheetViewModel.VisualizerElement).group.URL)
      makeDetachedMenu(contextMenuHTML, event)
         .then((action) => (action != null) && eval(action))
   }

   // Left click drag to move element
   setupMove () {
      let redrawTimerId: Maybe<number> = null
      recognizeMoveResize (this.rootElement,
         (dx, dy, _dw, _dh, _isDrop, domElement) => {
            if (domElement != null && redrawTimerId == null) {
               const element = this.viewModel.modelElements.get(domElement.getAttribute('id') as string)
               const id = (element as Record<string, any>)?.anchor_id ?? element?.id
               if (id != null) {
                  redrawTimerId = window.setTimeout(() => {
                     if (dx != 0 || dy != 0) {
                        this.viewModel.move(id, dx, dy)
                     }
                     redrawTimerId = null
                  }, 0)
               }
            }
         })
   }

   // Right click drag to pan sheet
   setupDragAndDrop () {
      recognizeDragAndDrop (this.rootElement,
         (_startEvent, previousEvent, endEvent, _isDrop) => {
            SheetView.pan(endEvent.clientX - previousEvent.clientX, endEvent.clientY - previousEvent.clientY)

            this.scheduleRedraw()
         },
         {rightClick: true}
      )
   }

   // Resize sheet with mouse wheel if no element is selected
   setupZoom () {
      recognizeZoom(this.rootElement,
      (zoomFactor) => {
         SheetView.zoom(1 + zoomFactor)
         this.scheduleRedraw()
      })
   }

   // For operations that may be performed repeatedly in rapid succession, like zoom and pan,
   // don't attempt to redraw the sheet on every event, but only periodically
   scheduleRedraw () {
      if (this.#redrawTimer != null) {
         window.clearTimeout(this.#redrawTimer)
      }

      const allVisualizerElements = (Array
         .from(this.viewModel.modelElements.values())
         .filter((el) => 'isVisualizer' in el) as SheetViewModel.VisualizerElement[])
         .sort((a, b) => (a.group.URL == b.group.URL) ? 0 : (a.group.URL < b.group.URL) ? -1 : 1)

      this.#redrawTimer = window.setTimeout((els: typeof allVisualizerElements) => {
         els.forEach((el) => el.viewElement?.redraw())
         this.#redrawTimer = null
      }, 250, allVisualizerElements)
   }

   getEditor (modelElement: SheetViewModel.SheetElement, event: NumberLocation) {
      if ('isVisualizer' in modelElement) {
         RemoteEditor.editElement(modelElement as SheetViewModel.VisualizerElement)
      } else if (modelElement.className === 'ConnectingElement') {
         new ConnectionEditor(modelElement as SheetViewModel.ConnectingElement, event)
      } else if (modelElement.className === 'MorphismElement') {
         new MorphismEditor(modelElement as SheetViewModel.MorphismElement, event)
      } else {
         new TextEditor(modelElement as SheetViewModel.TextElement, event)
      }
   }

   moveForward (modelElement: SheetViewModel.NodeElement) {
      const above = this.#nodesSortedByZ().find((el) => el.z > modelElement.z)
      if (above != null) {
         ;[modelElement.z, above.z] = [above.z, modelElement.z]
         modelElement.viewElement?.updateZ()
         above.viewElement?.updateZ()
      }
   }

   moveBackward (modelElement: SheetViewModel.NodeElement) {
      const below = this.#nodesSortedByZ().reverse().find((el) => el.z < modelElement.z)
      if (below != null) {
         ;[modelElement.z, below.z] = [below.z, modelElement.z]
         modelElement.viewElement?.updateZ()
         below.viewElement?.updateZ()
      }
   }

   moveToFront (modelElement: SheetViewModel.NodeElement) {
      const nodes = this.#nodesSortedByZ()
      const maxZ = nodes[nodes.length - 1]?.z ?? modelElement.z
      if (modelElement.z < maxZ) {
         modelElement.z = maxZ + 2
         modelElement.viewElement?.updateZ()
      }
   }

   moveToBack (modelElement: SheetViewModel.NodeElement) {
      const nodes = this.#nodesSortedByZ()
      const minZ = nodes[0]?.z ?? modelElement.z
      if (modelElement.z > minZ) {
         modelElement.z = Math.max(2, minZ - 2)
         modelElement.viewElement?.updateZ()
      }
   }

   #nodesSortedByZ (): SheetViewModel.NodeElement[] {
      return (Array.from(this.viewModel.modelElements.values())
         .filter((el) => 'isNode' in el) as SheetViewModel.NodeElement[])
         .sort((a, b) => a.z - b.z)
   }

   createConnection (source: SheetViewModel.NodeElement) {
      const test = (target: HTMLElement, source: SheetViewModel.NodeElement) => 
         this.validLinkTarget('ConnectingElement', source, target)
      const action = (destination: SheetViewModel.NodeElement) => this.makeLink('ConnectingElement', source, destination)
      this.createLink(source, 'Target', test, action)
   }

   createMorphism (source: SheetViewModel.VisualizerElement) {
      const test = (target: HTMLElement, source: SheetViewModel.NodeElement) =>
         this.validLinkTarget('MorphismElement', source, target)
      const action = (destination: SheetViewModel.NodeElement) => this.makeLink('MorphismElement', source, destination)
      this.createLink(source, 'Target', test, action)
   }

   setAnchor (source: SheetViewModel.NodeElement) {
      const test = (target: HTMLElement, source: SheetViewModel.NodeElement) => this.validAnchor(target, source)
      const action = (destination: SheetViewModel.NodeElement) => this.makeAnchor(source, destination)
      this.createLink(source, 'Anchor', test, action)
   }

   removeAnchor (modelElement: SheetViewModel.NodeElement) {
      modelElement.anchor_id = null
   }

   createLink (
      source: SheetViewModel.NodeElement,
      type: 'Target' | 'Anchor',
      validTarget: (target: HTMLElement, source: SheetViewModel.NodeElement) => Maybe<SheetViewModel.NodeElement>,
      clickAction: (destination: SheetViewModel.NodeElement) => void
   ) {
      const location = {
         clientX: source.viewElement.modelElement.x + 0.5 * source.viewElement.modelElement.w,
         clientY: source.viewElement.modelElement.y + 0.5 * source.viewElement.modelElement.h
      }
      const linkingDialogHTML =
         `<div id=linking-dialog style="resize: none">
             <center>Select ${type}</center>
             <center><button data-action="{}">Cancel</button></center>
          </div>`

      const linkingDialog = makeDialog(linkingDialogHTML, location, (ev) => onclick(ev as MouseEvent))

      linkingDialog.addEventListener('pointermove',
         (event: PointerEvent) => {
            const maybeTarget = document
               .elementsFromPoint(event.clientX, event.clientY)
               .find((element) => element.classList.contains('NodeElement')) as Maybe<HTMLElement>

            if (maybeTarget == null) {
               document.querySelectorAll('.outlined').forEach((el) => el.classList.remove('outlined'))
            } else if (!maybeTarget.classList.contains('outlined')) {
               document.querySelectorAll('.outlined').forEach((el) => el.classList.remove('outlined'))
               if (validTarget(maybeTarget, source) != null) {
                  maybeTarget.classList.add('outlined')
               }
            }
         })

      const onclick = (event: MouseEvent) => {
         document.querySelectorAll('.outlined').forEach((el) => el.classList.remove('outlined'))
         const actionElement = (event.target as HTMLElement)?.closest('[data-action]')
         const action = actionElement?.getAttribute('data-action')
         if (linkingDialog.contains(actionElement) && action != null) {
            linkingDialog.remove()
            eval(action)
         } else {
            const maybeTarget = document
               .elementsFromPoint(event.clientX, event.clientY)
               .find((element) => element.classList.contains('NodeElement')) as Maybe<HTMLElement>
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

   validLinkTarget (
      linkType: 'ConnectingElement' | 'MorphismElement',
      source: SheetViewModel.NodeElement,
      maybeTarget: HTMLElement,
   ): Maybe<SheetViewModel.NodeElement> {
      const maybeDestination = this.viewModel.modelElements.get(maybeTarget.getAttribute('id') ?? '') as SheetViewModel.NodeElement
      return this.viewModel.model.canConnect(linkType, source, maybeDestination) ? maybeDestination : null
   }

   makeLink (
      type: 'ConnectingElement' | 'MorphismElement',
      source: SheetViewModel.NodeElement,
      destination: SheetViewModel.NodeElement
   ) {
      const linkJson: SheetModel.SheetTypes['LinkElement'] =
         { className: type, source_id: source.id, destination_id: destination.id }
      const link = this.viewModel.addObjectAsElement(linkJson, type) as SheetViewModel.LinkElement

      const midpoint = source.viewElement.center.add(destination.viewElement.center).multiplyScalar(0.5)
      const displayPos = SheetView.modelToDisplay(midpoint)
      this.getEditor(link,
         { clientX: displayPos.x + SheetView.graphicRect.x, clientY: displayPos.y + SheetView.graphicRect.y })
   }

   validAnchor (maybeTarget: HTMLElement, source: SheetViewModel.NodeElement): Maybe<SheetViewModel.NodeElement> {
      const maybeDestination =
         this.viewModel.modelElements.get(maybeTarget.getAttribute('id') ?? '') as Maybe<SheetViewModel.NodeElement>
      return (maybeDestination != null && 'isNode' in maybeDestination && maybeDestination != source)
         ? maybeDestination
         : null
   }

   makeAnchor (source: SheetViewModel.NodeElement, destination: SheetViewModel.NodeElement) {
      if (this.validAnchor(destination.viewElement.domElement, source)) {
         const zoom = SheetView.zoomFactor
         this.viewModel.move(source.id, (destination.x - source.x) * zoom, (destination.y + destination.h -  source.y) * zoom)
         this.viewModel.resize(source.id, destination.w - source.w, 0)
         source.anchor_id = destination.id
      }
   }
}

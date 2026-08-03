/*

# CycleGraphViewUI component

This component adds the following UI gestures to a CycleGraphView:
*   display/clear label -- click / tap ([select](#select))
*   zoom in/out -- wheel ([zoom](#zoom)) / two-finger pinch-spread ([pinch](#pinch))
*   move graph -- drag-and-drop / one-finger drag ([move](#move))
*   recenter, reset zoom -- right click / two-finger tap ([rightSelect](#rightselect))

```javascript
 */
import { recognizeSelect, recognizeContextMenu, recognizeDragAndDrop, recognizeZoom } from './Gestures.js'
import { makeTooltip } from './UIComponents.js'

export function addGestures (cycleGraphView: CycleGraphView) {
   cycleGraphView.reset()
   addSelect(cycleGraphView)
   addContextMenu(cycleGraphView)
   addMove(cycleGraphView)
   addZoom(cycleGraphView)
}

import type { CycleGraphView } from './CycleGraphView.js'
/*
```
### select
```javascript
*/
function addSelect (cycleGraphView: CycleGraphView) {
   recognizeSelect(cycleGraphView.canvas,
      (event: MouseEvent) => {
         const boundingRectangle = cycleGraphView.canvas.getBoundingClientRect()
         const clickX = event.clientX - boundingRectangle.left
         const clickY = event.clientY - boundingRectangle.top
         const groupElement = cycleGraphView.select(clickX, clickY)
         if (groupElement != null) {
            const tooltip =
               `<div id="node-label">
                   ${cycleGraphView.group.representation[groupElement]}
                </div>`
            makeTooltip(tooltip, event)
         }
      })
}
/*
```
### contextMenu
```javascript
*/
function addContextMenu (cycleGraphView: CycleGraphView) {
   recognizeContextMenu(cycleGraphView.canvas,
      (_event: Event) => {
         cycleGraphView.reset()
      })
}
/*
```
### move
```javascript
*/
function addMove (cycleGraphView: CycleGraphView) {
   recognizeDragAndDrop(cycleGraphView.canvas,
      (startEvent: MouseEvent, _previousEvent: MouseEvent, currentEvent: MouseEvent, isDrop: boolean) => {
         const dx = currentEvent.clientX - startEvent.clientX
         const dy = currentEvent.clientY - startEvent.clientY
         if (isDrop) {
            cycleGraphView.canvas.style.transform = ''
            cycleGraphView.move(dx, dy)
            cycleGraphView.showGraphic()
         } else {
            cycleGraphView.canvas.style.transform = `translate(${dx}px, ${dy}px)`
         }
      })
}
/*
```
### zoom
```javascript
*/
function addZoom (cycleGraphView: CycleGraphView) {
   let totalZoom = 1
   recognizeZoom(cycleGraphView.canvas,
      (scaleFactor: number, isLastEvent: boolean) => {
         totalZoom *= (1 + scaleFactor)
         if (isLastEvent) {
            cycleGraphView.canvas.style.transform = ''
            cycleGraphView.zoom(totalZoom)
            totalZoom = 1
         } else {
            cycleGraphView.canvas.style.transformOrigin = 'center'
            cycleGraphView.canvas.style.transform = `scale(${totalZoom})`
         }
      })
}

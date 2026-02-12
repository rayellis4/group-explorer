/* @flow

# CycleGraphViewUI component

This component adds the following UI gestures to a CycleGraphView:
*   display/clear label -- click / tap ([select](#select))
*   zoom in/out -- wheel ([zoom](#zoom)) / two-finger pinch-spread ([pinch](#pinch))
*   move graph -- drag-and-drop / one-finger drag ([move](#move))
*   recenter, reset zoom -- right click / two-finger tap ([rightSelect](#rightselect))

```javascript
 */
import {recognizeSelect, recognizeContextMenu, recognizeDragAndDrop, recognizeZoom} from './Gestures.js'
import {makeTooltip} from './UIComponents.js'

export {addGestures}

function addGestures (cycleGraphView) {
   cycleGraphView.reset()
   addSelect(cycleGraphView)
   addContextMenu(cycleGraphView)
   addMove(cycleGraphView)
   addZoom(cycleGraphView)
}
/*
```
### select
```javascript
*/
function addSelect (cycleGraphView) {
   recognizeSelect(cycleGraphView.canvas,
      (event) => {
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
function addContextMenu (cycleGraphView) {
   recognizeContextMenu(cycleGraphView.canvas,
      (_event) => {
         cycleGraphView.reset()
      })
}
/*
```
### move
```javascript
*/
function addMove (cycleGraphView) {
   recognizeDragAndDrop(cycleGraphView.canvas,
      (startEvent, _previousEvent, currentEvent, isDrop) => {
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
function addZoom (cycleGraphView) {
   let totalZoom = 1
   recognizeZoom(cycleGraphView.canvas,
      (scaleFactor, isLastEvent) => {
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

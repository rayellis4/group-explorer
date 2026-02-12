/* @flow

# MulttableViewUI component

This component adds the following UI gestures to a MulttableView:
*   display/clear label -- click / tap ([select](#select), [displayLabel(#displaylabel))
*   zoom in/out -- wheel ([zoom](#zoom)) / two-finger pinch-spread ([pinch](#pinch))
*   move graph -- drag-and-drop / one-finger drag ([move](#move))
*   recenter, reset zoom -- right click / two-finger tap ([rightSelect](#rightselect))
*   move row/column -- Shift drag-and-drop / one-finger drag ([move](#move); [dragStart](#dragstart), [dragOver](#dragover), [dragEnd](#dragend))

```javascript
 */
import {THREE} from '../lib/externals.js';
import {recognizeSelect, recognizeContextMenu, recognizeDragAndDrop, recognizeZoom, isLongTap} from './Gestures.js'
import {makeTooltip} from './UIComponents.js'

export {addGestures}

function addGestures (multtableView) {
   multtableView.resetZoom()
   addSelect(multtableView)
   addContextMenu(multtableView)
   addMove(multtableView)
   addZoom(multtableView)
}
/*
```
### select
```javascript
 */
function addSelect (multtableView) {
   recognizeSelect(multtableView.canvas,
      (event) => {
         const rowXcol = loc2rowXcol(multtableView, event);
         const hasLabel = rowXcol &&
            document.querySelector(`#node-label[row='${rowXcol.row}'][col='${rowXcol.col}']`) != null
         if (rowXcol != undefined && !hasLabel) {
            const elements = multtableView.elements
            const element = multtableView.group.mult(elements[rowXcol.row], elements[rowXcol.col])
            const tooltip =
               `<div id="node-label">
                   ${multtableView.group.representation[element]}
                </div>`
            makeTooltip(tooltip, event)
         }
      })
}
/*
```
### rightSelect

Note that we wait until a pointerup event occurs, so we don't confuse this gesture with the
long-tap drag and drop used in [addMove](#addMove) below to swap rows/columns

```javascript
 */
function addContextMenu (multtableView) {
   recognizeContextMenu(multtableView.canvas,
      (_event) => {
         multtableView.resetZoom()
      },
      {returnOnLongTapTimeout: true}
   )
}
/*
```
### zoom
```javascript
 */
function addZoom (multtableView) {
   let totalZoom = 1
   recognizeZoom(multtableView.canvas,
      (scaleFactor, isLastEvent) => {
         totalZoom *= (1 + scaleFactor)
         if (isLastEvent) {
            multtableView.canvas.style.transform = ''
            multtableView.zoom(totalZoom)
            totalZoom = 1
         } else {
            multtableView.canvas.style.transformOrigin = 'center'
            multtableView.canvas.style.transform = `scale(${totalZoom})`
         }
      })
}
/*
```
### move
```javascript
 */
function addMove (multtableView) {
   let dragImage = null
   recognizeDragAndDrop(multtableView.canvas,
      (startEvent, _previousEvent, currentEvent, isDrop) => {
         if (  currentEvent.shiftKey
            || dragImage != null
            || startEvent == currentEvent
            || isLongTap(startEvent, currentEvent)  // check same square?
         ) {
            if (dragImage == null) {
               dragImage = dragStart(currentEvent, multtableView, dragImage)
            } else if (isDrop) {
               dragImage = dragEnd(currentEvent, multtableView, dragImage)
            } else {
               dragImage = dragOver(currentEvent, multtableView, dragImage)
            }
         } else {
            const dx = currentEvent.clientX - startEvent.clientX
            const dy = currentEvent.clientY - startEvent.clientY
            if (isDrop) {
               multtableView.canvas.style.transform = ''
               multtableView.move(dx, dy)
               multtableView.showGraphic()
            } else {
               multtableView.canvas.style.transform = `translate(${dx}px, ${dy}px)`
            }
         }
      },
      {returnOnLongTapTimeout: true}  // to give user feedback when long-tap has been completed
   )
}
/*
```
#### loc2rowXcol

Determine row and column from location
```javascript
 */
function loc2rowXcol (multtableView, event /*: eventLocation */) /*: ?rowXcol */ {
   const bounding_rectangle = document.getElementById('graphic').getBoundingClientRect();
   const canvasX = event.clientX - bounding_rectangle.left;
   const canvasY = event.clientY - bounding_rectangle.top;
   return multtableView.xy2rowXcol(canvasX, canvasY);
}
/*
```
### dragStart

Creates a drag image of the row/column under the pointer and appends it to the canvas' parent.
```javascript
 */
function dragStart (event, multtableView, dragImage) {
   const rowXcol = loc2rowXcol(multtableView, event)  // row, column of event location

   if (rowXcol == undefined)
      return

   // find width of a single cell, and width of the entire table
   // make these the width and height of the img, bounded by canvas size
   const cellSize = multtableView.transform.elements[0];  // [0] is the scale in the transform matrix
   const tableSize = multtableView.table_size * cellSize;

   let width, height, swapping, start;
   if (rowXcol.row == 0 && rowXcol.col != 0) {  // dragging column?
      [swapping, start, width, height] = ['col', rowXcol.col, cellSize, tableSize];
   } else if (rowXcol.col == 0 && rowXcol.row != 0) {  // dragging row?
      [swapping, start, width, height] = ['row', rowXcol.row, tableSize, cellSize];
   } else {
      return
   }

   // upper left corner of clicked cell in canvas-relative coordinates
   const position = new THREE.Vector3(rowXcol.col, rowXcol.row, 1).applyMatrix3(multtableView.transform);

   const style =
      `position: absolute;
          width: ${width}px; height: ${height}px;
          z-index: 10;
          object-fit: none;
          object-position: -${position.x.toFixed(0)}px -${position.y.toFixed(0)}px;
          opacity: 0.75;`

   const dragImageTemplate =
      `<img id="drag-image" src="${multtableView.canvas.toDataURL()}" swapping="${swapping}"
             start="${start}" style="${style}">`

   const template = document.createElement('template')
   template.innerHTML = dragImageTemplate.trim()
   dragImage = template.content.children[0]
   multtableView.canvas.parentElement.append(dragImage)

   return dragOver(event, multtableView, dragImage)
}
/*
```
### dragOver

Moves the drag image with the pointer
```javascript
 */
function dragOver (event, multtableView, dragImage) {
   const rowXcol = loc2rowXcol(multtableView, event)

   // must be on first row / column to display drag image
   const swapping = dragImage.getAttribute('swapping')
   if (rowXcol != undefined
      && ((swapping == 'row' && rowXcol.col == 0 && rowXcol.row != 0)
         || (swapping == 'col' && rowXcol.row == 0 && rowXcol.col != 0))
   ) {
      dragImage.style.display = ''
      dragImage.style.top = `${event.clientY}px`
      dragImage.style.left = `${event.clientX}px`
   } else {
      dragImage.style.display = 'none'
   }

   return dragImage
}
/*
```
### dragEnd

Only swap the dragged row with the row under the pointer if
 *   pointer is over the table
 *   pointer is still in the 1st row / column and isn't in [0,0]
 *   pointer isn't in the original row / column (so there's no swap to be done)

```javascript
 */
function dragEnd (event, multtableView, dragImage) {
   if (dragImage != null) {
      const rowXcol = loc2rowXcol(multtableView, event)
      if (rowXcol != undefined) {
         const swapping = dragImage.getAttribute('swapping')
         const start = parseInt(dragImage.getAttribute('start'))
         if ((swapping == 'row' && (rowXcol.col == 0 && rowXcol.row != 0 && rowXcol.row != start))
            || (swapping == 'col' && (rowXcol.row == 0 && rowXcol.col != 0 && rowXcol.col != start))
         ) {
            if (swapping == 'row') {
               multtableView.swap(start, rowXcol.row)
            } else {
               multtableView.swap(start, rowXcol.col)
            }
         }
      }
      dragImage.remove()
   }

   return null
}

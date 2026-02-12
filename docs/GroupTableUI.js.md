/* @flow

# GroupTableUI component

This componenet implements user interactions with the library table in the [GroupExplorer main page](./GroupExplorer.html.md)
These include
 * [Table sort](#table-sort)
 * [Highlighting and Hover Help](#highlighting-and-hover-help)
```javascript
*/

import * as GEUtils from './GEUtils.js'
import {positionElement} from './UIComponents.js'

export {addGestures}

function addGestures (table) {
   const tableId = table.getAttribute('id')
   table.insertAdjacentHTML('beforeend',
      `<style>
          #{tableId} tr.highlighted {
             background-color: hsl(0, 0%, 96%);
          }
          #${tableId} td.emphasized {
             background-color: hsl(0, 0%, 85%);
          }
          #${tableId} td.cayley-diagram.emphasized {
             background-color: hsl(0, 38%, 90%);
          }
          #${tableId} td.multiplication-table.emphasized {
             background-color: hsl(79, 100%, 93%);
          }
          #${tableId} td.symmetry-object.emphasized {
             background-color: hsl(120, 38%, 90%);
          }
          #${tableId} td.cycle-graph.emphasized {
             background-color: hsl(240, 38%, 90%);
          }
          #${tableId} td.no-diagram.emphasized {
             background-color: white;
          }

          #tooltip {
             background-color: black;
             color: white;
             box-shadow: -8px 8px 8px rgba(0,0,0,0.2);	/* gray mist */
             padding: 4px 8px;
             position: fixed;
             white-space: nowrap;
          }

          #${tableId} th {
             padding-left: 1.5ch;
             padding-right: 1.5ch;
          }
          #${tableId} th.sortable:after {
             content: '  ';
          }
          #${tableId} th.sort-up:after {
             content: "  ▼";
          }
          #${tableId} th.sort-down:after {
             content: "  ▲";
             display: inline;
          }

       </style>`)

   const tableBody = table.querySelector('tbody')

   // set up table sort handler and do initial table sort
   table.querySelectorAll('th.sortable')
      .forEach((el) => el.addEventListener('click', tableSortHandler))
   setTimeout(() => tableSort(document.getElementById('group-table-headers').children[0]))

   // set up highlight, hover help handlers
   ;['pointerenter', 'pointerout', 'pointerleave']
      .forEach((eventType) => tableBody.addEventListener(eventType, eventHandler))
}
/*
```
### Table sort
```javascript
 */
// callback to sort table on column value, invoked by clicking on column head
function tableSortHandler (event /*: JQueryEventObject */) {
   const column = event.currentTarget;
   tableSort(column)
}

function tableSort (column) {
   const columnIndex = Array.from(document.querySelectorAll('#group-table-headers th'))
      .findIndex((headerColumn) => headerColumn == column)
   const sortAscending = !column.classList.contains('sort-up')
   document.querySelectorAll('#group-table-headers th.sortable')
      .forEach((headerColumn) => {
         const classList = headerColumn.classList
         classList.remove('sort-down')
         classList.remove('sort-up')
         if (headerColumn == column) {
            classList.add(sortAscending ? 'sort-up' : 'sort-down')
         }
      })

   const compareFunction = [
      (v1, v2) => {
         const [[v11, v12], [v21, v22]] = [v1.split(','), v2.split(',')]
         return v11 - v21 || v12 - v22
      },
      (v1, v2) => v1.replace('(', '').toString().localeCompare(v2.replace('(', '')),
      (v1, v2) => v1 - v2,
   ][columnIndex]
   const getCellValue = (row, columnIndex) /*: string */ => row.children[columnIndex].textContent;
   const sortFunction = (a /*: HTMLTableCellElement */, b /*: HTMLTableCellElement */) =>
      compareFunction(getCellValue(sortAscending ? a : b, columnIndex), getCellValue(sortAscending ? b : a, columnIndex))
   const tableBody = document.querySelector('#group-table tbody')
   Array.from(tableBody.children)
        .sort(sortFunction)
        .forEach((row) => tableBody.append(row))
}
/*
```
### Highlighting and hover help

Displays hover help on touch platform by starting 500ms timer when pointer/touch enters element,
cancelling the timer should the pointer leave.

By default dragging your finger across the screen in a touch device browser will cause scrolling. To
keep the display steady while moving around to highlight different cells we prevent the default
action of `touchmove` and use only two-finger scrolling.

```javascript
 */
let lastRow = null
let lastCell = null
let tooltipTimer = null
function eventHandler (event) {
   // only consider one-pointer events
   if (event.isPrimary == false || (event.touches != null && event.touches.length != 1))
      return

   const newRow = (row) => {
      lastRow = row
      Array.from(document.getElementsByClassName('highlighted')).forEach((el) => el.classList.remove('highlighted'))
      row?.classList.add('highlighted')
   }

   const newCell = (cell, position) => {
      lastCell = cell

      // clear highlighting, set new
      Array.from(document.getElementsByClassName('emphasized')).forEach((el) => el.classList.remove('emphasized'))
      cell?.classList.add('emphasized')

      if (GEUtils.isTouchDevice()) {
         // delete old tooltip
         document.getElementById('tooltip')?.remove()

         // stop timer for old tooltip
         if (tooltipTimer != null) {
            clearTimeout(tooltipTimer)
            tooltipTimer = null
         }

         // start timer for new tooltip
         const title = cell?.getAttribute('title')
         if (title != null) {
            const displayTooltip = () => {
               cell.insertAdjacentHTML('beforeend', `<div id="tooltip">${title}</div>`)
               const tooltip = document.getElementById('tooltip')
               positionElement(tooltip, position)
               tooltip.style.visibility = 'visible'
               tooltipTimer = null
            }
            tooltipTimer = setTimeout(displayTooltip, 500)
         }
      }
   }

   const position = (event.type == 'touchmove') ? event.touches[0] : event
   const element = document.elementFromPoint(position.clientX, position.clientY)
   const cell = element?.closest('td')
   const row = cell?.closest('tr')

   switch (event.type) {
   case 'pointerenter':
      newRow(row)
      newCell(cell, position)
      document.getElementById('group-table-body').addEventListener('touchmove', eventHandler)
      break

   case 'touchmove':
      event.preventDefault()  // This keeps single-finger moves from scrolling on Mobile Safari
   case 'pointerout':
      if (row != lastRow) {
         newRow(row)
         newCell(cell, position)
      } else if (cell != lastCell) {
         newCell(cell, position)
      }
      break

   case 'pointerleave':
      newRow(null)
      newCell(null)
      document.getElementById('group-table-body').removeEventListener('touchmove', eventHandler)
      break

   default:
   }
}

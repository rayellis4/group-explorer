/* @flow

# GroupTableUI component

This componenet implements user interactions with the library table in the [GroupExplorer main page](./GroupExplorer.html.md)
These include
 * [Table sort](#table-sort)
 * [Highlighting and Hover Help](#highlighting-and-hover-help)
```javascript
*/

import {positionElement} from './UIComponents.js'

export {addGestures}

function addGestures (table) {
   const tableId = table.getAttribute('id')
   table.insertAdjacentHTML('beforeend',
      `<style>
          #${tableId} tr:hover {
             background-color: hsl(0, 0%, 96%);
          }
          #${tableId} tr.highlighted {
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
             box-shadow: -8px 8px 8px rgba(0,0,0,0.2);
             padding: 4px 8px;
             position: fixed;
             white-space: nowrap;
          }

          #${tableId} th {
             padding-left: 1.5ch;
             padding-right: 1.5ch;
          }
          #${tableId} th.sortable:after {
             content: '  ';
          }
          #${tableId} th.sort-up:after {
             content: "  ▼";
          }
          #${tableId} th.sort-down:after {
             content: "  ▲";
             display: inline;
          }

       </style>`)

   const tableBody = table.querySelector('tbody')

   // prevent double-tap zoom; single-finger scroll still works
   tableBody.style.touchAction = 'manipulation'

   // set up table sort handler and do initial table sort
   table.querySelectorAll('th.sortable')
      .forEach((el) => el.addEventListener('click', tableSortHandler))
   setTimeout(() => tableSort(document.getElementById('group-table-headers').children[0]))

   // set up highlight and hover-help handlers
   addMouseHandlers(tableBody)
   addTouchHandlers(tableBody)
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
```javascript
 */

function clearEmphasis () {
   document.getElementById('tooltip')?.remove()
   document.querySelectorAll('.emphasized').forEach((el) => el.classList.remove('emphasized'))
}

// ── Mouse ──────────────────────────────────────────────────────────────────

let mouseTooltipTimer /*: ?TimeoutID */ = null
let lastMouseCell /*: ?Element */ = null

function addMouseHandlers (tableBody) {
   // pointerover bubbles, so one listener on tbody tracks all cell transitions
   tableBody.addEventListener('pointerover', (event) => {
      if (event.pointerType !== 'mouse') return
      const cell = event.target.closest('td')
      if (cell === lastMouseCell) return
      clearMouseState()
      if (cell == null) return
      lastMouseCell = cell
      cell.classList.add('emphasized')
      const title = cell.getAttribute('data-tooltip')
      if (title != null) {
         mouseTooltipTimer = setTimeout(() => {
            cell.insertAdjacentHTML('beforeend', `<div id="tooltip">${title}</div>`)
            positionElement(document.getElementById('tooltip'), event)
            mouseTooltipTimer = null
         }, 150)
      }
   })

   tableBody.addEventListener('pointerleave', (event) => {
      if (event.pointerType !== 'mouse') return
      clearMouseState()
   })
}

function clearMouseState () {
   if (mouseTooltipTimer != null) {
      clearTimeout(mouseTooltipTimer)
      mouseTooltipTimer = null
   }
   lastMouseCell = null
   clearEmphasis()
}

// ── Touch ──────────────────────────────────────────────────────────────────

let touchCell /*: ?Element */ = null
let touchDownInfo /*: ?{x: number, y: number, cell: ?Element} */ = null
let secondTapPending /*: boolean */ = false

function addTouchHandlers (tableBody) {
   tableBody.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse') return
      // capture cell at pointerdown — elementFromPoint is reliable here;
      // at pointerup the finger is lifting and iOS hit-testing becomes unreliable
      const cell = event.target.closest('td')
      secondTapPending = touchCell != null && cell?.closest('tr') === touchCell.closest('tr')
      clearTouchState()
      touchDownInfo = {x: event.clientX, y: event.clientY, cell}
   })

   tableBody.addEventListener('pointercancel', () => {
      touchDownInfo = null
      secondTapPending = false
   })

   tableBody.addEventListener('pointerup', (event) => {
      if (event.pointerType === 'mouse') return
      if (touchDownInfo == null) return
      const {x, y, cell} = touchDownInfo
      touchDownInfo = null
      if (Math.hypot(event.clientX - x, event.clientY - y) > 20) { secondTapPending = false; return }

      if (secondTapPending) {
         secondTapPending = false
         return  // let the click event through to navigate
      }

      // first tap: highlight + tooltip, block the navigation click that follows
      const row = cell?.closest('tr')
      touchCell = cell
      row?.classList.add('highlighted')
      cell?.classList.add('emphasized')

      const title = cell?.getAttribute('data-tooltip')
      if (title != null) {
         cell.insertAdjacentHTML('beforeend', `<div id="tooltip">${title}</div>`)
         const tooltip = document.getElementById('tooltip')
         // position above the finger so it isn't obscured by the hand
         const {width, height} = tooltip.getBoundingClientRect()
         const x = Math.max(0, Math.min(event.clientX - width / 2, window.innerWidth - width))
         const y = Math.max(0, event.clientY - height - 24)
         tooltip.style.left = `${x}px`
         tooltip.style.top  = `${y}px`
      }

      tableBody.addEventListener('click', (ev) => ev.preventDefault(), {once: true})
   })

   // tapping outside the table clears touch selection
   document.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse') return
      if (!tableBody.contains(event.target)) clearTouchState()
   })
}

function clearTouchState () {
   touchDownInfo = null
   touchCell = null
   document.querySelectorAll('.highlighted').forEach((el) => el.classList.remove('highlighted'))
   clearEmphasis()
}

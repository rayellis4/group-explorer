/* @flow

# GroupTableUI component

This component implements user interactions with the library table in the [GroupExplorer main page](./GroupExplorer.html.md)
These include
 * [Table sort](#table-sort)
 * [Column configuration](#column-configuration)
 * [Highlighting and Hover Help](#highlighting-and-hover-help)
```javascript
*/

import {positionElement, makeDialog} from './UIComponents.js'
import {COLUMNS} from './GroupTable.js'

export {addGestures}

/*::
type TableConfig = {
   visible: {[string]: boolean},
   sort: {id: string, dir: string},
}
type ConfigChangeCallback = (patch: {[string]: any}) => void
*/

// set by addGestures, used by tableSort to persist sort state
let onConfigChange /*: ?ConfigChangeCallback */ = null

function addGestures (table /*: HTMLElement */, {config, onConfigChange: callback} /*: {config: TableConfig, onConfigChange: ConfigChangeCallback} */) {
   onConfigChange = callback

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

   // apply initial column visibility
   COLUMNS.forEach((col) => {
      const visible = config.visible[col.id] ?? col.defaultVisible
      table.classList.toggle(`hide-${col.id}`, !visible)
   })

   const tableBody = table.querySelector('tbody')

   // prevent double-tap zoom; single-finger scroll still works
   tableBody.style.touchAction = 'manipulation'

   // sort handlers (initial sort is applied by GroupExplorer after addGestures)
   table.querySelectorAll('th.sortable')
      .forEach((el) => el.addEventListener('click', tableSortHandler))

   // gear icon — column visibility dropdown
   document.getElementById('column-config-btn')
      .addEventListener('click', (event) => {
         event.stopPropagation()
         showColumnDropdown(table, config)
      })

   addMouseHandlers(tableBody)
   addTouchHandlers(tableBody)
}
/*
```
### Table sort
```javascript
 */
function tableSortHandler (event /*: MouseEvent */) {
   tableSort(event.currentTarget)
}

function tableSort (column /*: HTMLElement */, direction /*: ?string */) {
   const colId = column.dataset.colId
   const colDef = COLUMNS.find((col) => col.id === colId)
   if (colDef?.sortComparator == null) return

   // direction param is used for programmatic restore; user clicks toggle
   const sortAscending = direction != null
      ? direction === 'sort-up'
      : !column.classList.contains('sort-up')

   document.querySelectorAll('#group-table-headers th.sortable')
      .forEach((headerColumn) => {
         headerColumn.classList.remove('sort-down', 'sort-up')
         if (headerColumn === column) {
            headerColumn.classList.add(sortAscending ? 'sort-up' : 'sort-down')
         }
      })

   const colIndex = COLUMNS.indexOf(colDef)
   const getCellValue = (row) => row.children[colIndex].textContent
   const sortFunction = (a /*: HTMLTableRowElement */, b /*: HTMLTableRowElement */) =>
      colDef.sortComparator(
         getCellValue(sortAscending ? a : b),
         getCellValue(sortAscending ? b : a)
      )
   const tableBody = document.querySelector('#group-table tbody')
   Array.from(tableBody.children)
        .sort(sortFunction)
        .forEach((row) => tableBody.append(row))

   if (onConfigChange != null) {
      onConfigChange({sort: {id: colId, dir: sortAscending ? 'sort-up' : 'sort-down'}})
   }
}
/*
```
### Column configuration
```javascript
*/
function showColumnDropdown (table /*: HTMLElement */, config /*: TableConfig */) {
   document.getElementById('column-dropdown')?.remove()

   const dropdownHTML = [
      `<div id="column-dropdown" class="menu" style="resize: none">
         <style>
            #column-dropdown label:hover {background-color: var(--list-highlight);}
            #column-dropdown label {display: flex; align-items: center; gap: 8px; padding: 2px 4px; cursor: pointer;}
         </style>`,
         COLUMNS.map((col) =>
            `<label data-id="${col.id}">
               <input type="checkbox" ${(config.visible[col.id] ?? col.defaultVisible) ? "checked" : ""}>${col.label}
             </label>`).join(''),
        `<hr>
         <div id="column-dropdown-reset">Reset to defaults</div>
       </div>`
   ].join('')

   const button = document.getElementById('column-config-btn')
   const buttonRectangle = button.getBoundingClientRect()
   const dropdownLocation = {clientX: buttonRectangle.left, clientY: buttonRectangle.bottom}
   const dialogModal = makeDialog(dropdownHTML, dropdownLocation, (ev) => {
      if (!document.getElementById('column-dropdown')?.contains(ev.target)) dialogModal.remove()
   })
   document.getElementById('column-dropdown').classList.remove('dialog')
   document.getElementById('column-dropdown').addEventListener('change', (ev) => {
      const label = ev.target.closest('label[data-id]')
      const checkbox = label?.querySelector('input[type="checkbox"]')
      if (checkbox == null) return
      ev.stopPropagation()
      const colId = label.getAttribute('data-id')
      config.visible[colId] = checkbox.checked
      table.classList.toggle(`hide-${colId}`, !checkbox.checked)
      if (onConfigChange != null) onConfigChange({visible: {...config.visible}})
   })
   document.getElementById('column-dropdown-reset').addEventListener('click', () => {
      const defaults = Object.fromEntries(COLUMNS.map((col) => [col.id, col.defaultVisible]))
      Object.assign(config.visible, defaults)
      COLUMNS.forEach((col) => {
         table.classList.toggle(`hide-${col.id}`, !defaults[col.id])
      })
      document.getElementById('column-dropdown').querySelectorAll('input[type="checkbox"]')
         .forEach((cb, i) => {
            cb.checked = COLUMNS[i].defaultVisible
         })
      if (onConfigChange != null) onConfigChange({visible: {...defaults}})
   })
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

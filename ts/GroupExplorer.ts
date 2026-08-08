/*
# GroupExplorer

Displays group library in table format

```js
 */

import * as GroupRegistry from './GroupRegistry.js'
import * as GroupTable from './GroupTable.js'
import * as GroupTableUI from './GroupTableUI.js'
import * as Heading from './Heading.js'
import * as Library from './Library.js'
import * as Settings from './Settings.js'
import * as StoredObjects from './StoredObjects.js'

let tableConfig: GroupTableUI.TableConfig = defaultTableConfig()

function defaultTableConfig (): GroupTableUI.TableConfig {
   return {
      visible: Object.fromEntries(GroupTable.COLUMNS.map((col) => [col.id, col.defaultVisible])),
      sort: {id: 'order', dir: 'sort-up'},
   }
}

export async function load () {
   insertHTML()

   Heading.display(
      document.getElementById('heading') as HTMLElement,
      `<img style="border: 1px solid black;" src="images/logo.png"/>`,
      makeMenu
   )

   // gear icon for column config — inserted into heading bar left of the hamburger menu
   const gearBtn = document.createElement('div')
   gearBtn.id = 'column-config-btn'
   gearBtn.innerHTML = '⚙'
   gearBtn.title = 'Configure columns'
   gearBtn.style.cssText = 'color: black; margin: auto 0.5ch; cursor: pointer; user-select: none; font-size: 2rem'
   ;(document.getElementById('heading-menu') as HTMLElement).insertAdjacentElement('beforebegin', gearBtn)

   // merge stored config on top of defaults so new columns get their default visibility
   const stored = ((await StoredObjects.getTableConfig()) ?? {}) as GroupTableUI.TableConfig
   if (stored.visible != null) {
      const defaults = defaultTableConfig()
      tableConfig = {
         visible: {...defaults.visible, ...stored.visible},
         sort: stored.sort || defaults.sort,
      }
   }

   displayGroups()

   // listen for library or settings update
   const channel = new BroadcastChannel('GE3-channel')
   channel.addEventListener('message', async (messageEvent) => {
      const message = messageEvent.data
      if (message.source === 'library') {
         await Library.loadLibrary()
         const visibleGroups = GroupRegistry.getVisibleGroups(Settings.getFilterConfig()).map((G) => G.URL)
         if (  message.created.some((groupURL: string) => visibleGroups.includes(groupURL))
            || (message.created.length == 0 && message.updated.length == 0 && message.deleted.length == 0)
         ) {
            displayGroups()
         } else {
            message.deleted.forEach((groupURL: string) => {
               const groupRow = document.querySelector(`tr[data-group="${groupURL}"]`)
               if (groupRow != null) {
                  groupRow.remove()
               }
            })
            message.updated.forEach((groupURL: string) => {
               const group = Library.getGroupByURL(groupURL)
               const gapidCell = document.querySelector(`tr[data-group="${groupURL}"] > td:first-child`)
               if (gapidCell != null && group != null) {
                  gapidCell.children[0].textContent = group.gapid
               }
            })
         }
      } else if (message.source === 'settings') {
         displayGroups()  // changed options, update entire page
      }
   })
}

function makeMenu () {
   return [
      {label: 'New Sheet', action: () => window.open('Sheet.html')},
      {label: '<hr>', action: () => {}},
      {label: 'Group Explorer help', action: () => window.open('help/index.html')}
   ]
}

function displayGroups () {
   const groupsToDisplay = GroupRegistry.getVisibleGroups(Settings.getFilterConfig())

   // sort by definition length to minimize re-layout jink during incremental load
   groupsToDisplay.sort((G, H) => (H.definition?.length ?? 0) - (G.definition?.length ?? 0))

   const groupTable = document.getElementById('group-table') as HTMLElement
   GroupTable.display(groupTable, groupsToDisplay)
   GroupTableUI.addGestures(groupTable, {
      config: tableConfig,
      onConfigChange: (patch) => {
         Object.assign(tableConfig, patch)
         StoredObjects.saveTableConfig(tableConfig)
      },
   })

   // restore sort from config after the table is in the DOM
   window.setTimeout(() => {
      const sortTh = groupTable.querySelector(`th[data-col-id="${tableConfig.sort.id}"]`) as HTMLElement
      const target = sortTh ?? groupTable.querySelector('th.sortable') as HTMLElement
      if (target != null) {
         // tableSort toggles direction based on current class state; pre-set so one click
         // lands on the desired direction.  sort-up needs no pre-set (no class → click → sort-up).
         if (tableConfig.sort.dir === 'sort-down') target.classList.add('sort-up')
         target.click()
      }
   }, 0)
}

function insertHTML () {
   document.body.insertAdjacentHTML('beforeend',
     `<style type="text/css">
       :root {
          --page-header-background: #FFFFFF;
       }

       body {
          overflow-y: auto;
       }

       #heading {
          padding-top: 0.5rem;
          padding-bottom: 0.5rem;
          line-height: 0;
       }
      </style>`)
   document.body.insertAdjacentHTML('beforeend',
     `<div id="heading"></div>
      <table id="group-table" style="width: 100%;"></table>`)
}

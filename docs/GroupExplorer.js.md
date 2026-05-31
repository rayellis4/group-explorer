// @flow

import * as GroupTable from './GroupTable.js'
import * as GroupTableUI from './GroupTableUI.js'
import * as Heading from './Heading.js'
import * as Library from './Library.js'
import * as Settings from './Settings.js'

export {load}

// Load group library from urls
function load () {
   insertHTML()

   // Create heading
   Heading.display(
      document.getElementById('heading'),
      `<img style="border: 1px solid black;" src="images/logo.png"/>`,
      makeMenu
   )

   displayGroups()

   // listen for library or settings update
   const channel = new BroadcastChannel('GE3-channel')
   channel.addEventListener('message', async (messageEvent) => {
      const message = messageEvent.data
      if (message.source === 'library') {
         await Library.loadLibrary()
         if (message.created.length > 0 || message.deleted.length > 0 || message.updated.length == 0) {
            const visibleGroups = Library.allVisibleGroups(Settings.getFilterConfig()).map((G) => G.URL)
            if (  (message.created.length == 0 && message.updated.length == 0 && message.deleted.length == 0)
               || [...message.created, ...message.deleted].some((groupURL) => visibleGroups.includes(groupURL))
            ) {
               displayGroups()
            }
         } else {
            message.updated.forEach((groupURL) => {
               const group = Library.getGroupByURL(groupURL)
               const gapidCell = document.querySelector(`tr[data-group="${groupURL}"] > td:first-child`)
               if (gapidCell != null) {
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
   const groupsToDisplay = Library.allVisibleGroups(Settings.getFilterConfig())

   // sort by definition length to minimize re-layout jink
   groupsToDisplay.sort((G, H) => H.definition.length - G.definition.length)

   // save the sorting info to sort the table the same way after changing the displayed libraries
   const sortedHeader = document.querySelector('#group-table-headers th.sort-down, #group-table-headers th.sort-up')
   const sortInfo = (sortedHeader == null)
                  ? {headerIndex: 0, sortDirection: 'sort-down'}
                  : {headerIndex: Array.from(sortedHeader.parentElement.children).indexOf(sortedHeader),
                     sortDirection: sortedHeader.classList.contains('sort-down') ? 'sort-up' : 'sort-down'}

   // populate table 
   const groupTable = document.getElementById('group-table')
   GroupTable.display(groupTable, groupsToDisplay)
   GroupTableUI.addGestures(groupTable)

   // give the browser time to work
   window.setTimeout(
      () => {
         Array.from(document.querySelector('#group-table-headers').children)
              .forEach((header, inx) => {
                 header.classList.remove('sort-down')
                 header.classList.remove('sort-up')
                 if (inx == sortInfo.headerIndex) {
                    header.classList.add(sortInfo.sortDirection)
                 }
              })
         document.querySelector('#group-table-headers th.sort-down, #group-table-headers th.sort-up').click()
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

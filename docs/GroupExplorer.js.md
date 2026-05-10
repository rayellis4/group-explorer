// @flow

import * as GEUtils from './GEUtils.js'
import * as GroupTable from './GroupTable.js'
import * as GroupTableUI from './GroupTableUI.js'
import * as Heading from './Heading.js'
import * as Library from './Library.js'
import * as ShowGAPCode from './ShowGAPCode.js'
import * as StoredObjects from './StoredObjects.js'

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

   displayLibraries(getDisplayLibrariesFromPreferences())

   // listen for library update message from Library
   const channel = new BroadcastChannel('GE3-channel')
   channel.addEventListener('message', async (messageEvent) => {
      const message = messageEvent.data
      if (message.source != 'library') return
      await Library.loadLibrary()
      displayLibraries(getDisplayLibrariesFromPreferences())
   })
}

// get libraries from preferences in localStorage; default to []
function getDisplayLibrariesFromPreferences () {
   return StoredObjects.getPreference('displayLibraries') || []
}

function updateDisplayLibrariesInPreferences (displayLibraries) {
   StoredObjects.setPreference('displayLibraries', displayLibraries)
}

function makeMenu () {
   const menuElements = []
   if (document.querySelector("tr[data-library='fgb']")) {
      menuElements.push({label: 'Hide extended library', action: () => hideLibrary('extended')})
   } else {
      menuElements.push({label: 'Show extended library', action: () => showLibrary('extended')})
   }

   if (Library.getAllGroups().some((G) => G.library == 'generated')) {
      if (document.querySelector("tr[data-library='generated']")) {
         menuElements.push({label: 'Hide generated groups', action: () => hideLibrary('generated')})
      } else {
         menuElements.push({label: 'Show generated groups', action: () => showLibrary('generated')})
      }
      menuElements.push({label: 'Delete generated groups', action: () => {
         Library.deleteGroups(Library.getAllGroups().filter((G) => G.library == 'generated'))
         displayLibraries(getDisplayLibrariesFromPreferences())
      }})
   }

   menuElements.push(
      {label: 'New Sheet', action: () => window.open('Sheet.html')},
      {label: '<hr>', action: () => {}},
      {label: 'Group Explorer help', action: () => window.open('help/index.html')}
   )

   return menuElements
}

function showLibrary (library) {
   const libraries = getDisplayLibrariesFromPreferences()
   if (!libraries.includes(library)) {
      libraries.push(library)
      updateDisplayLibrariesInPreferences(libraries)
      displayLibraries(libraries)
   }
}

function hideLibrary (library) {
   const libraries = getDisplayLibrariesFromPreferences()
   if (libraries.includes(library)) {
      libraries.splice(libraries.indexOf(library), 1)
      updateDisplayLibrariesInPreferences(libraries)
      displayLibraries(libraries)
   }
}

// display sets of groups
// 'extended' groups are those with an explicit library property and not generated
// 'generated' groups self-identify as G.isGenerated
// default groups, with no library property and not generated, are always displayed
function displayLibraries (libraries) {
   const groupsToDisplay = []
   const allGroups = Library.getAllGroups()
   groupsToDisplay.push(...allGroups.filter((G) => G.library == null))
   if (libraries.includes('extended')) {
      groupsToDisplay.push(...allGroups.filter((G) => G.library != null && G.library != 'generated'))
   }
   if (libraries.includes('generated')) {
      const generatedGroups = allGroups.filter((G) => G.library == 'generated')
      generatedGroups
         .filter((G) => GEUtils.gapidIsUnresolved(G.gapid))
         .forEach((G) => window.setTimeout(() => {
            ShowGAPCode.getGAPInfo(G.URL)
               .then(() => {
                  const gapid = document.getElementById('group-table-body').querySelector(`[data-group="${G.URL}"] td div`)
                  if (gapid != null) {
                     gapid.textContent = G.gapid
                  }
               })
         }, 0))
      groupsToDisplay.push(...generatedGroups)
   }
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

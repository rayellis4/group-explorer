// @flow

import * as ControlPanel from './ControlPanel.js'
import * as Library from './Library.js'
import * as MulttableControl from './MulttableControl.js'
import * as MulttableViewUI from './MulttableViewUI.js'
import {createFullMulttableView} from './MulttableView.js'
import * as Heading from './Heading.js'
import * as HighlightControl from './HighlightControl.js'
import * as SheetEditor from './SheetEditor.js'

export {load}

// Load group from invocation URL and complete setup
async function load () {
   insertHTML()

   document.body.addEventListener('contextmenu', (ev) => ev.preventDefault())

   const group = await Library.loadFromPageURL()

   // Create Header
   Heading.display(
      document.getElementById('heading'),
      `Multiplication Table for ${group.name}`,
      () => [
         {label: 'Group Info', action: () => window.open(`GroupInfo.html?groupURL=${group.URL}`)},
         {label: 'Group Library', action: () => window.open('GroupExplorer.html')},
         {label: 'New Sheet', action: () => window.open('Sheet.html')},
         {label: '<hr>', action: () => {}},
         {label: 'Multiplication Table Help', action: () => window.open('help/rf-um-mt-options/index.html')}
      ]
   )

   // Draw Multtable
   const graphicElement = document.getElementById('graphic')
   const multtableView = createFullMulttableView({
      container: graphicElement,
      group: group
   })

   // Add gestures
   MulttableViewUI.addGestures(multtableView)

   // Create Control Panel
   const controlPanelElement = document.getElementById('control-panel')
   ControlPanel.addPanel(controlPanelElement)

   // Initialize HighlightControl
   const highlightControlElement = document.getElementById('highlight-control')
   HighlightControl.addControl(highlightControlElement, multtableView)

   // Add Multtable Control panel
   const tableControlElement = document.getElementById('table-control')
   MulttableControl.addControl(tableControlElement, multtableView)  // Initializes Multtable Controller directly

   // Register window resize handler
   window.addEventListener('resize', () => multtableView.resize())

   // If this page is editing a sheet...
   if (window.location.href.includes('SheetEditor=true')) {
      const initialJSON = await SheetEditor.getInitialData()
      if (group.URL != Library.getGroupByURL(initialJSON.groupURL).URL) {
         Log.err('group from URL does not match group in editor initialization message')
      }

      // Set up initial view and highlights
      multtableView.fromJSON(initialJSON)
      HighlightControl.initializeHighlights()

      // Set up change broadcast
      SheetEditor.enableChangeBroadcast(() => {
         const viewJSON = multtableView.toJSON()
         const highlightControlJSON = HighlightControl.toJSON()
         viewJSON.highlightControl = highlightControlJSON
         return viewJSON
      })

      // Do we really need to do this?? I don't think so...
      SheetEditor.broadcastChange()
   }
}

function insertHTML () {
   document.body.classList.add('flex-v')
   document.body.insertAdjacentHTML('beforeend',
      `<style>
        #graphic {
           background-color: var(--multtable-background);
        }
       </style>`)
   document.body.insertAdjacentHTML('beforeend',
      `<div id="heading"></div>
       <div id="display" class="position:relative stretch">
          <div id="graphic" class="position:absolute fill-h fill-v"></div>
          <div id="control-panel" class="position:absolute flex-h">
             <div id="highlight-control" data-button="Subsets"></div>
             <div id="table-control" data-button="Table" class="box stack-15em"></div>
          </div>
       </div>`)
}

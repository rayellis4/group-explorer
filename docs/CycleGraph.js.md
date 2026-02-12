// @flow

import * as Library from './Library.js'
import * as ControlPanel from './ControlPanel.js'
import * as CycleGraphViewUI from './CycleGraphViewUI.js'
import {createLabelledCycleGraphView} from './CycleGraphView.js'
import * as Heading from './Heading.js'
import * as HighlightControl from './HighlightControl.js';
import * as SheetEditor from './SheetEditor.js'

export {load}

// Insert top level HTML, load group from invocation URL, and complete display
async function load () {
   insertHTML()

   document.body.addEventListener('contextmenu', (ev) => ev.preventDefault())

   const group = await Library.loadFromPageURL()

   // Create Header
   Heading.display (
      document.getElementById('heading'),
      `Cycle Graph for ${group.name}`,
      () => [
         {label: 'Group Info', action: () => window.open(`GroupInfo.html?groupURL=${group.URL}`)},
         {label: 'Group Library', action: () => window.open('GroupExplorer.html')},
         {label: 'New Sheet', action: () => window.open('Sheet.html')},
         {label: '<hr>', action: () => {}},
         {label: 'Cycle Graph Help', action: () => window.open('help/rf-um-cg-options/index.html')},
      ]
   )

   // Draw CycleGraph
   const cycleGraphView = createLabelledCycleGraphView({
      container: document.getElementById('graphic'),
      group: group
   })

   // Add gestures
   CycleGraphViewUI.addGestures(cycleGraphView)

   // Create Control Panel
   const controlPanelElement = document.getElementById('control-panel')
   ControlPanel.addPanel(controlPanelElement)

   // Initialize Highlight Controller
   const highlightControlElement = document.getElementById('highlight-control')
   HighlightControl.addControl(highlightControlElement, cycleGraphView)

   // Register window resize handler
   window.addEventListener('resize', () => cycleGraphView.resize())

   // If this page is editing a sheet...
   if (window.location.href.includes('SheetEditor=true')) {
      // Get initial data from Sheet
      const initialJSON = await SheetEditor.getInitialData()
      if (group.URL != Library.getGroupByURL(initialJSON.groupURL).URL) {
         Log.err('group from URL does not match group in editor initialization message')
      }

      // Set up initial view and highlights
      cycleGraphView.fromJSON(initialJSON)
      HighlightControl.initializeHighlights()

      // Set up change broadcast
      SheetEditor.enableChangeBroadcast(() => {
         const viewJSON = cycleGraphView.toJSON()
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
     `<div id="heading"></div>
      <div id="display" class="position:relative stretch" style="background-color: var(--cycle-graph-background)">
         <div id="graphic" class="position:absolute fill-v fill-h"></div>
         <div id="control-panel" class="position:absolute flex-h">
            <div id="highlight-control"></div>
         </div>
      </div>`)
}

// @flow

import {ControlPanel} from './ControlPanel.js'
import * as Library from './Library.js'
import * as Log from './Log.js'
import * as MulttableControl from './MulttableControl.js'
import * as MulttableViewUI from './MulttableViewUI.js'
import {createFullMulttableView} from './MulttableView.js'
import * as Heading from './Heading.js'
import * as HighlightControl from './HighlightControl.js'
import * as SheetEditor from './SheetEditor.js'

export {load}

/*::
import type {Group} from './Group.js'
 */

// Load group from invocation URL and complete setup
async function load () {
   insertHTML()

   document.body.addEventListener('contextmenu', (ev) => ev.preventDefault())

   const group = (await Library.loadFromPageURL() /*:: as any as Group */)

   // Create Header
   Heading.display(
      (document.getElementById('heading') /*:: as any as HTMLElement */),
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
   const graphicElement = (document.getElementById('graphic') /*:: as any as HTMLElement */)
   const multtableView = createFullMulttableView({
      container: graphicElement,
      group: group
   })

   // Add gestures
   MulttableViewUI.addGestures(multtableView)

   // Create Control Panel
   const controlPanelElement = (document.getElementById('control-panel') /*:: as any as HTMLElement */)
   ControlPanel.addPanel(controlPanelElement)

   // If this page is editing a sheet...
   if (window.location.href.includes('SheetEditor=true')) {
      // Get initial data from Sheet
      const initialJSON = await SheetEditor.getInitialData()
      if (group.URL != Library.getGroupByURL(initialJSON.groupURL)?.URL) {
         Log.err('group from URL does not match group in editor initialization message')
      }

      // Set up initial view and highlights
      multtableView.fromJSON(initialJSON)
   }

   // Initialize HighlightControl
   const highlightControlElement = (document.getElementById('highlight-control') /*:: as any as HTMLElement */)
   HighlightControl.addControl(highlightControlElement, multtableView)

   // Add Multtable Control panel
   const tableControlElement = (document.getElementById('table-control') /*:: as any as HTMLElement */)
   MulttableControl.addControl(tableControlElement, multtableView)  // Initializes Multtable Controller directly

   // Register window resize handler
   window.addEventListener('resize', () => multtableView.resize())
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

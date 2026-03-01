// @flow

import {createCayleyDiagramGenerator} from './CayleyDiagramGenerator.js'
import * as CayleyDiagramViewUI from './CayleyDiagramViewUI.js'
import * as CayleyDiagramControl from './CayleyDiagramControl.js'
import * as CayleyViewControl from './CayleyViewControl.js'
import {ControlPanel} from './ControlPanel.js'
import * as Heading from './Heading.js'
//import * as HighlightControl from './HighlightControl.js'
import * as Library from './Library.js'
import * as Log from './Log.js'
import * as SheetEditor from './SheetEditor.js'

export {load}

/*::
   import type {CayleyDiagramJSON} from './js/CayleyDiagramView.js';
   import type {MSG_external} from './js/SheetModel.js';
 */

async function load () {
   insertHTML()

   document.body.addEventListener('contextmenu', (ev) => ev.preventDefault())

   // Create diagram generator
   const group = await Library.loadFromPageURL()

   // Create Header
   Heading.display(
      document.getElementById('heading'),
      `Cayley Diagram for ${group.name}`,
      () => [
         {label: 'Group Info', action: () => window.open(`GroupInfo.html?groupURL=${group.URL}`)},
         {label: 'Group Library', action: () => window.open('GroupExplorer.html')},
         {label: 'New Sheet', action: () => window.open('Sheet.html')},
         {label: '<hr>', action: () => {}},
         {label: 'Cayley Diagram Help', action: () => window.open('help/rf-um-cd-options/index.html')}
      ]
   )

   const graphicElement = document.getElementById('graphic')
   const cayleyDiagramGenerator = createCayleyDiagramGenerator({display_labels: true, container: graphicElement})
   const cayleyDiagramView = cayleyDiagramGenerator.cayleyDiagramView
   cayleyDiagramView.cayleyDiagramGenerator = cayleyDiagramGenerator  // $FixMe

   // Draw CayleyDiagram
   const hrefURL =  new URL(window.location.href)
   cayleyDiagramGenerator.group = group

   // Get specified Cayley diagram if location URL contains one
   let diagramName = hrefURL.searchParams.get('diagram')
   if (   diagramName != null
      && group.cayleyDiagrams.find((cayleyDiagram) => (cayleyDiagram.name == diagramName)) == undefined
   ) {
      Log.err(`group ${group.shortName} has no Cayley diagram named ${diagramName} -- generating diagram instead`)
      diagramName = null
   }

   cayleyDiagramGenerator.drawFromModel(diagramName)

   // Add gestures
   CayleyDiagramViewUI.addGestures(cayleyDiagramView)

   // Create Control Panel
   const controlPanelElement = document.getElementById('control-panel')
   ControlPanel.addPanel(controlPanelElement)

   // Initialize HighlightControl
   const highlightControlElement = document.getElementById('highlight-control')
   //   HighlightControl.addControl(highlightControlElement, cayleyDiagramView)

   // Create view control
   const cayleyViewControlElement = document.getElementById('cayley-view-control')
   CayleyViewControl.addControl(cayleyViewControlElement, cayleyDiagramView)

   // Create diagram control
   const cayleyDiagramControlElement = document.getElementById('cayley-diagram-control')
   CayleyDiagramControl.addControl(cayleyDiagramControlElement, cayleyDiagramGenerator)

   // Listen for window resize and resize visualizer
   window.addEventListener('resize', () => cayleyDiagramView.resize())

   // Set up change broadcast (if this page is an editor for a sheet)
   if (window.location.href.includes('SheetEditor=true')) {
      // Draw CayleyDiagram
      const initialJSON = await SheetEditor.getInitialData()
      if (group.URL != Library.getGroupByURL(initialJSON.groupURL)?.URL) {
         Log.err('group from URL does not match group in editor initialization message')
      }

      cayleyDiagramGenerator.fromJSON(initialJSON)

      cayleyDiagramGenerator.cayleyDiagramView.resize()  // need to fix initial aspect ratio when editing
      window.setInterval(() => SheetEditor.broadcastChange(), 1000)  // There's got to be a better way than polling...
   } else {
      cayleyDiagramGenerator.drawFromModel(diagramName)
   }

   /* Create/initialize model, then add these features?
   // Add gestures
   CayleyDiagramViewUI.addGestures(cayleyDiagramView)

   // Create Control Panel, initialize controllers
   ControlPanel.addPanel(document.getElementById('control-panel'))
   HighlightControl.addControl(document.getElementById('highlight-control'), cayleyDiagramView)
   CayleyViewControl.addControl(document.getElementById('cayley-view-control'), cayleyDiagramView)
   CayleyDiagramControl.addControl(document.getElementById('cayley-diagram-control'), cayleyDiagramGenerator)

   // Listen for window resize and resize visualizer
   window.addEventListener('resize', () => cayleyDiagramView.resize())
    */
}

function insertHTML () {
   document.body.classList.add('flex-v')
   document.body.insertAdjacentHTML('beforeend',
     `<div id="heading"></div>
      <div id="display" class="stretch position:relative fill-h">
         <div id="graphic" class="position:absolute fill-h fill-v"></div>
         <div id="control-panel" class="position:absolute flex-h">
            <div id="highlight-control" data-button="Subsets"></div>
            <div id="cayley-view-control" data-button="View" class="box stack-15em"></div>
            <div id="cayley-diagram-control" data-button="Diagram" class="box stack-15em"></div>
         </div>
      </div>`)
}

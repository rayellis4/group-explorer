// @flow

import {ControlPanel} from './ControlPanel.js'
import {CycleGraphModel} from'./CycleGraphModel.js'
import {createInteractiveCycleGraphView} from './CycleGraphView.js'
import {createModelProxy} from './GEUtils.js'
import * as Heading from './Heading.js'
import * as HighlightControl from './HighlightControl.js';
import * as Library from './Library.js'
import * as SheetEditor from './SheetEditor.js'

export {load}

/*::
import type {Group} from './Group.js'
import type {Updatable} from './CycleGraphModel.js'
 */

async function load () {
   // Add top level HTML
   insertHTML()

   document.body.addEventListener('contextmenu', (ev) => ev.preventDefault())

   // If this page is editing a sheet...
   const initialJSON /*: unknown */ =
      await (window.location.href.includes('SheetEditor=true') ? SheetEditor.getInitialData() : null)

   // Get group, either from page URL or data from Sheet
   const group /*: Group */ = await ((initialJSON?.groupURL == null)
      ? Library.loadFromPageURL()
      : Library.getGroupByURL(initialJSON.groupURL))

   // Create CycleGraph model
   const cycleGraphModel /*: SubscriptionProxy<CycleGraphModel> */ = createModelProxy(new CycleGraphModel(group))

   // Create Header
   Heading.display (
      (document.getElementById('heading') /*:: as any as HTMLElement */),
      `Cycle Graph for ${group.name}`,
      () => [
         {label: 'Group Info', action: () => window.open(`GroupInfo.html?groupURL=${group.URL}`)},
         {label: 'Group Library', action: () => window.open('GroupExplorer.html')},
         {label: 'New Sheet', action: () => window.open('Sheet.html')},
         {label: '<hr>', action: () => {}},
         {label: 'Cycle Graph Help', action: () => window.open('help/rf-um-cg-options/index.html')},
      ]
   )

   // Create cycleGraphView in graphic div and attach to cycleGraphModel
   const cycleGraphView = createInteractiveCycleGraphView(cycleGraphModel, {
      container: document.getElementById('graphic')
   })

   // Create Control Panel
   ControlPanel.addPanel(document.getElementById('control-panel'))

   // Initialize HighlightControl
   const highlightControlElement = document.getElementById('highlight-control')
   HighlightControl.addControl(highlightControlElement, cycleGraphModel)

   // Initialize CycleGraph model, change broadcast if editing a sheet
   if (initialJSON != null) {  // window.location.href.includes('SheetEditor=true')) {
      cycleGraphModel.fromJSON(initialJSON)

      SheetEditor.enableChangeBroadcast(() => {
         return cycleGraphModel.toJSON()
      })

      // run SheetEditor.broadcastChange() when 'highlights' or HighlightControl structure changes
      cycleGraphModel.$subscribe(broadcastChangeUpdater, 'highlights')
      cycleGraphModel.$subscribe(broadcastChangeUpdater, 'highlightControl')
   }

   // Register window resize handler
   window.addEventListener('resize', () => cycleGraphView.resize())
}

// an unexported module const, so it won't be garbage collected
const broadcastChangeUpdater = {update: (_field, _value) => SheetEditor.broadcastChange()}

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

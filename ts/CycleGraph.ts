/*
# CycleGraph

Assembles large cycle graph visualizer html page

```js
 */

import { ControlPanel } from './ControlPanel.js'
import { CycleGraphModel } from'./CycleGraphModel.js'
import { createInteractiveCycleGraphView } from './CycleGraphView.js'
import { createModelProxy } from './GEUtils.js'
import * as Heading from './Heading.js'
import * as HighlightControl from './HighlightControl.js';
import * as Library from './Library.js'
import * as SheetEditor from './SheetEditor.js'
import * as Log from './Log.js'

import type { CycleGraphJSON } from './CycleGraphModel.ts'
import type { SubscriptionProxy } from './GEUtils.js'
import type { Group } from './Group.js'

const SHEET_UPDATE_FIELDS = [
   'highlightColors',
   'highlightControl'
]

export async function load () {
   // Add top level HTML
   insertHTML()

   document.body.addEventListener('contextmenu', (ev) => ev.preventDefault())

   // If this page is editing a sheet...
   const {elementId, json: initialJSON} = (await (window.location.href.includes('SheetEditor')
      ? SheetEditor.getInitialData()
      : {elementId: null, json: null})) as {elementId: Maybe<string>, json: Maybe<CycleGraphJSON>}

   // Get group, either from page URL or data from Sheet
   const group = await ((initialJSON?.group_url == null)
      ? Library.loadFromPageURL()
      : Library.getGroupByURL(initialJSON.group_url)) as Group  // FIXME: refine error for typo in URL

   // Create Header
   Heading.display (
      (document.getElementById('heading') as HTMLElement),
      `Cycle Graph for ${group.name}`,
      () => [
         {label: 'Group Info', action: () => window.open(`GroupInfo.html?groupURL=${group.URL}`)},
         {label: 'Group Library', action: () => window.open('GroupExplorer.html')},
         {label: 'New Sheet', action: () => window.open('Sheet.html')},
         {label: '<hr>', action: () => {}},
         {label: 'Cycle Graph Help', action: () => window.open('help/rf-um-cg-options/index.html')},
      ]
   )

   // Create CycleGraph model
   const cycleGraphModel: SubscriptionProxy<CycleGraphModel> = createModelProxy(new CycleGraphModel(group))

   // Initialize CycleGraph model, change broadcast if editing a sheet
   if (window.location.href.includes('SheetEditor')) {
      if (initialJSON != null) {
         cycleGraphModel.fromJSON(initialJSON)
      } else {
         Log.warn('CycleGraph: SheetEditor mode but no initial JSON in IndexedDB')
      }

      SheetEditor.enableModelChangeBroadcast(elementId as string, cycleGraphModel, SHEET_UPDATE_FIELDS)

      SheetEditor.listenForSheetUpdates((json: CycleGraphJSON) => cycleGraphModel.fromJSON(json))
   }

   // Create Control Panel
   ControlPanel.addPanel(document.getElementById('control-panel') as HTMLElement)

   // Initialize HighlightControl
   const highlightControlElement = document.getElementById('highlight-control') as HTMLElement
   HighlightControl.addControl(highlightControlElement, cycleGraphModel)

   // Create cycleGraphView in graphic div and attach to cycleGraphModel
   const cycleGraphViewModel = createInteractiveCycleGraphView(cycleGraphModel, {
      container: document.getElementById('graphic')
   })

   // Register window resize handler
   window.addEventListener('resize', () => cycleGraphViewModel.resize())
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

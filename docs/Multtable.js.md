// @flow

import {ControlPanel} from './ControlPanel.js'
import {createModelProxy} from './GEUtils.js'
import * as Heading from './Heading.js'
import * as HighlightControl from './HighlightControl.js'
import * as Library from './Library.js'
import * as MulttableControl from './MulttableControl.js'
import {MulttableModel} from'./MulttableModel.js'
import {createInteractiveMulttableView} from './MulttableView.js'
import * as SheetEditor from './SheetEditor.js'
import * as Log from './Log.js'

export {load}

/*::
import type {Group} from './Group.js'
 */

// Load group from invocation URL and complete setup
async function load () {
   insertHTML()

   document.body.addEventListener('contextmenu', (ev) => ev.preventDefault())

   // If this page is editing a sheet...
   const initialJSON /*: unknown */ =
      await (window.location.href.includes('SheetEditor') ? SheetEditor.getInitialData() : null)

   // Get group, either from page URL or data from Sheet
   const group /*: Group */ = await ((initialJSON?.group_url == null)
      ? Library.loadFromPageURL()
      : Library.getGroupByURL(initialJSON.group_url))

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

   // Create Multtable model
   const multtableModel /*: SubscriptionProxy<MulttableModel> */ = createModelProxy(new MulttableModel(group))

   // Create multtableView in graphic div and attach to multtableModel
   const multtableViewModel = createInteractiveMulttableView(multtableModel, {
      container: document.getElementById('graphic')
   })

   // Create Control Panel
   ControlPanel.addPanel(document.getElementById('control-panel'))

   // Initialize HighlightControl
   const highlightControlElement = document.getElementById('highlight-control')
   HighlightControl.addControl(highlightControlElement, multtableModel)

   // Add Multtable Control panel
   const tableControlElement = document.getElementById('table-control')
   MulttableControl.addControl(tableControlElement, multtableModel)  // Initializes Multtable Controller directly

   // Register window resize handler
   window.addEventListener('resize', () => multtableViewModel.resize())

   // Initialize Multtable model, change broadcast if editing a sheet
   if (window.location.href.includes('SheetEditor')) {
      if (initialJSON != null) {
         multtableModel.fromJSON(initialJSON)
      } else {
         Log.warn('Multtable: SheetEditor mode but no initial JSON in IndexedDB')
      }

      SheetEditor.enableChangeBroadcast(() => {
         return multtableModel.toJSON()
      })

      // run SheetEditor.broadcastChange() when highlightColors or highlightControl object changes
      multtableModel.$subscribe(broadcastChangeUpdater, 'highlightColors')
      multtableModel.$subscribe(broadcastChangeUpdater, 'highlightControl')
   }
}

// an unexported module const, so it won't be garbage collected
const broadcastChangeUpdater = {update: (_field, _value) => SheetEditor.broadcastChange()}

function insertHTML () {
   document.body.classList.add('flex-v')
   document.body.insertAdjacentHTML('beforeend',
      `<style>
        #graphic {
           background-color: var(--multtable-background);
        }
       </style>
       <div id="heading"></div>
       <div id="display" class="position:relative stretch">
          <div id="graphic" class="position:absolute fill-h fill-v"></div>
          <div id="control-panel" class="position:absolute flex-h">
             <div id="highlight-control" data-button="Subsets"></div>
             <div id="table-control" data-button="Table" class="box stack-15em"></div>
          </div>
       </div>`)
}

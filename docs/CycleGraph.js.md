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
      // JSON.parse(testJSON)  // Comment out previous line and uncomment this line to use testJSON below

   // Get group, either from page URL or data from Sheet
   const group /*: Group */ = await ((initialJSON?.groupURL == null)
      ? Library.loadFromPageURL()
      : Library.getGroupByURL(initialJSON.groupURL))

   // Create CycleGraph model
   const cycleGraphModel /*: SubscriptionProxy<CycleGraphModel> */ = createModelProxy(new CycleGraphModel(group))
   if (initialJSON != null) {
      cycleGraphModel.fromJSON(initialJSON)
   }

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
   HighlightControl.addControl(highlightControlElement, cycleGraphModel, initialJSON?.highlightControl)

   // Set up change broadcast if editing a sheet
   if (initialJSON != null) {  // window.location.href.includes('SheetEditor=true')) {
      SheetEditor.enableChangeBroadcast(() => {
         return cycleGraphModel.toJSON()
      })

      // run SheetEditor.broadcastChange() when 'highlights' is changed
      cycleGraphModel.$subscribe(broadcastChangeUpdater, 'highlights')
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

const testJSON =
'{"groupURL":"https://192.168.1.100:8080/integrate-group-explorer/groups/D_4.group","highlights":[[],[],[]],"highlightControl":{"nextId":22,"nextSubsetIndex":1,"displayItems":[{"class":"Subgroop","id":0,"elements":{"len":8,"arr":[1]},"subgroupIndex":0},{"class":"Subgroop","id":1,"elements":{"len":8,"arr":[5]},"subgroupIndex":1},{"class":"Subgroop","id":2,"elements":{"len":8,"arr":[17]},"subgroupIndex":2},{"class":"Subgroop","id":3,"elements":{"len":8,"arr":[33]},"subgroupIndex":3},{"class":"Subgroop","id":4,"elements":{"len":8,"arr":[65]},"subgroupIndex":4},{"class":"Subgroop","id":5,"elements":{"len":8,"arr":[129]},"subgroupIndex":5},{"class":"Subgroop","id":6,"elements":{"len":8,"arr":[15]},"subgroupIndex":6},{"class":"Subgroop","id":7,"elements":{"len":8,"arr":[85]},"subgroupIndex":7},{"class":"Subgroop","id":8,"elements":{"len":8,"arr":[165]},"subgroupIndex":8},{"class":"Subgroop","id":9,"elements":{"len":8,"arr":[255]},"subgroupIndex":9},{"class":"ConjugacyClasses","id":10},{"class":"ConjugacyClass","id":11,"elements":{"len":8,"arr":[1]},"partitioningScheme":10,"subIndex":0},{"class":"ConjugacyClass","id":12,"elements":{"len":8,"arr":[4]},"partitioningScheme":10,"subIndex":1},{"class":"ConjugacyClass","id":13,"elements":{"len":8,"arr":[10]},"partitioningScheme":10,"subIndex":2},{"class":"ConjugacyClass","id":14,"elements":{"len":8,"arr":[80]},"partitioningScheme":10,"subIndex":3},{"class":"ConjugacyClass","id":15,"elements":{"len":8,"arr":[160]},"partitioningScheme":10,"subIndex":4},{"class":"Cosets","id":16,"subgroop":3,"side":"left"},{"class":"Coset","id":17,"elements":{"len":8,"arr":[33]},"partitioningScheme":16,"subIndex":0},{"class":"Coset","id":18,"elements":{"len":8,"arr":[18]},"partitioningScheme":16,"subIndex":1},{"class":"Coset","id":19,"elements":{"len":8,"arr":[132]},"partitioningScheme":16,"subIndex":2},{"class":"Coset","id":20,"elements":{"len":8,"arr":[72]},"partitioningScheme":16,"subIndex":3},{"class":"Subset","id":21,"elements":{"len":8,"arr":[6]},"subsetIndex":0}]}}'

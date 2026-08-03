/*
# SymmetryObject

Assembles large symmetry object visualizer html page

```js
 */

import { CayleyDiagramModel } from './CayleyDiagramModel.js'
import { ControlPanel } from './ControlPanel.js'
import { createModelProxy } from './GEUtils.js'
import * as Heading from './Heading.js'
import * as Library from './Library.js'
import * as Log from './Log.js'
import * as SymmetryObjectControl from './SymmetryObjectControl.js'
import { createSymmetryObjectView } from './SymmetryObjectView.js'


// Load group from invocation URL, then get diagram name and complete setup
export async function load () {
   insertHTML()

   document.body.addEventListener('contextmenu', (ev) => ev.preventDefault())

   const group = await Library.loadFromPageURL()
   if (group.symmetryObjects.length == 0) {
      Log.err(`The group ${group.shortName} has no symmetry objects.`)
      return
   }

   // Create Header
   Heading.display(
      document.getElementById('heading') as HTMLElement,
      `Object of Symmetry for ${group.name}`,
      () => [
         {label: 'Group Info', action: () => window.open(`GroupInfo.html?groupURL=${group.URL}`)},
         {label: 'Group Library', action: () => window.open('GroupExplorer.html')},
         {label: 'New Sheet', action: () => window.open('Sheet.html')},
         {label: '<hr>', action: () => {}},
         {label: 'Symmetry Object Help', action: () => window.open('help/rf-um-os-options/index.html')}
      ]
   )

   const symmetryObjectModel = createModelProxy(new CayleyDiagramModel(group))

   const symmetryObjectViewModel = createSymmetryObjectView(symmetryObjectModel, {
      container: document.getElementById('graphic') as HTMLElement
   })

   // Create Control Panel
   const controlPanelElement = document.getElementById('control-panel') as HTMLElement
   ControlPanel.addPanel(controlPanelElement)

   // Create SymmetryObjectControl
   const symmetryObjectControlElement = document.getElementById('symmetry-object-control') as HTMLElement
   SymmetryObjectControl.addControl(symmetryObjectControlElement, symmetryObjectModel)

   // Resize the body, including the graphic
   window.addEventListener('resize', () => symmetryObjectViewModel.resize())
}

function insertHTML () {
   document.body.classList.add('flex-v')
   document.body.insertAdjacentHTML('beforeend',
     `<div id="heading"></div>
      <div id="display" class="position:relative stretch">
         <div id="graphic" class="position:absolute fill-h fill-v"></div>
         <div id="control-panel" class="position:absolute flex-h">
           <div id="symmetry-object-control" class="box stack-15em"></div>
         </div>
      </div>`)
}

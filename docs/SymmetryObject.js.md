// @flow

import {ControlPanel} from './ControlPanel.js'
import * as Heading from './Heading.js'
import * as Library from './Library.js'
import * as Log from './Log.js'
import * as SymmetryObjectControl from './SymmetryObjectControl.js'
import {createInteractiveSymmetryObjectView} from './SymmetryObjectView.js'

export {load}

// Load group from invocation URL, then get diagram name and complete setup
async function load () {
   insertHTML()

   document.body.addEventListener('contextmenu', (ev) => ev.preventDefault())

   const group = await Library.loadFromPageURL()

   // Create Header
   Heading.display(
      document.getElementById('heading'),
      `Object of Symmetry for ${group.name}`,
      () => [
         {label: 'Group Info', action: () => window.open(`GroupInfo.html?groupURL=${group.URL}`)},
         {label: 'Group Library', action: () => window.open('GroupExplorer.html')},
         {label: 'New Sheet', action: () => window.open('Sheet.html')},
         {label: '<hr>', action: () => {}},
         {label: 'Symmetry Object Help', action: () => window.open('help/rf-um-os-options/index.html')}
      ]
   )

   // Draw SymmetryObject
   const graphicElement = document.getElementById('graphic')
   const symmetryObjectView = createInteractiveSymmetryObjectView({
      container: graphicElement,
      group: group,
      diagramName: getDiagramName(group)
   })

   // Create Control Panel
   const controlPanelElement = document.getElementById('control-panel')
   ControlPanel.addPanel(controlPanelElement)

   // Create SymmetryObjectControl
   const symmetryObjectControlElement = document.getElementById('symmetry-object-control')
   SymmetryObjectControl.addControl(symmetryObjectControlElement, symmetryObjectView)

   // Resize the body, including the graphic
   window.addEventListener('resize', () => symmetryObjectView.resize())
}

/* Get diagram name from URL; throw exception when group has no symmetry object */
function getDiagramName (group) /*: string */ {
   let diagramName;
   // Check that this group has a symmetry object
   if (group.symmetryObjects.length == 0) {
      // Throws exception if group has no symmetry objects
      throw `The group ${group.shortName} has no symmetry objects.`;
   } else {
      // If so, use the diagram name from the URL search string
      const urlDiagramName = new URL(window.location.href).searchParams.get('diagram');
      // unless it is empty
      if (urlDiagramName == undefined) {
         diagramName = group.symmetryObjects[0].name;
      } else {
         // or it does not match one of the symmetryObjects
         if (!group.symmetryObjects.some( (symmetryObject) => symmetryObject.name == urlDiagramName )) {
            // Name is passed but there is no matching symmetryObject -- alert user and continue
            Log.warn(`The group ${group.shortName} has no symmetry object named ${urlDiagramName}. ` +
                     `Using ${group.symmetryObjects[0].name} instead.`);
            diagramName = group.symmetryObjects[0].name;
         } else {
            diagramName = urlDiagramName;
         }
      }
   }

   return diagramName;
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

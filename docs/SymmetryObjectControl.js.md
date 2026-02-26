/* @flow

# SymmetryObjectControl

Display input elements that configure the SymmetryObjectView:
 * choose symmetry object
 * set zoom level
 * set line thickness
 * set node radius
 * set whether and how much fog to use

```javascript
 */
import * as GEUtils from './GEUtils.js'
import {makeMockSelect} from './UIComponents.js'

export {addControl}

function addControl (symmetryObjectControlElement, symmetryObjectView) {
   // create elements for view control and initialize values from SymmetryObjectView
   const choiceIndex = symmetryObjectView.group.symmetryObjects
      .findIndex(({name}) => (name === symmetryObjectView.diagramName))

   symmetryObjectControlElement.innerHTML =
      `<div>
          View this symmetry object:
          <div id="diagram_select" class="mock-select" data-index="${choiceIndex}">
             ${symmetryObjectView.group.symmetryObjects[choiceIndex].name}
          </div>
       </div>

       <div>
         Zoom level:
         <input id="zoom_level_slider" type="range" min="-10" max="10" value="0">
       </div>

       <div>
         Line thickness:
         <input id="line_thickness_slider" type="range" min="1" max="20"
            value="${1 + (symmetryObjectView.line_width - 1) / 0.75}">
       </div>

       <div>
         Node radius:
         <input id="node_radius_slider" type="range" min="-10" max="10" value="0">
       </div>

       <div>
         <input id="use_fog_checkbox" type="checkbox">Use this much fog:
         <input id="fog_level_slider" type="range" min="1" max="10" value="5">
       </div>

       <div>
         <details style="font-size: 1.25rem">
           <summary>Advanced</summary>
           <button style="width: 20ch" data-action="symmetryObjectView.toggleCoordinateAxisDisplay()"
             >Show/hide axes</button>
           <button style="width: 20ch" data-action="symmetryObjectView.snapToAxis()"
             >Snap to axis</button>
         </details>
       </div>`

   // define symmetry object control element names
   const diagramSelect = document.getElementById('diagram_select')
   const zoomLevelSlider = document.getElementById('zoom_level_slider')
   const lineThicknessSlider = document.getElementById('line_thickness_slider')
   const nodeRadiusSlider = document.getElementById('node_radius_slider')
   const useFogCheckbox = document.getElementById('use_fog_checkbox')
   const fogLevelSlider = document.getElementById('fog_level_slider')

   // define symmetry object control element handlers
   const displayChoices = () => {
      const choices = symmetryObjectView.group.symmetryObjects
         .map((symmetryObject, index) => { return {value: `${index}`, label: symmetryObject.name} })

      makeMockSelect(diagramSelect, choices)
         .then(
            (choice) => {
               const newObject = symmetryObjectView.group.symmetryObjects[parseInt(choice)]
               symmetryObjectView.setObject(newObject)
            },
            () => {}
         )
   }

   const setZoomLevel = () => {
      symmetryObjectView.zoom_level = Math.exp(parseInt(zoomLevelSlider.value) / 10)
   }

   const setLineThickness = () => {
      symmetryObjectView.line_width = 1 + 0.75 * (parseInt(lineThicknessSlider.value) - 1)
   }

   const setNodeRadius = () => {
      symmetryObjectView.sphere_scale_factor = Math.exp(parseInt(nodeRadiusSlider.value) / 10)
   }

   const setFogLevel = () => {
      symmetryObjectView.fog_level = useFogCheckbox.checked ? parseInt(fogLevelSlider.value) / 10 : 0
   }

   // set symmetry object control element handlers
   diagramSelect.addEventListener('click', displayChoices)
   zoomLevelSlider.addEventListener('input', setZoomLevel)
   lineThicknessSlider.addEventListener('input', setLineThickness)
   nodeRadiusSlider.addEventListener('input', setNodeRadius)
   useFogCheckbox.addEventListener('input', setFogLevel)
   fogLevelSlider.addEventListener('input', setFogLevel)
   GEUtils.createActionHandler(symmetryObjectControlElement, (action) => eval(action))
}

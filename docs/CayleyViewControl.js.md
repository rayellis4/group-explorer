/* @flow

# CayleyViewControl

Display input elements that configure the CayleyDiagramView:
 * set zoom level
 * set line thickness
 * set node radius
 * set whether or not to use fog and how much
 * set whether or not to show labels and how big
 * set arrowhead location from start to end of arrow

```javascript
 */
import * as GEUtils from './GEUtils.js'

export {addControl}
/*::
import type {CayleyDiagramView} from './CayleyDiagramView.js'
 */

function addControl (cayleyViewControlElement /*: HTMLElement */, cayleyDiagramView /*: CayleyDiagramView */) {
   // create view control elements and initialize values from cayleyDiagramView
   // n.b.: data-name attributes are just documentation, they aren't used in the code
   const fogLevel = cayleyDiagramView.fog_level
   const labelScaleFactor = cayleyDiagramView.label_scale_factor
   cayleyViewControlElement.innerHTML =
     `<div>
         Zoom level:
         <input id="zoom-level-slider" type="range" min="-10" max="10"
            value="${10 * Math.log(cayleyDiagramView.zoom_level)}">
      </div>

      <div>
         Line thickness:
         <input id="line-thickness-slider" type="range" min="1" max="20"
            value="${1 + (cayleyDiagramView.line_width - 1) / 0.75}">
      </div>

      <div>
         Node radius:
         <input id="node-radius-slider" type="range" min="-10" max="10"
            value="${10 * Math.log(cayleyDiagramView.sphere_scale_factor)}">
      </div>

      <div>
         <input id="use-fog-checkbox" type="checkbox"
            ${(fogLevel == 0) ? '' : 'checked'}>Use this much fog:
         <input id="fog-level-slider" type="range" min="1" max="10"
            value="${(fogLevel == 0) ? 5 : 10 * fogLevel}">
      </div>

      <div>
         <input id="show-labels-checkbox" type="checkbox"
            ${(labelScaleFactor == 0) ? '' : 'checked'}>Show labels of this size:
         <input id="label-size-slider" type="range" min="-10" max="10"
            value="${(labelScaleFactor == 0) ? 5 : 10 * Math.log(labelScaleFactor)}">
      </div>

      <div>
         Arrowhead placement:
         <input id="arrowhead-placement-slider" type="range" min="0" max="20"
            value="${20 * cayleyDiagramView.arrowhead_placement}">
      </div>

      <div>
         <details style="font-size: 1.25rem">
            <summary>Advanced</summary>
            <button style="width: 20ch" data-action="cayleyDiagramView.toggleCoordinateAxisDisplay()"
               >Show/hide axes</button>
            <button style="width: 20ch" data-action="cayleyDiagramView.snapToAxis()"
               >Snap to axis</button>
         </details>
      </div>`

   // define view control element names
   const zoomLevelSlider = (document.getElementById('zoom-level-slider') /*:: as any as HTMLInputElement */)
   const lineThicknessSlider = (document.getElementById('line-thickness-slider') /*:: as any as HTMLInputElement */)
   const nodeRadiusSlider = (document.getElementById('node-radius-slider') /*:: as any as HTMLInputElement */)
   const useFogCheckbox = (document.getElementById('use-fog-checkbox') /*:: as any as HTMLInputElement */)
   const fogLevelSlider = (document.getElementById('fog-level-slider') /*:: as any as HTMLInputElement */)
   const showLabelsCheckbox = (document.getElementById('show-labels-checkbox') /*:: as any as HTMLInputElement */)
   const labelSizeSlider = (document.getElementById('label-size-slider') /*:: as any as HTMLInputElement */)
   const arrowheadPlacementSlider = (document.getElementById('arrowhead-placement-slider') /*:: as any as HTMLInputElement */)

   // define view control element input handlers
   const setZoomLevel = () => {
      cayleyDiagramView.zoom_level = Math.exp(Number(zoomLevelSlider.value) / 10)
   }

   const setLineThickness = () => {
      cayleyDiagramView.line_width = 1 + 0.75 * (Number(lineThicknessSlider.value) - 1)
   }

   const setNodeRadius = () => {
      cayleyDiagramView.sphere_scale_factor = Math.exp(Number(nodeRadiusSlider.value) / 10)
   }

   const setFogLevel = () => {
      cayleyDiagramView.fog_level =
         useFogCheckbox.checked ? Number(fogLevelSlider.value) / 10 : 0
   }

   const setLabelSize = () => {
      cayleyDiagramView.label_scale_factor =
         showLabelsCheckbox.checked ? Math.exp(Number(labelSizeSlider.value) / 10) : 0
   }

   const setArrowheadPlacement = () => {
      cayleyDiagramView.arrowhead_placement = Number(arrowheadPlacementSlider.value) / 20
   }

   // set view control element handlers
   zoomLevelSlider.addEventListener('input', setZoomLevel)
   lineThicknessSlider.addEventListener('input', setLineThickness)
   nodeRadiusSlider.addEventListener('input', setNodeRadius)
   useFogCheckbox.addEventListener('input', setFogLevel)
   fogLevelSlider.addEventListener('input', setFogLevel)
   showLabelsCheckbox.addEventListener('input', setLabelSize)
   labelSizeSlider.addEventListener('input', setLabelSize)
   arrowheadPlacementSlider.addEventListener('input', setArrowheadPlacement)
   GEUtils.createActionHandler(cayleyViewControlElement, (action) => eval(action))
}

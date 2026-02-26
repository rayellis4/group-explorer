/* @flow

# MulttableControl

Display input elements that configure the MulttableView:
 * organize multtable by subgroup
 * separate cosets and adjust gutter
 * set default element coloration
 * set element coloration when elements are re-organized (e.g., on column drag)

```javascript
 */

import {makeMockSelect} from './UIComponents.js'

/*::
import {MulttableView} from './MulttableView.js'
 */

export function addControl (multtableControlElement /*: HTMLElement */, multtableView /*: MulttableView */) {
   // create elements for view control and initialize values from MulttableView
   const subgroupIndex =
      (multtableView.organizingSubgroup === multtableView.group.subgroups.length - 1)
         ? 0
         : multtableView.organizingSubgroup
   const formatSubgroupChoice = (subgroupIndex /*: integer */) => {
      const subgroup = multtableView.group.subgroups[subgroupIndex]
      return (subgroupIndex === 0)
         ? 'none'
         : `<span style="color: ${subgroup.isNormal ? 'blue' : 'black'}"><i>H</i><sub>${subgroupIndex}</sub>,
               a subgroup of order ${subgroup.order}</span>`
   }

   multtableControlElement.innerHTML =
      `<div>
           Organize by subgroup:
           <div id="organization_select" class="mock-select" data-index="${subgroupIndex}">
              ${formatSubgroupChoice(subgroupIndex)}
           </div>
       </div>

       <div>
           Separate cosets by:
           <input id="separation_slider" type="range" min="0" max="100"
              value="${100 * multtableView.separation}">
       </div>

       <div>
           Default coloration:
           <div>
               <input id="coloration_rainbow" name="coloration" value="rainbow" type="radio"
                  ${(multtableView.coloration === 'rainbow') ? 'checked' : ''}>
               <label for="coloration_rainbow">Spectrum/rainbow</label>
           </div>
           <div>
               <input id="coloration_grayscale" name="coloration" value="grayscale" type="radio"
                  ${(multtableView.coloration === 'grayscale') ? 'checked' : ''}>
               <label for="coloration_grayscale">Grayscale</label>
           </div>
           <div>
               <input id="coloration_none" name="coloration" value="none" type="radio"
                  ${(multtableView.coloration === 'none') ? 'checked' : ''}>
               <label for="coloration_none">None</label>
           </div>
       </div>

       <div>
           Element coloring on reorganization:
           <div>
               <input id="color_order_top_row_fixed" name="color-order" value="topRowFixed" type="radio"
                  ${(multtableView.colorReordering === 'topRowFixed') ? 'checked' : ''}>
               <label for="color_order_top_row_fixed">Top row colors don't change</label>
           </div>
           <div>
               <input id="color_order_element_colors_fixed" name="color-order" value="elementColorsFixed" type="radio"
                  ${(multtableView.colorReordering === 'elementColorsFixed') ? 'checked' : ''}>
               <label for="color_order_element_colors_fixed">Element colors don't change</label>
           </div>
       </div>

       <style>
          #${(multtableControlElement.getAttribute('id') /*:: as any as string */)} > *:first-child {
             margin-top: 0.5em;
          }
       </style>`


   // define multtable control element names
   const organizationSelect = (document.getElementById('organization_select') /*:: as any as HTMLElement */)
   const separationSlider = (document.getElementById('separation_slider') /*:: as any as HTMLInputElement */)
   const colorationRainbow = (document.getElementById('coloration_rainbow') /*:: as any as HTMLInputElement */)
   const colorationGrayscale = (document.getElementById('coloration_grayscale') /*:: as any as HTMLInputElement */)
   const colorationNone = (document.getElementById('coloration_none') /*:: as any as HTMLInputElement */)
   const colorOrderTopRowFixed = (document.getElementById('color_order_top_row_fixed') /*:: as any as HTMLInputElement */)
   const colorOrderElementColorsFixed =
      (document.getElementById('color_order_element_colors_fixed') /*:: as any as HTMLInputElement */)

   // define multtable control element input handlers

   // Display organization choices in mock select
   const displayChoices = () => {
      const choices /*: Array<{value: string, label?: html}> */ = multtableView.group.subgroups.slice(0, -1)
         .map((_subgroup, index) => { return {value: `${index}`, label: formatSubgroupChoice(index)} })
      makeMockSelect(organizationSelect, choices)
         .then(
            (choice) => multtableView.organizeBySubgroup(parseInt(choice)),
            () => {}
         )
   }

   // Set separation between cosets in multtable display
   const setSeparation = () => {
      multtableView.separation = parseInt(separationSlider.value) / 100
   }

   // Set coloration option in multtable
   const setColoration = (coloration /*: 'rainbow' | 'grayscale' | 'none' */) => {
      multtableView.coloration = coloration
   }

   // Set color order option in multtable
   const setColorReordering = (colorReordering /*: 'topRowFixed' | 'elementColorsFixed' */) => {
      multtableView.colorReordering = colorReordering
   }


   // Add input handlers to control elements
   organizationSelect.addEventListener('click', displayChoices)
   separationSlider.addEventListener('input', setSeparation)
   colorationRainbow.addEventListener('click', () => setColoration('rainbow'))
   colorationGrayscale.addEventListener('click', () => setColoration('grayscale'))
   colorationNone.addEventListener('click', () => setColoration('none'))
   colorOrderTopRowFixed.addEventListener('click', () => setColorReordering('topRowFixed'))
   colorOrderElementColorsFixed.addEventListener('click', () => setColorReordering('elementColorsFixed'))
}

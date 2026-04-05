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

export {addControl}
/*::
import {MulttableView} from './MulttableView.js'
 */

function addControl (multtableControlElement /*: HTMLElement */, modelProxy /*: SubscriptionProxy<MulttableModel> */) {
   const viewModel = new ViewModel(modelProxy)
   new View(viewModel, multtableControlElement)
}

class ViewModel /*: implements Updatable */ {
   #model /*: MulttableModel */
   #view /*: View */
   #modelFields /*: Array<string> */ = [
      'organizingSubgroup',
      'separation',
      'coloration',
      'colorReordering'
   ]


   constructor (model /*: SubscriptionProxy<MulttableModel> */) {
      this.model = model
   }

   get group () /*: Group */ {
      return this.model.group
   }

   get view () /*: View */ {
      return this.#view
   }

   set view (view /*: View */) {
      this.#view = view
      this.#modelFields.forEach((field) => this.update(field, this.model[field]))
   }

   get model () /*: MulttableModel */ {
      return this.#model
   }

   set model (multtableModel /*: SubscriptionProxy<MulttableProxy> */) {
      this.#model = multtableModel
      this.#modelFields.forEach((field) => {
         multtableModel.$subscribe(this, field)
         this.update(field, this.model[field])
      })
   }

   update (field /*: string */, value /*: any */) {
      if (this.view == null) {
         return
      }
      switch (field) {
      case 'organizingSubgroup':
         this.view['subgroupIndex'] = value ?? 0
         break
      case 'coloration':
      case 'colorReordering':
         this.view[field] = value
         break
      case 'separation':
         this.view[field] = 100 * value
         break
      }
   }

   updateFromView (field /*: string */, value /*: any */) {
      switch (field) {
      case 'subgroupIndex':
         this.model['organizingSubgroup'] = parseInt(value)
         break
      case 'coloration':
      case 'colorReordering':
         this.model[field] = value
         break
      case 'separation':
         this.model[field] = value / 100
         break
      }
   }
}

class View {
   viewModel /*: ViewModel */
   rootElement /*: HTMLElement */

   constructor (viewModel /*: ViewModel */, rootElement /*: HTMLElement */) {
      this.viewModel = viewModel
      this.rootElement = rootElement
      rootElement.innerHTML = View.getViewHTML(rootElement.getAttribute('id'))
      rootElement.querySelector('#organization-select')
         .addEventListener('click', (clickEvent) => this.displayOrganizationChoices(clickEvent.target))
      rootElement.addEventListener('change', (changeEvent) => this.handleChangeEvent(changeEvent))
   }

   displayOrganizationChoices (target /*: HTMLElement */) {
      const choices /*: Array<{value: string, label?: html}> */ = this.viewModel.group.subgroups.slice(0, -1)
         .map((_subgroup, index) => { return {value: `${index}`, label: this.formatSubgroupChoice(index)} })
      makeMockSelect(target, choices)
         .then(
            (choice) => this.updateViewModel('subgroupIndex', choice),
            () => {}
         )
   }

   formatSubgroupChoice (subgroupIndex /*: integer */) {
      const subgroup = this.viewModel.group.subgroups[subgroupIndex]
      return (subgroupIndex === 0)
         ? 'none'
         : `<span style="color: ${subgroup.isNormal ? 'blue' : 'black'}"><i>H</i><sub>${subgroupIndex}</sub>,
               a subgroup of order ${subgroup.order}</span>`
   }

   handleChangeEvent (changeEvent /*: Event */) {
      const inputElement = changeEvent.target
      if (inputElement != null) {
         const field = inputElement.getAttribute('data-bind')
         const value = inputElement.value
         this.updateViewModel(field, value)
      }
   }

   updateViewModel (field /*: string */, value /*: any */) {
      this.viewModel.updateFromView(field, value)
   }

   set subgroupIndex (subgroupIndex /*: number */) {
      const organizationSelectElement = rootElement.querySelector('#organization-select')
      organizationSelectElement.setAttribute('data-index', subgroupIndex)
      organizationSelectElement.innerHTML = this.formatSubgroupChoice(subgroupIndex)
   }

   set separation (separation /*: number */) {
      rootElement.querySelector('#separation-slider').setAttribute('value', separation)
   }

   set coloration (coloration /*: 'rainbow' | 'grayscale' | 'none' */) {
      rootElement.querySelectorAll('[name="coloration"]')
         .forEach((radioButton) => radioButton.setAttribute('checked', false))
      rootElement.querySelector(`[value="${coloration}"]`).setAttribute('checked', true)
   }

   set colorReordering (colorReordering /*: 'topRowFixed' | 'elementColorsFixed' */) {
      rootElement.querySelectorAll('[name="color-order"]')
         .forEach((radioButton) => radioButton.setAttribute('checked', false))
      rootElement.querySelector(`[value="${colorReordering}"]`).setAttribute('checked', true)
   }

   static getViewHTML (rootId /*: string */) {
      return `
          <style>
             #${rootId} > *:first-child {
                margin-top: 0.5em;
             }
          </style>

          <div>
             Organize by subgroup:
             <div id="organization-select" class="mock-select" data-bind="subgroupIndex">none</div>
          </div>

          <div>
             Separate cosets by:
             <input id="separation-slider" type="range" min="0" max="100" data-bind="separation" value="0">
          </div>

          <div>
             Default coloration:
             <div>
                 <input id="coloration-rainbow" name="coloration" value="rainbow" type="radio" data-bind="coloration"
                    checked>
                 <label for="coloration-rainbow">Spectrum/rainbow</label>
             </div>
             <div>
                 <input id="coloration-grayscale" name="coloration" value="grayscale" type="radio" data-bind="coloration">
                 <label for="coloration-grayscale">Grayscale</label>
             </div>
             <div>
                 <input id="coloration-none" name="coloration" value="none" type="radio" data-bind="coloration">
                 <label for="coloration-none">None</label>
             </div>
          </div>

          <div>
             Element coloring on reorganization:
             <div>
                 <input id="color-order-top-row-fixed" name="color-order" value="topRowFixed" type="radio"
                    data-bind="colorReordering" checked>
                 <label for="color-order-top-row-fixed">Top row colors don't change</label>
             </div>
             <div>
                 <input id="color-order-element-colors-fixed" name="color-order" value="elementColorsFixed"
                    type="radio" data-bind="colorReordering">
                 <label for="color-order-element-colors-fixed">Element colors don't change</label>
             </div>
          </div>`
   }
}

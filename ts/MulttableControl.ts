/*

# MulttableControl

Display input elements that configure the MulttableView:
 * organize multtable by subgroup
 * separate cosets and adjust gutter
 * set default element coloration
 * set element coloration when elements are re-organized (e.g., on column drag)

```javascript
 */
import { SubscriptionProxy, Updatable } from './GEUtils.js'
import { Group } from './Group.js'
import * as Log from './Log.js'
import { MulttableModel, MulttableColoration, MulttableColorReordering } from './MulttableModel.js'
import { makeMockSelect } from './UIComponents.js'

export function addControl (multtableControlElement: HTMLElement, modelProxy: SubscriptionProxy<MulttableModel>) {
   const viewModel = new ViewModel(modelProxy)
   viewModel.view = new View(multtableControlElement, viewModel)
}

class ViewModel implements Updatable {
   private _model!: MulttableModel
   private _view!: View

   private static modelFields: Array<keyof MulttableModel> = [
      'organizingSubgroup',
      'separation',
      'coloration',
      'colorReordering'
   ]

   constructor (model: SubscriptionProxy<MulttableModel>) {
      this.model = model
   }

   get group (): Group {
      return this.model.group
   }

   get model (): MulttableModel {
      return this._model
   }
   set model (model: SubscriptionProxy<MulttableModel>) {
      this._model = model
      ViewModel.modelFields.forEach((field) => model.$subscribe(this, field))
   }

   get view (): View {
      return this._view
   }
   set view (view: View) {
      this._view = view
      ViewModel.modelFields.forEach((field) => this.update(field, this.model[field]))
   }

   // field update callbacks from Model — convert to slider values and push to View directly
   update (field: string, value: unknown) {
      if (this.view == null)
         return

      switch (field) {
         case 'organizingSubgroup':
            this.view.subgroupIndex = (value as typeof this.model.organizingSubgroup) ?? 0
            break
         case 'coloration':
            this.view.coloration = value as typeof this.model.coloration
            break
         case 'colorReordering':
            this.view.colorReordering = value as typeof this.model.colorReordering
            break
         case 'separation':
            this.view.separation = 100 * (value as typeof this.model.separation)
            break
      }
   }

   // handles input events from View, updates Model
   updateModel (field: string) {
      switch (field) {
      case 'subgroupIndex':
         this.model.organizingSubgroup = this.view.subgroupIndex
         break
      case 'coloration':
         this.model.coloration = this.view.coloration
         break
      case 'colorReordering':
         this.model.colorReordering = this.view.colorReordering
         break
      case 'separation':
         this.model.separation = this.view.separation / 100
         break
      }
   }
}

class View {
   private viewModel: ViewModel
   private rootElement: HTMLElement

   constructor (rootElement: HTMLElement, viewModel: ViewModel) {
      this.viewModel = viewModel
      this.rootElement = rootElement
      rootElement.innerHTML = View.getHTML(rootElement)
      ;(rootElement.querySelector('#organization-select') as HTMLElement)
         .addEventListener('click', (ev) => this.handleClickEvent(ev))
      rootElement.addEventListener('input', (ev) => this.handleInputEvent(ev))
   }

   get subgroupIndex (): number {
      return parseInt(this.getFieldValue('subgroupIndex')!)
   }
   set subgroupIndex (subgroupIndex: number) {
      const organizationSelectElement = this.getDisplayElements('subgroupIndex')[0]!
      organizationSelectElement.setAttribute('data-value', subgroupIndex.toString())
      organizationSelectElement.innerHTML = this.formatSubgroupChoice(subgroupIndex)
   }

   get separation (): number {
      return parseInt(this.getFieldValue('separation')!)
   }
   set separation (separation: number) {
      (this.rootElement.querySelector('#separation-slider') as HTMLInputElement)
         .setAttribute('value', separation.toString())
   }

   get coloration (): MulttableColoration {
      return this.getFieldValue('coloration') as typeof this.coloration
   }
   set coloration (coloration: MulttableColoration) {
      this.rootElement.querySelectorAll('input[name="coloration"]')
         .forEach((radioButton) => (radioButton as HTMLInputElement).checked = false)
      ;(this.rootElement.querySelector(`[value="${coloration}"]`) as HTMLInputElement)
         .checked = true
   }

   get colorReordering (): MulttableColorReordering {
      return this.getFieldValue('colorReordering') as typeof this.colorReordering
   }
   set colorReordering (colorReordering: MulttableColorReordering) {
      this.rootElement.querySelectorAll('[name="color-order"]')
         .forEach((radioButton) => (radioButton as HTMLInputElement).checked = false)
      ;(this.rootElement.querySelector(`[value="${colorReordering}"]`) as HTMLInputElement)
         .checked = true
   }

   private formatSubgroupChoice (subgroupIndex: integer) {
      const subgroup = this.viewModel.group.subgroups[subgroupIndex]
      return (subgroupIndex === 0)
         ? 'none'
         : `<span style="color: ${subgroup.isNormal ? 'blue' : 'black'}"><i>H</i><sub>${subgroupIndex}</sub>,
               a subgroup of order ${subgroup.order}</span>`
   }
   
   private getDisplayElements (field: string): HTMLElement[] {
      const displayElements = Array.from(this.rootElement.querySelectorAll(`[data-bind="${field}"]`)) as HTMLElement[]
      if (displayElements.length == 0) {
         Log.warn(`unable to find element with data binding = ${field}`)
      }

      return displayElements
   }

   private getFieldValue (field: string): Maybe<string> {
      let result: Maybe<string> = null
      const displayElements = this.getDisplayElements(field)
      const displayElement = displayElements[0]
      if (displayElement != null) {
         if (displayElement instanceof HTMLInputElement) {
            if (displayElement.type.toLowerCase() == 'range') {
               result = displayElement.value
            } else if (displayElement.type.toLowerCase() == 'radio') {
               result = (displayElements as HTMLInputElement[]).find((radio) => radio.checked)!.value
            }
         } else if (displayElement instanceof HTMLDivElement) {  // .mock-select
            result = displayElement.getAttribute("data-value")
         }
      }
      return result
   }

   private handleClickEvent (clickEvent: MouseEvent) {
      const target = clickEvent.target as HTMLElement
      const choices: Array<{ value: string, label?: html }> =
         this.viewModel.group.subgroups
            .slice(0, -1)  // include all but last subgroup, the whole group
            .map((_subgroup, index) => { return { value: `${index}`, label: this.formatSubgroupChoice(index) } })
      makeMockSelect(target, choices)
         .then(
            (_choice) => this.viewModel.updateModel('subgroupIndex'),
            () => {}
         )
   }

   private handleInputEvent (inputEvent: InputEvent) {
      const field = (inputEvent.target as HTMLInputElement)?.getAttribute('data-bind')
      if (field != null) {
         inputEvent.stopPropagation()
         this.viewModel.updateModel(field)
      }
   }

   private static getHTML (rootElement: HTMLElement) {
      const rootId = rootElement.getAttribute('id')
      return `
          <style>
             #${rootId} > *:first-child {
                margin-top: 0.5em;
             }
          </style>

          <div>
             Organize by subgroup:
             <div id="organization-select" class="mock-select" data-bind="subgroupIndex" data-value="0">none</div>
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

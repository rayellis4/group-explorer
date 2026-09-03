/*

# SymmetryObjectControl

Display input elements that configure the SymmetryObjectView:
 * choose symmetry object
 * set zoom level
 * set line thickness
 * set node radius
 * set whether and how much fog to use

```javascript
 */
import * as Log from './Log.js'
import { layoutSymmetryObject } from './SymmetryObjectView.js'
import { makeMockSelect } from './UIComponents.js'

import type { CayleyDiagramModel, LayoutType }  from  './CayleyDiagramModel.ts'
import type { Group } from './Group.ts'
import type { Updatable, SubscriptionProxy } from './GEUtils.ts'

export function addControl (
   symmetryObjectControlElement: HTMLElement,
   symmetryObjectModel: SubscriptionProxy<CayleyDiagramModel>
) {
   const viewModel = new ViewModel(symmetryObjectModel)
   viewModel.view = new View(symmetryObjectControlElement, viewModel)
}

class ViewModel implements Updatable {
   private _model!: CayleyDiagramModel
   private _view!: View

   private static modelFields: (keyof CayleyDiagramModel)[] = [
      'zoom_level',
      'line_width',
      'sphere_scale_factor',
      'fog_level',
   ]

   constructor (model: SubscriptionProxy<CayleyDiagramModel>) {
      this.model = model
   }

   get group (): Group {
      return this.model.group
   }

   get model (): CayleyDiagramModel {
      return this._model
   }
   set model (model: SubscriptionProxy<CayleyDiagramModel>) {
      this._model = model
      ViewModel.modelFields.forEach((field) => model.$subscribe(this, field))
   }

   get view (): View {
      return this._view
   }
   set view (view: View) {
      this._view = view
      ViewModel.modelFields.forEach((field) => this.update(field, this.model[field]))

      const initialDiagramName = this.initialDiagramName()
      this.update('diagram_select', initialDiagramName)
      this.updateModel('diagram_select')
   }

   private initialDiagramName () {
      let diagramName: string
      // get diagram name from
      const urlDiagramName = new URL(window.location.href).searchParams.get('diagram');
      // unless it is empty
      if (urlDiagramName == undefined) {
         diagramName = this.group.symmetryObjects[0].name;
      } else {
         // or it does not match one of the symmetryObjects
         if (!this.group.symmetryObjects.some( (symmetryObject) => symmetryObject.name == urlDiagramName )) {
            // Name is passed but there is no matching symmetryObject -- alert user and continue
            Log.warn(`The group ${this.group.shortName} has no symmetry object named ${urlDiagramName}. ` +
               `Using ${this.group.symmetryObjects[0].name} instead.`);
            diagramName = this.group.symmetryObjects[0].name;
         } else {
            diagramName = urlDiagramName;
         }
      }
      return diagramName
   }

   // field update callbacks from Model — convert to slider values and push to View directly
   update (field: string, value: unknown) {
      if (this.view == null)
         return

      switch (field) {
         case 'diagram_select':
            this.view.diagram_select = value as html
            break
         case 'zoom_level':
            this.view.zoom_level = 10 * Math.log(value as typeof this.model.zoom_level)
            break
         case 'line_width':
            this.view.line_width = 1 + (value as typeof this.model.line_width - 1) / 0.75
            break
         case 'sphere_scale_factor':
            this.view.sphere_scale_factor = 10 * Math.log(value as typeof this.model.sphere_scale_factor)
            break
         case 'fog_level':
            this.view.use_fog = (value as typeof this.model.fog_level) != 0
            if (this.view.use_fog)
               this.view.fog_level = 10 * (value as typeof this.model.fog_level)
            break
      }
   }

   // handles input events from View, updates Model
   updateModel (field: string) {
      switch (field) {
      case 'diagram_select':
         this.model.layout =  // override CayleyDiagramModel type to avoid having to create a SymmetryObjectModel
            (layoutSymmetryObject(this.model.group, this.view.diagram_select) as unknown) as LayoutType
         break
      case 'zoom_level':
         this.model.zoom_level = Math.exp(this.view.zoom_level / 10)
         break
      case 'line_width':
         this.model.line_width = 1 + 0.75 * (this.view.line_width - 1)
         break
      case 'sphere_scale_factor':
         this.model.sphere_scale_factor = Math.exp(this.view.sphere_scale_factor / 10)
         break
      case 'use_fog':
      case 'fog_level':
         this.model.fog_level = this.view.use_fog ? (this.view.fog_level / 10) : 0
         break
      }
   }

   // Button data-action strings are eval'd here so `this` resolves to the ViewModel,
   // giving them access to `this.model` for writing request fields directly.
   executeCommand (command: string) {
      eval(command)
   }
}

class View {
   private rootElement: HTMLElement
   private viewModel: ViewModel

   constructor (rootElement: HTMLElement, viewModel: ViewModel) {
      this.rootElement = rootElement
      this.viewModel = viewModel
      rootElement.innerHTML = View.getHTML()
      this.rootElement.addEventListener('input', (ev) => this.handleInputEvent(ev))
      this.rootElement.addEventListener('click', (ev) => this.handleClickEvent(ev))
   }

   get diagram_select (): string { return this.getField('diagram_select') as typeof this.diagram_select }
   set diagram_select (symmetryObject: string) {
      const organizationSelectElement = this.getDisplayElement('diagram_select')!
      organizationSelectElement.setAttribute('data-value', symmetryObject)
      organizationSelectElement.innerHTML = symmetryObject
   }

   get zoom_level (): number { return this.getField('zoom_level') as typeof this['zoom_level'] }
   set zoom_level (zoom_level: number) { this.updateField('zoom_level', zoom_level) }

   get line_width (): number { return this.getField('line_width') as this['line_width'] }
   set line_width (line_width: number) { this.updateField('line_width', line_width) }

   get sphere_scale_factor (): number { return this.getField('sphere_scale_factor') as this['sphere_scale_factor'] }
   set sphere_scale_factor (sphere_scale_factor: number) { this.updateField('sphere_scale_factor', sphere_scale_factor) }

   get use_fog (): boolean { return this.getField('use_fog') as this['use_fog'] }
   set use_fog (use_fog: boolean) { this.updateField('use_fog', use_fog) }

   get fog_level (): number { return this.getField('fog_level') as this['fog_level'] }
   set fog_level (fog_level: number) { this.updateField('fog_level', fog_level) }


   private getDisplayElement (field: string): Maybe<HTMLElement> {
      const displayElement = this.rootElement.querySelector(`[data-bind="${field}"]`) as Maybe<HTMLElement>
      if (displayElement == null) {
         Log.warn(`SymmetryObjectControl.View.getDisplayElement: search for unknown data binding ${field}`)
      }

      return displayElement
   }

   private getField (field: string): unknown {
      let result: unknown
      const displayElement = this.getDisplayElement(field) as HTMLElement
      if (displayElement instanceof HTMLInputElement) {
         if (displayElement.type.toLowerCase() == 'range') {
            result = displayElement.valueAsNumber
         } else if (displayElement.type.toLowerCase() == 'checkbox') {
            result = displayElement.checked
         }
      } else if (displayElement instanceof HTMLDivElement) {  // .mock-select
         result = displayElement.getAttribute('data-value')   // just has string, not index
      }
      return result
   }

   private updateField (field: string, value: unknown) {
      const displayElement = this.getDisplayElement(field) as HTMLElement
      if (displayElement instanceof HTMLInputElement) {
         if (displayElement.type.toLowerCase() == 'range') {
            displayElement.valueAsNumber = value as number
         } else if (displayElement.type.toLowerCase() == 'checkbox') {
            displayElement.checked = value as boolean
         }
      } else if (field == 'diagram_select') {
         const symmetryObjectIndex = this.viewModel.group.symmetryObjects
            .findIndex((symmetryObject) => symmetryObject.name == value)
         displayElement.setAttribute('data-index', symmetryObjectIndex.toString())
         displayElement.innerHTML = value as html
      }
   }

   // generic input event handler, forwards to ViewModel
   private handleInputEvent (inputEvent: InputEvent) {
      const field = (inputEvent.target as HTMLElement)?.getAttribute('data-bind')
      if (field != null) {
         inputEvent.stopPropagation()
         this.viewModel.updateModel(field)
      }
   }

   // handle click event --
   private handleClickEvent (clickEvent: MouseEvent) {
      const action = (clickEvent.target as HTMLElement).closest('[data-action]')?.getAttribute('data-action')
      if (action == null) {
         const maybeMockSelect = (clickEvent.target as HTMLElement).closest('.mock-select') as Maybe<HTMLElement>
         if (maybeMockSelect != null) {
            const diagramChoices =
               this.viewModel.group.symmetryObjects.map((symmetryObject) => { return {value: symmetryObject.name} })
            makeMockSelect(maybeMockSelect, diagramChoices)
               .then(
                  (_choice) => this.viewModel.updateModel('diagram_select'),
                  () => {}
               )
         }
      } else {
         clickEvent.stopPropagation()
         this.viewModel.executeCommand(action)
      }
   }

   private static getHTML () {
      return `
          <div>
             View this symmetry object:
             <div data-bind="diagram_select" class="mock-select" data-index=""></div>
          </div>

          <div>
             Zoom level:
             <input data-bind="zoom_level" type="range" min="-10" max="10" value="0">
          </div>

          <div>
             Line thickness:
             <input data-bind="line_width" type="range" min="1" max="20">
          </div>

          <div>
             Node radius:
             <input data-bind="sphere_scale_factor" type="range" min="-10" max="10">
          </div>

          <div>
             <input data-bind="use_fog" type="checkbox">&nbsp;Use this much fog:
             <input data-bind="fog_level" type="range" min="1" max="10">
          </div>

          <div>
             <details style="font-size: 1.25rem">
                <summary>Advanced</summary>
                <button style="width: 20ch" data-action="this.model.showingAxes = !this.model.showingAxes"
                   >Show/hide axes</button>
                <button style="width: 20ch" data-action="this.model.snap_to_axis_request = true"
                   >Snap to axis</button>
             </details>
          </div>`
   }
}

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
import { makeMockSelect } from './UIComponents.js'
import { layoutSymmetryObject } from './SymmetryObjectView.js'

import type { CayleyDiagramModel, LayoutType }  from  './CayleyDiagramModel.ts'
import type { Group } from './Group.ts'
import type { Updatable, SubscriptionProxy } from './GEUtils.ts'

export function addControl (
   symmetryObjectControlElement: HTMLElement,
   symmetryObjectModel: SubscriptionProxy<CayleyDiagramModel>
) {
   const viewModel = new ViewModel()
   viewModel.setModel(symmetryObjectModel)
   const view = new View(symmetryObjectControlElement)
   view.setViewModel(viewModel)
}

class ViewModel implements Updatable {
   #model!: SubscriptionProxy<CayleyDiagramModel>
   #view!: View
   #modelFields: (keyof CayleyDiagramModel)[] = [
      'zoom_level',
      'line_width',
      'sphere_scale_factor',
      'fog_level',
   ]

   get group (): Group {
      return this.#model.group
   }

   get model (): CayleyDiagramModel {
      return this.#model
   }

   get view (): View {
      return this.#view
   }

   setModel (model: SubscriptionProxy<CayleyDiagramModel>) {
      this.#model = model
      this.#modelFields.forEach((field) => model.$subscribe(this, field))
      if (this.view != null) {
         this.initializeView()
      }
   }

   setView (view: View) {
      this.#view = view
      if (this.model != null) {
         this.initializeView()
      }
   }

   initializeView () {
      this.#modelFields.forEach((field) => this.update(field, this.model[field]))
      this.update('diagram_select', this.#initialDiagramName())
      this.updateModel('diagram_select', null)
   }

   #initialDiagramName () {
      let diagramName
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

   getFromView (field: string): any {
      return this.view.getFieldValue(field)
   }

   // handles input events from View, updates Model
   updateModel (field: string, value: any) {
      switch (field) {
      case 'diagram_select':
         this.model.layout =  // override CayleyDiagramModel type to avoid having to create a SymmetryObjectModel
            (layoutSymmetryObject(this.model.group, this.getFromView('diagram_select')) as unknown) as LayoutType
         break
      case 'zoom_level':
         this.model.zoom_level = Math.exp(value / 10)
         break
      case 'line_width':
         this.model.line_width = 1 + 0.75 * (value - 1)
         break
      case 'sphere_scale_factor':
         this.model.sphere_scale_factor = Math.exp(value / 10)
         break
      case 'use_fog':
      case 'fog_level':
         this.model.fog_level = this.getFromView('use_fog') ? (this.getFromView('fog_level') / 10) : 0
         break
      }
   }

   // field update callbacks from Model — convert to slider values and push to View directly
   update (field: string, value: any) {
      switch (field) {
      case 'diagram_select':
         this.view.update('diagram_select', value)
         break
      case 'zoom_level':
         this.view.update('zoom_level', 10 * Math.log(value))
         break
      case 'line_width':
         this.view.update('line_width', 1 + (value - 1) / 0.75)
         break
      case 'sphere_scale_factor':
         this.view.update('sphere_scale_factor', 10 * Math.log(value))
         break
      case 'fog_level':
         this.view.update('use_fog', value != 0)
         if (value != 0) {
            this.view.update('fog_level', 10 * value)
         }
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
   rootElement: HTMLElement
   viewModel!: ViewModel

   constructor (rootElement: HTMLElement) {
      this.rootElement = rootElement
      this.addHTML()
      this.rootElement.addEventListener('input', (ev) => this.handleInputEvent(ev))
      this.rootElement.addEventListener('click', (ev) => this.handleClickEvent(ev))
   }

   addHTML () {
      this.rootElement.innerHTML =
         `<div>
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

   setViewModel (viewModel: ViewModel) {
      this.viewModel = viewModel
      this.viewModel.setView(this)
   }

   getDisplayElement (field: string): Maybe<HTMLElement> {
      const displayElement = this.rootElement.querySelector(`[data-bind="${field}"]`) as Maybe<HTMLElement>
      if (displayElement == null) {
         Log.warn(`SymmetryObjectControl.View.getDisplayElement: search for unknown data binding ${field}`)
      }

      return displayElement
   }

   getFieldValue (field: string): any {
      let result
      const displayElement = this.getDisplayElement(field) as HTMLElement
      if (displayElement instanceof HTMLInputElement) {
         if (displayElement.type.toLowerCase() == 'range') {
            result = displayElement.value
         } else if (displayElement.type.toLowerCase() == 'checkbox') {
            result = displayElement.checked
         }
      } else if (field == 'diagram_select') {
         result = displayElement.innerHTML
      }
      return result
   }

   update (field: string, value: any) {
      const displayElement = this.getDisplayElement(field) as HTMLElement
      if (displayElement instanceof HTMLInputElement) {
         if (displayElement.type.toLowerCase() == 'range') {
            displayElement.value = value
         } else if (displayElement.type.toLowerCase() == 'checkbox') {
            displayElement.checked = value
         }
      } else if (field == 'diagram_select') {
         const symmetryObjectIndex = this.viewModel.group.symmetryObjects
            .findIndex((symmetryObject) => symmetryObject.name == value)
         displayElement.setAttribute('data-index', symmetryObjectIndex.toString())
         displayElement.innerHTML = value
      }
   }

   // generic input event handler, forwards to ViewModel
   handleInputEvent (inputEvent: InputEvent) {
      const field = (inputEvent.target as HTMLElement).getAttribute('data-bind')
      if (field != null) {
         inputEvent.stopPropagation()
         this.viewModel.updateModel(field, this.getFieldValue(field))
      }
   }

   handleClickEvent (clickEvent: MouseEvent) {
      const action = (clickEvent.target as HTMLElement).closest('[data-action]')?.getAttribute('data-action')
      if (action == null) {
         const maybeMockSelect = (clickEvent.target as HTMLElement).closest('.mock-select') as Maybe<HTMLElement>
         if (maybeMockSelect != null) {
            const diagramChoices = [
               ...this.viewModel.group.symmetryObjects.map((symmetryObject) => { return {value: symmetryObject.name} })
            ]
            makeMockSelect(maybeMockSelect, diagramChoices)
               .then(
                  (choice) => this.viewModel.updateModel('diagram_select', choice),
                  () => {}
               )
         }
      } else {
         clickEvent.stopPropagation()
         this.viewModel.executeCommand(action)
      }
   }
}

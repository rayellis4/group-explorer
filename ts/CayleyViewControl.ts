/*

# CayleyViewControl

Control panel for CayleyDiagramView display parameters (zoom, line width, node radius,
fog, labels, arrowhead placement) and two commands (show/hide axes, snap to axis).

## MVVM structure

- **ViewModel** — subscribes to `CayleyDiagramModel` fields; converts between model values
  and slider/checkbox values; routes button commands to model request fields
  (`showingAxes`, `snap_to_axis_request`). Call `setModel` before `setView`.
- **View** — pure display: inserts HTML, reads/writes input elements, forwards events to
  ViewModel. Uses `data-bind` attribute to match input elements to field names generically,
  so `update(field, value)` and `getFieldValue(field)` need no per-field logic.
  Button actions are `data-action` strings eval'd in the ViewModel's context.

`setModel` subscribes to model fields; `setView` wires the view reference and pushes
current model state to initialize the sliders. This ordering ensures the view is ready
before any values are pushed to it.

```javascript
 */
import * as Log from './Log.js'

import type { CayleyDiagramModel } from './CayleyDiagramModel.js'
import type { Updatable, SubscriptionProxy } from './GEUtils.js'

// create ViewModel and View, wire to the CayleyDiagramModel proxy
export function addControl (
   cayleyViewControlElement: HTMLElement,
   cayleyDiagramModel: SubscriptionProxy<CayleyDiagramModel>
) {
   const viewModel = new ViewModel(cayleyDiagramModel)
   viewModel.view = new View(cayleyViewControlElement, viewModel)
}

// ViewModel converts CayleyDiagramModel properties <=> View slider values
class ViewModel implements Updatable {
   private _model!: CayleyDiagramModel
   private _view!: View

   private static modelFields: (keyof CayleyDiagramModel)[] = [
      'zoom_level',
      'line_width',
      'sphere_scale_factor',
      'fog_level',
      'label_scale_factor',
      'arrowhead_placement',
   ]

   constructor (model: SubscriptionProxy<CayleyDiagramModel>) {
      this.model = model
   }

   get model (): CayleyDiagramModel {
      return this._model
   }
   set model (model: SubscriptionProxy<CayleyDiagramModel>) {
      this._model = model
      ViewModel.modelFields.forEach((field) => model.$subscribe(this, field))
   }

   get view(): View {
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
         if (this.view.use_fog) {
            this.view.fog_level = 10 * (value as typeof this.model.fog_level)
         }
         break
      case 'label_scale_factor':
         this.view.show_labels = (value as typeof this.model.label_scale_factor) != 0
         if (this.view.show_labels) {
            this.view.label_size = 10 * Math.log(value as typeof this.model.label_scale_factor)
         }
         break
      case 'arrowhead_placement':
         this.view.arrowhead_placement = 20 * (value as typeof this.model.arrowhead_placement)
         break
      }
   }

   // handles input events from View, updates Model
   updateModel (field: string) {
      switch (field) {
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
      case 'show_labels':
      case 'label_size':
         this.model.label_scale_factor = this.view.show_labels ? Math.exp(this.view.label_size / 10) : 0
         break
      case 'arrowhead_placement':
         this.model.arrowhead_placement = (this.view.arrowhead_placement) / 20
         break
      }
   }

   // Button data-action strings are eval'd here so `this` resolves to the ViewModel,
   // giving them access to `this.model` for writing request fields directly.
   executeCommand (command: string) {
      eval(command)
   }
}

// View has html to display values on sliders, field events from input elements
class View {
   private rootElement: HTMLElement
   private viewModel: ViewModel

   constructor (rootElement: HTMLElement, viewModel: ViewModel) {
      this.rootElement = rootElement
      this.viewModel = viewModel
      this.rootElement.innerHTML = View.getViewHTML()
      this.rootElement.addEventListener('input', (ev) => this.handleInputEvent(ev))
      this.rootElement.addEventListener('click', (ev) => this.handleButtonEvent(ev))
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

   get show_labels (): boolean { return this.getField('show_labels') as this['show_labels'] }
   set show_labels (show_labels: boolean) { this.updateField('show_labels', show_labels) }

   get label_size (): number { return this.getField('label_size') as this['label_size'] }
   set label_size (label_size: number) { this.updateField('label_size', label_size) }

   get arrowhead_placement (): number { return this.getField('arrowhead_placement') as this['arrowhead_placement'] }
   set arrowhead_placement (arrowhead_placement: number) { this.updateField('arrowhead_placement', arrowhead_placement) }

   private getDisplayElement (field: string): Maybe<HTMLElement> {
      const displayElement = this.rootElement.querySelector(`[data-bind="${field}"]`) as Maybe<HTMLElement>
      if (displayElement == null) {
         Log.warn(`unable to find element with data binding = ${field}`)
      }

      return displayElement
   }

   private getField (field: string): unknown {
      let result: unknown
      const displayElement = this.getDisplayElement(field)
      if (displayElement instanceof HTMLInputElement) {
         if (displayElement.type.toLowerCase() == 'range') {
            result = displayElement.valueAsNumber
         } else if (displayElement.type.toLowerCase() == 'checkbox') {
            result = displayElement.checked
         }
      }
      return result
   }

   private updateField (field: string, value: unknown) {
      const displayElement = this.getDisplayElement(field)
      if (displayElement instanceof HTMLInputElement) {
         if (displayElement.type.toLowerCase() == 'range') {
            displayElement.valueAsNumber = value as number
         } else if (displayElement.type.toLowerCase() == 'checkbox') {
            displayElement.checked = value as boolean
         }
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

   private handleButtonEvent (clickEvent: MouseEvent) {
      const action = (clickEvent.target as HTMLElement)?.closest('[data-action]')?.getAttribute('data-action')
      if (action != null) {
         clickEvent.stopPropagation()
         this.viewModel.executeCommand(action)
      }
   }

   private static getViewHTML () {
      return `
          <div>
             Zoom level:
             <input data-bind="zoom_level" type="range" min="-10" max="10">
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
             <input data-bind="show_labels" type="checkbox">&nbsp;Show labels of this size:
             <input data-bind="label_size" type="range" min="-10" max="10">
          </div>

          <div>
             Arrowhead placement:
             <input data-bind="arrowhead_placement" type="range" min="0" max="20">
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

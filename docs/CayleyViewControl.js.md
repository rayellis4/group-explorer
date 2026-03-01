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
import * as Log from './Log.js'
import {createModelProxy} from './GEUtils.js'

export {addControl}
/*::
import type {CayleyDiagramView} from './CayleyDiagramView.js'
import type {Updatable, SubscriptionProxy} from './GEUtils.js'
 */
// create Model, ViewModel, and View, and configure them
function addControl (cayleyViewControlElement /*: HTMLElement */, cayleyDiagramView /*: CayleyDiagramView */) {
   const model /*: Model */ = new Model(cayleyDiagramView)
   const hackedModelProxy = hackModelProxy(model, cayleyDiagramView)
   const modelProxy = createModelProxy(hackedModelProxy)

   const viewModel = new ViewModel(cayleyDiagramView)
   const viewModelProxy = createModelProxy(viewModel)
   viewModelProxy.setModel(modelProxy)

   const view = new View(cayleyViewControlElement)
   viewModelProxy.view = view
   view.setViewModel(viewModelProxy)
}

function hackModelProxy (model /*: Model */, cayleyDiagramView /*: CayleyDiagramView */) /*: Model */ {
   const handler /*: Proxy$traps<Model> */ = {
      set(model /*: Model */, property /*: string */, value /*: any */, receiver /*: Proxy<Model> */) {
         if (Object.getOwnPropertyNames(model).includes((property /*:: as any as $Keys<Model> */))) {
            Reflect.set(cayleyDiagramView, property, value)
         }

         return Reflect.set(model, property, value, receiver)
      }
   }

   return new Proxy(model, handler)
}

// Model has zoom level, line thickness, etc. initialized from CayleyDiagramView
class Model {
   zoom_level /*: number */
   line_width /*: number */
   sphere_scale_factor /*: number */
   fog_level /*: number */
   label_scale_factor /*: number */
   arrowhead_placement /*: number */

   constructor (cayleyDiagramView /*: CayleyDiagramView */) {
      for (const field of Object.getOwnPropertyNames(this)) {
         this[field] = cayleyDiagramView[field]
      }
   }
}

// View model converts Model properties <=> View properties
class ViewModel /*:: implements Updatable */ {
   cayleyDiagramView /*: CayleyDiagramView */ // needed to execute commands
   model /*: SubscriptionProxy<Model> */
   modelFields /*: Array<string> */ = [
      'zoom_level',
      'line_width',
      'sphere_scale_factor',
      'fog_level',
      'label_scale_factor',
      'arrowhead_placement',
   ]
   view /*: View */

   zoom_level /*: number */
   line_width /*: number */
   sphere_scale_factor /*: number */
   use_fog /*: boolean */
   fog_level /*: number */
   show_labels /*: boolean */
   label_size /*: number */
   arrowhead_placement /*: number */

   constructor (cayleyDiagramView /*: CayleyDiagramView */) {
      this.cayleyDiagramView = cayleyDiagramView
   }

   setModel (model /*: SubscriptionProxy<Model> */) {
      this.model = model
      this.modelFields.forEach((field) => this.model.$subscribe(this, field))
   }

   getFromView (field /*: string */) /*: any */ {
      return this.view.getFieldValue(field)
   }

   // handles input events from View, updates Model
   updateModel (field /*: string */, value /*: any */) {
      switch (field) {
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
      case 'show_labels':
      case 'label_size':
         this.model.label_scale_factor =
            this.getFromView('show_labels') ? Math.exp(this.getFromView('label_size') / 10) : 0
         break
      case 'arrowhead_placement':
         this.model.arrowhead_placement = value / 20
         break
      }
   }

   // fields update callbacks from Model and modifies View
   update (field /*: string */, value /*: any */) {
      switch (field) {
      case 'zoom_level':
         this['zoom_level'] = 10 * Math.log(value)
         break
      case 'line_width':
         this['line_width'] = 1 + (value - 1) / 0.75
         break
      case 'sphere_scale_factor':
         this['sphere_scale_factor'] = 10 * Math.log(value)
         break
      case 'fog_level':
         this['use_fog'] = value != 0
         if (value != 0) {
            this['fog_level'] = 10 * value
         }
         break
      case 'label_scale_factor':
         this['show_labels'] = value != 0
         if (value != 0) {
            this['label_size'] = 10 * Math.log(value)
         }
         break
      case 'arrowhead_placement':
         this['arrowhead_placement'] = 20 * value
         break
      }
   }

   executeCommand (command /*: string */) {
      eval(command)
   }
}

// View has html to display values on sliders, field events from input elements
class View /*:: implements Updatable */ {
   container /*: HTMLElement */
   viewModel /*: ViewModel */
   modelFields /*: Array<string> */ = [  // find these from HTML data-binding?
      'zoom_level',
      'line_width',
      'sphere_scale_factor',
      'use_fog',
      'fog_level',
      'show_labels',
      'label_size',
      'arrowhead_placement',
   ]

   constructor (cayleyViewControlElement /*: HTMLElement */) {
      this.container = cayleyViewControlElement
      this.addHTML()
      this.container.addEventListener('input', (ev) => this.handleInputEvent(ev))
      this.container.addEventListener('click', (ev) => this.handleButtonEvent(ev))
   }

   setViewModel (viewModel /*: ViewModel & {$subscribe: any, $unsubscribe: any} */) {
      this.viewModel = viewModel
      this.modelFields.forEach((field) => viewModel.$subscribe(this, field))
   }

   addHTML () {
      this.container.innerHTML =
         `<div>
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
                <button style="width: 20ch" data-action="this.cayleyDiagramView.toggleCoordinateAxisDisplay()"
                   >Show/hide axes</button>
                <button style="width: 20ch" data-action="this.cayleyDiagramView.snapToAxis()"
                   >Snap to axis</button>
             </details>
          </div>`
   }

   getDisplayElement (field /*: string */) /*: ?HTMLElement */{
      const displayElement = this.container.querySelector(`[data-bind="${field}"]`)
      if (displayElement == null) {
         Log.err('')
      }

      return displayElement
   }

   getFieldValue (field /*: string */) /*: any */ {
      let result
      const displayElement = this.getDisplayElement(field)
      if (displayElement instanceof HTMLInputElement) {
         if (displayElement.type.toLowerCase() == 'range') {
            result = displayElement.value
         } else if (displayElement.type.toLowerCase() == 'checkbox') {
            result = displayElement.checked
         }
      }
      return result
   }

   update (field /*: string */, value /*: any */) {
      const displayElement = this.getDisplayElement(field)
      if (displayElement instanceof HTMLInputElement) {
         if (displayElement.type.toLowerCase() == 'range') {
            displayElement.value = value
         } else if (displayElement.type.toLowerCase() == 'checkbox') {
            displayElement.checked = value
         }
      }
   }

   // generic input event handler, forwards to ViewModel
   handleInputEvent (inputEvent /*: InputEvent */) {
      const field = inputEvent.target.getAttribute('data-bind')
      if (field != null) {
         inputEvent.stopPropagation()
         this.viewModel.updateModel(field, this.getFieldValue(field))
      }
   }

   handleButtonEvent (clickEvent /*: MouseEvent */) {
      const action = clickEvent.target.closest('[data-action]')?.getAttribute('data-action')
      if (action != null) {
         clickEvent.stopPropagation()
         this.viewModel.executeCommand(action)
      }
   }
}

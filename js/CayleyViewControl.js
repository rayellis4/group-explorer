/* @flow

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
import * as Log from './Log.js';
export { addControl };
/*::
import type {CayleyDiagramModel} from './CayleyDiagramModel.js'
import type {Updatable, SubscriptionProxy} from './GEUtils.js'
 */
// create ViewModel and View, wire to the CayleyDiagramModel proxy
function addControl(cayleyViewControlElement /*: HTMLElement */, cayleyDiagramModel /*: SubscriptionProxy<CayleyDiagramModel> */) {
    const viewModel = new ViewModel();
    viewModel.setModel(cayleyDiagramModel);
    viewModel.setView(new View(cayleyViewControlElement));
}
// ViewModel converts CayleyDiagramModel properties <=> View slider values
class ViewModel /*:: implements Updatable */ {
    model; /*: SubscriptionProxy<CayleyDiagramModel> */
    modelFields /*: Array<string> */ = [
        'zoom_level',
        'line_width',
        'sphere_scale_factor',
        'fog_level',
        'label_scale_factor',
        'arrowhead_placement',
    ];
    view; /*: View */
    setModel(model /*: SubscriptionProxy<CayleyDiagramModel> */) {
        this.model = model;
        this.modelFields.forEach((field) => this.model.$subscribe(this, field));
    }
    setView(view /*: View */) {
        this.view = view;
        view.viewModel = this;
        this.modelFields.forEach((field) => this.update(field, this.model[field]));
    }
    getFromView(field /*: string */) {
        return this.view.getFieldValue(field);
    }
    // handles input events from View, updates Model
    updateModel(field /*: string */, value /*: any */) {
        switch (field) {
            case 'zoom_level':
                this.model.zoom_level = Math.exp(value / 10);
                break;
            case 'line_width':
                this.model.line_width = 1 + 0.75 * (value - 1);
                break;
            case 'sphere_scale_factor':
                this.model.sphere_scale_factor = Math.exp(value / 10);
                break;
            case 'use_fog':
            case 'fog_level':
                this.model.fog_level = this.getFromView('use_fog') ? (this.getFromView('fog_level') / 10) : 0;
                break;
            case 'show_labels':
            case 'label_size':
                this.model.label_scale_factor =
                    this.getFromView('show_labels') ? Math.exp(this.getFromView('label_size') / 10) : 0;
                break;
            case 'arrowhead_placement':
                this.model.arrowhead_placement = value / 20;
                break;
        }
    }
    // field update callbacks from Model — convert to slider values and push to View directly
    update(field /*: string */, value /*: any */) {
        switch (field) {
            case 'zoom_level':
                this.view.update('zoom_level', 10 * Math.log(value));
                break;
            case 'line_width':
                this.view.update('line_width', 1 + (value - 1) / 0.75);
                break;
            case 'sphere_scale_factor':
                this.view.update('sphere_scale_factor', 10 * Math.log(value));
                break;
            case 'fog_level':
                this.view.update('use_fog', value != 0);
                if (value != 0) {
                    this.view.update('fog_level', 10 * value);
                }
                break;
            case 'label_scale_factor':
                this.view.update('show_labels', value != 0);
                if (value != 0) {
                    this.view.update('label_size', 10 * Math.log(value));
                }
                break;
            case 'arrowhead_placement':
                this.view.update('arrowhead_placement', 20 * value);
                break;
        }
    }
    // Button data-action strings are eval'd here so `this` resolves to the ViewModel,
    // giving them access to `this.model` for writing request fields directly.
    executeCommand(command /*: string */) {
        eval(command);
    }
}
// View has html to display values on sliders, field events from input elements
class View {
    rootElement; /*: HTMLElement */
    viewModel; /*: ViewModel */ // set by ViewModel.setView
    constructor(rootElement /*: HTMLElement */) {
        this.rootElement = rootElement;
        this.addHTML();
        this.rootElement.addEventListener('input', (ev) => this.handleInputEvent(ev));
        this.rootElement.addEventListener('click', (ev) => this.handleButtonEvent(ev));
    }
    addHTML() {
        this.rootElement.innerHTML =
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
                <button style="width: 20ch" data-action="this.model.showingAxes = !this.model.showingAxes"
                   >Show/hide axes</button>
                <button style="width: 20ch" data-action="this.model.snap_to_axis_request = true"
                   >Snap to axis</button>
             </details>
          </div>`;
    }
    getDisplayElement(field /*: string */) {
        const displayElement = this.rootElement.querySelector(`[data-bind="${field}"]`);
        if (displayElement == null) {
            Log.err('');
        }
        return displayElement;
    }
    getFieldValue(field /*: string */) {
        let result;
        const displayElement = this.getDisplayElement(field);
        if (displayElement instanceof HTMLInputElement) {
            if (displayElement.type.toLowerCase() == 'range') {
                result = displayElement.value;
            }
            else if (displayElement.type.toLowerCase() == 'checkbox') {
                result = displayElement.checked;
            }
        }
        return result;
    }
    update(field /*: string */, value /*: any */) {
        const displayElement = this.getDisplayElement(field);
        if (displayElement instanceof HTMLInputElement) {
            if (displayElement.type.toLowerCase() == 'range') {
                displayElement.value = value;
            }
            else if (displayElement.type.toLowerCase() == 'checkbox') {
                displayElement.checked = value;
            }
        }
    }
    // generic input event handler, forwards to ViewModel
    handleInputEvent(inputEvent /*: InputEvent */) {
        const field = inputEvent.target.getAttribute('data-bind');
        if (field != null) {
            inputEvent.stopPropagation();
            this.viewModel.updateModel(field, this.getFieldValue(field));
        }
    }
    handleButtonEvent(clickEvent /*: MouseEvent */) {
        const action = clickEvent.target.closest('[data-action]')?.getAttribute('data-action');
        if (action != null) {
            clickEvent.stopPropagation();
            this.viewModel.executeCommand(action);
        }
    }
}
//# sourceMappingURL=CayleyViewControl.js.map
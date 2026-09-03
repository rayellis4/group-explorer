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
import * as Log from './Log.js';
// create ViewModel and View, wire to the CayleyDiagramModel proxy
export function addControl(cayleyViewControlElement, cayleyDiagramModel) {
    const viewModel = new ViewModel(cayleyDiagramModel);
    viewModel.view = new View(cayleyViewControlElement, viewModel);
}
// ViewModel converts CayleyDiagramModel properties <=> View slider values
class ViewModel {
    _model;
    _view;
    static modelFields = [
        'zoom_level',
        'line_width',
        'sphere_scale_factor',
        'fog_level',
        'label_scale_factor',
        'arrowhead_placement',
    ];
    constructor(model) {
        this.model = model;
    }
    get model() {
        return this._model;
    }
    set model(model) {
        this._model = model;
        ViewModel.modelFields.forEach((field) => model.$subscribe(this, field));
    }
    get view() {
        return this._view;
    }
    set view(view) {
        this._view = view;
        ViewModel.modelFields.forEach((field) => this.update(field, this.model[field]));
    }
    // field update callbacks from Model — convert to slider values and push to View directly
    update(field, value) {
        if (this.view == null)
            return;
        switch (field) {
            case 'zoom_level':
                this.view.zoom_level = 10 * Math.log(value);
                break;
            case 'line_width':
                this.view.line_width = 1 + (value - 1) / 0.75;
                break;
            case 'sphere_scale_factor':
                this.view.sphere_scale_factor = 10 * Math.log(value);
                break;
            case 'fog_level':
                this.view.use_fog = value != 0;
                if (this.view.use_fog) {
                    this.view.fog_level = 10 * value;
                }
                break;
            case 'label_scale_factor':
                this.view.show_labels = value != 0;
                if (this.view.show_labels) {
                    this.view.label_size = 10 * Math.log(value);
                }
                break;
            case 'arrowhead_placement':
                this.view.arrowhead_placement = 20 * value;
                break;
        }
    }
    // handles input events from View, updates Model
    updateModel(field) {
        switch (field) {
            case 'zoom_level':
                this.model.zoom_level = Math.exp(this.view.zoom_level / 10);
                break;
            case 'line_width':
                this.model.line_width = 1 + 0.75 * (this.view.line_width - 1);
                break;
            case 'sphere_scale_factor':
                this.model.sphere_scale_factor = Math.exp(this.view.sphere_scale_factor / 10);
                break;
            case 'use_fog':
            case 'fog_level':
                this.model.fog_level = this.view.use_fog ? (this.view.fog_level / 10) : 0;
                break;
            case 'show_labels':
            case 'label_size':
                this.model.label_scale_factor = this.view.show_labels ? Math.exp(this.view.label_size / 10) : 0;
                break;
            case 'arrowhead_placement':
                this.model.arrowhead_placement = (this.view.arrowhead_placement) / 20;
                break;
        }
    }
    // Button data-action strings are eval'd here so `this` resolves to the ViewModel,
    // giving them access to `this.model` for writing request fields directly.
    executeCommand(command) {
        eval(command);
    }
}
// View has html to display values on sliders, field events from input elements
class View {
    rootElement;
    viewModel;
    constructor(rootElement, viewModel) {
        this.rootElement = rootElement;
        this.viewModel = viewModel;
        this.rootElement.innerHTML = View.getViewHTML();
        this.rootElement.addEventListener('input', (ev) => this.handleInputEvent(ev));
        this.rootElement.addEventListener('click', (ev) => this.handleButtonEvent(ev));
    }
    get zoom_level() { return this.getField('zoom_level'); }
    set zoom_level(zoom_level) { this.updateField('zoom_level', zoom_level); }
    get line_width() { return this.getField('line_width'); }
    set line_width(line_width) { this.updateField('line_width', line_width); }
    get sphere_scale_factor() { return this.getField('sphere_scale_factor'); }
    set sphere_scale_factor(sphere_scale_factor) { this.updateField('sphere_scale_factor', sphere_scale_factor); }
    get use_fog() { return this.getField('use_fog'); }
    set use_fog(use_fog) { this.updateField('use_fog', use_fog); }
    get fog_level() { return this.getField('fog_level'); }
    set fog_level(fog_level) { this.updateField('fog_level', fog_level); }
    get show_labels() { return this.getField('show_labels'); }
    set show_labels(show_labels) { this.updateField('show_labels', show_labels); }
    get label_size() { return this.getField('label_size'); }
    set label_size(label_size) { this.updateField('label_size', label_size); }
    get arrowhead_placement() { return this.getField('arrowhead_placement'); }
    set arrowhead_placement(arrowhead_placement) { this.updateField('arrowhead_placement', arrowhead_placement); }
    getDisplayElement(field) {
        const displayElement = this.rootElement.querySelector(`[data-bind="${field}"]`);
        if (displayElement == null) {
            Log.warn(`unable to find element with data binding = ${field}`);
        }
        return displayElement;
    }
    getField(field) {
        let result;
        const displayElement = this.getDisplayElement(field);
        if (displayElement instanceof HTMLInputElement) {
            if (displayElement.type.toLowerCase() == 'range') {
                result = displayElement.valueAsNumber;
            }
            else if (displayElement.type.toLowerCase() == 'checkbox') {
                result = displayElement.checked;
            }
        }
        return result;
    }
    updateField(field, value) {
        const displayElement = this.getDisplayElement(field);
        if (displayElement instanceof HTMLInputElement) {
            if (displayElement.type.toLowerCase() == 'range') {
                displayElement.valueAsNumber = value;
            }
            else if (displayElement.type.toLowerCase() == 'checkbox') {
                displayElement.checked = value;
            }
        }
    }
    // generic input event handler, forwards to ViewModel
    handleInputEvent(inputEvent) {
        const field = inputEvent.target?.getAttribute('data-bind');
        if (field != null) {
            inputEvent.stopPropagation();
            this.viewModel.updateModel(field);
        }
    }
    handleButtonEvent(clickEvent) {
        const action = clickEvent.target?.closest('[data-action]')?.getAttribute('data-action');
        if (action != null) {
            clickEvent.stopPropagation();
            this.viewModel.executeCommand(action);
        }
    }
    static getViewHTML() {
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
          </div>`;
    }
}
//# sourceMappingURL=CayleyViewControl.js.map
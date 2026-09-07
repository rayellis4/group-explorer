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
import * as Log from './Log.js';
import { layoutSymmetryObject } from './SymmetryObjectView.js';
import { makeMockSelect } from './UIComponents.js';
export function addControl(symmetryObjectControlElement, symmetryObjectModel) {
    const viewModel = new ViewModel(symmetryObjectModel);
    viewModel.view = new View(symmetryObjectControlElement, viewModel);
}
class ViewModel {
    _model;
    _view;
    static modelFields = [
        'zoom_level',
        'line_width',
        'sphere_scale_factor',
        'fog_level',
    ];
    constructor(model) {
        this.model = model;
    }
    get group() {
        return this.model.group;
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
        const initialDiagramName = this.initialDiagramName();
        this.update('diagram_select', initialDiagramName);
        this.updateModel('diagram_select');
    }
    initialDiagramName() {
        let diagramName;
        // get diagram name from
        const urlDiagramName = new URL(window.location.href).searchParams.get('diagram');
        // unless it is empty
        if (urlDiagramName == undefined) {
            diagramName = this.group.symmetryObjects[0].name;
        }
        else {
            // or it does not match one of the symmetryObjects
            if (!this.group.symmetryObjects.some((symmetryObject) => symmetryObject.name == urlDiagramName)) {
                // Name is passed but there is no matching symmetryObject -- alert user and continue
                Log.warn(`The group ${this.group.shortName} has no symmetry object named ${urlDiagramName}. ` +
                    `Using ${this.group.symmetryObjects[0].name} instead.`);
                diagramName = this.group.symmetryObjects[0].name;
            }
            else {
                diagramName = urlDiagramName;
            }
        }
        return diagramName;
    }
    // field update callbacks from Model — convert to slider values and push to View directly
    update(field, value) {
        if (this.view == null)
            return;
        switch (field) {
            case 'diagram_select':
                this.view.diagram_select = value;
                break;
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
                if (this.view.use_fog)
                    this.view.fog_level = 10 * value;
                break;
        }
    }
    // handles input events from View, updates Model
    updateModel(field) {
        switch (field) {
            case 'diagram_select':
                this.model.layout = // override CayleyDiagramModel type to avoid having to create a SymmetryObjectModel
                    layoutSymmetryObject(this.model.group, this.view.diagram_select);
                break;
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
        }
    }
    // Button data-action strings are eval'd here so `this` resolves to the ViewModel,
    // giving them access to `this.model` for writing request fields directly.
    executeCommand(command) {
        eval(command);
    }
}
class View {
    rootElement;
    viewModel;
    constructor(rootElement, viewModel) {
        this.rootElement = rootElement;
        this.viewModel = viewModel;
        rootElement.innerHTML = View.getHTML();
        this.rootElement.addEventListener('input', (ev) => this.handleInputEvent(ev));
        this.rootElement.addEventListener('click', (ev) => this.handleClickEvent(ev));
    }
    get diagram_select() { return this.getField('diagram_select'); }
    set diagram_select(symmetryObject) {
        const organizationSelectElement = this.getDisplayElement('diagram_select');
        organizationSelectElement.setAttribute('data-value', symmetryObject);
        organizationSelectElement.innerHTML = symmetryObject;
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
    getDisplayElement(field) {
        const displayElement = this.rootElement.querySelector(`[data-bind="${field}"]`);
        if (displayElement == null) {
            Log.warn(`SymmetryObjectControl.View.getDisplayElement: search for unknown data binding ${field}`);
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
        else if (displayElement instanceof HTMLDivElement) { // .mock-select
            result = displayElement.getAttribute('data-value'); // just has string, not index
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
        else if (field == 'diagram_select') {
            const symmetryObjectIndex = this.viewModel.group.symmetryObjects
                .findIndex((symmetryObject) => symmetryObject.name == value);
            displayElement.setAttribute('data-index', symmetryObjectIndex.toString());
            displayElement.innerHTML = value;
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
    // handle click event --
    handleClickEvent(clickEvent) {
        const action = clickEvent.target.closest('[data-action]')?.getAttribute('data-action');
        if (action == null) {
            const maybeMockSelect = clickEvent.target.closest('.mock-select');
            if (maybeMockSelect != null) {
                const diagramChoices = this.viewModel.group.symmetryObjects.map((symmetryObject) => { return { value: symmetryObject.name }; });
                makeMockSelect(maybeMockSelect, diagramChoices)
                    .then((_choice) => this.viewModel.updateModel('diagram_select'), () => { });
            }
        }
        else {
            clickEvent.stopPropagation();
            this.viewModel.executeCommand(action);
        }
    }
    static getHTML() {
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
          </div>`;
    }
}
//# sourceMappingURL=SymmetryObjectControl.js.map
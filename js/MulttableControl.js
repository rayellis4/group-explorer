import * as Log from './Log.js';
import { makeMockSelect } from './UIComponents.js';
export function addControl(multtableControlElement, modelProxy) {
    const viewModel = new ViewModel(modelProxy);
    viewModel.view = new View(multtableControlElement, viewModel);
}
class ViewModel {
    _model;
    _view;
    static modelFields = [
        'organizingSubgroup',
        'separation',
        'coloration',
        'colorReordering'
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
    }
    // field update callbacks from Model — convert to slider values and push to View directly
    update(field, value) {
        if (this.view == null)
            return;
        switch (field) {
            case 'organizingSubgroup':
                this.view.subgroupIndex = value ?? 0;
                break;
            case 'coloration':
                this.view.coloration = value;
                break;
            case 'colorReordering':
                this.view.colorReordering = value;
                break;
            case 'separation':
                this.view.separation = 100 * value;
                break;
        }
    }
    // handles input events from View, updates Model
    updateModel(field) {
        switch (field) {
            case 'subgroupIndex':
                this.model.organizingSubgroup = this.view.subgroupIndex;
                break;
            case 'coloration':
                this.model.coloration = this.view.coloration;
                break;
            case 'colorReordering':
                this.model.colorReordering = this.view.colorReordering;
                break;
            case 'separation':
                this.model.separation = this.view.separation / 100;
                break;
        }
    }
}
class View {
    viewModel;
    rootElement;
    constructor(rootElement, viewModel) {
        this.viewModel = viewModel;
        this.rootElement = rootElement;
        rootElement.innerHTML = View.getHTML(rootElement);
        rootElement.querySelector('#organization-select')
            .addEventListener('click', (ev) => this.handleClickEvent(ev));
        rootElement.addEventListener('input', (ev) => this.handleInputEvent(ev));
    }
    get subgroupIndex() {
        return parseInt(this.getFieldValue('subgroupIndex'));
    }
    set subgroupIndex(subgroupIndex) {
        const organizationSelectElement = this.getDisplayElements('subgroupIndex')[0];
        organizationSelectElement.setAttribute('data-value', subgroupIndex.toString());
        organizationSelectElement.innerHTML = this.formatSubgroupChoice(subgroupIndex);
    }
    get separation() {
        return parseInt(this.getFieldValue('separation'));
    }
    set separation(separation) {
        this.rootElement.querySelector('#separation-slider')
            .setAttribute('value', separation.toString());
    }
    get coloration() {
        return this.getFieldValue('coloration');
    }
    set coloration(coloration) {
        this.rootElement.querySelectorAll('input[name="coloration"]')
            .forEach((radioButton) => radioButton.checked = false);
        this.rootElement.querySelector(`[value="${coloration}"]`)
            .checked = true;
    }
    get colorReordering() {
        return this.getFieldValue('colorReordering');
    }
    set colorReordering(colorReordering) {
        this.rootElement.querySelectorAll('[name="color-order"]')
            .forEach((radioButton) => radioButton.checked = false);
        this.rootElement.querySelector(`[value="${colorReordering}"]`)
            .checked = true;
    }
    formatSubgroupChoice(subgroupIndex) {
        const subgroup = this.viewModel.group.subgroups[subgroupIndex];
        return (subgroupIndex === 0)
            ? 'none'
            : `<span style="color: ${subgroup.isNormal ? 'blue' : 'black'}"><i>H</i><sub>${subgroupIndex}</sub>,
               a subgroup of order ${subgroup.order}</span>`;
    }
    getDisplayElements(field) {
        const displayElements = Array.from(this.rootElement.querySelectorAll(`[data-bind="${field}"]`));
        if (displayElements.length == 0) {
            Log.warn(`unable to find element with data binding = ${field}`);
        }
        return displayElements;
    }
    getFieldValue(field) {
        let result = null;
        const displayElements = this.getDisplayElements(field);
        const displayElement = displayElements[0];
        if (displayElement != null) {
            if (displayElement instanceof HTMLInputElement) {
                if (displayElement.type.toLowerCase() == 'range') {
                    result = displayElement.value;
                }
                else if (displayElement.type.toLowerCase() == 'radio') {
                    result = displayElements.find((radio) => radio.checked).value;
                }
            }
            else if (displayElement instanceof HTMLDivElement) { // .mock-select
                result = displayElement.getAttribute("data-value");
            }
        }
        return result;
    }
    handleClickEvent(clickEvent) {
        const target = clickEvent.target;
        const choices = this.viewModel.group.subgroups
            .slice(0, -1) // include all but last subgroup, the whole group
            .map((_subgroup, index) => { return { value: `${index}`, label: this.formatSubgroupChoice(index) }; });
        makeMockSelect(target, choices)
            .then((_choice) => this.viewModel.updateModel('subgroupIndex'), () => { });
    }
    handleInputEvent(inputEvent) {
        const field = inputEvent.target?.getAttribute('data-bind');
        if (field != null) {
            inputEvent.stopPropagation();
            this.viewModel.updateModel(field);
        }
    }
    static getHTML(rootElement) {
        const rootId = rootElement.getAttribute('id');
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
          </div>`;
    }
}
//# sourceMappingURL=MulttableControl.js.map
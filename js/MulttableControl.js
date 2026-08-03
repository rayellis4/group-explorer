/*

# MulttableControl

Display input elements that configure the MulttableView:
 * organize multtable by subgroup
 * separate cosets and adjust gutter
 * set default element coloration
 * set element coloration when elements are re-organized (e.g., on column drag)

```javascript
 */
import { makeMockSelect } from './UIComponents.js';
export function addControl(multtableControlElement, modelProxy) {
    const viewModel = new ViewModel(modelProxy);
    new View(viewModel, multtableControlElement);
}
class ViewModel /*: implements Updatable */ {
    #model;
    #view;
    #modelFields = [
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
    get view() {
        return this.#view;
    }
    set view(view) {
        this.#view = view;
        this.#modelFields.forEach((field) => this.update(field, this.model[field]));
    }
    get model() {
        return this.#model;
    }
    set model(multtableModel) {
        this.#model = multtableModel;
        this.#modelFields.forEach((field) => {
            multtableModel.$subscribe(this, field);
            this.update(field, this.model[field]);
        });
    }
    update(field, value) {
        if (this.view == null) {
            return;
        }
        switch (field) {
            case 'organizingSubgroup':
                this.view['subgroupIndex'] = value ?? 0;
                break;
            case 'coloration':
                this.view[field] = value;
                break;
            case 'colorReordering':
                this.view[field] = value;
                break;
            case 'separation':
                this.view[field] = 100 * value;
                break;
        }
    }
    updateFromView(field, value) {
        switch (field) {
            case 'subgroupIndex':
                this.model['organizingSubgroup'] = parseInt(value);
                break;
            case 'coloration':
                this.model[field] = value;
                break;
            case 'colorReordering':
                this.model[field] = value;
                break;
            case 'separation':
                this.model[field] = value / 100;
                break;
        }
    }
}
class View {
    viewModel;
    rootElement;
    constructor(viewModel, rootElement) {
        this.viewModel = viewModel;
        this.rootElement = rootElement;
        rootElement.innerHTML = View.getViewHTML(rootElement.getAttribute('id'));
        rootElement.querySelector('#organization-select')
            .addEventListener('click', (clickEvent) => this.displayOrganizationChoices(clickEvent.target));
        rootElement.addEventListener('change', (changeEvent) => this.handleChangeEvent(changeEvent));
    }
    displayOrganizationChoices(target) {
        const choices = this.viewModel.group.subgroups.slice(0, -1)
            .map((_subgroup, index) => { return { value: `${index}`, label: this.formatSubgroupChoice(index) }; });
        makeMockSelect(target, choices)
            .then((choice) => this.updateViewModel('subgroupIndex', choice), () => { });
    }
    formatSubgroupChoice(subgroupIndex) {
        const subgroup = this.viewModel.group.subgroups[subgroupIndex];
        return (subgroupIndex === 0)
            ? 'none'
            : `<span style="color: ${subgroup.isNormal ? 'blue' : 'black'}"><i>H</i><sub>${subgroupIndex}</sub>,
               a subgroup of order ${subgroup.order}</span>`;
    }
    handleChangeEvent(changeEvent) {
        const inputElement = changeEvent.target;
        if (inputElement != null) {
            const field = inputElement.getAttribute('data-bind');
            const value = inputElement.value;
            this.updateViewModel(field, value);
        }
    }
    updateViewModel(field, value) {
        this.viewModel.updateFromView(field, value);
    }
    set subgroupIndex(subgroupIndex) {
        const organizationSelectElement = this.rootElement.querySelector('#organization-select');
        organizationSelectElement.setAttribute('data-index', subgroupIndex.toString());
        organizationSelectElement.innerHTML = this.formatSubgroupChoice(subgroupIndex);
    }
    set separation(separation) {
        this.rootElement.querySelector('#separation-slider')
            .setAttribute('value', separation.toString());
    }
    set coloration(coloration) {
        this.rootElement.querySelectorAll('[name="coloration"]')
            .forEach((radioButton) => radioButton.setAttribute('checked', false.toString()));
        this.rootElement.querySelector(`[value="${coloration}"]`)
            .setAttribute('checked', true.toString());
    }
    set colorReordering(colorReordering) {
        this.rootElement.querySelectorAll('[name="color-order"]')
            .forEach((radioButton) => radioButton.setAttribute('checked', false.toString()));
        this.rootElement.querySelector(`[value="${colorReordering}"]`)
            .setAttribute('checked', true.toString());
    }
    static getViewHTML(rootId) {
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
          </div>`;
    }
}
//# sourceMappingURL=MulttableControl.js.map
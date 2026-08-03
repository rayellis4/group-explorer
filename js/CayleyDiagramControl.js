/* @flow

# CayleyDiagramControl

This module implements the Cayley diagram control panel. It consists of:

- **ViewModel** — owns diagram layout parameters (`diagramName`, `strategyParameters`,
  `arrowGenerators`, `rightMultiply`, `chunkSubgroupIndex`); calls `layoutCayleyDiagram` and
  writes the result to `model.layout` on any change; absorbs `#refineStrategies` validation.
  Registered as `model.diagramControl` for serialization.
- **View** — five UI sections (`DiagramChoice`, `Generator`, `Arrow`, `Multiplication`, `Chunking`)
  that read state from the ViewModel and call ViewModel action methods.

```javascript
 */
import { BitSet } from './BitSet.js';
import { DIRECTION_INDEX, AXIS_NAME, layoutCayleyDiagram, nextArrowColor, getDefaultStrategies } from './CayleyDiagramGenerator.js';
import * as Log from './Log.js';
import { makeDetachedMenu, makeMockSelect } from './UIComponents.js';
export { addControl };
/*::
import type {Layout, Direction, StrategyParameters} from './CayleyDiagramGenerator.js';
import type {NodeData, ArrowData, ChunkData} from './CayleyDiagramView.js';
import type {Tree} from './GEUtils.js';
import type {Group} from './Group.js'
import type {CayleyDiagramModel} from './CayleyDiagramModel.js'
import XMLGroup from './XMLGroup.js';
import type {XMLCayleyDiagram} from './XMLGroup.js';
interface NumberLocation {clientX: number, clientY: number}

import type {StrategyParameters, ArrowGenerator} from './CayleyDiagramGenerator.js'
 */
// layout choices (linear/circular/rotated), direction (X/Y/Z)
const AXIS_LABELS /*: {[layout: string]: {[direction: string]: html}} */ = {
    linear: { X: 'Linear in <i>x</i>',
        Y: 'Linear in <i>y</i>',
        Z: 'Linear in <i>z</i>' },
    circular: { YZ: 'Circular in <i>y</i>, <i>z</i>',
        XZ: 'Circular in <i>x</i>, <i>z</i>',
        XY: 'Circular in <i>x</i>, <i>y</i>' },
    rotated: { YZ: 'Rotated in <i>y</i>, <i>z</i>',
        XZ: 'Rotated in <i>x</i>, <i>z</i>',
        XY: 'Rotated in <i>x</i>, <i>y</i>' },
};
const AXIS_IMAGES /*: {[layout: string]: {[direction: string]: string}} */ = {
    linear: { X: 'axis-x.png', Y: 'axis-y.png', Z: 'axis-z.png' },
    circular: { YZ: 'axis-yz.png', XZ: 'axis-xz.png', XY: 'axis-xy.png' },
    rotated: { YZ: 'axis-ryz.png', XZ: 'axis-rxz.png', XY: 'axis-rxy.png' },
};
// nesting order labels
const ORDER_LABELS /*: Array<Array<string>> */ = [
    [],
    ['N/A'],
    ['inside', 'outside'],
    ['innermost', 'middle', 'outermost'],
    ['innermost', 'second innermost', 'second outermost', 'outermost'],
    ['innermost', 'second innermost', 'middle', 'second outermost', 'outermost'],
    ['innermost', 'second innermost', 'third innermost', 'third outermost', 'second outermost', 'outermost'],
    ['innermost', 'second innermost', 'third innermost', 'middle', 'third outermost', 'second outermost',
        'outermost'],
    ['innermost', 'second innermost', 'third innermost', 'fourth innermost', 'fourth outermost', 'third outermost',
        'second outermost', 'outermost'],
    ['innermost', 'second innermost', 'third innermost', 'fourth innermost', 'middle', 'fourth outermost',
        'third outermost', 'second outermost', 'outermost'],
];
function addControl(cayleyDiagramControlElement /*: HTMLElement */, model /*: CayleyDiagramModel */) {
    const viewModel = new ViewModel(cayleyDiagramControlElement, model);
    new DiagramChoice(viewModel);
    new Generator(viewModel);
    new Arrow(viewModel);
    new Multiplication(viewModel);
    new Chunking(viewModel);
    model.diagramControl = viewModel;
}
function clickHandler(event /*: MouseEvent */) {
    event.preventDefault();
    const action = event.target.closest('[data-action]');
    if (action != null) {
        event.stopPropagation();
        eval(action.getAttribute('data-action'));
    }
}
class ViewModel {
    #model;
    rootElement; /*: HTMLElement */
    handlers /*: Updatable */ = [];
    diagramName /*: string */ = null; // null => generate diagram
    strategyParameters /*: Array<StrategyParameters> */ = [];
    arrowGenerators /*: ?Array<ArrowGenerator> */ = null; // null => use default arrows
    rightMultiply /*: boolean */ = true;
    chunkSubgroupIndex /*: numeber */ = null; // null => no chunking
    constructor(rootElement /*: HTMLElement */, model /*: CayleyDiagramModel */) {
        this.#model = model;
        this.rootElement = rootElement;
        // get diagram name from sheet editor JSON or URL
        if (model.diagramControl?.strategy_parameters != null) {
            this.strategyParameters = model.diagramControl.strategy_parameters;
            this.arrowGenerators = model.diagramControl.arrow_generators;
        }
        else if (model.diagramControl?.diagram_name != null) {
            this.diagramName = model.diagramControl.diagram_name;
        }
        else {
            this.diagramName = new URL(window.location.href).searchParams.get('diagram');
        }
        if (this.diagramName != null
            && this.group.cayleyDiagrams.findIndex((cayleyDiagram) => cayleyDiagram.name == this.diagramName) < 0) {
            Log.warn(`unknown diagram name in ${window.location.href}`);
            this.diagramName = null;
        }
        if (!window.location.href.includes('SheetEditor')) { // don't overwrite info from Sheet
            this.updateLayout();
        }
    }
    registerForUpdates(handler /*: Updatable */) {
        this.handlers.push(handler);
    }
    updateLayout() {
        if (this.diagramName == null) {
            if (this.strategyParameters.length == 0) { // default layout
                this.strategyParameters = getDefaultStrategies(this.group);
                this.rightMultiply = true;
                this.model.layout = layoutCayleyDiagram(this.group, this.strategyParameters);
                const arrowGeneratorMap = new Map();
                this.model.layout.arrows.forEach((arrow) => {
                    arrowGeneratorMap.set(arrow.generator, { generator: arrow.generator, color: arrow.color });
                });
                this.arrowGenerators = Array.from(arrowGeneratorMap.values());
            }
            else { // user-specified strategy
                this.model.layout = layoutCayleyDiagram(this.group, this.strategyParameters, this.arrowGenerators, this.rightMultiply, this.chunkSubgroupIndex);
            }
        }
        else { // user-specified diagram
            this.model.layout = layoutCayleyDiagram(this.group, this.diagramName, this.arrowGenerators, this.rightMultiply);
            if (this.arrowGenerators == null) {
                const arrowGeneratorMap = new Map();
                this.model.layout.arrows.forEach((arrow) => {
                    arrowGeneratorMap.set(arrow.generator, { generator: arrow.generator, color: arrow.color });
                });
                this.arrowGenerators = Array.from(arrowGeneratorMap.values());
            }
        }
        this.handlers.forEach((handler) => handler.update());
    }
    toJSON() {
        const json = {
            diagram_name: this.diagramName,
            strategy_parameters: this.strategyParameters,
            arrow_generators: this.arrowGenerators,
            right_multiply: this.rightMultiply,
            chunk_subgroup_index: this.chunkSubgroupIndex
        };
        return json;
    }
    fromJSON(jsonObject /*: CayleyDiagramControlJSON */) {
        this.diagramName = jsonObject.diagram_name;
        this.strategyParameters = jsonObject.strategy_parameters;
        this.arrowGenerators = jsonObject.arrow_generators;
        this.rightMultiply = jsonObject.right_multiply;
        this.chunkSubgroupIndex = jsonObject.chunk_subgroup_index;
        this.updateLayout();
        return this;
    }
    get group() {
        return this.#model.group;
    }
    get model() {
        return this.#model;
    }
    // State accessors for View
    get generatesFromStrategy() {
        return this.diagramName == null;
    }
    get chunkingIsPossible() {
        return this.generatesFromStrategy
            && this.strategyParameters.every((strategy, level) => strategy.nestingLevel == level);
    }
    getChunkingChoices() {
        const strategyParameters = this.strategyParameters;
        let choices = [];
        if (strategyParameters[0].nestingLevel == 0
            || strategyParameters[strategyParameters.length - 1].nestingLevel == strategyParameters.length - 1) {
            for (let inx = 0; inx < strategyParameters.length; inx++) {
                const strategy = strategyParameters[inx];
                if (strategy.nestingLevel != inx) {
                    break;
                }
                choices.push(strategy);
            }
            if (choices.length != strategyParameters.length) {
                let goodTailStart = strategyParameters.length;
                for (let inx = strategyParameters.length - 1; inx > 0; inx--) {
                    goodTailStart = inx;
                    if (strategyParameters[inx].nestingLevel != inx) {
                        break;
                    }
                }
                for (let inx = goodTailStart; inx < strategyParameters.length; inx++) {
                    choices.push(strategyParameters[inx]);
                }
            }
        }
        const allGenerators = [];
        const newChoices = choices.map((strategy) => {
            allGenerators.push(strategy.generator);
            return { subgroupIndex: this.#findSubgroupIndex(allGenerators), allGenerators: [...allGenerators] };
        });
        return newChoices; // Array<{subgroupIndex: number, allGenerators: Array<groupElement>}>
    }
    #findSubgroupIndex(elementArray /*: Array<groupElements> */) {
        const elements = new BitSet(this.group.order, elementArray);
        for (const [index, subgroup] of this.group.subgroups.entries()) {
            if (BitSet.intersection(subgroup.members, elements).equals(elements)) {
                return index;
            }
        }
    }
    // Actions called by View
    chooseDiagram(choice /*: string */) {
        this.diagramName = (choice === 'Generate diagram') ? null : choice;
        this.strategyParameters.length = 0;
        this.arrowGenerators = null;
        this.updateLayout();
    }
    updateStrategies(strategies /*: Array<StrategyParameters> */) {
        this.strategyParameters = this.#refineStrategies(strategies);
        this.updateLayout();
    }
    updateGenerator(strategyIndex /*: number */, generator /*: number */) {
        const strategyParameters = this.strategyParameters;
        strategyParameters[strategyIndex].generator = generator;
        this.strategyParameters = this.#refineStrategies(strategyParameters);
        // this.arrowGenerators with this.strategyParameters
        const arrowGenerators = new Set(this.arrowGenerators.map((arrowGenerator) => arrowGenerator.generator));
        const strategyGenerators = new Set(this.strategyParameters.map((strategyParameter) => strategyParameter.generator));
        arrowGenerators.forEach((arrowGenerator) => {
            if (!strategyGenerators.has(arrowGenerator)) {
                this.removeArrow(arrowGenerator);
            }
        });
        strategyGenerators.forEach((strategyGenerator) => {
            if (!arrowGenerators.has(strategyGenerator)) {
                this.addArrow(strategyGenerator);
            }
        });
        this.updateLayout();
    }
    organizeBy(subgroupIndex /*: number */) {
        this.group.subgroups[subgroupIndex].generators.toArray()
            .forEach((generator, inx) => {
            this.updateGenerator(inx, generator);
            this.updateOrder(inx, inx);
        });
    }
    updateAxes(strategyIndex /*: number */, layout /*: Layout */, direction /*: Direction */) {
        const strategyParameters = this.strategyParameters;
        strategyParameters[strategyIndex].layout = layout;
        strategyParameters[strategyIndex].direction = direction;
        this.updateStrategies(strategyParameters);
    }
    updateOrder(strategyIndex /*: number */, order /*: number */) {
        const strategyParameters = this.strategyParameters;
        const otherStrategy = strategyParameters.findIndex((strategy) => strategy.nestingLevel == order);
        strategyParameters[otherStrategy].nestingLevel = strategyParameters[strategyIndex].nestingLevel;
        strategyParameters[strategyIndex].nestingLevel = order;
        this.updateStrategies(strategyParameters);
    }
    addArrow(element /*: groupElement */) {
        this.arrowGenerators = this.arrowGenerators ?? [];
        const usedColors = this.arrowGenerators.map((arrowGenerator) => arrowGenerator.color);
        if (!this.arrowGenerators.map((arrowGenerator) => arrowGenerator.generator).includes(element)) {
            this.arrowGenerators.push({ generator: element, color: nextArrowColor(usedColors) });
            this.updateLayout();
        }
    }
    removeArrow(element /*: groupElement */) {
        const arrowIndex = this.arrowGenerators.findIndex((arrowGenerator) => arrowGenerator.generator == element);
        if (arrowIndex >= 0) {
            this.arrowGenerators.splice(arrowIndex, 1);
        }
        this.updateLayout();
    }
    setRightMultiply(rightMultiply /*: boolean */) {
        this.rightMultiply = rightMultiply;
        this.updateLayout();
    }
    setChunk(index /*: integer */) {
        this.chunkSubgroupIndex = index;
        this.updateLayout();
    }
    // Moved from Generator View class: validates and completes strategy params before feeding to generator
    #refineStrategies(newStrategies /*: Array<StrategyParameters> */) {
        const generatorsUsed = new BitSet(this.group.order);
        const elementsGenerated = new BitSet(this.group.order, [0]);
        const strategies /*: Array<StrategyParameters> */ = [];
        newStrategies.forEach((strategy) => {
            if (!elementsGenerated.isSet(strategy.generator)) {
                const previousElementCount = elementsGenerated.popcount();
                generatorsUsed.set(strategy.generator);
                elementsGenerated.setFrom(this.group.closure(generatorsUsed));
                const newElementCount = elementsGenerated.popcount();
                if (strategy.layout != 'linear' && newElementCount / previousElementCount < 3) {
                    strategy.layout = 'linear';
                    if (strategy.direction != 'X' && strategy.direction != 'Y' && strategy.direction != 'Z') {
                        strategy.direction = 'X';
                    }
                }
                strategies.push(strategy);
            }
        });
        strategies.slice().sort((a, b) => a.nestingLevel - b.nestingLevel).map((el, inx) => (el.nestingLevel = inx, el));
        if (elementsGenerated.popcount() != this.group.order) {
            const newGenerator = elementsGenerated.complement().toArray()
                .find((el) => this.group.closure(generatorsUsed.clone().set(el)).popcount() == this.group.order);
            const unusedDirections = new BitSet(3).setAll();
            strategies.forEach(({ layout, direction }) => {
                if (layout == 'linear') {
                    unusedDirections.clear(DIRECTION_INDEX[direction]);
                }
            });
            const unusedDirection = unusedDirections.first();
            const newDirection = (unusedDirection == undefined) ? AXIS_NAME[0] : AXIS_NAME[unusedDirection];
            strategies.push({ generator: newGenerator, layout: 'linear', direction: newDirection, nestingLevel: strategies.length });
        }
        return strategies;
    }
}
class View {
    viewModel;
    constructor(viewModel) {
        this.viewModel = viewModel;
        viewModel.registerForUpdates(this);
    }
    get group() {
        return this.viewModel.group;
    }
    update() {
        // subclass responsibility
    }
}
/*
```
### DiagramChoice

Displays the available Cayley Diagrams as well as the option to generate one.

```javascript
 */
class DiagramChoice extends View {
    constructor(viewModel) {
        super(viewModel);
        this.viewModel.rootElement.insertAdjacentHTML('beforeend', `<div>
             Choose diagram:
             <div id="diagram-select" class="mock-select" data-index=""></div>
          </div>`);
        this.diagramSelect.addEventListener('click', (_ev) => this.showDiagramChoices());
        this.update();
    }
    get choices() {
        return [
            { value: 'Generate diagram' },
            ...this.viewModel.group.cayleyDiagrams.map((diagram) => { return { value: diagram.name }; })
        ];
    }
    get currentChoice() {
        return (this.viewModel.generatesFromStrategy)
            ? 0
            : this.viewModel.group.cayleyDiagrams.findIndex(({ name }) => name === this.viewModel.diagramName) + 1;
    }
    get diagramSelect() {
        return document.getElementById('diagram-select');
    }
    showDiagramChoices() {
        makeMockSelect(this.diagramSelect, this.choices)
            .then((choice) => this.viewModel.chooseDiagram(choice), () => { });
    }
    update() {
        this.diagramSelect.setAttribute('data-index', this.viewModel.diagramName);
        const currentLabel = this.choices[this.currentChoice].label || this.choices[this.currentChoice].value;
        this.diagramSelect.innerHTML = currentLabel;
    }
}
/*
```
### Generator
```javascript
 */
class Generator extends View {
    constructor(viewModel) {
        super(viewModel);
        this.viewModel.rootElement.insertAdjacentHTML('beforeend', `<style>
              #generation-strategy {
                 border: var(--dark-border);
                 border-radius: var(--border-radius);
                 border-spacing: 0;
                 font-size: 1em;
                 width: 100%;
              }
              #generation-strategy th,
              #generation-strategy td {
                 padding: 0.1em 1ch;
              }
              #generation-table td + td {
                 background-color: var(--gray0);;
                 border-left: var(--light-border);
                 border-top: var(--light-border);
                 white-space: nowrap;
              }
              #generation-table tr {
                  height: 3em;
              }
              #generation-table img {
                  vertical-align: middle;
              }
          </style>

          <div id="generation-control">
             Generate diagram this way:
             <div>
                <table id="generation-strategy">
                   <thead>
                      <tr>
                         <th></th>
                         <th>Generator</th>
                         <th>Axis</th>
                         <th>Order</th>
                      </tr>
                   </thead>
                   <tbody id="generation-table">
                   </tbody>
                </table>
             </div>
          </div>`);
        ['pointerdown', 'pointerup'].forEach((eventType) => {
            this.generationControlElement.addEventListener(eventType, (ev) => ev.stopPropagation());
        });
        this.generationControlElement.addEventListener('click', clickHandler.bind(this));
        this.generationControlElement.addEventListener('contextmenu', clickHandler.bind(this));
        this.generationTableElement.addEventListener('dragstart', (ev) => this.dragStart(ev));
        this.generationTableElement.addEventListener('drop', (ev) => this.drop(ev));
        this.generationTableElement.addEventListener('dragover', (ev) => this.dragOver(ev));
        this.update();
    }
    get generationControlElement() {
        return document.getElementById('generation-control');
    }
    get generationTableElement() {
        return document.getElementById('generation-table');
    }
    /*
     * Draw Generator table
     */
    update() {
        // clear table
        Array.from(this.generationTableElement.children).forEach((el) => el.remove());
        // add a row for each strategy in Cayley diagram
        if (this.viewModel.generatesFromStrategy) {
            const strategyParameters = this.viewModel.strategyParameters;
            strategyParameters.forEach((strategyParameter, inx) => {
                const tableRow = `<tr>
                <td draggable="true">${inx + 1}</td>
                <td data-action="this.showGeneratorMenu(event, ${inx})">
                     ${this.viewModel.group.representation[strategyParameter.generator]}
                     </td>
                     <td data-action="this.showAxisMenu(event, ${inx})">
                     <img src="./images/${AXIS_IMAGES[strategyParameter.layout][strategyParameter.direction]}">
                     ${AXIS_LABELS[strategyParameter.layout][strategyParameter.direction]}
                     </td>
                     <td data-action="this.showOrderMenu(event, ${inx})">
                     ${ORDER_LABELS[strategyParameters.length][strategyParameter.nestingLevel]}
                     </td>
                     </tr>`;
                this.generationTableElement.insertAdjacentHTML('beforeend', tableRow);
            });
        }
        else {
            this.generationTableElement.innerHTML =
                '<tr><td></td><td style="width: 25%"></td><td style="width: 40%"></td><td></td></tr>';
        }
    }
    /*
     * Show option menus for the columns of the Generator table
     */
    showGeneratorMenu(clickLocation /*: NumberLocation */, strategyIndex /*: number */) {
        // find complement of closure of generators in previous strategyParameters
        // search through subgroups to find first subgroup such that members & generators == generators
        //
        // show only elements not generated by previously applied strategies
        let eligibleGenerators;
        if (strategyIndex == 0) {
            eligibleGenerators = this.group.elements.slice(1);
        }
        else {
            const currentGenerators = this.viewModel.strategyParameters
                .slice(0, strategyIndex) // start through strategyIndex
                .map((strategyParameters) => strategyParameters.generator);
            const currentGeneratorBitSet = new BitSet(this.group.order, currentGenerators);
            for (let inx = 0; inx < this.group.subgroups.length; inx++) {
                const subgroupMembers = this.group.subgroups[inx].members;
                if (BitSet.intersection(subgroupMembers, currentGeneratorBitSet).equals(currentGeneratorBitSet)) {
                    eligibleGenerators = subgroupMembers.clone().complement().toArray();
                    break;
                }
            }
        }
        // returns an HTML string with a list element for each arrow that can be added to the arrow-list
        const eligibleGeneratorList = eligibleGenerators
            .sort((a, b) => (this.group.representation[a] < this.group.representation[b]) ? -1 : 1)
            .map((generator) => `<li data-action="this.viewModel.updateGenerator(${strategyIndex}, ${generator})">
                      ${this.group.representation[generator]}
                   </li>`)
            .join('');
        const generatorMenu = `<ul>
             ${eligibleGeneratorList}
             <hr>
             <li class="detached-submenu">Organize by
                <ul>${this.makeOrganizeByMenu()}</ul>
             </li>
          </ul>`;
        makeDetachedMenu(generatorMenu, clickLocation)
            .then((action) => eval(action));
    }
    showAxisMenu(clickLocation /*: NumberLocation */, strategyIndex /*: number */) {
        // previously generated subgroup must have > 2 cosets in this subgroup
        //   in order to show it in a curved (circular or rotated) layout
        const strategies = this.viewModel.strategyParameters;
        const generators = strategies.slice(0, strategyIndex + 1).map((strategy) => strategy.generator);
        const currentSize = this.group.closure(new BitSet(this.group.order, generators)).popcount();
        const previousSize = (strategyIndex == 0)
            ? 1
            : this.group.closure(new BitSet(this.group.order, generators.slice(0, strategyIndex))).popcount();
        const curvable = (currentSize / previousSize) > 2;
        const axisMenu = [
            `<ul>
             <li data-action="this.viewModel.updateAxes(${strategyIndex}, 'linear', 'X')">${AXIS_LABELS['linear']['X']}</li>
             <li data-action="this.viewModel.updateAxes(${strategyIndex}, 'linear', 'Y')">${AXIS_LABELS['linear']['Y']}</li>
             <li data-action="this.viewModel.updateAxes(${strategyIndex}, 'linear', 'Z')">${AXIS_LABELS['linear']['Z']}</li>`,
            (curvable)
                ? `<li data-action="this.viewModel.updateAxes(${strategyIndex}, 'circular', 'XY')">${AXIS_LABELS['circular']['XY']}</li>
             <li data-action="this.viewModel.updateAxes(${strategyIndex}, 'circular', 'XZ')">${AXIS_LABELS['circular']['XZ']}</li>
             <li data-action="this.viewModel.updateAxes(${strategyIndex}, 'circular', 'YZ')">${AXIS_LABELS['circular']['YZ']}</li>
             <li data-action="this.viewModel.updateAxes(${strategyIndex}, 'rotated', 'XY')"> ${AXIS_LABELS['rotated']['XY']}</li>
             <li data-action="this.viewModel.updateAxes(${strategyIndex}, 'rotated', 'XZ')"> ${AXIS_LABELS['rotated']['XZ']}</li>
             <li data-action="this.viewModel.updateAxes(${strategyIndex}, 'rotated', 'YZ')"> ${AXIS_LABELS['rotated']['YZ']}</li>`
                : '',
            `   <hr>
             <li class="detached-submenu">Organize by
                <ul>${this.makeOrganizeByMenu()}</ul>
             </li>
          </ul>`
        ].join('');
        makeDetachedMenu(axisMenu, clickLocation)
            .then((action) => eval(action));
    }
    showOrderMenu(clickLocation /*: NumberLocation */, strategyIndex /*: number */) {
        const numStrategies = this.viewModel.strategyParameters.length;
        const orderList = this.viewModel.strategyParameters.map((_strategy, order) => `<li data-action="this.viewModel.updateOrder(${strategyIndex}, ${order})">${ORDER_LABELS[numStrategies][order]}</li>`);
        const orderMenuHTML = [
            `<ul id="generation-order-menu">`,
            orderList.join(''),
            `<hr>
            <li class="detached-submenu">Organize by
               <ul>${this.makeOrganizeByMenu()}</ul>
            </li>
          </ul>`
        ].join('');
        makeDetachedMenu(orderMenuHTML, clickLocation)
            .then((action) => eval(action));
    }
    makeOrganizeByMenu() {
        const organizeByMenu = this.group.subgroups.slice(1, -1) // only append non-trivial subgroups
            .map((subgroup, inx) => `<li data-action="this.viewModel.organizeBy(${inx + 1})">
                    <i>H</i><sub>${inx + 1}</sub>, a subgroup of order ${subgroup.order}
                 </li>`)
            .join('');
        return organizeByMenu;
    }
    /*
     * Drag-and-drop generation-table rows to re-order generators
     */
    dragStart(dragstartEvent /*: DragEvent */) {
        const target = dragstartEvent.target;
        const dataTransfer = dragstartEvent.dataTransfer;
        dataTransfer.setData('text/plain', target.textContent);
    }
    drop(dropEvent /*: DragEvent */) {
        dropEvent.preventDefault();
        const target = dropEvent.target;
        const dataTransfer = dropEvent.dataTransfer;
        const dest = parseInt(target.textContent);
        const src = parseInt(dataTransfer.getData('text/plain'));
        const strategyParameters = this.viewModel.strategyParameters;
        strategyParameters.splice(dest - 1, 0, strategyParameters.splice(src - 1, 1)[0]);
        this.viewModel.updateStrategies(strategyParameters);
    }
    dragOver(dragoverEvent /*: DragEvent */) {
        dragoverEvent.preventDefault();
    }
}
/*
```
### Arrow
```javascript
 */
class Arrow extends View {
    // actions:  show menu; select from menu; select from list; remove
    // utility function add_arrow_list_item(element) to add arrow to list (called from initialization, select from menu)
    // utility function clearArrowList() to remove all arrows from list (called during reset)
    constructor(viewModel) {
        super(viewModel);
        this.viewModel.rootElement.insertAdjacentHTML('beforeend', `<style>
              #arrow-list {
                 min-height: 5em;
                 background-color: white;
                 margin-block-start: 0;
                 margin-block-end: 0;
                 padding-inline-start: 0;
                 line-height: 1;
                 border: var(--dark-border);
                 border-radius: var(--border-radius);
              }
              #arrow-list hr {   /* Colored lines in arrow display */
                 display: inline-block;
                 width: 8ch;
                 margin-block-start: 1ex;
                 margin-block-end: 0.7ex;
                 margin-inline-start: 0.5ch;
                 margin-inline-end: 0.5ch;
              }
           </style>

           <div id="arrow-control" class="stack-03em">
              Show these arrows:
              <ul id="arrow-list" data-action="this.clearHighlights()"></ul>
              <div id="arrow-buttons" class="flex-h">
                 <button id="arrow-add-button" data-action="this.showAddArrowMenu(event)">Add</button>
                 <button id="arrow-remove-button" disabled="">Remove</button>
              </div>
           </div>`);
        this.arrowControlElement.addEventListener('click', clickHandler.bind(this));
        this.arrowControlElement.addEventListener('contextmenu', clickHandler.bind(this));
        this.update();
    }
    get arrowControlElement() {
        return document.getElementById('arrow-control');
    }
    get arrowListElement() {
        return document.getElementById('arrow-list');
    }
    get arrowAddButton() {
        return (document.getElementById('arrow-add-button') /*:: as any as HTMLButtonElement */);
    }
    get arrowRemoveButton() {
        return (document.getElementById('arrow-remove-button') /*:: as any as HTMLButtonElement */);
    }
    clearHighlights() {
        this.arrowListElement.querySelectorAll('li').forEach((el) => el.classList.remove('highlighted'));
    }
    selectArrow(element /*: number */) {
        this.clearHighlights();
        this.arrowListElement.querySelector(`li[data-arrow="${element}"]`)?.classList.add('highlighted');
        this.arrowRemoveButton.setAttribute('data-action', `this.removeArrow(${element})`);
        this.arrowRemoveButton.disabled = false;
    }
    // returns all arrows displayed in arrow-list as an array
    getAllArrows() {
        return Array
            .from(this.arrowListElement.querySelectorAll('li'))
            .map((listItem /*: HTMLLIElement */) => parseInt(listItem.getAttribute('arrow')));
    }
    showAddArrowMenu(event /*: MouseEvent */) {
        // make an array of HTML strings with a list element for each arrow that can be added to the arrow-list
        const group = this.viewModel.group;
        const arrowList = group.elements
            .filter((element) => element != 0 && this.arrowListElement.querySelector(`li[data-arrow="${element}"]`) == null)
            .sort((a, b) => (group.representation[a] < group.representation[b]) ? -1 : 1)
            .map((element) => `<li data-action="this.addArrow(${element})">${group.representation[element]}</li>`)
            .join('');
        const arrowMenu = `<ul id="arrow-menu" style="min-width: 10ch">${arrowList}</ul>`;
        makeDetachedMenu(arrowMenu, event)
            .then((action) => eval(action));
    }
    addArrow(element /*: number */) {
        this.viewModel.addArrow(element);
    }
    removeArrow(element /*: number */) {
        this.arrowRemoveButton.disabled = true;
        this.viewModel.removeArrow(element);
    }
    // clear arrows and redraw from ViewModel arrowGenerators
    update() {
        // clear arrow-list
        Array.from(this.arrowListElement.children).forEach((el) => el.remove());
        this.viewModel.arrowGenerators?.forEach(({ generator, color }) => {
            const listItem = `<li data-arrow="${generator}" data-color="${color}" data-action="this.selectArrow(${generator})">
                <hr style="border: 2px solid ${color}">${this.viewModel.group.representation[generator]}</li>`;
            this.arrowListElement.insertAdjacentHTML('beforeend', listItem);
        });
        // disable add button if there are no more generators that can be added
        this.arrowAddButton.disabled = (this.viewModel.arrowGenerators?.length == this.viewModel.group.order - 1);
    }
}
/*
```
### Multiplication
```javascript
 */
class Multiplication extends View {
    constructor(viewModel) {
        super(viewModel);
        this.viewModel.rootElement.insertAdjacentHTML('beforeend', `<div>
             Arrows mean:
             <div>
                <input id="right-multiplication" name="multiplication" type="radio" value="right" checked>
                <label for="right-multiplication">right multiplication</label>
             </div>
             <div>
                <input id="left-multiplication" name="multiplication" type="radio" value="left">
                <label for="left-multiplication">left multiplication</label>
             </div>
          </div>`);
        this.rightMultiplicationElement.addEventListener('click', () => this.setMult('right'));
        this.leftMultiplicationElement.addEventListener('click', () => this.setMult('left'));
        this.update();
    }
    get leftMultiplicationElement() {
        return (document.getElementById('left-multiplication') /*:: as any as HTMLInputElement */);
    }
    get rightMultiplicationElement() {
        return (document.getElementById('right-multiplication') /*:: as any as HTMLInputElement */);
    }
    setMult(rightOrLeft /*: string */) {
        this.viewModel.setRightMultiply(rightOrLeft == 'right');
    }
    update() {
        this.rightMultiplicationElement.checked = this.viewModel.rightMultiply;
        this.leftMultiplicationElement.checked = !this.viewModel.rightMultiply;
    }
}
/*
```
### Chunking
```javascript
 */
class Chunking extends View {
    constructor(viewModel) {
        super(viewModel);
        this.viewModel.rootElement.insertAdjacentHTML('beforeend', `<style>
              #chunking-fog {
                 position: absolute;
                 left: 0;
                 top: 0;
                 width: 100%;
                 height: 100%;
                 background: rgb(255, 255, 255, 0.5);
              }
          </style>

          <div class="position:relative">
             Chunk this subgroup:
             <div id="chunk-select" class="mock-select" data-index="0">(no chunking)</div>
             <div id="chunking-fog"></div>
          </div>`);
        this.chunkSelect.addEventListener('click', (_ev) => this.displayChunkingOptions());
        this.update();
    }
    get chunkSelect() {
        return document.getElementById('chunk-select');
    }
    get chunkingFog() {
        return document.getElementById('chunking-fog');
    }
    displayChunkingOptions() {
        const choices /*: Array<{value: string, label?: html}> */ = [
            { value: '0', label: '(no chunking)' }
        ];
        if (this.viewModel.chunkingIsPossible) {
            this.viewModel.getChunkingChoices()
                .forEach(({ subgroupIndex /*: number */, allGenerators /*: Array<groupElement> */ }) => {
                const allGeneratorsRepresentation = allGenerators.map((element) => this.group.representation[element]);
                const label = (subgroupIndex === this.group.subgroups.length - 1)
                    ? 'The whole group'
                    : `<i>H</i><sub>${subgroupIndex}</sub>, generated by { ${allGeneratorsRepresentation.join(', ')} }`;
                choices.push({ value: `${subgroupIndex}`, label: label });
            });
        }
        makeMockSelect(this.chunkSelect, choices)
            .then((choice) => this.viewModel.setChunk(choice === '0' ? null : parseInt(choice)), () => { });
    }
    // Only the null case needs handling here: makeMockSelect updates the display on user selection.
    // This fires when another View resets chunkSubgroupIndex to null (e.g. switching to a named
    // diagram or reordering strategies).
    update() {
        if (this.viewModel.chunkSubgroupIndex == null) {
            this.chunkSelect.setAttribute('data-index', '0');
            this.chunkSelect.innerHTML = '(no chunking)';
            this.chunkingFog.style.display = this.viewModel.chunkingIsPossible ? 'none' : 'block';
        }
    }
}
//# sourceMappingURL=CayleyDiagramControl.js.map
/* @flow

# CayleyDiagramControl

This component implements the cayley-diagram-control panel in the [CayleyDiagram](./CayleyDiagram.html.md) page.

The only exported quantity is the [`addControl`](#addcontrol) function, which adds the html for the panel to the
DOM and initializes its displayed values and their event handlers.

The panel is divided into five parts, each handled in a separate class:
 * [Choose diagram](#diagramchoice)
 * [Generate diagram in this way](#generator)
 * [Show these arrows](#arrow)
 * [Arrows mean](#multiplication)
 * [Chunk this subgroup](#chunking)

The only direct interaction among these classes us through the `updateAll` routine, invoked when the user
chooses a new diagram to display or selects a new generation scheme and much of the panel needs to be redrawn.

```javascript
 */
import {THREE} from '../lib/externals.js';

import BitSet from './BitSet.js';
import {DIRECTION_INDEX, AXIS_NAME} from './CayleyDiagramGenerator.js';
import {makeDetachedMenu, makeMockSelect} from './UIComponents.js'

export {addControl}

/*::
import type {Layout, Direction, StrategyParameters} from '../js/CayleyDiagramView.js';
*/
/*
```
#### Module variables

Set in [addControl](#addcontrol) and shared by all module classes
```javascript
 */
let cayleyDiagramControlElement
let cayleyDiagramGenerator
let group
let updateAll
/*
```
### addControl

```javascript
 */
function addControl (_cayleyDiagramControlElement, _cayleyDiagramGenerator) {
   cayleyDiagramControlElement = _cayleyDiagramControlElement
   cayleyDiagramGenerator = _cayleyDiagramGenerator
   group = cayleyDiagramGenerator.group

   new DiagramChoice()
   const generatorHandler = new Generator()
   const arrowHandler = new Arrow()
   const multiplicationHandler = new Multiplication()
   const chunkingHandler = new Chunking()

   updateAll = () => {
      generatorHandler.update()
      arrowHandler.update()
      multiplicationHandler.update()
      chunkingHandler.update()
   }

   updateAll()
}

function clickHandler (event /*: MouseEvent */) {
   event.preventDefault()
   const action = event.target.closest('[data-action]')
   if (action != null) {
      event.stopPropagation()
      if (action.parentElement.classList.contains('menu'))
         action.getRootNode().host.remove()
      eval(action.getAttribute('data-action'))
   }
}
/*
```
### DiagramChoice

Displays the available Cayley Diagrams as well as the option to generate one.

Note that when a new diagram is chosen many other options need to be changed, so it calls the module
routine `updateAll.`
```javascript
 */
class DiagramChoice {
   constructor () {
      cayleyDiagramControlElement.insertAdjacentHTML('beforeend',
         `<div>
             Choose diagram:
             <div id="diagram-select" class="mock-select"
                data-index="${this.currentChoice}">${this.choices[this.currentChoice]}</div>
          </div>`)
      this.diagramSelect.addEventListener('click', (_ev) => this.showDiagramChoices())
   }

   get diagramSelect () {
      return document.getElementById('diagram-select')
   }

   get currentChoice () {
      return (cayleyDiagramGenerator.generatesFromStrategy)
            ? 0
            : group.cayleyDiagrams.findIndex(({name}) => name === cayleyDiagramGenerator.diagramName) + 1
   }

   get choices () {
      return [
         'Generate diagram',
         ...group.cayleyDiagrams.map((diagram) => diagram.name)
      ]
   }

   showDiagramChoices () {
      makeMockSelect(this.diagramSelect, this.choices)
         .then(
            (choice) => {
               if (choice === 'Generate diagram') {
                  cayleyDiagramGenerator.strategyParameters = null
               } else {
                  cayleyDiagramGenerator.diagramName = choice
               }
               cayleyDiagramGenerator.draw()
               updateAll()
            },
            () => {}
         )
   }
}
/*
```
### Generator
```javascript
 */
class Generator {
/*::
   axis_label: {[key: Layout]: {[key: Direction]: string}};
   axis_image: {[key: Layout]: {[key: Direction]: string}};
   orders: Array<Array<string>>;
 */
   constructor () {
      cayleyDiagramControlElement.insertAdjacentHTML('beforeend',
         `<style>
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
          </div>`)

      // stopPropagation to keep ControlPanel from getting event and capturing the pointer
      ;['pointerdown', 'pointerup'].forEach((eventType) => {
         this.generationControlElement.addEventListener(eventType, (ev) => ev.stopPropagation())
      })
      this.generationControlElement.addEventListener('click', clickHandler.bind(this))
      this.generationControlElement.addEventListener('contextmenu', clickHandler.bind(this))
      this.generationTableElement.addEventListener('dragstart', this.dragStart.bind(this))
      this.generationTableElement.addEventListener('drop', this.drop.bind(this))
      this.generationTableElement.addEventListener('dragover', this.dragOver.bind(this))

      // layout choices (linear/circular/rotated), direction (X/Y/Z)
      this.AXIS_LABELS = {
         linear:   { X: 'Linear in <i>x</i>',
                     Y: 'Linear in <i>y</i>',
                     Z: 'Linear in <i>z</i>' },
         circular: { YZ: 'Circular in <i>y</i>, <i>z</i>',
                     XZ: 'Circular in <i>x</i>, <i>z</i>',
                     XY: 'Circular in <i>x</i>, <i>y</i>' },
         rotated:  { YZ: 'Rotated in <i>y</i>, <i>z</i>',
                     XZ: 'Rotated in <i>x</i>, <i>z</i>',
                     XY: 'Rotated in <i>x</i>, <i>y</i>' },
      };

      this.AXIS_IMAGES = {
         linear:   { X: 'axis-x.png', Y: 'axis-y.png', Z: 'axis-z.png' },
         circular: { YZ: 'axis-yz.png', XZ: 'axis-xz.png', XY: 'axis-xy.png'},
         rotated:  { YZ: 'axis-ryz.png', XZ: 'axis-rxz.png', XY: 'axis-rxy.png'},
      };

      // wording for nesting order
      this.ORDER_LABELS = [
         [],
         ['N/A'],
         ['inside', 'outside'],
         ['innermost', 'middle', 'outermost'],
         ['innermost', 'second innermost', 'second outermost', 'outermost'],
         ['innermost', 'second innermost', 'middle', 'second outermost', 'outermost'],
         ['innermost', 'second innermost', 'third innermost', 'third outermost', 'second outermost', 'outermost'],
         ['innermost', 'second innermost', 'third innermost', 'middle', 'third outermost', 'second outermost', 'outermost'],
         ['innermost', 'second innermost', 'third innermost', 'fourth innermost', 'fourth outermost', 'third outermost', 'second outermost', 'outermost'],
         ['innermost', 'second innermost', 'third innermost', 'fourth innermost', 'middle', 'fourth outermost', 'third outermost', 'second outermost', 'outermost'],
      ];
   }

   get generationControlElement () {
      return document.getElementById('generation-control')
   }

   get generationTableElement () {
      return document.getElementById('generation-table')
   }

   /*
    * Draw Generator table
    */
   update () {
      // clear table
      Array.from(this.generationTableElement.children).forEach((el) => el.remove())

      // add a row for each strategy in Cayley diagram
       if (cayleyDiagramGenerator.generatesFromStrategy) {
          const strategyParameters = cayleyDiagramGenerator.strategyParameters
          strategyParameters.forEach((strategyParameter, inx) => {
             const tableRow =
                `<tr>
                <td draggable="true">${inx+1}</td>
                <td data-action="this.showGeneratorMenu(event, ${inx})">
                     ${group.representation[strategyParameter.generator]}
                     </td>
                     <td data-action="this.showAxisMenu(event, ${inx})">
                     <img src="./images/${this.AXIS_IMAGES[strategyParameter.layout][strategyParameter.direction]}">
                     ${this.AXIS_LABELS[strategyParameter.layout][strategyParameter.direction]}
                     </td>
                     <td data-action="this.showOrderMenu(event, ${inx})">
                     ${this.ORDER_LABELS[strategyParameters.length][strategyParameter.nestingLevel]}
                     </td>
                     </tr>`
             this.generationTableElement.insertAdjacentHTML('beforeend', tableRow)
          })
       } else {
         this.generationTableElement.innerHTML =
            '<tr><td></td><td style="width: 25%"></td><td style="width: 40%"></td><td></td></tr>'
       }
   }

   /*
    * Show option menus for the columns of the Generator table
    */
   showGeneratorMenu (clickLocation /*: eventLocation */, strategyIndex /*: number */) {
      // show only elements not generated by previously applied strategies
      const eligibleGenerators = ( (strategyIndex == 0) ?
                                   new BitSet(group.order, [0]) :
                                   cayleyDiagramGenerator.strategies[strategyIndex - 1].elements.clone() )
            .complement().toArray();

      // returns an HTML string with a list element for each arrow that can be added to the arrow-list
      const eligibleGeneratorList =
         eligibleGenerators
            .sort((a,b) => (group.representation[a] < group.representation[b]) ? -1 : 1)
            .map((generator) =>
                  `<li data-action="this.updateGenerator(${strategyIndex}, ${generator})">
                      ${group.representation[generator]}
                   </li>`)
            .join('')

      const generatorMenu =
         `<ul>
             ${eligibleGeneratorList}
             <hr>
             <li class="detached-submenu">Organize by
                <ul>${this.makeOrganizeByMenu()}</ul>
             </li>
          </ul>`

      makeDetachedMenu(generatorMenu, clickLocation)
         .then( (action) => eval(action) )
   }

   showAxisMenu (clickLocation /*: eventLocation */, strategyIndex /*: number */) {
      // previously generated subgroup must have > 2 cosets in this subgroup
      //   in order to show it in a curved (circular or rotated) layout
      const curvable =
            (cayleyDiagramGenerator.strategies[strategyIndex].elements.popcount()
               /  ((strategyIndex == 0) ? 1 : cayleyDiagramGenerator.strategies[strategyIndex - 1].elements.popcount())) > 2

      const axisMenu = [
         `<ul>
             <li data-action="this.updateAxes(${strategyIndex}, 'linear', 'X')">${this.AXIS_LABELS['linear']['X']}</li> 
             <li data-action="this.updateAxes(${strategyIndex}, 'linear', 'Y')">${this.AXIS_LABELS['linear']['Y']}</li> 
             <li data-action="this.updateAxes(${strategyIndex}, 'linear', 'Z')">${this.AXIS_LABELS['linear']['Z']}</li>`,
         (curvable)
          ? `<li data-action="this.updateAxes(${strategyIndex}, 'circular', 'XY')">${this.AXIS_LABELS['circular']['XY']}</li>
             <li data-action="this.updateAxes(${strategyIndex}, 'circular', 'XZ')">${this.AXIS_LABELS['circular']['XZ']}</li>
             <li data-action="this.updateAxes(${strategyIndex}, 'circular', 'YZ')">${this.AXIS_LABELS['circular']['YZ']}</li>
             <li data-action="this.updateAxes(${strategyIndex}, 'rotated', 'XY')">${this.AXIS_LABELS['rotated']['XY']}</li>  
             <li data-action="this.updateAxes(${strategyIndex}, 'rotated', 'XZ')">${this.AXIS_LABELS['rotated']['XZ']}</li>  
             <li data-action="this.updateAxes(${strategyIndex}, 'rotated', 'YZ')">${this.AXIS_LABELS['rotated']['YZ']}</li>`
          : '',
         `   <hr>
             <li class="detached-submenu">Organize by
                <ul>${this.makeOrganizeByMenu()}</ul>
             </li>
          </ul>`
      ].join('')

      
      makeDetachedMenu(axisMenu, clickLocation)
         .then( (action) => eval(action) )
   }

   showOrderMenu (clickLocation /*: eventLocation */, strategyIndex /*: number */) {
      const numStrategies = cayleyDiagramGenerator.strategies.length
      
      const orderList = cayleyDiagramGenerator.strategies.map((_strategy, order) =>
         `<li data-action="this.updateOrder(${strategyIndex}, ${order})"
             >${this.ORDER_LABELS[numStrategies][order]}</li>`)

      const orderMenuHTML = [
         `<ul id="generation-order-menu">`,
            orderList.join(''),
           `<hr>
            <li class="detached-submenu">Organize by
               <ul>${this.makeOrganizeByMenu()}</ul>
            </li>
          </ul>`
      ].join('')

      makeDetachedMenu(orderMenuHTML, clickLocation)
         .then( (action) => eval(action) )
   }

   makeOrganizeByMenu () {
      const organizeByMenu =
         group.subgroups.slice(1, -1)  // only append non-trivial subgroups
            .map((subgroup, inx) =>
                `<li data-action="this.organizeBy(${inx + 1})">
                    <i>H</i><sub>${inx + 1}</sub>, a subgroup of order ${subgroup.order}
                 </li>`)
            .join('')
      return organizeByMenu
   }

   updateStrategies (newStrategies /*: Array<StrategyParameters> */) {
      const strategies = this.refineStrategies(newStrategies)
      cayleyDiagramGenerator.strategyParameters = strategies
      cayleyDiagramGenerator.draw()
      updateAll()
   }

   refineStrategies (newStrategies /*: Array<StrategyParameters> */) {
      const generatorsUsed = new BitSet(group.order)
      const elementsGenerated = new BitSet(group.order, [0])
      const strategies = []
      
      newStrategies.forEach((strategy) => {
         // don't include new strategies if they don't generate new elements
         if (!elementsGenerated.isSet(strategy.generator)) {
            const previousElementCount = elementsGenerated.popcount()
            generatorsUsed.set(strategy.generator)
            elementsGenerated.setFrom(group.closure(generatorsUsed))
            const newElementCount = elementsGenerated.popcount()

            // check whether we can use a curved display
            if (strategy.layout != 'linear' && newElementCount / previousElementCount < 3) {
               strategy.layout = 'linear'
               if (strategy.direction != 'X' && strategy.direction != 'Y' && strategy.direction != 'Z') {
                  strategy.direction = 'X'
               }
            }

            strategies.push(strategy)
         }
      })

      // fix nesting order
      strategies.slice().sort((a, b) => a.nestingLevel - b.nestingLevel).map((el, inx) => (el.nestingLevel = inx, el))

      // add elements to generate entire group; append to nesting
      if (elementsGenerated.popcount() != group.order) {
         // look for new element -- we know one exists
         const newGenerator = elementsGenerated.complement().toArray()
            .find((el) => group.closure(generatorsUsed.clone().set(el)).popcount() == group.order)

         // among linear layouts, try to find a direction that hasn't been used yet
         const unusedDirections = new BitSet(3).setAll()
         strategies.forEach(({layout, direction}) => {
            if (layout == 'linear') {
               unusedDirections.clear(DIRECTION_INDEX[direction])
            }
         })

         const unusedDirection = unusedDirections.first()
         const newDirection = (unusedDirection == undefined) ? AXIS_NAME[0] : AXIS_NAME[unusedDirection]
         strategies.push({ generator: newGenerator, layout: 'linear', direction: newDirection, nestingLevel: strategies.length })
      }

      return strategies;
   }

   /*
    * Perform actions directed by option menus
    */
   organizeBy (subgroupIndex /*: number */) {
      // get subgroup generators
      const subgroupGenerators = group.subgroups[subgroupIndex].generators.toArray();

      // add subgroup generator(s) to start of strategies
      for (let g = 0; g < subgroupGenerators.length; g++) {
         this.updateGenerator(g, subgroupGenerators[g]);
         this.updateOrder(g, g);
      }
   }

   updateGenerator (strategyIndex /*: number */, generator /*: number */) {
      const strategyParameters = ((cayleyDiagramGenerator.strategyParameters /*: any */) /*: Array<StrategyParameters> */);
      strategyParameters[strategyIndex].generator = generator;
      this.updateStrategies(strategyParameters);
   }

   updateAxes (strategyIndex /*: number */, layout /*: Layout */, direction /*: Direction */) {
      const strategyParameters = ((cayleyDiagramGenerator.strategyParameters /*: any */) /*: Array<StrategyParameters> */);
      strategyParameters[strategyIndex].layout = layout;
      strategyParameters[strategyIndex].direction = direction;
      this.updateStrategies(strategyParameters);
   }

   updateOrder (strategyIndex /*: number */, order /*: number */) {
      const strategyParameters = ((cayleyDiagramGenerator.strategyParameters /*: any */) /*: Array<StrategyParameters> */);
      const otherStrategy = strategyParameters.findIndex( (strategy) => strategy.nestingLevel == order );
      strategyParameters[otherStrategy].nestingLevel = strategyParameters[strategyIndex].nestingLevel;
      strategyParameters[strategyIndex].nestingLevel = order;
      this.updateStrategies(strategyParameters);
   }

   /*
    * Drag-and-drop generation-table rows to re-order generators
    */
   dragStart (dragstartEvent /*: DragEvent */) {
      const target = ((dragstartEvent.target /*: any */) /*: HTMLElement */);
      const dataTransfer = ((dragstartEvent.dataTransfer /*: any */) /*: DataTransfer */);
      dataTransfer.setData('text/plain', target.textContent);
   }

   drop (dropEvent /*: DragEvent */) {
      dropEvent.preventDefault();
      const target = ((dropEvent.target /*: any */) /*: HTMLElement */);
      const dataTransfer = ((dropEvent.dataTransfer /*: any */) /*: DataTransfer */);
      const dest = parseInt(target.textContent);
      const src = parseInt(dataTransfer.getData('text/plain'));
      const strategyParameters = ((cayleyDiagramGenerator.strategyParameters /*: any */) /*: Array<StrategyParameters> */);
      strategyParameters.splice(dest-1, 0, strategyParameters.splice(src-1, 1)[0]);
      this.updateStrategies(strategyParameters);
   }

   dragOver (dragoverEvent /*: DragEvent */) {
         dragoverEvent.preventDefault();
   }
}
/*
```
### Arrow
```javascript
 */
class Arrow {
// actions:  show menu; select from menu; select from list; remove
// utility function add_arrow_list_item(element) to add arrow to list (called from initialization, select from menu)
// utility function clearArrowList() to remove all arrows from list (called during reset)
   constructor () {
      cayleyDiagramControlElement.insertAdjacentHTML('beforeend',
         `<style>
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
                 <button id="arrow-add-button" data-action="this.showArrowMenu(event)">Add</button>
                 <button id="arrow-remove-button" disabled="">Remove</button>
              </div>
           </div>`)

      this.arrowControlElement.addEventListener('click', clickHandler.bind(this))
      this.arrowControlElement.addEventListener('contextmenu', clickHandler.bind(this))
   }

   get arrowControlElement () {
      return document.getElementById('arrow-control')
   }

   get arrowListElement () {
      return  document.getElementById('arrow-list')
   }

   get arrowAddButton () {
      return document.getElementById('arrow-add-button')
   }

   get arrowRemoveButton () {
      return document.getElementById('arrow-remove-button')
   }   

   clearHighlights () {
      this.arrowListElement.querySelectorAll('li').forEach((el) => el.classList.remove('highlighted'))
   }

   // Row selected in arrow-list:
   //   clear all highlights
   //   highlight row (find arrow-list item w/ arrow = ${element})
   //   enable remove button
   selectArrow (element /*: number */) {
      this.clearHighlights()
      this.arrowListElement.querySelector(`li[data-arrow="${element}"]`).classList.add('highlighted')
      this.arrowRemoveButton.setAttribute('data-action', `this.removeArrow(${element})`)
      this.arrowRemoveButton.disabled = false
   }

   // returns all arrows displayed in arrow-list as an array
   getAllArrows () /*: Array<groupElement> */ {
      return Array
         .from(this.arrowListElement.querySelectorAll('li'))
         .map((listItem /*: HTMLLIElement */) => parseInt(listItem.getAttribute('arrow')))
   }

   // Add button clicked:
   //   Clear (hidden) menu
   //   Populate menu (for each element not in arrow-list)
   //   Position, expose menu
   showArrowMenu (event /*: MouseEvent */) {
      // make an array of HTML strings with a list element for each arrow that can be added to the arrow-list
      const arrowList = group.elements
         .filter((element) => element != 0 && this.arrowListElement.querySelector(`li[data-arrow="${element}"]`) == null)
         .sort((a, b) => (group.representation[a] < group.representation[b]) ? -1 : 1)
         .map((element) => `<li data-action="this.addArrow(${element})">${group.representation[element]}</li>`)

      const arrowMenu = `<ul id="arrow-menu" style="min-width: 10ch">${arrowList.join('')}</ul>`

      makeDetachedMenu(arrowMenu, event)
         .then((action) => eval(action))
   }

   // Add button menu element clicked:
   //   Hide menu
   //   Add lines to Cayley_diagram
   //   Update lines, arrowheads in graphic, arrow-list
   addArrow (element /*: number */) {
      cayleyDiagramGenerator.addArrow(element)
      this.update()
   }

   // Remove button clicked
   //   Remove highlighted row from arrow-list
   //   Disable remove button
   //   Remove line from Cayley_diagram
   //   Update lines in graphic, arrow-list
   removeArrow (element /*: number */) {
      this.arrowRemoveButton.disabled = true
      cayleyDiagramGenerator.removeArrow(element)
      this.update()
   }

   // clear arrows
   // set line colors in Cayley_diagram
   // update lines, arrowheads in CD
   // add rows to arrow list from line colors
   update () {
      const arrows = Array.from(this.arrowListElement.children)
      arrows.forEach((el) => el.remove())
      // ES6 introduces a Set, but does not provide any way to change the notion of equality among set members
      // Here we work around that by joining a generator value from the line.arrow attribute ("27") and a color ("#99FFC1")
      //   into a unique string ("27#99FFC1") in the Set, then partitioning the string back into an element and a color part
      const arrowHashes = new Set(cayleyDiagramGenerator.arrows.map(
          (arrow) => '' + arrow.generator.toString() + '#' + (new THREE.Color(arrow.color).getHexString())
      ))
      arrowHashes.forEach( (hash) => {
         const element = hash.slice(0,-7)
         const color = hash.slice(-7)
         const listItem = `<li data-arrow="${element}" data-color="${color}" data-action="this.selectArrow(${element})">
                              <hr style="border: 2px solid ${color}">${group.representation[element]}</li>`
         this.arrowListElement.insertAdjacentHTML('beforeend', listItem)
      } );
      if (arrowHashes.size == group.order - 1) {  // can't make an arrow out of the identity
         this.disable()
      } else {
         this.enable()
      }
   }

   // disable Add button
   enable () {
      this.arrowAddButton.disabled = false
   }

   // enable Add button
   disable () {
      this.arrowAddButton.disabled = true
   }
}
/*
```
### Multiplication
```javascript
 */
class Multiplication {
   constructor () {
      cayleyDiagramControlElement.insertAdjacentHTML('beforeend',
         `<div>
             Arrows mean:
             <div>
                <input id="right-multiplication" name="multiplication" type="radio" value="right" checked>
                <label for="right-multiplication">right multiplication</label>
             </div>
             <div>
                <input id="left-multiplication" name="multiplication" type="radio" value="left">
                <label for="left-multiplication">left multiplication</label>
             </div>
          </div>`)

      this.rightMultiplicationElement.addEventListener('click', () => this.setMult('right'))
      this.leftMultiplicationElement.addEventListener('click', () => this.setMult('left'))
   }

   get leftMultiplicationElement () {
      return document.getElementById('left-multiplication')
   }

   get rightMultiplicationElement () {
      return document.getElementById('right-multiplication')
   }
   
   setMult (rightOrLeft /*: string */) {
      cayleyDiagramGenerator.rightMultiply = (rightOrLeft == 'right')
   }

   update () {
      this.rightMultiplicationElement.checked = 'true'
      this.setMult('right')
   }
}
/*
```
### Chunking
```javascript
 */
class Chunking {
   constructor () {
      cayleyDiagramControlElement.insertAdjacentHTML('beforeend',
         `<style>
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
          </div>`)

      this.chunkSelect.addEventListener('click', (_ev) =>  this.displayChunkingOptions())
   }

   get chunkSelect () {
      return document.getElementById('chunk-select')
   }
   
   get chunkingFog () {
      return document.getElementById('chunking-fog')
   }

   // check that first generator is innermost, second is middle, etc.
   get chunkingIsPossible () {
      const strategies = cayleyDiagramGenerator.strategies
      return cayleyDiagramGenerator.generatesFromStrategy
          && (  strategies[0].nesting_level == 0
              || strategies[strategies.length - 1].nesting_level == strategies.length - 1)
   }

   displayChunkingOptions () {
      const choices = [
         [0, '(no chunking)']
      ]

      if (this.chunkingIsPossible) {
          const strategies = cayleyDiagramGenerator.strategies
          const chunkingChoices = cayleyDiagramGenerator.getChunkingChoices()
          
          chunkingChoices.forEach((chunkingChoice) => {
              const subgroupIndex = group.subgroups.findIndex((H) => H.members.equals(chunkingChoice.elements))
              const strategyIndex = strategies.findIndex((strategy) => strategy == chunkingChoice)
              const accumulatedGenerators = strategies.slice(0, strategyIndex + 1)
                  .map((strategy) => group.representation[strategy.generator])
              const label = (subgroupIndex === group.subgroups.length - 1)
                ? 'The whole group'
                : `<i>H</i><sub>${subgroupIndex}</sub>, generated by { ${accumulatedGenerators.join(', ')} }`
              choices.push([subgroupIndex, label])
          })
      }

      makeMockSelect(this.chunkSelect, choices)
         .then(
            (choice) => cayleyDiagramGenerator.chunk = choice,
            () => {}
         )
   }

   update () {
      cayleyDiagramGenerator.chunk = 0
      this.chunkSelect.setAttribute('data-index', 0)
      this.chunkSelect.innerHTML = '(no chunking)'
      this.chunkingFog.style.display = this.chunkingIsPossible ? 'none' : 'block'
   }
}

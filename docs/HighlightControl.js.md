// @flow

import {BitSet} from './BitSet.js';
import * as GEUtils from './GEUtils.js'
import * as SheetEditor from './SheetEditor.js'
import {SubgroupLattice} from './SubgroupLattice.js';
import {makeFixedMenu, makeDetachedMenu, makeDialog} from './UIComponents.js'
import {THREE} from '../lib/externals.js'
import {TrackballControls} from '../lib/externals.js'
/*::
import {Group} from './Group.js'
import type {BitSetJSON} from './BitSet.js'

export interface Highlightable {
   getAllHighlighters(): Array<Highlighter>,
   group: Group,
   highlightControl: ?HighlightControlJSON,
   highlightColors: Array<Array<color>>,
   clearHighlights(): void,
   toJSON(): {highlightControl?: HighlightControlJSON, ...}
}
export type Highlighter = {
   (Array<color>): void,
   label?: string,
   ...
}

export opaque type HighlightControlJSON = {
   displayList: Array<{...SubsetJSON} | {...PartitionSubsetJSON}>,
   highlights: Array<Array<integer>>,
   partitionList: Array<{...AbstractPartitionJSON} | {...CosetsJSON}>
}
type AbstractSubsetJSON = {
   id: number,
   elements: BitSetJSON,
   name: string  // implemented in subclass
}
type SubsetJSON = {
   ...AbstractSubsetJSON,
   subsetIndex: number
}
type PartitionSubsetJSON = {
   ...AbstractSubsetJSON,
   elementRepresentations: Array<string>,
   subIndex: number
}
type AbstractPartitionJSON = {
   subsetIds: Array<integer>
}
type CosetsJSON = {
   ...AbstractPartitionJSON,
   subgroopId: integer,
   side: 'left' | 'right'
}
*/

let rootElement /*: HTMLElement */
let group /*: Group */
let nextSubsetIndex /*: number*/
let nextId /*: number */
let view
const displayList /*: Array<Subgroop | Subset | PartitionSubset> */ = []
const highlighters /*: Array<Highlighter> */ = []
const highlights /*: Array<Array<number>> */ = []    // Array<Array<displayListIndexes>>

export function addControl (highlightControlElement /*: HTMLElement */, visualizer /*: Highlightable */) {
   // set module variables
   rootElement = highlightControlElement
   view = visualizer
   group = view.group
   highlighters.push(...view.getAllHighlighters())
   highlights.push(...highlighters.map(() => ([] /*: Array<number> */)))
   displayList.splice(0)
   nextSubsetIndex = 0;
   nextId = 0;

   // Display all subgroups
   const subgroupListHTML = group.subgroups.map((_h, inx) => new Subgroop(inx).displayLine).join('')

   const highlightControlHTML =
      `<style>
          #subset-page {
              -webkit-user-select: none;
              -webkit-tap-highlight-color: transparent;
              background-color: white;
              white-space: nowrap;
              touch-action: pan-y;
              min-width: 100%;
              font-size: 1em;
          }
          #subset-page li:not(:has(> ul)):hover,
          #subset-page li:has(> ul.hidden):hover {
              background-color: unset;
          }
          #subset-page .menu-label {
             font-size: 1.25em;
             margin-bottom: 0.2em;
             display: inline-block;
          }
          #subset-page .placeholder:after {
             font-style: italic;
             content: "(None)";
          }
          #subset-page ul {
             padding-inline-start: 0.5em;
             display: flex;
             flex-direction: column;
             margin-top: 0;
          }
          #subset-page ul > li {
             flex: 1 1 1.5em;  /* make li at least 1.5em, about the height of a superscript */
          }
          #subset-page .menu-label:hover,
          #subset-page .placeholder:hover,
          #subset-page li:hover > details > summary {
             background-color: #FFB886;   /* orange-tan (~light salmon) */
          }
          #subset-page li > details > *:not(summary) {
             white-space: normal;
             padding-left: 1.5em;
          }
          #subset-page .normal-group {
             color: blue;
          }
          #subset-page .highlight-mark summary {
             background-color: yellow;
          }
       </style>
       <div id="subset-page" class="box stack-08em fill-v scrollable">
          <details open id="subgroups">
          <summary><span class="menu-label" data-action2="showHeaderMenu(event)">Subgroups</span></summary>
             <ul>
                ${subgroupListHTML}
             </ul>
          </details>

          <details open id="subsets">
          <summary><span class="menu-label" data-action2="showHeaderMenu(event)">User-defined subsets</span></summary>
             <ul>
                <li class="placeholder" data-action="showHeaderMenu(event)" data-action2="showHeaderMenu(event)"></li>
             </ul>
          </details>

          <details open id="partitions">
             <summary><span class="menu-label" data-action2="showHeaderMenu(event)">Partitions</span></summary>
             <ul>
                <li class="placeholder" data-action="showHeaderMenu(event)" data-action2="showHeaderMenu(event)"></li>
             </ul>
          </details>
       </div>`
   highlightControlElement.insertAdjacentHTML('beforeend', highlightControlHTML)

   // $FlowExpectedError[incompatible-type] -- getElementById not null, we just added that element
   makeFixedMenu(document.getElementById('subset-page'), (action, event) => eval(action))

   if (view.highlightControl != null || view.highlightColors != null) {
      initializeHighlights()

      // Set up change broadcast
      SheetEditor.enableChangeBroadcast(() => {
         const viewJSON = view.toJSON()  // FixMe: should be CayleyDiagramGenerator.toJSON for Cayley diagram...
         viewJSON.highlightControl = toJSON()
         return viewJSON
      })

      // Do we really need to do this?? I don't think so...
      SheetEditor.broadcastChange()
   }

   // create twisty details on the fly
   const generateDetail = (event /*: Event */) => {
      const targetElement = event.target
      if (targetElement.querySelector('div') == null) {
         const subgroop = displayList[parseInt(targetElement.getAttribute('subgroup'))]
         targetElement.insertAdjacentHTML('beforeend', subgroop.getInfo())
         targetElement.removeEventListener('toggle', generateDetail)
      }
   }
   Array.from(document.getElementsByTagName('details')).forEach((element) => {
      if (element.hasAttribute('subgroup')) {
         element.addEventListener('toggle', generateDetail)
      }
   })

   updateHighlightMark()
}

// Set up global data, assuming group layout is in place
function initializeHighlights () {
   const highlightControlJSON = view.highlightControl
   if (highlightControlJSON != null) {
      // Add Subsets to displayList
      highlightControlJSON.displayList
         .filter((displayItem) => 'subsetIndex' in displayItem)
         .forEach((displayItem) => {
            nextId = displayItem.id
            nextSubsetIndex = displayItem.subsetIndex
            new Subset(new BitSet().fromJSON(displayItem.elements))
         })

      // Create Partitions and add PartitionSubsets to displayList
      const partitionSubsetsJSON = highlightControlJSON.displayList
         .filter((displayItem) => 'subIndex' in displayItem)
      highlightControlJSON.partitionList
         .forEach((partitionJSON) => {
            const firstChildIndex = partitionSubsetsJSON.findIndex((child) => partitionJSON.subsetIds[0] == child.id)
            if (firstChildIndex != -1) {
               const firstChild = partitionSubsetsJSON[firstChildIndex]
               nextId = firstChild.id
               if (firstChild.name.includes('CC')) {
                  new ConjugacyClasses()
               } else if (firstChild.name.includes('OC')) {
                  new OrderClasses()
               } else if ('subgroopId' in partitionJSON) {  // must be Cosets, the only remaining partition option
                  const subgroop = displayList[partitionJSON.subgroopId]
                  if (subgroop instanceof Subgroop) {
                     new Cosets(subgroop, partitionJSON.side)
                  }
               }
            }
         })

      // Reset global counters
      nextSubsetIndex = Math.max(...displayList.filter(Boolean).map((el) => el instanceof Subset ? el.subsetIndex : -1)) + 1
      nextId = Math.max(...displayList.filter(Boolean).map((el) => el.id)) + 1

      // Update highlights
      highlightControlJSON.highlights.forEach((highlight, inx) => highlightItem(highlight, inx))
   } else if (view.highlightColors?.[0]?.length) {
      const backgroundHighlights = view.highlightColors[0].filter(Boolean)
      if (backgroundHighlights.length == 0) {  // no highlights?
         highlightItem([], 0)
      } else {
         const highlightColor = backgroundHighlights[0]
         if (backgroundHighlights.every((color) => color == highlightColor)) {  // only one color?
            // make set of colored elements and highlight matching subset
            const coloredElements = new BitSet(group.order)
            view.highlightColors[0].forEach((color, inx) => {
               if (color == highlightColor) {
                  coloredElements.set(inx)
               }
            })
            const highlightedSubset = displayList.find((displayItem) => displayItem.elements.equals(coloredElements))
            if (highlightedSubset != null) {
               highlightItem([highlightedSubset.id], 0, [highlightColor])
            }
            updateHighlightMark()
         }
      }
   }
}

// break recursive structure in displayList to be serializable as JSON
// remove first |group| entries from displayList (recalc from group properties)
function toJSON () /*: HighlightControlJSON */ {
   const displayedItems = displayList
      .filter((displayItem) => !(displayItem instanceof Subgroop))  // leave Subsets, PartitionSubsets
      .map((displayItem) => {
         let result
         if (displayItem instanceof PartitionSubset) {
            result = {
               id: displayItem.id,
               elements: displayItem.elements.toJSON(),
               name: displayItem.name,
               elementRepresentations: displayItem.elementRepresentations,
               subIndex: displayItem.subIndex
            }
         } else {
            result = {
               id: displayItem.id,
               elements: displayItem.elements.toJSON(),
               name: displayItem.name,
               subsetIndex: displayItem.subsetIndex
            }
         }
         return result
      })
   const partitionList = displayList
      .filter((displayItem) => displayItem instanceof PartitionSubset)
      .reduce((partitions /*: Array<AbstractPartition> */, displayedItem) => {
         if (displayedItem instanceof PartitionSubset && !partitions.includes(displayedItem.parent)) {
            partitions.push(displayedItem.parent)
         }
         return partitions
      }, [])
      .map((partition) => {
         let result
         if (partition instanceof Cosets) {
            result = {
               subsetIds: partition.subsets.map((partitionSubset) => partitionSubset.id),
               subgroopId: partition.subgroop.id,
               side: partition.side
             }
         } else {
            result = {
               subsetIds: partition.subsets.map((partitionSubset) => partitionSubset.id)
            }
         }            
         return result
      })

   const json = {highlights: highlights, displayList: displayedItems, partitionList: partitionList}

   return json
}

function updateHighlightMark () {
   // clear current highlight markings
   document.querySelectorAll('#subset-page .highlight-mark')
      .forEach((element) => element.classList.remove('highlight-mark'))

   if (highlights[0].length == 1) {
      (document.getElementById(`${highlights[0][0]}`) /*:: as any as Element */).classList.add('highlight-mark')
   }
}
/*
 * AbstractSubset --
 *   Direct superclass of Subgroop, Subset, and Partition
 *   Assigns an id to every element displayed in the subsetDisplay,
 *     and adds it to displayList
 *   Implements set operations unions, intersection, and elementwise product
 *
 *   Subclasses must implement name, elements, displayLine, and menu properties
 *     name - subset name for display (e.g., "H₂" or "S₃")
 *     elements - elements of subset (as bitset)
 *     displayLine - line for this subset in display (e.g., "H₁ = < f > is a subgroup of order 2.")
 *     menu - context menu brought up by this element in display
 *
 *   (AbstractSubset would be an abstract superclass in another language.)
 */
class AbstractSubset {
/*::
   id: number;
   elements: BitSet;
  +name: string;  // implemented in subclass
  +menu: html;  // implemented in subclass
  +displayLine: string; // implemented in subclass
 */
   constructor () {
      this.id = getNextId();
      displayList[this.id] = (this /*:: as any as Subgroop | Subset | PartitionSubset */)
      window.setTimeout(() => updateHighlightMark(), 0)  // update highlights after any subset is created
   }

   get closure () /*: void */ {
      const subsetElements = group.closure(this.elements)

      const explanation =
         `It is the closure of ${this.name}, ⟨ ${this.name} ⟩. This means that it
         is the smallest subgroup of ${group.name} which contains ${this.name}.`

      confirmSubsetSave(subsetElements, explanation)
   }

   get clickAction () /*: html */ {
      // preventDefault keeps click from exposing details and toggling colors at the same time
      return `data-action="event.preventDefault(); toggleColorHighlight(${this.id})"`
   }

   get contextAction () /*: html */ {
      return `data-action2="showMenu(event, ${this.id})"`
   }

   // delete is a javascript keyword...
   destroy () {
      // remove highlights
      for (const [inx, highlight] of highlights.entries()) {
         if (highlight.includes(this.id)) {
            highlightItem([], inx)
         }
      }
         
      delete(displayList[this.id]);
      const thisElement = document.getElementById(`${this.id}`)
      if (thisElement != null) {
         thisElement.remove()
      }
      SheetEditor.broadcastChange()
   }

   get info () /*: html */ {
      const subsetElements = this.elements.toArray().map((el) => group.representation[el]);
      const subsetElementList = subsetElements.join(', <wbr>')  // .replaceAll(' ', '&nbsp;')
      const myInfo = `<div>The elements of ${this.name} are:
                         <div style="white-space: nowrap; max-width: 25em; padding-left: 1em">${subsetElementList}</div>
                      </div>`
      return myInfo
   }

   getInfo () /*: html */ {
      const result = `<div>${this.info}</div>`

      return result
   }

   /*
    * Operations that create new Subsets by performing
    *   union, intersection, and elementwise product on this set
    */
   union (other /*: AbstractSubset */) /* Subset */ {
      const subsetElements = BitSet.union(this.elements, other.elements)

      const explanation =
         `It is the union of ${this.name} with ${other.name}.`

      confirmSubsetSave(subsetElements, explanation)
   }

   intersection (other /*: AbstractSubset */) {
      const subsetElements = BitSet.intersection(this.elements, other.elements)

      const explanation =
         `It is the intersection of ${this.name} with ${other.name}.`

      confirmSubsetSave(subsetElements, explanation)
   }

   elementwiseProduct (other /*: AbstractSubset */) {
      const newElements = new BitSet(group.order);
      for (let i = 0; i < this.elements.len; i++) {
         if (this.elements.isSet(i)) {
            for (let j = 0; j < other.elements.len; j++) {
               if (other.elements.isSet(j)) {
                  newElements.set(group.multtable[i][j]);
               }
            }
         }
      }
      const explanation =
         `It is the elementwise product of ${this.name} with ${other.name}. This means that it
         is the set of all elements <i>ab</i> in ${group.name}, with <i>a</i> from ${this.name}
         and b from ${other.name}. Note that the elementwise product operation is not
         necessarily commutative.`

      confirmSubsetSave(newElements, explanation)
   }

   get elementString () /*: string */ {
      return '[' + this.elements.toString() + ']';
   }
}

class Subgroop extends AbstractSubset {
/*::
   subgroupIndex: number;
  +leftCosets: Cosets;
  +rightCosets: Cosets;
 */
   constructor(subgroupIndex /*: number */) {
      super();

      this.subgroupIndex = subgroupIndex;
      this.elements = group.subgroups[subgroupIndex].members;
   }

   get name () /*: html */ {
      return `<i>H</i><sub>${this.subgroupIndex}</sub>`
   }

   get displayLine() /*: html */ {
      const generators = group.subgroups[this.subgroupIndex].generators.toArray()
                               .map( el => group.representation[el] );
      let template;
      switch (this.subgroupIndex) {
      case 0:
         template =
           `<li id="${this.id}">
               <details subgroup="${this.id}"><summary><span class="normal-group" ${this.clickAction} ${this.contextAction}>
                   ${this.name} = ⟨ ${generators[0]} ⟩ is the trivial subgroup { ${generators[0]} }.
               </span></summary></details>
            </li>`
         break
      case group.subgroups.length - 1:
         template =
           `<li id="${this.id}">
               <details subgroup="${this.id}"><summary><span class="normal-group" ${this.clickAction} ${this.contextAction}>
                   ${this.name} = ⟨ ${generators.join(', <wbr>')} ⟩ is the group itself.
               </span></summary></details>
            </li>`
         break
      default:
         const isNormal = group.subgroups[this.subgroupIndex].isNormal
         template =
           `<li id="${this.id}">
               <details subgroup="${this.id}"><summary><span ${(isNormal) ? 'class="normal-group"' : ''} ${this.clickAction} ${this.contextAction}>
                  ${this.name} = ⟨ ${generators.join(', <wbr>')} ⟩ is a subgroup of order ${group.subgroups[this.subgroupIndex].order}.
               </span></summary></details>
            </li>`
         break
      }

      return template
   }

   get info () /*: html */ {
      let subgroopInfo = ''
      const subgroup = group.subgroups[this.subgroupIndex]

      subgroopInfo += `<div>${this.name} is a ${subgroup.isNormal ? 'normal' : ''} subgroup of ${group.name}`
      if (subgroup.isomorphicGroup == null) {
         subgroopInfo += `; it is not isomorphic any group in GE3`
      } else {
         subgroopInfo += `, isomorphic to <a href="./GroupInfo.html?groupURL=${subgroup.isomorphicGroup.URL}" target="_blank">${subgroup.isomorphicGroup.name}</a>`
      }
      subgroopInfo += '</div>'

      if (subgroup.isNormal) {
         subgroopInfo += `<div>The quotient group ${group.name}/${this.name} is`
         if (subgroup.isomorphicQuotientGroup == null) {
            subgroopInfo += ` not isomorphic to any group in GE3`
         } else {
            subgroopInfo += ` isomorphic to <a href="./GroupInfo.html?groupURL=${subgroup.isomorphicQuotientGroup.URL}">${subgroup.isomorphicQuotientGroup.name}</a>`
         }
         subgroopInfo += '</div>'
      }

      return subgroopInfo + super.info
   }

   get menu() /*: html */ {
      const subgroupMenuTemplate = `
         <ul id="subgroup-menu">
            <li data-action="makeSubsetEditor()">Create ${Subset.nextName()}</li>
            <hr>
            <li class="inline-submenu">Compute
               <ul id="compute-menu">
                  ${showingConjugacyClasses() ? '' : allConjugacyClassesHTML()}
                  ${showingOrderClasses() ? '' : allOrderClassesHTML()}
                  <li data-action="displayList[${this.id}].normalizer">the normalizer of ${this.name}, Norm(${this.name})</li>
                  ${showingLeftCosets(this.id) ? ''
                     : `<li data-action="displayList[${this.id}].showLeftCosets()">all left cosets <i>g</i>${this.name} of ${this.name}</li>`}
                  ${showingRightCosets(this.id) ? ''
                     : `<li data-action="displayList[${this.id}].showRightCosets()">all right cosets ${this.name}<i>g</i> of ${this.name}</li>`}
                  <li class="detached-submenu">an intersection
                     <ul id="intersection-menu">
                        ${ makeLongList(this.id, intersectionItemHTML) }
                     </ul>
                  </li>
                  <li class="detached-submenu">a union
                     <ul id="union-menu">
                        ${ makeLongList(this.id, unionItemHTML) }
                     </ul>
                  </li>
                  <li class="detached-submenu">an elementwise product
                     <ul id="elementwise-product-menu">
                        ${makeLongList(this.id, elementwiseProductItemHTML) }
                     </ul>
                  </li>
               </ul>
            </li>
            <li class="inline-submenu">Highlight item
               ${highlightItemMenuHTML(this)}
            </li>
            <li data-action="clearHighlights()">Clear all highlighting</li>
         </ul>`

      return subgroupMenuTemplate
   }

   get normalizer () /*: void */ {
      const subsetElements = new SubgroupLattice(group)
         .findNormalizer(group.subgroups[this.subgroupIndex]).members

      const explanation =
         `It is the normalizer of ${this.name}, Norm(${this.name}). This means that it
         is the largest subgroup of ${group.name} in which ${this.name} is normal.`

      confirmSubsetSave(subsetElements, explanation)
   }

   showLeftCosets () {
      new Cosets(this, 'left');
   }

   showRightCosets () {
      new Cosets(this, 'right');
   }
}

class Subset extends AbstractSubset {
/*::
   subsetIndex: number;
 */
   constructor(elements /*: void | Array<groupElement> | BitSet */) {
      super();

      if (elements === undefined) {
         this.elements = new BitSet(group.order);
      } else if (Array.isArray(elements)) {
         this.elements = new BitSet(group.order, elements);
      } else {
         this.elements = elements;
      }
      this.subsetIndex = getNextSubsetIndex();

      const placeholder = rootElement.querySelector('#subsets .placeholder')
      if (placeholder != null) {
         placeholder.style.display = 'none'
      }
      const subsetList = rootElement.querySelector('#subsets ul')
      if (subsetList != null) {
         subsetList.insertAdjacentHTML('beforeend', this.displayLine)
      }

      SheetEditor.broadcastChange()
   }

   get name () /*: html */ {
      return `<i>S</i><sub>${this.subsetIndex}</sub>`
   }

   get displayLine() /*: html */ {
      const numElements = this.elements.popcount();
      let elements = this.elements
          .toArray()
          .slice(0, 3)
          .map((el) => group.representation[el]);
       if (numElements > 3) {
         elements.push('...');
      }
      const subsetTemplate =
        `<li id="${this.id}">
            <details><summary><span ${this.clickAction} ${this.contextAction}>
               ${this.name} = { ${elements.join(', <wbr>')} } is
                  ${numElements == 0 || numElements == group.order ? 'the' : 'a'} subset of size ${numElements}.
            </span></summary>${this.getInfo()}</details>
         </li>`

      return subsetTemplate
   }

   getInfo () /*: html */ {
      let subsetInfo = ''

      const subgroop = displayList
         .filter((el) => el instanceof Subgroop)
         .find((subgroop) => group.subgroups[subgroop.subgroupIndex].members.equals(this.elements))
      if (subgroop == null) {
         subsetInfo = super.info
      } else {
         subsetInfo += `<div>${this.name} is identical to ${subgroop.name}</div>` + subgroop.info
      }

      return subsetInfo
   }

   get menu() /*: html */ {
      const subsetMenuTemplate = `
         <ul id="subset-menu">
            <li data-action="makeSubsetEditor(${this.id})">Edit list of elements in ${this.name}</li>
            <li data-action="displayList[${this.id}].destroy()">Delete ${this.name}</li>
            <li data-action="makeSubsetEditor()">Create ${Subset.nextName()}</li>
            <hr>
            <li class="inline-submenu">Compute
               <ul id="compute-menu">
                  ${showingConjugacyClasses() ? '' : allConjugacyClassesHTML()}
                  ${showingOrderClasses() ? '' : allOrderClassesHTML()}
                  <li data-action="displayList[${this.id}].closure">the closure of ${this.name}, ⟨ ${this.name} ⟩</li>
                  <li class="detached-submenu">an intersection
                     <ul id="intersection-menu">
                        ${makeLongList(this.id, intersectionItemHTML)}
                     </ul>
                  </li>
                  <li class="detached-submenu">a union
                     <ul id="union-menu">
                        ${makeLongList(this.id, unionItemHTML)}
                     </ul>
                  </li>
                  <li class="detached-submenu">an elementwise product
                     <ul id="elementwise-product-menu">
                        ${makeLongList(this.id, elementwiseProductItemHTML)}
                     </ul>
                  </li>
               </ul>
            </li>
            <li class="inline-submenu">Highlight item
               ${highlightItemMenuHTML(this)}
            </li>
            <li data-action="clearHighlights()">Clear all highlighting</li>
         </ul>`

      return subsetMenuTemplate
   }

   destroy () {
      super.destroy();
      if (rootElement.querySelectorAll('#subsets li').length === 1) {
         const placeholder = rootElement.querySelector('#subsets .placeholder')
         if (placeholder != null) {
            placeholder.style.display = ''
         }
      }
   }

   static nextName () /*: html */ {
      return `<i>S</i><sub>${nextSubsetIndex}</sub>`
   }
}

class PartitionSubset extends AbstractSubset {
/*::
   parent: AbstractPartition;
   subIndex: number;
 */
   constructor (parent /*: AbstractPartition */,
               subIndex /*: number */,
               elements /*: BitSet */,
               name /*: string */) {
      super();

      this.parent = parent;
      this.subIndex = subIndex;
      this.elements = elements;
      this.name = name;

      SheetEditor.broadcastChange()
   }

   get clickAction () /*: html */ {
      return `data-action="event.preventDefault(); toggleColorHighlight(${this.id})"`
   }

   get elementRepresentations () /*: Array<html> */ {
      const result = [];
      for (let i = 0; i < this.elements.len && result.length < 3; i++) {
         if (this.elements.isSet(i)) {
            result.push(group.representation[i]);
         }
      }
      if (this.elements.popcount() > 3) {
         result.push('...');
      }
      return result;
   }

   get menu () /*: html */ {
      const partitionMenuTemplate = `
         <ul id="partition-menu">
            <li data-action="displayList[${this.id}].parent.destroy()">Delete partition ${this.parent.name}</li>
            <li data-action="makeSubsetEditor()">Create ${Subset.nextName()}</li>
            <hr>
            <li class="inline-submenu">Compute
               <ul id="compute-menu">
                  ${showingConjugacyClasses() ? '' : allConjugacyClassesHTML()}
                  ${showingOrderClasses() ? '' : allOrderClassesHTML()}
                  <li data-action="displayList[${this.id}].closure">the closure of ${this.name}, ⟨ ${this.name} ⟩</li>
                  <li class="detached-submenu">an intersection
                     <ul id="intersection-menu">
                        ${makeLongList(this.id, intersectionItemHTML)}
                     </ul>
                  </li>
                  <li class="detached-submenu">a union
                     <ul id="union-menu">
                        ${makeLongList(this.id, unionItemHTML)}
                     </ul>
                  </li>
                  <li class="detached-submenu">an elementwise product
                     <ul id="elementwise-product-menu">
                        ${makeLongList(this.id, elementwiseProductItemHTML)}
                     </ul>
                  </li>
               </ul>
            </li>
            <li class="inline-submenu">Highlight item
               ${highlightItemMenuHTML(this)}
            </li>
            <li class="inline-submenu">Highlight partition
               ${highlightPartitionMenuHTML(this.parent)}
            </li>
            <li data-action="clearHighlights()">Clear all highlighting</li>
         </ul>`

      return partitionMenuTemplate
   }
}

class ConjugacyClass extends PartitionSubset {
   get displayLine () /*: html */ {
      const conjugacyClassTemplate =
        `<li id="${this.id}" class="conjugacyClass">
            <details><summary><span ${this.clickAction} ${this.contextAction}>
               ${this.name} = <wbr>{ ${this.elementRepresentations.join(', <wbr>')} } is a conjugacy class of size ${this.elements.popcount()}.
            </span></summary>${this.getInfo()}</details>
         </li>`
      return conjugacyClassTemplate
   }
}

class OrderClass extends PartitionSubset {
   get displayLine () /*: html */ {
      const orderClassTemplate =
        `<li id="${this.id}" class="orderClass">
            <details><summary><span ${this.clickAction} ${this.contextAction}>
               ${this.name} = <wbr>{ ${this.elementRepresentations.join(', <wbr>')} } is an order class of size ${this.elements.popcount()}.
            </span></summary>${this.getInfo()}</details>
         </li>`
      return orderClassTemplate
   }
}

class Coset extends PartitionSubset {
   get displayLine () /*: html */ {
      let cosetClassTemplate = ''
      if (this.parent instanceof Cosets) {
         const parentPartition = this.parent
         cosetClassTemplate =
            `<li id="${this.id}" class="${parentPartition.side}coset${parentPartition.subgroop.id}">
            <details><summary><span ${this.clickAction} ${this.contextAction}>
               ${this.name} = <wbr>{ ${this.elementRepresentations.join(', <wbr>')} } is the ${parentPartition.isLeft ? 'left' : 'right'} coset of
               ${parentPartition.subgroop.name} by ${(group.representation[this.elements.toArray()[0]])}.
               </span></summary>${this.getInfo()}</details>
               </li>`
      }

      return cosetClassTemplate
   }
}

class AbstractPartition {
/*::
   subsets: Array<PartitionSubset>;
 */
   constructor () {
      this.subsets = [];

      const placeholderElement = rootElement.querySelector('#partitions .placeholder')
      if (placeholderElement != null) {
         placeholderElement.style.display = 'none'
      }
   }

   get name () /*: html */ {
      return `{ ${this.subsets[0].name} ... ${this.subsets[this.subsets.length-1].name} }`
   }

   destroy () {
      this.subsets.forEach((subset) => subset.destroy())
      if (rootElement.querySelectorAll('#partitions li').length === 1) {
         const placeholderElement = rootElement.querySelector('#partitions .placeholder')
         if (placeholderElement != null) {
            placeholderElement.style.display = ''
         }
      }
   }

   addAllSubsets () {
      const allSubsetsHTML = this.subsets.map((subset) => subset.displayLine).join('')
      const partitionsList = rootElement.querySelector('#partitions ul')
      if (partitionsList != null) {
         partitionsList.insertAdjacentHTML('beforeend', allSubsetsHTML)
      }
   }

   get allElementString () /*: html */ {
      return '[[' + this.subsets.map( (el) => el.elements.toString() ).join('],[') + ']]';
   }
}

class ConjugacyClasses extends AbstractPartition {
   constructor () {
      super()

      this.subsets = group.conjugacyClasses.map((conjugacyClass, inx) =>
         new ConjugacyClass(this, inx, conjugacyClass, `<i>CC</i><sub>${inx}</sub>`))

      this.addAllSubsets()
   }
}

class OrderClasses extends AbstractPartition {
   constructor () {
      super();

      this.subsets = group
         .orderClasses
         .filter((orderClass) => orderClass.popcount() != 0)
         .map((orderClass, inx) =>
            new OrderClass(this, inx, orderClass, `<i>OC</i><sub>${inx}</sub>`)
         )

      this.addAllSubsets()
   }
}

class Cosets extends AbstractPartition {
/*::
  subgroop: Subgroop;
  isLeft: boolean;
  side: 'left' | 'right';
 */
   constructor (subgroop /*: Subgroop */, side /*: 'left' | 'right' */) {
      super();

      this.subgroop = subgroop;
      this.isLeft = side == 'left';
      this.side = side;

      this.subsets = group
         .getCosets(this.subgroop.elements, this.isLeft)
         .map((coset, inx) => {
            const rep = group.representation[((coset.first() /*: any */) /*: groupElement */)]
            const name = this.isLeft
               ? rep + this.subgroop.name
               : this.subgroop.name + rep
            return new Coset(this, inx, coset, name)
         })

      this.addAllSubsets()
   }
}

function makeSubsetEditor (displayId /*: integer */) /*: SubsetEditor */ {
   const subsetFromId = (displayId == null) ? undefined : displayList[displayId];
   const setElements = (subsetFromId == null) ? new BitSet(group.order) : subsetFromId.elements;
   const setName = (subsetFromId == null) ? Subset.nextName() : subsetFromId.name;

   return new SubsetEditor(setName, setElements)
}

class SubsetEditor {
   editorDialog /*: HTMLElement */

   constructor (setName /*: html */, setElements /*: BitSet */) {
      const subset = []
      const complement = []
      for (const el of group.elements) {
         const listElement =
            `<li data-element="${el}" data-action="this.swapElement(${el})">${group.representation[el]}</li>`
         if (setElements.isSet(el))
            subset.push(listElement)
         else
            complement.push(listElement)
      }
      const subsetList = subset.join('')
      const complementList = complement.join('')

      const subsetEditorHTML =
         `<div id="subset-editor" class="flex-v">
             <div id="subset-editor-title" class="centered">Edit subset ${setName}</div>
             <div id="subset-editor-body" class="flex-v stretch">
                <div id="subset-editor-info">Move elements of ${setName} from one column to the other by clicking/tapping them.</div>
                <div class="flex-h stretch">
                   <div id="subset-editor-subset" class="subset flex-v">
                      <div class="centered">Elements in ${setName}</div>
                      <ul id="subset-elements" class="elements stretch scrollable">${subsetList}</ul>
                      <button id="cancel-button" data-action="this.close()">Cancel</button>
                   </div>
                   <div id="subset-editor-complement" class="subset flex-v stretch">
                      <div class="centered">Elements not in ${setName}</div>
                      <ul id="complement-elements" class="elements stretch scrollable">${complementList}</ul>
                      <button id="ok-button" data-action="this.accept()">OK</button>
                   </div>
                </div>
             </div>
             <style>
                #subset-editor {
                   min-width: 35em;
                   min-height: 20em;
                   padding: 0;
                   overflow-x: hidden;
                }
                #subset-editor-body {
                   padding: 0.3ch;
                }
                #subset-editor-info {
                   line-height: 1;
                   white-space: normal;
                   margin-top: 0.5em;
                }
                #subset-editor .centered {
                   text-align: center;
                }
                #subset-editor-title {
                   font-size: 1.5rem;
                   padding-top: 0.15em;  /* Title doesn't have any descenders so it looks off-center */
                   background-color: var(--dialog-header-background);
                }
                #subset-editor ul {
                   height: 0;  /* otherwise element gets sized to max-content on first display */
                   background-color: var(--gray0);
                   border: var(--dark-border);
                   list-style: none;
                   margin-block-end: 0;
                   margin-block-start: 0;
                   overflow: hidden auto;
                   padding-inline-start: 0.5ch;
                   white-space: nowrap;
                   position: unset;
                   width: unset;
                   resize: unset;
                }
                #subset-editor .subset {
                   width: 50%;
                   margin: 0 0.2ch;
                }
                #subset-editor button {
                   width: 8ch;
                   margin: 0.2em auto;
                }
             </style>
          </div>`

      this.editorDialog = makeDialog(subsetEditorHTML, {clientX: 0, clientY: 0})

      // Center grid
      const subsetEditor = document.getElementById('subset-editor')
      if (subsetEditor != null) {
         subsetEditor.style.left =
            `${Math.max(0.1 * window.innerWidth, 0.5 * (window.innerWidth - subsetEditor.offsetWidth))}px`
         subsetEditor.style.top =
            `${Math.max(0.1 * window.innerHeight, 0.2 * (window.innerHeight - subsetEditor.offsetHeight))}px`
      }

      // register action handler
      GEUtils.createActionHandler(this.editorDialog, (action) => eval(action))
   }

   close () {
      this.editorDialog.remove()
   }

   async accept () {
      const subsetElementArray = Array
         .from(this.editorDialog.querySelectorAll('#subset-elements > li'))
         .map((el) => parseInt(el.getAttribute('data-element')))
      const subsetElements = new BitSet(group.order, subsetElementArray)

      const explanation = 'The elements were chosen in the Subset Editor.'

      const confirmation = await confirmSubsetSave(subsetElements, explanation)

      if (confirmation) {
         this.close()
      }
   }

   swapElement (elementNumber /*: groupElement */) {
      const li = this.editorDialog.querySelector(`[data-element="${elementNumber}"]`)
      const toList = (li?.closest('ul')?.getAttribute('id') == 'subset-elements')
         ? this.editorDialog.querySelector('#complement-elements')
         : this.editorDialog.querySelector('#subset-elements')
      if (li == null || toList == null) {
         return
      }
      // sort the toList? find location to insert li?
      const toListElements = Array
         .from(toList.children)
         .map((el) => parseInt(el.getAttribute('data-element')))
      if (   toListElements.length == 0
          || toListElements[toListElements.length - 1] < elementNumber
      ) {
         toList.append(li)
      } else { // find first element larger than element number and insert li before it
         const inx = toListElements.findIndex((el) => el > elementNumber)
         toList.children[inx].insertAdjacentElement('beforebegin', li)
      }
   }
}
/*
 * Utility functions
 */
async function confirmSubsetSave (
   subsetElements /*: BitSet */,
   explanation /*: html */
) /*: Promise<boolean> | Promise<unknown> */ {
   const matchingSubsets = displayList
      .filter((displayElement) => displayElement.parent == null && displayElement.elements.equals(subsetElements))

   if (matchingSubsets.length == 0) {
      new Subset(subsetElements)
      return true
   }

   const matchingSubsetString = matchingSubsets.reduce((subsetString, subset, inx) => {
      if (inx != 0) {
         if (inx == matchingSubsets.length - 1) {
            if (matchingSubsets.length > 2) {
               subsetString += ','
            }
            subsetString += ' and '
         } else if (inx != 0) {
            subsetString += ', '
         }
      }
      return subsetString + subset.name
   }, '')

   const confirmationHTML =
     `<div style="text-wrap: auto; width: 70ch; resize: none;">
         <p>The subset { ${subsetElements.toString()} } of ${group.name} was computed as follows:</p>` +
        '<p>' + explanation + '</p>' +
        `<p style="text-align: center; color: red">This subset is equivalent to ${matchingSubsetString}.</p>
         <p>Would you like to add this subset to the list as <i>S</i><sub>${nextSubsetIndex}</sub>?</p>
         <div style="display: flex; justify-content: flex-end; gap: 2ch">
            <button data-value="true">Yes, add a new subset</button>
            <button data-value="false">No, forget it</button>
         </div>
      </div>`

   const location = {clientX: 'calc((100% - 70ch) / 2)', clientY: 'calc((100% - 15em) / 4)'}
   const confirmationDialog = makeDialog(confirmationHTML, location)

   const result = await new Promise((resolve, _reject) => {
      confirmationDialog.addEventListener('click', (event) => {
         const dataValue = event.target.closest('button[data-value]')?.getAttribute('data-value')
         if (dataValue != null) {
            confirmationDialog.remove()
            const confirmation = eval(dataValue)
            if (confirmation) {
               new Subset(subsetElements)
            }
            resolve(confirmation)
         }
      })
   })

   return result
}

function showingOrderClasses () /*: boolean */ {
   return rootElement.querySelector('#partitions li.orderClass') != null
}

function showingConjugacyClasses () /*: boolean */ {
   return rootElement.querySelector('#partitions li.conjugacyClass') != null
}

function showingLeftCosets (id /*: groupElement */) /*: boolean */ {
   return rootElement.querySelector('#partitions li.leftCoset' + id) != null
}

function showingRightCosets (id /*: groupElement */) /*: boolean */ {
   return rootElement.querySelector('#partitions li.rightCoset' + id) != null
}

function makeLongList (id /*: groupElement */, htmlGenerator /*: (integer, integer) => html */) /*: html */ {
   const result = displayList.reduce(
      (list /*: Array<html> */, _listItem, index) => {
         if (index != id) {
            list.push(htmlGenerator(id, index))
         }
         return list
      }, [])
      .join('')

   return result
}

function showHeaderMenu (event /*: MouseEvent */) {
   const headerMenu =
      `<ul id="header-menu">
         <li data-action="makeSubsetEditor()">Create ${Subset.nextName()}</li>
         <hr>
         ${(showingOrderClasses() && showingConjugacyClasses()) ? '' :
            `<li class="inline-submenu">Compute
               <ul id="compute-menu">
                  ${showingConjugacyClasses() ? '' : allConjugacyClassesHTML()}
                  ${showingOrderClasses() ? '' : allOrderClassesHTML()}
               </ul>
            </li>`}
         <li data-action="clearHighlights()">Clear all highlighting</li>
      </ul>`

   makeDetachedMenu(headerMenu, event)
      .then( (action) => eval(action) )
}

function showMenu (event /*: MouseEvent */, id /*: number */) {
   const menu = displayList[id].menu
   const dataActionElement = (event.target instanceof Element) ? event.target.closest('[data-action]') : null
   if (dataActionElement instanceof HTMLElement) {
      dataActionElement.style.backgroundColor = 'var(--list-highlight)'
      makeDetachedMenu(menu, event)
         .then(
            (action) => {
               // clear highlight
               dataActionElement.style.backgroundColor = ''
               eval(action)
            })
   }
}

function toggleColorHighlight (id /*: integer */) {
   if (  highlights[0].length == 0
      || !(displayList[id] instanceof PartitionSubset) && (highlights[0][0] != id)
      || (displayList[id] instanceof PartitionSubset) && (displayList[highlights[0][0]]?.parent != displayList[id].parent)
   ) {  // set highlights
      if (displayList[id] instanceof PartitionSubset) {
         highlightItem(displayList[id].parent.subsets.map((part) => part.id), 0)
      } else {
         highlightItem([id], 0)
      }
   } else {  // clear highlights
      highlightItem([], 0)
   }
}

function clearHighlights () {
   view.clearHighlights()
   highlights.fill([])
   updateHighlightMark()
}

function getNextId () /*: number */ {
   return nextId++;
}

function getNextSubsetIndex () /*: number */ {
   return nextSubsetIndex++;
}

function allConjugacyClassesHTML () {
   const html =
      `<li data-action="new ConjugacyClasses()">
          all conjugacy classes <i>CC</i><sub>i</sub>
       </li>`
   return html
}

function allOrderClassesHTML () {
   const html =
      `<li data-action="new OrderClasses()">
          all order classes <i>OC</i><sub>i</sub>
       </li>`
   return html
}

function intersectionItemHTML (id /*: integer */, other_id /*: integer */) /*: html */ {
   const html =
      `<li data-action="displayList[${id}].intersection(displayList[${other_id}])">
          the intersection of ${displayList[id].name} with ${displayList[other_id].name}
       </li>`
   return html
}

function unionItemHTML (id /*: integer */, other_id /*: integer */) /*: html */ {
   const html =
      `<li data-action="displayList[${id}].union(displayList[${other_id}])">
          the union of ${displayList[id].name} with ${displayList[other_id].name}
       </li>`
   return html
}

function elementwiseProductItemHTML (id /*: integer */, other_id /*: integer */) /*: html */ {
   const html =
      `<li data-action="displayList[${id}].elementwiseProduct(displayList[${other_id}])">
          the elementwise product of ${displayList[id].name} with ${displayList[other_id].name}
       </li>`
   return html
}

function highlightItemMenuHTML (subset /*: AbstractSubset */) /*: html */ {
   const html = [
      '<ul id="highlight-item-menu">'
   ]
   for (const [inx, highlighter] of highlighters.entries()) {
      html.push(
         `<li data-action="highlightItem([${subset.id}], ${inx})">
             by ${highlighter.label || ''}
          </li>`
      )
   }
   html.push(
      '</ul>'
   )

   return html.join('')
}

function highlightPartitionMenuHTML (partition /*: AbstractPartition */) /*: html */ {
   const html = [
      '<ul id="highlight-partition-menu">'
   ]
   for (const [inx, highlighter] of highlighters.entries()) {
      html.push(
         `<li data-action="highlightItem([${partition.subsets.map((el) => el.id.toString()).join(',')}], ${inx})">
             by ${highlighter.label || ''}
          </li>`
      )
   }
   html.push(
      '</ul>'
   )

   return html.join('')
}

// Set highlight color as a function of visualizer, highlight type
function highlightItem (
   displayListIndexes /*: Array<integer> */,
   highlighterIndex /*: integer */,
   colors /*:: ?: Array<color> */
) {
   const elementArray /*: Array<color> */ = (displayListIndexes.length == 0) ? [] : Array(group.order).fill(null)
   for (const [inx, displayId] of displayListIndexes.entries()) {
      let color
      if (colors != null) {
         color = colors[inx]
      } else {
         const h = inx / displayListIndexes.length
         const s = (view.constructor.name == 'CayleyDiagramView') ? 0.53 : 1
         const l = (view.constructor.name == 'CayleyDiagramView') ? 0.30 : 0.8
         const offset = (view.constructor.name == 'CayleyDiagramView') ? 0 : highlighterIndex / 3
         color = '#' + new THREE.Color(GEUtils.fromRainbow(h, s, l, offset)).getHexString()
      }
      displayList[displayId].elements.toArray().forEach((element) => elementArray[element] = color)
   }
   highlighters[highlighterIndex](elementArray)
   highlights[highlighterIndex] = [...displayListIndexes]
   if (highlighterIndex == 0) {
      updateHighlightMark()
   }
}

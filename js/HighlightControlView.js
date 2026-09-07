/*
# HighlightControlView - View for Subset and Highlighting

HighlightControlView implements the View layer of HighlightControl's MVVM pattern.
It renders the subset panel UI (subgroups, user subsets, partitions) and handles
user interactions including menus, highlighting, and subset editing.

```js
 */
import { BitSet } from './BitSet.js';
import * as GEUtils from './GEUtils.js';
import * as Log from './Log.js';
import { makeFixedMenu, makeDetachedMenu, makeDialog } from './UIComponents.js';
/*
```
## View
```js
 */
export class HighlightControlView {
    viewModel;
    rootElement;
    itemMap = [];
    constructor(viewModel, rootElement) {
        this.viewModel = viewModel;
        this.rootElement = rootElement;
        // Create document fragment to lay out HighlightControl UI and
        rootElement.insertAdjacentHTML('beforeend', HighlightControlView.highlightControlHTML);
        makeFixedMenu(rootElement.querySelector('#subset-page'), (action, event) => {
            Log.debug(`HighlightControlView.constructor executing ${action}`);
            eval(action);
        });
        this.updateHighlightMark();
        // setup finished, let viewModel add its items
        viewModel.view = this;
    }
    addElement(displayItem) {
        new DisplayItemView(displayItem, this);
        this.updateHighlightMark();
    }
    allConjugacyClassesHTML() {
        const html = `<li data-action="this.viewModel.createConjugacyClasses()">
         all conjugacy classes <i>CC</i><sub>i</sub>
         </li>`;
        return html;
    }
    allOrderClassesHTML() {
        const html = `<li data-action="this.viewModel.createOrderClasses()">
         all order classes <i>OC</i><sub>i</sub>
         </li>`;
        return html;
    }
    makeLongList(subsetView, htmlGenerator) {
        const result = Array.from(this.viewModel.displayMap.values()).reduce((list, item) => {
            if (['Subgroop', 'Subset', 'ConjugacyClass', 'OrderClass', 'Coset'].includes(item?.className)
                && subsetView.id != item.id) {
                const itemView = this.itemMap[item.id];
                list.push(htmlGenerator(subsetView, itemView));
            }
            return list;
        }, [])
            .join('');
        return result;
    }
    removeElement(displayItem) {
        const displayItemView = this.itemMap[displayItem.id];
        if (displayItemView != null) {
            displayItemView.destroy();
            this.itemMap[displayItem.id] = null;
            this.updateHighlightMark();
        }
    }
    showHeaderMenu(event) {
        const headerMenu = `<ul id="header-menu">
            <li data-action="this.makeSubsetEditor()">Create ${this.nextSubsetName()}</li>
            <hr>
            ${(this.viewModel.canShowOrderClasses() || this.viewModel.canShowConjugacyClasses())
            ? `<li class="inline-submenu">Compute
                     <ul id="compute-menu">
                        ${this.viewModel.canShowConjugacyClasses() ? this.allConjugacyClassesHTML() : ''}
                        ${this.viewModel.canShowOrderClasses() ? this.allOrderClassesHTML() : ''}
                     </ul>
                  </li>`
            : ''}
            <li data-action="this.viewModel.clearAllHighlightColors()">Clear all highlighting</li>
          </ul>`;
        makeDetachedMenu(headerMenu, event)
            .then((action) => action ? eval(action) : {});
    }
    showItemMenu(event, subsetId) {
        const menu = this.itemMap[subsetId].menu;
        const actionElement = event.target.closest('[data-action]');
        actionElement.style.backgroundColor = 'var(--list-highlight)';
        makeDetachedMenu(menu, event)
            .then((action) => {
            actionElement.style.backgroundColor = ''; // clear highlight
            if (action != null) {
                Log.debug(`HighlightControlView.showItemMenu executing ${action}`);
                eval(action);
            }
        });
    }
    intersectionItemHTML(subsetView, otherSubsetView) {
        return `
         <li data-action="this.viewModel.createDerivedSubset('intersection',${subsetView.id},${otherSubsetView.id})"
            >the intersection of ${subsetView.name} with ${otherSubsetView.name}</li>`;
    }
    unionItemHTML(subsetView, otherSubsetView) {
        return `
         <li data-action="this.viewModel.createDerivedSubset('union',${subsetView.id},${otherSubsetView.id})"
            >the union of ${subsetView.name} with ${otherSubsetView.name}</li>`;
    }
    elementwiseProductItemHTML(subsetView, otherSubsetView) {
        return `
         <li data-action="this.viewModel.createDerivedSubset('elementwiseProduct',${subsetView.id},${otherSubsetView.id})"
            >the elementwise product of ${subsetView.name} with ${otherSubsetView.name}</li>`;
    }
    highlightItemHTML(itemView) {
        const html = [
            '<ul>'
        ];
        this.viewModel.highlightTypes.forEach((highlightType, inx) => html.push(`<li data-action="this.viewModel.highlightItem(${itemView.id}, ${inx})">by ${highlightType}</li>`));
        html.push('</ul>');
        return html.join('');
    }
    updateHighlightMark() {
        window.setTimeout(() => {
            // clear current highlight markings
            this.rootElement.querySelectorAll('#subset-page .highlight-mark')
                .forEach((element) => element.classList.remove('highlight-mark'));
            if (this.viewModel.highlightedItems[0] != null) {
                this.itemMap[this.viewModel.highlightedItems[0].id].highlight();
            }
        }, 0);
    }
    async confirmSubsetSave(matchingSubsets, explanation, type = null, subset = null, subset2 = null) {
        if (explanation == null) {
            const subsetView = this.itemMap[subset.id];
            const subset2View = (subset2 == null) ? null : this.itemMap[subset2.id];
            explanation = (subset2View == null)
                ? subsetView[`${type}Explanation`]
                : subsetView[`${type}Explanation`](subset2View);
        }
        const matchingSubsetViews = matchingSubsets.map((subset) => this.itemMap[subset.id]);
        const matchingSubsetString = matchingSubsetViews.reduce((subsetString, subsetView, inx) => {
            if (inx != 0) {
                if (inx == matchingSubsets.length - 1) {
                    if (matchingSubsets.length > 2) {
                        subsetString += ',';
                    }
                    subsetString += ' and ';
                }
                else if (inx != 0) {
                    subsetString += ', ';
                }
            }
            return subsetString + subsetView.name;
        }, '');
        const subsetElements = matchingSubsets[0].elements.toArray();
        const subsetElementHTML = subsetElements
            .map((element) => this.viewModel.group.representation[element])
            .join(', ');
        const confirmationHTML = `<div style="text-wrap: auto; width: 70ch; resize: none;">
             <p>The subset { ${subsetElementHTML} } of ${this.viewModel.group.name} was computed as follows:</p>` +
            '<p>' + explanation + '</p>' +
            `<p style="text-align: center; color: red">This subset is equivalent to ${matchingSubsetString}.</p>
             <p>Would you like to add this subset to the list as <i>S</i><sub>${this.viewModel.nextSubsetIndex}</sub>?</p>
             <div style="display: flex; justify-content: flex-end; gap: 2ch">
                <button data-value="true">Yes, add a new subset</button>
                <button data-value="false">No, forget it</button>
             </div>
          </div>`;
        const location = { clientX: 'calc(3ch + (100% - 70ch) / 2)', clientY: 'calc(3em + (100% - 15em) / 4)' };
        const confirmationDialog = makeDialog(confirmationHTML, location);
        const confirmation = await new Promise((resolve, _reject) => {
            confirmationDialog.addEventListener('click', (event) => {
                const dataValue = event.target.closest('button[data-value]')?.getAttribute('data-value');
                if (dataValue != null) {
                    confirmationDialog.remove();
                    resolve(dataValue == 'true');
                }
            });
        });
        return confirmation;
    }
    nextSubsetName() {
        return `<i>S</i><sub>${this.viewModel.nextSubsetIndex}</sub>`;
    }
    makeSubsetEditor(subsetId) {
        const subset = (subsetId == null) ? null : this.viewModel.displayMap.get(subsetId);
        if (subset?.className === 'Subset') {
            new SubsetEditor(this.viewModel, this.itemMap[subsetId].name, subset.elements);
        }
        else {
            new SubsetEditor(this.viewModel, this.nextSubsetName(), new BitSet(this.viewModel.group.order));
        }
    }
    clearAll() {
        this.itemMap.forEach((itemView) => itemView?.htmlElement?.remove());
        this.itemMap.length = 0;
    }
    static highlightControlHTML = `<style>
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
             <summary><span class="menu-label" data-action2="this.#showHeaderMenu(event)"
                >Subgroups</span>
             </summary>
             <ul></ul>
          </details>

          <details open id="subsets">
             <summary><span class="menu-label" data-action2="this.#showHeaderMenu(event)"
                >User-defined subsets</span>
             </summary>
             <ul>
                <li class="placeholder" data-action="this.#showHeaderMenu(event)"
                   data-action2="this.#showHeaderMenu(event)"></li>
             </ul>
          </details>

          <details open id="partitions">
             <summary><span class="menu-label" data-action2="this.#showHeaderMenu(event)"
                >Partitions</span>
             </summary>
             <ul>
                <li class="placeholder" data-action="this.#showHeaderMenu(event)"
                   data-action2="this.#showHeaderMenu(event)"></li>
             </ul>
          </details>
       </div>`;
}
/*
```
## DisplayItemView
```js
 */
class DisplayItemView {
    item;
    view;
    viewModel;
    htmlElement; // Subgroop, Subset, Partition items
    partitionViews; // PartitioningScheme items
    schemeView; // Partition items: back-reference to parent scheme view
    constructor(item, view, schemeView = null) {
        this.item = item;
        this.view = view;
        this.viewModel = view.viewModel;
        this.schemeView = schemeView;
        view.itemMap[item.id] = this;
        if (['ConjugacyClasses', 'OrderClasses', 'Cosets'].includes(item.className)) {
            this.buildScheme();
        }
        else if (item.className === 'Subgroop' || item.className === 'Subset') {
            this.htmlElement = GEUtils.generateElements(this.displayLine)[0];
            this.appendToSection();
        }
        // Partition items: htmlElement and DOM insertion handled by #mountPartition, called from schemeView
    }
    get id() { return this.item.id; }
    get rootElement() { return this.view.rootElement; }
    get elements() { return 'elements' in this.item ? this.item.elements : null; }
    // ---- name ----------------------------------------------------------------
    get name() {
        const item = this.item;
        let name = '';
        switch (item.className) {
            case 'Subgroop':
                name = `<i>H</i><sub>${item.subgroupIndex}</sub>`;
                break;
            case 'Subset':
                name = `<i>S</i><sub>${item.subsetIndex}</sub>`;
                break;
            case 'ConjugacyClass':
                name = `<i>CC</i><sub>${item.subIndex}</sub>`;
                break;
            case 'OrderClass':
                name = `<i>OC</i><sub>${item.subIndex}</sub>`;
                break;
            case 'Coset': {
                const coset = item;
                const cosetPartitioningScheme = coset.partitioningScheme;
                const rep = this.viewModel.group.representation[coset.elements.first()];
                const subgroopName = this.view.itemMap[cosetPartitioningScheme.subgroop.id].name;
                name = cosetPartitioningScheme.side == 'left' ? rep + subgroopName : subgroopName + rep;
                break;
            }
            case 'ConjugacyClasses':
            case 'OrderClasses':
            case 'Cosets':
                name = `{ ${this.partitionViews[0].name} ... ${this.partitionViews.at(-1).name} }`;
                break;
            default: throw new Error(`DisplayItemView.name: unknown class '${item.className}'`);
        }
        return name;
    }
    // ---- displayLine ---------------------------------------------------------
    get displayLine() {
        let displayLine = ''; // PartitioningScheme classes have no line of their own; children have lines
        switch (this.item.className) {
            case 'Subgroop':
                displayLine = this.subgroopDisplayLine();
                break;
            case 'Subset':
                displayLine = this.subsetDisplayLine();
                break;
            case 'ConjugacyClass':
                displayLine = this.conjugacyClassDisplayLine();
                break;
            case 'OrderClass':
                displayLine = this.orderClassDisplayLine();
                break;
            case 'Coset':
                displayLine = this.cosetDisplayLine();
                break;
            case 'ConjugacyClasses':
            case 'OrderClasses':
            case 'Cosets': break;
            default: throw new Error(`DisplayItemView.displayLine: unknown class '${this.item.className}'`);
        }
        return displayLine;
    }
    // ---- menu ----------------------------------------------------------------
    get menu() {
        let menu = '';
        switch (this.item.className) {
            case 'Subgroop':
                menu = this.subgroopMenu();
                break;
            case 'Subset':
                menu = this.subsetMenu();
                break;
            case 'ConjugacyClass':
            case 'OrderClass':
            case 'Coset':
                menu = this.partitionMenu();
                break;
            case 'ConjugacyClasses':
            case 'OrderClasses':
            case 'Cosets': break;
            default: throw new Error(`DisplayItemView.menu: unknown class '${this.item.className}'`);
        }
        return menu;
    }
    // ---- lifecycle -----------------------------------------------------------
    destroy() {
        if (['ConjugacyClasses', 'OrderClasses', 'Cosets'].includes(this.item.className)) {
            this.partitionViews.forEach((pv) => pv.destroy());
            if (this.rootElement.querySelectorAll('#partitions li').length == 1) {
                const placeholder = this.rootElement.querySelector('#partitions .placeholder');
                placeholder.style.display = '';
            }
        }
        else if (this.item.className === 'Subset') {
            const subsetElement = this.htmlElement;
            const subsetList = subsetElement.parentElement;
            if (subsetList.querySelectorAll('li').length == 2) {
                const placeholder = subsetList.querySelector('li.placeholder');
                placeholder.style.display = '';
            }
            subsetElement.remove();
        }
        else {
            this.htmlElement?.remove();
        }
    }
    highlight() {
        if (['ConjugacyClasses', 'OrderClasses', 'Cosets'].includes(this.item.className)) {
            this.partitionViews.forEach((pv) => pv.highlight());
        }
        else {
            this.htmlElement?.classList.add('highlight-mark');
        }
    }
    // ---- helpers shared by displayLine / menu --------------------------------
    // toggle over partition element toggles highlighting the entire partition
    get clickAction() {
        const itemId = ('partitioningScheme' in this.item)
            ? this.item.partitioningScheme.id
            : this.id;
        return `data-action="event.preventDefault(); this.viewModel.toggleColorHighlight(${itemId})"`;
    }
    get contextAction() {
        return `data-action2="this.showItemMenu(event, ${this.id})"`;
    }
    get info() {
        const baseInfo = (() => {
            const subsetElements = this.elements.toArray().map((el) => this.viewModel.group.representation[el]);
            const subsetElementList = subsetElements.join(', <wbr>');
            return `<div>The elements of ${this.name} are:
            <div style="white-space: nowrap; max-width: 25em; padding-left: 1em">${subsetElementList}</div>
         </div>`;
        })();
        if (this.item.className === 'Subgroop') {
            const subgroup = this.viewModel.group.subgroups[this.item.subgroupIndex];
            let subgroopInfo = `<div>${this.name} is a ${subgroup.isNormal ? 'normal' : ''} subgroup of ${this.viewModel.group.name}`;
            if (subgroup.isomorphicGroup == null) {
                subgroopInfo += `; it is not isomorphic any group in GE3`;
            }
            else {
                subgroopInfo += `, isomorphic to <a href="./GroupInfo.html?groupURL=${subgroup.isomorphicGroup.URL}" target="_blank">${subgroup.isomorphicGroup.name}</a>`;
            }
            subgroopInfo += '</div>';
            if (subgroup.isNormal) {
                subgroopInfo += `<div>The quotient group ${this.viewModel.group.name}/${this.name} is`;
                if (subgroup.isomorphicQuotientGroup == null) {
                    subgroopInfo += ` not isomorphic to any group in GE3`;
                }
                else {
                    subgroopInfo += ` isomorphic to <a href="./GroupInfo.html?groupURL=${subgroup.isomorphicQuotientGroup.URL}">${subgroup.isomorphicQuotientGroup.name}</a>`;
                }
                subgroopInfo += '</div>';
            }
            if (subgroup.order != 1) {
                const pSubgroupInfo = subgroup.getPSubgroupInfo();
                if (pSubgroupInfo != null) {
                    if (subgroup.order == subgroup.group.order) {
                        subgroopInfo += `<div>${subgroup.group.name} is a
                     <a href="./help/rf-groupterms/index.html#p-subgroup">${pSubgroupInfo.p}-group</a></div>`;
                    }
                    else {
                        subgroopInfo += `<div>${this.name} is a `;
                        if (pSubgroupInfo.isSylow) {
                            subgroopInfo +=
                                `<a href="./help/rf-groupterms/index.html#sylow-p-subgroup">Sylow ${pSubgroupInfo.p}-subgroup</a>`;
                        }
                        else {
                            subgroopInfo +=
                                `<a href="./help/rf-groupterms/index.html#p-subgroup">${pSubgroupInfo.p}-subgroup</a>`;
                        }
                    }
                    subgroopInfo += '</div>';
                }
            }
            if (subgroup === this.viewModel.group.center) {
                subgroopInfo += `<div>${this.name} is the <a href="./help/rf-groupterms/index.html#center" target="_blank">center</a> of ${this.viewModel.group.name}, written Z(${this.viewModel.group.name}).</div>`;
            }
            return subgroopInfo + baseInfo;
        }
        if (this.item.className === 'Subset') {
            const subgroop = Array.from(this.viewModel.displayMap.values())
                .filter((el) => el?.className === 'Subgroop')
                .find((subgroop) => this.viewModel.group.subgroups[subgroop.subgroupIndex].members
                .equals(this.elements));
            if (subgroop == null) {
                return baseInfo;
            }
            else {
                const subgroopView = this.view.itemMap[subgroop.id];
                return `<div>${this.name} is identical to ${subgroopView.name}</div>` + subgroopView.info;
            }
        }
        return baseInfo; // ConjugacyClass, OrderClass, Coset
    }
    get closureExplanation() {
        return `It is the closure of ${this.name}, ⟨ ${this.name} ⟩. This means that it
         is the smallest subgroup of ${this.viewModel.group.name} which contains ${this.name}.`;
    }
    get normalizerExplanation() {
        return `It is the normalizer of ${this.name}, Norm(${this.name}). This means that it
         is the largest subgroup of ${this.viewModel.group.name} in which ${this.name} is normal.`;
    }
    unionExplanation(otherView) {
        return `It is the union of ${this.name} with ${otherView.name}.`;
    }
    intersectionExplanation(otherView) {
        return `It is the intersection of ${this.name} with ${otherView.name}.`;
    }
    elementwiseProductExplanation(otherView) {
        return `It is the elementwise product of ${this.name} with ${otherView.name}. This means that it
         is the set of all elements <i>ab</i> in ${this.viewModel.group.name}, with <i>a</i> from ${this.name}
         and b from ${otherView.name}. Note that the elementwise product operation is not
         necessarily commutative.`;
    }
    get elementRepresentations() {
        const result = [];
        const elements = this.elements;
        for (let i = 0; i < elements.len && result.length < 3; i++) {
            if (elements.isSet(i)) {
                result.push(this.viewModel.group.representation[i]);
            }
        }
        if (elements.popcount() > 3) {
            result.push('...');
        }
        return result;
    }
    get elementString() { return '[' + this.elements.toString() + ']'; }
    // ---- private: constructor helpers ----------------------------------------
    buildScheme() {
        // All PartitioningScheme subclasses build partition views the same way
        this.partitionViews = this.item.partitions
            .map((partition) => new DisplayItemView(partition, this.view, this));
        this.rootElement.querySelector('#partitions .placeholder').style.display = 'none';
        this.partitionViews.forEach((pv) => pv.mountPartition());
    }
    appendToSection() {
        const thisElement = this.htmlElement;
        if (this.item.className === 'Subgroop') {
            ;
            this.rootElement.querySelector('#subgroups ul').append(thisElement);
            thisElement.querySelector('details').addEventListener('toggle', (event) => {
                event.target.insertAdjacentHTML('beforeend', this.info);
            }, { once: true });
        }
        else if (this.item.className === 'Subset') {
            this.rootElement.querySelector('#subsets ul')?.append(thisElement);
            this.rootElement.querySelector('#subsets li.placeholder').style.display = 'none';
        }
    }
    mountPartition() {
        this.htmlElement = GEUtils.generateElements(this.displayLine)[0];
        this.rootElement.querySelector('#partitions ul').append(this.htmlElement);
    }
    // ---- private: displayLine implementations --------------------------------
    subgroopDisplayLine() {
        const item = this.item;
        const group = this.viewModel.group;
        const generators = group.subgroups[item.subgroupIndex].generators.toArray()
            .map((el) => group.representation[el]);
        const isCenter = group.subgroups[item.subgroupIndex] === group.center;
        const centerInfix = isCenter ? 'Z = ' : '';
        switch (item.subgroupIndex) {
            case 0:
                return `<li id="${this.id}">
               <details subgroup="${this.id}"><summary><span class="normal-group" ${this.clickAction} ${this.contextAction}>
                   ${this.name} = ${centerInfix}⟨ ${generators[0]} ⟩ is the trivial subgroup { ${generators[0]} }.
               </span></summary></details>
            </li>`;
            case group.subgroups.length - 1:
                return `<li id="${this.id}">
               <details subgroup="${this.id}"><summary><span class="normal-group" ${this.clickAction} ${this.contextAction}>
                   ${this.name} = ${centerInfix}⟨ ${generators.join(', <wbr>')} ⟩ is the group itself.
               </span></summary></details>
            </li>`;
            default: {
                const isNormal = group.subgroups[item.subgroupIndex].isNormal;
                return `<li id="${this.id}">
               <details subgroup="${this.id}"><summary><span ${isNormal ? 'class="normal-group"' : ''} ${this.clickAction} ${this.contextAction}>
                  ${this.name} = ${centerInfix}⟨ ${generators.join(', <wbr>')} ⟩ is a subgroup of order ${group.subgroups[item.subgroupIndex].order}.
               </span></summary></details>
            </li>`;
            }
        }
    }
    subsetDisplayLine() {
        const numElements = this.elements.popcount();
        const elements = this.elements.toArray().slice(0, 3)
            .map((el) => this.viewModel.group.representation[el]);
        if (numElements > 3)
            elements.push('...');
        return `<li id="${this.id}">
            <details><summary><span ${this.clickAction} ${this.contextAction}>
               ${this.name} = { ${elements.join(', <wbr>')} } is
                  ${numElements == 0 || numElements == this.viewModel.group.order ? 'the' : 'a'} subset of size ${numElements}.
            </span></summary>${this.info}</details>
         </li>`;
    }
    conjugacyClassDisplayLine() {
        return `<li id="${this.id}" class="conjugacyClass">
            <details><summary><span ${this.clickAction} ${this.contextAction}>
               ${this.name} = <wbr>{ ${this.elementRepresentations.join(', <wbr>')} }
                  is a conjugacy class of size ${this.elements.popcount()}.
            </span></summary>${this.info}</details>
         </li>`;
    }
    orderClassDisplayLine() {
        return `<li id="${this.id}" class="orderClass">
            <details><summary><span ${this.clickAction} ${this.contextAction}>
               ${this.name} = <wbr>{ ${this.elementRepresentations.join(', <wbr>')} }
                  is an order class of size ${this.elements.popcount()}.
            </span></summary>${this.info}</details>
         </li>`;
    }
    cosetDisplayLine() {
        const cosets = this.item.partitioningScheme;
        return `<li id="${this.id}" class="${cosets.side}coset${cosets.subgroop.id}">
            <details><summary><span ${this.clickAction} ${this.contextAction}>
               ${this.name} = <wbr>{ ${this.elementRepresentations.join(', <wbr>')} } is the
               ${cosets.side} coset of ${this.view.itemMap[cosets.subgroop.id].name} by
               ${this.viewModel.group.representation[this.elements.toArray()[0]]}.
            </span></summary>${this.info}</details>
         </li>`;
    }
    // ---- private: menu implementations ---------------------------------------
    subgroopMenu() {
        return `
         <ul id="subgroup-menu">
            <li data-action="this.makeSubsetEditor()">Create ${this.view.nextSubsetName()}</li>
            <hr>
            <li class="inline-submenu">Compute
               <ul id="compute-menu">
                  ${this.viewModel.canShowConjugacyClasses() ? this.view.allConjugacyClassesHTML() : ''}
                  ${this.viewModel.canShowOrderClasses() ? this.view.allOrderClassesHTML() : ''}
                  <li data-action="this.viewModel.createDerivedSubset('normalizer', ${this.id})"
                     >the normalizer of ${this.name}, Norm(${this.name})</li>
                  ${this.viewModel.canShowCosets(this.id, 'left')
            ? `<li data-action="this.viewModel.createCosets(${this.id},'left')"
                           >all left cosets <i>g</i>${this.name} of ${this.name}</li>`
            : ''}
                  ${this.viewModel.canShowCosets(this.id, 'right')
            ? `<li data-action="this.viewModel.createCosets(${this.id},'right')"
                           >all right cosets ${this.name}<i>g</i> of ${this.name}</li>`
            : ''}
                  <li class="detached-submenu">an intersection
                     <ul id="intersection-menu">
                        ${this.view.makeLongList(this, this.view.intersectionItemHTML)}
                     </ul>
                  </li>
                  <li class="detached-submenu">a union
                     <ul id="union-menu">
                        ${this.view.makeLongList(this, this.view.unionItemHTML)}
                     </ul>
                  </li>
                  <li class="detached-submenu">an elementwise product
                     <ul id="elementwise-product-menu">
                        ${this.view.makeLongList(this, this.view.elementwiseProductItemHTML)}
                     </ul>
                  </li>
               </ul>
            </li>
            <li class="inline-submenu">Highlight item
               ${this.view.highlightItemHTML(this)}
            </li>
            <li data-action="this.viewModel.clearAllHighlightColors()">Clear all highlighting</li>
         </ul>`;
    }
    subsetMenu() {
        return `
         <ul id="subset-menu">
            <li data-action="this.makeSubsetEditor(${this.id})">Edit list of elements in ${this.name}</li>
            <li data-action="this.viewModel.destroyItem(${this.id})">Delete ${this.name}</li>
            <li data-action="this.makeSubsetEditor()">Create ${this.view.nextSubsetName()}</li>
            <hr>
            <li class="inline-submenu">Compute
               <ul id="compute-menu">
                  ${this.viewModel.canShowConjugacyClasses() ? this.view.allConjugacyClassesHTML() : ''}
                  ${this.viewModel.canShowOrderClasses() ? this.view.allOrderClassesHTML() : ''}
                  <li data-action="this.viewModel.createDerivedSubset('closure', ${this.id})"
                     >the closure of ${this.name}, ⟨ ${this.name} ⟩</li>
                  <li class="detached-submenu">an intersection
                     <ul id="intersection-menu">
                        ${this.view.makeLongList(this, this.view.intersectionItemHTML)}
                     </ul>
                  </li>
                  <li class="detached-submenu">a union
                     <ul id="union-menu">
                        ${this.view.makeLongList(this, this.view.unionItemHTML)}
                     </ul>
                  </li>
                  <li class="detached-submenu">an elementwise product
                     <ul id="elementwise-product-menu">
                        ${this.view.makeLongList(this, this.view.elementwiseProductItemHTML)}
                     </ul>
                  </li>
               </ul>
            </li>
            <li class="inline-submenu">Highlight item
               ${this.view.highlightItemHTML(this)}
            </li>
            <li data-action="this.viewModel.clearAllHighlightColors()">Clear all highlighting</li>
         </ul>`;
    }
    partitionMenu() {
        return `
         <ul id="partition-menu">
            <li data-action="this.viewModel.destroyItem(${this.schemeView.id})"
               >Delete partition ${this.schemeView.name}</li>
            <li data-action="this.makeSubsetEditor()">Create ${this.view.nextSubsetName()}</li>
            <hr>
            <li class="inline-submenu">Compute
               <ul id="compute-menu">
                  ${this.viewModel.canShowConjugacyClasses() ? this.view.allConjugacyClassesHTML() : ''}
                  ${this.viewModel.canShowOrderClasses() ? this.view.allOrderClassesHTML() : ''}
                  <li data-action="this.viewModel.createDerivedSubset('closure', ${this.id})"
                     >the closure of ${this.name}, ⟨ ${this.name} ⟩</li>
                  <li class="detached-submenu">an intersection
                     <ul id="intersection-menu">
                        ${this.view.makeLongList(this, this.view.intersectionItemHTML)}
                     </ul>
                  </li>
                  <li class="detached-submenu">a union
                     <ul id="union-menu">
                        ${this.view.makeLongList(this, this.view.unionItemHTML)}
                     </ul>
                  </li>
                  <li class="detached-submenu">an elementwise product
                     <ul id="elementwise-product-menu">
                        ${this.view.makeLongList(this, this.view.elementwiseProductItemHTML)}
                     </ul>
                  </li>
               </ul>
            </li>
            <li class="inline-submenu">Highlight item
               ${this.view.highlightItemHTML(this)}
            </li>
            <li class="inline-submenu">Highlight partition
               ${this.view.highlightItemHTML(this.schemeView)}
            </li>
            <li data-action="this.viewModel.clearAllHighlightColors()">Clear all highlighting</li>
         </ul>`;
    }
}
/*
```
## SubsetEditor

```js
 */
class SubsetEditor {
    editorDialog;
    viewModel;
    constructor(viewModel, setName, setElements) {
        this.viewModel = viewModel;
        const subset = [];
        const complement = [];
        // sort by name
        const sortedElements = [...viewModel.group.elements]
            .sort((a, b) => viewModel.group.representation[a].localeCompare(viewModel.group.representation[b]));
        for (const el of sortedElements) {
            const listElement = `<li data-element="${el}" data-action="this.swapElement(${el})">${viewModel.group.representation[el]}</li>`;
            if (setElements.isSet(el))
                subset.push(listElement);
            else
                complement.push(listElement);
        }
        const subsetList = subset.join('');
        const complementList = complement.join('');
        const subsetEditorHTML = `<div id="subset-editor" class="flex-v">
             <div id="subset-editor-title" class="centered">Edit subset ${setName}</div>
             <div id="subset-editor-body" class="flex-v stretch">
                <div id="subset-editor-info"
                   >Move elements of ${setName} from one column to the other by clicking/tapping them.</div>
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
          </div>`;
        this.editorDialog = makeDialog(subsetEditorHTML, { clientX: 0, clientY: 0 });
        // Center grid
        const subsetEditor = document.getElementById('subset-editor');
        subsetEditor.style.left =
            `${Math.max(0.1 * window.innerWidth, 0.5 * (window.innerWidth - subsetEditor.offsetWidth))}px`;
        subsetEditor.style.top =
            `${Math.max(0.1 * window.innerHeight, 0.2 * (window.innerHeight - subsetEditor.offsetHeight))}px`;
        // register action handler
        GEUtils.createActionHandler(this.editorDialog, (action) => {
            Log.debug(`SubsetEditor.constructor executing ${action}`);
            eval(action);
        });
    }
    close() {
        this.editorDialog.remove();
    }
    async accept() {
        const subsetElementArray = Array
            .from(this.editorDialog.querySelectorAll('#subset-elements > li'))
            .map((el) => parseInt(el.getAttribute('data-element')));
        const subsetElements = new BitSet(this.viewModel.group.order, subsetElementArray);
        const explanation = 'The elements were chosen in the Subset Editor.';
        const confirmedSubset = await this.viewModel.createAndConfirmSubset(subsetElements, explanation);
        if (confirmedSubset != null) {
            this.close();
        }
    }
    swapElement(elementNumber) {
        // find list containing this element, either elements in list or elements not in list
        const selectedListElement = this.editorDialog.querySelector(`[data-element="${elementNumber}"]`);
        const containingList = selectedListElement?.closest('ul[id]');
        const destinationList = (containingList?.getAttribute('id') == 'subset-elements')
            ? this.editorDialog.querySelector('#complement-elements')
            : (containingList?.getAttribute('id') == 'complement-elements')
                ? this.editorDialog.querySelector('#subset-elements')
                : null;
        if (selectedListElement == null || destinationList == null) {
            return;
        }
        // move element to sorted location in destination list
        const toListElements = Array
            .from(destinationList.querySelectorAll('li'))
            .map((el) => parseInt(el.getAttribute('data-element')));
        if (toListElements.length == 0
            || toListElements[toListElements.length - 1] < elementNumber) {
            destinationList.append(selectedListElement);
        }
        else { // find first element larger than element number and insert selected list element before it
            const inx = toListElements.findIndex((el) => el > elementNumber);
            destinationList.children[inx].insertAdjacentElement('beforebegin', selectedListElement);
        }
    }
}
//# sourceMappingURL=HighlightControlView.js.map
/* @flow

# MulttableView

This component draws a 2D multiplication table of the group using HTML canvas 2D graphics.

It is the 'view' part of the general model ([Group](./Group.js.md)) - view - controller
([MulttableDisplay](./MulttableDisplay.js.md), [HighlightControl](./HighlightControl.js.md),
[MulttableControl](./MulttableControl.js.md)) structure of the [Multtable](./Multtable.html.md)
page.

It is used to draw the main cycle graph in the [Multtable](./Multtable.html.md) page, as
well as thumbnails in the main [GroupExplorer](./GroupExplorer.html.md) and
[GroupInfo](./GroupInfo.html.md) pages.

```javascript
 */
/*
Flavors:
    is_minimal_view -- no labels, separation, highlights, pov

Controller interface:
    group (suppress drawing during construction?)
    separation
    organizeBySubgroup
    swap rows/columns
    coloration Rainbow/Grayscale/None
    colorReordering topRowFixed/elementColorsFixed
    highlight by Background/Border/Corner; clear
    pov -- zoom in/out, translate, recenter
    tooltip

Sheet functions:
    unitSquarePosition
    toJSON/fromJSON (putToJSON/setFromJSON)
*/
import { BitSet } from './BitSet.js';
import * as Log from './Log.js';
import * as MulttableViewUI from './MulttableViewUI.js';
import * as GEUtils from './GEUtils.js';
import * as SheetEditor from './SheetEditor.js';
import { THREE } from '../lib/externals.js';
export { createMinimalMulttableView, createLargeMulttableView, createInteractiveMulttableView, };
/*::
import {Group} from './Group.js'
import {Subgroup} from './Subgroup.js'
import type {Tree} from './GEUtils.js';
import {VizDisplay} from './SheetModel.js';
import type {Highlightable, Highlighter, HighlightControlJSON} from './HighlightControl.js'

export type Coloration = 'rainbow' | 'grayscale' | 'none';
export type ColorReordering = 'topRowFixed' | 'elementColorsFixed';

export type MulttableJSON = {
   groupURL: string,
   elements: Array<groupElement>,
   separation: number,
   organizingSubgroup: number,
   coloration: Coloration,
   colorReordering: ColorReordering,
   highlightColors: Array<Array<color>>,
   highlightControl: ?HighlightControlJSON,
}

type MulttableViewOptions = {
   container?: HTMLElement,
   group?: Group
};
*/
const DEFAULT_CANVAS_HEIGHT = 96;
const DEFAULT_CANVAS_WIDTH = 96;
const ZOOM_STEP = 0.002;
const MINIMUM_FONT = 6;
const DEFAULT_BACKGROUND = '#E5E5E5';
const HIGHLIGHT_BACKGROUND = 0;
const HIGHLIGHT_BORDER = 1;
const HIGHLIGHT_CORNER = 2;
export class MulttableViewModel /*:: implements Updatable */ {
    #model; /*: MulttableModel */
    #view; /*: MulttableView */
    #modelFields /*: Array<string> */ = [
        'group',
        'elements',
        'separation',
        'organizingSubgroup',
        'coloration',
        'colorReordering',
        'highlightColors'
    ];
    #group;
    get view() {
        return this.#view;
    }
    set view(view /*: MulttableView */) {
        this.#view = view;
        if (this.model != null) {
            this.#modelFields.forEach((field) => this.update(field, this.model[field]));
        }
    }
    get model() {
        return this.#model;
    }
    set model(multtableModel /*: SubscriptionProxy<MulttableModel> */) {
        this.#model = multtableModel;
        this.#modelFields.forEach((field) => {
            multtableModel.$subscribe(this, field);
            this.update(field, this.model[field]);
        });
    }
    get coloration() {
        return this.model?.coloration ?? 'rainbow';
    }
    get colorReordering() {
        return this.model?.colorReordering ?? 'topRowFixed';
    }
    get elements() {
        return this.model?.elements ?? this.makeLayout(this.organizingSubgroup);
    }
    get group() {
        return this.model?.group ?? this.#group;
    }
    get highlightColors() {
        return this.model?.highlightColors ?? [[], [], []];
    }
    get organizingSubgroup() {
        return this.model?.organizingSubgroup ?? 0;
    }
    get separation() {
        return (this.organizingSubgroup == 0) ? 0 : (this.model?.separation ?? 0);
    }
    update(field /*: string */, value /*: any */) {
        if (this.view == null) {
            return;
        }
        switch (field) {
            case 'group':
            case 'elements':
            case 'coloration':
            case 'colorReordering':
            case 'separation':
            case 'highlightColors':
                this.view.queueShowGraphic();
                break;
            case 'organizingSubgroup': // update elements when organizing subgroup changes
                this.model['elements'] = (this.group != null) ? this.makeLayout(value) : null;
                break;
            default:
                Log.info(`unsupported field ${field} in MulttableView.MulttableViewModel.updateView`);
                break;
        }
    }
    makeLayout(organizingSubgroupIndex /*: number */) {
        const H = (organizingSubgroupIndex == 0)
            ? this.chooseSubgroup(this.group)
            : this.group.subgroups[organizingSubgroupIndex];
        const elements = this.layoutSubgroup(this.group, H);
        return elements;
    }
    // pick largest normal subgroup, and among them the one with fewest generators
    chooseSubgroup(G /*: Group */) {
        const normalSubgroups = G.subgroups.filter((H) => H.isNormal && H.order != G.order && H.order != 1);
        if (normalSubgroups.length == 0) {
            return G.subgroups[0];
        }
        const maxNormalSubgroupOrder = Math.max(...normalSubgroups.map((H) => H.order));
        const normalSubgroupsOfMaxOrder = normalSubgroups.filter((H) => H.order == maxNormalSubgroupOrder);
        if (normalSubgroupsOfMaxOrder.length == 1) {
            return normalSubgroupsOfMaxOrder[0];
        }
        const minGeneratorCount = Math.min(...normalSubgroupsOfMaxOrder.map((H) => H.generators.popcount()));
        const H = normalSubgroupsOfMaxOrder.find((H) => H.generators.popcount() == minGeneratorCount);
        return H;
    }
    layoutSubgroup(G /*: Group */, H /*: Subgroup */) {
        const elements = (H.isNormal && H.order != this.group.order && H.order != 1)
            ? this.layoutNormalSubgroup(G, H) // structure cosets recursively
            : this.layoutNonNormalSubgroup(G, H);
        return elements;
    }
    layoutNormalSubgroup(G /*: Group */, H /*: Subgroup */) {
        const K = this.chooseSubgroup(H.isomorphicGroup); // BitSet of H.isomorphicGroup elements
        const M = this.layoutSubgroup(H.isomorphicGroup, K); // array of H.isomorphicGroup elements
        const N = M.map((m) => H.isomorphicGroupEmbedding[m]); // array of G elements
        const availableElements = new BitSet(G.order).setAll().subtract(new BitSet(G.order, N));
        const cosets = [...N]; // accumulated cosets
        while (availableElements.popcount() > 0) {
            const cosetRep = availableElements.first();
            const coset = N.map((n) => G.mult(cosetRep, n)); // form coset as rep * N
            cosets.push(...coset);
            availableElements.subtract(new BitSet(G.order, coset)); // remove new coset from available
        }
        return cosets;
    }
    layoutNonNormalSubgroup(G /*: Group */, H /*: Subgroup */) {
        const availableElements = G.subgroups[G.subgroups.length - 1].members.clone().subtract(H.members);
        const subgroup = H.members.toArray();
        const cosets = [...subgroup]; // accumulated cosets
        while (availableElements.popcount() > 0) {
            const cosetRep = availableElements.first();
            const coset = subgroup.map((h) => G.mult(h, cosetRep)); // form coset as N * rep
            cosets.push(...coset);
            availableElements.subtract(new BitSet(G.order, coset)); // remove new coset from available
        }
        return cosets;
    }
    // Functions used by Sheet
    setSize(x /*: number */, y /*: number */) { this.view.setSize(x, y); }
    resize() { this.view.resize(); this.showGraphic(); }
    showGraphic() { this.view.queueShowGraphic(); }
    unitSquarePositions() { return this.view.unitSquarePositions(); }
    getImage() { return this.view.getImage(); }
    get canvas() { return this.view.canvas; }
    toJSON() { return this.model.toJSON(); }
    fromJSON(jsonObject) { this.model.fromJSON(jsonObject); }
    draw(group) { this.#group = group; }
}
export class MulttableView /*:: implements VizDisplay<MulttableJSON> */ {
    canvas; /*: HTMLCanvasElement */
    context; /*: CanvasRenderingContext2D */
    is_minimal_view; /*: boolean */
    show_request; /*: boolean */
    transform; /*: THREE.Matrix3 */
    translate; /*: {dx: number, dy: number} */
    zoomFactor; /*: number */
    constructor(options /*: MulttableViewOptions */ = {}) {
        this.canvas = ((document.createElement(`canvas`) /*: any */) /*: HTMLCanvasElement */);
        const container = options.container || document.createElement('div');
        container.appendChild(this.canvas);
        let width = container.offsetWidth || DEFAULT_CANVAS_WIDTH;
        let height = container.offsetHeight || DEFAULT_CANVAS_HEIGHT;
        this.setSize(width, height);
        this.context = this.canvas.getContext('2d');
        this.zoomFactor = 1; // user-supplied scale factor multiplier
        this.translate = { dx: 0, dy: 0 }; // user-supplied translation, in screen coordinates
        this.transform = new THREE.Matrix3();
        this.show_request = false;
    }
    get size() {
        return { w: this.canvas.width, h: this.canvas.height };
    }
    set size(newSize /*: {w: number, h: number} */) {
        const { w, h } = newSize;
        if (this.canvas.width != w || this.canvas.height != h) {
            this.canvas.width = Math.round(w);
            this.canvas.height = Math.round(h);
        }
    }
    getSize() {
        return this.size;
    }
    setSize(w /*: number */, h /*: number */) {
        this.size = { w, h };
    }
    resize() {
        if (this.canvas.parentElement != null) {
            const { width, height } = this.canvas.parentElement.getBoundingClientRect();
            this.size = { w: width, h: height };
        }
    }
    get group() {
        return this.viewModel.group;
    }
    get elements() {
        return this.viewModel.elements;
    }
    get highlightColors() {
        return this.viewModel.highlightColors;
    }
    get organizingSubgroup() {
        return this.viewModel.organizingSubgroup;
    }
    get separation() {
        return this.viewModel.separation;
    }
    get coloration() {
        return this.viewModel.coloration;
    }
    get colorReordering() {
        return this.viewModel.colorReordering;
    }
    ////////////////////////////// Drawing routines /////////////////////////////////////
    getImage() {
        this.showGraphic();
        const image = new Image();
        image.src = this.canvas.toDataURL();
        return image;
    }
    showGraphic() {
        this.show_request = false;
        if (this.group == undefined)
            return;
        if (this.is_minimal_view) {
            this.drawSimpleView();
        }
        else {
            this.drawFullView();
        }
        SheetEditor.broadcastChange();
    }
    queueShowGraphic() {
        if (!this.show_request) {
            this.show_request = true;
            setTimeout(() => this.showGraphic(), 0);
        }
    }
    // Simple graphic has no grouping, no labels, fits canvas exactly
    drawSimpleView() {
        const frac = (inx /*: number */, max /*: number */) => Math.round(max * inx / this.group.order);
        const colors = this.colors;
        const width = this.canvas.width;
        const height = this.canvas.height;
        this.elements.forEach((i, inx) => {
            this.elements.forEach((j, jnx) => {
                this.context.fillStyle = (colors[this.group.mult(j, i)] || DEFAULT_BACKGROUND).toString();
                this.context.fillRect(frac(inx, width), frac(jnx, height), frac(inx + 1, width), frac(jnx + 1, height));
            });
        });
    }
    // Write order X order matrix to canvas
    //   Resize canvas make labels readable
    //     Find longest label; find length of longest label as drawn
    //     Estimate the maximum number of rows that can occur (if a permutation is continued over multiple rows)
    //       if longest row is a permutation, expect that it can be formatted into a roughly square box
    //     Size the box so that it is
    //       at least 3 times the height of all the rows
    //       at least 25% longer than the longest row divided by the maximum number of rows expected
    //   Draw each box
    //     Color according to row/column product
    //     Write label in center, breaking permutation cycle text if necessary
    //
    // Separation slider maps [0,full scale] => [0, multtable.size]
    drawFullView() {
        // note that background shows through in separations between cosets
        this.context.setTransform(1, 0, 0, 1, 0, 0);
        this.context.fillStyle = DEFAULT_BACKGROUND;
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
        // set up scaling, translation from multtable units to screen pixels
        const scale = this.zoomFactor * Math.min(this.canvas.width / this.table_size, this.canvas.height / this.table_size);
        // translate center of scaled multtable to center of canvas
        let x_translate = (this.canvas.width - scale * this.table_size) / 2;
        let y_translate = (this.canvas.height - scale * this.table_size) / 2;
        this.context.setTransform(scale, 0, 0, scale, x_translate + this.translate.dx, y_translate + this.translate.dy);
        // find pre-image of screen so we don't iterate over elements that aren't displayed
        this.transform.set(scale, 0, x_translate + this.translate.dx, 0, scale, y_translate + this.translate.dy, 0, 0, 1);
        const UL = new THREE.Vector2(0, 0).applyMatrix3(this.transform.clone().invert());
        const LR = new THREE.Vector2(this.canvas.width, this.canvas.height).applyMatrix3(this.transform.clone().invert());
        const minX = this.index(UL.x) || 0;
        const minY = this.index(UL.y) || 0;
        const maxX = (((this.index(LR.x) /*: any */) /*: number */) + 1) || this.group.order;
        const maxY = (((this.index(LR.y) /*: any */) /*: number */) + 1) || this.group.order;
        const colors = this.colors;
        for (let inx = minX; inx < maxX; inx++) {
            for (let jnx = minY; jnx < maxY; jnx++) {
                const x = this.position(inx);
                const y = this.position(jnx);
                const product = this.group.mult(this.elements[jnx], this.elements[inx]);
                // color box according to product
                this.context.fillStyle = (colors[product] || DEFAULT_BACKGROUND).toString();
                this.context.fillRect(x, y, 1, 1);
                // draw borders if cell has border highlighting
                if (this.highlightColors[HIGHLIGHT_BORDER]?.[product] != null) {
                    this.drawBorder(x, y, scale, this.highlightColors[HIGHLIGHT_BORDER][product]);
                }
                // draw corner if cell has corner highlighting
                if (this.highlightColors[HIGHLIGHT_CORNER]?.[product] != null) {
                    this.drawCorner(x, y, scale, this.highlightColors[HIGHLIGHT_CORNER][product]);
                }
            }
        }
        // make scratch div that centers text horizontally and vertically
        // find longest label length
        // if permutation (starts with '(') then
        //   if longest label fits in 80% with font >= 12 use it just like non-permutation
        //   else
        //     estimate font size based on area of characters = area of box
        //     then correct for fact that number of lines is an integer:
        //       font box dimension: dim = (80% scale) = 0.8 * scale
        //       length of longest label, in 1px font characters: longest = this.group.longestHTMLLabel
        //       area of font box: area = estFontSize^2 longest = dim^2
        //          => estFontSize = dim / Math.sqrt(longest)
        //       estLineCount = Math.floor(dim / estFontSize)
        //       adjusted fontSize = estLineCount * (dim / longest)
        // else
        //   find font size that makes it 80% of box width (but not too big)?
        //   or has fontSize = scale / 3?
        //   fontSize = Math.min(50pt, 0.8 * width * / longest label, scale / 3)
        this.context.setTransform(1, 0, 0, 1, 0, 0);
        let fontSize = Math.min(1.33 * 50, scale / 3);
        const permutationLabels = this.group.representation[0].startsWith('(') ? Array(this.group.order) : null;
        if (permutationLabels != null) {
            const dim = 0.8 * scale;
            const longest = this.group.longestHTMLLabel;
            const estFontSize = dim / Math.sqrt(longest);
            const estLineCount = Math.max(4, Math.floor(dim / estFontSize));
            const estFontSize2 = 0.8 * Math.min(dim / estLineCount, estLineCount * dim / longest);
            fontSize = Math.min(fontSize, estFontSize2);
        }
        else {
            // fontSize ~ 80% width
            fontSize = Math.min(fontSize, 0.8 * scale / this.group.longestHTMLLabel);
        }
        // don't render labels if font is too small
        if (fontSize < MINIMUM_FONT) {
            return;
        }
        this.context.textAlign = (permutationLabels == null) ? 'center' : 'left';
        this.context.fillStyle = 'black';
        this.context.textBaseline = 'middle'; // fillText y coordinate is center of upper-case letter
        this.context.font = `${fontSize}px ${window.getComputedStyle(this.canvas).fontFamily}`;
        const labels = [];
        for (let inx = minX; inx < maxX; inx++) {
            for (let jnx = minY; jnx < maxY; jnx++) {
                const x = this.position(inx);
                const y = this.position(jnx);
                const product = this.group.mult(this.elements[jnx], this.elements[inx]);
                if (permutationLabels == null) {
                    this.drawLabel(x, y, product, scale, fontSize, labels);
                }
                else {
                    this.drawPermutationLabel(x, y, product, scale, fontSize, permutationLabels);
                }
            }
        }
    }
    drawBorder(x /*: number */, y /*: number */, scale /*: number */, color /*: color */) {
        this.context.beginPath();
        this.context.strokeStyle = color;
        this.context.lineWidth = 2 / scale;
        this.context.moveTo(x, y + 1 - 1 / scale);
        this.context.lineTo(x, y);
        this.context.lineTo(x + 1 - 1 / scale, y);
        this.context.stroke();
        this.context.beginPath();
        this.context.strokeStyle = 'black';
        this.context.lineWidth = 1 / scale;
        this.context.moveTo(x + 2.5 / scale, y + 1 - 2.5 / scale);
        this.context.lineTo(x + 2.5 / scale, y + 2.5 / scale);
        this.context.lineTo(x + 1 - 2.5 / scale, y + 2.5 / scale);
        this.context.lineTo(x + 1 - 2.5 / scale, y + 1 - 2. / scale);
        this.context.closePath();
        this.context.stroke();
    }
    drawCorner(x /*: number */, y /*: number */, scale /*: number */, color /*: color */) {
        this.context.fillStyle = color;
        this.context.beginPath();
        this.context.strokeStyle = 'black';
        this.context.moveTo(x, y);
        this.context.lineTo(x + 0.2, y);
        this.context.lineTo(x, y + 0.2);
        this.context.fill();
    }
    drawLabel(x /*: number */, y /*: number */, element /*: number */, scale /*: number */, fontScale /*: number */, labels /*: Array<> */) {
        const label = this.group.representation[element];
        if (labels[element] == null) {
            const canvasParent = (this.canvas.parentElement /*:: as any as HTMLElement */);
            canvasParent.insertAdjacentHTML('beforeend', `<canvas id="dummy-canvas" width=${scale} height=${scale} style="position: absolute; top: 0;
                left: 0; width: ${scale}; height: ${scale}; z-index: -1"></canvas>`);
            const canvas = (canvasParent.querySelector('#dummy-canvas') /*:: as any as HTMLCanvasElement */);
            GEUtils.htmlToContext(label, { fontSize: `${fontScale}px` }, canvas.getContext('2d'), new THREE.Vector2(scale / 2, scale / 2));
            labels[element] = canvas;
            canvas.remove();
        }
        const source = labels[element];
        const destLocation = new THREE.Vector2(x, y).applyMatrix3(this.transform);
        this.context.drawImage(source, ...destLocation.toArray());
    }
    drawPermutationLabel(x /*: number */, y /*: number */, element /*: number */, scale /*: number */, fontScale /*: number */, permutationLabels /*: Array<void | Array<string>> */) {
        const width = (text /*: string */) => (text === undefined) ? 0 : this.context.measureText(text).width;
        const label = this.group.representation[element];
        let permutationLabel = permutationLabels[element];
        if (permutationLabel === undefined) { // seen this label before?
            // store multi-line permutation label so it doesn't have to be calculated again
            // split whole label into multiple lines if needed
            const cycles = ((label.match(/[(][^)]*[)]/g) /*: any */) /*: RegExp$matchResult */);
            const lines /*: Array<string> */ = [];
            let last = 0;
            for (const cycle of cycles) {
                if (width(lines[last]) + width(cycle) < 0.8 * scale) {
                    lines[last] = (lines[last] == undefined) ? cycle : lines[last].concat(cycle);
                }
                else {
                    if (lines[last] != undefined) {
                        last++;
                    }
                    if (width(cycle) < 0.8 * scale) {
                        lines[last] = cycle;
                    }
                    else {
                        // cut cycle up into row-sized pieces
                        const widthPerCharacter = width(cycle) / cycle.length;
                        const charactersPerLine = Math.ceil(0.8 * scale / widthPerCharacter);
                        for (let c = cycle;;) {
                            if (width(c) < 0.8 * scale) {
                                lines[last++] = c;
                                break;
                            }
                            else {
                                lines[last++] = c.slice(0, c.lastIndexOf(' ', charactersPerLine));
                                c = c.slice(c.lastIndexOf(' ', charactersPerLine)).trim();
                            }
                        }
                    }
                }
            }
            permutationLabels[element] = permutationLabel = lines;
        }
        const fontHeight = fontScale;
        const labelLocation = new THREE.Vector2(x + 1 / 2, y + 1 / 2).applyMatrix3(this.transform);
        const maxLineWidth = permutationLabel.reduce((max, line /*: string */) => Math.max(max, width(line)), 0);
        let xStart = labelLocation.x - maxLineWidth / 2;
        let yStart = labelLocation.y - fontHeight * (permutationLabel.length - 1) / 2;
        for (const line /*: string */ of permutationLabel) {
            this.context.fillText(line, xStart, yStart);
            yStart += fontHeight;
        }
    }
    // interface for zoom-to-fit GUI command
    resetZoom() {
        this.queueShowGraphic();
        this.zoomFactor = 1;
        this.translate = { dx: 0, dy: 0 };
    }
    zoom(factor /*: number */) {
        this.queueShowGraphic();
        this.zoomFactor = this.zoomFactor * factor;
        this.move(this.translate.dx * (factor - 1), this.translate.dy * (factor - 1)); // keep model centered in canvas
        return this;
    }
    // deltaX, deltaY are in screen coordinates
    move(deltaX /*: number */, deltaY /*: number */) {
        this.translate.dx += deltaX;
        this.translate.dy += deltaY;
        return this;
    }
    // Compute Multtable 0-based row, column from canvas-relative screen coordinates by inverting this.transform
    //   returns null if point is outside Multtable
    xy2rowXcol(canvasX /*: number */, canvasY /*: number */) {
        const mult = new THREE.Vector2(canvasX, canvasY).applyMatrix3(this.transform.clone().invert());
        const x = this.index(mult.x);
        const y = this.index(mult.y);
        return (x == undefined || y == undefined) ? null : { col: x, row: y };
    }
    // Be able to answer the question of where in the diagram any given element is drawn.
    // We answer in normalized coordinates, [0,1]x[0,1].
    unitSquarePosition(element /*: groupElement */) {
        const max = this.position(this.group.order - 1) + 1;
        const index = this.elements.indexOf(element);
        return { x: 0.5 / max, y: (this.position(index) + 0.5) / max };
    }
    unitSquarePositions() {
        const max = this.position(this.group.order - 1) + 1;
        const unit_square_positions = this.group.elements.map((element) => {
            const index = this.elements.indexOf(element);
            return new THREE.Vector2(0.5 / max, (this.position(index) + 0.5) / max);
        });
        return unit_square_positions;
    }
    get colors() {
        let colorArray;
        if (this.highlightColors?.[HIGHLIGHT_BACKGROUND].length) {
            colorArray = this.highlightColors[HIGHLIGHT_BACKGROUND];
        }
        else {
            const frac = (inx /*: number */, max /*: number */, min /*: number */) => Math.round(min + inx * (max - min) / this.group.order);
            let fn;
            switch (this.coloration) {
                case 'rainbow':
                    fn = (inx /*: number */) => GEUtils.fromRainbow(frac(inx, 100, 0) / 100);
                    break;
                case 'grayscale':
                    fn = (inx /*: number */) => {
                        const lev = frac(inx, 255, 60); // start at 60 (too dark and you can't see the label)
                        return `rgb(${lev}, ${lev}, ${lev})`;
                    };
                    break;
                case 'none':
                    fn = (inx /*: number */) => DEFAULT_BACKGROUND;
                    break;
            }
            if (this.colorReordering === 'elementColorsFixed') {
                colorArray = this.group.elements.map((_el, inx) => fn(inx));
            }
            else {
                colorArray = (this.elements.map((el, inx) => [inx, el]) /*: Array<[number, groupElement]> */)
                    .sort(([_a, x], [_b, y]) => x - y)
                    .map(([inx, _]) => fn(inx));
            }
        }
        return colorArray;
    }
    get stride() {
        return (this.organizingSubgroup == null)
            ? this.group.order
            : this.group.subgroups[this.organizingSubgroup].order;
    }
    get table_size() {
        return this.group.order + this.separation * ((this.group.order / this.stride) - 1);
    }
    // assumes index is in range [0, group.order]
    position(index /*: number */) {
        return index + this.separation * Math.floor(index / this.stride);
    }
    index(position /*: number */) {
        const inx = Math.floor(position - this.separation * Math.floor(position / (this.stride + this.separation)));
        return (inx < 0 || inx > this.group.order - 1) ? undefined : inx;
    }
    clampedIndex(position /*: number */) {
        const inx = Math.floor(position - this.separation * Math.floor(position / (this.stride + this.separation)));
        return Math.max(0, Math.min(this.group.order, inx));
    }
}
//////////////////////////////   Factory methods   //////////////////////////////
function createMinimalMulttableView(options /*: MulttableViewOptions */ = {}) {
    const viewModel = new MulttableViewModel();
    const view = new MulttableView(options);
    view.is_minimal_view = true;
    // assemble parts
    view.viewModel = viewModel;
    viewModel.view = view;
    return viewModel;
}
function createLargeMulttableView(model /*: SubscriptionProxy<MulttaleModel> */, options /*: MulttableOptions */ = {}) {
    const viewModel = new MulttableViewModel();
    const view = new MulttableView(options);
    view.displays_labels = true;
    // assemble parts
    viewModel.model = model;
    view.viewModel = viewModel;
    viewModel.view = view;
    return viewModel;
}
function createInteractiveMulttableView(model /*: SubscriptionProxy<MulttaleModel> */, options /*: MulttableOptions */ = {}) {
    const viewModel = createLargeMulttableView(model, options);
    MulttableViewUI.addGestures(viewModel);
    return viewModel;
}
//# sourceMappingURL=MulttableView.js.map
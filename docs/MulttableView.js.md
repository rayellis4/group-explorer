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

import {BitSet} from './BitSet.js'
import {createModelProxy} from './GEUtils.js'
import * as Log from './Log.js'
import {MulttableModel} from './MulttableModel.js'
import * as MulttableViewUI from './MulttableViewUI.js'
import * as GEUtils from './GEUtils.js'
import * as SheetEditor from './SheetEditor.js'

import {THREE} from '../lib/externals.js'

export {
   createMinimalMulttableView,
   createLargeMulttableView,
   createInteractiveMulttableView,
}
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

const DEFAULT_CANVAS_HEIGHT = 96
const DEFAULT_CANVAS_WIDTH = 96
const ZOOM_STEP = 0.002
const MINIMUM_FONT = 6
const DEFAULT_BACKGROUND = '#E5E5E5';

const HIGHLIGHT_BACKGROUND = 0
const HIGHLIGHT_BORDER = 1
const HIGHLIGHT_CORNER = 2
const highlightNames = ['background', 'border', 'corner']

export class MulttableViewModel /*:: implements Updatable */ {
   #model /*: MulttableModel */
   #view /*: MulttableView */
   modelFields /*: Array<string> */ = [
      'group',
      'elements',
      'separation',
      'organizingSubgroup',
      'coloration',
      'colorReordering',
      'highlights'
   ]

   get group () /*: Group */ {
      return this.model.group
   }

   get view () /*: MulttableView */ {
      return this.#view
   }

   set view (view /*: MulttableView */) {
      this.#view = view
      view.group = this.group
   }

   get model () /*: MulttableModel */ {
      return this.#model
   }

   set model (multtableModel /*: SubscriptionProxy<MulttableModel> */) {
      this.#model = multtableModel
      this.modelFields.forEach((field) => {
         multtableModel.$subscribe(this, field)
         this.update(field, this.model[field])
      })
   }

   updateModel (field /*: string */, value /*: any */) {
      // $FlowExpectedError[prop-missing] --
      this.model[field] = value
   }

   update (field /*: string */, value /*: any */) {
      if (this.view == null) {
         return
      }
      switch (field) {
      case 'group':
      case 'elements':
      case 'separation':
      case 'coloration':
      case 'colorReordering':
      case 'organizingSubgroup':
         this.view[field] = value
         break
      case 'highlights':
         this.view['highlightColors'] = value ?? [[], [], []]
         this.view.queueShowGraphic()
         break
      default:
         Log.info(`unsupported field ${field} in MulttableView.MulttableViewModel.updateView`)
         break
      }
   }

   setSize (x /*: number */, y /*: number */) {
      this.view.setSize(x, y)
   }

   resize () {
      this.view.resize()
   }

   showGraphic () {
      this.view.queueShowGraphic()
   }

   unitSquarePositions () {
      return this.view.unitSquarePositions()
   }

   get canvas () /*: HTMLCanvasElement */ {
      return this.view.canvas
   }

   toJSON () {
      return this.model.toJSON()
   }

   fromJSON (jsonObject) {
      if (jsonObject != null) {
         this.model.fromJSON(jsonObject)
         this.model.highlightControl = jsonObject.highlightControl
      }
   }
}

export class MulttableView /*:: implements VizDisplay<MulttableJSON> */ {
   backgrounds /*: void | Array<color> */
   borders /*: void | Array<color | void> */
   canvas /*: HTMLCanvasElement */
   _colorReordering /*: ColorReordering */
   _coloration /*: Coloration */
   _colors /*: ?Array<color> */
   context /*: CanvasRenderingContext2D */
   corners /*: void | Array<color | void> */
   elements /*: Array<groupElement> */
   _group /*: Group */
   highlightColors /*: Array<Array<color>> */ = [[], [], []]
   highlightControl /*: ?HighlightControlJSON */ = null
   is_minimal_view /*: boolean */
   labelCache /*: Array<HTMLCanvasElement> */
   options /*: MulttableViewOptions */
   #organizingSubgroup /*: number */
   permutationLabels /*: void | Array<void | Array<string>> */
   _separation /*: number */
   show_request /*: boolean */
   transform /*: THREE.Matrix3 */
   translate /*: {dx: number, dy: number} */
   zoomFactor /*: number */

   constructor (options /*: MulttableViewOptions */ = {}) {
        this.canvas = ((document.createElement(`canvas`) /*: any */) /*: HTMLCanvasElement */)
        const container = options.container  || document.createElement('div')
        container.appendChild(this.canvas)
        let width = container.offsetWidth || DEFAULT_CANVAS_WIDTH
        let height = container.offsetHeight || DEFAULT_CANVAS_HEIGHT
        this.setSize( width, height );
        this.context = this.canvas.getContext('2d');
        this.options = options;
        this.zoomFactor = 1;  // user-supplied scale factor multiplier
        this.translate = {dx: 0, dy: 0};  // user-supplied translation, in screen coordinates
        this.transform = new THREE.Matrix3();
        this.highlightColors = [[], [], []]

        this.show_request = false;

        this.labelCache = []

        if (options.group != null)
           this.group = options.group
    }

    get size () /*: {w: number, h: number} */ {
        return {w: this.canvas.width, h: this.canvas.height};
    }

    set size (newSize /*: {w: number, h: number} */) {
       const {w, h} = newSize
        if (this.canvas.width != w || this.canvas.height != h) {
            this.canvas.width = Math.round(w)
            this.canvas.height = Math.round(h)
            this.queueShowGraphic();
        }
    }

    getSize () /*: {w: number, h: number} */ {
        return this.size;
    }

    setSize (w /*: number */, h /*: number */){
        this.size = {w, h};
    }

    resize () {
        if (this.canvas.parentElement != null) {
           const {width, height} = this.canvas.parentElement.getBoundingClientRect()
           this.size = {w: width, h: height};
        }
    }

    getImage () /*: Image */ {
        this.showGraphic();
        const image = new Image();
        image.src = this.canvas.toDataURL();
        return image;
    }

    showGraphic () {
        this.show_request = false;

        if (this.group == undefined)
            return;

        if (this.is_minimal_view) {
            this.drawSimpleView();
        } else {
            this.drawFullView();
        }

        SheetEditor.broadcastChange()
    }

    queueShowGraphic () {
        if (!this.show_request) {
            this.show_request = true;
            setTimeout( () => this.showGraphic(), 0 );
        }
    }

    // Simple graphic has no grouping, no labels, fits canvas exactly
    drawSimpleView () {
        const frac = (inx /*: number */, max /*: number */) => Math.round(max * inx / this.group.order);
        const colors = this.colors;

        const width = this.canvas.width;
        const height = this.canvas.height;
        this.elements.forEach( (i,inx) => {
            this.elements.forEach( (j,jnx) => {
                this.context.fillStyle = (colors[this.group.mult(j,i)] || DEFAULT_BACKGROUND).toString();
                this.context.fillRect(frac(inx, width), frac(jnx, height), frac(inx+1, width), frac(jnx+1, height));
            } )
        } )
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
    drawFullView () {
        // note that background shows through in separations between cosets
        this.context.setTransform(1, 0, 0, 1, 0, 0);
        this.context.fillStyle = DEFAULT_BACKGROUND;
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // set up scaling, translation from multtable units to screen pixels
        const scale = this.zoomFactor * Math.min(this.canvas.width / this.table_size, this.canvas.height / this.table_size, 200);

        // translate center of scaled multtable to center of canvas
        let x_translate = (this.canvas.width - scale*this.table_size)/2;
        let y_translate = (this.canvas.height - scale*this.table_size)/2;
        this.context.setTransform(scale, 0, 0, scale, x_translate + this.translate.dx, y_translate + this.translate.dy);

        // find pre-image of screen so we don't iterate over elements that aren't displayed
        this.transform.set(scale, 0,     x_translate + this.translate.dx,
                           0,     scale, y_translate + this.translate.dy,
                           0,     0,     1);
        const UL = new THREE.Vector2(0, 0).applyMatrix3(this.transform.clone().invert())
        const LR = new THREE.Vector2(this.canvas.width, this.canvas.height).applyMatrix3(this.transform.clone().invert())

        const minX = this.index(UL.x) || 0;
        const minY = this.index(UL.y) || 0;
        const maxX = (((this.index(LR.x) /*: any */) /*: number */) + 1) || this.group.order;
        const maxY = (((this.index(LR.y) /*: any */) /*: number */) + 1) || this.group.order;

        for (let inx = minX; inx < maxX; inx++) {
            for (let jnx = minY; jnx < maxY; jnx++) {
                const x = this.position(inx);
                const y = this.position(jnx);

                const product = this.group.mult(this.elements[jnx], this.elements[inx]);

                // color box according to product
                this.context.fillStyle = (this.colors[product] || DEFAULT_BACKGROUND).toString();
                this.context.fillRect(x, y, 1, 1);

                // draw borders if cell has border highlighting
                if (this.highlightColors[HIGHLIGHT_BORDER]?.[product] != null) {
                    this._drawBorder(x, y, scale, this.highlightColors[HIGHLIGHT_BORDER][product])
                }

                // draw corner if cell has corner highlighting
                if (this.highlightColors[HIGHLIGHT_CORNER]?.[product] != null) {
                    this._drawCorner(x, y, scale, this.highlightColors[HIGHLIGHT_CORNER][product])
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

        let fontSize = Math.min(1.33 * 50, scale / 3)
        if (this.permutationLabels) {
            const dim = 0.8 * scale
            const longest = this.group.longestHTMLLabel
            const estFontSize = dim / Math.sqrt(longest)
            const estLineCount = Math.max(4, Math.floor(dim / estFontSize))
            const estFontSize2 = 0.8 * Math.min(dim / estLineCount, estLineCount * dim / longest)
            fontSize = Math.min(fontSize, estFontSize2)
        } else {
            // fontSize ~ 80% width
            fontSize = Math.min(fontSize, 0.8 * scale / this.group.longestHTMLLabel)
        }


        // don't render labels if font is too small
        if (fontSize < MINIMUM_FONT) {
            return;
        }

        this.context.textAlign = (this.permutationLabels === undefined) ? 'center' : 'left';
        this.context.fillStyle = 'black';
        this.context.textBaseline = 'middle';  // fillText y coordinate is center of upper-case letter
        this.context.font = `${fontSize}px ${window.getComputedStyle(this.canvas).fontFamily}`

        let scratch
        if (this.permutationLabels == null) {
            if (this.labelCache.length != 0 && parseInt(this.labelCache[0].style.fontSize) != fontSize) {
                this.labelCache = []
            }

           const canvasParent = (this.canvas.parentElement /*:: as any as HTMLElement */)
           canvasParent.insertAdjacentHTML('beforeend', `<div id="scratchId" style="position: absolute;
               textAlign: center; width: auto; height: auto; top: 0; z-index: -1; font-size: ${fontSize}px"></div>`)
           scratch = (canvasParent.querySelector('#scratchId') /*:: as any as HTMLElement */)
        }

        for (let inx = minX; inx < maxX; inx++) {
            for (let jnx = minY; jnx < maxY; jnx++) {
                const x = this.position(inx);
                const y = this.position(jnx);
                const product = this.group.mult(this.elements[jnx], this.elements[inx]);
                if (this.permutationLabels == null) {
                    this._drawLabel(x, y, product, scale, fontSize, (scratch /*:: as any as HTMLElement */))
                } else {
                    this._drawPermutationLabel(x, y, product, scale, fontSize);
                }
            }
        }

        if (scratch != null) {
            scratch.remove()
        }
    }

    _drawBorder (x /*: number */, y /*: number */, scale /*: number */, color /*: color */) {
        this.context.beginPath();
        this.context.strokeStyle = color;
        this.context.lineWidth = 2 / scale;
        this.context.moveTo(x, y+1-1/scale);
        this.context.lineTo(x, y);
        this.context.lineTo(x+1-1/scale, y);
        this.context.stroke();

        this.context.beginPath();
        this.context.strokeStyle = 'black';
        this.context.lineWidth = 1 / scale;
        this.context.moveTo(x+2.5/scale, y+1-2.5/scale);
        this.context.lineTo(x+2.5/scale, y+2.5/scale);
        this.context.lineTo(x+1-2.5/scale, y+2.5/scale);
        this.context.lineTo(x+1-2.5/scale, y+1-2./scale);
        this.context.closePath();
        this.context.stroke();
    }

    _drawCorner (x /*: number */, y /*: number */, scale /*: number */, color /*: color */) {
        this.context.fillStyle = color;
        this.context.beginPath();
        this.context.strokeStyle = 'black';
        this.context.moveTo(x, y);
        this.context.lineTo(x+0.2, y);
        this.context.lineTo(x, y+0.2);
        this.context.fill();
    }

    _drawLabel (
        x /*: number */,
        y /*: number */,
        element /*: number */,
        scale /*: number */,
        fontScale /*: number */,
        scratch /*: HTMLElement */
    ) {
        const label = this.group.representation[element];

        if (this.labelCache[element] == null) {
            scratch.innerHTML = label

            const canvasParent = (this.canvas.parentElement /*:: as any as HTMLElement */)
            canvasParent.insertAdjacentHTML('beforeend',
                `<canvas id="dummy-canvas" width=${scale} height=${scale} style="position: absolute; top: 0;
                left: 0; width: ${scale}; height: ${scale}; z-index: -1"></canvas>`)
           const canvas = (canvasParent.querySelector('#dummy-canvas') /*:: as any as HTMLCanvasElement */)

            const labelCenter = new THREE.Vector2(scale / 2, scale / 2)
            GEUtils.htmlToContext(scratch, canvas.getContext('2d'), labelCenter)

            this.labelCache[element] = canvas
            canvas.remove()
        }

        const source = this.labelCache[element]
        const destLocation = new THREE.Vector2(x, y).applyMatrix3(this.transform)
        this.context.drawImage(source, ...destLocation.toArray())
    }

    _drawPermutationLabel (
        x /*: number */,
        y /*: number */,
        element /*: number */,
        scale /*: number */,
        fontScale /*: number */
    ) {
        const width = (text /*: string */) => (text === undefined) ? 0 : this.context.measureText(text).width;

        const label = this.group.representation[element];
        const permutationLabels = ((this.permutationLabels /*: any */) /*: Array<void | Array<string>> */)
        let permutationLabel = permutationLabels[element];
        if (permutationLabel === undefined) {   // seen this label before?
            // store multi-line permutation label so it doesn't have to be calculated again
            // split whole label into multiple lines if needed
            const cycles = ((label.match(/[(][^)]*[)]/g) /*: any */) /*: RegExp$matchResult */);
            const lines /*: Array<string> */ = [];
            let last = 0;
            for (const cycle of cycles) {
                if (width(lines[last]) + width(cycle) < 0.8 * scale) {
                    lines[last] = (lines[last] == undefined) ? cycle : lines[last].concat(cycle);
                } else {
                    if (lines[last] != undefined) {
                        last++;
                    }
                    if (width(cycle) < 0.8 * scale) {
                        lines[last] = cycle;
                    } else {
                        // cut cycle up into row-sized pieces
                        const widthPerCharacter = width(cycle) / cycle.length;
                        const charactersPerLine = Math.ceil(0.8 * scale / widthPerCharacter);
                        for (let c = cycle;;) {
                            if (width(c) < 0.8 * scale) {
                                lines[last++] = c;
                                break;
                            } else {
                                lines[last++] = c.slice(0, c.lastIndexOf(' ', charactersPerLine));
                                c = c.slice(c.lastIndexOf(' ', charactersPerLine)).trim();
                            }
                        }
                    }
                }
            }

            permutationLabels[element] = permutationLabel = lines;
        }

        const fontHeight = fontScale
        const labelLocation = new THREE.Vector2(x+1/2, y+1/2).applyMatrix3(this.transform);
        const maxLineWidth = permutationLabel.reduce( (max, line /*: string */) => Math.max(max, width(line)), 0 );
        let xStart = labelLocation.x - maxLineWidth/2;
        let yStart = labelLocation.y - fontHeight*(permutationLabel.length - 1)/2;
        for (const line /*: string */ of permutationLabel) {
            this.context.fillText(line, xStart, yStart);
            yStart += fontHeight;
        }
    }

    // interface for zoom-to-fit GUI command
    resetZoom () {
        this.queueShowGraphic();
        this.zoomFactor = 1;
        this.translate = {dx: 0, dy: 0};
    }

    zoom (factor /*: number */) /*: this */{
        this.queueShowGraphic();
        this.zoomFactor = this.zoomFactor * factor;
        this.move(this.translate.dx * (factor - 1), this.translate.dy * (factor - 1));  // keep model centered in canvas

        return this;
    }

    // deltaX, deltaY are in screen coordinates
   move (deltaX /*: number */, deltaY /*: number */) /*: this */ {
        this.translate.dx += deltaX;
        this.translate.dy += deltaY;
        return this;
    }

    // Compute Multtable 0-based row, column from canvas-relative screen coordinates by inverting this.transform
    //   returns null if point is outside Multtable
    xy2rowXcol (canvasX /*: number */, canvasY /*: number */) /*: ?{row: number, col: number} */ {
        const mult = new THREE.Vector2(canvasX, canvasY).applyMatrix3(this.transform.clone().invert())
        const x = this.index(mult.x);
        const y = this.index(mult.y);
        return (x == undefined || y == undefined) ? null : {col: x, row: y};
    }

    // Be able to answer the question of where in the diagram any given element is drawn.
    // We answer in normalized coordinates, [0,1]x[0,1].
    unitSquarePosition (element /*: groupElement */) /*: {x: number, y: number} */ {
        const max = this.position( this.group.order - 1 ) + 1;
        const index = this.elements.indexOf( element );
        return { x: 0.5 / max, y: ( this.position( index ) + 0.5 ) / max };
    }

    unitSquarePositions () /*: Array<THREE.Vector2> */ {
        const max = this.position( this.group.order - 1 ) + 1;

        const unit_square_positions = this.group.elements.map( (element) => {
            const index = this.elements.indexOf( element );
            return new THREE.Vector2(0.5 / max, ( this.position( index ) + 0.5 ) / max);
        } );

        return unit_square_positions;
    }

    ////////////////////////////////////////////////////////////////////////////////

   get group () /*: Group */ {
        return this._group;
    }

    set group (group /*: Group */) {
        if (this._group != group) {
            this._group = group;
            this.elements = [...this.group.elements];
            this.reset();
            this.showGraphic();
        }
    }

    reset() {
        this.permutationLabels = this.group.representation[0].startsWith('(') ? Array(this.group.order) : undefined;
        this.separation = 0;
        this.organizingSubgroup = null
        this.coloration = 'rainbow';
        this.colorReordering = 'topRowFixed'
        this.clearHighlights();
    }

    get organizingSubgroup () {
        return this.#organizingSubgroup
    }

    set organizingSubgroup (subgroupIndex /*: ?number */) {
        this.#organizingSubgroup = subgroupIndex

        const index = subgroupIndex ?? this.group.subgroups.length - 1
        this.queueShowGraphic();

        // returns an Array of the group elements organized by subgroup cosets
        function org (group /*: Group */, subgroup /*: Subgroup */) /*: Array<groupElement> */{
            // find the largest proper subgroup of subgroup that is normal in subgroup
            const subSubGroups = subgroup.isomorphicGroup.subgroups
            const largestNormalSubgroup = subSubGroups
                .reduce((N, H, inx) => (H.isNormal && inx != subSubGroups.length - 1) ? H : N)

            // recursively order subgroup by its largestNormalSubgroup
            const subgroupElementArray = (largestNormalSubgroup.order == 1)
                ? subgroup.members.toArray()
                : org(subgroup.isomorphicGroup, largestNormalSubgroup)
                    .map((el) => subgroup.isomorphicGroupEmbedding[el])

            // order group by subgroup
            const result = group
               .getCosets(new BitSet(group.order, subgroupElementArray), false)
               .map((coset) => (coset.first() /*:: as any as groupElement */))
               .map((rep) => subgroupElementArray.map((el) => group.mult(el, rep)))
               .flat()

            return result
        }
        this.elements = org(this.group, this.group.subgroups[index])

        this._colors = null;
    }

    get separation () /*: number */ {
        if (this._separation == undefined) {
            this._separation = 0;
        }
        return this._separation;
    }

    set separation (separation /*: number */) {
        this.queueShowGraphic();
        this._separation = separation;
    }

    get colors () /*: Array<color> */ {
        let result;
        if (this.highlightColors?.[HIGHLIGHT_BACKGROUND].length) {
            result = this.highlightColors[HIGHLIGHT_BACKGROUND]
        } else if (this._colors != undefined) {
            result = this._colors;
        } else {
            const frac = (inx /*: number */, max /*: number */, min /*: number */) =>
                Math.round(min + inx * (max - min) / this.group.order)

            let fn;
            switch (this.coloration) {
            case 'rainbow':
                fn = (inx /*: number */) => GEUtils.fromRainbow(frac(inx, 100, 0)/100);
                break;
            case 'grayscale':
                fn = (inx /*: number */) => {
                    const lev = frac(inx, 255, 60);  // start at 60 (too dark and you can't see the label)
                    return `rgb(${lev}, ${lev}, ${lev})`;
                };
                break;
            case 'none':
                fn = (inx /*: number */) => DEFAULT_BACKGROUND;
                break;
            }

            if (this.colorReordering === 'elementColorsFixed') {
                this._colors = result = this.group.elements.map((_el, inx) => fn(inx))
            } else {
                this._colors = result = (this.elements.map( (el,inx) => [inx, el] ) /*: Array<[number, groupElement]> */)
                    .sort( ([_a, x], [_b, y]) => x - y )
                    .map( ([inx,_]) => fn(inx) )
            }
        }

        return result;
    }

    get coloration () /*: Coloration */ {
        return this._coloration;
    }

    set coloration (coloration /*: Coloration */) {
        this.queueShowGraphic();
        this._coloration = coloration;
        this._colors = null;
    }

    get colorReordering () /*: ColorReordering */ {
      return this._colorReordering
    }

    set colorReordering (colorReordering /*: ColorReordering */) /*: ColorReordering */ {
      this.queueShowGraphic()
      this._colorReordering = colorReordering
      this._colors = null
      return this._colorReordering
    }

    get stride () /*: number */ {
       return (this.organizingSubgroup == null)
          ? this.group.order
          : this.group.subgroups[this.organizingSubgroup].order;
    }

    get table_size () /*: number */ {
        return this.group.order + this.separation * ((this.group.order/this.stride) - 1);
    }

    swap (i /*: number */, j /*: number */) {
        this.queueShowGraphic();
        // $FlowExpectedError[unsupported-syntax]
        [this.elements[i], this.elements[j]] = [this.elements[j], this.elements[i]];
        this.viewModel.updateModel('elements', this.elements)
        this._colors = null;
    }

    // assumes index is in range [0, group.order]
    position (index /*: number */) /*: number */ {
        return index + this.separation * Math.floor(index/this.stride);
    }

    index (position /*: number */) /*: void | number */ {
        const inx = Math.floor(position - this.separation * Math.floor(position / (this.stride + this.separation)));
        return (inx < 0 || inx > this.group.order - 1) ? undefined : inx;
    }

    clampedIndex (position /*: number */) /*: number */ {
        const inx = Math.floor(position - this.separation * Math.floor(position / (this.stride + this.separation)));
        return Math.max(0, Math.min(this.group.order, inx));
    }

    /*
     * Highlight routines
     *   if only one color is needed (a common case) make each highlight color different
     *   if n colors are needed just start with hsl(0,100%,80%) and move 360/n for each new color
     */

    getAllHighlighters () /*: Array<Highlighter> */ {
        const highlighters = highlightNames
          .map((name, inx) => {
             const highlighter /*: Highlighter */ = (elementColors)  => {
                this.queueShowGraphic()
                this.highlightColors[inx] = elementColors
             }
             highlighter.label = name
             return highlighter
          })
       return highlighters
    }

    clearHighlights () {
        this.queueShowGraphic();
        this.highlightColors = [[], [], []]
    }


    //////////////////////////////   JSON routines   //////////////////////////////

    // two serialization functions
    toJSON () /*: MulttableJSON */ {
        const json = {
            groupURL: this.group.URL,
            elements: Array.from(this.elements),
            separation: this.separation,
            organizingSubgroup: this.organizingSubgroup,
            coloration: this.coloration,
            colorReordering: this.colorReordering,
            highlightColors: this.highlightColors,
            highlightControl: this.highlightControl
        }

        return json;
    }

    fromJSON (json /*: MulttableJSON */) {
        if (json == null) {
            return
        }

        Object.keys(json).forEach( (name) => {
            switch (name) {
            case 'elements':            this.elements = json.elements;                                  break;
            case 'separation':          this.separation = json.separation;                              break;
            case 'organizingSubgroup':  this.organizingSubgroup = json.organizingSubgroup;              break;
            case 'coloration':          this.coloration = json.coloration;                              break;
            case 'colorReordering':     this.colorReordering = json.colorReordering || 'topRowFixed';   break;
            case 'highlightColors':     this.highlightColors = json.highlightColors;                    break;
            case 'highlightControl':    this.highlightControl = json.highlightControl;                  break;
            default:                                                                                    break;
            }
        } );

        this.queueShowGraphic();
    }
}

// no labels, no separation, no zoom, no translate, no highlights
function createMinimalMulttableView (options /*: MulttableViewOptions */ = {}) /*: MulttableView */ {
    const view = new MulttableView(options);
    view.is_minimal_view = true;
    return view;
}

function createLargeMulttableView (
   group /*: Group */,
   options /*: MulttableOptions */ = {}
) /*: MulttableViewModel */ {
   const model = createModelProxy(new MulttableModel(group))
   const viewModel = new MulttableViewModel()
   const view = new MulttableView(options)
   view.displays_labels = true

   // assemble parts
   viewModel.model = model
   viewModel.view = view
   view.viewModel = viewModel

   return viewModel
}

function createInteractiveMulttableView (
   group /*: Group */,
   options /*: MulttableOptions */ = {}
) /*: MulttableViewModel */ {
   const viewModel = createLargeMulttableView(group, options)
   MulttableViewUI.addGestures(viewModel.view)

   return viewModel
}

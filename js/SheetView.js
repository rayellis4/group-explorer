/*

# SheetView

The View part of the Sheet Model-View-Controller structure.

```javascript
 */
/* global DOMRect MouseEvent ResizeObserver TouchEvent Touch */
import * as THREE from '../lib/externals.js';
import { CayleyDiagramModel } from './CayleyDiagramModel.js';
import { createStaticCayleyDiagramView, layoutToJSON } from './CayleyDiagramView.js';
import { CycleGraphModel } from './CycleGraphModel.js';
import { createLargeCycleGraphView } from './CycleGraphView.js';
import { createModelProxy, isSerializable } from './GEUtils.js';
import { MulttableModel } from './MulttableModel.js';
import { createLargeMulttableView } from './MulttableView.js';
let Graphic;
export let graphicRect = new DOMRect(0, 0, 0, 0);
let PixelsPerModelUnit = 0;
export let zoomFactor = 1;
let panVector; // pan offset in graphic pixels
let _view = null; // set by View constructor; used by module-level functions
export function init() {
    Graphic = document.getElementById('graphic');
    graphicRect = Graphic.getBoundingClientRect();
    PixelsPerModelUnit = Math.min(graphicRect.width, graphicRect.height);
    panVector = new THREE.Vector2();
    new ResizeObserver((entries) => {
        if (entries.findIndex((entry) => entry.target.id === 'graphic') !== -1) {
            graphicRect = Graphic.getBoundingClientRect();
        }
    }).observe(document.getElementById('graphic'));
}
// Model coordinates: the coordinate system the sheet model uses (pre-zoom, pre-pan,
// relative to #graphic origin). All SheetElement positions are stored in these units.
// Display coordinates: graphic-relative pixels as positioned by CSS transforms
// (post-zoom, post-pan, relative to #graphic origin).
function graphicCenter() {
    return new THREE.Vector2(graphicRect.width, graphicRect.height).multiplyScalar(0.5);
}
export function modelToDisplay(pt) {
    const center = graphicCenter();
    return pt.clone().sub(center).multiplyScalar(zoomFactor).add(center).add(panVector);
}
export function displayToModel(pt) {
    const center = graphicCenter();
    return pt.clone().sub(panVector).sub(center).multiplyScalar(1 / zoomFactor).add(center);
}
export function fromEvent(event) {
    let windowX = 0;
    let windowY = 0;
    if (event instanceof MouseEvent
        || (typeof Touch !== 'undefined' && event instanceof Touch)) {
        windowX = event.clientX;
        windowY = event.clientY;
    }
    else if (typeof TouchEvent !== 'undefined' && event instanceof TouchEvent) {
        if (event.type === 'touchend') {
            windowX = event.changedTouches[0].clientX;
            windowY = event.changedTouches[0].clientY;
        }
        else if (event.touches.length === 1) {
            windowX = event.touches[0].clientX;
            windowY = event.touches[0].clientY;
        }
        else { // average position of touches
            ;
            [windowX, windowY] = Array.from(event.touches)
                .reduce(([x, y], touch) => [x + touch.clientX, y + touch.clientY], [0, 0])
                .map((pos) => pos / event.touches.length);
        }
    }
    return displayToModel(new THREE.Vector2(windowX - graphicRect.x, windowY - graphicRect.y));
}
// pan Sheet by {dx, dy} display pixels
export function pan(dx, dy) {
    panVector.set(panVector.x + dx, panVector.y + dy);
    updateTransforms();
}
export function zoom(scaleFactor) {
    zoomFactor *= scaleFactor;
    updateTransforms();
}
export function redrawAll() {
    graphicRect = Graphic.getBoundingClientRect();
    PixelsPerModelUnit = Math.min(graphicRect.width, graphicRect.height);
    panVector.set(0, 0);
    zoomFactor = 1;
    updateTransforms();
    _view?.viewElements.forEach((viewEl) => {
        if ('isLink' in viewEl.modelElement)
            viewEl.redraw();
    });
    setTimeout(() => redrawNodes(), 0);
}
function updateTransforms() {
    _view?.viewElements.forEach((viewEl) => viewEl.updateTransform());
}
function redrawNodes() {
    _view?.viewElements.forEach((viewEl) => {
        if ('isNode' in viewEl.modelElement)
            viewEl.redraw();
    });
}
export function redrawLinksFor(modelElement) {
    _view?.viewElements.forEach((viewEl) => {
        if ('isLink' in viewEl.modelElement
            && (viewEl.modelElement.source.id === modelElement.id
                || viewEl.modelElement.destination.id === modelElement.id)) {
            viewEl.redraw();
        }
    });
}
function makeCssTransform(scale = new THREE.Vector2(1, 1), direction = new THREE.Vector2(1, 0), position = new THREE.Vector2() // display coords, or model coords within a zoomed container
) {
    scale = (typeof scale === 'number') ? new THREE.Vector2(scale, scale) : scale;
    return `matrix(${scale.x * direction.x}, ${scale.x * direction.y},
                 ${-scale.y * direction.y}, ${scale.y * direction.x},
                 ${position.x}, ${position.y})`;
}
export class View {
    viewModel;
    viewElements = new Map();
    constructor(viewModel, _rootElement) {
        init();
        _view = this;
        this.viewModel = viewModel;
        this.viewModel.view = this; // do we need a more general way to hook a View to a ViewModel?
    }
    get zoomFactor() { return zoomFactor; }
    viewportOrigin() {
        return displayToModel(new THREE.Vector2(0, 0));
    }
    viewportScale() {
        return Math.min(graphicRect.width, graphicRect.height) / zoomFactor;
    }
    addElement(modelElement) {
        let newElement;
        switch (modelElement.className) {
            case 'TextElement':
                newElement = new TextView(this, modelElement);
                break;
            case 'CDElement':
                newElement = new CDView(this, modelElement);
                break;
            case 'CGElement':
                newElement = new CGView(this, modelElement);
                break;
            case 'MTElement':
                newElement = new MTView(this, modelElement);
                break;
            case 'ConnectingElement':
                newElement = new ConnectingView(this, modelElement);
                break;
            case 'MorphismElement':
                newElement = new MorphismView(this, modelElement);
                break;
        }
        if (newElement != null) {
            this.viewElements.set(modelElement.id, newElement);
        }
    }
    removeElement(modelElement) {
        const sheetViewElement = this.viewElements.get(modelElement.id);
        sheetViewElement?.destroy();
        this.viewElements.delete(modelElement.id);
    }
    clear() {
        this.viewElements.forEach((sheetViewElement) => {
            sheetViewElement.destroy();
        });
        this.viewElements.clear();
    }
    moveElement(modelElement) {
        this.viewElements.get(modelElement.id)?.updateTransform();
        this.redrawLinks(modelElement);
    }
    resizeElement(modelElement) {
        this.viewElements.get(modelElement.id)?.redraw();
        this.redrawLinks(modelElement);
    }
    getVisualizerJSON(modelElement) {
        const viewElement = this.viewElements.get(modelElement.id);
        return viewElement?.getVisualizerJSON();
    }
    updateVisualizer(modelElement, json) {
        const viewElement = this.viewElements.get(modelElement.id);
        viewElement?.updateFromJSON(json);
        this.redrawLinks(modelElement);
    }
    redrawLinks(modelElement) {
        this.viewElements.forEach((viewEl) => {
            if ('isLink' in viewEl.modelElement
                && (viewEl.modelElement.source.id === modelElement.id
                    || viewEl.modelElement.destination.id === modelElement.id)) {
                viewEl.redraw();
            }
        });
    }
}
export class SheetView {
    view;
    modelElement;
    domElement;
    constructor(view, modelElement, domElement) {
        this.view = view;
        this.modelElement = modelElement;
        this.domElement = domElement || document.createElement('div');
        this.domElement.setAttribute('id', modelElement.id);
        this.domElement.classList.add(modelElement.className);
        this.domElement.style.position = 'absolute';
        this.domElement.style.left = '0';
        this.domElement.style.top = '0';
        this.domElement.style.zIndex = modelElement.z.toString();
        this.domElement.style.transformOrigin = 'top left';
        Graphic.append(this.domElement);
    }
    destroy() {
        this.domElement.remove();
    }
    // applies the z SheetModel computed/SheetViewUI set; see docs/README.md § The Sheet system,
    // "Z ordering" for the full contract
    updateZ() {
        this.domElement.style.zIndex = this.modelElement.z.toString();
    }
}
export class NodeView extends SheetView {
    constructor(view, modelElement, domElement) {
        super(view, modelElement, domElement);
        this.domElement.classList.add('draggable');
        this.domElement.classList.add('NodeElement');
    }
    get center() {
        return this.position.addScaledVector(this.size, 0.5);
    }
    get rect() {
        return new DOMRect(...this.position.toArray(), ...this.size.toArray());
    }
    get position() {
        return new THREE.Vector2(this.modelElement.x, this.modelElement.y);
    }
    get size() {
        return new THREE.Vector2(this.modelElement.w, this.modelElement.h);
    }
}
export class TextView extends NodeView {
    constructor(view, modelElement, domElement) {
        super(view, modelElement, domElement);
        this.domElement.style.display = 'flex';
        this.domElement.style.flexDirection = 'column';
        this.domElement.style.justifyContent = 'center';
        this.domElement.insertAdjacentHTML('afterbegin', '<div class="content" style="padding: 0 0.5em">');
        this.redraw();
        this.updateZ();
    }
    updateTransform() {
        this.domElement.style.transform = makeCssTransform(zoomFactor, undefined, modelToDisplay(this.position));
    }
    redraw() {
        // combine color and opacity into an rgba color for transparent/translucent colors
        const background = new THREE.Color(this.modelElement.color).convertLinearToSRGB().multiplyScalar(256);
        const backgroundCss = (this.modelElement.opacity === 1)
            ? `rgb(${background.r}, ${background.g}, ${background.b})`
            : `rgba(${background.r}, ${background.g}, ${background.b}, ${this.modelElement.opacity})`;
        const contentElement = this.domElement.querySelector('div.content');
        // simple case: just a rectangle
        if (this.modelElement.text === '') {
            this.domElement.style.width = `${this.modelElement.w}px`;
            this.domElement.style.height = `${this.modelElement.h}px`;
            this.domElement.style.backgroundColor = backgroundCss;
            this.domElement.style.padding = '0';
            this.domElement.style.minHeight = '';
            contentElement.textContent = '';
            this.updateTransform();
            return;
        }
        // update style from possible edits
        this.domElement.style.backgroundColor = backgroundCss;
        this.domElement.style.color = this.modelElement.fontColor;
        this.domElement.style.fontSize = this.modelElement.fontSize;
        this.domElement.style.lineHeight = '1.2';
        this.domElement.style.zIndex = this.modelElement.z.toString();
        contentElement.style.textAlign = this.modelElement.alignment;
        contentElement.style.marginLeft = (this.modelElement.alignment == 'left') ? '0' : 'auto';
        contentElement.style.marginRight = (this.modelElement.alignment == 'right') ? '0' : 'auto';
        if (this.modelElement.isPlainText) {
            contentElement.textContent = this.modelElement.text;
        }
        else {
            contentElement.innerHTML = this.modelElement.text;
        }
        // create scratch element to determine text content size
        const scratch = this.domElement.cloneNode(true);
        scratch.style.zIndex = '-1';
        scratch.style.transform = 'none';
        scratch.style.width = (this.modelElement.w) ? `${this.modelElement.w}px` : 'max-content';
        scratch.style.height = 'max-content';
        scratch.style.padding = '0';
        document.body.appendChild(scratch);
        const scratchContentElement = scratch.querySelector('.content');
        const { height: scratchHeight, width: scratchWidth } = scratchContentElement.getBoundingClientRect();
        scratch.remove();
        // apply results from scratch element to model, domElement
        // adjust modelElement location so modelElement zoom doesn't move the center of the element
        if (!this.modelElement.w || scratchWidth > this.modelElement.w) {
            this.modelElement.w = scratchWidth;
        }
        if (this.modelElement.h == null || scratchHeight > this.modelElement.h) {
            this.modelElement.h = scratchHeight;
        }
        this.domElement.style.width = `${Math.max(this.modelElement.w, Math.floor(scratchWidth))}px`;
        this.domElement.style.height = `${this.modelElement.h}px`;
        this.updateTransform();
    }
}
export class VisualizerView extends NodeView {
    unitSquarePositions;
    lastZoom;
    _highlightSubscriber;
    constructor(view, modelElement, domElement) {
        super(view, modelElement, domElement);
        this.domElement.classList.add('VisualizerElement');
    }
    updateTransform() {
        const transformZoom = zoomFactor / this.lastZoom;
        this.domElement.style.transform = makeCssTransform(transformZoom, undefined, modelToDisplay(this.position));
    }
    redraw() {
        this.lastZoom = zoomFactor;
        this.updateTransform();
        this.visualizer.setSize(this.size.x * zoomFactor, this.size.y * zoomFactor);
        this.visualizer.showGraphic();
        this.unitSquarePositions = this.visualizer.unitSquarePositions();
    }
    restoreHighlights(snapshot) {
        this.visualizer.model.highlightColors[0] = snapshot;
        this.redraw();
    }
    get highlightModelProxy() {
        if (this._highlightSubscriber == null) {
            let debounceTimer;
            this._highlightSubscriber = {
                update: (field, value) => {
                    if (value != null
                        && (field === 'highlightColors'
                            || (field === 'highlightControl' && isSerializable(value)))) {
                        clearTimeout(debounceTimer);
                        debounceTimer = setTimeout(() => {
                            this.modelElement.onVisualizerChange?.(this.modelElement.getVisualizerJSON?.());
                        }, 100);
                    }
                }
            };
            this.visualizer.modelProxy.$subscribe(this._highlightSubscriber, 'highlightColors');
            this.visualizer.modelProxy.$subscribe(this._highlightSubscriber, 'highlightControl');
        }
        return this.visualizer.modelProxy;
    }
    getVisualizerJSON() {
        return this.visualizer.toJSON();
    }
}
export class CGView extends VisualizerView {
    cgViewModel;
    constructor(view, modelElement) {
        const cgModel = createModelProxy(new CycleGraphModel(modelElement.group))
            .fromJSON(modelElement.visualizerJSON);
        const cgViewModel = createLargeCycleGraphView(cgModel);
        super(view, modelElement, cgViewModel.canvas);
        this.cgViewModel = cgViewModel;
        this.redraw();
    }
    updateFromJSON(json) {
        this.visualizer.fromJSON(json);
        this.redraw();
    }
    get visualizer() {
        return this.cgViewModel;
    }
}
export class MTView extends VisualizerView {
    mtViewModel;
    constructor(view, modelElement) {
        const mtModel = createModelProxy(new MulttableModel(modelElement.group))
            .fromJSON(modelElement.visualizerJSON);
        const mtViewModel = createLargeMulttableView(mtModel);
        super(view, modelElement, mtViewModel.canvas);
        this.mtViewModel = mtViewModel;
        this.redraw();
    }
    updateFromJSON(json) {
        this.visualizer.fromJSON(json);
        this.redraw();
    }
    get visualizer() {
        return this.mtViewModel;
    }
}
export class CDView extends VisualizerView {
    _highlightModelProxy;
    static sharedViewModel = null;
    static activeView = null;
    constructor(view, modelElement) {
        super(view, modelElement, document.createElement('canvas'));
        this.redraw();
    }
    // swap our json into shared visualizer and use it to draw diagram
    // check the case where we delete the element holding the shared view model
    get visualizer() {
        if (CDView.activeView == this) {
            return CDView.sharedViewModel;
        }
        if (CDView.sharedViewModel == null) { // no shared view model -- create one from this.modelElement
            const cdModel = createModelProxy(new CayleyDiagramModel(this.modelElement.group))
                .fromJSON(this.modelElement.visualizerJSON);
            CDView.sharedViewModel = createStaticCayleyDiagramView(cdModel);
        }
        else { // shared view model already made -- roll out activeView, roll in this
            if (CDView.activeView != null) {
                CDView.activeView.modelElement.visualizerJSON = CDView.sharedViewModel.toJSON();
            }
            if (this.canFastTrack()) {
                CDView.sharedViewModel.model.highlightColors =
                    [...(this.modelElement.visualizerJSON.highlight_colors ?? [[], [], []])];
            }
            else {
                CDView.sharedViewModel.fromJSON(this.modelElement.visualizerJSON);
            }
        }
        CDView.activeView = this;
        return CDView.sharedViewModel;
    }
    canFastTrack() {
        const sharedModel = CDView.sharedViewModel?.model;
        const thisModel = this.modelElement.visualizerJSON;
        const REQUIRED_MATCHING_FIELDS = [
            'background', 'fog_level', 'line_width', 'sphere_scale_factor',
            'zoom_level', 'arrowhead_placement', 'label_scale_factor'
        ];
        const canFastTrack = sharedModel?.group.URL == thisModel.group_url
            && JSON.stringify(layoutToJSON(sharedModel.layout)) == JSON.stringify(thisModel.layout)
            // The fast path only refreshes highlightColors -- it must never run while the shared
            // model holds a highlightControl thisModel doesn't already agree with (stale or live),
            // since nothing else would clear/reconcile it. Required in every branch below, not just
            // the "has been live" one -- a never-live thisModel still needs the shared model to have
            // no leftover highlightControl from whichever element held it before.
            && sharedModel?.highlightControl == null
            && thisModel.highlight_control == null
            && (thisModel.background == null // => thisModel has never been live
                || REQUIRED_MATCHING_FIELDS.every((field) => sharedModel[field] == thisModel[field]));
        return canFastTrack;
    }
    get highlightModelProxy() {
        if (this._highlightModelProxy == null) {
            const visualizer = this.visualizer;
            const model = createModelProxy(new CayleyDiagramModel(this.modelElement.group));
            model.highlightColors = [...visualizer.model.highlightColors];
            model.highlightControl = (isSerializable(visualizer.model.highlightControl))
                ? visualizer.model.highlightControl.toJSON()
                : visualizer.model.highlightControl;
            // store subscriber on instance — WeakRef in createModelProxy would otherwise GC it
            this._highlightSubscriber = {
                update: (field, value) => {
                    if (field === 'highlightColors') {
                        const visualizer = this.visualizer;
                        visualizer.model.highlightColors = [...value];
                        visualizer.model.highlightControl =
                            model.highlightControl.toJSON();
                        this.redraw();
                        redrawLinksFor(this.modelElement);
                        this.modelElement.onVisualizerChange?.(this.modelElement.getVisualizerJSON?.());
                    }
                    else if (field === 'highlightControl' && isSerializable(value)) {
                        // subset created/destroyed — write structure to live model without changing colors
                        this.visualizer.model.highlightControl = value.toJSON();
                        this.modelElement.onVisualizerChange?.(this.modelElement.getVisualizerJSON?.());
                    }
                    else if (field === 'highlightControl') {
                        // debugger  // FIXME -- why should this ever occur? see HighlightControlViewModel set model
                    }
                }
            };
            model.$subscribe(this._highlightSubscriber, 'highlightColors');
            model.$subscribe(this._highlightSubscriber, 'highlightControl');
            this._highlightModelProxy = model;
        }
        return this._highlightModelProxy;
    }
    updateFromJSON(json) {
        this.visualizer.fromJSON(json);
        if (this._highlightModelProxy != null) {
            const highlightControl = this.visualizer.model.highlightControl;
            const data = isSerializable(highlightControl) ? highlightControl.toJSON() : highlightControl;
            // data can now genuinely be undefined (highlightControl is legitimately optional); a
            // live HighlightControlViewModel.fromJSON indexes into its argument unconditionally, so
            // only call it when there's real data -- skip if not, rather than pass it undefined
            if (data != null) {
                this._highlightModelProxy.highlightControl.fromJSON(data);
            }
            this._highlightModelProxy.highlightColors = [...this.visualizer.model.highlightColors];
            // subscriber handles redraw
        }
        else {
            this.redraw();
        }
    }
    destroy() {
        if (CDView.activeView == this) {
            CDView.activeView = null;
        }
        super.destroy();
    }
    redraw() {
        this.lastZoom = zoomFactor;
        this.updateTransform();
        const size = this.size.clone().multiplyScalar(zoomFactor);
        this.visualizer.setSize(size.x, size.y);
        this.visualizer.view.rescaleLines();
        this.visualizer.showGraphic();
        this.domElement.setAttribute('width', size.x.toString());
        this.domElement.setAttribute('height', size.y.toString());
        const context = this.domElement.getContext('2d');
        context.drawImage(this.visualizer.view.canvas, 0, 0);
        this.unitSquarePositions = CDView.sharedViewModel.unitSquarePositions();
    }
    restoreHighlights(snapshot) {
        if (CDView.activeView === this && CDView.sharedViewModel != null) {
            CDView.sharedViewModel.model.highlightColors = this.modelElement.visualizerJSON.highlight_colors;
        }
        else {
            this.modelElement.visualizerJSON.highlight_colors[0] = snapshot;
        }
        this.redraw();
    }
}
const LINE_LEN = 40;
export class Arrow {
    static PIXELS_PER_INCH;
    line;
    head;
    lineWidth;
    color;
    highlightColor;
    constructor(container, lineWidth = 1, color = 'black') {
        this.line = document.createElement('canvas');
        this.line.setAttribute('width', `${LINE_LEN}px`);
        this.line.style.position = 'absolute';
        this.line.style.left = `-${LINE_LEN / 2}px`;
        this.line.style.width = `${LINE_LEN}px`;
        this.line.style.pointerEvents = 'auto';
        container.append(this.line);
        this.head = document.createElement('canvas');
        this.head.setAttribute('width', '90px');
        this.head.setAttribute('height', '31px');
        this.head.style.position = 'absolute';
        this.head.style.width = '90px';
        this.head.style.height = '31px';
        this.head.style.left = '-30px';
        this.head.style.top = '-16px';
        this.head.style.transformOrigin = '30px 16px';
        this.head.style.pointerEvents = 'auto';
        container.append(this.head);
        if (Arrow.PIXELS_PER_INCH == null) {
            this.line.style.height = '1in';
            Arrow.PIXELS_PER_INCH = this.line.getBoundingClientRect().height;
        }
        this.drawBase(lineWidth, color);
    }
    drawBase(lineWidth, color) {
        if (this.lineWidth === lineWidth
            && this.line.getContext('2d').strokeStyle == color
            && this.highlightColor == null) {
            return;
        }
        const ACTIVE_WIDTH = Math.ceil(Arrow.PIXELS_PER_INCH / 20) * 2;
        const contextHeight = Math.max(ACTIVE_WIDTH, lineWidth);
        this.line.setAttribute('height', `${contextHeight}px`);
        this.line.style.height = `${contextHeight}px`;
        this.line.style.top = `${-contextHeight / 2}px`;
        this.line.style.transformOrigin = `${LINE_LEN / 2}px ${contextHeight / 2}px)`;
        this.lineWidth = lineWidth;
        this.color = color;
        const lineContext = this.line.getContext('2d');
        lineContext.clearRect(0, 0, LINE_LEN, contextHeight);
        lineContext.strokeStyle = this.highlightColor || this.color;
        lineContext.lineWidth = lineWidth;
        lineContext.beginPath();
        lineContext.moveTo(0, Math.ceil(contextHeight / 2));
        lineContext.lineTo(LINE_LEN, Math.ceil(contextHeight / 2));
        lineContext.stroke();
        const headContext = this.head.getContext('2d');
        headContext.clearRect(0, 0, 90, 31);
        headContext.fillStyle = this.highlightColor || this.color;
        headContext.beginPath();
        headContext.moveTo(0, 0);
        headContext.lineTo(90, 16);
        headContext.lineTo(0, 31);
        headContext.closePath();
        headContext.fill();
    }
    update(start, // model coords; container div is CSS-scaled by zoomFactor so these map correctly to display pixels
    end, lineWidth = 1, headOffset = 1, color = 'black') {
        const FOUR = 4;
        this.drawBase(lineWidth * FOUR, color);
        const hasArrowhead = (this.head.style.display !== 'none');
        const direction = end.clone().sub(start).normalize();
        // draw arrowhead halfway between source and destination edges, not halfway between centers
        if (hasArrowhead) {
            const lineLength = start.distanceTo(end);
            const headWidth = Math.sqrt(lineWidth * (lineWidth + 0.1 * lineLength)) + lineWidth;
            const headLength = 3 * headWidth;
            if (headOffset === 1) {
                const headFraction = headLength / lineLength;
                end = new THREE.Vector2().lerpVectors(start, end, 1 - headFraction);
                headOffset = 1 + headFraction / (3 * (1 - headFraction));
            }
            const headScale = new THREE.Vector2(headLength / 90, headWidth / 31);
            const headCenter = new THREE.Vector2().lerpVectors(start, end, headOffset);
            this.head.style.transform = makeCssTransform(headScale, direction, headCenter);
        }
        const lineLength = start.distanceTo(end);
        const lineCenter = new THREE.Vector2().addVectors(start, end).multiplyScalar(0.5);
        const lineScale = new THREE.Vector2(lineLength / LINE_LEN, 1);
        this.line.style.transform =
            `matrix(${lineScale.x * direction.x}, ${lineScale.x * direction.y},
                ${-lineScale.y * direction.y / FOUR}, ${lineScale.y * direction.x / FOUR},
                ${lineCenter.x}, ${lineCenter.y})`;
    }
}
export class LinkView extends SheetView {
    arrow;
    constructor(view, modelElement) {
        super(view, modelElement);
        this.domElement.classList.add('LinkElement');
    }
    get destination() {
        return this.modelElement.destination;
    }
    get destinationView() {
        return this.view.viewElements.get(this.destination.id);
    }
    get source() {
        return this.modelElement.source;
    }
    get sourceView() {
        return this.view.viewElements.get(this.modelElement.source.id);
    }
    getCrossingEndpoints() {
        const source = this.source;
        const destination = this.destination;
        const sourceSize = new THREE.Vector2(source.w, source.h);
        const destinationSize = new THREE.Vector2(destination.w, destination.h);
        const sourceCenter = new THREE.Vector2(source.x, source.y).addScaledVector(sourceSize, 0.5);
        const destinationCenter = new THREE.Vector2(destination.x, destination.y).addScaledVector(destinationSize, 0.5);
        const entryInterpolationFactor = Math.min(Math.abs(sourceSize.x / (2 * (destinationCenter.x - sourceCenter.x))), Math.abs(sourceSize.y / (2 * (destinationCenter.y - sourceCenter.y))));
        const entry = new THREE.Vector2().lerpVectors(sourceCenter, destinationCenter, entryInterpolationFactor);
        const exitInterpolationFactor = Math.min(Math.abs(destinationSize.x / (2 * (destinationCenter.x - sourceCenter.x))), Math.abs(destinationSize.y / (2 * (destinationCenter.y - sourceCenter.y))));
        const exit = new THREE.Vector2().lerpVectors(destinationCenter, sourceCenter, exitInterpolationFactor);
        return [entry, exit];
    }
}
/* Connector is constructed from a <div> containing a single Arrow */
export class ConnectingView extends LinkView {
    constructor(view, modelElement) {
        super(view, modelElement);
        Graphic.append(this.domElement);
        this.arrow = new Arrow(this.domElement, modelElement.thickness, modelElement.color);
        this.redraw();
        this.updateTransform();
    }
    updateTransform() {
        this.domElement.style.transform = makeCssTransform(zoomFactor, undefined, modelToDisplay(new THREE.Vector2()));
    }
    redraw() {
        const start = this.sourceView.center;
        const end = this.destinationView.center;
        if (this.modelElement.hasArrowhead) {
            this.arrow.head.style.display = 'block';
            const headLocation = new THREE.Vector2().addVectors(...this.getCrossingEndpoints()).multiplyScalar(0.5);
            const headOffset = start.distanceTo(headLocation) / start.distanceTo(end);
            this.arrow.update(start, end, this.modelElement.thickness, headOffset, this.modelElement.color);
        }
        else {
            this.arrow.head.style.display = 'none';
            this.arrow.update(start, end, this.modelElement.thickness, undefined, this.modelElement.color);
        }
    }
}
/* MorphismElements are constructed from a <div> containing:
 *    a <div> showing text information about the morphism (like its name), and which serves as the selection target
 *    a single Arrow from the source group visualizer to the target (showManyArrows = false)
 *    an Array of Arrows from each element in the source visualizer to its mapping in the target (showManyArrows = true)
 */
export class MorphismView extends LinkView {
    label;
    arrows;
    position;
    labelContent;
    constructor(view, modelElement) {
        super(view, modelElement);
        this.domElement.style.pointerEvents = 'none';
        this.label = document.createElement('div');
        this.label.style.width = 'auto';
        this.label.style.height = 'auto';
        this.label.style.backgroundColor = 'white';
        this.label.style.border = '2px solid black';
        this.label.style.padding = '5px 10px';
        this.label.style.color = 'black';
        this.label.style.fontSize = modelElement.fontSize ?? '16px';
        this.label.style.textAlign = 'center';
        this.label.style.whiteSpace = 'nowrap';
        this.label.style.position = 'absolute';
        this.label.style.pointerEvents = 'auto';
        this.label.style.transformOrigin = 'top left';
        this.label.style.zIndex = '1';
        this.domElement.append(this.label);
        this.redraw();
    }
    get destination() {
        return this.modelElement.destination;
    }
    get destinationView() {
        return this.view.viewElements.get(this.destination.id);
    }
    get source() {
        return this.modelElement.source;
    }
    get sourceView() {
        return this.view.viewElements.get(this.modelElement.source.id);
    }
    updateTransform() {
        const source = this.source;
        const destination = this.destination;
        this.position = new THREE.Vector2(Math.min(source.x, destination.x), Math.min(source.y, destination.y));
        this.domElement.style.transform = makeCssTransform(zoomFactor, undefined, modelToDisplay(this.position));
    }
    redraw() {
        this.updateTransform();
        this.drawLabel();
        if (this.modelElement.showManyArrows) {
            this.drawManyLines();
        }
        else {
            this.drawSingleLine();
        }
    }
    drawLabel() {
        const modelLabel = this.getLabel();
        if (this.labelContent !== modelLabel) {
            this.labelContent = modelLabel;
            this.label.innerHTML = modelLabel;
        }
        const [entry, exit] = this.getCrossingEndpoints().map((v) => v.sub(this.position));
        const center = new THREE.Vector2().addVectors(entry, exit).multiplyScalar(0.5);
        const labelSize = new THREE.Vector2(this.label.offsetWidth, this.label.offsetHeight); // note label size is as zoomed
        const topLeftCorner = center.clone().addScaledVector(labelSize, -0.5);
        // topLeftCorner is in model coords; scale=1 is correct because the parent
        // container is already CSS-scaled by zoomFactor
        this.label.style.transform = makeCssTransform(1, undefined, topLeftCorner);
    }
    getLabel() {
        let html = this.modelElement.morphismName;
        if (this.modelElement.showDomainAndCodomain) {
            html += ` : ${this.modelElement.source.group.name} ⟶ ${this.modelElement.destination.group.name}`;
        }
        if (this.modelElement.showDefiningPairs) {
            html += this.modelElement.mapping
                ?.definingPairs
                .map(([g, h]) => {
                return `<br>${this.modelElement.morphismName}(${this.source.group.representation[g]}) = ${this.destination.group.representation[h]}`;
            })
                .join('');
        }
        if (this.modelElement.showInjectionSurjection) {
            html += '<br>' + (this.modelElement.mapping?.isInjective ? '' : 'not ') + '1-1';
            html += '<br>' + (this.modelElement.mapping?.isSurjective ? '' : 'not ') + 'onto';
        }
        return html;
    }
    drawSingleLine() {
        const LINE_WIDTH = 4;
        const LINE_COLOR = 'black';
        // create main arrow if it doesn't exist
        if (this.arrow === undefined) {
            this.arrow = new Arrow(this.domElement, LINE_WIDTH, LINE_COLOR);
        }
        // make sure to display arrow
        this.arrow.line.style.display = 'block';
        this.arrow.head.style.display = 'block';
        // hide mapping arrows, if they exist and aren't hidden
        if (this.arrows !== undefined && this.arrows[0].line.style.display !== 'none') {
            for (const { line, head } of this.arrows.values()) {
                line.style.display = 'none';
                head.style.display = 'none';
            }
        }
        // make sure z-index of main arrow is under starting visualizer to terminate it cleanly
        this.domElement.style.zIndex = this.modelElement.z.toString();
        const [enter, exit] = this.getCrossingEndpoints().map((v) => v.sub(this.position));
        const lineLength = enter.distanceTo(exit);
        const padding = LINE_WIDTH + 0.5 * Math.sqrt(0.1 * LINE_WIDTH * lineLength);
        const paddingRatio = padding / lineLength;
        const start = new THREE.Vector2().lerpVectors(enter, exit, -paddingRatio);
        this.arrow.update(start, exit, LINE_WIDTH, undefined, LINE_COLOR);
    }
    drawManyLines() {
        const LINE_COLOR = 'black';
        const source = this.source;
        const destination = this.destination;
        const LINE_WIDTH = Math.max(Math.min(Math.min(source.w, destination.w) / 200, 2), 1);
        // create mapping arrows if they don't exist
        if (this.arrows === undefined) {
            this.arrows = Array.from({ length: source.group.order }, () => new Arrow(this.domElement, LINE_WIDTH, LINE_COLOR));
        }
        // display mapping arrows if they're hidden
        if (this.arrows[0].line.style.display === 'none') {
            this.arrows.forEach((arrow) => {
                arrow.line.style.display = 'block';
                arrow.head.style.display = 'block';
            });
        }
        // hide main arrow, if it exists
        if (this.arrow != null) {
            this.arrow.line.style.display = 'none';
            this.arrow.head.style.display = 'none';
        }
        // make sure z-index of arrows displays them on top of the visualizers
        this.domElement.style.zIndex = this.modelElement.z.toString();
        // get mapping
        const mapping = this.modelElement.mapping.fullMapping;
        // get unitSquarePosition for source and destination visualizers
        // (adjust for using top row of source, destination multtables)
        const sources = (this.modelElement.useMulttableSourceTopRow)
            ? this.sourceView.unitSquarePositions
                .map((pos, _inx, arr) => new THREE.Vector2(arr[0].x + pos.y - arr[0].y, arr[0].y))
            : this.sourceView.unitSquarePositions;
        const destinations = (this.modelElement.useMulttableDestinationTopRow)
            ? this.destinationView.unitSquarePositions
                .map((pos, _inx, arr) => new THREE.Vector2(arr[0].x + pos.y - arr[0].y, arr[0].y))
            : this.destinationView.unitSquarePositions;
        // get transforms from visualizer unit squares to sheet
        const sourceRect = this.sourceView.rect;
        const sourceToSheet = new THREE.Matrix3().set(sourceRect.width, 0, sourceRect.left - this.position.x, 0, sourceRect.height, sourceRect.top - this.position.y, 0, 0, 1);
        const destinationRect = this.destinationView.rect;
        const destinationToSheet = new THREE.Matrix3().set(destinationRect.width, 0, destinationRect.left - this.position.x, 0, destinationRect.height, destinationRect.top - this.position.y, 0, 0, 1);
        // get offset distance for arrowMargin
        let offsetDistance = 0;
        if (this.modelElement.arrowMargin !== 0) {
            const sourceCenter = source.viewElement.position.addScaledVector(source.viewElement.size, 0.5);
            const destinationCenter = destination.viewElement.position.addScaledVector(destination.viewElement.size, 0.5);
            const centerToCenter = sourceCenter.sub(destinationCenter).length();
            offsetDistance = this.modelElement.arrowMargin * centerToCenter;
        }
        // update arrow from each source group element
        for (let inx = 0; inx < source.group.order; inx++) {
            // for each source & destination, transform from visualizer unit square to sheet
            let start = new THREE.Vector2(...sources[inx].toArray()).applyMatrix3(sourceToSheet);
            let end = new THREE.Vector2(...destinations[mapping[inx]].toArray()).applyMatrix3(destinationToSheet);
            // adjust start & end if there is an offset
            if (offsetDistance !== 0) {
                const offsetPercentage = offsetDistance / start.distanceTo(end);
                // $FlowFixMe -- syntax unsupported by Flow
                [start, end] = [
                    new THREE.Vector2().lerpVectors(start, end, offsetPercentage),
                    new THREE.Vector2().lerpVectors(end, start, offsetPercentage)
                ];
            }
            // color arrows as needed
            let arrowColor;
            if (this.modelElement.arrowColor != 'none') {
                let highlightColor;
                if (this.modelElement.arrowColor == 'source') {
                    highlightColor = this.modelElement.source.viewElement.visualizer.model.highlightColors[0]?.[inx];
                }
                else {
                    const destinationIndex = this.modelElement.mapping.image[inx]; // FIXME?
                    highlightColor =
                        this.modelElement.destination.viewElement.visualizer.model.highlightColors[0]?.[destinationIndex];
                }
                if (highlightColor == null) {
                    arrowColor = LINE_COLOR;
                }
                else {
                    // if element is highlighted, make sure the color isn't too light
                    let color = new THREE.Color(highlightColor);
                    const hsl = color.getHSL({});
                    arrowColor = '#' + color.setHSL(hsl.h, hsl.s, .15).getHexString();
                }
            }
            // update arrows
            this.arrows[inx].update(start, end, LINE_WIDTH, undefined, arrowColor);
        }
    }
}
//# sourceMappingURL=SheetView.js.map
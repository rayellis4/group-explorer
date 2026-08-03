var _a;
/* @flow

# SheetModel

The Model parrt of the Sheet Model-View-Control structure

```javascript
 */
import * as GEUtils from './GEUtils.js';
import * as Library from './Library.js';
import * as Log from './Log.js';
import { Mapping } from './Mapping.js';
import * as StoredObjects from './StoredObjects.js';
export { SheetModel, createNewSheet, loadPassedSheet, sheetPanelWidth, fittedFontSize };
// #sheet-control has font-size: 1.25rem; #control-panel has min-width: 20em => 25rem total
function sheetPanelWidth() {
    return 25 * parseFloat(getComputedStyle(document.documentElement).fontSize);
}
// Measure html at body font-size and return a px font-size scaled to fill maxWidth at 90%,
// clamped to [min, max] em-equivalents.
function fittedFontSize(html, maxWidth, min = 1.5, max = 3) {
    const basePx = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const { width: width1em } = GEUtils.measureHTML(html);
    const px = Math.min(max * basePx, Math.max(min * basePx, (maxWidth * 0.9) * basePx / width1em));
    return `${px.toFixed(1)}px`;
}
/*::
import {CayleyDiagramView} from './CayleyDiagramView.js'
import {CycleGraphView} from './CycleGraphView.js'
import {MulttableView} from './MulttableView.js'
import {Group} from './Group.js';

export type VisualizerName = 'CDElement' | 'CGElement' | 'MTElement';

export type ClassName =
      'TextElement'
    | VisualizerName
    | 'ConnectingElement'
    | 'MorphismElement';

export interface VizDisplay<VisDispJSON> {
   group: Group;
   getSize(): {w: number, h: number};
   setSize(w: number, h: number): void;
   getImage(): Image;
   toJSON(): VizDispJSON;
   fromJSON(VizDispJSON): void;
   unitSquarePosition(groupElement): {x: float, y: float};
};

export type VisualizerElementJSON = any;
export type JSONType = any;
export type SheetElementJSON = any;
export type RectangleElementJSON = any;
export type TextElementJSON = any;
export type ConnectingElementJSON = any;
export type MorphismElementJSON = any;
export type VisualizerType = any;
export type MSG_loadGroup = any;
export type MSG_external<VizType: any> = any;
export type MSG_editor<VizType: any> = any;
*/
class SheetModel {
    #sheetElements /*: Map<string, SheetElement> */ = new Map();
    nextId = 0;
    get sheetElements() {
        return this.#sheetElements;
    }
    toJSON() {
        return Array.from(this.sheetElements.values()).map((el) => el.toJSON());
    }
    fromJSON(json /*: string | Obj */) {
        const jsonObjects = (typeof json == 'string')
            ? JSON.parse(json)
            : json;
        this.sheetElements.clear();
        // pre-assign IDs so anchor_id references can be resolved before elements are created
        let tempNextId = this.nextId;
        const withIds = jsonObjects.map((obj) => {
            if (obj.id != null) {
                const n = parseInt(obj.id);
                if (!isNaN(n) && n >= tempNextId)
                    tempNextId = n + 1;
                return obj;
            }
            return { ...obj, id: (tempNextId++).toString() };
        });
        // topological sort so each anchor is always processed before its captions
        const idMap = new Map(withIds.map((obj) => [obj.id.toString(), obj]));
        const nameMap = new Map(withIds.filter((obj) => obj.name != null).map((obj) => [obj.name, obj]));
        const sorted = [];
        const state = new Map();
        const visit = (obj) => {
            const id = obj.id.toString();
            if (state.get(id) === 'd')
                return;
            if (state.get(id) === 'v') {
                Log.warn(`SheetModel.fromJSON: circular anchor reference at id ${id}`);
                return;
            }
            state.set(id, 'v');
            if (obj.anchor_id != null) {
                const anchor = idMap.get(obj.anchor_id.toString());
                if (anchor != null)
                    visit(anchor);
            }
            if (obj.anchor_name != null) {
                const anchor = nameMap.get(obj.anchor_name);
                if (anchor != null)
                    visit(anchor);
            }
            state.set(id, 'd');
            sorted.push(obj);
        };
        withIds.forEach((obj) => visit(obj));
        sorted.forEach((jsonObject) => {
            this.addObjectAsElement(jsonObject, jsonObject.className);
        });
    }
    addObjectAsElement(plainObject, className) {
        const newElement = new (classMap[className])(this).fromJSON(plainObject);
        this.sheetElements.set(newElement.id, newElement);
        return newElement;
    }
    canConnect(linkType /*: 'ConnectingElement' | 'MorphismElement' */, source /*: SheetElement */, destination /*: SheetElement*/) {
        const canConnect = ((linkType == 'ConnectingElement' && source.isNode && destination.isNode)
            || (linkType == 'MorphismElement' && source.isVisualizer && destination.isVisualizer))
            && Array.from(this.sheetElements.values())
                .every((element) => !(element.isLink)
                || ((element.source != source && element.destination != source)
                    || (element.source != destination && element.destination != destination)));
        return canConnect;
    }
}
// SheetModel helper classes
class SheetElement {
    id; /*: string */
    _name; /*: string */
    className; /*: string */
    #model; /*: SheetModel */
    constructor(model /*: SheetModel */) {
        this.#model = model;
    }
    get model() {
        return this.#model;
    }
    get name() {
        return this._name ?? this.id;
    }
    set name(name) {
        this._name = name;
    }
    toJSON() {
        return {
            id: this.id,
            name: this._name,
            className: this.className
        };
    }
    fromJSON(jsonObject) {
        if (this.id == null || jsonObject.id != this.id) {
            let id;
            if (jsonObject.id == null) {
                id = this.model.nextId++;
            }
            else {
                if (this.model.sheetElements.has(jsonObject.id)) {
                    if (window.confirm('duplicate id detected on input: assign new id or abort input?')) {
                        id = this.model.nextId++;
                    }
                    else {
                        throw new TypeError('duplicate id detected in input JSON, processing aborted');
                    }
                }
                else {
                    id = jsonObject.id;
                    this.model.nextId = (parseInt(id) >= this.model.nextId) ? parseInt(id) + 1 : this.model.nextId;
                }
            }
            this.id = id.toString();
        }
        this._name = jsonObject.name;
        return this;
    }
}
class NodeElement extends SheetElement {
    x /*: float */ = 0;
    y /*: float */ = 0;
    w /*: float */ = 0.1;
    h /*: float */ = 0.1;
    z; /*: integer */
    anchor_id; /*: ?string */ // id of element this is anchored to; moves with that element
    isNode = true;
    constructor(model /*: SheetModel */) {
        super(model);
        // NodeElements have even z-index, LinkElements have odd, so they can overlay/underlay the NodeElements they connect
        this.z = 2 * (model.sheetElements.size + 1);
    }
    toJSON() {
        return {
            ...super.toJSON(),
            anchor_id: this.anchor_id,
            x: this.x,
            y: this.y,
            w: this.w,
            h: this.h,
            z: this.z
        };
    }
    fromJSON(jsonObject) {
        super.fromJSON(jsonObject);
        if (jsonObject.anchor_name != null) {
            const anchor = Array.from(this.model.sheetElements.values())
                .find((el) => el.name === jsonObject.anchor_name);
            this.anchor_id = anchor?.id ?? null;
        }
        else {
            this.anchor_id = jsonObject.anchor_id ?? null;
        }
        this.x = jsonObject.x ?? this.x;
        this.y = jsonObject.y ?? this.y;
        this.w = jsonObject.w ?? this.w;
        this.h = jsonObject.h ?? this.h;
        this.z = jsonObject.z ?? this.z;
        // snap to anchor's bottom edge; anchor always precedes caption after fromJSON sort
        if (this.anchor_id != null) {
            const anchor = this.model.sheetElements.get(this.anchor_id);
            if (anchor != null) {
                this.x = anchor.x;
                this.y = anchor.y + anchor.h;
                this.w = anchor.w;
            }
        }
        return this;
    }
}
class TextElement extends NodeElement {
    className = 'TextElement';
    text /*: string */ = '';
    color /*: color */ = '#ffffff'; // background color
    opacity /*: float */ = 1; // opacity in [0,1]: 0 => transparent, 1 => completely opaque
    fontSize /*: string */ = '16px';
    fontColor /*: color */ = 'black';
    alignment /*: 'left' | 'center' | 'right' */ = 'left';
    isPlainText /*: boolean */ = false; // but take care for characters <, >, &
    toJSON() {
        return {
            ...super.toJSON(),
            text: this.text,
            color: this.color,
            opacity: this.opacity,
            fontSize: this.fontSize,
            fontColor: this.fontColor,
            alignment: this.alignment,
            isPlainText: this.isPlainText
        };
    }
    fromJSON(jsonObject) {
        super.fromJSON(jsonObject);
        if (jsonObject.w == null)
            this.w = null;
        if (jsonObject.h == null)
            this.h = null;
        this.text = jsonObject.text ?? this.text;
        this.color = jsonObject.color ?? this.color;
        this.opacity = jsonObject.opacity ?? this.opacity;
        this.fontSize = jsonObject.fontSize ?? this.fontSize;
        this.fontColor = jsonObject.fontColor ?? this.fontColor;
        this.alignment = jsonObject.alignment ?? this.alignment;
        this.isPlainText = jsonObject.isPlainText ?? this.isPlainText;
        return this;
    }
}
class VisualizerElement extends NodeElement {
    group; /*: Group */
    highlightColors; /*: Array<Array<color>> */ // golden record is in the visualizer; this is just initialization
    visualizer; /*: any */ // opaque JSON blob; live visualizer object lives in SheetView
    isVisualizer = true;
    toJSON() {
        const visualizerJSON = this.getVisualizerJSON?.();
        return {
            ...super.toJSON(),
            groupURL: this.group.URL,
            // highlightColors inside visualizer is golden; highlight_colors here is for CDView fast-path init
            highlight_colors: visualizerJSON?.highlightColors ?? this.highlightColors ?? [[], [], []],
            visualizer: visualizerJSON ?? this.visualizer
        };
    }
    fromJSON(jsonObject) {
        super.fromJSON(jsonObject);
        this.group = Library.getGroupByURL(jsonObject.groupURL);
        this.highlightColors = jsonObject.highlight_colors ?? [[], [], []];
        this.visualizer = jsonObject.visualizer;
        return this;
    }
}
class CDElement extends VisualizerElement {
    className = 'CDElement';
    diagramControl; // initialization only; baked into visualizer JSON on first getVisualizerJSON() call
    toJSON() {
        const json = super.toJSON();
        if (json.visualizer == null) {
            json.diagram_control = this.diagramControl;
        }
        return json;
    }
    fromJSON(jsonObject) {
        super.fromJSON(jsonObject);
        const setDiagramControlFromJSON = (field) => {
            this.diagramControl ??= {};
            this.diagramControl[field] = jsonObject[field];
            delete jsonObject[field];
        };
        // remove diagram_name, strategy_parameters, arrow_generators from JSON and place in diagramControl
        if ('diagram_name' in jsonObject) {
            setDiagramControlFromJSON('diagram_name');
        }
        else if ('strategy_parameters' in jsonObject) {
            setDiagramControlFromJSON('strategy_parameters');
            if ('arrow_generators' in jsonObject) {
                setDiagramControlFromJSON('arrow_generators');
            }
        }
        // prefer explicit diagram_control in jsonObject
        if ('diagram_control' in jsonObject) {
            this.diagramControl = jsonObject.diagram_control;
        }
        return this;
    }
}
class CGElement extends VisualizerElement {
    className = 'CGElement';
}
class MTElement extends VisualizerElement {
    className = 'MTElement';
    organizingSubgroup;
    separation;
    toJSON() {
        return super.toJSON();
    }
    fromJSON(jsonObject) {
        super.fromJSON(jsonObject);
        if ('organizing_subgroup' in jsonObject) {
            this.organizingSubgroup = jsonObject.organizing_subgroup;
        }
        if ('separation' in jsonObject) {
            this.separation = jsonObject.separation;
        }
        return this;
    }
}
// check canConnect on creation?
class LinkElement extends SheetElement {
    source; /*: NodeElement */ // not covariant
    destination; /*: NodeElement */ // not covariant
    isLink = true;
    // z level of link is determined from z levels of source/destination
    toJSON() {
        return {
            ...super.toJSON(),
            source_id: this.source.id,
            destination_id: this.destination.id
        };
    }
    fromJSON(jsonObject) {
        super.fromJSON(jsonObject);
        if (this.source == null) { // assume source and destination initializations are in sync
            const sheetElementArray = (jsonObject.source_id == null)
                ? Array.from(this.model.sheetElements.values())
                : [];
            const source = (jsonObject.source_id != null)
                ? this.model.sheetElements.get(jsonObject.source_id)
                : sheetElementArray.find((element) => element.name == jsonObject.source_name);
            const destination = (jsonObject.destination_id != null)
                ? this.model.sheetElements.get(jsonObject.destination_id)
                : sheetElementArray.find((element) => element.name == jsonObject.destination_name);
            if (this.model.canConnect(this.className, source, destination)) {
                this.source = source;
                this.destination = destination;
            }
            else {
                Log.err(`SheetViewModel.addElement: improper ${this.className} ` +
                    `between ${source.name} and ${destination.name}`);
            }
        }
        return this;
    }
}
class ConnectingElement extends LinkElement {
    className = 'ConnectingElement';
    thickness /*: number */ = 4; // 'width'? 'lineWidth'?
    color /*: color */ = '#000000';
    hasArrowhead /*: boolean */ = true; // 'directed'?
    toJSON() {
        return {
            ...super.toJSON(),
            thickness: this.thickness,
            color: this.color,
            hasArrowhead: this.hasArrowhead
        };
    }
    fromJSON(jsonObject) {
        super.fromJSON(jsonObject);
        this.thickness = jsonObject.thickness ?? this.thickness;
        this.color = jsonObject.color ?? this.color;
        this.hasArrowhead = jsonObject.hasArrowhead ?? this.hasArrowhead;
        return this;
    }
}
class MorphismElement extends LinkElement {
    className = 'MorphismElement';
    showDomainAndCodomain /*: boolean */ = false;
    showDefiningPairs /*: boolean */ = false;
    showInjectionSurjection /*: boolean */ = false;
    showManyArrows /*: boolean */ = false;
    arrowColor /*: 'none' | 'source' | 'destination' */ = 'none';
    arrowMargin /*: number */ = 0;
    fontSize /*: ?string */ = null;
    useMulttableSourceTopRow /*: boolean */ = false;
    useMulttableDestinationTopRow /*: boolean */ = false;
    mapping; /*: Mapping */
    get z() {
        return this.showManyArrows
            ? Math.max(this.source.z, this.destination.z) + 1
            : Math.min(this.source.z, this.destination.z) - 1;
    }
    toJSON() {
        return {
            ...super.toJSON(),
            showDomainAndCodomain: this.showDomainAndCodomain,
            showDefiningPairs: this.showDefiningPairs,
            showInjectionSurjection: this.showInjectionSurjection,
            showManyArrows: this.showManyArrows,
            arrowColor: this.arrowColor,
            arrowMargin: this.arrowMargin,
            fontSize: this.fontSize,
            useMulttableSourceTopRow: this.useMulttableSourceTopRow,
            useMulttableDestinationTopRow: this.useMulttableDestinationTopRow,
            definingPairs: this.mapping.definingPairs,
        };
    }
    fromJSON(jsonObject) {
        // override default naming: priority for Morphism is jsonObject.name > this._name > new mathy name
        const name = jsonObject.name ?? this._name ?? this.#getMathyName();
        super.fromJSON(jsonObject);
        this.name = name;
        this.showDomainAndCodomain = jsonObject.showDomainAndCodomain ?? this.showDomainAndCodomain;
        this.showDefiningPairs = jsonObject.showDefiningPairs ?? this.showDefiningPairs;
        this.showInjectionSurjection = jsonObject.showInjectionSurjection ?? this.showInjectionSurjection;
        this.showManyArrows = jsonObject.showManyArrows ?? this.showManyArrows;
        this.arrowColor = jsonObject.arrowColor ?? this.arrowColor;
        this.arrowMargin = jsonObject.arrowMargin ?? this.arrowMargin;
        this.fontSize = jsonObject.fontSize ?? this.fontSize;
        this.useMulttableSourceTopRow = jsonObject.useMulttableSourceTopRow ?? this.useMulttableSourceTopRow;
        this.useMulttableDestinationTopRow = jsonObject.useMulttableDestinationTopRow ?? this.useMulttableDestinationTopRow;
        this.mapping = new Mapping(this.source.group, this.destination.group, jsonObject.definingPairs);
        return this;
    }
    // Find the simplest mathy name for this morphism that's not yet used on this sheet.
    #getMathyName() {
        const sheetElements = Array.from(this.model.sheetElements.values());
        const mathyNames = ['f', 'g', 'h'];
        const morphisms = sheetElements
            .filter((element) => element instanceof _a); // array of MorphismElements
        const [subscript, nameIndex] = ((morphisms /*: any */) /*: Array<MorphismElement> */)
            .map((morphismElement) => morphismElement.name) // array of MorphismElement names
            .map((name) => name.match(/[f-h](<sub>([0-9]+)<\/sub>)?$/)) // array of mathy names/nulls
            .reduce(// array of used subscripts (0 for no subscript) for each prefix in mathyNames
        (largestUsedSubscripts, stringMatch) => {
            if (stringMatch !== null) {
                const mathyNameIndex = mathyNames.findIndex((mathyName) => mathyName === stringMatch[0][0]);
                const subscript = (stringMatch[2] === undefined) ? 0 : parseInt(stringMatch[2]);
                largestUsedSubscripts[mathyNameIndex] = Math.max(largestUsedSubscripts[mathyNameIndex], subscript);
            }
            return largestUsedSubscripts;
        }, Array.from({ length: mathyNames.length }, () => -1)) // -1 => name not used
            .reduce(([subscript, nameIndex], largestUsedSubscripts, index) => {
            return (subscript <= largestUsedSubscripts) ? [subscript, nameIndex] : [largestUsedSubscripts, index];
        }, [Number.MAX_SAFE_INTEGER, 0]);
        return mathyNames[nameIndex] + ((subscript === -1) ? '' : `<sub>${subscript + 1}</sub>`);
    }
}
_a = MorphismElement;
// fields in SheetItemRequest, checked on debug
const knownFields = [
    // Common
    'className' /*: string */,
    'name' /*: html */,
    'h' /*: float */,
    'w' /*: float */,
    'x' /*: float */,
    'y' /*: float */,
    // Text
    'alignment' /*: 'left' | 'center' | 'right' */,
    'anchor_name' /*: string */,
    'fontColor' /*: color */,
    'fontSize' /*: string */,
    'opacity' /*: number */,
    'text' /*: html */,
    // Visualizer
    'groupURL' /*: string */,
    'highlight_colors' /*: Array<Array<?color>> */,
    // Multtable
    'organizing_subgroup' /*: number */,
    // Cycle graph
    // Cayley diagram
    'diagram_name' /*: string */,
    'arrow_generators' /*: Array<{generator: groupElement, color: color}> */,
    'strategy_parameters' /*: Array<strategy> */, // from CayleyGenerator
    // Link
    'destination_name' /*: string */,
    'source_name' /*: string */,
    // Connection
    'color' /*: color */,
    'hasArrowhead' /*: boolean */,
    'thickness' /*: number */,
    // Morphism
    'arrowColor' /*: 'none' | 'source' | 'destination' */,
    'definingPairs' /*: Array<[groupElement, groupElement]> */,
    'fontSize' /*: string */,
    'showInjectionSurjection' /*: boolean */,
    'showManyArrows' /*: boolean */,
];
// create new sheet, used by GroupInfo routines
// accepts {title, elements} or bare array (backward compat)
// stores in IndexedDB and opens Sheet.html in new window
function createNewSheet(arg /*: {title: string, elements: Array<SheetItemRequest>} | Array<SheetItemRequest> */) {
    const title = Array.isArray(arg) ? null : (arg.title ?? null);
    const jsonObjects = Array.isArray(arg) ? arg : arg.elements;
    if (Log.isActive('debug')) {
        jsonObjects.forEach((jsonObject) => {
            Object.keys(jsonObject).forEach((field) => {
                if (!knownFields.includes(field)) {
                    Log.err(`SheetModel.createNewSheet encountered unknown field ${field} in argument`);
                }
            });
        });
    }
    const newWindow = window.open('about:blank'); // workaround for Safari
    StoredObjects.setPassedSheet({ title, elements: jsonObjects })
        .then(() => { newWindow.location.href = 'Sheet.html?passedSheet'; });
}
// function used by Sheet.js
// load passed sheet from IndexedDB; returns title string or null
function loadPassedSheet(sheetModel) {
    return StoredObjects.getPassedSheet()
        .then((data) => {
        if (data == null)
            return null;
        // support both new {title, elements} format and old bare-array format
        const title = Array.isArray(data) ? null : (data.title ?? null);
        const sheetJSON = Array.isArray(data) ? data : data.elements;
        sheetModel.fromJSON(sheetJSON);
        return title;
    });
}
const classMap /*: Map<string, Class<SheetElement> */ = {
    TextElement: TextElement,
    CDElement: CDElement,
    CGElement: CGElement,
    MTElement: MTElement,
    ConnectingElement: ConnectingElement,
    MorphismElement: MorphismElement
};
//# sourceMappingURL=SheetModel.js.map
var _a;
/*

# SheetModel

The Model part of the Sheet Model-View-Control structure

```javascript
 */
import * as GEUtils from './GEUtils.js';
import * as Library from './Library.js';
import * as Log from './Log.js';
import { Mapping } from './Mapping.js';
import * as StoredObjects from './StoredObjects.js';
;
// #sheet-control has font-size: 1.25rem; #control-panel has min-width: 20em => 25rem total
export function sheetPanelWidth() {
    return 25 * parseFloat(getComputedStyle(document.documentElement).fontSize);
}
// Measure html at body font-size and return a px font-size scaled to fill maxWidth at 90%,
// clamped to [min, max] em-equivalents.
export function fittedFontSize(html, maxWidth, min = 1.5, max = 3) {
    const basePx = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const { width: width1em } = GEUtils.measureHTML(html);
    const px = Math.min(max * basePx, Math.max(min * basePx, (maxWidth * 0.9) * basePx / width1em));
    return `${px.toFixed(1)}px`;
}
export class SheetModel {
    #sheetElements = new Map();
    nextId = 0;
    classMap = {
        TextElement: TextElement,
        CDElement: CDElement,
        CGElement: CGElement,
        MTElement: MTElement,
        ConnectingElement: ConnectingElement,
        MorphismElement: MorphismElement
    };
    get sheetElements() {
        return this.#sheetElements;
    }
    toJSON() {
        return Array.from(this.sheetElements.values()).map((el) => el.toJSON());
    }
    fromJSON(json) {
        const jsonObjects = (typeof json == 'string')
            ? JSON.parse(json)
            : json;
        if (!Array.isArray(jsonObjects)
            || !jsonObjects.every((obj) => typeof obj === 'object' && typeof obj.className === 'string')) {
            throw new TypeError('Invalid argument to SheetModel.fromJSON');
        }
        this.sheetElements.clear();
        // go through all elements and build Map of elements with known ids
        // then go through all elements without an id and assign an id to them
        const objectsWithIds = new Map();
        const unnamedObjects = [];
        jsonObjects.forEach((obj) => {
            if (typeof obj.id === 'string') {
                objectsWithIds.set(obj.id, obj);
            }
            else {
                unnamedObjects.push(obj);
            }
        });
        while (unnamedObjects.length > 0) {
            while (objectsWithIds.has(this.nextId.toString())) { // find an unused id
                this.nextId++;
            }
            const copy = { ...unnamedObjects.pop(), id: this.nextId.toString() };
            objectsWithIds.set(copy.id, copy);
        }
        // topological sort so each anchor is always processed before its captions
        const sorted = []; // topological sort of sheet elements by anchor
        const state = new Map();
        const visit = (obj) => {
            const id = obj.id;
            if (state.get(id) === 'done')
                return;
            if (state.get(id) === 'visiting') {
                Log.warn(`SheetModel.fromJSON: circular anchor reference at id ${id}`);
                return;
            }
            state.set(id, 'visiting');
            if ('anchor_id' in obj && typeof obj.anchor_id === 'string') {
                const anchor = objectsWithIds.get(obj.anchor_id);
                if (anchor != null) {
                    visit(anchor);
                }
                else {
                    Log.warn(`SheetModel.fromJSON: unrecognized anchor reference ${obj.anchor_id}`);
                    return;
                }
            }
            state.set(id, 'done');
            sorted.push(obj);
        };
        Array.from(objectsWithIds.values()).forEach((obj) => visit(obj));
        sorted.forEach((jsonObject) => {
            this.addObjectAsElement(jsonObject, jsonObject.className);
        });
    }
    addObjectAsElement(plainObject, className) {
        if (!('id' in plainObject)) {
            while (this.sheetElements.has(this.nextId.toString())) { // find an unused id
                this.nextId++;
            }
            plainObject = { ...plainObject, id: this.nextId.toString() };
        }
        const newElement = new (this.classMap[className])(this, plainObject.id).fromJSON(plainObject);
        this.sheetElements.set(newElement.id, newElement);
        return newElement;
    }
    canConnect(linkElementOrType, sourceElementOrId, destinationElementOrId) {
        let linkElement = null;
        let linkType = linkElementOrType;
        if (typeof linkElementOrType === 'object') {
            linkElement = linkElementOrType;
            linkType = linkElement.className;
        }
        const source = (typeof sourceElementOrId == 'object')
            ? sourceElementOrId
            : this.sheetElements.get(sourceElementOrId);
        const destination = (typeof destinationElementOrId == 'object')
            ? destinationElementOrId
            : this.sheetElements.get(destinationElementOrId);
        const canConnect = linkElementOrType != null && source != null && destination != null && source != destination
            && ((linkType == 'ConnectingElement' && 'isNode' in source && 'isNode' in destination)
                || (linkType == 'MorphismElement' && 'isVisualizer' in source && 'isVisualizer' in destination))
            && Array.from(this.sheetElements.values())
                .filter((element) => 'isLink' in element && element != linkElement)
                .every((element) => (element.source != source && element.destination != source)
                || (element.source != destination && element.destination != destination));
        return canConnect;
    }
}
// SheetModel helper classes
export class SheetElement {
    id;
    className;
    #model;
    constructor(model, id) {
        this.#model = model;
        this.id = id;
    }
    get model() {
        return this.#model;
    }
    toJSON() {
        return {
            id: this.id
        };
    }
    fromJSON(_jsonObject) {
        return this;
    }
}
export class NodeElement extends SheetElement {
    x = 0;
    y = 0;
    w = 0.1;
    h = 0.1;
    z = 0;
    // FIXME: shouldn't this really be a NodeElement, not an id?
    anchor_id = null; // id of element this is anchored to; moves with that element
    isNode = true;
    constructor(model, id) {
        super(model, id);
        // NodeElements have even z-index, LinkElements have odd, so they can overlay/underlay the NodeElements they connect
        this.z = 2 * (model.sheetElements.size + 1);
    }
    toJSON() {
        return {
            ...super.toJSON(),
            ...(this.anchor_id != null && { anchor_id: this.anchor_id }),
            x: this.x,
            y: this.y,
            w: this.w,
            h: this.h,
            z: this.z
        };
    }
    fromJSON(jsonObject) {
        super.fromJSON(jsonObject);
        if (typeof jsonObject.anchor_id === 'string') {
            const anchor = this.model.sheetElements.get(jsonObject.anchor_id);
            this.anchor_id = anchor?.id ?? null;
        }
        this.x = jsonObject.x ?? 0;
        this.y = jsonObject.y ?? 0;
        this.w = jsonObject.w ?? 0.1;
        this.h = jsonObject.h ?? 0.1;
        this.z = jsonObject.z ?? 0;
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
export class TextElement extends NodeElement {
    className = 'TextElement';
    text;
    color; // background color
    opacity; // opacity in [0,1]: 0 => transparent, 1 => completely opaque
    fontSize;
    fontColor;
    alignment;
    isPlainText; // but take care for characters <, >, &
    toJSON() {
        return {
            ...super.toJSON(),
            className: 'TextElement',
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
        // @ts-expect-error: null has non-typesafe meaning in SheetView.TextElement; maybe change it to w, h < 0?
        if (jsonObject.w == null)
            this.w = null;
        // @ts-expect-error
        if (jsonObject.h == null)
            this.h = null;
        this.text = jsonObject.text ?? '';
        this.color = jsonObject.color ?? 'white';
        this.opacity = jsonObject.opacity ?? 1;
        this.fontSize = jsonObject.fontSize ?? '16px';
        this.fontColor = jsonObject.fontColor ?? 'black';
        this.alignment = jsonObject.alignment ?? 'left';
        this.isPlainText = jsonObject.isPlainText ?? false;
        return this;
    }
}
export class VisualizerElement extends NodeElement {
    group;
    visualizerJSON;
    isVisualizer = true;
    fromJSON(jsonObject) {
        this.group = Library.getGroupByURL(jsonObject.visualizerJSON.group_url);
        if (this.group == null) {
            const errorMessage = `unable to get group from ${jsonObject.visualizerJSON.group_url}`;
            Log.err(errorMessage);
            throw new TypeError(errorMessage);
        }
        super.fromJSON(jsonObject);
        return this;
    }
}
export class CDElement extends VisualizerElement {
    className = 'CDElement';
    toJSON() {
        return {
            ...super.toJSON(),
            className: 'CDElement',
            // @ts-expect-error: getVisualizerJSON is not statically available here; it's added in SheetViewModel.addElement
            visualizerJSON: this.getVisualizerJSON()
        };
    }
    fromJSON(jsonObject) {
        super.fromJSON(jsonObject);
        this.visualizerJSON = jsonObject.visualizerJSON;
        return this;
    }
}
export class CGElement extends VisualizerElement {
    className = 'CGElement';
    toJSON() {
        return {
            ...super.toJSON(),
            className: 'CGElement',
            // @ts-expect-error: getVisualizerJSON is not statically available here; it's added in SheetViewModel.addElement
            visualizerJSON: this.getVisualizerJSON()
        };
    }
    fromJSON(jsonObject) {
        super.fromJSON(jsonObject);
        this.visualizerJSON = jsonObject.visualizerJSON;
        return this;
    }
}
export class MTElement extends VisualizerElement {
    className = 'MTElement';
    organizingSubgroup = 0;
    separation = 0;
    toJSON() {
        return {
            ...super.toJSON(),
            className: 'MTElement',
            // @ts-expect-error: getVisualizerJSON is not statically available here; it's added in SheetViewModel.addElement
            visualizerJSON: this.getVisualizerJSON()
        };
    }
    fromJSON(jsonObject) {
        super.fromJSON(jsonObject);
        this.visualizerJSON = jsonObject.visualizerJSON;
        return this;
    }
}
export class LinkElement extends SheetElement {
    source;
    destination;
    isLink = true;
    // z level of link is determined from z levels of source/destination
    get z() {
        return Math.min(this.source.z, this.destination.z) - 1;
    }
    toJSON() {
        return {
            ...super.toJSON(),
            source_id: this.source.id,
            destination_id: this.destination.id
        };
    }
    fromJSON(jsonObject) {
        // test connectivity
        if (!this.model.canConnect(this, jsonObject.source_id, jsonObject.destination_id)) {
            const errorMessage = `Unable to connect '${jsonObject.source_id}' and '${jsonObject.destination_id}'`;
            Log.warn(errorMessage);
            throw new TypeError(errorMessage);
        }
        super.fromJSON(jsonObject);
        this.source = this.model.sheetElements.get(jsonObject.source_id.toString());
        this.destination = this.model.sheetElements.get(jsonObject.destination_id.toString());
        return this;
    }
}
export class ConnectingElement extends LinkElement {
    className = 'ConnectingElement';
    thickness; // 'width'? 'lineWidth'?
    color;
    hasArrowhead; // 'directed'?
    toJSON() {
        return {
            ...super.toJSON(),
            className: 'ConnectingElement',
            thickness: this.thickness,
            color: this.color,
            hasArrowhead: this.hasArrowhead
        };
    }
    fromJSON(jsonObject) {
        super.fromJSON(jsonObject);
        this.thickness = jsonObject.thickness ?? 4;
        this.color = jsonObject.color ?? 'black';
        this.hasArrowhead = jsonObject.hasArrowhead ?? true;
        return this;
    }
}
export class MorphismElement extends LinkElement {
    className = 'MorphismElement';
    morphismName;
    showDomainAndCodomain;
    showDefiningPairs;
    showInjectionSurjection;
    showManyArrows;
    arrowColor;
    arrowMargin;
    fontSize;
    useMulttableSourceTopRow;
    useMulttableDestinationTopRow;
    mapping;
    get z() {
        return this.showManyArrows
            ? Math.max(this.source.z, this.destination.z) + 1
            : super.z;
    }
    toJSON() {
        return {
            ...super.toJSON(),
            className: 'MorphismElement',
            morphismName: this.morphismName,
            showDomainAndCodomain: this.showDomainAndCodomain,
            showDefiningPairs: this.showDefiningPairs,
            showInjectionSurjection: this.showInjectionSurjection,
            showManyArrows: this.showManyArrows,
            arrowColor: this.arrowColor,
            arrowMargin: this.arrowMargin,
            fontSize: this.fontSize,
            useMulttableSourceTopRow: this.useMulttableSourceTopRow,
            useMulttableDestinationTopRow: this.useMulttableDestinationTopRow,
            definingPairs: this.mapping?.definingPairs ?? []
        };
    }
    fromJSON(jsonObject) {
        super.fromJSON(jsonObject);
        this.morphismName = jsonObject.morphismName ?? this.#getMathyName();
        this.showDomainAndCodomain = jsonObject.showDomainAndCodomain ?? false;
        this.showDefiningPairs = jsonObject.showDefiningPairs ?? false;
        this.showInjectionSurjection = jsonObject.showInjectionSurjection ?? false;
        this.showManyArrows = jsonObject.showManyArrows ?? false;
        this.arrowColor = jsonObject.arrowColor ?? 'none';
        this.arrowMargin = jsonObject.arrowMargin ?? 0;
        this.fontSize = jsonObject.fontSize ?? null;
        this.useMulttableSourceTopRow = jsonObject.useMulttableSourceTopRow ?? false;
        this.useMulttableDestinationTopRow = jsonObject.useMulttableDestinationTopRow ?? false;
        const sourceGroup = Library.getGroupByURL(this.source.visualizerJSON.group_url);
        const destinationGroup = Library.getGroupByURL(this.destination.visualizerJSON.group_url);
        this.mapping = new Mapping(sourceGroup, destinationGroup, jsonObject.definingPairs);
        return this;
    }
    // Find the simplest mathy name for this morphism that's not yet used on this sheet.
    #getMathyName() {
        const sheetElements = Array.from(this.model.sheetElements.values());
        const mathyNames = ['f', 'g', 'h'];
        const morphisms = sheetElements
            .filter((element) => element instanceof _a); // array of MorphismElements
        const [subscript, nameIndex] = morphisms
            .map((morphismElement) => morphismElement.morphismName) // array of MorphismElement names
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
            .reduce(([subscript, nameIndex], largestUsedSubscript, index) => {
            return (subscript <= largestUsedSubscript) ? [subscript, nameIndex] : [largestUsedSubscript, index];
        }, [Number.MAX_SAFE_INTEGER, 0]);
        return mathyNames[nameIndex] + ((subscript === -1) ? '' : `<sub>${subscript + 1}</sub>`);
    }
}
_a = MorphismElement;
// create new sheet, used by GroupInfo routines
// accepts {title, elements} or bare array (backward compat)
// stores in IndexedDB and opens Sheet.html in new window
export function createNewSheet(arg) {
    const title = Array.isArray(arg) ? null : (arg.title ?? null);
    const jsonObjects = Array.isArray(arg) ? arg : arg.elements;
    const translatedRequest = translateRequest(jsonObjects);
    const newWindow = window.open('about:blank'); // workaround for Safari
    StoredObjects.setPassedSheet({ title, elements: translatedRequest })
        .then(() => { newWindow.location.href = 'Sheet.html?passedSheet'; });
}
function translateRequest(requests) {
    const results = requests.map((request) => {
        const result = { ...request };
        // create visualizer and move relevant values to visualizer
        if (['CDElement', 'CGElement', 'MTElement'].includes(request.className)) {
            result.visualizerJSON = {};
            result.visualizerJSON.group_url = request.groupURL;
            result.visualizerJSON.highlight_colors = request.highlight_colors ?? [[], [], []];
            switch (request.className) {
                case 'CDElement':
                    if (['arrow_generators', 'diagram_name', 'strategy_parameters'].some((field) => request[field] != null)) {
                        result.visualizerJSON.diagram_control = {};
                        if (request?.diagram_name != null) {
                            result.visualizerJSON.diagram_control['diagram_name'] = request['diagram_name'];
                        }
                        else if (request?.strategy_parameters != null) {
                            result.visualizerJSON.diagram_control['strategy_parameters'] = request['strategy_parameters'];
                            if (request?.arrow_generators != null) {
                                result.visualizerJSON.diagram_control['arrow_generators'] = request['arrow_generators'];
                            }
                        }
                    }
                    break;
                case 'MTElement':
                    if ('organizing_subgroup' in request) {
                        result.visualizerJSON['organizing_subgroup'] = request['organizing_subgroup'];
                    }
                    break;
            }
        }
        return result;
    });
    return results;
}
// function used by Sheet.js
// load passed sheet from IndexedDB; returns title string or null
export function loadPassedSheet(sheetModel) {
    return StoredObjects.getPassedSheet()
        .then((data) => {
        let title = null;
        if (data != null) {
            if (typeof data == 'object') {
                if (Array.isArray(data)) {
                    sheetModel.fromJSON(data);
                }
                else {
                    let elements;
                    ({ title, elements } = data);
                    sheetModel.fromJSON(elements);
                }
            }
        }
        return title;
    });
}
//# sourceMappingURL=SheetModel.js.map
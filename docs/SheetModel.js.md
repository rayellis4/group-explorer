/* @flow

# SheetModel

The Model parrt of the Sheet Model-View-Control structure

```javascript
 */

import {createLargeCycleGraphView} from './CycleGraphView.js'
import {createModelProxy} from './GEUtils.js'
import * as Library from './Library.js'
import * as Log from './Log.js'
import {Mapping} from './Mapping.js'
import {createLargeMulttableView} from './MulttableView.js'
import * as SheetModelEditors from './SheetModelEditors.js'
import * as SheetView from './SheetView.js'
import * as StoredObjects from './StoredObjects.js'
import {THREE} from '../lib/externals.js'
import {createCayleyDiagramGenerator} from './CayleyDiagramGenerator.js'

const DEFAULT = {
  NodeElement: {
    x: 0,
    y: 0,
    w: 0.1,
    h: 0.1,

    // NodeElements have even z-index, LinkElements have odd, so they can overlay/underlay the NodeElements they connect
    get z () {
      return 2 * (sheetElements.size + 1)
    }
  },

  TextElement: {
    // w: null, => auto
    color: '#000000',
    opacity: 0, // transparent background
    text: '',
    fontSize: '16px',
    fontColor: 'black',
    alignment: 'left',
    isPlainText: false // text without special characters (e.g., <, >) renders fine in HTML, too
  },

  RectangleElement: {
    color: '#DDDDDD'
  },

  ConnectingElement: {
    thickness: 4,
    color: '#000000',
    hasArrowhead: true
  },

  MorphismElement: {
    name: 'f',
    showDomainAndCodomain: false,
    showDefiningPairs: false,
    showInjectionSurjection: false,
    showManyArrows: false,
    arrowColor: 'none',
    arrowMargin: 0,
    useMulttableSourceTopRow: false,
    useMulttableDestinationTopRow: false
  }
}

/*::
import {CayleyDiagramView} from './CayleyDiagramView.js'
import {CycleGraphView} from './CycleGraphView.js'
import {MulttableView} from './MulttableView.js'
import {Group} from './Group.js';

export type VisualizerName = 'CDElement' | 'CGElement' | 'MTElement';

export type ClassName =
      'RectangleElement'
    | 'TextElement'
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



// this will get assembled in Sheet.js
function createSheet () {
   const model = createModelProxy(new Model())
   const viewModel = new ViewModel(model)
   const view = new SheetView.View(viewModel)
}

class Model {
   sheetElements /*: Map<string, SheetElement> */ = new Map()

   toJSON () {
      return Array.from(sheetElements.values()).map((el) => el.toJSON())
   }

   fromJSON (json /*: string | Obj */) {
      const jsonObjects = (typeof json == 'string')
         ? JSON.parse(json)
         : json

      this.sheetElements.clear()  // remove existing elements (?) or build on existing

      for (const jsonObject of jsonObjects) {
         sheetElements.set(jsonObject.id, jsonObject)  // not right
      }      
   }
}

const sheetModel /*: SubscriptionProxy<Model> */ = createModelProxy(new Model())
export const sheetElements /*: Map<string, SheetElement> */ = sheetModel.sheetElements

class ViewModel {
   #model /*: Model */
   view /*: SheetView.View */

   constructor (model /*: ?SubscriptionProxy<Model> */) {
      if (model != null) {
         this.model = model
      }
   }

   get model () /*: Model */ {
      return this.#model
   }

   set model (model /*: SubscriptionProxy<Model> */) {
      this.model = model
      model.$subscribe(this, 'sheetElements')
   }

   update (field, value) {
      if ('map' in  value) {
         const {map, key} = value
         if (key == null && map.size == 0) {  // => clear
            // destroy all elements
         } else if (map.has(key)) {
            // something added
         } else {
            // something destroyed
            this.destroy()
         }
      } else if (value instanceof 'Map') {  // happens on initial subscribe
         this.model.sheetElements.forEach((value, key) => this.addElement(/* whatever */))
      } else {
         // we'd get here if new fields were added to Model
      }
   }

   addElement (type /*: ClassName */ = options.className, options) {
      const newElement = classMap[type](options)
      this.model.sheetElements.set(newElement.id, newElement)
      this.view.add(newElement)
   }

   clear () {
      this.view.clear()
   }

   removeElement (elementId) {
      if (this.model.sheetElements.has(elementId)) {
         const sheetElement = this.model.sheetElements.get(elementId)
         sheetElement.destroy()
         this.view.destroy(sheetElement)
         this.model.sheetElements.delete(elementId)
      }
   }
}

export function clear () {
  sheetElements.forEach((el) => {
     if (el instanceof NodeElement) {
        el.destroy()
     }
  })
  delete CDElement.activeElement
  delete CDElement.visualizer
}

export function toJSON () /*: Array<Obj> */ {
  return Array.from(sheetElements.values()).map((el) => el.toJSON())
}

export function fromJSON (jsonString /*: string */) {
  fromJSONObject(JSON.parse(jsonString))
}

export function fromJSONObject (jsonObjects /*: JSONType */) {
  // remove existing elements
  clear()

  for (const jsonObject of jsonObjects) {
    addElement(jsonObject)
  }
}

export function addElement (options /*: Obj */, type /*: string */ = options.className) /*: SheetElement */ {
  const newElement = new (eval(type))().fromJSON(options)
  sheetElements.set(newElement.id, newElement)
  newElement.viewElement = SheetView.createViewElement(newElement)
  return newElement
}

export class SheetElement {
/*::
    id: string;
   +viewElement: SheetView.SheetView;
    z: integer;  // z-index
*/
  get className () {
    return this.constructor.name
  }

  destroy () {
    if (this.viewElement != null) {
      this.viewElement.destroy()
    }
    sheetElements.delete(this.id)
  }

  redraw () {
    this.viewElement.redraw()
  }

  updateTransform () {
    this.viewElement.updateTransform()
  }

  updateZ () {
    this.viewElement.updateZ()
  }

  toJSON (_ /*: mixed */, customKeys /*: Array<string> */ = []) /*: Obj */ { // FIXME -- we can be more precise
    customKeys.push('viewElement')
    const jsonObject = Object
      .getOwnPropertyNames(this)
      .filter(
        (key) => !customKeys.includes(key))
      .reduce(
        (json, key) => {
          // $FlowFixMe -- perhaps we can make this less generic?
          json[key] = this[key]
          return json
        }, {})
    jsonObject.className = this.className

    return jsonObject
  }

  fromJSON (jsonObject /*: Obj */, customKeys /*: Array<string> */ = []) /*: SheetElement */ {
    customKeys.push('id', 'viewElement')
    Object.getOwnPropertyNames(this).filter((key) => !customKeys.includes(key))
    // $FlowFixMe
      .forEach((key) => { this[key] = (jsonObject[key] === undefined) ? this[key] : jsonObject[key] })

    if (jsonObject.id === undefined) {
      for (this.id = '' + sheetElements.size; sheetElements.has(this.id); this.id = parseInt(this.id) + 1 + '') {
        continue
      }
    } else {
      this.id = jsonObject.id
    }

    return this
  }
}

export class NodeElement extends SheetElement {
/*::
   +viewElement: SheetView.NodeView;
    x: float;
    y: float;
    w: float;
    h: float;
*/
  constructor () {
    super()
    Object.assign(this, DEFAULT.NodeElement)
  }

  move (dxOrVector /*: float */, dy /*: float */) /*: this */ {
    if (typeof dxOrVector == 'object') {
      this.x += dxOrVector.x
      this.y += dxOrVector.y
    } else {
      this.x += dxOrVector
      this.y += dy
    }

    return this
  }

  moveTo (x /*: float */, y /*: float */) {
    this.x = x
    this.y = y
  }

  resize (widthOrVector /*: float */, height /*: float */) /*: this */ {
    if (typeof widthOrVector == 'object') {
      this.w = widthOrVector.x || widthOrVector.width
      this.h = widthOrVector.y || widthOrVector.height
    } else {
      this.w = widthOrVector
      this.h = height
    }

    return this
  }

  get links () /*: Array<LinkElement> */ {
    const links = Array
      .from(sheetElements.values())
      .filter((el) => el instanceof LinkElement && (el.source === this || el.destination === this))
    return ((links /*: any */) /*: Array<LinkElement> */)
  }

  get position () /*: SheetView.SheetUnits */ {
    return new SheetView.SheetUnits(this.x, this.y)
  }

  get size () /*: SheetView.LogicalUnits */ {
    return new SheetView.LogicalUnits(this.w, this.h)
  }

  copy () {
    const jsonObject = this.toJSON()
    delete jsonObject.id
    jsonObject.z = DEFAULT.NodeElement.z
    const newElement = addElement(jsonObject)
    newElement.moveToFront()
  }

  destroy () {
    this.links.forEach((link) => link.destroy())
    super.destroy()
  }

  redraw () {
    super.redraw()
    this.links.forEach((link) => link.redraw())
  }

  updateTransform () {
    super.updateTransform()
    this.links.forEach((link) => link.redraw())
  }

  // tries to move element up or down compared to other elements, and returns whether a move was made
  moveZ (comparator /*: (a: SheetElement, b: SheetElement) => number */, repeat /*: boolean */) {
    // sort nodes according to comparator
    const sortedNodes = ((Array
      .from(sheetElements.values())
      .filter((el) => el instanceof NodeElement)
      .sort(comparator) /*: any */) /*: Array<NodeElement> */)

    // swap current node z value with next node in sort (unless this is the last node in the sort)
    const updatedNodes = new Set/*:: <NodeElement> */()
    for (let inx = sortedNodes.findIndex((el) => el.id === this.id); inx < sortedNodes.length - 1; inx++) {
      const thisNodeElement = sortedNodes[inx]
      const nextNodeElement = sortedNodes[inx + 1];

      // swap z values of this node and next
      // $FlowFixMe -- Flow doesn't support this idiomatic variable swap
      [thisNodeElement.z, nextNodeElement.z] = [nextNodeElement.z, thisNodeElement.z]
      updatedNodes.add(thisNodeElement)
      updatedNodes.add(nextNodeElement)

      if (!repeat) {
        break
      }

      // repair sortedNodes for next iteration
      // $FlowFixMe -- Flow doesn't support this idiomatic variable swap
      [sortedNodes[inx], sortedNodes[inx + 1]] = [sortedNodes[inx + 1], sortedNodes[inx]]
    }

    updatedNodes.forEach((node) => node.updateZ())

    ConnectingElement.updateZ()
  }

  moveForward () {
    this.moveZ((a, b) => a.z - b.z, false)
  }

  moveBackward () {
    this.moveZ((a, b) => b.z - a.z, false)
  }

  moveToFront () {
    this.moveZ((a, b) => a.z - b.z, true)
  }

  moveToBack () {
    this.moveZ((a, b) => b.z - a.z, true)
  }
}

export class RectangleElement extends NodeElement {
/*::
    color: color;
*/
  constructor () {
    super()
    Object.assign(this, DEFAULT.RectangleElement)
  }
}

export class TextElement extends NodeElement {
/*::
    _text: string;
    color: color;  // background color
    opacity: float;  // opacity in [0,1]; 0 => transparent, 1 => completely opaque
    fontSize: string;
    fontColor: color;
    alignment: 'left' | 'center' | 'right';
    isPlainText: boolean;
    displayTextNeedsUpdate: boolean;
*/
  constructor () {
    super()
    Object.assign(this, DEFAULT.TextElement)
  }

   get text () {
      return this._text
   }

   set text (text) {
      if (text != this._text) {
         this._text = text
         this.displayNeedsTextUpdate = true
      }
   }

   getEditor (location) {
      new SheetModelEditors.TextEditor(this, location)
   }

   toJSON (_ /*: mixed */, customKeys /*: Array<string> */ = []) /*: Obj */ {
      customKeys.push('_text')
      const jsonObject = super.toJSON(_, customKeys)
      jsonObject.text = this.text

      return jsonObject
   }

   fromJSON (jsonObject /*: Obj */, customKeys /*: Array<string> */ = []) /*: TextElement */ {
      customKeys.push('text')
      super.fromJSON(jsonObject, customKeys)

      this.text = jsonObject.text
      this.displayNeedsTextUpdate = true

      if (this.text !== '') {
         this.w = jsonObject.w // undefined => .css('width', 'auto')
         this.h = jsonObject.h
      }
      if (jsonObject.color != null) {
         this.opacity = (jsonObject.opacity == null) ? 1 : jsonObject.opacity
      }

      return this
   }
}

export class VisualizerElement extends NodeElement {
/*::
    group: Group
    URL: string
   _visualizer: CayleyDiagramView | CycleGraphView | MulttableView
   +viewElement: SheetView.VisualizerView
*/
  get morphisms () {
    const morphisms = Array
      .from(sheetElements.values())
      .filter((el) => el instanceof MorphismElement && (el.source === this || el.destination === this))
    return ((morphisms /*: any */) /*: Array<LinkElement> */)
  }

  updateZ () {
    super.updateZ()
    this.morphisms.forEach((morphism) => morphism.updateZ())
  }

  toJSON (_ /*: mixed */, customKeys /*: Array<string> */ = []) /*: Obj */ {
    customKeys.push('group', 'visualizer')
    const jsonObject = super.toJSON(_, customKeys)
    jsonObject.groupURL = this.group.URL
    jsonObject.visualizer = this.visualizer.toJSON()

    return jsonObject
  }

  get visualizer () {
    return this._visualizer
  }

  fromJSON (jsonObject /*: Obj */, customKeys /*: Array<string> */ = []) /*: VisualizerElement */ {
    customKeys.push('group', 'visualizer')
    super.fromJSON(jsonObject, customKeys)

    this.group = ((Library.getGroupByURL(jsonObject.groupURL) /*: any */) /*: Group */)
    if (this.group == null) {
      Log.err(`Unable to find group ${jsonObject.groupURL}`)
      return null
    }

    return this
  }

  getEditor (_location) {
    new SheetModelEditors.RemoteEditor(this)
  }
}

export class CDElement extends VisualizerElement {
/*::
  static activeElement: CDElement
  static visualizer: CayleyDiagramGenerator
  visualizerJSON: Obj
  isShareable: boolean
*/
  get visualizer () {
    this.moveVisualizerToThis()
    return CDElement.visualizer
  }

  moveVisualizerToThis () {
    if (CDElement.activeElement != this) {
      if (CDElement.activeElement != null) {  // delete activeElement?
        CDElement.activeElement.visualizerJSON = CDElement.visualizer.toJSON()
      }
      if (this.visualizerJSON != null) {
        if (CDElement.activeElement?.isShareable && this.isShareable) {
          CDElement.visualizer.cayleyDiagramView.highlightColors = this.visualizerJSON.highlightColors
          CDElement.visualizer.cayleyDiagramView.highlightControl = this.visualizerJSON.highlightControl
        } else {
          CDElement.visualizer.fromJSON(this.visualizerJSON)
        }
      }
      CDElement.activeElement = this
    }
  }

  toJSON (_ /*: mixed */, customKeys /*: Array<string> */ = []) /*: Obj */ {
    customKeys.push('visualizerJSON', '_visualizer')
    const jsonObject = super.toJSON(_, customKeys)

    return jsonObject
  }

  fromJSON (jsonObject /*: Obj */, customKeys /*: Array<string> */ = []) /*: CDElement */ {
    customKeys.push('arrows', 'arrowColors', 'strategies', 'highlights')
    super.fromJSON(jsonObject, customKeys)

    if ('visualizer' in jsonObject) {
      this.fromVisualizerJSON(jsonObject)
    } else {
      this.fromPassedSheetJSON(jsonObject)
    }

    return this
  }

  markDirty () {
    this.isShareable = false
  }

  fromPassedSheetJSON (jsonObject) {
    if (CDElement.visualizer == null) {
      CDElement.visualizer = createCayleyDiagramGenerator({ display_labels: true, width: this.w, height: this.h })
        .fromJSON(jsonObject)
      this.isShareable = (jsonObject.strategies == null)
    } else {
      this.isShareable = CDElement.activeElement.isShareable && (jsonObject.groupURL == CDElement.visualizer.group.URL)
      if (this.isShareable) {
        CDElement.visualizer.cayleyDiagramView.highlightColors = jsonObject.highlightColors || [[],[],[]]
      } else {
        CDElement.visualizer.fromJSON(jsonObject)
      }
    }
    this.visualizerJSON = CDElement.visualizer.toJSON()
    CDElement.activeElement = this

    return this
  }

  fromVisualizerJSON (jsonObject) {
    // if there is no CDElement.visualizer, make one
    if (CDElement.visualizer == null) {
      CDElement.visualizer = createCayleyDiagramGenerator({ display_labels: true, width: this.w, height: this.h })
        .fromJSON(jsonObject.visualizer)
      this.visualizerJSON = CDElement.visualizer.toJSON()
      this.isShareable = jsonObject.isShareable  // import old sheet?
      CDElement.activeElement = this
    } else {
      this.isShareable = jsonObject.isShareable && (jsonObject.groupURL == CDElement.visualizer.group.URL)
      if (  this.isShareable
        && CDElement.activeElement.isShareable
        && jsonObject.groupURL == CDElement.visualizer.group.URL
      ) {
        this.moveVisualizerToThis()
        CDElement.visualizer.cayleyDiagramView.highlightColors = jsonObject.visualizer.highlightColors || [[],[],[]]
      } else {
        this.moveVisualizerToThis()
        CDElement.visualizer.fromJSON(jsonObject.visualizer)
      }
      this.visualizerJSON = CDElement.visualizer.toJSON()
    }

    return this
  }
}

export class CGElement extends VisualizerElement {
  fromJSON (jsonObject /*: Obj */, customKeys /*: Array<string> */ = []) /*: CGElement */ {
    super.fromJSON(jsonObject, customKeys)
    this._visualizer /*: CycleGraphViewModel */ = createLargeCycleGraphView(this.group, {})
    if ('visualizer' in jsonObject) {
       this.visualizer.fromJSON(jsonObject.visualizer)
    } else {
       this.visualizer.fromJSON(jsonObject)
    }
    return this
  }

  toJSON (_ /*: mixed */, customKeys /*: Array<string> */ = []) /*: Obj */ {
    customKeys.push('_visualizer')
    const jsonObject = super.toJSON(_, customKeys)

    return jsonObject
  }

  get visualizer () {
    return ((this._visualizer /*: any */) /*: CycleGraphView */)
  }
}

export class MTElement extends VisualizerElement {
  fromJSON (jsonObject /*: Obj */, customKeys /*: Array<string> */ = []) /*: MTElement */ {
    super.fromJSON(jsonObject, customKeys)
    this._visualizer /*: MulttableViewModel */ = createLargeMulttableView(this.group, {})
    if ('visualizer' in jsonObject) {
       this.visualizer.fromJSON(jsonObject.visualizer)
    } else {
       this.visualizer.fromJSON(jsonObject)
    }
    return this
  }

  toJSON (_ /*: mixed */, customKeys /*: Array<string> */ = []) /*: Obj */ {
    customKeys.push('_visualizer')
    const jsonObject = super.toJSON(_, customKeys)

    return jsonObject
  }

  get visualizer () {
    return ((this._visualizer /*: any */) /*: MulttableView */)
  }
}

export class LinkElement extends SheetElement {
/*::
    source: NodeElement;
    destination: NodeElement;
*/
  toJSON (_ /*: mixed */, customKeys /*: Array<string> */ = []) /*: Obj */ {
    customKeys.push('source', 'destination')
    const jsonObject = super.toJSON(_, customKeys)
    jsonObject.sourceId = (this.source === undefined) ? null : this.source.id
    jsonObject.destinationId = (this.destination === undefined) ? null : this.destination.id

    return jsonObject
  }

  fromJSON (jsonObject /*: Obj */, customKeys /*: Array<string> */ = []) /*: LinkElement */ {
    customKeys.push('sourceId', 'destinationId')
    super.fromJSON(jsonObject, customKeys)

    if (jsonObject.sourceId !== undefined) {
      this.source = ((sheetElements.get(jsonObject.sourceId) /*: any */) /*: NodeElement */)
    }
    if (jsonObject.destinationId !== undefined) {
      this.destination = ((sheetElements.get(jsonObject.destinationId) /*: any */) /*: NodeElement */)
    }

    return this
  }
}

export class ConnectingElement extends LinkElement {
/*::
    static z: number
    thickness: number;
    color: color;
    hasArrowhead: boolean;
 */
  constructor () {
    super()
    Object.assign(this, DEFAULT.ConnectingElement)
  }

  get z () /*: integer */ {
    return ConnectingElement.z
  }

  set z (z /*: integer */) { /* covers up nonkosher OO in Flow */ }

  static updateZ (newZ /*: ?number */) {
    // find all connecting elements, find smallest z of any source or destination, and set ConnectingElement z to one less
    // if this changes the ConnectingElement z then re-draw all connecting elements
    const connectingElements = ((Array
      .from(sheetElements.values())
      .filter((el) => el instanceof ConnectingElement) /*: any */) /*: Array<ConnectingElement> */)
    if (connectingElements.length > 0) {
      const zMin = connectingElements.reduce((zMin, connector) => {
        return Math.min(zMin, connector.source.z, connector.destination.z)
      }, newZ || Number.MAX_VALUE)

      if (ConnectingElement.z !== zMin - 1) {
        ConnectingElement.z = zMin - 1
        connectingElements.forEach((conn) => conn.updateZ())
      }
    }
  }

  getEditor (_location) {
     const {x, y} = new SheetView.SheetUnits(
        (this.source.x + this.source.w/2 + this.destination.x + this.destination.w/2)/2,
        (this.source.y + this.source.h/2 + this.destination.y + this.destination.h/2)/2
     ).toWindowUnits()

     new SheetModelEditors.ConnectionEditor(this, {clientX: x, clientY: y})
  }

  fromJSON (jsonObject /*: Obj */, customKeys /*: Array<string> */ = []) /*: ConnectingElement */ {
    customKeys.push('source', 'destination')
    super.fromJSON(jsonObject, customKeys)

    if (!(this.source instanceof NodeElement && this.destination instanceof NodeElement)) {
      Log.err('Illegal source/destination objects in ConnectingElement.fromJSON')
    }

    if (this.className === 'ConnectingElement') {
      const zMin = Math.min(this.destination.z, this.source.z)
      ConnectingElement.updateZ(zMin)
    }

    return this
  }
}

export class MorphismElement extends LinkElement {
/*::
    // $FlowFixMe                   // This really isn't kosher OO: the type of a subclass's read/write field should
    source: VisualizerElement;      // should be the same as its type in the superclass. So in order for MorphismElement
    // $FlowFixMe                   // to be a subclass of LinkElement, source and destination should be NodeElements,
    destination: VisualizerElement; // not VisualizerElements. This isn't necessarily a problem for Javascript, but it
                                    // does confuse the Flow typechecker.
    name: string;
    showDomainAndCodomain: boolean;
    showDefiningPairs: boolean;
    showInjectionSurjection: boolean;
    showManyArrows: boolean;
    arrowMargin: number;
    mapping: Mapping;
 */
  constructor () {
    super()
    Object.assign(this, DEFAULT.MorphismElement)
  }

  get z () /*: integer */ {
    return this.showManyArrows
      ? Math.max(this.source.z, this.destination.z) + 1
      : Math.min(this.source.z, this.destination.z) - 1
  }

  set z (z /*: integer */) { /* covers up nonkosher OO in Flow */ }

  getMapping () /*: Array<groupElement> */ {
    return this.mapping.fullMapping
  }

  // Find the simplest mathy name for this morphism that's not yet used on this sheet.
  getMathyName () /*: string */ {
    const mathyNames = ['f', 'g', 'h']
    const morphisms = Array
      .from(sheetElements.values()) // array of SheetElements
      .filter((element) => element instanceof MorphismElement) // array of MorphismElements

    const [subscript, nameIndex] = ((morphisms /*: any */) /*: Array<MorphismElement> */)
      .map((morphismElement) => morphismElement.name) // array of MorphismElement names
      .map((name) => name.match(/[f-h](<sub>([0-9]+)<\/sub>)?$/)) // array of mathy names/nulls
      .reduce( // array of used subscripts (0 for no subscript) for each prefix in mathyNames
        (largestUsedSubscripts, stringMatch) => {
          if (stringMatch !== null) {
            const mathyNameIndex = mathyNames.findIndex((mathyName) => mathyName === stringMatch[0][0])
            const subscript = (stringMatch[2] === undefined) ? 0 : parseInt(stringMatch[2])
            largestUsedSubscripts[mathyNameIndex] = Math.max(largestUsedSubscripts[mathyNameIndex], subscript)
          }
          return largestUsedSubscripts
        }, Array.from({ length: mathyNames.length }, () => -1)) // -1 => name not used
      .reduce(([subscript, nameIndex], largestUsedSubscripts, index) => {
        return (subscript <= largestUsedSubscripts) ? [subscript, nameIndex] : [largestUsedSubscripts, index]
      }, [Number.MAX_SAFE_INTEGER, 0])

    return mathyNames[nameIndex] + ((subscript === -1) ? '' : `<sub>${subscript + 1}</sub>`)
  }

  getLabel () /*: string */ {
    let html = this.name
    if (this.showDomainAndCodomain) {
      html += ` : ${this.source.group.name} ⟶ ${this.destination.group.name}`
    }

    if (this.showDefiningPairs) {
      html += this.mapping
        .definingPairs
        .map(([g, h]) => {
          return `<br>${this.name}(${this.source.group.representation[g]}) = ${this.destination.group.representation[h]}`
        })
        .join('')
    }

    if (this.showInjectionSurjection) {
      html += '<br>' + (this.mapping.isInjective ? '' : 'not ') + '1-1'
      html += '<br>' + (this.mapping.isSurjective ? '' : 'not ') + 'onto'
    }

    return html
  }

  getEditor (location) {
     const {x, y} = new SheetView.SheetUnits(
        (this.source.x + this.source.w/2 + this.destination.x + this.destination.w/2)/2,
        (this.source.y + this.source.h/2 + this.destination.y + this.destination.h/2)/2
     ).toWindowUnits()

     new SheetModelEditors.MorphismEditor(this,  {clientX: x, clientY: y})
  }

  toJSON (_ /*: mixed */, customKeys /*: Array<string> */ = []) /*: Obj */ {
    customKeys.push('mapping')
    const jsonObject = super.toJSON(_, customKeys)
    jsonObject.definingPairs = Array.from(this.mapping.definingPairs)

    return jsonObject
  }

  fromJSON (jsonObject /*: Obj */, customKeys /*: Array<string> */ = []) /*: MorphismElement */ {
    customKeys.push('name', 'source', 'destination', 'definingPairs')
    super.fromJSON(jsonObject, customKeys)

    if (!(this.source instanceof VisualizerElement && this.destination instanceof VisualizerElement)) {
      Log.err('Illegal source/destination objects in MorphismElement.fromJSON')
    }

    this.mapping = new Mapping(this.source.group, this.destination.group, jsonObject.definingPairs)
    this.name = (jsonObject.name === undefined) ? this.getMathyName() : jsonObject.name

    return this
  }
}

// store argument in IndexedDB and open Sheet.html in new window
export function createNewSheet (jsonObjectsFunction) {
   const otherWindow = window.open()
   new Promise((resolve, _reject) => resolve(jsonObjectsFunction()))
      .then((jsonObjects) => {
         // Convert highlights.background field into highlightColors
         for (const jsonObject of jsonObjects) {
            if ('highlights' in jsonObject && 'background' in jsonObject.highlights) {
               jsonObject.highlightColors = [
                  jsonObject.highlights.background.map((color) => (color == '') ? null : color),
                  [], []
               ]
               delete jsonObject.highlights
            }
         }

         StoredObjects.setPassedSheet(jsonObjects)
            .then(() => otherWindow.location = `./Sheet.html?passedSheet`)
      })
}

// load passed sheet from IndexedDB
export function loadPassedSheet () {
   StoredObjects.getPassedSheet()
      .then((sheetJSON) => {
         if (sheetJSON != null) {
            fromJSONObject(sheetJSON)
         }
      })
}



const classMap /*: {[string]: Class<SheetElement>} */ = {
   RectangleElement: RectangleElement,
   TextElement: TextElement,
   CDElement: CDElement,
   CGElement: CGElement,
   MTElement: MTElement,
   ConnectingElement: ConnectingElement,
   MorphismElement: MorphismElement
}

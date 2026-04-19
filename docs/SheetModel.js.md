/* @flow

# SheetModel

The Model parrt of the Sheet Model-View-Control structure

```javascript
 */
import * as Library from './Library.js'
import * as Log from './Log.js'
import {Mapping} from './Mapping.js'
import * as StoredObjects from './StoredObjects.js'

export {SheetModel, createNewSheet, loadPassedSheet}
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
   #sheetElements /*: Map<string, SheetElement> */ = new Map()
   nextId = 0

   get sheetElements () {
      return this.#sheetElements
   }

   toJSON () {
      return Array.from(this.sheetElements.values()).map((el) => el.toJSON())
   }

   fromJSON (json /*: string | Obj */) {
      const jsonObjects = (typeof json == 'string')
         ? JSON.parse(json)
         : json

      this.sheetElements.clear()

      jsonObjects.forEach((jsonObject) => {
         this.addObjectAsElement(jsonObject, jsonObject.className)
      })
   }

   addObjectAsElement (plainObject, className) {
      const newElement = new (classMap[className])(this).fromJSON(plainObject)
      this.sheetElements.set(newElement.id, newElement)
      return newElement
   }

   canConnect (
      linkType /*: 'ConnectingElement' | 'MorphismElement' */,
      source /*: SheetElement */,
      destination /*: SheetElement*/
   ) /*: boolean */ {
      const canConnect =
         (   (linkType == 'ConnectingElement' && source.isNode && destination.isNode)
          || (linkType == 'MorphismElement' && source.isVisualizer && destination.isVisualizer))
      && Array.from(this.sheetElements.values())
            .every((element) =>
                  !(element.isLink)
               || (  (element.source != source && element.destination != source)
                  || (element.source != destination && element.destination != destination)))

      return canConnect
   }
}

// SheetModel helper classes
class SheetElement {
   id /*: string */
   _name /*: string */
   className /*: string */
   #model /*: SheetModel */

   constructor (model /*: SheetModel */) {
      this.#model = model
   }

   get model () {
      return this.#model
   }

   get name () {
      return this._name ?? this.id
   }

   set name (name) {
      this._name = name
   }

   toJSON () {
      return {
         id: this.id,
         name: this._name,
         className: this.className
      }
   }

   fromJSON (jsonObject) {
      if (this.id == null || jsonObject.id != this.id) {
         let id
         if (jsonObject.id == null) {
            id = this.model.nextId++
         } else {
            if (this.model.sheetElements.has(jsonObject.id)) {
               if (window.confirm('duplicate id detected on input: assign new id or abort input?')) {
                  id = this.model.nextId++
               } else {
                  throw new TypeError('duplicate id detected in input JSON, processing aborted')
               }
            } else {
               id = jsonObject.id
               this.model.nextId = (parseInt(id) >= this.model.nextId) ? parseInt(id) + 1 : this.model.nextId
            }
         }
         this.id = id.toString()
      }
      this._name = jsonObject.name
      return this
   }
}

class NodeElement extends SheetElement {
   x /*: float */ = 0
   y /*: float */ = 0
   w /*: float */ = 0.1
   h /*: float */ = 0.1
   z /*: integer */
   anchor_id /*: ?string */  // id of element this is anchored to; moves with that element
   isNode = true

   constructor (model /*: SheetModel */) {
      super(model)

      // NodeElements have even z-index, LinkElements have odd, so they can overlay/underlay the NodeElements they connect
      this.z = 2 * (model.sheetElements.size + 1)
   }

   toJSON () {
      return {
         ...super.toJSON(),
         anchor_id: this.anchor_id,
         x: this.x,
         y: this.y,
         w: this.w,
         h: this.h,
         z: this.z
      }
   }

   fromJSON (jsonObject) {
      super.fromJSON(jsonObject)
      if (jsonObject.anchor_name != null) {
         const anchor = Array.from(this.model.sheetElements.values())
            .find((el) => el.name === jsonObject.anchor_name)
         this.anchor_id = anchor?.id ?? null
      } else {
         this.anchor_id = jsonObject.anchor_id ?? null
      }
      this.x = jsonObject.x ?? this.x
      this.y = jsonObject.y ?? this.y
      this.w = jsonObject.w ?? this.w
      this.h = jsonObject.h ?? this.h
      this.z = jsonObject.z ?? this.z
      return this
   }
}

class TextElement extends NodeElement {
   className = 'TextElement'
   text /*: string */ = ''
   color /*: color */ = '#ffffff'  // background color
   opacity /*: float */ = 1  // opacity in [0,1]: 0 => transparent, 1 => completely opaque
   fontSize /*: string */ = '16px'
   fontColor /*: color */ = 'black'
   alignment /*: 'left' | 'center' | 'right' */ = 'left'
   isPlainText /*: boolean */ = false  // but take care for characters <, >, &

   toJSON () {
      return {
         ...super.toJSON(),
         text: this.text,
         color: this.color,
         opacity: this.opacity,
         fontSize: this.fontSize,
         fontColor: this.fontColor,
         alignment: this.alignment,
         isPlainText: this.isPlainText
      }
   }

   fromJSON (jsonObject) {
      super.fromJSON(jsonObject)
      this.text = jsonObject.text ?? this.text
      this.color = jsonObject.color ?? this.color
      this.opacity = jsonObject.opacity ?? this.opacity
      this.fontSize = jsonObject.fontSize ?? this.fontSize
      this.fontColor = jsonObject.fontColor ?? this.fontColor
      this.alignment = jsonObject.alignment ?? this.alignment
      this.isPlainText = jsonObject.isPlainText ?? this.isPlainText
      return this
   }
}

class VisualizerElement extends NodeElement {
   group /*: Group */
   highlightColors /*: Array<Array<color>> */
   visualizer /*: any */  // opaque JSON blob; live visualizer object lives in SheetView
   isVisualizer = true

   toJSON () {
      return {
         ...super.toJSON(),
         groupURL: this.group.URL,
         highlight_colors: this.highlightColors,
         visualizer: this.visualizer
      }
   }

   fromJSON (jsonObject) {
      super.fromJSON(jsonObject)
      this.group = Library.getGroupByURL(jsonObject.groupURL)
      this.highlightColors = jsonObject.highlight_colors ?? [[], [], []]
      this.visualizer = jsonObject.visualizer

      return this
   }
}

class CDElement extends VisualizerElement {
   className = 'CDElement'
   diagramControl

   toJSON () {
      // serialize this.diagramControl manually?
      return {
         ...super.toJSON(),
         diagram_control: this.diagramControl
      }
   }

   fromJSON (jsonObject) {
      super.fromJSON(jsonObject)

      const setDiagramControlFromJSON = (field) => {
         this.diagramControl ??= {}
         this.diagramControl[field] = jsonObject[field]
         delete jsonObject[field]
      }

      // remove diagram_name, strategy_parameters, arrow_generators from JSON and place in diagramControl
      if ('diagram_name' in jsonObject) {
         setDiagramControlFromJSON('diagram_name')
      } else if ('strategy_parameters' in jsonObject) {
         setDiagramControlFromJSON('strategy_parameters')
         if ('arrow_generators' in jsonObject) {
            setDiagramControlFromJSON('arrow_generators')
         }
      }

      // prefer explicit diagram_control in jsonObject
      if ('diagram_control' in jsonObject) {
         this.diagramControl = jsonObject.diagram_control
      }

      return this
   }
}

class CGElement extends VisualizerElement {
   className = 'CGElement'
}

class MTElement extends VisualizerElement {
   className = 'MTElement'
}

// check canConnect on creation?
class LinkElement extends SheetElement {
   source /*: NodeElement */  // not covariant
   destination /*: NodeElement */  // not covariant
   isLink = true

   // z level of link is determined from z levels of source/destination

   toJSON () {
      return {
         ...super.toJSON(),
         source_id: this.source.id,
         destination_id: this.destination.id
      }
   }

   fromJSON (jsonObject) {
      super.fromJSON(jsonObject)

      if (this.source == null) {  // assume source and destination initializations are in sync
         const sheetElementArray = (jsonObject.source_id == null)
            ? Array.from(this.model.sheetElements.values())
            : []
         const source = (jsonObject.source_id != null)
            ? this.model.sheetElements.get(jsonObject.source_id)
            : sheetElementArray.find((element) => element.name == jsonObject.source_name)
         const destination = (jsonObject.destination_id != null)
            ? this.model.sheetElements.get(jsonObject.destination_id)
            : sheetElementArray.find((element) => element.name == jsonObject.destination_name)

         if (this.model.canConnect(this.className, source, destination)) {
            this.source = source
            this.destination = destination
         } else {
            Log.err(`SheetViewModel.addElement: improper ${this.className} ` +
               `between ${source.name} and ${destination.name}`)
         }
      }

      return this
   }
}

class ConnectingElement extends LinkElement {
   className = 'ConnectingElement'
   thickness /*: number */ = 4  // 'width'? 'lineWidth'?
   color /*: color */ = '#000000'
   hasArrowhead /*: boolean */ = true // 'directed'?

   toJSON () {
      return {
         ...super.toJSON(),
         thickness: this.thickness,
         color: this.color,
         hasArrowhead: this.hasArrowhead
      }
   }

   fromJSON (jsonObject) {
      super.fromJSON(jsonObject)
      this.thickness = jsonObject.thickness ?? this.thickness
      this.color = jsonObject.color ?? this.color
      this.hasArrowhead = jsonObject.hasArrowhead ?? this.hasArrowhead
      return this
   }
}

class MorphismElement extends LinkElement {
   className = 'MorphismElement'
   showDomainAndCodomain /*: boolean */ = false
   showDefiningPairs /*: boolean */ = false
   showInjectionSurjection /*: boolean */ = false
   showManyArrows /*: boolean */ = false
   arrowColor /*: 'none' | 'source' | 'destination' */ = 'none'
   arrowMargin /*: number */ = 0
   useMulttableSourceTopRow /*: boolean */ = false
   useMulttableDestinationTopRow /*: boolean */ = false
   mapping /*: Mapping */

   get z () /*: integer */ {
      return this.showManyArrows
         ? Math.max(this.source.z, this.destination.z) + 1
         : Math.min(this.source.z, this.destination.z) - 1
   }

   toJSON () {
      return {
         ...super.toJSON(),
         showDomainAndCodomain: this.showDomainAndCodomain,
         showDefiningPairs: this.showDefiningPairs,
         showInjectionSurjection: this.showInjectionSurjection,
         showManyArrows: this.showManyArrows,
         arrowColor: this.arrowColor,
         arrowMargin: this.arrowMargin,
         useMulttableSourceTopRow: this.useMulttableSourceTopRow,
         useMulttableDestinationTopRow: this.useMulttableDestinationTopRow,
         definingPairs: this.mapping.definingPairs,
      }
   }

   fromJSON (jsonObject) {
      // override default naming: priority for Morphism is jsonObject.name > this._name > new mathy name
      const name = jsonObject.name ?? this._name ?? this.#getMathyName()
      super.fromJSON(jsonObject)
      this.name = name
      this.showDomainAndCodomain = jsonObject.showDomainAndCodomain ?? this.showDomainAndCodomain
      this.showDefiningPairs = jsonObject.showDefiningPairs ?? this.showDefiningPairs
      this.showInjectionSurjection = jsonObject.showInjectionSurjection ?? this.showInjectionSurjection
      this.showManyArrows = jsonObject.showManyArrows ?? this.showManyArrows
      this.arrowColor = jsonObject.arrowColor ?? this.arrowColor
      this.arrowMargin = jsonObject.arrowMargin ?? this.arrowMargin
      this.useMulttableSourceTopRow = jsonObject.useMulttableSourceTopRow ?? this.useMulttableSourceTopRow
      this.useMulttableDestinationTopRow = jsonObject.useMulttableDestinationTopRow ?? this.useMulttableDestinationTopRow
      this.mapping = new Mapping(this.source.group, this.destination.group, jsonObject.definingPairs)

      return this
   }

   // Find the simplest mathy name for this morphism that's not yet used on this sheet.
   #getMathyName () /*: string */ {
      const sheetElements = Array.from(this.model.sheetElements.values())
      const mathyNames = ['f', 'g', 'h']
      const morphisms = sheetElements
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
}


// field documentation, checked on debug
const knownFields = [
   'alignment' /*: 'left' | 'center' | 'right' */,
   'anchor_name' /*: string */,
   'arrow_generators' /*: Array<{generator: groupElement, color: color}> */,
   'className' /*: string */,
   'color' /*: color */,
   'definingPairs' /*: Array<[groupElement, groupElement]> */,
   'destination_name' /*: string */,
// 'diagram_name' /*: string */,
   'fontColor' /*: color */,
   'fontSize' /*: string */,
   'groupURL' /*: string */,
   'h' /*: float */,
   'hasArrowhead' /*: boolean */,
   'highlight_colors'/*: Array<Array<?color>> */,
   'name' /*: string */,
   'showInjectionSurjection' /*: boolean */,
   'showManyArrows' /*: boolean */,
   'source_name' /*: string */,
   'strategy_parameters' /*: Array<strategy> */,  // from CayleyGenerator
   'text' /*: html */,
   'thickness' /*: number */,
   'w' /*: float */,
   'x' /*: float */,
   'y' /*: float */,
]

// create new sheet, used by GroupInfo routines
// stores evaluated argument in IndexedDB and opens Sheet.html in new window
function createNewSheet (jsonObjects /*: Array<SheetItemRequest> */) {
   if (Log.isActive('debug')) {
      jsonObjects.forEach((jsonObject) => {
         Object.keys(jsonObject).forEach((field) => {
            if (!knownFields.includes(field)) {
               Log.err(`SheetModel.createNewSheet encountered unknown field ${field} in argument`)
            }
         })
      })
   }

   const newWindow = window.open('about:blank')  // workaround for Safarix
   StoredObjects.setPassedSheet(jsonObjects)
      .then(() => { newWindow.location.href = 'Sheet.html?passedSheet' })
}

// function used by Sheet.js
// load passed sheet from IndexedDB
function loadPassedSheet (sheetModel) {
   StoredObjects.getPassedSheet()
      .then((sheetJSON) => {
         if (sheetJSON != null) {
            sheetModel.fromJSON(sheetJSON)
         }
      })
}

const classMap /*: Map<string, Class<SheetElement> */ = {
   TextElement: TextElement,
   CDElement: CDElement,
   CGElement: CGElement,
   MTElement: MTElement,
   ConnectingElement: ConnectingElement,
   MorphismElement: MorphismElement
}

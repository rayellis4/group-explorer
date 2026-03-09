/* @flow

# SheetModel

The Model parrt of the Sheet Model-View-Control structure

```javascript
 */
import * as Library from './Library.js'
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
class SheetModel {
   #sheetElements /*: Map<string, SheetElement> */ = new Map()

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

      this.sheetElements.clear()  // remove existing elements (?) or build on existing

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
      && Array.from(this.sheetElements.values) 
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
   className /*: string */
   #model /*: SheetModel */

   constructor (model /*: SheetModel */) {
      this.#model = model
   }

   get model () {
      return this.#model
   }

   toJSON () {
      return {id: this.id, className: this.className}
   }

   fromJSON (jsonObject) {
      this.id = jsonObject.id ?? `${this.model.sheetElements.size}`
      return this
   }
}

class NodeElement extends SheetElement {
   x /*: float */ = 0
   y /*: float */ = 0
   w /*: float */ = 0.1
   h /*: float */ = 0.1
   z /*: integer */
   isNode = true

   constructor (model /*: SheetModel */) {
      super(model)

      // NodeElements have even z-index, LinkElements have odd, so they can overlay/underlay the NodeElements they connect
      this.z = 2 * (model.sheetElements.size + 1)
   }

   toJSON () {
      return {...super.toJSON(), x: this.x, y: this.y, w: this.w, h: this.h, z: this.z}
   }

   fromJSON (jsonObject) {
      super.fromJSON(jsonObject)
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
      return {...super.toJSON(), text: this.text, color: this.color, opacity: this.opacity,
         fontSize: this.fontSize, fontColor: this.fontColor, alignment: this.alignment,
         isPlainText: this.isPlainText}
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
   visualizer /*: any */  // opaque JSON blob; live visualizer object lives in SheetView
   isVisualizer = true

   toJSON () {
      return {...super.toJSON(), groupURL: this.group.URL, visualizer: this.visualizer}
   }

   fromJSON (jsonObject) {
      super.fromJSON(jsonObject)
      this.group = Library.getGroupByURL(jsonObject.groupURL)
      this.visualizer = jsonObject.visualizer ?? null
      return this
   }
}

class CDElement extends VisualizerElement {
   className = 'CDElement'
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
      return {...super.toJSON(), sourceId: this.source.id, destinationId: this.destination.id}
   }

   fromJSON (jsonObject) {
      super.fromJSON(jsonObject)
      this.source = this.model.sheetElements.get(jsonObject.sourceId)
      this.destination = this.model.sheetElements.get(jsonObject.destinationId)

      if (!this.model.canConnect(this.className, this.source, this.destination)) {
         throw new Error(`SheetViewModel.addElement: improper ${this.className} ` +
            `between ${this.source.id} and ${this.destination.id}`)
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
      return {...super.toJSON(), thickness: this.thickness, color: this.color, hasArrowhead: this.hasArrowhead}
   }

   fromJSON (jsonObject) {
      super.fromJSON(jsonObject)
      this.thickness = jsonObject.thickness ?? this.thickness4
      this.color = jsonObject.color ?? this.color
      this.hasArrowhead = jsonObject.hasArrowhead ?? this.hasArrowhead
      return this
   }
}

class MorphismElement extends LinkElement {
   className = 'MorphismElement'
   name /*: string */ = 'f'
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
         name: this.name,
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
      super.fromJSON(jsonObject)
      this.name = jsonObject.name ?? this.name
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
}

// function used by GroupInfo
// store argument in IndexedDB and open Sheet.html in new window
function createNewSheet (jsonObjectsFunction) {
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

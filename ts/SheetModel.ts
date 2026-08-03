/*

# SheetModel

The Model part of the Sheet Model-View-Control structure

```javascript
 */
import * as GEUtils from './GEUtils.js'
import * as Library from './Library.js'
import * as Log from './Log.js'
import { Mapping, definingPairType } from './Mapping.js'
import * as StoredObjects from './StoredObjects.js'

import type { ArrowGenerator, StrategyParameters } from './CayleyDiagramGenerator.ts'
import type { Group } from './Group.ts'

export type VisualizerType = 'CDElement' | 'MTElement' | 'CGElement'

type ConcreteSheetElementClass =
   TextElement | CDElement | CGElement | MTElement | ConnectingElement | MorphismElement
type ConcreteSheetElementClassName =
   'TextElement' | 'CDElement' | 'CGElement' | 'MTElement' | 'ConnectingElement' | 'MorphismElement'

export type SheetJSON = NodeElementJSON | VisualizerElementJSON | LinkElementJSON |
   TextElementJSON | CDElementJSON | CGElementJSON | MTElementJSON | ConnectingElementJSON | MorphismElementJSON 

export type alignmentType  = 'left' | 'center' | 'right'
type arrowColorType = 'none' | 'source' | 'destination'

interface SheetElementFields {
   id?: string
}
export interface NodeElementFields extends SheetElementFields {
   x: float,
   y: float,
   w: float,
   h?: float,  // undefined h => h determined automatically on first display
   z?: float,
   anchor_id?: string
}
export interface TextElementFields extends NodeElementFields {
   alignment?: alignmentType,
   color?: color,  // background color
   fontSize?: string,
   fontColor?: string,
   isPlainText?: boolean
   opacity?: float,  // background opacity
   text?: string,
}
export interface VisualizerElementFields extends NodeElementFields {
   groupURL: string,
   highlight_colors?: Maybe<color>[][],
   visualizer?: unknown
}
export interface CDElementFields extends VisualizerElementFields {
   arrow_generators?: ArrowGenerator[],
   chunk_subgroup_index?: integer,
   diagram_control?: unknown, // Record<string, unknown>,
   diagram_name?: string,
   strategy_parameters?: StrategyParameters[]
}
export interface CGElementFields extends VisualizerElementFields {
}
export interface MTElementFields extends VisualizerElementFields {
   color_reordering?: 'topRowFixed' | 'elementColorsFixed',
   coloration?: 'rainbow' | 'grayscale' | 'none',
   elements?: groupElement[],
   organizing_subgroup?: integer,
   separation?: float
}
export interface LinkElementFields extends SheetElementFields {
   source_id: string,
   destination_id: string,
}
export interface ConnectingElementFields extends LinkElementFields {
   thickness?: float,
   color?: color,
   hasArrowhead?: boolean
}
export interface MorphismElementFields extends LinkElementFields {
   morphismName?: string,
   arrowColor?: arrowColorType,
   arrowMargin?: number,
   definingPairs?: definingPairType[]
   fontSize?: Maybe<string>,
   showDomainAndCodomain?: boolean,
   showDefiningPairs?: boolean,
   showInjectionSurjection?: boolean,
   showManyArrows?: boolean,
   useMulttableSourceTopRow?: boolean,
   useMulttableDestinationTopRow?: boolean,
}
export interface SheetElementJSON extends SheetElementFields {
   className: ConcreteSheetElementClassName
}
export interface NodeElementJSON extends NodeElementFields {
   className: 'TextElement' | 'CDElement' | 'CGElement' | 'MTElement'
}
export interface TextElementJSON extends TextElementFields {
   className: 'TextElement'
}
export interface VisualizerElementJSON extends VisualizerElementFields {
   className: 'CDElement' | 'CGElement' | 'MTElement'
}
export interface CDElementJSON extends CDElementFields {
   className: 'CDElement'
}
export interface CGElementJSON extends CGElementFields {
   className: 'CGElement'
}
export interface MTElementJSON extends MTElementFields {
   className: 'MTElement'
}
export interface LinkElementJSON extends LinkElementFields {
   className: 'ConnectingElement' | 'MorphismElement'
}
export interface ConnectingElementJSON extends ConnectingElementFields {
   className: 'ConnectingElement'
}
export interface MorphismElementJSON extends MorphismElementFields {
   className: 'MorphismElement'
}

/*
export interface VizDisplay<VisDispJSON> {
   group: Group;
   getSize(): {w: number, h: number};
   setSize(w: number, h: number): void;
   getImage(): Image;
   toJSON(): VizDispJSON;
   fromJSON(VizDispJSON): void;
   unitSquarePosition(groupElement): {x: float, y: float};
};

export type MSG_external<VizType: any> = any;
export type MSG_editor<VizType: any> = any;
 */

// #sheet-control has font-size: 1.25rem; #control-panel has min-width: 20em => 25rem total
export function sheetPanelWidth () {
   return 25 * parseFloat(getComputedStyle(document.documentElement).fontSize)
}

// Measure html at body font-size and return a px font-size scaled to fill maxWidth at 90%,
// clamped to [min, max] em-equivalents.
export function fittedFontSize (html: html, maxWidth: float, min: float = 1.5, max: float = 3) {
   const basePx = parseFloat(getComputedStyle(document.documentElement).fontSize)
   const {width: width1em} = GEUtils.measureHTML(html)
   const px = Math.min(max * basePx, Math.max(min * basePx, (maxWidth * 0.9) * basePx / width1em))
   return `${px.toFixed(1)}px`
}

interface SheetElementJSONWithId extends SheetElementJSON { id: string }

export class SheetModel {
   #sheetElements: Map<string, SheetElement> = new Map()
   nextId = 0
   classMap: Record<string, new (...args: any[]) => { fromJSON (jsonObject: unknown): ConcreteSheetElementClass}> = {
      TextElement: TextElement,
      CDElement: CDElement,
      CGElement: CGElement,
      MTElement: MTElement,
      ConnectingElement: ConnectingElement,
      MorphismElement: MorphismElement
   }

   get sheetElements (): Map<string, SheetElement> {
      return this.#sheetElements
   }

   toJSON (): SheetJSON[] {
      return Array.from(this.sheetElements.values()).map((el) => el.toJSON() as SheetJSON)
   }

   fromJSON (json: string | SheetJSON[]) {
      const jsonObjects: SheetElementJSON[] = (typeof json == 'string')
         ? JSON.parse(json)
         : json

      if (  !Array.isArray(jsonObjects)
         || !jsonObjects.every((obj) => typeof obj === 'object' && typeof obj.className === 'string')) {
         throw new TypeError('Invalid argument to SheetModel.fromJSON')
      }

      this.sheetElements.clear()

      // go through all elements and build Map of elements with known ids
      // then go through all elements without an id and assign an id to them
      const objectsWithIds: Map<string, SheetElementJSONWithId> = new Map()
      const unnamedObjects: SheetElementJSON[] = []
      jsonObjects.forEach((obj: SheetElementJSON) => {
         if (typeof obj.id === 'string') {
            objectsWithIds.set(obj.id, obj as SheetElementJSONWithId)
         } else {
            unnamedObjects.push(obj)
         }
      })
      while (unnamedObjects.length > 0) {
         while (objectsWithIds.has(this.nextId.toString())) {  // find an unused id
            this.nextId++
         }
         const copy = {...unnamedObjects.pop(), id: this.nextId.toString()} as SheetElementJSONWithId
         objectsWithIds.set(copy.id, copy)
      }

      // topological sort so each anchor is always processed before its captions
      const sorted: SheetElementJSONWithId[] = []  // topological sort of sheet elements by anchor
      const state: Map<string, 'done' | 'visiting'> = new Map()

      const visit = (obj: SheetElementJSONWithId) => {
         const id = obj.id
         if (state.get(id) === 'done')
            return
         if (state.get(id) === 'visiting') {
            Log.warn(`SheetModel.fromJSON: circular anchor reference at id ${id}`);
            return
         }
         state.set(id, 'visiting')
         if ('anchor_id' in obj && typeof obj.anchor_id === 'string') {
            const anchor = objectsWithIds.get(obj.anchor_id)
            if (anchor != null) {
               visit(anchor)
            } else {
               Log.warn(`SheetModel.fromJSON: unrecognized anchor reference ${obj.anchor_id}`)
               return
            }
         }
         state.set(id, 'done')
         sorted.push(obj)
      }
      Array.from(objectsWithIds.values()).forEach((obj) => visit(obj))

      sorted.forEach((jsonObject) => {
         this.addObjectAsElement(jsonObject as SheetJSON, jsonObject.className)
      })
   }

   addObjectAsElement (plainObject: SheetJSON, className: string): SheetElement {
      if (!('id' in plainObject)) {
         while (this.sheetElements.has(this.nextId.toString())) {  // find an unused id
            this.nextId++
         }
         plainObject = {...plainObject, id: this.nextId.toString()}
      }
      const newElement = new (this.classMap[className])(this, plainObject.id as string).fromJSON(plainObject)
      this.sheetElements.set(newElement.id, newElement)
      return newElement
   }

   canConnect (
      linkElementOrType: LinkElement | 'ConnectingElement' | 'MorphismElement',
      sourceElementOrId: SheetElement | string,
      destinationElementOrId: SheetElement | string
   ): boolean {
      let linkElement: Maybe<LinkElement> = null
      let linkType = linkElementOrType as string
      if (typeof linkElementOrType === 'object') {
         linkElement = linkElementOrType
         linkType = linkElement.className
      }
      const source: Maybe<SheetElement> = (typeof sourceElementOrId == 'object')
         ? sourceElementOrId
         : this.sheetElements.get(sourceElementOrId)
      const destination: Maybe<SheetElement> = (typeof destinationElementOrId == 'object')
         ? destinationElementOrId
         : this.sheetElements.get(destinationElementOrId)
      const canConnect =
         linkElementOrType != null && source != null && destination != null && source != destination 
      && (  (linkType == 'ConnectingElement' && 'isNode' in source && 'isNode' in destination)
         || (linkType == 'MorphismElement' && 'isVisualizer' in source && 'isVisualizer' in destination))
      && (Array.from(this.sheetElements.values())
         .filter((element) => 'isLink' in element && element != linkElement) as LinkElement[])
         .every((element) => 
               ((element as LinkElement).source != source && (element as LinkElement).destination != source)
            || ((element as LinkElement).source != destination && (element as LinkElement).destination != destination))

      return canConnect
   }
}

// SheetModel helper classes
export abstract class SheetElement {
   id: string
   className!: string
   #model: SheetModel

   constructor (model: SheetModel, id: string) {
      this.#model = model
      this.id = id
   }

   get model () {
      return this.#model
   }

   abstract get z (): integer

   toJSON (): SheetElementJSON {
      return {
         id: this.id,
         className: this.className as ConcreteSheetElementClassName
      }
   }

   fromJSON (jsonObject: SheetElementJSON) {
      return this
   }
}
export abstract class NodeElement extends SheetElement {
   x: float = 0
   y: float = 0
   w: float = 0.1
   h: float = 0.1
   z: integer = 0
   // FIXME: shouldn't this really be a NodeElement, not an id?
   anchor_id: Maybe<string> = null  // id of element this is anchored to; moves with that element
   isNode = true

   constructor (model: SheetModel, id: string) {
      super(model, id)

      // NodeElements have even z-index, LinkElements have odd, so they can overlay/underlay the NodeElements they connect
      this.z = 2 * (model.sheetElements.size + 1)
   }

   toJSON (): NodeElementJSON {
      return {
         ...super.toJSON() as NodeElementJSON,
         ...(this.anchor_id != null && {anchor_id: this.anchor_id}),
         x: this.x,
         y: this.y,
         w: this.w,
         h: this.h,
         z: this.z
      }
   }

   fromJSON (jsonObject: NodeElementJSON) {
      super.fromJSON(jsonObject)
      if (typeof jsonObject.anchor_id === 'string') {
         const anchor = this.model.sheetElements.get(jsonObject.anchor_id)
         this.anchor_id = anchor?.id ?? null
      }
      this.x = jsonObject.x ?? 0
      this.y = jsonObject.y ?? 0
      this.w = jsonObject.w ?? 0.1
      this.h = jsonObject.h ?? 0.1
      this.z = jsonObject.z ?? 0
      // snap to anchor's bottom edge; anchor always precedes caption after fromJSON sort
      if (this.anchor_id != null) {
         const anchor = this.model.sheetElements.get(this.anchor_id) as NodeElement
         if (anchor != null) {
            this.x = anchor.x
            this.y = anchor.y + anchor.h
            this.w = anchor.w
         }
      }
      return this
   }
}

export class TextElement extends NodeElement {
   className = 'TextElement'

   text!: string
   color!: color    // background color
   opacity!: float  // opacity in [0,1]: 0 => transparent, 1 => completely opaque
   fontSize!: string
   fontColor!: color
   alignment!: alignmentType
   isPlainText!: boolean      // but take care for characters <, >, &

   toJSON (): TextElementJSON {
      return {
         ...super.toJSON() as TextElementJSON,
         text: this.text,
         color: this.color,
         opacity: this.opacity,
         fontSize: this.fontSize,
         fontColor: this.fontColor,
         alignment: this.alignment,
         isPlainText: this.isPlainText
      }
   }

   fromJSON (jsonObject: TextElementJSON) {
      super.fromJSON(jsonObject)
      // @ts-expect-error: null has non-typesafe meaning in SheetView.TextElement; maybe change it to w, h < 0?
      if (jsonObject.w == null) this.w = null
      // @ts-expect-error
      if (jsonObject.h == null) this.h = null
      this.text = jsonObject.text ?? ''
      this.color = jsonObject.color ?? 'white'
      this.opacity = jsonObject.opacity ?? 1
      this.fontSize = jsonObject.fontSize ?? '16px'
      this.fontColor = jsonObject.fontColor ?? 'black'
      this.alignment = jsonObject.alignment ?? 'left'
      this.isPlainText = jsonObject.isPlainText ?? false
      
      return this
   }
}

export abstract class VisualizerElement extends NodeElement {
   group!: Group
   highlightColors!: Maybe<color>[][]  // golden record is in the visualizer; this is just initialization
   visualizer: unknown  // opaque JSON blob; live visualizer object lives in SheetView
   isVisualizer = true

   toJSON (): VisualizerElementJSON {
      // @ts-expect-error: getVisualizerJSON is added in SheetViewModel.addElement
      const visualizerJSON = this.getVisualizerJSON()
      return {
         ...super.toJSON() as VisualizerElementJSON,
         groupURL: this.group.URL,
         // highlightColors inside visualizer is golden; highlight_colors here is for CDView fast-path init
         highlight_colors: visualizerJSON?.highlightColors ?? this.highlightColors ?? [[], [], []],
         visualizer: visualizerJSON ?? this.visualizer
      }
   }

   fromJSON (jsonObject: VisualizerElementJSON) {
      super.fromJSON(jsonObject)
      this.group = Library.getGroupByURL(jsonObject.groupURL as string) as Group
      this.highlightColors = jsonObject.highlight_colors as Maybe<color>[][] ?? [[], [], []]
      this.visualizer = jsonObject.visualizer

      return this
   }
}

export class CDElement extends VisualizerElement {
   className = 'CDElement'
   diagramControl?: Record<string, unknown>  // initialization only; baked into visualizer JSON on first getVisualizerJSON() call

   toJSON (): CDElementJSON {
      const json = super.toJSON() as CDElementJSON
      if (json.visualizer == null) {
         json.diagram_control = this.diagramControl
      }
      return json
   }

   fromJSON (jsonObject: CDElementJSON) {
      super.fromJSON(jsonObject)

      // @ts-expect-error: null => initialization in progress
      this.diagramControl = null

      const moveField = (field: keyof CDElementJSON) => {
         if (this.diagramControl == null) {
            this.diagramControl = {}
         }
         this.diagramControl[field] = jsonObject[field]
         delete jsonObject[field]
      }

      // remove diagram_name, strategy_parameters, arrow_generators from JSON and place in diagramControl
      if ('diagram_name' in jsonObject) {
         moveField('diagram_name')
      } else if ('strategy_parameters' in jsonObject) {
         moveField('strategy_parameters')
         if ('arrow_generators' in jsonObject) {
            moveField('arrow_generators')
         }
      }

      // prefer explicit diagram_control in jsonObject
      if ('diagram_control' in jsonObject != null) {
         this.diagramControl = jsonObject.diagram_control as Record<string, unknown>
      }

      return this
   }
}

export class CGElement extends VisualizerElement {
   className = 'CGElement'
}

export class MTElement extends VisualizerElement {
   className = 'MTElement'
   organizingSubgroup: integer = 0
   separation: float = 0

   toJSON (): MTElementJSON {
      const json = super.toJSON() as MTElementJSON
      if (json.visualizer == null) {  // do we ever have to check this for MTElement?
         json.organizing_subgroup = this.organizingSubgroup
         json.separation = this.separation
      }
      return json
   }

   fromJSON (jsonObject: MTElementJSON) {
      super.fromJSON(jsonObject)
      this.organizingSubgroup = jsonObject.organizing_subgroup ?? 0
      this.separation = jsonObject.separation ?? 0

      return this
   }
}

export abstract class LinkElement extends SheetElement {
   source!: NodeElement  // not covariant
   destination!: NodeElement  // not covariant
   isLink = true

   // z level of link is determined from z levels of source/destination
   get z (): integer {
      return Math.min(this.source.z, this.destination.z) - 1
   }

   toJSON (): LinkElementJSON {
      return {
         ...super.toJSON() as LinkElementJSON,
         source_id: this.source.id,
         destination_id: this.destination.id
      }
   }

   fromJSON (jsonObject: LinkElementJSON) {
      super.fromJSON(jsonObject)

      this.source = this.model.sheetElements.get(jsonObject.source_id.toString()) as NodeElement
      this.destination = this.model.sheetElements.get(jsonObject.destination_id.toString()) as NodeElement

      return this
   }
}

export class ConnectingElement extends LinkElement {
   className = 'ConnectingElement'
   thickness!: float  // 'width'? 'lineWidth'?
   color!: color
   hasArrowhead!: boolean // 'directed'?

   toJSON (): ConnectingElementJSON {
      return {
         ...super.toJSON() as ConnectingElementJSON,
         thickness: this.thickness,
         color: this.color,
         hasArrowhead: this.hasArrowhead
      }
   }

   fromJSON (jsonObject: ConnectingElementJSON) {
      // test connectivity
      if (!this.model.canConnect(this, jsonObject.source_id, jsonObject.destination_id)) {
         throw new TypeError(`Unable to create connection between '${jsonObject.source_id}' and '${jsonObject.destination_id}'`)
      }
      super.fromJSON(jsonObject)
      this.thickness = jsonObject.thickness ?? 4
      this.color = jsonObject.color ?? 'black'
      this.hasArrowhead = jsonObject.hasArrowhead ?? true
      return this
   }
}

export class MorphismElement extends LinkElement {
   declare source: VisualizerElement
   declare destination: VisualizerElement
   
   className = 'MorphismElement'
   morphismName!: string
   showDomainAndCodomain!: boolean
   showDefiningPairs!: boolean
   showInjectionSurjection!: boolean
   showManyArrows!: boolean
   arrowColor!: arrowColorType
   arrowMargin!: number
   fontSize!: Maybe<string>
   useMulttableSourceTopRow!: boolean
   useMulttableDestinationTopRow!: boolean
   mapping!: Mapping

   get z (): integer {
      return this.showManyArrows
         ? Math.max(this.source.z, this.destination.z) + 1
         : super.z
   }

   toJSON (): MorphismElementJSON {
      const json = {
         ...super.toJSON() as MorphismElementJSON,
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
      }

      return json
   }

   fromJSON (jsonObject: MorphismElementJSON) {
      // test connectivity
      if (!this.model.canConnect(this, jsonObject.source_id, jsonObject.destination_id)) {
         throw new TypeError(`Unable to create morphism between '${jsonObject.source_id}' and '${jsonObject.destination_id}'`)
      }
      // override default naming: priority for Morphism is jsonObject.name > this._name > new mathy name
      super.fromJSON(jsonObject)
      this.morphismName = jsonObject.morphismName ?? this.#getMathyName()
      this.showDomainAndCodomain = jsonObject.showDomainAndCodomain ?? false
      this.showDefiningPairs = jsonObject.showDefiningPairs ?? false
      this.showInjectionSurjection = jsonObject.showInjectionSurjection ?? false
      this.showManyArrows = jsonObject.showManyArrows ?? false
      this.arrowColor = jsonObject.arrowColor ?? 'none'
      this.arrowMargin = jsonObject.arrowMargin ?? 0
      this.fontSize = jsonObject.fontSize ?? null
      this.useMulttableSourceTopRow = jsonObject.useMulttableSourceTopRow ?? false
      this.useMulttableDestinationTopRow = jsonObject.useMulttableDestinationTopRow ?? false
      this.mapping = new Mapping(this.source.group, this.destination.group, jsonObject.definingPairs)

      return this
   }

   // Find the simplest mathy name for this morphism that's not yet used on this sheet.
   #getMathyName (): string {
      const sheetElements = Array.from(this.model.sheetElements.values())
      const mathyNames = ['f', 'g', 'h']
      const morphisms = sheetElements
         .filter((element) => element instanceof MorphismElement) // array of MorphismElements

      const [subscript, nameIndex] = morphisms
         .map((morphismElement) => morphismElement.morphismName) // array of MorphismElement names
         .map((name) => name.match(/[f-h](<sub>([0-9]+)<\/sub>)?$/)) // array of mathy names/nulls
         .reduce<integer[]>( // array of used subscripts (0 for no subscript) for each prefix in mathyNames
            (largestUsedSubscripts, stringMatch) => {
               if (stringMatch !== null) {
                  const mathyNameIndex = mathyNames.findIndex((mathyName) => mathyName === stringMatch[0][0])
                  const subscript = (stringMatch[2] === undefined) ? 0 : parseInt(stringMatch[2])
                  largestUsedSubscripts[mathyNameIndex] = Math.max(largestUsedSubscripts[mathyNameIndex], subscript)
               }
               return largestUsedSubscripts
            }, Array.from({ length: mathyNames.length }, () => -1)) // -1 => name not used
         .reduce<[integer, integer]>(([subscript, nameIndex], largestUsedSubscript, index) => {
            return (subscript <= largestUsedSubscript) ? [subscript, nameIndex] : [largestUsedSubscript, index]
         }, [Number.MAX_SAFE_INTEGER, 0])
      return mathyNames[nameIndex] + ((subscript === -1) ? '' : `<sub>${subscript + 1}</sub>`)
  }
}

// create new sheet, used by GroupInfo routines
// accepts {title, elements} or bare array (backward compat)
// stores in IndexedDB and opens Sheet.html in new window
export function createNewSheet (arg: {title: string, elements: SheetJSON[]} | SheetJSON[]) {
   const title = Array.isArray(arg) ? null : (arg.title ?? null)
   const jsonObjects = Array.isArray(arg) ? arg : arg.elements
   const newWindow = window.open('about:blank') as Window // workaround for Safari
   StoredObjects.setPassedSheet({title, elements: jsonObjects})
      .then(() => { newWindow.location.href = 'Sheet.html?passedSheet' })
}

// function used by Sheet.js
// load passed sheet from IndexedDB; returns title string or null
export function loadPassedSheet (sheetModel: SheetModel): Promise<Maybe<string>> {
   return StoredObjects.getPassedSheet()
      .then((data) => {
         let title: Maybe<string> = null
         if (data != null) {
            if (typeof data == 'object') {
               if (Array.isArray(data)) {
                  sheetModel.fromJSON(data as SheetJSON[])
               } else {
                  let elements: SheetJSON[]
                  ({title, elements} = data as {title: string, elements: SheetJSON[]})
                  sheetModel.fromJSON(elements)
               }
            }
         }
         return title
   })
}

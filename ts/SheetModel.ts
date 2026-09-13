/*

# SheetModel

The Model part of the Sheet Model-View-Control structure

```javascript
 */
import { layoutCayleyDiagram } from './CayleyDiagramGenerator.js'
import { layoutToJSON } from './CayleyDiagramView.js'
import * as GEUtils from './GEUtils.js'
import * as Library from './Library.js'
import * as Log from './Log.js'
import { Mapping, definingPairType } from './Mapping.js'
import * as StoredObjects from './StoredObjects.js'
import * as THREE from '../lib/externals.js'

import type { ArrowGenerator, StrategyParameters } from './CayleyDiagramGenerator.ts'
import type { CayleyDiagramModelJSON } from './CayleyDiagramModel.js'
import type { CycleGraphJSON } from './CycleGraphModel.ts'
import type { Group } from './Group.ts'
import type { MulttableJSON } from './MulttableModel.ts'

export type VisualizerType = 'CDElement' | 'MTElement' | 'CGElement'
export type ConcreteSheetTypes = {
   TextElement: TextElementJSON,
   CDElement: CDElementJSON,
   CGElement: CGElementJSON,
   MTElement: MTElementJSON,
   ConnectingElement: ConnectingElementJSON,
   MorphismElement: MorphismElementJSON,
}
export type SheetTypes = {
   VisualizerElement: SheetTypes['CDElement'] | SheetTypes['CGElement'] | SheetTypes['MTElement'],
   NodeElement: SheetTypes['TextElement'] | SheetTypes['VisualizerElement'],
   LinkElement: SheetTypes['ConnectingElement'] | SheetTypes['MorphismElement']
} & ConcreteSheetTypes
export type SheetJSON = SheetTypes[keyof SheetTypes]

export type alignmentType  = 'left' | 'center' | 'right'
export type arrowColorType = 'none' | 'source' | 'destination'


export interface SheetVisualizerInterface<JSONType> {
   group: Group,
   highlightColors: Maybe<color>[][],
   canvas: HTMLCanvasElement,
   getSize: () => {w: number, h: number},
   setSize: (w: number, h: number) => void,
   resize: () => void,
   showGraphic: () => void,
   unitSquarePositions: () => THREE.Vector2[],
   getImage: () => HTMLImageElement,
   toJSON: () => JSONType,
   fromJSON: (jsonObject: JSONType) => void
};

export interface SheetElementJSON {
   id?: string,
   className?: string
}
export interface NodeElementJSON extends SheetElementJSON {
   x: float,
   y: float,
   w: float,
   h?: float,  // undefined h => h determined automatically on first display
   z?: float,
   anchor_id?: string
}
export interface TextElementJSON extends NodeElementJSON {
   className: 'TextElement',
   alignment?: alignmentType,
   color?: color,  // background color
   fontSize?: string,
   fontColor?: string,
   isPlainText?: boolean
   opacity?: float,  // background opacity
   text?: string,
}
export interface VisualizerElementJSON extends NodeElementJSON {
   // model element contains visualizerJSON (possibly stale)
   // modelElement.viewElement holds the active visualizer object
   visualizerJSON: {
      group_url: string,
      highlight_colors?: Maybe<color>[][]
   }
}
export interface CDElementJSON extends VisualizerElementJSON {
   className: 'CDElement',
   visualizerJSON: CayleyDiagramModelJSON
}
export interface CGElementJSON extends VisualizerElementJSON {
   className: 'CGElement',
   visualizerJSON: CycleGraphJSON
}
export interface MTElementJSON extends VisualizerElementJSON {
   className: 'MTElement',
   visualizerJSON: MulttableJSON,
}
export interface LinkElementJSON extends SheetElementJSON {
   source_id: string,
   destination_id: string,
}
export interface ConnectingElementJSON extends LinkElementJSON {
   className: 'ConnectingElement',
   thickness?: float,
   color?: color,
   hasArrowhead?: boolean
}
export interface MorphismElementJSON extends LinkElementJSON {
   className: 'MorphismElement',
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

interface SheetElementJSONWithId extends SheetElementJSON { id: string, className: keyof ConcreteSheetTypes }

export class SheetModel {
   private _sheetElements: Map<string, SheetElement> = new Map()
   nextId = 0
   classMap: Record<keyof ConcreteSheetTypes, new (...args: any[]) => { fromJSON (jsonObject: unknown): any}> = {
      TextElement: TextElement,
      CDElement: CDElement,
      CGElement: CGElement,
      MTElement: MTElement,
      ConnectingElement: ConnectingElement,
      MorphismElement: MorphismElement
   }

   get sheetElements (): Map<string, SheetElement> {
      return this._sheetElements
   }

   toJSON (): SheetJSON[] {
      return Array.from(this.sheetElements.values()).map((el) => el.toJSON() as SheetJSON)
   }

   fromJSON (json: string | SheetJSON[]) {
      const jsonObjects: SheetJSON[] = (typeof json == 'string')
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

   addObjectAsElement (plainObject: SheetJSON, className: keyof ConcreteSheetTypes): SheetElement {
      if (!('id' in plainObject)) {
         while (this.sheetElements.has(this.nextId.toString())) {  // find an unused id
            this.nextId++
         }
         plainObject = {...plainObject, id: this.nextId.toString()}
      }
      const newElement: SheetElement =
         new (this.classMap[className])(this, plainObject.id as string).fromJSON(plainObject)
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
   className!: keyof ConcreteSheetTypes
   readonly model: SheetModel

   constructor (model: SheetModel, id: string) {
      this.model = model
      this.id = id
   }

   abstract get z (): integer

   toJSON (): SheetElementJSON {
      return {
         id: this.id
      }
   }

   fromJSON (_jsonObject: SheetElementJSON) {
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
      // see docs/README.md § The Sheet system, "Z ordering" for the full contract (spans SheetModel/SheetViewUI/SheetView)
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
   readonly className: keyof ConcreteSheetTypes = 'TextElement'
   text!: string
   color!: color    // background color
   opacity!: float  // opacity in [0,1]: 0 => transparent, 1 => completely opaque
   fontSize!: string
   fontColor!: color
   alignment!: alignmentType
   isPlainText!: boolean      // but take care for characters <, >, &

   toJSON (): TextElementJSON {
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
   visualizerJSON!: {
      group_url: string,
      highlight_colors?: Maybe<color>[][]
   }
   isVisualizer = true

   fromJSON (jsonObject: VisualizerElementJSON) {
      this.group = Library.getGroupByURL(jsonObject.visualizerJSON.group_url) as Group
      if (this.group == null) {
         const errorMessage = `unable to get group from ${jsonObject.visualizerJSON.group_url}`
         Log.err(errorMessage)
         throw new TypeError(errorMessage)
      }
      super.fromJSON(jsonObject)
      return this
   }
}

export class CDElement extends VisualizerElement {
   readonly className: keyof ConcreteSheetTypes = 'CDElement'
   declare visualizerJSON: CayleyDiagramModelJSON

   toJSON (): CDElementJSON {
      return {
         ...super.toJSON(),
         className: 'CDElement',
         // @ts-expect-error: getVisualizerJSON is not statically available here; it's added in SheetViewModel.addElement
         visualizerJSON: this.getVisualizerJSON()
      }
   }

   // The one place a CDElement's visualizerJSON gets completed -- for both a freshly-added
   // element (SheetControl.addElement gives it just {group_url}) and one loaded from a saved
   // sheet -- so SheetView never has to tell the difference. See docs/README.md § The Sheet
   // system for why this belongs here and not in the View.
   fromJSON (jsonObject: CDElementJSON) {
      super.fromJSON(jsonObject)
      const visualizerJSON = this.visualizerJSON = jsonObject.visualizerJSON

      if (visualizerJSON.diagram_control == null)
         visualizerJSON.diagram_control = {}
      const diagramControl = visualizerJSON.diagram_control

      if (visualizerJSON.layout == null) {
         const layoutResults = layoutCayleyDiagram(this.group,
            diagramControl?.diagram_name ?? diagramControl?.strategy_parameters ?? null,
            diagramControl?.arrow_generators, diagramControl?.right_multiply, diagramControl?.chunk_subgroup_index)
         visualizerJSON.layout = layoutToJSON(layoutResults.layout)
         if (diagramControl?.diagram_name == null && diagramControl?.strategy_parameters == null) {
            diagramControl.strategy_parameters = layoutResults.strategyParameters
            diagramControl.arrow_generators = layoutResults.arrowGenerators
         } 
      }

      return this
   }
}

export class CGElement extends VisualizerElement {
   readonly className: keyof ConcreteSheetTypes = 'CGElement'
   declare visualizerJSON: CycleGraphJSON

   toJSON (): CGElementJSON {
      return {
         ...super.toJSON(),
         className: 'CGElement',
         // @ts-expect-error: getVisualizerJSON is not statically available here; it's added in SheetViewModel.addElement
         visualizerJSON: this.getVisualizerJSON()
      }
   }

   fromJSON (jsonObject: CGElementJSON) {
      super.fromJSON(jsonObject)
      this.visualizerJSON = jsonObject.visualizerJSON
      return this
   }
}

export class MTElement extends VisualizerElement {
   readonly className: keyof ConcreteSheetTypes = 'MTElement'
   declare visualizerJSON: MulttableJSON

   organizingSubgroup: integer = 0
   separation: float = 0

   toJSON (): MTElementJSON {
      return {
         ...super.toJSON(),
         className: 'MTElement',
         // @ts-expect-error: getVisualizerJSON is not statically available here; it's added in SheetViewModel.addElement
         visualizerJSON: this.getVisualizerJSON()
      }
   }

   fromJSON (jsonObject: MTElementJSON) {
      super.fromJSON(jsonObject)
      this.visualizerJSON = jsonObject.visualizerJSON
      return this
   }
}

export abstract class LinkElement extends SheetElement {
   source!: NodeElement
   destination!: NodeElement
   isLink = true

   // z level of link is determined from z levels of source/destination
   // see docs/README.md § The Sheet system, "Z ordering" for the full contract
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
      // test connectivity
      if (!this.model.canConnect(this, jsonObject.source_id, jsonObject.destination_id)) {
         const errorMessage = `Unable to connect '${jsonObject.source_id}' and '${jsonObject.destination_id}'`
         Log.warn(errorMessage)
         throw new TypeError(errorMessage)
      }

      super.fromJSON(jsonObject)
      this.source = this.model.sheetElements.get(jsonObject.source_id.toString()) as NodeElement
      this.destination = this.model.sheetElements.get(jsonObject.destination_id.toString()) as NodeElement

      return this
   }
}

export class ConnectingElement extends LinkElement {
   readonly className: keyof ConcreteSheetTypes = 'ConnectingElement'
   thickness!: float  // 'width'? 'lineWidth'?
   color!: color
   hasArrowhead!: boolean // 'directed'?

   toJSON (): ConnectingElementJSON {
      return {
         ...super.toJSON(),
         className: 'ConnectingElement',
         thickness: this.thickness,
         color: this.color,
         hasArrowhead: this.hasArrowhead
      }
   }

   fromJSON (jsonObject: ConnectingElementJSON) {
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

   readonly className: keyof ConcreteSheetTypes = 'MorphismElement'
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
      }
   }

   fromJSON (jsonObject: MorphismElementJSON) {
      super.fromJSON(jsonObject)
      this.morphismName = jsonObject.morphismName ?? this.getMathyName()
      this.showDomainAndCodomain = jsonObject.showDomainAndCodomain ?? false
      this.showDefiningPairs = jsonObject.showDefiningPairs ?? false
      this.showInjectionSurjection = jsonObject.showInjectionSurjection ?? false
      this.showManyArrows = jsonObject.showManyArrows ?? false
      this.arrowColor = jsonObject.arrowColor ?? 'none'
      this.arrowMargin = jsonObject.arrowMargin ?? 0
      this.fontSize = jsonObject.fontSize ?? null
      this.useMulttableSourceTopRow = jsonObject.useMulttableSourceTopRow ?? false
      this.useMulttableDestinationTopRow = jsonObject.useMulttableDestinationTopRow ?? false

      const sourceGroup = Library.getGroupByURL(this.source.visualizerJSON.group_url) as Group
      const destinationGroup = Library.getGroupByURL(this.destination.visualizerJSON.group_url) as Group
      this.mapping = new Mapping(sourceGroup, destinationGroup, jsonObject.definingPairs)

      return this
   }

   // Find the simplest mathy name for this morphism that's not yet used on this sheet.
   private getMathyName (): string {
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

export interface SheetElementRequest {
   // Discriminator
   className: keyof SheetTypes

   // SheetElement
   id?: string

   // NodeElement
   x?: float,
   y?: float,
   w?: float,
   h?: float,  // undefined h => h determined automatically on first display
   anchor_id?: string

   // TextElement
   alignment?: alignmentType,
   color?: color,  // background color
   fontSize?: string,
   fontColor?: string,
   opacity?: float,  // background opacity
   text?: string,

   // Visualizer
   groupURL?: string,
   highlight_colors?: Maybe<color>[][],

   // CDElement
   arrow_generators?: ArrowGenerator[],
   diagram_name?: string,
   strategy_parameters?: StrategyParameters[]

   // MTElement
   organizing_subgroup?: integer,

   // LinkElement
   source_id?: string,
   destination_id?: string,

   // ConnectingElement
   thickness?: float,
// color?: color,
   hasArrowhead?: boolean

   // MorphismElement
   morphismName?: string,
   arrowColor?: arrowColorType,
   definingPairs?: definingPairType[]
// fontSize?: Maybe<string>,
   showInjectionSurjection?: boolean,
   showManyArrows?: boolean,
}

// create new sheet, used by GroupInfo routines
// accepts {title, elements} or bare array (backward compat)
// stores in IndexedDB and opens Sheet.html in new window
export function createNewSheet (arg: {title: string, elements: SheetElementRequest[]} | SheetElementRequest[]) {
   const title = Array.isArray(arg) ? null : (arg.title ?? null)
   const jsonObjects = Array.isArray(arg) ? arg : arg.elements
   const translatedRequest = translateRequest(jsonObjects)
   const newWindow = window.open('about:blank') as Window // workaround for Safari
   StoredObjects.setPassedSheet({title, elements: translatedRequest})
      .then(() => { newWindow.location.href = 'Sheet.html?passedSheet' })
}

export function translateRequest (requests: SheetElementRequest[]): SheetJSON[] {
   function isVisualizer (element: SheetElementJSON): element is VisualizerElementJSON {
      return ['CDElement', 'CGElement', 'MTElement'].includes(element.className!)
   }
   function isCDElement (element: VisualizerElementJSON): element is CDElementJSON {
      return element.className === 'CDElement'
   }
   function isMTElement (element: VisualizerElementJSON): element is MTElementJSON {
      return element.className === 'MTElement'
   }
   const results: SheetJSON[] = requests.map((request) => {
      const result = {...request} as SheetElementJSON
      result.className = request.className

      // create visualizer and move relevant values to visualizer
      if (isVisualizer(result)) {
         result.visualizerJSON = {
            group_url: request.groupURL!,
            highlight_colors: request.highlight_colors ?? [[], [], []]
         }

         if (isCDElement(result)) {
            // build one union member or the other -- never both. arrow_generators applies to
            // either variant, so it's threaded through all three cases below (it used to be
            // dropped whenever strategy_parameters was itself absent -- e.g. a request giving
            // only arrow_generators). diagram_control stays unset if none of the three was given.
            if (request?.diagram_name != null) {
               result.visualizerJSON.diagram_control = {
                  diagram_name: request.diagram_name,
                  ...(request?.arrow_generators != null && { arrow_generators: request.arrow_generators })
               }
            } else if (request?.strategy_parameters != null) {
               result.visualizerJSON.diagram_control = {
                  strategy_parameters: request.strategy_parameters,
                  ...(request?.arrow_generators != null && { arrow_generators: request.arrow_generators })
               }
            } else if (request?.arrow_generators != null) {
               result.visualizerJSON.diagram_control = { arrow_generators: request.arrow_generators }
            }
         } else if (isMTElement(result)) {
            if ('organizing_subgroup' in request) {
               result.visualizerJSON['organizing_subgroup'] = request['organizing_subgroup']
            }
         }
      }

      return result as SheetJSON
   })

   return results
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

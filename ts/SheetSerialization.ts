/**
# SheetSerialization

Sheet serialization history:

  v0 -- store group library, sheets in localStorage
  v1 -- store group library in localStorage, sheets in indexedDB as string (stringified JSON)
  v2 -- store group library, sheets in indexedDB as ExportedSheet w/ version == 2

```js
 */

import { layoutCayleyDiagram, getPOV } from './CayleyDiagramGenerator.js'
import { DEFAULT_NODE_COLOR } from './CayleyDiagramView.js'
import * as Library from './Library.js'
import * as Log from './Log.js'
import * as MathML from './MathML.js'
import * as THREE from '../lib/externals.js'
import * as SheetView from './SheetView.js'

import type { ArrowGenerator, StrategyParameters } from './CayleyDiagramGenerator.ts'
import type { CayleyDiagramControlJSON } from './CayleyDiagramControl.ts'
import type { CayleyDiagramModelJSON } from './CayleyDiagramModel.ts'
import type { POV, Vector3JSON, Matrix4JSON, POVJSON, ArrowJSON, ChunkJSON, LayoutJSON} from './CayleyDiagramView.ts'
import type { CycleGraphJSON } from './CycleGraphModel.ts'
import type { Group } from './Group.ts'
import type { MulttableJSON } from './MulttableModel.ts'
import type { SheetJSON, NodeElementJSON, VisualizerElementJSON, LinkElementJSON, TextElementJSON,
   ConnectingElementJSON, MorphismElementJSON } from './SheetModel.ts'

export const CURRENT_FORMAT_VERSION = 2 as const

function isNonNullPojo (obj: unknown): obj is Record<string, unknown> {
   return obj != null && typeof obj === 'object' && !Array.isArray(obj)
}

type nonEmptyPojoArray = Record<string, unknown>[]
function isNonEmptyPojoArray (obj: unknown): obj is nonEmptyPojoArray {
   return Array.isArray(obj) && isNonNullPojo(obj[0])
}

type VersionMap = {
   0: v0SheetType[],
   1: v1SheetType[],
   2: v2SheetType[],
}
type v2SheetType = SheetJSON
export type VersionedSheet<T extends keyof VersionMap = typeof CURRENT_FORMAT_VERSION> = {
   version: T,
   sheet: VersionMap[T],
}
export function isVersionedSheet (obj: unknown): obj is VersionedSheet {
   return isNonNullPojo(obj) && 'version' in obj && typeof obj.version === 'number'
}

export type NamedSheet = {
   sheetName: string,
   sheetJSON: VersionedSheet
}
export type SheetBackup = NamedSheet[]
export function isSheetBackup (obj: unknown): obj is SheetBackup {
   return isNonEmptyPojoArray(obj) && 'sheetName' in obj[0]
}

export type RawSheet = unknown[]
export function isRawSheet (obj: unknown): obj is RawSheet {
   return isNonEmptyPojoArray(obj) && !('sheetName' in obj[0])
}

/*
use cases

normal:
import from textarea (could be left over from old export!)
restore v2 export string from clipboard (version, no SheetName => ExportedSheet; deserialized as ExportedSheet object)
restore v1 export string from clipboard (no version, SheetName => old export; deserialized as string)
restore v2 backup from file/clipboard (Array of named ExportedSheets; array of deserialize calls of ExportedSheet objects)

update:
migrateToV1: create 'storedSheets' in indexedDB;  if 'sheets' exist in localStore, deserialize/stringify/store to indexedDB
migrateToV2: deserialize v1 sheet string and store object in indexeddb
 */

export function deserializeSheet (json: string): VersionedSheet<typeof CURRENT_FORMAT_VERSION> {
   let sheet: VersionedSheet<typeof CURRENT_FORMAT_VERSION>
   const jsonObject = JSON.parse(json) as unknown
   if (isVersionedSheet(jsonObject)) {
      sheet = convertSheetFromVersion(jsonObject)
   } else if (isRawSheet(jsonObject)) {
      sheet = convertSheetFromVersion({version: 1, sheet: jsonObject as VersionMap[1]} as VersionedSheet<1>)
   } else {
      const errorMessage = `SheetSerialization.deserializeSheet: unrecognized argument: ${json}`
      Log.err(errorMessage)
      throw new TypeError(errorMessage)
   }

   return sheet
}

function convertSheetFromVersion (input: VersionedSheet<keyof VersionMap>): VersionedSheet<typeof CURRENT_FORMAT_VERSION> {
   let json: unknown = input.sheet
   switch (input.version)  {
   case 0: json = convertV0ToV1(json as VersionMap[0])
   case 1: json = convertV1ToV2(json as VersionMap[1])
   case CURRENT_FORMAT_VERSION:
   }

   return { version: CURRENT_FORMAT_VERSION, sheet: json as VersionMap[typeof CURRENT_FORMAT_VERSION]}
}

type v0SheetType = {
   className: string,
   x: number,
   y: number,
   w: number,
   h: number,
   arrowMargin?: number,
   fromIndex?: number,
   toIndex?: number,
   sourceId: string,
   destinationId: string,
   useArrowhead?: boolean,
   hasArrowhead: boolean,
   showInjSurj?: boolean,
   showInjectionSurjection: boolean,
   showDomAndCod?: boolean,
   showDomainAndCodomain: boolean,
   isClean: boolean

   color_highlights: unknown,
   arrowhead_placement: unknown,
   arrows: unknown,
   background: unknown,
   camera_matrix: unknown,
   camera_up?: THREE.Vector3,
   chunk: unknown,
   fog_level: unknown,
   groupURL: unknown,
   label_scale_factor: unknown,
   line_width: unknown,
   nodes?: ({label: string})[],
   right_multiply: unknown,
   ring_highlights: unknown,
   sphere_base_radius: unknown,
   sphere_scale_factor: unknown,
   square_highlights: unknown,
   strategy_parameters: unknown,
   zoom_level: unknown,
   visualizer: unknown,
}
// given JSON for v0 sheet, return JSON for v1 sheet
export function convertV0ToV1 (oldJSONArray: v0SheetType[]): v1SheetType[] {
   /*
    * Convert from original Sheet JSON to current version
    *    Link:
    *      fromIndex -> sourceId
    *      toIndex -> destinationId
    *    Connection:
    *      useArrowhead -> hasArrowhead
    *      arrowheadSize not used?
    *    Morphism:
    *      showInjSurj -> showInjectionSurjection
    *      showDomAndCod -> showDomainAndCodomain
    *      arrowMargin was expressed in pixels, is now a percentage of the center-to-center distance
    */
   const pixelsPerModelUnit = Math.min(window.innerWidth, window.innerHeight - 71)
   for (let inx = 0; inx < oldJSONArray.length; inx++) {
      const json = oldJSONArray[inx]

      // account for padding in old wrapper, #graphic offset from window, different padding in heading
      json.x += 10
      json.y += 10 - SheetView.graphicRect.y - 6

      // convert arrowMargin from pixels offset to percentage of center-to-center distance
      if (json.arrowMargin !== undefined) {
         const from = oldJSONArray[json.fromIndex as number]
         const fromCenter = new THREE.Vector2(from.x + from.w / 2, from.y + from.h / 2)
         const to = oldJSONArray[json.toIndex as number]
         const toCenter = new THREE.Vector2(to.x + to.w / 2, to.y + to.h / 2)
         const centerToCenter = fromCenter.sub(toCenter).length() * pixelsPerModelUnit
         json.arrowMargin *= 1 / centerToCenter
      }

      // re-write fromIndex to sourceId, toIndex to destinationId
      if (json.fromIndex !== undefined) {
         json.sourceId = json.fromIndex + ''
         delete json.fromIndex
      }
      if (json.toIndex !== undefined) {
         json.destinationId = json.toIndex + ''
         delete json.toIndex
      }

      // re-write useArrowhead to hasArrowhead
      if (json.useArrowhead !== undefined) {
         json.hasArrowhead = json.useArrowhead
         delete json.useArrowhead
      }

      // re-write showInjSurj to showInjectionSurjection
      if (json.showInjSurj !== undefined) {
         json.showInjectionSurjection = json.showInjSurj
         delete json.showInjSurj
      }

      // re-write showDomAndCod to showDomainAndCodomain
      if (json.showDomAndCod !== undefined) {
         json.showDomainAndCodomain = json.showDomAndCod
         delete json.showDomAndCod
      }

      // convert node labels from MathML to HTML
      if (json.nodes != null) {
         for (const node of json.nodes) {
            node.label = MathML.toHTML(node.label) as string
         }
      }

      // convert old CDElement JSON
      if (json.className === 'CDElement' && json.camera_matrix != null) {
         const visualizer = {
            arrowhead_placement: json.arrowhead_placement,
            arrows: json.arrows,
            background: json.background,
            cameraJSON: {
               metadata: {
                  type: 'Object'
               },
               object: {
                  aspect: 1,
                  far: 2000,
                  filmGauge: 35,
                  filmOffset: 0,
                  focus: 10,
                  fov: 45,
                  layers: 1,
                  matrix: json.camera_matrix,
                  near: 0.1,
                  type: 'PerspectiveCamera',
                  zoom: 1
               }
            },
            cameraUp: new THREE.Vector3(...json.camera_up as THREE.Vector3),
            chunk: json.chunk,
            color_highlights: json.color_highlights,
            fog_level: json.fog_level,
            groupURL: json.groupURL,
            label_scale_factor: json.label_scale_factor,
            line_width: json.line_width,
            nodes: json.nodes,
            right_multiply: json.right_multiply,
            ring_highlights: json.ring_highlights,
            sphere_base_radius: json.sphere_base_radius,
            sphere_scale_factor: json.sphere_scale_factor,
            square_highlights: json.square_highlights,
            strategy_parameters: json.strategy_parameters,
            zoom_level: json.zoom_level
         }
         json.visualizer = visualizer
         json.isClean = false
         delete json.arrowhead_placement
         delete json.arrows
         delete json.background
         delete json.camera_matrix
         delete json.camera_up
         delete json.chunk
         delete json.color_highlights
         delete json.fog_level
         delete json.label_scale_factor
         delete json.line_width
         delete json.nodes
         delete json.right_multiply
         delete json.ring_highlights
         delete json.sphere_base_radius
         delete json.sphere_scale_factor
         delete json.square_highlights
         delete json.strategy_parameters
         delete json.zoom_level
      }
   }

   return (oldJSONArray as unknown) as v1SheetType[]
}

type v1SheetType = {
   // Common
   className: string,
   id: string,

   // NodeElement
   color?: color,
   x?: float,
   y?: float,
   w?: float,
   h?: float,
   z?: integer,

   // Text
   alignment?: 'left' | 'center' | 'right',
   fontColor?:color,
   fontSize?: string,
   isPlainText?: boolean,
   opacity?: number,
   text?: html,

   // Visualizer
   groupURL?: string,
   isClean?: boolean,  // Cayley diagram only
   visualizer?: v1CDVisualizer | v1CGVisualizer | v1MTVisualizer
   _visualizer?: unknown,

   // Link
   destinationId?: string,
   sourceId?: string,

   // Connection
   // color?: Maybe<color>,
   hasArrowhead?: boolean,
   thickness?: number,

   // Morphism
   arrowMargin?: number,
   definingPairs?: [groupElement, groupElement][],
   name?: html,
   showDefiningPairs?: boolean,
   showDomainAndCodomain?: boolean,
   showInjectionSurjection?: boolean,
   showManyArrows?: boolean,
}
type v1CDVisualizer = {  // Cayley diagram
   arrowhead_placement: integer,
   arrows: {
      start_element: groupElement,
      end_element: groupElement,
      generator: groupElement,
      thirdPoint: {x: float, y: float, z: float},
      offset: float,
      color: color}[],
   background: color,
   cameraJSON: { object: { matrix: number[] } },  // simple array, not THREE.Matrix4.toJSON
   cameraUp: THREE.Vector3,
   chunk?: integer,
   color_highlights?: Maybe<color>[],
   diagram_name?: Maybe<string>,
   fog_level: integer,
   groupURL: string,
   label_scale_factor: float,
   line_width: float,
   nodes: { position: {x: float, y: float, z: float} , element: groupElement, label: html }[],
   right_multiply: boolean,
   ring_highlights?: Maybe<color>[],
   sphere_base_radius: float,
   sphere_scale_factor: float,
   square_highlights?: Maybe<color>[],
   strategy_parameters?: StrategyParameters[],
   zoom_level: float
}
type v1CGVisualizer = {  // Cycle graph
   groupURL: string,
   highlights?: { background: Maybe<color>[], border: Maybe<color>[], top: Maybe<color>[] }
}
type v1MTVisualizer = {  // MTElement
   colorReordering?: 'topRowFixed' | 'elementColorsFixed',
   coloration?: 'rainbow' | 'grayscale' | 'none',
   elements?: groupElement[],
   groupURL: string,
   highlights?: { background: Maybe<color>[], border: Maybe<color>[], corner: Maybe<color>[] },
   organizingSubgroup?: integer,
   separation?: number,
}

// given JSON object for v1 sheet, return JSON object for v2 sheet
export function convertV1ToV2 (v1Objects: v1SheetType[]): v2SheetType[] {
   const formatHighlights = (
      highlights: Maybe<Maybe<color>[]>[],
      nullish: Maybe<color>[] = []
   ): Maybe<color>[][] => {
      const result = highlights.map((colorList, inx) =>
         (colorList == null) ? [] : colorList.map((color) => (color == nullish[inx]) ? null : color))

      return result
   }

   function copyCompatibleField<
      T1 extends object, T2 extends object, K extends keyof T1 & keyof T2
   >(
      v1: T1, v2: T2, field: K
   ) {
      if (field in v1) {      // Guard against missing runtime fields in the old object
         const value = v1[field]
         v2[field] = value as unknown as T2[K];  // check that types are compatible at compile time
      }
   }

   const v2Objects = v1Objects.map((v1Object) => {
      // create SheetJSON object skeletons
      const v2Object = {
         className: v1Object.className,
         id: v1Object.id,
      } as SheetJSON

      // create visualizers for each VisualizerElement
      // create source_id, destination_id fields for LinkElemnts
      switch (v1Object.className) {
         case 'CDElement': {
            const v1Visualizer = v1Object.visualizer as v1CDVisualizer
            if (v1Visualizer == null) {
               break
            }

            if (  v1Visualizer.groupURL == null
               || Library.getGroupByURL(v1Visualizer.groupURL) == null
               || (v1Visualizer.diagram_name == null && v1Visualizer.strategy_parameters == null)
            ) {
               Log.err('unrecognizable v1 json in SheetSerialization.convertV1ToV2')
               break
            }

            const group = Library.getGroupByURL(v1Visualizer.groupURL) as Group

            const strategyParameters = v1Visualizer.strategy_parameters?.map((strategy_parameter) => {
               return {...strategy_parameter}
            }) ?? []

            const arrowGenerators: ArrowGenerator[] = v1Visualizer?.arrows
               .filter((arrow) => arrow.start_element == 0)
               .map((arrow) => ({generator: arrow.generator, color: arrow.color}))

            const diagramControl: CayleyDiagramControlJSON = {
               ...(v1Visualizer.diagram_name != null && {diagram_name: v1Visualizer.diagram_name}),
               ...(strategyParameters.length != 0 && {strategy_parameters: strategyParameters}),
               ...(arrowGenerators != null && {arrow_generators: arrowGenerators}),
               ...(v1Visualizer.right_multiply == false && {right_multiply: false}),
               ...(v1Visualizer?.chunk && {chunk_subgroup_index: v1Visualizer.chunk})
            }

            const nodes = v1Visualizer.nodes.map(({position, element, label}) => {
               return {position: {...position}, element, label, color: DEFAULT_NODE_COLOR}
            })

            // convert camera: extract position from column-major matrix[12,13,14], use cameraUp for up
            const matrix = v1Visualizer.cameraJSON?.object?.matrix
            const position: Vector3JSON = matrix
               ? {x: matrix[12], y: matrix[13], z: matrix[14]}
               : {x: 0, y: 0, z: 3}
            const up: Vector3JSON = v1Visualizer.cameraUp ?? {x: 0, y: 1, z: 0}
            const pov: POVJSON = {position, up}

            const maybePOV: POV = getPOV(
               nodes.map(({position}) => { return {position: new THREE.Vector3(position.x, position.y, position.z)} }),
               v1Visualizer.diagram_name == null)
            if (  maybePOV.position.equals(new THREE.Vector3(position.x, position.y, position.z))
               && new THREE.Vector3(up.x, up.y, up.z).negate().equals(maybePOV.up)
            ) {
               Object.assign(up, {x: -up.x, y: -up.y, z: -up.z})
            }

            const arrows: ArrowJSON[] = v1Visualizer.arrows.map((arrow) => {
               const {start_element, end_element, generator, thirdPoint, offset, color} = arrow
               const bidirectional = group.mult(end_element, generator) === start_element
               const result = {
                  start_element,
                  end_element,
                  generator,
                  thirdPoint: {...thirdPoint},
                  offset,
                  bidirectional,
                  keepCurved: false,
                  color}

               return result
            })

            const chunks: ChunkJSON[] = []
            if (v1Visualizer?.chunk != null && v1Visualizer.chunk !== 0) {
               const maybeLayout =
                  layoutCayleyDiagram(
                     group,
                     v1Visualizer?.diagram_name ?? undefined,
                     v1Visualizer?.strategy_parameters,
                     arrowGenerators,
                     v1Visualizer.right_multiply,
                     v1Visualizer?.chunk ?? undefined,  // v1Visualizer.chunk == 0?
                  )

               chunks.push(...maybeLayout.chunks.map((chunk) => {
                    return {
                       box: JSON.parse(JSON.stringify(chunk.box)) as Matrix4JSON,
                       name: chunk.name,
                       nodes: chunk.nodes.map((node) => node.element),
                       widths: JSON.parse(JSON.stringify(chunk.widths)) as Vector3JSON,
                    }
               }))
            }

            const layout: LayoutJSON = { pov, nodes, arrows, chunks }

            const highlights = [
               [...(v1Visualizer?.color_highlights ?? [])],
               [...(v1Visualizer?.ring_highlights ?? [])],
               [...(v1Visualizer?.square_highlights ?? [])],
            ]

            const v2Visualizer: CayleyDiagramModelJSON = {
               group_url: v1Visualizer.groupURL,
               background: v1Visualizer.background,
               fog_level: v1Visualizer.fog_level,
               line_width: 4,  // meaning has changed since v1, just using default
               sphere_scale_factor: v1Visualizer.sphere_scale_factor,
               zoom_level: v1Visualizer.zoom_level,
               arrowhead_placement: v1Visualizer.arrowhead_placement,
               label_scale_factor: v1Visualizer.label_scale_factor,
               showing_axes: false,
               // highlight_control:   // not implemented in v1
               highlight_colors: highlights,
               diagram_control: diagramControl,
               layout: layout,
            }

            ;(v2Object as VisualizerElementJSON).visualizerJSON = v2Visualizer

            break
         }

         case 'CGElement': {
            const v1Visualizer = v1Object.visualizer as v1CGVisualizer
            if (v1Visualizer == null) {
               break
            }
            const v2Visualizer: CycleGraphJSON = {
               group_url: v1Visualizer.groupURL,
               highlight_colors: formatHighlights(
                  [v1Visualizer?.highlights?.background, v1Visualizer?.highlights?.border, v1Visualizer?.highlights?.top],
                  [null, null, null]),
            }
            ;(v2Object as VisualizerElementJSON).visualizerJSON = v2Visualizer

            break
         }

         case 'MTElement': {
            const v1Visualizer = v1Object.visualizer as v1MTVisualizer
            if (v1Visualizer == null) {
               break
            }
            const v2Visualizer: MulttableJSON = {
               group_url: v1Visualizer.groupURL,
               highlight_colors: formatHighlights(
                  [v1Visualizer?.highlights?.background, v1Visualizer?.highlights?.border, v1Visualizer?.highlights?.corner],
                  ['#E5E5E5', null, null]),
               organizing_subgroup: v1Visualizer.organizingSubgroup,
               separation: v1Visualizer.separation,
               coloration: v1Visualizer.coloration,
               color_reordering: v1Visualizer.colorReordering,
               elements: v1Visualizer.elements
            }
            ;(v2Object as VisualizerElementJSON).visualizerJSON = v2Visualizer

            break
         }

         case 'ConnectingElement':
         case 'MorphismElement': {
            ;(v2Object as Partial<LinkElementJSON>).source_id = v1Object.sourceId
            ;(v2Object as Partial<LinkElementJSON>).destination_id = v1Object.destinationId

            break
         }
      }

      // add NodeElement fields to Visualizers, TextElements
      switch (v1Object.className) {
         case 'CDElement':
         case 'CGElement':
         case 'MTElement':
         case 'TextElement': {
            (['x', 'y', 'w', 'h', 'z'] as const).forEach((field) => {
               if (field in v1Object && v1Object[field] != null) {
                  copyCompatibleField(v1Object, v2Object as NodeElementJSON, field)
               }
            })
         }
      }

      // add highlights, groupURL to VisualizerElements
      // finish TextElements, ConnectingElements, MorphismElement
      switch (v1Object.className) {
         case 'CDElement':
         case 'CGElement':
         case 'MTElement': {
            if (v1Object.groupURL != null) {
               (v2Object as VisualizerElementJSON).visualizerJSON.group_url = v1Object.groupURL
            }
            if ('visualizer' in v2Object && (v2Object as VisualizerElementJSON).visualizerJSON != null) {
               const v2Visualizer = (v2Object as VisualizerElementJSON).visualizerJSON as Record<string, unknown>
               if (v2Visualizer != null && 'highlight_colors' in v2Visualizer && v2Visualizer.highlight_colors != null ) {
                  (v2Object as VisualizerElementJSON).visualizerJSON.highlight_colors =
                     v2Visualizer.highlight_colors as Maybe<string>[][]
               }
            }
         }

         case 'TextElement': {
            (['alignment', 'color', 'fontColor', 'fontSize', 'isPlainText', 'opacity', 'text'] as const)
               .forEach((field) => {
                   copyCompatibleField(v1Object, v2Object as TextElementJSON, field)
            })

            break
         }

         case 'ConnectingElement': {
            (['color', 'hasArrowhead', 'thickness'] as const).forEach((field) => {
               if (field in v1Object) {
                  copyCompatibleField(v1Object, v2Object as ConnectingElementJSON, field)
               }
            })

            break
         }

         case 'MorphismElement': {
            (['arrowMargin', 'definingPairs', 'showDefiningPairs', 'showDomainAndCodomain', 'showInjectionSurjection',
              'showManyArrows'] as const).forEach((field) => {
               if (field in v1Object) {
                  copyCompatibleField(v1Object, v2Object as MorphismElementJSON, field)
               }
            })
            if (v1Object.name != null) {
               (v2Object as MorphismElementJSON).morphismName = v1Object.name
            }

            break
         }
      }

      return v2Object
   })

   return v2Objects as v2SheetType[]
}

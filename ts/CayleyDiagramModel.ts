/*

# CayleyDiagramModel

Model for the Cayley diagram visualizer. Holds all serializable state:

* **View parameters**
   * fog, zoom, sphere size, line width, etc.
* **Opaque plugin slots**
   * `diagramControl` (owned by `CayleyDiagramControl`)
   * `highlightControl` (owned by `HighlightControl`)
* **Request fields**
   * `snap_to_axis_request`
     * set by `CayleyViewControl`
     * consumed and cleared by `CayleyDiagramView`
     * not persisted

`layout` contains a shared description of the Cayley diagram:
* format specified by [`CayleyDiagramView`](./CayleyDiagramView.ts.md)
* contains pov, nodes, arrows, chunks
* set by
   * [`CayleyDiagramControl`](./CayleyDiagramControl.ts.md) from user input
   * [`CayleyDiagramViewUI`](.CayleyDiagramViewUI.ts.md) on moving displayed nodes/arrows/chunks
   * [`THREE.TrackballControl'](https://threejs.org/docs/?q=trackball#TrackballControls) on scene pan/zoom/rotate
* consumed by [`CayleyDiagramView`](./CayleyDiagramView.ts.md)

```javascript
 */
import { layoutToJSON, layoutFromJSON } from './CayleyDiagramView.js'
import { Serializable, isSerializable } from './GEUtils.js'
import * as Library from './Library.js'

import type { CayleyDiagramControlJSON } from './CayleyDiagramControl.ts'
import type { LayoutType, LayoutJSON } from './CayleyDiagramView.ts'
import type { Group } from './Group.ts'
import type { HighlightControlModelInterface, HighlightControlJSON } from './HighlightControl.ts'

export { DEFAULT_NODE_COLOR } from './CayleyDiagramView.js'
export type { POV, NodeType, ArrowType, ChunkType, LayoutType } from './CayleyDiagramView.ts'

export type CayleyDiagramModelJSON = {
   group_url: string,
   layout: Maybe<LayoutJSON>,
   background: CayleyDiagramModel['background'],
   fog_level: CayleyDiagramModel['fog_level'],
   line_width: CayleyDiagramModel['line_width'],
   sphere_scale_factor: CayleyDiagramModel['sphere_scale_factor'],
   zoom_level: CayleyDiagramModel['zoom_level'],
   arrowhead_placement: CayleyDiagramModel['arrowhead_placement'],
   label_scale_factor: CayleyDiagramModel['label_scale_factor'],
   showing_axes: CayleyDiagramModel['showingAxes'],
   highlight_colors: CayleyDiagramModel['highlightColors'],
   highlight_control?: HighlightControlJSON,
   diagram_control: CayleyDiagramControlJSON,
}

export class CayleyDiagramModel implements HighlightControlModelInterface {
   group: Group

   // Highlight configuration — visualizer-specific parameters for HighlightControl
   highlightConfiguration = {
      highlightTypes: ['node color', 'a ring around the node', 'a square around the node'],
      saturation: [0.53, 0.53, 0.53],
      lightness: [0.3, 0.3, 0.3],
      hueOffset: [0, 0, 0]
   }

   // View parameters — manipulated by CayleyViewControl sliders
   layout!: LayoutType
   background!: color
   fog_level!: float
   line_width!: number
   sphere_scale_factor!: float
   zoom_level!: number
   arrowhead_placement!: float
   label_scale_factor!: float
   showingAxes!: boolean

   // View parameters — manipulated by HighlightControl
   highlightColors!: Maybe<color>[][]

   // Opaque plugin slots (carried opaquely through serialization). highlightControl is genuinely
   // optional -- most elements never get subset highlighting configured -- unlike diagramControl,
   // which always needs some strategy/diagram_name to render anything at all.
   highlightControl: HighlightControlJSON | (object & Serializable<HighlightControlJSON>) | undefined = undefined
   diagramControl!: CayleyDiagramControlJSON | (object & Serializable<CayleyDiagramControlJSON>)

   // Request fields — transient commands; set by CayleyViewControl, cleared by CayleyDiagramView
   snap_to_axis_request!: boolean

   constructor (group: Group) {
      this.group = group
      this.reset()
   }

   reset () {
      this.background = '#E8C8C8'  // Cayley-diagram specific
      this.fog_level = 0
      this.line_width = 4
      this.sphere_scale_factor = 1
      this.zoom_level = 1
      this.arrowhead_placement = 1
      this.label_scale_factor = 1
      this.showingAxes = false
      this.highlightColors = [[], [], []]
      this.snap_to_axis_request = false
   }

   toJSON (): CayleyDiagramModelJSON {
      const json = {
         group_url: this.group.URL,
         layout: layoutToJSON(this.layout),
         background: this.background,
         fog_level: this.fog_level,
         line_width: this.line_width,
         sphere_scale_factor: this.sphere_scale_factor,
         zoom_level: this.zoom_level,
         arrowhead_placement: this.arrowhead_placement,
         label_scale_factor: this.label_scale_factor,
         showing_axes: this.showingAxes,
         highlight_colors: this.highlightColors,
         highlight_control: isSerializable<HighlightControlJSON>(this.highlightControl)
            ? this.highlightControl.toJSON()
            : this.highlightControl,
         diagram_control: isSerializable<CayleyDiagramControlJSON>(this.diagramControl)
            ? this.diagramControl.toJSON()
            : this.diagramControl
      }

      return json
   }

   fromJSON (json: CayleyDiagramModelJSON) {
      this.reset()

      if (json.group_url != null && this.group.URL != json.group_url) {
         this.group = Library.getGroupByURL(json.group_url) as Group
      }

      if (json.layout != null)
         this.layout = layoutFromJSON(json.layout)
      this.background = json.background ?? this.background
      this.fog_level = json.fog_level ?? this.fog_level
      this.line_width = json.line_width ?? this.line_width
      this.sphere_scale_factor = json.sphere_scale_factor ?? this.sphere_scale_factor
      this.zoom_level = json.zoom_level ?? this.zoom_level
      this.arrowhead_placement = json.arrowhead_placement ?? this.arrowhead_placement
      this.label_scale_factor = json.label_scale_factor ?? this.label_scale_factor
      this.showingAxes = json.showing_axes ?? this.showingAxes
      this.highlightColors = json.highlight_colors ?? this.highlightColors

      // let owners deserialize opaque slots. A live highlightControl only merges json data in
      // place when there's real data to merge; otherwise the slot is just assigned outright --
      // including clearing it to undefined when json has none. (HighlightControlViewModel.fromJSON
      // indexes into its argument unconditionally, so calling it with no data would throw --
      // discard the reference instead of trying to reset a live object to "no highlights".)
      if (isSerializable<HighlightControlJSON>(this.highlightControl) && json?.highlight_control != null) {
         this.highlightControl.fromJSON(json.highlight_control)
      } else {
         this.highlightControl = json?.highlight_control ?? undefined
      }

      if (this.diagramControl == null || !isSerializable<CayleyDiagramControlJSON>(this.diagramControl)) {
         this.diagramControl = json.diagram_control
      } else if (json.diagram_control != null) {
         this.diagramControl.fromJSON(json.diagram_control)
      }

      return this
   }
}

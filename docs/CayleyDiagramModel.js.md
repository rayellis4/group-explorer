/* @flow

# CayleyDiagramModel

Model for the Cayley diagram visualizer. Holds all serializable state:

- **View parameters** — fog, zoom, sphere size, line width, etc.
- **Opaque plugin slots** — `diagramControl` (owned by `CayleyDiagramControl`),
  `viewState` (owned by `CayleyDiagramView` — serializes live camera + node/arrow/chunk
  positions from the scene), `highlightControl` (owned by `HighlightControl`)
- **Request fields** — `snap_to_axis_request`: set by `CayleyViewControl`, consumed and
  cleared by `CayleyDiagramView`; not persisted

`layout` is a write-only request field: `CayleyDiagramGenerator` writes it to trigger a
scene rebuild; `CayleyDiagramViewModel` consumes it and clears it. Layout state is not
persisted here — `viewState.toJSON()` captures the live scene (camera + node positions
after user drag, arrow curves, chunks) and `viewState.fromJSON()` restores it.

```javascript
 */
import * as Library from './Library.js'

export {CayleyDiagramModel}
/*::
import type {Group} from './Group.js'
import type {CayleyDiagramJSON} from './CayleyDiagramView.js'
type POV = {
   position: THREE.Vector3,
   up: THREE.Vector3,
}
type Node = {
   position: THREE.Vector3,
   element: groupElement,
   label: html
}
type Arrow = {
   start_node: Node,
   end_node: Node,
   generator: groupElement,
   bidirectional: boolean,
   thirdPoint: THREE.Vector3
   keepCurved: boolean,  // true => use specified offset
   offset?: float,  // undefined => straight line
   color: css_color
}
type Chunk = {
   name: html,
   box: THREE.Matrix4,
   width: THREE.Vector3,
   nodes: Array<Node>
}
 */

class CayleyDiagramModel {
   group /*: Group */

   // Write-only request: CayleyDiagramGenerator writes this to trigger a scene rebuild;
   // CayleyDiagramViewModel consumes it. Not persisted — viewState owns serialization.
   layout /*: ?{pov: POV, nodes: Array<Node>, arrows: Array<Arrow>, chunks: Array<Chunk>} */

   // Highlight configuration — visualizer-specific parameters for HighlightControl
   highlightConfiguration = {
      highlightTypes /*: Array<string> */: ['node color', 'a ring around the node', 'a square around the node'],
      saturation /*: Array<number> */: [0.53, 0.53, 0.53],
      lightness /*: Array<number> */: [0.3, 0.3, 0.3],
      hueOffset /*: Array<number> */: [0, 0, 0]
   }

   // View parameters — manipulated by CayleyViewControl sliders
   background /*: css_color */
   fog_level /*: float */
   line_width /*: number */
   sphere_scale_factor /*: float */
   zoom_level /*: number */
   arrowhead_placement /*: float */
   label_scale_factor /*: float */
   showingAxes /*: boolean */

   // View parameters — manipulated by HighlightControl
   highlightColors /*: Array<Array<?css_color>> */

   // Opaque plugin slots (carried opaquely through serialization)
   highlightControl /*: any */  // owned by HighlightControl
   diagramControl /*: any */    // owned by CayleyDiagramControl
   viewState /*: any */         // owned by CayleyDiagramView

   // Request fields — transient commands; set by CayleyViewControl, cleared by CayleyDiagramView
   snap_to_axis_request /*: boolean */

   constructor (group /*: Group */) {
      this.group = group
      this.reset()
   }

   reset () {
      this.layout = null
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

   toJSON () /*: CayleyDiagramJSON */ {
      const json = {
         group_url: this.group.URL,

         background: this.background,
         fog_level: this.fog_level,
         line_width: this.line_width,
         sphere_scale_factor: this.sphere_scale_factor,
         zoom_level: this.zoom_level,
         arrowhead_placement: this.arrowhead_placement,
         label_scale_factor: this.label_scale_factor,
         showing_axes: this.showingAxes,

         highlight_colors: this.highlightColors,

         highlight_control: this.highlightControl?.toJSON?.() ?? this.highlightControl,
         diagram_control: this.diagramControl?.toJSON?.() ?? this.diagramControl,

         view_state: this.viewState.toJSON()
      }

      return json
   }

   fromJSON (json /*: CayleyDiagramJSON */) {
      this.reset()

      if (json.group_url != null && this.group.URL != json.group_url) {
         this.group = Library.getGroupByURL(json.group_url)
      }

      this.background = json.background ?? this.background
      this.fog_level = json.fog_level ?? this.fog_level
      this.line_width = json.line_width ?? this.line_width
      this.sphere_scale_factor = json.sphere_scale_factor ?? this.sphere_scale_factor
      this.zoom_level = json.zoom_level ?? this.zoom_level
      this.arrowhead_placement = json.arrowhead_placement ?? this.arrowhead_placement
      this.label_scale_factor = json.label_scale_factor ?? this.label_scale_factor
      this.showingAxes = json.showing_axes ?? this.showingAxes

      this.highlightColors = json.highlight_colors ?? this.highlightColors

      // let owners deserialize opaque slots
      if (this.highlightControl?.fromJSON == null) {
         this.highlightControl = json.highlight_control
      } else if (json.highlight_control != null) {
         this.highlightControl.fromJSON(json.highlight_control)
      }

      if (this.diagramControl?.fromJSON == null) {
         this.diagramControl = json.diagram_control
      } else if (json.diagram_control != null) {
         this.diagramControl.fromJSON(json.diagram_control)
      }

      if (this.viewState?.fromJSON == null) {
         this.viewState = json.view_state
      } else {
         this.viewState.fromJSON(json.view_state)
      }

      return this
   }
}

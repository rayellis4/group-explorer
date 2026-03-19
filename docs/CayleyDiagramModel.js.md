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
   layout /*: ?{pov: POV, nodes: Array<Node>, arrows: Array<Arrow>, chunks: Array<Chunk>} */ = null

   // Highlight configuration — visualizer-specific parameters for HighlightControl
   highlightConfiguration = {
      highlightTypes /*: Array<string> */: ['node color', 'a ring around the node', 'a square around the node'],
      saturation /*: Array<number> */: [0.53, 0.53, 0.53],
      lightness /*: Array<number> */: [0.3, 0.3, 0.3],
      hueOffset /*: Array<number> */: [0, 0, 0]
   }

   // View parameters — manipulated by CayleyViewControl sliders
   background /*: css_color */ = '#E8C8C8'
   fog_level /*: float */ = 0
   line_width /*: number */ = 4
   sphere_scale_factor /*: float */ = 1
   zoom_level /*: number */ = 1
   arrowhead_placement /*: float */ = 1
   label_scale_factor /*: float */ = 1
   showingAxes /*: boolean */ = false

   // View parameters — manipulated by HighlightControl
   highlightColors /*: Array<Array<?css_color>> */ = [[], [], []]

   // Opaque plugin slots (carried opaquely through serialization)
   highlightControl /*: any */ = null  // owned by HighlightControl
   diagramControl /*: any */ = null  // owned by CayleyDiagramControl
   viewState /*: any */ = null       // owned by CayleyDiagramView

   // Request fields — transient commands; set by CayleyViewControl, cleared by CayleyDiagramView
   snap_to_axis_request /*: boolean */ = false

   constructor (group /*: Group */) {
      this.group = group
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

         highlight_control: (this.highlightControl?.toJSON == null)
            ? this.highlightControl
            : this.highlightControl.toJSON(),
         diagram_control: (this.diagramControl?.toJSON == null)
            ? this.diagramControl
            : this.diagramControl.toJSON(),
         view_state: (this.viewState?.toJSON == null)
            ? this.viewState
            : this.viewState.toJSON()
      }

      return json
   }

   fromJSON (json /*: CayleyDiagramJSON */) {
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

      this.highlightColors = json.highlight_colors ?? [[], [], []]

      // let opaque chunks deserialize them selves, if needed
      if (json.highlight_control != null) {
         if (this.highlightControl != null && 'fromJSON' in this.highlightControl) {
            this.highlightControl.fromJSON(json.highlight_control)
         } else {
            this.highlightControl = json.highlight_control  // opaque chunk of JSON
         }
      }
      if (json.diagram_control != null) {
         if (this.diagramControl != null && 'fromJSON' in this.diagramControl) {
            this.diagramControl.fromJSON(json.diagram_control)
         } else {
            this.diagramControl = json.diagram_control  // opaque chunk of JSON
         }
      }
      if (json.view_state != null) {
         if (this.viewState != null && 'fromJSON' in this.viewState) {
            this.viewState.fromJSON(json.view_state)
         } else {
            this.viewState = json.view_state  // opaque chunk of JSON (will this ever happen?)
         }
      }

      return this
   }
}

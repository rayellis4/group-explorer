// @flow
import * as Library from './Library.js'
/*::
import {Group} from './Group.js'
export type CycleGraphJSON = {
    groupURL: string,
    highlights?: Array<Array<?color>>,
    ...
}
 */
export class CycleGraphModel {
   group /*: Group */
   highlightConfiguration = {  // visualizer-specific highlight parameters
      highlightTypes /*: Array<string> */: ['background', 'border', 'top'],
      saturation /*: Array<number> */: [1, 1, 1],
      lightness /*: Array<number> */: [0.8, 0.8, 0.8],
      hueOffset /*: Array<number> */: [0, 1/3, 2/3]
   }
   highlightColors /*: ?Array<Array<?css_color>> */ = [[], [], []]

   // Opaque plugin slots (carried opaquely through serialization)
   highlightControl /*: any */ = null

   constructor (group /*: Group */) {
      this.group = group
   }

   toJSON () /*: CycleGraphJSON */ {
      const json = {
         group_url: this.group.URL,
         highlight_colors: this.highlightColors,
         highlight_control: (this.highlightControl?.toJSON == null)
            ? this.highlightControl
            : this.highlightControl.toJSON()
      }

      return json
   }

   fromJSON (json /*: CycleGraphJSON */) {
      if (json.group_url != null && this.group.URL != json.group_url) {
         this.group = Library.getGroupByURL(json.group_url)
      }
      this.highlightColors = json.highlight_colors ?? [[], [], []]
      if (json.highlight_control != null) {
         if (this.highlightControl != null && 'fromJSON' in this.highlightControl) {
            this.highlightControl.fromJSON(json.highlight_control)
         } else {
            this.highlightControl = json.highlight_control
         }
      }

      return this
   }
}

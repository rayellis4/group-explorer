// @flow
import * as Library from './Library.js'
/*::
import {Group} from './Group.js'
export type MulttableJSON = {
    groupURL: string,
    highlights?: Array<Array<?color>>,
    highlightControl?: any,
    subgroupOrganization: number,
    separation: number,
    coloration: 'rainbow' | 'grayscale' | 'none',
    colorReordering: 'topRowFixed' | 'elementColorsFixed'
    ...
}
 */
export class MulttableModel {
   group /*: Group */
   highlights /*: Array<Array<?color>> */ = [[], [], []]
   highlightConfiguration = {  // visualizer-specific highlight parameters
      highlightTypes /*: Array<string> */: ['background', 'border', 'corner'],
      saturation /*: Array<number> */: [1, 1, 1],
      lightness /*: Array<number> */: [0.8, 0.8, 0.8],
      hueOffset /*: Array<number> */: [0, 1/3, 2/3]
   }
   organizingSubgroup /*: number */ = 0
   separation /*: number */ = 0
   coloration /*: 'rainbow' | 'grayscale' | 'none' */ = 'rainbow'
   colorReordering /*: 'topRowFixed' | 'elementColorsFixed' */ = 'topRowFixed'
   elements /*: Array<groupElement> */

   // Opaque plugin slots (carried opaquely through serialization)
   highlightColors /*: ?Array<Array<?css_color>> */ = null
   highlightControl /*: any */ = null

   constructor (group /*: Group */) {
      this.group = group
      this.elements = group.elements
   }

   toJSON () /*: MulttableJSON */ {
      return {
         group_url: this.group.URL,
         highlights: this.highlights,
         organizing_subgroup: this.organizingSubgroup,
         separation: this.separation,
         coloration: this.coloration,
         color_reordering: this.colorReordering,
         elements: this.elements,
         highlight_colors: this.highlightColors,
         highlight_control: (this.highlightControl?.toJSON == null)
            ? this.highlightControl
            : this.highlightControl.toJSON()
      }
   }

   fromJSON (json /*: MulttableJSON */) {
      if (json.group_url != null && this.group.URL != json.group_url) {
         this.group = Library.getGroupByURL(json.group_url)
      }
      this.highlights = json.highlights ?? [[], [], []]
      this.organizingSubgroup = json.organizing_subgroup ?? 0
      this.separation = json.separation ?? 0
      this.coloration = json.coloration ?? 'rainbow'
      this.colorReordering = json.color_reordering ?? 'topRowFixed'
      this.elements = json.elements ?? this.group.elements
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

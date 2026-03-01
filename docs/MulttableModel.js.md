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
import type {HighlightControlViewModel} from './HighlightControlViewModel.js'
 */
export class MulttableModel {
   group /*: Group */
   highlights /*: Array<Array<?color>> */ = [[], [], []]
   highlightConfiguration = {  // visualizer-specific highlight parameters
      highlightTypes /*: Array<string> */: ['background', 'border', 'top'],
      saturation /*: Array<number> */: [1, 1, 1],
      lightness /*: Array<number> */: [0.8, 0.8, 0.8],
      hueOffset /*: Array<number> */: [0, 1/3, 2/3]
   }
   highlightControl /*: ?HighlightControlViewModel */
   organizingSubgroup /*: number */ = 0
   separation /*: number */ = 0
   coloration /*: 'rainbow' | 'grayscale' | 'none' */ = 'rainbow'
   colorReordering /*: 'topRowFixed' | 'elementColorsFixed' */ = 'topRowFixed'
   foo /*: Map<any, any> */ = new Map()

   constructor (group /*: Group */) {
      this.group = group
   }

   toJSON () /*: MulttableJSON */ {
      const json /*: MulttableJSON */ = {
         groupURL: this.group.URL,
         highlights: this.highlights,
         highlightControl: (this.highlightControl == null || this.highlightControl.constructor.name == 'Object')
            ? this.highlightControl
            : this.highlightControl.toJSON(),
         organizingSubgroup: this.organizingSubgroup,
         separation: this.separation,
         coloration: this.coloration,
         colorReordering: this.colorReordering
      }
      return json
   }

   fromJSON (json /*: MulttableJSON */) {
      // $FlowFixMe[incompatible-type] -- check that we have the required group, figure out what to do
      if (this.group.URL != json.groupURL) {
         this.group = Library.getGroupByURL(json.groupURL)
      }
      this.highlights = json.highlights ?? [[], [], []]
      this.organizingSubgroup = json.organizingSubgroup ?? 0
      this.separation = json.separation ?? 0
      this.coloration = json.coloration ?? 'rainbow'
      this.colorReordering = this.colorReordering ?? 'topRowFixed'
      return this
   }
}

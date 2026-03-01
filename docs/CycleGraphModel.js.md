// @flow
import * as Library from './Library.js'
/*::
import {Group} from './Group.js'
export type CycleGraphJSON = {
    groupURL: string,
    highlights?: Array<Array<?color>>,
    highlightControl?: any
    ...
}
import type {HighlightControlViewModel} from './HighlightControlViewModel.js'
 */
export class CycleGraphModel {
   group /*: Group */
   highlights /*: Array<Array<?color>> */ = [[], [], []]
   highlightConfiguration = {  // visualizer-specific highlight parameters
      highlightTypes /*: Array<string> */: ['background', 'border', 'top'],
      saturation /*: Array<number> */: [1, 1, 1],
      lightness /*: Array<number> */: [0.8, 0.8, 0.8],
      hueOffset /*: Array<number> */: [0, 1/3, 2/3]
   }
   highlightControl /*: ?HighlightControlViewModel */

   constructor (group /*: Group */) {
      this.group = group
   }

   toJSON () /*: CycleGraphJSON */ {
      const json /*: CycleGraphJSON */ = {
         groupURL: this.group.URL,
         highlights: this.highlights,
         highlightControl: (this.highlightControl == null || this.highlightControl.constructor.name == 'Object')
            ? this.highlightControl
            : this.highlightControl.toJSON()
      }
      return json
   }

   fromJSON (json /*: CycleGraphJSON */) {
      // $FlowFixMe[incompatible-type] -- check that we have the required group, figure out what to do
      if (this.group.URL != json.groupURL) {
         this.group = Library.getGroupByURL(json.groupURL)
      }
      this.highlights = json.highlights ?? [[], [], []]
      return this
   }
}

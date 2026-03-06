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
   static builtinProperties /*: Array<string> */ = [
      'group',
      'highlights',
      'highlightConfiguration'
   ]
   group /*: Group */
   highlights /*: Array<Array<?color>> */ = [[], [], []]
   highlightConfiguration = {  // visualizer-specific highlight parameters
      highlightTypes /*: Array<string> */: ['background', 'border', 'top'],
      saturation /*: Array<number> */: [1, 1, 1],
      lightness /*: Array<number> */: [0.8, 0.8, 0.8],
      hueOffset /*: Array<number> */: [0, 1/3, 2/3]
   }

   constructor (group /*: Group */) {
      this.group = group
   }

   toJSON () /*: CycleGraphJSON */ {
      const json /*: CycleGraphJSON */ = {
         groupURL: this.group.URL,
         highlights: this.highlights
      }

      Object.getOwnPropertyNames(this)
         .filter((property) => !this.constructor.builtinProperties.includes(property))
         .forEach((property) => {
            json[property] = (this[property]?.toJSON == null)
               ? this[property]
               : this[property].toJSON()
         })

      return json
   }

   fromJSON (json /*: CycleGraphJSON */) {
      if (this.group.URL != json.groupURL) {
         this.group = Library.getGroupByURL(json.groupURL)
      }
      this.highlights = json.highlights ?? [[], [], []]

      Object.getOwnPropertyNames(this)
         .filter((property) => !this.constructor.builtinProperties.includes(property))
         .forEach((property) => {
            if (json[property] != null) {
               if (this[property]?.fromJSON == null) {
                  this[property] =  json[property]
               } else {
                  this[property].fromJSON(json[property])
               }
            }
         })

      return this
   }
}

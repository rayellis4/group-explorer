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
   static builtinProperties /*: Array<string> */ = [
      'group',
      'highlights',
      'highlightConfiguration',
      'organizingSubgroup',
      'separation',
      'coloration',
      'colorReordering',
      'elements'
   ]
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

   constructor (group /*: Group */) {
      this.group = group
      this.elements = group.elements
   }

   toJSON () /*: MulttableJSON */ {
      const json /*: MulttableJSON */ = {
         groupURL: this.group.URL,
         highlights: this.highlights,
         organizingSubgroup: this.organizingSubgroup,
         separation: this.separation,
         coloration: this.coloration,
         colorReordering: this.colorReordering,
         elements: this.elements
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

   fromJSON (json /*: MulttableJSON */) {
      if (this.group.URL != json.groupURL) {
         this.group = Library.getGroupByURL(json.groupURL)
      }
      this.highlights = json.highlights ?? [[], [], []]
      this.organizingSubgroup = json.organizingSubgroup ?? 0
      this.separation = json.separation ?? 0
      this.coloration = json.coloration ?? 'rainbow'
      this.colorReordering = this.colorReordering ?? 'topRowFixed'
      this.elements = json.elements ?? this.group.elements
      
      Object.getOwnPropertyNames(this)
         .filter((property) => !this.constructor.builtinProperties.includes(property))
         .forEach((property) => {
            if (json[property] != null) {
               if (this[property]?.fromJSON == null) {
                  this[property] = json[property]
               } else {
                  this[property].fromJSON(json[property])
               }
            }
         })

      return this
   }
}

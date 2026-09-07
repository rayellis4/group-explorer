/*
# MulttableModel

Model for the multtable visualizer. Holds all serializable state:

* **View parameters** — fog, zoom, sphere size, line width, etc.
* **Opaque plugin slots**
    * `highlightControl` (owned by `HighlightControl`)

```javascript
 */

import { Serializable, isSerializable } from './GEUtils.js'
import {Group} from './Group.js'
import { HighlightControlJSON } from './HighlightControl.js';
import * as Library from './Library.js'

export type MulttableColoration = 'rainbow' | 'grayscale' | 'none'
export type MulttableColorReordering = 'topRowFixed' | 'elementColorsFixed'
export type MulttableJSON = {
   group_url: string,
   highlight_colors?: Maybe<color>[][],
   highlight_control?: HighlightControlJSON,
   organizing_subgroup?: number,
   separation?: number,
   coloration?: MulttableColoration,
   color_reordering?: MulttableColorReordering,
   elements?: groupElement[]
}

export class MulttableModel {
   group: Group
   highlightColors!: Maybe<color>[][]
   highlightConfiguration: {  // visualizer-specific highlight parameters
      highlightTypes: string[],
      saturation: number[],
      lightness: number[],
      hueOffset: number[]
   } = {  // visualizer-specific highlight parameters
      highlightTypes: ['background', 'border', 'top'],
      saturation: [1, 1, 1],
      lightness: [0.8, 0.8, 0.8],
      hueOffset: [0, 1/3, 2/3]
   }
   organizingSubgroup!: number
   separation!: number
   coloration!: 'rainbow' | 'grayscale' | 'none'
   colorReordering!: 'topRowFixed' | 'elementColorsFixed'
   elements!: groupElement[]

   // Opaque plugin slots (carried opaquely through serialization)
   highlightControl!: HighlightControlJSON | (object & Serializable<HighlightControlJSON>)

   constructor (group: Group) {
      this.group = group
      this.reset()
   }

   reset () {
      this.highlightColors = [[], [], []]
      this.organizingSubgroup = 0
      this.separation = 0
      this.coloration = 'rainbow'
      this.colorReordering = 'topRowFixed'
      this.elements = [...this.group.elements]
   }

   toJSON (): MulttableJSON {
      const json = {
         group_url: this.group.URL,
         highlight_colors: this.highlightColors,
         highlight_control: isSerializable<HighlightControlJSON>(this.highlightControl)
            ? this.highlightControl.toJSON()
            : this.highlightControl,
         organizing_subgroup: this.organizingSubgroup,
         separation: this.separation,
         coloration: this.coloration,
         color_reordering: this.colorReordering,
         elements: this.elements,
      }

      return json
   }

   fromJSON (json: MulttableJSON) {
      this.reset()

      if (json.group_url != null && this.group.URL != json.group_url) {
         this.group = Library.getGroupByURL(json.group_url) as Group
      }

      this.highlightColors = json.highlight_colors ?? this.highlightColors
      this.organizingSubgroup = json.organizing_subgroup ?? this.organizingSubgroup
      this.separation = json.separation ?? this.separation
      this.coloration = json.coloration ?? this.coloration
      this.colorReordering = json.color_reordering ?? this.colorReordering
      this.elements = json.elements ?? this.elements

      // let owners deserialize opaque slots
      if (json.highlight_control != null) {
         if (this.highlightControl == null || !('fromJSON' in this.highlightControl)) {
            this.highlightControl = json.highlight_control
         } else if (json.highlight_control != null) {
            this.highlightControl.fromJSON(json.highlight_control)
         }
      }

      return this
   }
}

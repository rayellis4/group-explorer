/*
# CycleGraphModel

Model for the cycle graph visualizer. Holds all serializable state:

* **View parameters** — fog, zoom, sphere size, line width, etc.
* **Opaque plugin slots**
    * `highlightControl` (owned by `HighlightControl`)

```javascript
 */

import { Serializable, isSerializable } from './GEUtils.js'
import type { Group } from './Group.js'
import type { HighlightControlModelInterface, HighlightControlJSON } from './HighlightControl.js'
import * as Library from './Library.js'

export type CycleGraphJSON = {
   group_url: string,
   highlight_colors?: Maybe<color>[][],
   highlight_control?: HighlightControlJSON
}

export class CycleGraphModel implements HighlightControlModelInterface {
   group!: Group
   highlightColors!: Maybe<color>[][]
   highlightConfiguration = {
      highlightTypes: ['background', 'border', 'top'],
      saturation: [1, 1, 1],
      lightness: [0.8, 0.8, 0.8],
      hueOffset: [0, 1/3, 2/3]
   }

   // Opaque plugin slots (carried opaquely through serialization)
   highlightControl!: HighlightControlJSON | (object & Serializable<HighlightControlJSON>)

   constructor (group: Group) {
      this.group = group
      this.reset()
   }

   reset () {
      this.highlightColors = [[], [], []]
   }

   toJSON (): CycleGraphJSON {
      const json = {
         group_url: this.group.URL,
         highlight_colors: this.highlightColors,
         highlight_control: isSerializable<HighlightControlJSON>(this.highlightControl)
            ? this.highlightControl.toJSON()
            : this.highlightControl
      }

      return json
   }

   fromJSON (json: CycleGraphJSON) {
      this.reset()

      if (json.group_url != null && this.group.URL != json.group_url) {
         this.group = Library.getGroupByURL(json.group_url) as Group
      }
      this.highlightColors = json.highlight_colors ?? this.highlightColors
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

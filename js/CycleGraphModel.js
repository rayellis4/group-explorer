/*
# CycleGraphModel

Model for the cycle graph visualizer. Holds all serializable state:

* **View parameters** — fog, zoom, sphere size, line width, etc.
* **Opaque plugin slots**
    * `highlightControl` (owned by `HighlightControl`)

```javascript
 */
import * as Library from './Library.js';
export class CycleGraphModel {
    group;
    highlightColors;
    highlightConfiguration = {
        highlightTypes: ['background', 'border', 'top'],
        saturation: [1, 1, 1],
        lightness: [0.8, 0.8, 0.8],
        hueOffset: [0, 1 / 3, 2 / 3]
    };
    // Opaque plugin slots (carried opaquely through serialization)
    highlightControl = null;
    constructor(group) {
        this.group = group;
        this.reset();
    }
    reset() {
        this.highlightColors = [[], [], []];
    }
    toJSON() {
        const json = {
            group_url: this.group.URL,
            highlight_colors: this.highlightColors,
            highlight_control: this.highlightControl?.toJSON?.() ?? this.highlightControl
        };
        return json;
    }
    fromJSON(json) {
        this.reset();
        if (json.group_url != null && this.group.URL != json.group_url) {
            this.group = Library.getGroupByURL(json.group_url);
        }
        this.highlightColors = json.highlight_colors ?? this.highlightColors;
        if (json.highlight_control != null) {
            if (this.highlightControl != null && 'fromJSON' in this.highlightControl) {
                this.highlightControl.fromJSON(json.highlight_control);
            }
            else {
                this.highlightControl = json.highlight_control;
            }
        }
        return this;
    }
}
//# sourceMappingURL=CycleGraphModel.js.map
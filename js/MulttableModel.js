/*
# MulttableModel

Model for the multtable visualizer. Holds all serializable state:

* **View parameters** — fog, zoom, sphere size, line width, etc.
* **Opaque plugin slots**
    * `highlightControl` (owned by `HighlightControl`)

```javascript
 */
import * as Library from './Library.js';
export class MulttableModel {
    group;
    highlightColors;
    highlightConfiguration = {
        highlightTypes: ['background', 'border', 'top'],
        saturation: [1, 1, 1],
        lightness: [0.8, 0.8, 0.8],
        hueOffset: [0, 1 / 3, 2 / 3]
    };
    organizingSubgroup;
    separation;
    coloration;
    colorReordering;
    elements;
    // Opaque plugin slots (carried opaquely through serialization)
    highlightControl = null;
    constructor(group) {
        this.group = group;
        this.reset();
    }
    reset() {
        this.highlightColors = [[], [], []];
        this.organizingSubgroup = 0;
        this.separation = 0;
        this.coloration = 'rainbow';
        this.colorReordering = 'topRowFixed';
        this.elements = [...this.group.elements];
    }
    toJSON() {
        const json = {
            group_url: this.group.URL,
            highlight_colors: this.highlightColors,
            highlight_control: this.highlightControl?.toJSON?.() ?? this.highlightControl,
            organizing_subgroup: this.organizingSubgroup,
            separation: this.separation,
            coloration: this.coloration,
            color_reordering: this.colorReordering,
            elements: this.elements,
        };
        return json;
    }
    fromJSON(json) {
        this.reset();
        if (json.group_url != null && this.group.URL != json.group_url) {
            this.group = Library.getGroupByURL(json.group_url);
        }
        this.highlightColors = json.highlight_colors ?? this.highlightColors;
        this.organizingSubgroup = json.organizing_subgroup ?? this.organizingSubgroup;
        this.separation = json.separation ?? this.separation;
        this.coloration = json.coloration ?? this.coloration;
        this.colorReordering = json.color_reordering ?? this.colorReordering;
        this.elements = json.elements ?? this.elements;
        // let owners deserialize opaque slots
        if (this.highlightControl?.fromJSON == null) {
            this.highlightControl = json.highlight_control;
        }
        else if (json.highlight_control != null) {
            this.highlightControl.fromJSON(json.highlight_control);
        }
        return this;
    }
}
//# sourceMappingURL=MulttableModel.js.map
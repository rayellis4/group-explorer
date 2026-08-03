// @flow
import * as Library from './Library.js';
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
    group; /*: Group */
    highlightColors; /*: Array<Array<?css_color>> */
    highlightConfiguration = {
        highlightTypes /*: Array<string> */: ['background', 'border', 'corner'],
        saturation /*: Array<number> */: [1, 1, 1],
        lightness /*: Array<number> */: [0.8, 0.8, 0.8],
        hueOffset /*: Array<number> */: [0, 1 / 3, 2 / 3]
    };
    organizingSubgroup; /*: number */
    separation; /*: number */
    coloration; /*: 'rainbow' | 'grayscale' | 'none' */
    colorReordering; /*: 'topRowFixed' | 'elementColorsFixed' */
    elements; /*: Array<groupElement> */
    // Opaque plugin slots (carried opaquely through serialization)
    highlightControl; /*: any */
    constructor(group /*: Group */) {
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
            organizing_subgroup: this.organizingSubgroup,
            separation: this.separation,
            coloration: this.coloration,
            color_reordering: this.colorReordering,
            elements: this.elements,
            highlight_control: this.highlightControl?.toJSON?.() ?? this.highlightControl,
        };
        return json;
    }
    fromJSON(json /*: MulttableJSON */) {
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
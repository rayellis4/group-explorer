import { Serializable } from './GEUtils.js';
import type { CayleyDiagramControlJSON } from './CayleyDiagramControl.ts';
import type { LayoutType, LayoutJSON } from './CayleyDiagramView.ts';
import type { Group } from './Group.ts';
import type { HighlightControlModelInterface, HighlightControlJSON } from './HighlightControl.ts';
export { DEFAULT_NODE_COLOR } from './CayleyDiagramView.js';
export type { POV, NodeType, ArrowType, ChunkType, LayoutType } from './CayleyDiagramView.ts';
export type CayleyDiagramModelJSON = {
    group_url: string;
    layout: Maybe<LayoutJSON>;
    background: CayleyDiagramModel['background'];
    fog_level: CayleyDiagramModel['fog_level'];
    line_width: CayleyDiagramModel['line_width'];
    sphere_scale_factor: CayleyDiagramModel['sphere_scale_factor'];
    zoom_level: CayleyDiagramModel['zoom_level'];
    arrowhead_placement: CayleyDiagramModel['arrowhead_placement'];
    label_scale_factor: CayleyDiagramModel['label_scale_factor'];
    showing_axes: CayleyDiagramModel['showingAxes'];
    highlight_colors: CayleyDiagramModel['highlightColors'];
    highlight_control?: HighlightControlJSON;
    diagram_control: CayleyDiagramControlJSON;
};
export declare class CayleyDiagramModel implements HighlightControlModelInterface {
    group: Group;
    highlightConfiguration: {
        highlightTypes: string[];
        saturation: number[];
        lightness: number[];
        hueOffset: number[];
    };
    layout: LayoutType;
    background: color;
    fog_level: float;
    line_width: number;
    sphere_scale_factor: float;
    zoom_level: number;
    arrowhead_placement: float;
    label_scale_factor: float;
    showingAxes: boolean;
    highlightColors: Maybe<color>[][];
    highlightControl: HighlightControlJSON | (object & Serializable<HighlightControlJSON>);
    diagramControl: CayleyDiagramControlJSON | (object & Serializable<CayleyDiagramControlJSON>);
    snap_to_axis_request: boolean;
    constructor(group: Group);
    reset(): void;
    toJSON(): CayleyDiagramModelJSON;
    fromJSON(json: CayleyDiagramModelJSON): this;
}

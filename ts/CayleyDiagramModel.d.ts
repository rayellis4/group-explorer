import type { LayoutData as LayoutType } from './CayleyDiagramView.ts';
import type { Group } from './Group.ts';
import type { HighlightControlModelInterface } from './HighlightControl.ts';
export { DEFAULT_NODE_COLOR } from './CayleyDiagramView.js';
export type { POV, NodeData as NodeType, ArrowData as ArrowType, ChunkData as ChunkType, LayoutData as LayoutType, POVJSON, NodeDataJSON, ArrowDataJSON, ChunkDataJSON, LayoutDataJSON, } from './CayleyDiagramView.ts';
export type CayleyDiagramModelJSON = {
    group_url: string;
    background: CayleyDiagramModel['background'];
    fog_level: CayleyDiagramModel['fog_level'];
    line_width: CayleyDiagramModel['line_width'];
    sphere_scale_factor: CayleyDiagramModel['sphere_scale_factor'];
    zoom_level: CayleyDiagramModel['zoom_level'];
    arrowhead_placement: CayleyDiagramModel['arrowhead_placement'];
    label_scale_factor: CayleyDiagramModel['label_scale_factor'];
    showing_axes: CayleyDiagramModel['showingAxes'];
    highlight_colors: CayleyDiagramModel['highlightColors'];
    highlight_control: CayleyDiagramModel['highlightControl'];
    diagram_control: CayleyDiagramModel['diagramControl'];
    view_state: CayleyDiagramModel['viewState'];
};
export declare class CayleyDiagramModel implements HighlightControlModelInterface {
    group: Group;
    layout: Maybe<LayoutType>;
    highlightConfiguration: {
        highlightTypes: string[];
        saturation: number[];
        lightness: number[];
        hueOffset: number[];
    };
    background: color;
    fog_level: float;
    line_width: number;
    sphere_scale_factor: float;
    zoom_level: number;
    arrowhead_placement: float;
    label_scale_factor: float;
    showingAxes: boolean;
    highlightColors: Maybe<color>[][];
    highlightControl: any;
    diagramControl: any;
    viewState: any;
    snap_to_axis_request: boolean;
    constructor(group: Group);
    reset(): void;
    toJSON(): CayleyDiagramModelJSON;
    fromJSON(json: CayleyDiagramModelJSON): this;
}

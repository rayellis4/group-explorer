export { CayleyDiagramModel };
declare class CayleyDiagramModel {
    group: any;
    layout: any;
    highlightConfiguration: {
        highlightTypes: string[];
        saturation: number[];
        lightness: number[];
        hueOffset: number[];
    };
    background: any;
    fog_level: any;
    line_width: any;
    sphere_scale_factor: any;
    zoom_level: any;
    arrowhead_placement: any;
    label_scale_factor: any;
    showingAxes: any;
    highlightColors: any;
    highlightControl: any;
    diagramControl: any;
    viewState: any;
    snap_to_axis_request: any;
    constructor(group: any);
    reset(): void;
    toJSON(): {
        group_url: any;
        background: any;
        fog_level: any;
        line_width: any;
        sphere_scale_factor: any;
        zoom_level: any;
        arrowhead_placement: any;
        label_scale_factor: any;
        showing_axes: any;
        highlight_colors: any;
        highlight_control: any;
        diagram_control: any;
        view_state: any;
    };
    fromJSON(json: any): this;
}

declare const DEFAULT_SPHERE_COLOR = "#8c8c8c";
declare const DEFAULT_LINE_COLOR = "black";
export { DEFAULT_SPHERE_COLOR, DEFAULT_LINE_COLOR };
export declare class AbstractDiagramDisplay {
    constructor(options?: {});
    get background(): string;
    set background(background_color: string);
    get canvas(): any;
    get container(): any;
    set container(container: any);
    enableTrackballControl(container: any): void;
    get fog_level(): any;
    set fog_level(fog_level: any);
    get lights(): any;
    get light_positions(): any;
    set light_positions(locations: any);
    get size(): {
        w: any;
        h: any;
    };
    set size({ w, h }: {
        w: any;
        h: any;
    });
    getSize(): {
        w: any;
        h: any;
    };
    setSize(width: any, height: any): void;
    get sphere_facet_count(): 10 | 20;
    clear(): void;
    getGroup(name: any): any;
    deleteAllObjects(): void;
    getImage(): HTMLImageElement;
    render(): void;
    resize(): void;
    setCameraPosition(position: any, up: any): void;
    get zoom_level(): any;
    set zoom_level(zoom_level: any);
    snapToAxis(): void;
    toggleCoordinateAxisDisplay(): void;
    drawCoordinateAxes(): void;
    removeCoordinateAxes(): void;
    get spheres(): any;
    get sphere_scale_factor(): any;
    set sphere_scale_factor(new_scale_factor: any);
    get sphere_radius(): number;
    createSpheres(sphere_data: any): void;
    deleteAllSpheres(): void;
    get lines(): any;
    get line_width(): any;
    set line_width(line_width: any);
    get scaledLinewidth(): number;
    createLine(vertices: any): any;
    deleteAllLines(): void;
    deleteLines(lines: any): void;
    rescaleLines(): void;
}

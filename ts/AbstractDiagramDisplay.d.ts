import * as THREE from '../lib/externals.js';
export type LineType = THREE.Line | THREE.Line2;
type SphereData = {
    position: THREE.Vector3;
    color?: color;
} & Object;
export type AbstractDiagramDisplayOptions = {
    container?: HTMLElement;
    width?: number;
    height?: number;
    line_width?: number;
};
declare const DEFAULT_SPHERE_COLOR = "#8c8c8c";
declare const DEFAULT_LINE_COLOR = "black";
export { DEFAULT_SPHERE_COLOR, DEFAULT_LINE_COLOR };
export declare class AbstractDiagramDisplay {
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    control: Maybe<THREE.TrackballControls>;
    _fog_level: float;
    sphere_base_radius: float;
    _sphere_scale_factor: float;
    _line_width: number;
    constructor(options?: AbstractDiagramDisplayOptions);
    get background(): color;
    set background(background_color: THREE.Color | number | string);
    get canvas(): HTMLCanvasElement;
    get container(): HTMLElement;
    set container(container: HTMLElement);
    enableTrackballControl(container?: Maybe<HTMLElement>): void;
    get fog_level(): float;
    set fog_level(fog_level: float);
    get lights(): THREE.Object3D<THREE.Object3DEventMap>[];
    get light_positions(): THREE.Vector3[];
    set light_positions(locations: THREE.Vector3[]);
    get size(): {
        w: number;
        h: number;
    };
    set size({ w, h }: {
        w: number;
        h: number;
    });
    getSize(): {
        w: number;
        h: number;
    };
    setSize(width: number, height: number): void;
    get sphere_facet_count(): 10 | 20;
    clear(): void;
    getGroup(name: string): THREE.Group;
    deleteAllObjects(): void;
    getImage(): HTMLImageElement;
    render(): void;
    resize(): void;
    setCameraPosition(position: THREE.Vector3, up: THREE.Vector3): void;
    get zoom_level(): float;
    set zoom_level(zoom_level: float);
    snapToAxis(): void;
    toggleCoordinateAxisDisplay(): void;
    drawCoordinateAxes(): void;
    removeCoordinateAxes(): void;
    get spheres(): THREE.Mesh[];
    get sphere_scale_factor(): float;
    set sphere_scale_factor(new_scale_factor: float);
    get sphere_radius(): float;
    createSpheres(sphere_data: SphereData[]): void;
    deleteAllSpheres(): void;
    get lines(): LineType[];
    get line_width(): float;
    set line_width(line_width: float);
    get scaledLinewidth(): number;
    createLine(vertices: THREE.Vector3[]): LineType;
    deleteAllLines(): void;
    deleteLines(lines: LineType[]): void;
    rescaleLines(): void;
}

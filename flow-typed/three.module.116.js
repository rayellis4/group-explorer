// @flow

declare class THREE$ArrowHelper extends THREE$Object3D {
    constructor(dir: THREE$Vector3,
                origin?: THREE$Vector3,
                length?: number,
                color?: THREE$Color | string | number,
                headLength?: number,
                headWidth?: number): this;
    line: THREE$Line;
    cone: THREE$Mesh;
}

declare class THREE$BoxGeometry extends THREE$Geometry {
    constructor(width: float, height: float, depth: float): this;
}

declare class THREE$BufferGeometry {
    isBufferGeometry: boolean;
    userData: {[key: string]: any};
    dispose(): void;
}

declare class THREE$Camera extends THREE$Object3D {
}

declare class THREE$CanvasTexture extends THREE$Texture {
}

declare class THREE$Color {
    constructor(color: THREE$Color | string | number): this;
    r: float;
    g: float;
    b: float;
    equals(color: THREE$Color): boolean;
    getHex(): number;
    getHexString(): string;
    getHSL(Obj): {h: number, s: number, l: number};
    set(value: THREE$Color | string | number): THREE$Color;
}

declare class THREE$Curve {
    getLength(): number;
    getPointAt(u: number): THREE$Vector3;
    getPoints(divisions: number): Array<THREE$Vector3>;
}

declare class THREE$DirectionalLight extends THREE$Object3D {
}

declare class THREE$Fog {
    constructor(color?: THREE$Color | string | number): void;
    color: THREE$Color;
    far: number;
    near: number;
}

declare class THREE$Geometry {
    isGeometry: boolean;
    parameters: {radius: float} & any;  /* is really subclass property -- SphereGeometry */
    uvsNeedUpdate: boolean;
    vertices: Array<THREE$Vector3>;
    verticesNeedUpdate: boolean;
    dispose(): void;
}

declare class THREE$Group extends THREE$Object3D {
    constructor(): void;
    isGroup: boolean;
}

declare class THREE$InstancedBufferGeometry extends THREE$BufferGeometry {
}

declare class THREE$Line extends THREE$Object3D {
    constructor(geometry: THREE$Geometry, material: THREE$LineBasicMaterial): void;
    geometry: THREE$Geometry;
    isLine: boolean;
    material: THREE$LineBasicMaterial;
}

declare class THREE$Line3 {
    constructor(start: THREE$Vector3, end: THREE$Vector3): void;
    closestPointToPoint(point: THREE$Vector3, clampToLine: boolean, target: THREE$Vector3): THREE$Vector3;
    closestPointToPointParameter(point: THREE$Vector3, clampToLine: boolean): float;
    distance(): float;
    distanceSq(): float;
}

declare class THREE$LineBasicMaterial extends THREE$Material {
    constructor({color?: THREE$Color | string | number, linewidth?: number}): void;
    linewidth: number;
}

declare class THREE$LineCurve3 extends THREE$Curve {
    constructor(v1: THREE$Vector3, v2: THREE$Vector3): void;
}

declare type THREE$MaterialParameters = {
    depthTest?: boolean;
    depthWrite?: boolean;
    opacity?: number;
    side?: integer;
    transparent?: boolean;
}

declare class THREE$Material {
    depthTest: boolean;
    depthWrite: boolean;
    isLineBasicMaterial: boolean | void;
    opacity: number;
    side: integer;
    transparent: boolean;
    userData: any;
    visible: boolean;
    color: THREE$Color;  /* really only subclass property -- THREE$LineBasicMaterial */
    dispose(): void;
}

declare class THREE$Matrix3 {
    constructor(): this;
    elements: Array<float>;
    getInverse(m: THREE$Matrix3): THREE$Matrix3; // FIXME: old interface, change to invert(): this
    multiply(m: THREE$Matrix3): this;
    set(n11: float, n12: float, n13: float,
        n21: float, n22: float, n23: float,
        n31: float, n32: float, n33: float): this;
    transpose(): this;
}

declare class THREE$Matrix4 {
    constructor(): this;
    elements: Array<float>;
    clone(): THREE$Matrix4;
    decompose(position: THREE$Vector3, quaternion: THREE$Quaternion, scale: THREE$Vector3): void;
    fromArray(array: Array<float>, offset?: integer): THREE$Matrix4;
    getInverse(m: THREE$Matrix4): THREE$Matrix4; // FIXME: old interface, change to invert(): this
    makeBasis(xAxis: THREE$Vector3, yAxis: THREE$Vector3, zAxis: THREE$Vector3): this;
    makeRotationX(theta: float): this;
    makeRotationY(theta: float): this;
    makeRotationZ(theta: float): this;
    makeScale(x: float, y: float, z: float): this;
    makeTranslation(x: float, y: float, z: float): this;
    multiply(m: THREE$Matrix4): this;
    set(n11: float, n12: float, n13: float, n14: float,
        n21: float, n22: float, n23: float, n24: float,
        n31: float, n32: float, n33: float, n34: float,
        n41: float, n42: float, n43: float, n44: float): this;
    setPosition(v: THREE$Vector3): this;
    toArray(array?: Array<float>, offset?: integer): Array<float>;
}

declare class THREE$Mesh extends THREE$Object3D {
    constructor(geometry: THREE$Geometry | THREE$BufferGeometry, material: THREE$Material): this;
    geometry: THREE$Geometry | THREE$BufferGeometry;
    isMesh: boolean;
   +material: THREE$Material;
}

declare type THREE$MeshBasicMaterialParameters = THREE$MaterialParameters & { color?: THREE$Color | string | number; }

declare class THREE$MeshBasicMaterial extends THREE$Material {
    constructor(parameters?: THREE$MeshBasicMaterialParameters): void;
}

declare type THREE$MeshPhongMaterialParameters = THREE$MaterialParameters & { color?: THREE$Color | string | number; }

declare class THREE$MeshPhongMaterial extends THREE$Material {
    constructor(parameters?: THREE$MeshPhongMaterialParameters): void;
}

declare class THREE$Object3D {
    static DefaultUp: THREE$Vector3;
    id: number;
    children: Array<THREE$Object3D>;
    matrix: THREE$Matrix4;
    name: string;
    parent: THREE$Object3D;
    position: THREE$Vector3;
    quaternion: THREE$Quaternion;
    scale: THREE$Vector3;
    type: string;
    up: THREE$Vector3;
    userData: { [key: string]: any };
    uuid: string;
    add(...Array<THREE$Object3D>): THREE$Object3D;
    applyMatrix4(matrix: THREE$Matrix4): void;
    lookAt(vector: THREE$Vector3): void;
    remove(...Array<THREE$Object3D>): THREE$Object3D;
    rotateOnAxis(axis: THREE$Vector3, angle: number): THREE$Object3D;
}

declare class THREE$ObjectLoader {
    parse(Object): THREE$Object3D;
}

declare class THREE$PerspectiveCamera extends THREE$Camera {
    constructor(fov?: number, aspect?: number, near?: number, far?: number): void;
    aspect: number;
    zoom: number;
    toJSON(): Object;
    updateProjectionMatrix(): void;
}

declare class THREE$Plane {
    constructor(): void;
    normal: THREE$Vector3;
    intersectLine(line: THREE$Line3, target: THREE$Vector3): THREE$Vector3;
    setFromCoplanarPoints(a: THREE$Vector3, b: THREE$Vector3, c: THREE$Vector3): THREE$Plane;
    setFromNormalAndCoplanarPoint(normal: THREE$Vector3, point: THREE$Vector3): THREE$Plane;
}

declare class THREE$QuadraticBezierCurve3 extends THREE$Curve {
    constructor(v0: THREE$Vector3, v1: THREE$Vector3, v2: THREE$Vector3): void;
}

declare class THREE$Quaternion {
    constructor(x: float, y: float, z: float, w: float): this;
}

declare class THREE$Ray {
    origin: THREE$Vector3;
    direction: THREE$Vector3;
}

declare class THREE$Raycaster {
    linePrecision: number;
    params: {Line: {threshold: number}};
    ray: THREE$Ray;
    intersectObjects(objects: Array<THREE$Object3D>, recursive: boolean): Array<THREE$Intersection>;
    setFromCamera(coords: THREE$Vector2, camera: THREE$Camera): void;
}

declare type THREE$Intersection = {distance: float, object: THREE$Object3D};

declare class THREE$Scene extends THREE$Object3D {
    constructor(): void;
    background: THREE$Color;
    fog: THREE$Fog;
}

declare class THREE$SphereGeometry extends THREE$Geometry {
    constructor(radius: number, widthSegments: number, heightSegments: number): void;
    parameters: {
        radius: float;
        widthSegments: number;
        heightSegments: number;
    };
}

declare class THREE$Sprite extends THREE$Object3D {
    constructor(material?: THREE$SpriteMaterial): void;
    center: THREE$Vector2;
    geometry: THREE$Geometry | THREE$BufferGeometry;
    material: THREE$SpriteMaterial;
}

declare class THREE$SpriteMaterial extends THREE$Material {
    constructor({map: THREE$Texture}): void;
    map: THREE$Texture;
}

declare class THREE$Texture {
    constructor(image: HTMLCanvasElement): void;
    needsUpdate: boolean;
    dispose(): void;
}

declare class THREE$Vector2 {
    constructor(x?: float, y?: float): this;
    height: float;
    width: float;
    x: float;
    y: float;
    applyMatrix3(m: THREE$Matrix3): this;
    clone(): THREE$Vector2;
    distanceTo(v: THREE$Vector2): float;
    length(): float;
    multiplyScalar(s: float): this;
    normalize(): this;
    set(x: float, y: float): this;
    sub(v: THREE$Vector2): this;
    toArray(array?: Array<float>, offset?: integer): Array<float>;
}

declare class THREE$Vector3 {
    constructor(x?: float, y?: float, z?: float): this;
    x: float;
    y: float;
    z: float;
    add(v: THREE$Vector3): this;
    addScaledVector(v: THREE$Vector3, s: float): this;
    addVectors(a: THREE$Vector3, b: THREE$Vector3): this;
    applyMatrix3(m: THREE$Matrix3): this;
    applyMatrix4(m: THREE$Matrix4): this;
    clone(): THREE$Vector3;
    copy(v: THREE$Vector3): this;
    cross(v: THREE$Vector3): this;
    crossVectors(a: THREE$Vector3, b: THREE$Vector3): this;
    distanceTo(v: THREE$Vector3): float;
    distanceToSquared(v: THREE$Vector3): float;
    dot(v: THREE$Vector3): float;
    getComponent(index: integer): float;
    length(): float;
    lengthSq(): float;
    multiplyScalar(s: float): this;
    normalize(): this;
    project(camera: THREE$Camera): this;
    projectOnVector(v: THREE$Vector3): this;
    set(x: float, y: float, z: float): this;
    sub(v: THREE$Vector3): this;
    toArray(array?: Array<float>, offset?: integer): Array<float>;
}

declare class THREE$WebGLRenderer {
    constructor({
        preserveDrawingBuffer?: boolean,
        antialias?: boolean,
        canvas?: HTMLCanvasElement,
    }): void;
    domElement: HTMLCanvasElement;
    getClearColor(): THREE$Color;
    getContext(): WebGLRenderingContext;
    getSize(target: THREE$Vector2): THREE$Vector2;
    render(scene: THREE$Scene, camera: THREE$Camera): void;
    setClearColor(color: THREE$Color | string | number, alpha: float): void;
    setSize(width: float, height: float): void;
}

declare module 'https://cdn.jsdelivr.net/npm/three@0.116.1/build/three.module.js' {
    declare export var DoubleSide: integer
    declare export var FrontSide: integer

    declare export class ArrowHelper extends THREE$ArrowHelper {}
    declare export class BoxGeometry extends THREE$BoxGeometry {}
    declare export class BufferGeometry extends THREE$BufferGeometry {}
    declare export class Camera extends THREE$Camera {}
    declare export class CanvasTexture extends THREE$CanvasTexture {}
    declare export class Color extends THREE$Color {}
    declare export class Curve extends THREE$Curve {}
    declare export class DirectionalLight extends THREE$DirectionalLight {}
    declare export class Fog extends THREE$Fog {}
    declare export class Geometry extends THREE$Geometry {}
    declare export class Group extends THREE$Group {}
    declare export class InstancedBufferGeometry extends THREE$InstancedBufferGeometry {}
    declare export class Line extends THREE$Line {}
    declare export class Line3 extends THREE$Line3 {}
    declare export class LineBasicMaterial extends THREE$LineBasicMaterial {}
    declare export class LineCurve3 extends THREE$LineCurve3 {}
    declare export class Material extends THREE$Material {}
    declare export class Matrix3 extends THREE$Matrix3 {}
    declare export class Matrix4 extends THREE$Matrix4 {}
    declare export class Mesh extends THREE$Mesh {}
    declare export class MeshBasicMaterial extends THREE$MeshBasicMaterial {}
    declare export class MeshPhongMaterial extends THREE$MeshPhongMaterial {}
    declare export class Object3D extends THREE$Object3D {}
    declare export class ObjectLoader extends THREE$ObjectLoader {}
    declare export class PerspectiveCamera extends THREE$PerspectiveCamera {}
    declare export class Plane extends THREE$Plane {}
    declare export class QuadraticBezierCurve3 extends THREE$QuadraticBezierCurve3 {}
    declare export class Quaternion extends THREE$Quaternion {}
    declare export class Ray extends THREE$Ray {}
    declare export class Raycaster extends THREE$Raycaster {}
    declare export class Scene extends THREE$Scene {}
    declare export class SphereGeometry extends THREE$SphereGeometry {}
    declare export class Sprite extends THREE$Sprite {}
    declare export class SpriteMaterial extends THREE$SpriteMaterial {}
    declare export class Texture extends THREE$Texture {}
    declare export class Vector2 extends THREE$Vector2 {}
    declare export class Vector3 extends THREE$Vector3 {}
    declare export class WebGLRenderer extends THREE$WebGLRenderer {}
}

// Trackball controls
declare export class THREE$TrackballControls {
    constructor(camera: THREE$Camera, domElement: HTMLElement): this;
    dynamicDampingFactor: float;
    update() : void;
}

declare module 'https://cdn.jsdelivr.net/npm/three@0.116.1/examples/jsm/controls/TrackballControls.js' {
    declare export class TrackballControls extends THREE$TrackballControls {}
}

// Thick line components
declare class THREE$LineMaterial extends THREE$Material {
    constructor(parameters: ?THREE$LineMaterialParameters): this;
    linewidth: float;
}

declare type THREE$LineMaterialParameters = {
    color?: THREE$Color | string | number;
    linewidth?: float;
    resolution?: THREE$Vector2;
}

declare class THREE$LineGeometry extends THREE$InstancedBufferGeometry {
    setPositions(Array<float>): this;
}

declare class THREE$Line2 extends THREE$Mesh {
    constructor(geometry: THREE$LineGeometry, material: THREE$LineMaterial): this;
    material: THREE$LineMaterial;
}

declare module 'https://cdn.jsdelivr.net/npm/three@0.116.1/examples/jsm/lines/Line2.js' {
    declare export class Line2 extends THREE$Line2 {}
}

declare module 'https://cdn.jsdelivr.net/npm/three@0.116.1/examples/jsm/lines/LineMaterial.js' {
    declare export class LineMaterial extends THREE$LineMaterial {}
}

declare module 'https://cdn.jsdelivr.net/npm/three@0.116.1/examples/jsm/lines/LineGeometry.js' {
    declare export class LineGeometry extends THREE$LineGeometry {}
}

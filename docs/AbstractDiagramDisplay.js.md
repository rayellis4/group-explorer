// @flow

/*
 * Routines to draw 3D ball-and-stick diagrams using three.js
 */

// $FlowFixMe -- external module imports described in flow-typed directory
import {THREE, TrackballControls, Line2, LineMaterial, LineGeometry} from '../lib/externals.js';

/*::
export type LineType = THREE.Line | Line2;

type SphereData = {
   position: THREE.Vector3,
   color?: css_color,
} & Obj;

export type AbstractDiagramDisplayOptions = {
   container?: JQuery,
   width?: number,
   height?: number,
   line_width?: number,
};
*/

const DEFAULT_SPHERE_COLOR = '#8c8c8c';  // gray
const DEFAULT_LINE_COLOR = 'black';
const DEFAULT_LINE_WIDTH = 4;
const DEFAULT_CANVAS_HEIGHT = 50;
const DEFAULT_CANVAS_WIDTH = 50;
const DEFAULT_LIGHT_POSITIONS = [
    new THREE.Vector3(105, 0, 0),
    new THREE.Vector3(-35, -50, -87),
    new THREE.Vector3(-35, -50, 87),
    new THREE.Vector3(-35, 100, 0),
];
const ABSTRACT_DIAGRAM_DISPLAY_GROUP_NAMES = ['lights', 'spheres', 'lines', 'debug'];

export {DEFAULT_SPHERE_COLOR, DEFAULT_LINE_COLOR};

export class AbstractDiagramDisplay {
/*::
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    control: ?TrackballControls;

    _fog_level: float;  // in [0,1]

    sphere_facet_count: integer;
    sphere_base_radius: float;
    _sphere_scale_factor: float;

    _line_width: number;
*/
    /*
     * Create three.js objects to display data in container
     *
     * create a scene to hold all the elements such as lights and objects
     * create a camera, which defines the point of view
     * create a renderer, sets the size
     * add the output of the renderer to the container element
     */
    constructor (options /*: AbstractDiagramDisplayOptions */ = {}) {
        // Default constants

        // Camera
        this.camera = new THREE.PerspectiveCamera(45);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({preserveDrawingBuffer: true, antialias: true});
        if (options.container != undefined) {
            options.container.append(this.renderer.domElement);
        }

        this.size = (options.container != undefined)
           ? {w: options.container.offsetWidth, h: options.container.offsetHeight}
           : {w: options.width || DEFAULT_CANVAS_WIDTH, h: options.height || DEFAULT_CANVAS_HEIGHT};
       
        // Create new Scene
        this.scene = new THREE.Scene();
        ABSTRACT_DIAGRAM_DISPLAY_GROUP_NAMES.forEach( (name) => {
            const group = new THREE.Group();
            group.name = name;
            this.scene.add(group);
        } );

        // Scene objects
        this.scene.fog = new THREE.Fog();
        this.light_positions = DEFAULT_LIGHT_POSITIONS;

        this._line_width = options.line_width || DEFAULT_LINE_WIDTH
    }

    /* 
     * Attributes
     */
    get background () /*: css_color */ {
      return '#' + this.scene.background.getHexString()
    }

    set background (background_color /*: THREE.Color | number | string */) {
        const color = new THREE.Color(background_color)
        this.scene.background = color
        this.scene.fog.color.set(color);  // set Fog color to background
    }

    get canvas () /*: HTMLCanvasElement */ {
        return this.renderer.domElement;
    }

    get container () /*: HTMLElement */ {
        return ((this.renderer.domElement.parentElement /*: any */) /*: HTMLElement */);
    }

    set container (container /*: HTMLElement */) {
        container.append(this.renderer.domElement);
        this.resize();
    }

    enableTrackballControl (container /*: ?HTMLElement */) {
        if (container != undefined) {
            this.container = container;
        }

        if (this.container != undefined) {
            this.control = new TrackballControls(this.camera, this.container);
            this.control.dynamicDampingFactor = 1.0;
            this.render()
        }
    }

    get fog_level () {
        if (this._fog_level == undefined) {
            this._fog_level = 0;
        };
        return this._fog_level;
    }

    // reduce fog level by increasing 'far' parameter (experimentally determined coefficients :-)
    //   (fogLevel is in [0,1])
    set fog_level (fog_level /*: float */) {
        this._fog_level = fog_level;

        const sceneRadius = Math.sqrt(Math.max(1, ...this.spheres.map( (sphere) => sphere.position.lengthSq() )));
        const cameraDistance = this.camera.position.length();
        this.scene.fog.near = cameraDistance - sceneRadius - 1;
        this.scene.fog.far = (fog_level == 0) ? 100 : (cameraDistance + sceneRadius*(5 - 4 * fog_level));
    }

    get lights () {
        return this.getGroup('lights').children
    }

    get light_positions () {
        const positions = this.lights.map/*:: <THREE.Vector3> */( (light) => light.position );
        return positions;
    }

    set light_positions (locations /*: Array<THREE.Vector3> */) {
        const lights = this.getGroup('lights');
        lights.remove(...lights.children);
        locations.forEach( (location) => {
            const light = new THREE.DirectionalLight(0xffffff, 0.3)
            light.position.copy(location);
            lights.add(light);
        } )
        lights.add(new THREE.AmbientLight(0xffffff, 3.5))
    }

    get size () /*: {w: number, h: number} */ {
        const size = this.renderer.getSize(new THREE.Vector2());
        return {w: size.x, h: size.y};
    }

    set size ({w, h} /*: {w: number, h: number} */) {
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
    }

    // legacy interface, for compatibility with Sheets
    getSize() /*: {w: number, h: number} */ {
        return this.size;
    }

    setSize(width /*: number */, height /*: number */) {
        this.size = {w: width, h: height};
    }

    get sphere_facet_count () {
        const scene_diameter = Math.sqrt(this.size.w * this.size.w + this.size.h * this.size.h)
        return (scene_diameter < 300) ? 10 : 20
    }

    /*
     * Methods
     */
    clear () {
        this.fog_level = 0;
        this.zoom_level = 1;
        this.deleteAllObjects();
    }

    getGroup (name /*: string */) /*: THREE.Group */ {
        return ((this.scene.children.find( (el) => el.name == name ) /*: any */) /*: THREE.Group */);
    }

    deleteAllObjects () {
        this.deleteAllSpheres();
        this.deleteAllLines();
    }

    getImage () /*: Image */ {
        this.renderer.render(this.scene, this.camera);
        const image = new Image();
        image.src = this.renderer.domElement.toDataURL();
        return image;
    }

    // Render graphics, recursing to animate
    render () {
        if (this.renderer == null) {
            return
        }

        this.renderer.render(this.scene, this.camera);
        const trackballControl = this.control;
        if (trackballControl != undefined) {
            trackballControl.update();
            window.requestAnimationFrame( () => this.render() );
        }
    }

    // Resize the 3D scene from the freshly re-sized graphic
    resize () {
        if (this.container != undefined) {
            const { width, height } = this.container.getBoundingClientRect()
            this.size = { w: width, h: height }
        }
    }
    
    ////////////////////////////   Camera   /////////////////////////////////////////

    setCameraPosition (position /*: THREE.Vector3 */, up /*: THREE.Vector3 */) {
        this.camera.position.copy(position)
        this.camera.up.copy(up)
        this.camera.lookAt(new THREE.Vector3())
    }

    get zoom_level () {
        return this.camera.zoom;
    }

    set zoom_level (zoom_level /*: float */) {
        this.camera.zoom = zoom_level;
        this.camera.updateProjectionMatrix();
    }

    // snap camera position to nearest display axis
    snapToAxis () {
        // find index of array element with max absolute value
        function indexOfMax (arr) {
           const [_maxValue, indexOfMax] = arr.reduce(([val, inx], currVal, currInx) => {
              return (Math.abs(currVal) > Math.abs(val)) ? [currVal, currInx] : [val, inx]
           }, [0, -1])
           return indexOfMax
        }
  
         // find axis that is most nearly aligned with camera position and rotate position to that axis
        const position = this.camera.position.clone().normalize()
        const positionAxis = indexOfMax(position.toArray())
        const q1 = new THREE.Quaternion()
           .setFromUnitVectors(
              position,
              new THREE.Vector3().setComponent(positionAxis, Math.sign(position.getComponent(positionAxis))))
  
        // rotate 'up' into the axis most nearly aligned with the 'up' direction
        const up = this.camera.up.applyQuaternion(q1).clone().normalize()
        const upAxis = indexOfMax(up.clone().setComponent(positionAxis, 0).toArray())
        const q2 = new THREE.Quaternion()
           .setFromUnitVectors(
              up,
              new THREE.Vector3().setComponent(upAxis, Math.sign(up.getComponent(upAxis))))
  
        // apply rotations to camera position, up direction
        this.camera.position.applyQuaternion(q1)
        this.camera.up.applyQuaternion(q2)  // already applied q1
        this.camera.updateProjectionMatrix()
    }

    // draw / remove thin {R,G,B} lines on {X,Y,Z} axes
    toggleCoordinateAxisDisplay () {
        if (this.getGroup('debug').children.length == 0) {
            this.drawCoordinateAxes()
        } else {
            this.removeCoordinateAxes()
        }
    }

    drawCoordinateAxes () {
        const coordinateAxes  = [
            {color: 0xff0000, points: [new THREE.Vector3(), new THREE.Vector3(5,0,0)]},
            {color: 0x00ff00, points: [new THREE.Vector3(), new THREE.Vector3(0,5,0)]},
            {color: 0x0000ff, points: [new THREE.Vector3(), new THREE.Vector3(0,0,5)]},
        ]
        coordinateAxes.forEach((axis) => {
            const lineMaterial = new THREE.LineBasicMaterial({color: axis.color})
            const geometry = new THREE.BufferGeometry().setFromPoints(axis.points)
            const line = new THREE.Line(geometry, lineMaterial)
            this.getGroup('debug').add(line)
        })
    }

    removeCoordinateAxes () {
        const coordinateLines = this.getGroup('debug').children
        coordinateLines.forEach((line) => {
            line.geometry.dispose()
            line.material.dispose()
        })
        this.getGroup('debug').remove(...coordinateLines)
    }

    ////////////////////////////   Sphere routines   ////////////////////////////////

    get spheres () {
        return this.getGroup('spheres').children
    }

    get sphere_scale_factor () /*: float */ {
        if (this._sphere_scale_factor == undefined) {
            this._sphere_scale_factor = 1;
        }

        return this._sphere_scale_factor;
    }

    set sphere_scale_factor (new_scale_factor /*: float */) {
        if (this.sphere_scale_factor != new_scale_factor) {
            this._sphere_scale_factor = new_scale_factor;
            const sphere_radius = this.sphere_radius;
            this.spheres.forEach( (sphere) => sphere.scale.set(sphere_radius, sphere_radius, sphere_radius) );
        }
    }

    get sphere_radius () /*: float */ {
        return this.sphere_base_radius * this.sphere_scale_factor;
    }
    
    // Create a sphere for each node, add to scene in THREE.Group named "spheres"
    createSpheres (sphere_data /*: Array<SphereData> */) {
        const geometry = new THREE.SphereGeometry(1.0, this.sphere_facet_count, this.sphere_facet_count);
        sphere_data.forEach( (sphere_datum) => {
            sphere_datum.color = (sphere_datum.color == undefined) ? DEFAULT_SPHERE_COLOR : sphere_datum.color;
            const material = new THREE.MeshPhongMaterial({
               shininess: 40,
               specular: 0xdddddd,
            });
            material.color.set(sphere_datum.color);
            const sphere = new THREE.Mesh(geometry, material);
            sphere.userData = {node: sphere_datum};
            sphere.scale.set(this.sphere_radius, this.sphere_radius, this.sphere_radius);
            sphere.position.copy(sphere_datum.position);
            this.getGroup('spheres').add(sphere);
        } );
    }
    
    deleteAllSpheres () {
        const sphere_group = this.getGroup('spheres');
        const spheres = ((sphere_group.children /*: any */) /*: Array<THREE.Mesh> */);
        spheres.forEach( (sphere) => sphere.geometry.dispose() );
        sphere_group.remove(...spheres);
    }
    
    ////////////////////////////   Line routines   ////////////////////////////////

    get lines () {
        return this.getGroup('lines').children
    }

    // line_width is pixels wide on 1000 pixel screen
    get line_width () /*: float */ {
        return this._line_width
    }
    
    set line_width (line_width /*: float */) {
        if (this.line_width != line_width) {
            this._line_width = line_width || DEFAULT_LINE_WIDTH
            this.lines.forEach((line) => {
                line.material.linewidth = this.scaledLinewidth,
                line.material.resolution.set(this.size.w, this.size.h)
            })
        }
    }

    // line width used in line material, scales with screen size and number of nodes
    get scaledLinewidth () {
        return Math.max(1, this.line_width 
           * 0.00025 * Math.min(this.size.w, this.size.h)
           * (7 - Math.log(this.getGroup('spheres').children.length)))
    }

    // Create a line from an array of vertices
    createLine (vertices /*: Array<THREE.Vector3> */) /*: LineType */ {
        const geometry = new LineGeometry();
        geometry.setPositions( vertices.reduce(
            (positions, vertex) => (positions.push(vertex.x, vertex.y, vertex.z), positions),
            [] ) );

        const material = new LineMaterial( {
            linewidth: this.scaledLinewidth,
            resolution: new THREE.Vector2(this.size.w, this.size.h),
            fog: true
        } );
            
        const new_line = new Line2( geometry, material );
        return new_line;
    }

    deleteAllLines () {
        this.deleteLines(this.lines)
    }

    deleteLines (lines /*: Array<LineType> */) {
        // dispose of all geometries, materials;
        lines.forEach( (line) => {
            line.geometry.dispose();
            line.material.dispose();  // FIXME: should we do this for fat lines?
        } );
        this.getGroup('lines').remove(...lines);
    }

    rescaleLines () {
        this.lines.forEach((line) => {
            line.material.linewidth = this.scaledLinewidth
            line.material.resolution.set(this.size.w, this.size.h)  // redraw thick lines to scale
        })
    }
}

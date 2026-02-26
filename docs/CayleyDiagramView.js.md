/* @flow

# CayleyDiagramView

This component draws a 3D Cayley diagram with [three.js](http://threejs.org) using many of the
capabilities inherited from [AbstractDiagramDisplay](./AbstractDiagramDisplay.js.md) and shared with
[SymmetryObjectView](./SymmetryObjectView.js.md).

It is the 'view' part of the general model ([Group](./Group.js.md)) - view - controller
([CayleyDisplay](./CayleyDisplay.js.md), [HighlightControl](./HighlightControl.js.md),
[CayleyViewControl](./CayleyViewControl.js.md),
[CayleyDiagramControl](./CayleyDiagramControl.js.md)) structure of the
[CayleyDiagram](./CayleyDiagram.html.md) page.

It is used to draw the main Cayley diagrams in the [CayleyDiagram](./CayleyDiagram.html.md) page, as
well as thumbnails in the main [GroupExplorer](./GroupExplorer.html.md) and
[GroupInfo](./GroupInfo.html.md) pages.

Here is an overview of the data structure created within the
[THREE.js scene](https://threejs.org/docs/?q=Scene#api/en/scenes/Scene) by CayleyDiagramView, and its
relationship to the Cayley diagram created by [CayleyDiagramGenerator.js](./CayleyDiagramGenerator.js.md):

   <image src="../images/sceneDataStructure.png" style="display: block; margin: 0 auto"></img>
   <center><b>Overview of the scene data structure</b></center><br>

```javascript
 */
import {AbstractDiagramDisplay} from './AbstractDiagramDisplay.js'
import {DEFAULT_SPHERE_COLOR as DEFAULT_NODE_COLOR} from './AbstractDiagramDisplay.js'
import * as GEUtils from './GEUtils.js'
import {THREE} from '../lib/externals.js'

export {DEFAULT_SPHERE_COLOR as DEFAULT_NODE_COLOR} from './AbstractDiagramDisplay.js'

/*::
import {Group} from './Group.js';
import type {Tree} from './GEUtils.js';
import {VizDisplay} from './SheetModel.js';
import type {VisualizerElementJSON} from './SheetModel.js';
import type {XMLCayleyDiagram} from './XMLGroup.js';

import type {Layout, Direction, StrategyParameters} from './CayleyDiagramGenerator.js';
export type {Layout, Direction, StrategyParameters} from './CayleyDiagramGenerator.js';

import type {LineType, AbstractDiagramDisplayOptions} from './AbstractDiagramDisplay.js';
export type {LineType} from './AbstractDiagramDisplay.js';

export type NodeData = {
    position: THREE.Vector3,
    element: groupElement,
    label: html,
    centers: Array<THREE.Vector3>,
    chunk?: ChunkData,
} & Obj;

export type SphereUserData = {
    node: NodeData,
    ring_highlight?: THREE.Sprite,
    square_highlight?: THREE.Sprite,
    label?: THREE.Sprite,
};

export type ArrowData = {
   start_node: NodeData,
   end_node: NodeData,
   generator: groupElement,
   bidirectional: boolean,
   thirdPoint: THREE.Vector3,
   keepCurved: boolean,  // true => use specified offset
   offset?: float,  // undefined => straight line
   color: css_color,
} & Obj;

export type LineUserData = {
   arrow: ArrowData,
   arrowhead?: THREE.ArrowHelper,
};

export type ChunkData = {
   name: html,
   o: THREE.Vector3,
   x: THREE.Vector3,
   y: THREE.Vector3,
   z: THREE.Vector3,
   xWidth: float,
   yWidth: float,
   zWidth: float,
};

export interface CayleyDiagramGenerator {
   +generatesFromStrategy: boolean;
    nodes: Array<NodeData>;
    arrows: Array<ArrowData>;
    createArrows(generator: Array<groupElement>, right_multiply: boolean): Array<ArrowData>;
};

type NodeDataJSON = {
    position: {x: float, y: float, z: float},
    element: groupElement,
    label: html,
};

type ArrowDataJSON = {
    start_element: groupElement,
    end_element: groupElement,
    generator: groupElement,
    thirdPoint: {x: float, y: float, z: float},
    offset: ?float,
    color: css_color,
};

export type CayleyDiagramJSON = {
    background: css_color,
    cameraJSON: Obj,
    cameraUp: {x: float, y: float, z: float},
    fog_level: float,
    line_width: number,
    sphere_base_radius: float,
    sphere_scale_factor: float,
    zoom_level: number,

    arrowhead_placement: float,
    label_scale_factor: float,

    groupURL: string,
    right_multiply: boolean,
    arrows: Array<ArrowDataJSON>,
    nodes: Array<NodeDataJSON>,
    chunk?: integer,
    diagram_name?: string,
    strategy_parameters?: Array<StrategyParameters>,
    color_highlights?: Array<css_color>,
    ring_highlights?: Array<?css_color>,
    square_highlights?: Array<?css_color>,
};

export type CayleyDiagramViewOptions = {
    group?: Group,
    diagramName?: string,
} & AbstractDiagramDisplayOptions;
*/

const CAYLEY_DIAGRAM_BACKGROUND_COLOR = '#E8C8C8';
const CAYLEY_DIAGRAM_DISPLAY_GROUP_NAMES = ['labels', 'arrowheads', 'highlights', 'chunks', 'debug'];

const HIGHLIGHT_NODE = 0
const HIGHLIGHT_RING = 1
const HIGHLIGHT_SQUARE = 2
const highlightNames = {
   HIGHLIGHT_NODE: 'node color',
   HIGHLIGHT_RING: 'a ring around the node',
   HIGHLIGHT_SQUARE: 'a square around the node'
}
export class CayleyDiagramView extends AbstractDiagramDisplay {
/*::
    display_labels: boolean;
    _label_scale_factor: float;
    _arrowhead_placement: float;

    _group: Group;
    generator: CayleyDiagramGenerator;
    _right_multiply: boolean;
    color_highlights: Array<css_color> | void;
    ring_highlights: Array<?css_color> | void;
    square_highlights: Array<?css_color> | void;
*/
    cayleyDiagramGenerator /*: CayleyDiagramGenerator */

    constructor (options /*: CayleyDiagramViewOptions */ = {}) {
       super(options);

       // display labels?
       this.display_labels = options.display_labels

        // Add new Groups to Scene
        CAYLEY_DIAGRAM_DISPLAY_GROUP_NAMES.forEach( (name) => {
            const group = new THREE.Group();
            group.name = name;
            this.scene.add(group);
        } );

        // Set background
       this.background = CAYLEY_DIAGRAM_BACKGROUND_COLOR;
    }

    // get objects at point x,y using raycasting
    getObjectsAtPoint (x /*: number */, y /*: number */) /*: Array<THREE.Object3D> */ {
        const point = new THREE.Vector2(x, y);
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(point, this.camera);

        const spheres = this.nodes;
        let intersects = raycaster.intersectObjects(spheres, false);
        if (intersects.length == 0) {
            const chunks = this.chunks;
            intersects = raycaster.intersectObjects(chunks, false);
        }

        return intersects.map( (intersect) => intersect.object );
    }

   drawFromModel ({position, up}, nodes, arrows) {
        this.setCameraPosition(position, up)
        this.deleteAllObjects();
        this.createSpheres(nodes);
        this.drawAllHighlights();
        if (this.display_labels) {
            this.createLabels();
        }
        this.createLines(arrows);
    }

    deleteAllObjects () {
        this.deleteAllChunks();
        super.deleteAllObjects();
    }

   toJSON () /*: any */ {
      return this.cayleyDiagramGenerator.toJSON()
   }

    ////////////////////////////   Sphere routines   ////////////////////////////////

    get sphere_scale_factor () {
        return super.sphere_scale_factor;
    }

    set sphere_scale_factor (new_scale_factor /*: float */) {
        const old_sphere_radius = this.sphere_base_radius * this.sphere_scale_factor;
        super.sphere_scale_factor = new_scale_factor;
        const new_sphere_radius = this.sphere_base_radius * this.sphere_scale_factor;

        this.updateHighlightRadius();
        this.redrawAllLines();
        this.updateLabelRadius(old_sphere_radius, new_sphere_radius);
    }

    createSpheres (sphere_data /*: Array<NodeData> */) {
        // sorting sphere data ensures that nodes are indexed by element number:
        //   this.nodes[element].userData.node.element == element
        const sortedSphereData = [...sphere_data].sort((a, b) => a.element - b.element)
        super.createSpheres(sortedSphereData)
        this.nodes.forEach(
            (sphere) => sphere.name = ((sphere.userData /*: any */) /*: SphereUserData */).node.label );
    }

    moveSphere (sphere /*: THREE.Mesh */, position /*: THREE.Vector3*/, moveContainingChunk = true /*: boolean */) {
        // update sphere position in scene and userData, as well as associated node, highlight and label positions
        sphere.position.copy(position);
        const userData = ((sphere.userData /*: any */) /*: SphereUserData */);
        const node = userData.node;
        node.position.copy(position);
        if (userData.ring_highlight != undefined) {
            userData.ring_highlight.position.copy(position);
        }
        if (userData.square_highlight != undefined) {
            userData.square_highlight.position.copy(position);
        }
        if (userData.label != undefined) {
            userData.label.position.copy(position);
        }

        // redraw connected lines (lines with this node as start or end)
        const affected_lines = ((this.arrows /*: any */) /*: Array<LineType> */).reduce(
            (affected_lines, line) => {
                const arrow = ((line.userData /*: any */) /*: LineUserData */).arrow;
                if (arrow.start_node == node || arrow.end_node == node)
                    affected_lines.push(line);
                return affected_lines;
            }, [] );
        this.redrawLines(affected_lines);

        // if there's a containing chunk then move it too
        if (moveContainingChunk) {
            const chunk = this.chunks
                .find((chunk) => chunk.userData.nodes.includes(sphere.userData.node))
            if (chunk != null) {
                const centroid = chunk.userData.nodes
                    .reduce((centroid, node) => centroid.add(node.position), new THREE.Vector3())
                    .multiplyScalar(1/chunk.userData.nodes.length)
                chunk.position.copy(centroid)
            }
        }
    }

    unitSquarePosition (element /*: groupElement */) /* {x: float, y: float} */ {
        const point = this.nodes[element].position.clone().project(this.camera)
        return {x: point.x/2 + 1/2, y: -point.y/2 + 1/2};
    }

    unitSquarePositions () /* Array<THREE.Vector2> */ {
        const points = this.group.elements.map/*:: <THREE.Vector2> */( (element) => {
            const point = this.nodes[element].position.clone().project(this.camera);
            return new THREE.Vector2(point.x/2 + 1/2, -point.y/2 + 1/2);
        } );
        return points;
    }

    deleteAllSpheres () {
        this.deleteAllHighlights();
        this.deleteAllLabels();
        super.deleteAllSpheres();
    }

    ////////////////////////////   Highlight routines   ///////////////////////////

    drawAllHighlights () {
        this.getAllHighlighters().forEach((highlighter) => highlighter())
    }

    getAllHighlighters() {
        const highlighters = Object.entries(highlightNames)
            .map(([typeString, name]) => {
                const type = eval(typeString)
                const highlighter = (type == 0)
                    ? (elementColors) => this.drawColorHighlights(elementColors)
                    : (type == 1)
                        ? (elementColors) => this.drawShapedHighlights('ring', elementColors)
                        : (elementColors) => this.drawShapedHighlights('square', elementColors)
                highlighter.label = name
                return highlighter
            })
        return highlighters
    }

    get backgroundHighlights () {
        return this.color_highlights?.map((color) => (color == DEFAULT_NODE_COLOR) ? null : color) || []
    }

    drawColorHighlights (elements /*: ?Array<groupElement> */) {
        this.color_highlights = (elements == null)
            ? this.color_highlights
            : this.group.elements.map((element) => elements?.[element])

        if (this.color_highlights != undefined) {
            const spheres = this.nodes
            spheres.forEach((sphere, inx) => sphere.material.color.set(this.color_highlights[inx] || DEFAULT_NODE_COLOR))
        }
    }

    drawShapedHighlights (shape /*: 'ring' | 'square' */, elements /*: ?Array<groupElement> */) {
        if (shape == 'ring') {
            this.ring_highlights = elements || this.ring_highlights
        } else {
            this.square_highlights = elements || this.square_highlights
        }

        this.deleteHighlights(shape);
        const highlights = (shape == 'ring') ? this.ring_highlights : this.square_highlights;
        if (highlights != undefined) {
            const spheres = this.nodes
            highlights.forEach( (color, element) => {
                if (color != undefined) {
                    this.drawHighlight(spheres[element], shape, color);
                }
            } )
        }
    }

    drawHighlight (sphere /*: THREE.Mesh */, shape /*: 'ring' | 'square' */, highlight_color /*: css_color */) {
        const scale = (shape == 'ring' ? 2.5 : 2.65) * this.sphere_radius;  // must clear underlying sphere
        const line_width = (shape == 'ring' ? 0.66 : 1.2) / scale;  // scales to webGl lineWidth = 10

        const node = ((sphere.userData /*: any */) /*: SphereUserData */).node;

        // create new canvas with enough pixels to get smooth figure
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 128;

        // get context, draw figure
        const context = canvas.getContext('2d');
        context.lineWidth = line_width;
        context.strokeStyle = highlight_color;
        context.beginPath();
        if (shape == 'ring') {
            context.arc(canvas.width/2, canvas.height/2, canvas.width/2-6, 0, 2*Math.PI);
        } else {
            context.rect(0, 0, canvas.width, canvas.height);
        }
        context.stroke();

        // create texture, material, sprite
        const material = new THREE.SpriteMaterial({map: new THREE.CanvasTexture(canvas)});
        const highlight = new THREE.Sprite(material);

        // scale, position middle of highlight
        highlight.name = shape == 'ring' ? 'ring' : 'square';
        highlight.scale.set(scale, scale, 1);
        highlight.center = new THREE.Vector2(0.5, 0.5);
        highlight.position.copy(node.position);
        if (shape == 'ring') {
            ((sphere.userData /*: any */) /*: SphereUserData */).ring_highlight = highlight
        } else if (shape == 'square') {
            ((sphere.userData /*: any */) /*: SphereUserData */).square_highlight = highlight;
        }
        this.getGroup('highlights').add(highlight);
    }

    updateHighlightRadius () {
        const sphere_radius = this.sphere_radius;
        this.getGroup('highlights').children.forEach( (highlight) => {
            const scale = (highlight.name == 'ring') ? 2.5*sphere_radius : 2.65*sphere_radius;
            highlight.scale.set(scale, scale, 1);
        } )
    }

    clearHighlightDefinitions () {
        this.color_highlights = this.ring_highlights = this.square_highlights = undefined;
    }

    get highlightColors () {
        return [
            this.color_highlights || [],
            this.ring_highlights || [],
            this.square_highlights || []
        ]
    }

    set highlightColors (highlightColors) {
        this.clearHighlights()
        if (highlightColors != null) {
            for (const [inx, highlighter] of this.getAllHighlighters().entries()) {
                highlighter(highlightColors[inx])
            }
        }
    }

    clearHighlights () {
        this.clearHighlightDefinitions();
        this.deleteAllHighlights();
    }

    deleteAllHighlights () {
        this.deleteHighlights();
    }

    deleteHighlights (type /*: ?('ring' | 'square' | 'color') */) {
        if (type == undefined || type == 'color') {
            const spheres = ((this.nodes /*: any */) /*: Array<THREE.Mesh> */);
            spheres.forEach( (sphere, inx) => sphere.material.color.set(DEFAULT_NODE_COLOR) );
        }

        if (type != 'color') {
            const highlight_group = this.getGroup('highlights');
            let highlights = ((highlight_group.children /*: any */) /*: Array<THREE.Sprite> */);
            if (type != undefined) {
                highlights = highlights.filter( (sprite) => sprite.name == type );
            }
            highlights.forEach( (sprite) => {
                sprite.geometry.dispose();
                sprite.material.map.dispose();
                sprite.material.dispose();
            } );
            highlight_group.remove(...highlights);

            // remove sphere-highlight links
            const spheres = ((this.nodes /*: any */) /*: Array<THREE.Mesh> */);
            spheres.forEach( (sphere) => {
                const userData = ((sphere.userData /*: any */) /*: SphereUserData */);
                if (type == undefined || type == 'ring') {
                    delete userData.ring_highlight;
                }
                if (type == undefined || type == 'square') {
                    delete userData.square_highlight;
                }
            } )
        }
    }

    ////////////////////////////   Label routines   ///////////////////////////////

    get label_scale_factor () {
        if (this._label_scale_factor == undefined) {
            this._label_scale_factor = 1;
        }

        return this._label_scale_factor;
    }

    set label_scale_factor (label_scale_factor /*: float */) {
        const labels = ((this.getGroup('labels').children /*: any */) /*: Array<THREE.Sprite> */);
        if (label_scale_factor != this.label_scale_factor && labels.length != 0) {
            if (label_scale_factor == 0) {
                labels.forEach( (label) => label.material.visible = false );
            } else {
                const sphere_radius = this.sphere_base_radius * this.sphere_scale_factor;
                const old_label_scale_factor = labels[0].scale.x / (sphere_radius * 8.197 * 2);
                labels.forEach( (label) => {
                    label.material.visible = true;
                    label.scale.multiplyScalar(label_scale_factor / old_label_scale_factor);
                    label.center.set(-0.045/label_scale_factor, 0.30 - 0.72/label_scale_factor);
                } );
            }
        }

        this._label_scale_factor = label_scale_factor;
    }

    createLabels () {
        if (this.label_scale_factor == 0) {
            return;
        }

        const label_scale_factor = this.label_scale_factor;
        const label_group = this.getGroup('labels');
        const spheres = ((this.nodes /*: any */) /*: Array<THREE.Mesh> */);
        const radius = spheres[0].scale.x;
        const big_node_limit = 0.1, small_node_limit = 0.05;
        const {canvas_width, canvas_height, label_font} =
              (radius >= big_node_limit)   ? {canvas_width: 4096, canvas_height: 256, label_font: '120pt'} :
              (radius <= small_node_limit) ? {canvas_width: 1024, canvas_height: 64,  label_font: '32pt'} :
                                             {canvas_width: 2048, canvas_height: 128, label_font: '64pt'};
        const scale = label_scale_factor * radius * 8.197 * 2;  // factor to make label size ~ radius

        const scratchHTML = `<div id="scratch"
            style="position: fixed; width: ${canvas_width}px; height: ${canvas_height}px; top: ${-2 * canvas_height};
            font-size: ${parseInt(label_font)}pt"></div>`
        document.getElementById('graphic').insertAdjacentHTML('beforeend', scratchHTML)
        const scratch = document.getElementById('scratch')

        spheres.forEach( (sphere, inx) => {
            const node = ((sphere.userData /*: any */) /*: SphereUserData */).node;
            if (node.label === undefined || node.label == '') {
                return;
            };

            // make canvas big enough for any label and offset it to clear the node while still being close
            const canvas = document.createElement('canvas')
            canvas.setAttribute('id', `label_${node.element}`)
            canvas.setAttribute('width', canvas_width)
            canvas.setAttribute('height', canvas_height)
            const context = canvas.getContext('2d');

            // DEBUG:  paint label background
            // context.fillStyle = 'rgba(0, 0, 100, 0.5)';
            // context.fillRect(0, 0, canvas.width, canvas.height);

            scratch.innerHTML = node.label
            GEUtils.htmlToContext(scratch, context, new THREE.Vector2(canvas_width/2, canvas_height/2))

            const texture = new THREE.Texture(canvas);
            texture.needsUpdate = true;
            const label_material = new THREE.SpriteMaterial({ map: texture });
            const label = new THREE.Sprite( label_material );
            label.scale.set(scale, scale*canvas.height/canvas.width, 1.0);
            label.center = new THREE.Vector2(-0.045/label_scale_factor, 0.30 - 0.72/label_scale_factor);
            label.position.copy(node.position);

            sphere.userData.label = label;

            label_group.add(label);
        } )

        scratch.remove()
    }

    updateLabelRadius (old_sphere_radius /*: float */, new_sphere_radius /*: float */) {
        const labels = this.getGroup('labels').children;
        if (labels.length != 0) {
            const new_label_scale = labels[0].scale.multiplyScalar(new_sphere_radius / old_sphere_radius);
            labels.forEach( (label) => label.scale.copy(new_label_scale) );
        }
    }

    deleteAllLabels () {
        const label_group = this.getGroup('labels');
        const labels = ((label_group.children /*: any */) /*: Array<THREE.Sprite> */);
        labels.forEach( (label) => {
            label.geometry.dispose();
            label.material.map.dispose();
            label.material.dispose();
        } );
        label_group.remove(...labels);
    }

    ////////////////////////////   Line routines   ////////////////////////////////

    get arrowhead_placement () {
        if (this._arrowhead_placement == undefined) {
            this._arrowhead_placement = 1;
        }

        return this._arrowhead_placement;
    }

    set arrowhead_placement (arrowhead_placement /*: float */) {
        if (this.arrowhead_placement == arrowhead_placement) {
            return;
        }

        this._arrowhead_placement = arrowhead_placement;

        this.redrawAllLines();
    }

    // Create arrows between start and end nodes
    createLines (line_data /*: Array<ArrowData> */) {
        line_data.forEach( (line_datum) => {
            // Curve straight lines to avoid spheres
            if (line_datum.offset == undefined) {
                line_datum.offset = this.offsetAroundSpheres(line_datum);
            }

            if (line_datum.offset == undefined) {
                this.createStraightLine(line_datum);
            } else {
                this.createCurvedLine(line_datum);
            }
        } );
    }

    colorAllLines () {
        const lines = ((this.arrows /*: any */) /*: Array<LineType> */);
        lines.forEach( (line) => {
            const userData = ((line.userData /*: any */) /*: LineUserData */);
            const color = userData.arrow.color;
            line.material.color.set(color);
            const arrowhead = userData.arrowhead;
            if (arrowhead != undefined) {
                arrowhead.line.material.color.set(color);
                arrowhead.cone.material.color.set(color);
            }
        } );
    }

    createStraightLine (line_datum /*: ArrowData */) {
        const vertices = [line_datum.start_node.position, line_datum.end_node.position];
        const new_line = this.createLine(vertices);
        new_line.material.color.set(line_datum.color);
        ((new_line.userData /*: any */) /*: LineUserData */).arrow = line_datum;
        this.getGroup('lines').add(new_line);

        if (!line_datum.bidirectional) {
            const start = line_datum.start_node.position;
            const end = line_datum.end_node.position;
            const curve = new THREE.LineCurve3(start, end);
            const curve_length = start.distanceTo(end);
            const arrowhead = this.createArrowhead(line_datum, curve, curve_length);
            ((new_line.userData /*: any */) /*: LineUserData */).arrowhead = arrowhead;
        }
    }

    createCurvedLine (line_datum /*: ArrowData */) {
        const start = line_datum.start_node.position;
        const end = line_datum.end_node.position;
        const middle = start.clone().add(end).multiplyScalar(1/2);
        const middle2end = end.clone().sub(middle);
        const thirdPoint = line_datum.thirdPoint;
        const normal = new THREE.Plane().setFromCoplanarPoints(start, thirdPoint, end).normal;
        const offset = ((line_datum.offset /*: any */) /*: float */) * start.distanceTo(end);
        const middle_control =
              new THREE.Vector3().crossVectors(normal, middle2end).normalize().multiplyScalar(2*offset).add(middle);
        const curve = new THREE.QuadraticBezierCurve3(start, middle_control, end);
        const vertices = curve.getPoints(10);
        const new_line = this.createLine(vertices);
        new_line.material.color.set(line_datum.color);
        ((new_line.userData /*: any */) /*: LineUserData */).arrow = line_datum;
        this.getGroup('lines').add(new_line);

        if (!line_datum.bidirectional) {
            const curve_length = curve.getLength();
            const arrowhead = this.createArrowhead(line_datum, curve, curve_length);
            ((new_line.userData /*: any */) /*: LineUserData */).arrowhead = arrowhead;
        }
    }

    createArrowhead (line_datum /*: ArrowData */, curve /*: THREE.Curve */, curve_length /*: float */) /*: THREE.ArrowHelper */ {
        const sphere_radius = this.sphere_radius;
        const head_length = Math.min(sphere_radius, (curve_length/2 - sphere_radius));
        const head_width = 0.6 * head_length;
        const arrow_length = 1.1 * head_length;
        const arrowhead_placement = this.arrowhead_placement;

        const arrow_place = 0.001 +     // 0.001 offset to make arrowhead stop at node surface
              (sphere_radius - 0.1*head_length + (curve_length - 2*sphere_radius - head_length) * arrowhead_placement) / curve_length;
        const arrow_tip = curve.getPointAt(arrow_place + head_length/curve_length);
        const arrow_start = curve.getPointAt(arrow_place);
        const arrow_direction = arrow_tip.clone().sub(arrow_start).normalize();
        const arrow_color = line_datum.color;
        const arrowhead = new THREE.ArrowHelper(arrow_direction, arrow_start, arrow_length, arrow_color, head_length, head_width);

        arrowhead.line.material.opacity = 0;
        arrowhead.line.material.transparent = true;

        this.getGroup('arrowheads').add(arrowhead);

        return arrowhead;
    }

    /* DIY raycasting
     *   (there's probably a better way to do this, but THREE.Raycasting
     *    is slow and gives confusing results with multiple intersects)
     * For every node in scene (except the start and end nodes of the line),
     * see if the node lies on the line between the start and end nodes
     *   "on the line" <=> |(start-node)×(node-end)| ~ 0
     *   "between them" <=> (start-node)⋅(node-end) > 0
     * if so, calculate offset to miss node from node radius
     */
    offsetAroundSpheres (line_datum /*: ArrowData */) /*: ?float */ {
        const start_node = line_datum.start_node;
        const end_node = line_datum.end_node;
        const sphere = this.nodes.find( (sphere) => {
            const node = ((sphere.userData /*: any */) /*: SphereUserData */).node;
            if (node == start_node || node == end_node) {
                return false;
            }
            const v1 = start_node.position.clone().sub(node.position);
            const v2 = node.position.clone().sub(end_node.position);
            return v1.dot(v2) > 0 && new THREE.Vector3().crossVectors(v1, v2).lengthSq() < 1.0e-6;
        } );
        const offset = (sphere == undefined) ? undefined : 1.4 * sphere.scale.x;  // Heuristic value

        return offset;
    }

    redrawAllLines () {
        const lines = ((this.arrows /*: any */) /*: Array<LineType> */);
        this.redrawLines(lines);
    }

    redrawLines (lines /*: Array<LineType> */) {
        const saved_arrows = lines.map( (line) => ((line.userData /*: any */) /*: LineUserData */).arrow );
        this.deleteLines(lines);
        this.createLines(saved_arrows);
    }

    deleteLines (lines /*: Array<LineType> */) {
        // remove associated arrowheads
        const arrowhead_group = this.getGroup('arrowheads');
        lines.forEach( (line) => {
            const arrowhead = ((line.userData /*: any */) /*: LineUserData */).arrowhead;
            if (arrowhead != undefined) {
                arrowhead_group.remove(arrowhead);
            }
        } );
        super.deleteLines(lines);
    }

    ////////////////////////////   Chunking routines   ////////////////////////////

    get chunks () {
       return this.getGroup('chunks').children
    }

    createChunks (chunk_data /*: Array<ChunkData> */) {
        this.deleteAllChunks();

        const chunk_group = this.getGroup('chunks');
        const box_material = new THREE.MeshBasicMaterial( {
            color: '#303030',
            opacity: 0.2,
            transparent: true,
            side: THREE.FrontSide,
            depthWrite: false,  // needed to keep from obscuring labels underneath
            depthTest: false,
        } );

        let box_geometry;  // created first time through, reused by all chunks

        chunk_data.forEach( (chunk_datum, inx) => {
            const {box, widths} = chunk_datum

            // draw chunk geometry from shape and orientation of first chunk
            if (inx == 0) {
                const minScale = Math.min(...new THREE.Vector3().setFromMatrixScale(box).toArray())
                const sphereClearance = new THREE.Vector3().setScalar(2 * this.sphere_radius / minScale)
                box_geometry = new THREE.BoxGeometry(...sphereClearance.add(widths).multiplyScalar(1.15).toArray())
            }

            // create new box and transform to centroid of current node positions
            const new_chunk = new THREE.Mesh(box_geometry, box_material);
            const centroid = chunk_datum.nodes
               .reduce((centroid, node) => centroid.add(node.position), new THREE.Vector3())
               .multiplyScalar(1 / chunk_datum.nodes.length)
            box.setPosition(centroid)
            new_chunk.applyMatrix4(box);
            new_chunk.name = chunk_datum.name;
            new_chunk.userData = {name: chunk_datum.name, nodes: chunk_datum.nodes}

            chunk_group.add(new_chunk);
        } )
    }

    deleteAllChunks () {
        const chunk_group = this.getGroup('chunks');
        const chunks = ((chunk_group.children /*: any */) /*: Array<THREE.Mesh> */);
        chunks.forEach( (chunk) => chunk.geometry.dispose() );
        chunk_group.remove(...chunks);
    }

    moveChunkTo (chunk /*: THREE.Mesh */, position /*: THREE.Vector3 */) {
        const movement = position.clone().sub(chunk.position)
        chunk.position.copy(position)
        chunk.userData.nodes.forEach((node) => {
            const sphere = this.nodes[node.element]
            this.moveSphere(sphere, sphere.position.clone().add(movement), false)  // don't let moveSphere try to move chunk :-)
        })
    }

    /////////////////////   Cayley diagram routines   /////////////////////////////

    get arrows () {
       return this.getGroup('lines').children
    }

    get group () /*: Group */ {
        return this._group;
    }

    set group (group /*: Group */) {
        this.sphere_base_radius = 0.3 / Math.sqrt(group.order);
        if (this.group != group) {
            this.clearHighlightDefinitions();
        }
        this._group = group;
    }

    get nodes () {
       return this.getGroup('spheres').children
    }

    // in model and view
    addArrows (newArrows /*: Array<groupElement> */) {
        this.createLines(newArrows);
        this.colorAllLines();
    }

    // re-color all arrows
    reColorArrows () {
        const generator_color_map = new Map(this.generator.arrows.map( (arrow) => [arrow.generator, arrow.color] ))
        this.arrows.forEach((arrow) => arrow.color = generator_color_map.get(arrow.generator))
    }

    // Removes arrows generated by generator from model and view
    //   (undefined generator => remove all arrows)
    removeArrows (generators /*: ?Array<groupElement> */) {
        if (generators == undefined) {
            this.deleteAllLines()
        } else {
           const removedLines = this.arrows.filter((line) => generators.includes(line.userData.arrow.generator))
           this.deleteLines(removedLines)
        }
    }
}

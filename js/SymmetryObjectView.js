/*

# SymmetryObjectView

Draws a 3D symmetry object wity [three.js](http://threejs.org) using many of the capabilities
inherited from [AbstractDiagramDisplay](./AbstractDiagramDisplay.js.md) and shared with
[CayleyDiagramView](./CayleyDiagramView.js.md).

It is the 'view' part of the general model ([Group](./Group.js.md)) - view - controller
([SymmetryObjectControlDisplay](./SymmetryObjectControlDisplay.js.md)) structure of
the [SymmetryObject](./SymmetryObject.html.md) page.

It is used to draw the main object of symmetry diagrams in the
[SymmetryObject](./SymmetryObject.html.md) page, as well as thumbnails in the main
[GroupExplorer](./GroupExplorer.html.md) and [GroupInfo](./GroupInfo.html.md) pages.

```javascript
 */
import { AbstractDiagramDisplay, DEFAULT_SPHERE_COLOR, DEFAULT_LINE_COLOR as DEFAULT_PATH_COLOR } from './AbstractDiagramDisplay.js';
import * as Log from './Log.js';
import * as THREE from '../lib/externals.js';
const SYMMETRY_OBJECT_BACKGROUND_COLOR = '#C8E8C8';
export class SymmetryObjectViewModel {
    #model;
    #view;
    #modelFields = [
        'group',
        'layout',
        'background',
        'fog_level',
        'line_width',
        'sphere_scale_factor',
        'zoom_level',
        'showingAxes',
        'snap_to_axis_request'
    ];
    get group() {
        return this.model.group;
    }
    get view() {
        return this.#view;
    }
    get model() {
        return this.#model;
    }
    setModel(model) {
        this.#model = model;
        this.#modelFields.forEach((field) => model.$subscribe(this, field));
        if (this.view != null) {
            this.#modelFields.forEach((field) => this.update(field, this.#model[field]));
        }
    }
    setView(view) {
        this.#view = view;
        if (this.model != null) {
            this.#modelFields.forEach((field) => this.update(field, this.#model[field]));
        }
    }
    updateModel(field, value) {
        this.model[field] = value;
    }
    update(field, value) {
        if (this.view == null) {
            return;
        }
        switch (field) {
            case 'group':
            case 'background':
            case 'fog_level':
            case 'line_width':
            case 'sphere_scale_factor':
            case 'zoom_level':
                this.view[field] = value;
                break;
            case 'showingAxes': {
                const isShowing = this.view.getGroup('debug').children.length > 0;
                if (value && !isShowing)
                    this.view.drawCoordinateAxes();
                else if (!value && isShowing)
                    this.view.removeCoordinateAxes();
                break;
            }
            case 'layout': {
                if (value != null) {
                    this.view.deleteAllObjects();
                    const { pov, spheres, paths } = value;
                    this.view.setCameraPosition(pov.position, pov.up);
                    this.view.sphere_base_radius = spheres[0].radius;
                    this.view.createSpheres(spheres);
                    paths.forEach((path) => {
                        const newLine = this.view.createLine(path.vertices);
                        newLine.material.color.set(path.color);
                        this.view.getGroup('lines').add(newLine);
                    });
                }
                break;
            }
            case 'snap_to_axis_request':
                if (value == true) {
                    this.view.snapToAxis();
                    this.updateModel(field, false);
                }
                break;
            default:
                Log.info(`unsupported field ${field} in CayleyDiagramView.CayleyDiagramViewModel.updateView`);
        }
    }
    // Functions used by Thumbnail client (GroupTable, SubgroupInfo, ViewInfo)
    resize() { this.view.resize(); }
    showGraphic() { this.view.render(); }
    getImage() { return this.view.getImage(); }
    draw(group, diagramName) {
        const layout = layoutSymmetryObject(group, diagramName);
        this.update('background', SYMMETRY_OBJECT_BACKGROUND_COLOR);
        this.update('group', group); // from previous SymmetryObjectView.setObject
        this.update('sphere_scale_factor', 1);
        this.update('layout', layout);
    }
}
////////////////////////////   Factory Functions   ////////////////////////////////
// Factory for thumbnail generators (GroupTable, SubgroupInfo, ViewInfo).
// Returns a SymmetryObjectViewModel with no model
// call .draw(group, ?diagramName), and .getImage() to get the rendered result.
export function createSymmetryObjectThumbnailView(options = {}) {
    const viewModel = new SymmetryObjectViewModel();
    const view = new AbstractDiagramDisplay(options);
    viewModel.setView(view);
    return viewModel;
}
export function createSymmetryObjectView(model, options = {}) {
    const viewModel = new SymmetryObjectViewModel();
    const view = new AbstractDiagramDisplay(options);
    model.background = SYMMETRY_OBJECT_BACKGROUND_COLOR;
    // assemble parts
    viewModel.setModel(model);
    viewModel.setView(view);
    viewModel.view.enableTrackballControl();
    return viewModel;
}
export function layoutSymmetryObject(group, symmetryObjectName) {
    const symmetryObject = group.symmetryObjects.find((symmetryObject) => symmetryObject.name == symmetryObjectName);
    const spheres = symmetryObject.spheres.map((sphere) => {
        return {
            position: new THREE.Vector3(...sphere.point),
            radius: sphere.radius,
            color: sphere.color || DEFAULT_SPHERE_COLOR
        };
    });
    const pov = getPov(spheres.map((sphere) => sphere.position));
    const paths = symmetryObject.paths.map((path) => {
        return {
            vertices: path.points.map((point) => new THREE.Vector3(...point)),
            color: path.color || DEFAULT_PATH_COLOR
        };
    });
    return { pov: pov, spheres: spheres, paths: paths };
}
/*
 * Return default camera position and up direction for given node placement
 *
 * Camera positioned to match point of view in GE2 for user-specified (not generated) diagrams:
 *   If diagram lies entirely in the y-z plane (all x == 0)
 *     place camera on x-axis, y-axis up (z-axis to the left)
 *   If diagram lies entirely in the x-z plane (all y == 0)
 *     place camera on y-axis, z-axis down (x-axis to the right)
 *   If diagram lies entirely in the x-y plane (all z == 0)
 *     place camera on z-axis, y-axis up (x-axis to the right)
 *   Otherwise place camera with y-axis up, offset a bit from
 *     the (1,1,1) vector so that opposite corners don't line up
 *     and make cubes look flat; look at origin, and adjust camera
 *     distance so that diagram fills field of view
 */
function getPov(spherePositions) {
    let position, up;
    if (spherePositions.every((position) => position.x == 0.0)) {
        position = new THREE.Vector3(3, 0, 0);
        up = new THREE.Vector3(0, 1, 0);
    }
    else if (spherePositions.every((position) => position.y == 0.0)) {
        position = new THREE.Vector3(0, 3, 0);
        up = new THREE.Vector3(0, 0, -1);
    }
    else if (spherePositions.every((position) => position.z == 0.0)) {
        position = new THREE.Vector3(0, 0, 3);
        up = new THREE.Vector3(0, 1, 0);
    }
    else {
        position = new THREE.Vector3(1.7, 1.6, 1.9);
        up = new THREE.Vector3(0, 1, 0);
    }
    const radius = Math.sqrt(Math.max(1, ...spherePositions.map((position) => position.lengthSq())));
    position.multiplyScalar(radius);
    return { position: position, up: up };
}
//# sourceMappingURL=SymmetryObjectView.js.map
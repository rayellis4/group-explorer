/*

# CayleyDiagramViewUI component

The [Cayley diagram visualizer](../help/rf-um-cd-options/index.html) lets users customize the
appearance of a [Cayley diagram](../help/rf-groupterms/index.html#cayley-diagrams) by
 * [repositioning the
 nodes](../help/rf-um-cd-options/index.html#changing-the-positions-of-nodes-in-the-diagram)
 * [adjusting arcing of arrows in the
 diagram](../help/rf-um-cd-options/index.html#changing-the-arcing-of-arrows-in-the-diagram)
 * repositioning chunks of nodes.

This component adds the following UI gestures to a [CayleyDiagramView](./CayleyDiagramView.ts.md):
 *  display / clear label
    <br>&emsp;right click / long tap over node
    <br>&emsp;in ['showTooltipOrReset'](#showtooltiporreset)
 *  rotate, zoom, pan
    <br>&emsp;use [THREE.js TrackballControl](https://threejs.org/docs/?q=trackballcontr#TrackballControls)
 *  reset cameara position to remove `TrackballControl` rotation, zoom, pan effects
    <br>&emsp;right click / long tap on canvas (not over object)
    <br>&emsp;This does **not** reposition the nodes: it only changes the camera position
    <br>&emsp;in [`showTooltipOrReset`](#showtooltiporreset)
 *  move, re-shape node/arrow/chunk
    <br>&emsp;select drag-and-drop* deselect
    <br>&emsp;&emsp;select by clicking / tapping object; deselect by clicking again, anywhere on canvas
    <br>&emsp;&emsp;on touch devices this lets you remove your finger so you can confirm the selection
    <br>&emsp;drag-and-drop / touch-move-end touch
    <br>&emsp;&emsp;legacy desktop interface, ideal for systems with mouse or touchpad
    <br>&emsp;&emsp;works for touch systems, best if display is not too busy
    <br>&emsp;in [`moveObjects`](#moveobjects)

```javascript
 */
import { recognizeSelect, recognizeContextMenu, recognizeDragAndDrop } from './Gestures.js'
import { makeTooltip } from './UIComponents.js'
import * as THREE from '../lib/externals.js'

import type { CayleyDiagramView, SphereUserData, LineUserData, LineType } from './CayleyDiagramView.ts'
import type { CayleyDiagramModel, POV, ArrowType, LayoutType } from './CayleyDiagramModel.ts'
import type { SubscriptionProxy } from './GEUtils.ts'

const SELECTED_HIGHLIGHT_COLOR = 'white'
/*
```
### addGestures

This module sets up the required gestures for a Cayley diagram visualizer.

The only exported interface to this module<br>
Called by [CayleyDiagram.ts](./CayleyDiagram.ts.md)

```javascript
 */
export function addGestures (cayleyDiagramView: CayleyDiagramView) {
   showTooltipOrReset(cayleyDiagramView)
   cayleyDiagramView.enableTrackballControl()
   moveObjects(cayleyDiagramView)
}
/*
```
### showTooltipOrReset

Find  objects at right click / long tap location:
 * if over node, display tooltip for all nodes under the cursor
 * if not over node, reset camera pov to remove TrackballControl scene translation / rotation / zoom
 
N.B.: Resetting the camera pov does **not** reposition the nodes, it just changes the camera position

The value to which the camera pov is reset is kept in `rollbackPOV` and updated when the user updates
the diagram through the [diagram controller](./CayleyDiagramControl.ts.md):
the `CayleyDiagramControl.ViewModel.updateLayout` method touches the `diagramControl` field in the
[Cayley diagram model](./CayleyDiagramModel.ts.md) on completion, and this is tracked by subscribing
to the `CayleyDiagrmModel` [`SubscriptionProxy`](./GEUtils.ts.md#createmodelproxy).

```javascript
 */
function showTooltipOrReset (cayleyDiagramView: CayleyDiagramView) {
   // value to reset the layout pov to, updated on diagramControl update in CayleyDiagramModel
   let rollbackPOV: Maybe<POV> = null
   const rollbackUpdater = {
      update: (field: string, _value: unknown) => {
         if (field === 'diagramControl')
            rollbackPOV = cayleyDiagramView.viewModel.model.layout?.pov
      }
   }
   rollbackUpdater.update('diagramControl', null)  // initialize rollbackPOV
   ;(cayleyDiagramView.viewModel.model as SubscriptionProxy<CayleyDiagramModel>)
      .$subscribe(rollbackUpdater, 'diagramControl')
   
   recognizeContextMenu(cayleyDiagramView.container, (event) => {
      const saveRollbackUpdate = rollbackUpdater  // to prevent rollbackUpdater from being garbage collected
      const objects = getObjectsAtEventLocation(event)
      if (objects.length == 0) {
         const model = cayleyDiagramView.viewModel.model
         const layout = model.layout as LayoutType
         if (rollbackPOV != null) 
            model.layout = { pov: rollbackPOV, nodes: layout.nodes, arrows: layout.arrows, chunks: layout.chunks }
         ;(cayleyDiagramView.control as THREE.TrackballControls).target.set(0, 0, 0)
      } else {
         const tooltipHTML = formatTooltip(objects)
         makeTooltip(tooltipHTML, event)
      }
   })

   function getObjectsAtEventLocation (event: NumberLocation): Array<THREE.Object3D> {
      const canvas = cayleyDiagramView.canvas
      const {left, top, width, height} = canvas.getBoundingClientRect()
      const x = ((event.clientX - left) / width) * 2 - 1
      const y = -((event.clientY - top) / height) * 2 + 1
      const objects = cayleyDiagramView.getObjectsAtPoint(x, y)
      return objects
   }

   function formatTooltip (objects: Array<THREE.Object3D>) {
      const objectNames = objects.map((obj) => obj.name)
      let tooltip: html
      switch (objectNames.length) {
         case 1:
            tooltip =
               `<div>${objectNames[0]}</div>`
            break
         case 2:
            tooltip =
               `<div>
                   <b>In front:</b> ${objectNames[0]}<br>
                   <b>Behind:</b> ${objectNames[1]}
                </div>`
            break
         default:
            tooltip =
               `<div>
                   <b>In front:</b>${objectNames[0]}<br>
                   <b>Others behind:</b><br>
                   ${objectNames.slice(1).join("<br>")}
                </div>`
      }
      return tooltip
   }
}
/*
```
### moveObjects

Handles user interactions to select a node, arc, or chunk in a Cayley diagram and move
or reshape it. It handles both traditional drag-and-drop and the more touch-device-oriented
select-reposition*-deselect sequence.

It uses a modal mask over the canvas to capture events before they bubble to TrackballControl.

It uses [`getPickedObject`](#getpickedobject) to find selected object and wrap it in a
Customizable instance.

It uses the classes of the Customizable hierarchy:
 * [abstract Customizable](#customizable)
   * [Arrow](#arrow) -- change arrow curvature
   * [abstract Movable](#movable) -- reposition picked object in plane normal to camera-origin vector
     * [Node](#node) -- reposition individual node
     * [Chunk](#chunk) -- reposition chunk and the nodes it contains

which implement:
 * equals -- whether two Customizable objects represent the same node / arrow / chunk
 * setHighlight / clearHighlight -- uses get / color subclass implementations
 * redraw -- move object in three dimensions based on the two-dimensional screen location of the cursor
 ```js
 */
function moveObjects (cayleyDiagramView: CayleyDiagramView) {
   // create modal div that grabs pointerdown events on their way to TrackballControl
   const graphicTop = cayleyDiagramView.container.getBoundingClientRect().top
   cayleyDiagramView.container
      .insertAdjacentHTML('beforeend',
         `<div id="cayley-diagram-view-ui-mask" class="modal" style="top: ${graphicTop}px"></div>`)
   const modalMask = document.getElementById('cayley-diagram-view-ui-mask') as HTMLElement

   let pickedObject: Maybe<Customizable> =  null
   let selectedObject: Maybe<Customizable> = null

   // use getPickedObject to find the Object3D under the pointerdown event and wrap it in a Customizable object
   modalMask.addEventListener('pointerdown', (event) => {
      if (event.buttons === 1 && event.isPrimary) {
         pickedObject = getPickedObject(cayleyDiagramView, event)
         if (pickedObject != null || selectedObject != null) {  // might be a deselect operation
            event.stopPropagation()
         }
      } else {
         selectedObject?.clearHighlight()
         selectedObject = null
         pickedObject = null
      }
   })

   // toggle element selection
   // if something is already selected then deselect it
   // if something is picked and it's not the same as the old selection, then make that the selection
   // note that wrappers like selectedObject and pickedObject can be different, but refer to the same Object3D
   recognizeSelect(modalMask, (_event) => {
      const previousSelection = selectedObject
      selectedObject?.clearHighlight()
      selectedObject = null

      if (pickedObject != null && !pickedObject.equals(previousSelection)) {
         selectedObject = pickedObject
         selectedObject.setHighlight()
      }
   })

   // move element
   recognizeDragAndDrop(modalMask,
      (startEvent, previousEvent, currentEvent, isDrop) => {
         if (selectedObject != null) {
            currentEvent.stopPropagation()  // don't confuse TrackballControl
            const isDragStart = (startEvent == previousEvent)
            const currentLocation = eventToVector2(cayleyDiagramView, currentEvent)
            selectedObject.redraw(currentLocation, isDragStart)
            if (isDrop) {  // wait for deselect click to clear highlight
               // keep the CayleyDiagramModel up to date
               selectedObject.cayleyDiagramView.viewModel.model.layout = selectedObject.cayleyDiagramView.layout
            }
         } else if (pickedObject != null) {
            currentEvent.stopPropagation()
            if (startEvent == previousEvent) {  // start of drag-and-drop
               pickedObject.setHighlight()
            }
            pickedObject.redraw(eventToVector2(cayleyDiagramView, currentEvent), startEvent == previousEvent)
            if (isDrop) {
               pickedObject.cayleyDiagramView.viewModel.model.layout = pickedObject.cayleyDiagramView.layout
               pickedObject.clearHighlight()
               pickedObject = null
            }
         }
      })
}
/*
```
### getPickedObject

Find the [THREE.Object3D](https://threejs.org/docs/?q=Object3D#Object3D) in the
[CayleyDiagramView](../docs/CayleyDiagramView.ts.md) scene selected by a user click/tap gesture,
and wrap it in an appropriate [Customizable](#customizable) object
 * uses [THREE.raycaster](https://threejs.org/docs/#api/en/core/Raycaster) to find the object(s)
   under the cursor
 * if several objects are detected it chooses
     <br>&emsp;the nearest *sphere* or *line* under the cursor
     <br>&emsp;a *chunk* if no *sphere* or *line* is found
```js
 */
function getPickedObject (
   cayleyDiagramView: CayleyDiagramView,
   event: NumberLocation
): Maybe<Customizable> {
   const eventLocation = eventToVector2(cayleyDiagramView, event)

   // update the picking ray with the camera and mouse position
   const raycaster = new THREE.Raycaster()
   raycaster.setFromCamera(eventLocation, cayleyDiagramView.camera)

   // collect drag candidates, spheres & lines
   const linesAndSpheres: Array<THREE.Object3D> =
      [...cayleyDiagramView.arrows as LineType[], ...cayleyDiagramView.nodes as THREE.Mesh[]]

   // find intersection with closest line/sphere
   let intersects = raycaster.intersectObjects(linesAndSpheres, false);

   if (intersects.length == 0) {
      const chunks = cayleyDiagramView.chunks
      intersects = raycaster.intersectObjects(chunks, false)
   }

   const pickedObject3D = intersects?.[0]?.object

   const newObject = (pickedObject3D == null)
      ? null
      : cayleyDiagramView.getGroup('lines').children.includes(pickedObject3D)
         ? new Arrow(cayleyDiagramView, raycaster, pickedObject3D)
         : cayleyDiagramView.getGroup('spheres').children.includes(pickedObject3D)
            ? new Node(cayleyDiagramView, raycaster, pickedObject3D)
            : cayleyDiagramView.getGroup('chunks').children.includes(pickedObject3D)
               ? new Chunk(cayleyDiagramView, raycaster, pickedObject3D)
               : null

   return newObject
}
/*
```
### Customizable

Base class supporting drag-and-drop manipulation of Cayley diagram object shape and position

```javascript
 */
abstract class Customizable {
   cayleyDiagramView: CayleyDiagramView
   raycaster: THREE.Raycaster
   object3D: THREE.Object3D
   originalColor!: color

   constructor (
      cayleyDiagramView: CayleyDiagramView,
      raycaster: THREE.Raycaster,
      object3D: THREE.Object3D
   ) {
      this.cayleyDiagramView = cayleyDiagramView
      this.raycaster = raycaster
      this.object3D = object3D
   }

   setHighlight () {
      this.color = SELECTED_HIGHLIGHT_COLOR
   }

   clearHighlight () {
      this.color = this.originalColor
   }

   equals (other: Maybe<Customizable>): boolean {
      return this.object3D == other?.object3D
   }

   // get, set object color
   abstract get color (): color

   abstract set color (color: color)

   // redraw object as dictated by drag-and-drop gesture
   abstract redraw (currentLocation: THREE.Vector2, isDragStart: boolean): void
}
/*
```
### Arrow

Specialized [Customizable](#customizable) implementation for drag-and-drop Arrow object curvature
manipulation. The `redraw` method is called from [moveObjects](#moveobjects).

It redraws the Cayley diagram, adjusting the curvature of the arc so it will be drawn under the pick
point in its original plane.  It does this by updating the offset property of the picked line's
userData, and then updating the arc and its associated arrowheads in`cayleyDiagramView`.

<div style="display: inline-block">
   <img src="../images/redrawArc.png">
   <div style="text-align: center"><b>Arc reshaping geometry</b></div>
</div>>

The figure above shows values used in the `redrawArc` calculations and their geometry (vector-valued
quantities shown in **bold**, program variables in **<i>bold italics</i>**):
* **Camera** -- the observer's point of view; the **<i>cayleyDiagramView.camera</i>** position
* **Origin** -- the coordinate origin (0,0,0) of the scene being viewed; the default center of
  the visualizer display
* **<i>start, end</i>** -- the start and end points of the arc being redrawn
* **<i>chordLength</i>** -- the distance between the **<i>start</i>** and **<i>end</i>** points
* **<i>thirdPoint</i>** -- an auxilliary point used to determine the plane in which the arc will be drawn
* **<i>arcPlane</i>** -- the [THREE.Plane](https://threejs.org/docs/#api/en/math/Plane) determined
  by the **<i>start</i>**, **<i>end</i>**, and **<i>thirdPoint</i>**
* **<i>raycaster.ray.origin</i>** -- the **Origin-Camera** vector
* **<i>raycaster.ray.direction</i>** -- a unit vector from the **Camera** to the pick event
* **<i>pickLine</i>** -- a [THREE.Line3](https://threejs.org/docs/#api/en/math/Line3) from the
  **Camera** through the scene in the direction of the pick event
* **<i>pick</i>** -- the intersection of the **<i>pickLine</i>** with **<i>arcPlane</i>**
* **<i>uPick, vPick</i>** -- **<i>pick</i>** coordinates in the local **U-V** coordinate system
* **<i>pickProjection</i>** -- the projection of **<i>pick</i>** onto the **start-end** vector, a
  number between 0 and 1
* **<i>offset</i>** -- the distance from the top of the arc to the **start-end** line
* **<i>pickSign</i>** -- positive if the arc is concave towards the **<i>thirdPoint</i>**, negative
  if it is convex

We use the [Raycasting](https://threejs.org/docs/#api/en/core/Raycaster),
[Plane](https://threejs.org/docs/#api/en/math/Plane), and
[Line3](https://threejs.org/docs/#api/en/math/Line3) classes from [THREE.js](https://threejs.org)
to calculate the new offset for the arc:
* Set **<i>raycaster</i>** from the position of the **<i>cayleyDiagramView.camera</i>** and the
  pick event location.
* Create **<i>pickLine</i>**, a [THREE.Line3](https://threejs.org/docs/#api/en/math/Line3) from
  the **Camera** at **<i>raycaster.ray.origin</i>** through the scene in the direction of
  **<i>raycaster.ray.direction</i>**.
* Create **<i>arcPlane</i>**, the [THREE.Plane](https://threejs.org/docs/#api/en/math/Plane) through
  the arc's **<i>start</i>**, **<i>end</i>**, and **<i>thirdPoint</i>**.
* Calculate **<i>pickProjection</i>**, the projection of the **start-pick** vector onto the **start-end**
  vector as a percentage of the **start-end** vector, a number from 0 to 1.
    * Check that the **<i>pick</i>** is still over the middle of the line; if not, terminate the drag
      operation and pass the mouse/touch event along, to be treated as a command to reposition the
      whole diagram.
* Consider the local coordinate system **U-V**, centered at **<i>start</i>**, in the plane
  **<i>arcPlane</i>** (see diagram).
* The points **<i>start</i>**, **<i>end</i>**, **<i>pick</i>**, and **<i>thirdPoint</i>** are all
  contained in **<i>arcPlane</i>**, as well as the arc itself.  The problem of calculating the new
  line offset is two-dimensional in this coordinate system.
    * Calculate the local coordinates **<i>uPick</i>** and **<i>vPi<k</i>** of **<i>pick</i>** in
      the **U-V** coordinate system. (Note that in the current routine we really only calculate
      **<i>|vPick|</i>**, since we chose the positive square root when a negative value would have
      been equally valid.)
    * A parabola passing through **<i>start</i>**, **<i>pick</i>**, and **<i>end</i>** in this
      coordinate system satisfies the equation
      <br>&nbsp;&nbsp;&nbsp;&nbsp;`v/offset = 4*(1 - u/chord)*(u/chord),`<br>
      so if the parabola passes through `u = uPick`and`v = ±vPick,`
      <br>&nbsp;&nbsp;&nbsp;&nbsp;`offset = ±vPick * chord² / (4 * uPick * (chord - uPick)),` <br>
      where the sign is still undetermined.
    * The sign of the offset is positive if **<i>pick</i>** is on the opposite side of the **start-end**
      vector from **<i>thirdPoint</i>**. This means that the **<i>start-pick-end</i>** triangle has the
      same orientation as the **<i>start-end-thirdPoint</i>** triangle or, using vector cross products, that
      <br>&nbsp;&nbsp;&nbsp;&nbsp; (**<i>end-start</i>** ⨯ **<i>thirdPoint-end</i>**) ⋅
        (**<i>pick-start</i>** ⨯ **<i>end-pick</i>**) &gt; 0.<br>

After combining these results and calculating the new arc offset, update **<i>line.userData</i>**
and use `this.cayleyDiagramView` methods to redraw the arc and its arrowhead.

```js
*/
class Arrow extends Customizable {
   constructor (
      cayleyDiagramView: CayleyDiagramView,
      raycaster: THREE.Raycaster,
      object3D: THREE.Object3D
   ) {
      super(cayleyDiagramView, raycaster, object3D)
      this.originalColor = this.color
   }

   redraw (currentLocation: THREE.Vector2, _isDragStart: boolean) {
      const arrow: ArrowType = (this.object3D.userData as LineUserData).arrow
      const line = this.cayleyDiagramView.arrows
         .find((line) => (line.userData as LineUserData).arrow == arrow) as LineType

      // update raycaster with new event location
      this.raycaster.setFromCamera(currentLocation, this.cayleyDiagramView.camera);
      const pickLine = new THREE.Line3(this.raycaster.ray.origin,
         this.raycaster.ray.origin.clone().addScaledVector(this.raycaster.ray.direction, 100));

      const start = arrow.start_node.position;
      const end = arrow.end_node.position
      const thirdPoint = arrow.thirdPoint;
      const arcPlane = new THREE.Plane().setFromCoplanarPoints(start, end, thirdPoint);

      const chordLength = new THREE.Line3(start, end).distance();

      const pick = arcPlane.intersectLine(pickLine, new THREE.Vector3()) as THREE.Vector3

      const pickProjection = new THREE.Line3(start, end).closestPointToPointParameter(pick, true);
      if (pickProjection < 0.2 || pickProjection > 0.8) {  // check that pick is over middle of line
         return;  // Do nothing if not near center
      }

      const uPick = pickProjection * chordLength;
      const vPick = Math.sqrt(new THREE.Line3(start, pick).distanceSq() - uPick * uPick);
      const pickSign = Math.sign(
         new THREE.Vector3().crossVectors(end.clone().sub(start), thirdPoint.clone().sub(end))
            .dot(new THREE.Vector3().crossVectors(pick.clone().sub(start), end.clone().sub(pick))));
      const offset = pickSign * chordLength * chordLength * vPick / (4 * uPick * (chordLength - uPick));

      // set line offset in diagram
      arrow.offset = offset / chordLength;

      // redraw line, arrowheads
      this.cayleyDiagramView.redrawLines([line]);
   }

   get color (): color {
      const currentColor = ((this.object3D as LineType).userData as LineUserData).arrow.color
      return currentColor
   }

   set color (color: color) {
      ;(((this.object3D as LineType).userData as LineUserData).arrow as ArrowType).color = color
      this.cayleyDiagramView.redrawAllLines()
   }

   equals (other: Maybe<Customizable>): boolean {
      const areEqual = other instanceof Arrow
         && (this.object3D.userData as LineUserData).arrow === (other.object3D.userData as LineUserData).arrow

      return areEqual
   }
}
/*
```
### Movable

Specialized [Customizable](#customizable) implementation for drag-and-drop repositioning of
objects in a Cayley diagram.

The `redraw` method repositions the object so it will be under the pick point, in a plane normal to
the camera-origin vector, together with any associated objects such as labels, arrows, nodes, etc.

<div style="display: inline-block">
   <img src="../images/redrawSphere.png"></img>
   <div style="text-align: center"><b>Node repositioning geometry</b></div>
</div>>

The figure above shows the geometry of the values used in the `redraw` calculation
(vector-valued quantities shown in **bold**, program variables in **<i>bold italics</i>**):
* **Camera** -- the observer's point of view; the **<i>cayleyDiagramView.camera</i>** position
* **Origin** -- the coordinate origin (0,0,0) of the scene being viewed; the default center of
  the visualizer display
* **<i>raycaster.ray.origin</i>** -- the **Origin-Camera** vector
* **<i>raycaster.ray.direction</i>** -- a unit vector from the **Camera** to the pick event
* **<i>pickLine</i>** -- a [THREE.Line3](https://threejs.org/docs/#api/en/math/Line3) from the
  **Camera** through the scene in the direction of the pick event
* **<i>cameraDirection</i>** -- a unit vector from the **Origin** in the direction of the
  **Origin-Camera** vector
* **<i>currentPosition</i>** -- vector to the current position of the node being repositioned
* **<i>nodePlane</i>** -- a [THREE.Plane](https://threejs.org/docs/#api/en/math/Plane) normal to the
  **Origin-Camera** vector containing the current node position
* **<i>newPosition</i>** -- the point at which the **<i>raycaster.ray.direction</i>** intersects
  **<i>nodePlane</i>**

We use the [THREE.Raycaster](https://threejs.org/docs/#api/en/core/Raycaster),
[THREE.Plane](https://threejs.org/docs/#api/en/math/Plane), and
[THREE.Line3](https://threejs.org/docs/#api/en/math/Line3) classes to calculate the new position for
the node:
* set **<i>raycaster</i>** from the position of the **<i>cayleyDiagramView.camera</i>** and the
  pick event location
* create **<i>pickLine</i>**, a [THREE.Line3](https://threejs.org/docs/#api/en/math/Line3) from
  the **Camera** at **<i>raycaster.ray.origin</i>** through the scene in the direction of
  **<i>raycaster.ray.direction</i>**
* create **<i>nodePlane</i>**, a [THREE.Plane](https://threejs.org/docs/#api/en/math/Plane)
  normal to the **Origin-Camera** unit vector **<i>cameraDirection</i>** that contains the
  current object position **<i>currentPosition</i>**
* calculate **<i>newPosition</i>**, the point at which **<i>pickLine</i>** intersects
  **<i>nodePlane</i>**

After finding the new position of the object, invoke the 'moveObject3DTo' method from the
subclass to reposition the object and any associated objects.

```js
 */
abstract class Movable extends Customizable {
   nodePlane!: THREE.Plane
   initialOffset!: THREE.Vector3

   redraw (currentLocation: THREE.Vector2, isDragStart: boolean) {
      // update raycaster with new event location
      this.raycaster.setFromCamera(currentLocation, this.cayleyDiagramView.camera);

      const pickLine = new THREE.Line3(
         this.raycaster.ray.origin,
         this.raycaster.ray.origin.clone().addScaledVector(this.raycaster.ray.direction, 100));

      if (isDragStart) {
         // snap POV to axis if within ~.25 radians? will it make much difference?
         const cameraDirection = this.raycaster.ray.origin.clone().normalize()
         this.nodePlane = new THREE.Plane().setFromNormalAndCoplanarPoint(cameraDirection, this.object3D.position)
      }

      const currentPosition = this.nodePlane.intersectLine(pickLine, new THREE.Vector3()) as THREE.Vector3

      if (isDragStart) {
         this.initialOffset = this.object3D.position.clone().addScaledVector(currentPosition, -1)
      }

      const newPosition = new THREE.Vector3().addVectors(currentPosition, this.initialOffset)

      // move object
      this.moveObject3DTo(newPosition)
   }

   moveObject3DTo (_position: THREE.Vector3) {
   }
}
/*
```
### Node

Specialized [Movable](#movable) implementation for repositioning nodes in a Cayley diagram, together
with their associated labels, arrows, highlights, etc.

```js
 */
class Node extends Movable {
   constructor (
      cayleyDiagramView: CayleyDiagramView,
      raycaster: THREE.Raycaster,
      object3D: THREE.Object3D
   ) {
      super(cayleyDiagramView, raycaster, object3D)
      this.originalColor = this.color
   }

   get color (): color {
      const sphereIndex = (this.object3D.userData as SphereUserData).node.element
      const currentColor = this.cayleyDiagramView.color_highlights[sphereIndex] as string
      return currentColor
   }

   set color (color: color) {
      const sphereIndex = (this.object3D.userData as SphereUserData).node.element
      this.cayleyDiagramView.color_highlights[sphereIndex] = color
      this.cayleyDiagramView.drawAllHighlights()
   }

   // move sphere
   moveObject3DTo (position: THREE.Vector3) {
      this.cayleyDiagramView.moveSphere(this.object3D as THREE.Mesh, position);
   }
}
/*
```
### Chunk

Specialized [Movable](#movable) implementation for repositioning chunks in a Cayley diagram and
their associated nodes.

```js
 */
class Chunk extends Movable {
   constructor (
      cayleyDiagramView: CayleyDiagramView,
      raycaster: THREE.Raycaster,
      object3D: THREE.Object3D
   ) {
      super(cayleyDiagramView, raycaster, object3D)
      this.originalColor = this.color
   }

   get color (): color {
      const currentColor =
         '#' + ((this.object3D as THREE.Mesh).material as THREE.MeshBasicMaterial).color.getHexString()
      return currentColor
   }

   set color (color: color) {
      const object3D = this.object3D as THREE.Mesh
      const newMaterial = (object3D.material as THREE.MeshBasicMaterial).clone()
      newMaterial.color.set(color)
      object3D.material = newMaterial
   }

   // move chunk
   moveObject3DTo (position: THREE.Vector3) {
      this.cayleyDiagramView.moveChunkTo(this.object3D as THREE.Mesh, position)
   }
}

// convert screen-relative event(clientX, clientY) to canvas-relative THREE.Vector2(x, y)
function eventToVector2 (cayleyDiagramView: CayleyDiagramView, event: NumberLocation): THREE.Vector2 {
   const boundingBox = cayleyDiagramView.canvas.getBoundingClientRect()
   const eventLocation = new THREE.Vector2()
   eventLocation.x = ((event.clientX - boundingBox.left) / boundingBox.width) * 2 - 1
   eventLocation.y = -((event.clientY - boundingBox.top) / boundingBox.height) * 2 + 1

   return eventLocation
}
/*
```
*/

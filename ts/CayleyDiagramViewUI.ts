/*

# CayleyDiagramViewUI component

The [Cayley diagram visualizer](../help/rf-um-cd-options/index.html) lets users customize the
appearance of a [Cayley diagram](../help/rf-groupterms/index.html#cayley-diagrams) by
 * [repositioning the
 nodes](../help/rf-um-cd-options/index.html#changing-the-positions-of-nodes-in-the-diagram)
 * [adjusting arcing of arrows in the
 diagram](../help/rf-um-cd-options/index.html#changing-the-arcing-of-arrows-in-the-diagram)
 * repositioning chunks of nodes.

This component adds the following UI gestures to a [CayleyDiagramView](,/CayleyDiagramView.js.md):
 *  display / clear label -- right click / long tap over node (['showTooltipOrReset'](#showtooltiporreset))
 *  remove rotation, zoom, pan (reset camera position) -- other right click / long tap
    ([`showTooltipOrReset`](#showtooltiporreset))
 *  select and move node/arrow/chunk -- click, then drag-and-drop / one-finger-drag
    ([`moveSelectedObjects`](#moveselectedobjects))
 *  move node/arrow/chunk -- drag-and-drop / one-finger drag ([`moveDraggedObjects`](#movedraggedobjects))

```javascript
 */
import { makeTooltip } from './UIComponents.js'
import { recognizeSelect, recognizeContextMenu, recognizeDragAndDrop } from './Gestures.js'
import { DEFAULT_NODE_COLOR } from './CayleyDiagramView.js';
import * as THREE from '../lib/externals.js';

import type { CayleyDiagramView } from './CayleyDiagramView.ts'
import type { ArrowData, LineUserData, LineType } from './CayleyDiagramView.ts'
import { LayoutType } from './CayleyDiagramModel.js';

const HIGHLIGHT_COLOR = 'white'
/*
```
### addGestures

This is the top level exported interface to add gestures to Cayley diagram visualizer. Called by
[CayleyDiagram.html](./CayleyDiagram.html.md).

It set up calls to [`showTooltipOrReset`](#showtooltiporreset) on right-click/long-tap gestures,
and it calls [`moveDraggedObjects`](#movedraggedobjects) and [`moveSelectedObjects`](#moveselectedobjects)
to set up node/arc/chunk moving and reshaping.

```javascript
 */
export function addGestures (cayleyDiagramView: CayleyDiagramView) {
   recognizeContextMenu(cayleyDiagramView.canvas, (event) => showTooltipOrReset(cayleyDiagramView, event))
   moveDraggedObjects(cayleyDiagramView)
   moveSelectedObjects(cayleyDiagramView)
   cayleyDiagramView.enableTrackballControl()
}
/*
```
### showTooltipOrReset

Find  objects at right click / long tap location:
 * if over node, display tooltip for all nodes under the cursor
 * if not over node, reset scene translation / rotation / zoom
```javascript
 */
function showTooltipOrReset (cayleyDiagramView: CayleyDiagramView, event: NumberLocation) {
   const objects = getObjectsAtEventLocation(event)
   if (objects.length == 0) {
      const {position, up} = (cayleyDiagramView.viewModel.model.layout as LayoutType).pov
      cayleyDiagramView.setCameraPosition(position, up)
      ;(cayleyDiagramView.control as THREE.TrackballControls).target.set(0, 0, 0)
   } else {
      const tooltipHTML = formatTooltip(objects)
      makeTooltip(tooltipHTML, event)
   }

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
      let tooltip
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
### Customizable

Base class enabling drag-and-drop manipulation of Cayley diagram object shape and position

Inheritance structure:
 * [Customizable](#customizable)
   * [Arrow](#arrow) -- change arrow curvature
   * [Movable](#movable) -- reposition picked object in plane normal to camera-origin vector
     * [Node](#node) -- reposition individual node
     * [Chunk](#chunk) -- reposition chunk and the nodes it contains

Instantiation workflow:
 * Invoke `color` to highlight selection
 * Create full-screen modal overlay to
   * Block pointer events from reaching Cayley diagram
     [TrackballControls](https://threejs.org/docs/?q=trackballcontr#examples/en/controls/TrackballControls)
   * Maintain interaction focus during manipulation

Subclass responsibilities:
 * color (newColor: THREE.color): THREE.color
   * Sets object color, returns previous color
 * redraw (currentLocation: THREE.Vector3, isDragStart: boolean)
   * Translate 2D drag into 3D transformations

Customizable instances are crated by the factory method `makeCustomizable`, invoked by
[moveNodesArcsAndChunks](#.movenodesarcsandchunks)

```javascript
 */
abstract class Customizable {
   cayleyDiagramView: CayleyDiagramView
   raycaster: THREE.Raycaster
   pickedObject: THREE.Object3D
   originalColor: color
   modalElement: HTMLElement

   constructor (
      cayleyDiagramView: CayleyDiagramView,
      raycaster: THREE.Raycaster,
      pickedObject: THREE.Object3D
   ) {
      this.cayleyDiagramView = cayleyDiagramView
      this.raycaster = raycaster
      this.pickedObject = pickedObject
      this.originalColor = this.color(HIGHLIGHT_COLOR)

      // create modal div that stops the propagation of click and pointer events to TrackballControls
      const displayElement = (cayleyDiagramView.canvas.parentElement as HTMLElement).parentElement as HTMLElement
      displayElement.insertAdjacentHTML('beforeend', `<div class="modal"></div>`)
      this.modalElement = displayElement.querySelector('.modal') as HTMLElement
      ;['pointerdown', 'pointerup', 'click']  // shield these from TrackballControls
         .forEach((eventType) => this.modalElement.addEventListener(eventType, (ev) => ev.stopPropagation()))
   }

   close () {
      this.modalElement.remove()
      this.color(this.originalColor)
   }

   // set object color, return previous color
   abstract color (_newColor: color): color

   // redraw object as dictated by drag-and-drop gesture
   redraw (_currentLocation: THREE.Vector2, _isDragStart: boolean) {
   }
}
/*
```
### Arrow

Specialized [Customizable](#customizable) implementation for drag-and-drop Arrow object curvature
manipulation. The `redraw` method is invoked as an event handler, set up during object instantiation
by the superclass.

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
and use [`this.cayleyDiagramView`](./DisplayDiagram.js) methods to redraw the arc and its arrowhead.

```js
*/
class Arrow extends Customizable {
   redraw (currentLocation: THREE.Vector2, _isDragStart: boolean) {
      const arrow: ArrowData = this.pickedObject.userData.arrow
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

   color (newColor: color): color {
      const previousColor = ((this.pickedObject as LineType).userData as LineUserData).arrow.color
      ;(((this.pickedObject as LineType).userData as LineUserData).arrow as ArrowData).color = newColor
      this.cayleyDiagramView.redrawAllLines()

      return previousColor
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
         this.nodePlane = new THREE.Plane().setFromNormalAndCoplanarPoint(cameraDirection, this.pickedObject.position)
      }

      const currentPosition = this.nodePlane.intersectLine(pickLine, new THREE.Vector3()) as THREE.Vector3

      if (isDragStart) {
         this.initialOffset = this.pickedObject.position.clone().addScaledVector(currentPosition, -1)
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
   color (newColor: color): color {
      if (this.cayleyDiagramView.color_highlights == null) {
         this.cayleyDiagramView.color_highlights = Array(this.cayleyDiagramView.group.order).fill(DEFAULT_NODE_COLOR)
      }
      const sphereIndex = this.pickedObject.userData.node.element
      const previousColor = this.cayleyDiagramView.color_highlights[sphereIndex] as string
      this.cayleyDiagramView.color_highlights[sphereIndex] = newColor
      this.cayleyDiagramView.drawAllHighlights()

      return previousColor
   }

   // move sphere
   moveObject3DTo (position: THREE.Vector3) {
      this.cayleyDiagramView.moveSphere(this.pickedObject as THREE.Mesh, position);
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
   color (newColor: color): color {
      const pickedObject = this.pickedObject
      if (pickedObject instanceof THREE.Mesh) {
         const previousColor = (pickedObject.material as THREE.MeshBasicMaterial).color.getHexString()
         const newMaterial = pickedObject.material.clone()
         newMaterial.color.set(newColor)
         pickedObject.material = newMaterial

         return previousColor
      }
      return newColor
   }

   // move chunk
   moveObject3DTo (position: THREE.Vector3) {
      this.cayleyDiagramView.moveChunkTo(this.pickedObject as THREE.Mesh, position)
   }
}
/*
```
### moveSelectedObjects

'moveSelectedObjects' is called by the main function [`addGestures`](#addgestures)
to handle the user selection of a node, arc, or chunk in a Cayley diagram
in order to move or reshape it. The routine
 * finds [the object selected by the user](#getpickedobject)
 * makes an [appropriate Customizable](#getcustomizable) wrapper for it
 * sets up a [drag-and-drop gesture recognizer](./Gestures.js.md#drag-and-drop)
   to change the element position using the cusomizable `redraw` method
 * sets up a [select gesture recognizer](./Gestures.js.md#select) to deselect
   the element and stop drag-and-drop processing with the customizable `close` method

`moveSelectedObjects` does not process events where the shift key is depressed: these
are handled by the [`moveDraggedObjects`](#movedraggedobjects) function below.

 ```js
 */
function moveSelectedObjects (cayleyDiagramView: CayleyDiagramView) {
   recognizeSelect(cayleyDiagramView.canvas, (event) => {
      if (event.shiftKey) {
         return
      }

      const [pickedObject, raycaster] = getPickedObject(cayleyDiagramView, event)

      if (pickedObject != null && raycaster != null) {
         const selectedObject = getCustomizableObject(cayleyDiagramView, raycaster, pickedObject)

         if (selectedObject != null) {
            // move picked object on drag-and-drop
            recognizeDragAndDrop(selectedObject.modalElement,
               (startEvent, previousEvent, currentEvent, _isDrop) => {
                  if (currentEvent.shiftKey) {
                     return
                  }
                  const isDragStart = (startEvent == previousEvent)
                  const currentLocation = eventToVector2(cayleyDiagramView, currentEvent)
                  selectedObject.redraw(currentLocation, isDragStart)
               })

            // close object on click/tap
            recognizeSelect(selectedObject.modalElement, (_event) => selectedObject.close())
         }
      }
   })
}
/*
```
### moveDraggedObjects

`moveDraggedObjects` is called by the main function [`addGestures`](#addgestures)
to handle the case where a user holds down the shift key and drags a node, arc, or chunk
in a Cayley diagram to move or reshape it *without* selecting it first. Similar to
the [`moveSelectedObjects`](#lmoveSelectedObjects) above, it
 * sets up a [drag-and-drop gesture recognizer](./Gestures.js.md#drag-and-drop)
   to change the element position using the cusomizable `redraw` method
 * finds [the object selected by the user](#getpickedobject)
 * makes an [appropriate Customizable](#getcustomizable) wrapper for it
 * sets up a `pointerup` event listener to deselect the element and stop drag-and-drop
   processing with the customizable `close` method

`moveDraggedObjects` only process events where the shift key is depressed: other drag
events are handled by the [`moveSelectedObjects`](#moveselectedobjects) function above.

 ```js
 */
function moveDraggedObjects (cayleyDiagramView: CayleyDiagramView) {
   let movingObject: Maybe<Customizable> = null

   recognizeDragAndDrop(cayleyDiagramView.canvas,
      (startEvent, previousEvent, currentEvent, _isDrop) => {
         if (!startEvent.shiftKey) {
            return  // if movingObject != null treat as drop
         }

         if (movingObject == null && startEvent == previousEvent) {
            const [pickedObject, raycaster] = getPickedObject(cayleyDiagramView, currentEvent)
            if (pickedObject != null && raycaster != null) {
               movingObject = getCustomizableObject(cayleyDiagramView, raycaster, pickedObject)
               if (movingObject != null) {
                  movingObject.modalElement.addEventListener('pointerup', (_event) => {
                     if (movingObject != null) {
                        movingObject.close()
                        movingObject = null
                     }
                  })
               }
            }
         }
         movingObject?.redraw(eventToVector2(cayleyDiagramView, currentEvent), startEvent == previousEvent)
      })
}
/*
```
### getPickedObject

'getPickedObject' finds the object selected by a user click/tap gesture
 * uses [THREE.raycaster](https://threejs.org/docs/#api/en/core/Raycaster) to find the object(s)
   under cursor
 * if several objects are detected it prioritizes by
     * closest *sphere* or *line* under cursor
     * fallback to *chunk* if no *sphere* or *line* is found

It returns an array containing the picked object and the raycaster, for later use.
```js
 */
function getPickedObject (
   cayleyDiagramView: CayleyDiagramView,
   event: NumberLocation
): [null, null] | [THREE.Object3D, THREE.Raycaster] {
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

   return (intersects.length == 0) ? [null, null] : [intersects[0].object, raycaster]
}
/*
```
### getCustomizableObject

Returns an instance of the Customizable subclass appropriate to the passed `pickedObject`

```js
 */
function getCustomizableObject (
   cayleyDiagramView: CayleyDiagramView,
   raycaster: THREE.Raycaster,
   pickedObject: THREE.Object3D
): Maybe<Customizable> {
   const newObject = cayleyDiagramView.getGroup('lines').children.includes(pickedObject)
      ? new Arrow(cayleyDiagramView, raycaster, pickedObject)
      : cayleyDiagramView.getGroup('spheres').children.includes(pickedObject)
         ? new Node(cayleyDiagramView, raycaster, pickedObject)
         : cayleyDiagramView.getGroup('chunks').children.includes(pickedObject)
            ? new Chunk(cayleyDiagramView, raycaster, pickedObject)
            : null

   return newObject
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

/*
# SheetViewModel

Manages logic of displaying sheet model elements independent of the mechanics of viewing them

Note that when handling notifications from the `SheetModel` proxy in the `update` method,
`view.clear()` is called *before* clearing the model's `sheetElements` map — the subscription
notification fires only after the map is already empty, too late for the view to know what to tear
down.

```js
 */

import * as SheetView from  './SheetView.js'

import type * as THREE from 'three'
import type { Updatable, SubscriptionProxy } from './GEUtils.ts'
import { SheetModel, SheetJSON } from './SheetModel.js'
import * as SheetModel_ from './SheetModel.js'
import { CayleyDiagramModelJSON } from './CayleyDiagramModel.js'
import { CycleGraphJSON } from './CycleGraphModel.js'
import { MulttableJSON } from './MulttableModel.js'

interface SheetViewExtensions<T> {
   viewElement: T,
   destroy: () => void
}
interface NodeExtensions<T> extends SheetViewExtensions<T> {
   move: (dx: float, dy: float) => void,
   resize: (dw: float, dh: float) => void,
   copy: () => NodeElement,
}
interface VisualizerExtensions<T> extends NodeExtensions<T> {
   getVisualizerJSON: () => unknown,
   updateVisualizer: (json: unknown) => void
}
export interface SheetElement extends SheetModel_.SheetElement, SheetViewExtensions<SheetView.SheetView> {}
export interface NodeElement extends SheetModel_.NodeElement, NodeExtensions<SheetView.NodeView> {}
export interface TextElement extends SheetModel_.TextElement, NodeExtensions<SheetView.TextView> {}
export interface VisualizerElement extends SheetModel_.VisualizerElement, VisualizerExtensions<SheetView.VisualizerView> {}
export interface CDElement extends SheetModel_.CDElement, VisualizerExtensions<SheetView.CDView> {}
export interface CGElement extends SheetModel_.CGElement, VisualizerExtensions<SheetView.CGView> {}
export interface MTElement extends SheetModel_.MTElement, VisualizerExtensions<SheetView.MTView> {}
export interface LinkElement extends  SheetModel_.LinkElement, SheetViewExtensions<SheetView.LinkView> {
   source: NodeElement,
   destination: NodeElement
}
export interface ConnectingElement extends SheetModel_.ConnectingElement, SheetViewExtensions<SheetView.ConnectingView> {
   source: NodeElement,
   destination: NodeElement
}
export interface MorphismElement extends SheetModel_.MorphismElement, SheetViewExtensions<SheetView.MorphismView> {
   source: VisualizerElement,
   destination: VisualizerElement
}

export class SheetViewModel implements Updatable {
   #model!: SheetModel
   #view!: SheetView.View

   constructor (model: SubscriptionProxy<SheetModel>) {
      this.model = model
   }

   get model (): SheetModel {
      return this.#model
   }

   set model (model: SubscriptionProxy<SheetModel>) {
      this.#model = model
      model.$subscribe(this, 'sheetElements')  // won't this leak?
   }

   get view (): SheetView.View {
      return this.#view
   }

   set view (view: SheetView.View) {
      this.modelElements.forEach((element) => view.addElement(element))
      this.#view = view
   }

   get modelElements (): Map<string, SheetElement> {
      return this.model.sheetElements as Map<string, SheetElement>
   }

   update (_field: string, value: unknown) {
      if (typeof value === 'object' && value != null && 'map' in value) {
         const {map, key} = value as {key: string, map: Map<string, SheetElement>}
         if (key == null && map.size == 0) {  // => clear
            this.view.clear()
         } else if (map.has(key)) {           // => set
            this.addElement(map.get(key) as SheetElement)
         } else {                             // => delete
            // an element got deleted through removeElement,
            // which did everything it needed to clean up before removing it from Model.sheetElements
         }
      } else if (value instanceof Map) {  // could happen on initial subscribe if factory ordering is changed
         this.modelElements.forEach((element) => this.addElement(element))
      } else {
         // get here if there are fields in the Model that are not subscribed to by this ViewModel
      }
   }

   addElement (element: SheetElement) {
      if (!this.modelElements.has(element.id)) {
         this.modelElements.set(element.id, element)
      }
      Object.defineProperty(element, 'viewElement', {
         get: () => this.#view?.viewElements.get(element.id),
         configurable: true,
      })
      if ('isNode' in element) {
         Object.defineProperty(element, 'move', {
            value: (dx: float, dy: float) => this.move(element.id, dx, dy),
            configurable: true,
         })
         Object.defineProperty(element, 'resize', {
            value: (dw: float, dh: float) => this.resize(element.id, dw, dh),
            configurable: true,
         })
         Object.defineProperty(element, 'copy', {
            value: () => {
               const json = (element as NodeElement).toJSON()
               delete json.id
               json.x = (json.x ?? 0) + 10
               json.y = (json.y ?? 0) + 10
               this.addObjectAsElement(json as SheetJSON, element.className)
            },
            configurable: true,
         })
      }
      Object.defineProperty(element, 'destroy', {
         value: () => this.removeElement(element),
         configurable: true,
      })
      if ('isVisualizer' in element) {
         Object.defineProperty(element, 'getVisualizerJSON', {
            value: () => this.getVisualizerJSON(element.id),
            configurable: true,
         })
         Object.defineProperty(element, 'updateVisualizer', {
            value: (json: unknown) => this.updateVisualizer(element.id, json),
            configurable: true,
         })
      }
      this.view?.addElement(element)
   }

   viewportOrigin (): THREE.Vector2 {
      return this.#view.viewportOrigin()
   }

   viewportScale (): float {
      return this.#view.viewportScale()
   }

   move (id: string, dx: number, dy: number) {
      const element = this.modelElements.get(id) as NodeElement
      if (element == null || !('isNode' in element))
         return
      element.x += dx / this.#view.zoomFactor
      element.y += dy / this.#view.zoomFactor
      this.#view.moveElement(element)
      this.modelElements.forEach((el) => {
         if ('isNode' in el && 'anchor_id' in el && el.anchor_id === id)
            this.move(el.id, dx, dy)
      })
   }

   resize (id: string, dw: number, dh: number) {
      const element = this.modelElements.get(id) as NodeElement
      if (element == null || !('isNode' in element))
         return
      element.w += dw / this.#view.zoomFactor
      element.h += dh / this.#view.zoomFactor
      this.#view.resizeElement(element)
      // reposition anchored elements to stay flush with the bottom edge
      this.modelElements.forEach((el) => {
         if ('isNode' in el && 'anchor_id' in el && el.anchor_id === id) {
            ;(el as NodeElement).x = element.x
            ;(el as NodeElement).y = element.y + element.h
            ;(el as NodeElement).w = element.w
            this.#view.resizeElement(el as NodeElement)
         }
      })
   }

   addObjectAsElement (plainObject: SheetJSON, className: keyof SheetModel_.ConcreteSheetTypes): SheetElement {
      return this.#model.addObjectAsElement(plainObject, className) as SheetElement
   }

   removeElement (element: SheetElement) {
      // if element is the source or destination of a link, remove the link also
      // if element is an anchor, remove anchored elements also
      if ('isNode' in element) {
         Array.from(this.modelElements.values())
            .filter((el) =>
               'isLink' in el
                  && ((el as LinkElement).source.id == element.id || (el as LinkElement).destination.id == element.id)
            || 'isNode' in el && (el as NodeElement).anchor_id == element.id)
            .forEach((el) => this.removeElement(el))
      }
      this.view?.removeElement(element)
      this.modelElements.delete(element.id)
   }

   getVisualizerJSON (id: string): unknown {
      const element = this.modelElements.get(id)
      if (element == null || !('isVisualizer' in element))
         return null
      return this.#view.getVisualizerJSON(element as VisualizerElement)      
   }

   updateVisualizer (id: string, json: unknown) {
      const element = this.modelElements.get(id) as VisualizerElement
      if (element == null || !('isVisualizer' in element))
         return
      element.visualizerJSON = json as CayleyDiagramModelJSON | CycleGraphJSON | MulttableJSON  // FIXME
      this.#view.updateVisualizer(element, json)      
   }
}

//@flow

export {SheetViewModel}

/*::
import type {SheetModel} from './SheetModel.js'
 */

class SheetViewModel /*: Updatable */ {
   #model /*: SheetModel */
   #view /*: SheetView.View */
   modelElements /*: Map<string, SheetElement> */ = new Map()

   constructor (model /*: ?SubscriptionProxy<SheetModel> */) {
      if (model != null) {
         this.model = model
      }
   }

   get model () /*: SheetModel */ {
      return this.#model
   }

   set model (model /*: SubscriptionProxy<SheetModel> */) {
      this.#model = model
      model.sheetViewModel = this
      model.$subscribe(this, 'sheetElements')  // won't this leak?
   }

   get view () /*: SheetView */ {
      return this.#view
   }

   set view (view /*: SheetView */) {
      this.modelElements.forEach((element) => view.addElement(element))
      this.#view = view
   }

   update (field, value) {
      if ('map' in  value) {
         const {map, key} = value
         if (key == null && map.size == 0) {  // => clear
            this.clear()
         } else if (map.has(key)) {           // => set
            this.addElement(map.get(key))
         } else {                             // => delete
            if (this.modelElements.has(key)) {
               this.removeElement(this.modelElements.get(key))
            }
         }
      } else if (value instanceof Map) {  // happens on initial subscribe -- and only then? guaranteed?
         this.modelElements.clear()
         this.model.sheetElements.forEach((element) => this.addElement(element))
      } else {
         // get here if there are fields in the Model that are not used by this ViewModel
      }
   }

   addElement (element) {
      if (!this.model.sheetElements.has(element.id)) {
         this.model.sheetElements.set(element.id, element)
      }
      Object.defineProperty(element, 'viewElement', {
         get: () => this.#view?.viewElements.get(element.id),
         configurable: true,
      })
      Object.defineProperty(element, 'move', {
         value: (dx, dy) => this.move(element.id, dx, dy),
         configurable: true,
      })
      Object.defineProperty(element, 'resize', {
         value: (dw, dh) => this.resize(element.id, dw, dh),
         configurable: true,
      })
      Object.defineProperty(element, 'copy', {
         value: () => {
            const json = element.toJSON()
            delete json.id
            json.x = (json.x ?? 0) + 10
            json.y = (json.y ?? 0) + 10
            this.addObjectAsElement(json, element.className)
         },
         configurable: true,
      })
      this.modelElements.set(element.id, element)
      this.view?.addElement(element)
   }

   clear () {
      this.modelElements.forEach((element) => this.removeElement(element))
   }

   viewportOrigin () /*: SheetUnits */ {
      return this.#view.viewportOrigin()
   }

   viewportScale () /*: float */ {
      return this.#view.viewportScale()
   }

   move (id /*: string */, dx /*: number */, dy /*: number */) {
      const element = this.modelElements.get(id)
      if (element == null) return
      element.x += dx / this.#view.zoomFactor
      element.y += dy / this.#view.zoomFactor
      this.#view.moveElement(element)
   }

   resize (id /*: string */, dw /*: number */, dh /*: number */) {
      const element = this.modelElements.get(id)
      if (element == null) return
      element.w += dw / this.#view.zoomFactor
      element.h += dh / this.#view.zoomFactor
      this.#view.resizeElement(element)
   }

   addObjectAsElement (plainObject /*: Obj */, className /*: string */) /*: SheetElement */ {
      return this.#model.addObjectAsElement(plainObject, className)
   }

   removeElement (element /*: SheetElement */) {
      // if element is the source or destination of a link, then remove the link also
      if (element.isNode) {
         Array.from(this.modelElements.values())
            .filter((element) => element.isLink)
            .forEach((link) => {
               if ((link.source.id == element.id || link.destination.id == element.id)) {
                  this.removeElement(link)
               }
            })
      }
      this.view?.removeElement(element)
      this.modelElements.delete(element.id)
      this.model.sheetElements.delete(element.id)
   }
}


/*
ToDo:

Z change
zoom / pan
finish links
 */

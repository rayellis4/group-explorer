//@flow
export { SheetViewModel };
/*::
import type {SheetModel} from './SheetModel.js'
 */
class SheetViewModel /*: Updatable */ {
    #model; /*: SheetModel */
    #view; /*: SheetView.View */
    constructor(model /*: ?SubscriptionProxy<SheetModel> */) {
        if (model != null) {
            this.model = model;
        }
    }
    get model() {
        return this.#model;
    }
    set model(model /*: SubscriptionProxy<SheetModel> */) {
        this.#model = model;
        model.sheetViewModel = this;
        model.$subscribe(this, 'sheetElements'); // won't this leak?
    }
    get view() {
        return this.#view;
    }
    set view(view /*: SheetView */) {
        this.modelElements.forEach((element) => view.addElement(element));
        this.#view = view;
    }
    get modelElements() {
        return this.model.sheetElements;
    }
    update(field, value) {
        if ('map' in value) {
            const { map, key } = value;
            if (key == null && map.size == 0) { // => clear
                this.view.clear();
            }
            else if (map.has(key)) { // => set
                this.addElement(map.get(key));
            }
            else { // => delete
                // an element got deleted through removeElement,
                // which did everything it needed to clean up before removing it from Model.sheetElements
            }
        }
        else if (value instanceof Map) { // could happen on initial subscribe if factory ordering is changed
            this.modelElements.forEach((element) => this.addElements(element));
        }
        else {
            // get here if there are fields in the Model that are not subscribed to by this ViewModel
        }
    }
    addElement(element) {
        if (!this.modelElements.has(element.id)) {
            this.modelElements.set(element.id, element);
        }
        Object.defineProperty(element, 'viewElement', {
            get: () => this.#view?.viewElements.get(element.id),
            configurable: true,
        });
        Object.defineProperty(element, 'move', {
            value: (dx, dy) => this.move(element.id, dx, dy),
            configurable: true,
        });
        Object.defineProperty(element, 'resize', {
            value: (dw, dh) => this.resize(element.id, dw, dh),
            configurable: true,
        });
        Object.defineProperty(element, 'copy', {
            value: () => {
                const json = element.toJSON();
                delete json.id;
                json.x = (json.x ?? 0) + 10;
                json.y = (json.y ?? 0) + 10;
                this.addObjectAsElement(json, element.className);
            },
            configurable: true,
        });
        Object.defineProperty(element, 'destroy', {
            value: () => this.removeElement(element),
            configurable: true,
        });
        if (element.isVisualizer) {
            Object.defineProperty(element, 'getVisualizerJSON', {
                value: () => this.getVisualizerJSON(element.id),
                configurable: true,
            });
            Object.defineProperty(element, 'updateVisualizer', {
                value: (json) => this.updateVisualizer(element.id, json),
                configurable: true,
            });
        }
        this.view?.addElement(element);
    }
    viewportOrigin() {
        return this.#view.viewportOrigin();
    }
    viewportScale() {
        return this.#view.viewportScale();
    }
    move(id /*: string */, dx /*: number */, dy /*: number */) {
        const element = this.modelElements.get(id);
        if (element == null)
            return;
        element.x += dx / this.#view.zoomFactor;
        element.y += dy / this.#view.zoomFactor;
        this.#view.moveElement(element);
        this.modelElements.forEach((el) => {
            if (el.anchor_id === id)
                this.move(el.id, dx, dy);
        });
    }
    resize(id /*: string */, dw /*: number */, dh /*: number */) {
        const element = this.modelElements.get(id);
        if (element == null)
            return;
        element.w += dw / this.#view.zoomFactor;
        element.h += dh / this.#view.zoomFactor;
        this.#view.resizeElement(element);
        // reposition anchored elements to stay flush with the bottom edge
        this.modelElements.forEach((el) => {
            if (el.anchor_id === id) {
                el.x = element.x;
                el.y = element.y + element.h;
                el.w = element.w;
                this.#view.resizeElement(el);
            }
        });
    }
    addObjectAsElement(plainObject /*: Obj */, className /*: string */) {
        return this.#model.addObjectAsElement(plainObject, className);
    }
    removeElement(element /*: SheetElement */) {
        // if element is the source or destination of a link, remove the link also
        // if element is an anchor, remove anchored elements also
        if (element.isNode) {
            Array.from(this.modelElements.values())
                .filter((el) => el.isLink && (el.source.id == element.id || el.destination.id == element.id)
                || el.anchor_id == element.id)
                .forEach((el) => this.removeElement(el));
        }
        this.view?.removeElement(element);
        this.modelElements.delete(element.id);
    }
    getVisualizerJSON(id /*: string */) {
        const element = this.modelElements.get(id);
        if (element == null)
            return;
        return this.#view.getVisualizerJSON(element);
    }
    updateVisualizer(id /*: string */, json) {
        const element = this.modelElements.get(id);
        if (element == null)
            return;
        element.visualizer = json;
        this.#view.updateVisualizer(element, json);
    }
}
//# sourceMappingURL=SheetViewModel.js.map
/*
# SheetViewModel

Manages logic of displaying sheet model elements independent of the mechanics of viewing them

Note that when handling notifications from the `SheetModel` proxy in the `update` method,
`view.clear()` is called *before* clearing the model's `sheetElements` map — the subscription
notification fires only after the map is already empty, too late for the view to know what to tear
down.

```js
 */
export class SheetViewModel {
    _model;
    _view;
    constructor(model) {
        this.model = model;
    }
    get model() {
        return this._model;
    }
    set model(model) {
        this._model = model;
        model.$subscribe(this, 'sheetElements'); // won't this leak?
    }
    get view() {
        return this._view;
    }
    set view(view) {
        this.modelElements.forEach((element) => view.addElement(element));
        this._view = view;
    }
    get modelElements() {
        return this.model.sheetElements;
    }
    update(_field, value) {
        if (typeof value === 'object' && value != null && 'map' in value) {
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
            this.modelElements.forEach((element) => this.addElement(element));
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
            get: () => this._view?.viewElements.get(element.id),
            configurable: true,
        });
        if ('isNode' in element) {
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
        }
        Object.defineProperty(element, 'destroy', {
            value: () => this.removeElement(element),
            configurable: true,
        });
        if ('isVisualizer' in element) {
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
        return this._view.viewportOrigin();
    }
    viewportScale() {
        return this._view.viewportScale();
    }
    move(id, dx, dy) {
        const element = this.modelElements.get(id);
        if (element == null || !('isNode' in element))
            return;
        element.x += dx / this._view.zoomFactor;
        element.y += dy / this._view.zoomFactor;
        this._view.moveElement(element);
        this.modelElements.forEach((el) => {
            if ('isNode' in el && 'anchor_id' in el && el.anchor_id === id)
                this.move(el.id, dx, dy);
        });
    }
    resize(id, dw, dh) {
        const element = this.modelElements.get(id);
        if (element == null || !('isNode' in element))
            return;
        element.w += dw / this._view.zoomFactor;
        element.h += dh / this._view.zoomFactor;
        this._view.resizeElement(element);
        // reposition anchored elements to stay flush with the bottom edge
        this.modelElements.forEach((el) => {
            if ('isNode' in el && 'anchor_id' in el && el.anchor_id === id) {
                ;
                el.x = element.x;
                el.y = element.y + element.h;
                el.w = element.w;
                this._view.resizeElement(el);
            }
        });
    }
    addObjectAsElement(plainObject, className) {
        return this._model.addObjectAsElement(plainObject, className);
    }
    removeElement(element) {
        // if element is the source or destination of a link, remove the link also
        // if element is an anchor, remove anchored elements also
        if ('isNode' in element) {
            Array.from(this.modelElements.values())
                .filter((el) => 'isLink' in el
                && (el.source.id == element.id || el.destination.id == element.id)
                || 'isNode' in el && el.anchor_id == element.id)
                .forEach((el) => this.removeElement(el));
        }
        this.view?.removeElement(element);
        this.modelElements.delete(element.id);
    }
    getVisualizerJSON(id) {
        const element = this.modelElements.get(id);
        if (element == null || !('isVisualizer' in element))
            return null;
        return this._view.getVisualizerJSON(element);
    }
    updateVisualizer(id, json) {
        const element = this.modelElements.get(id);
        if (element == null || !('isVisualizer' in element))
            return;
        element.visualizerJSON = json; // FIXME
        this._view.updateVisualizer(element, json);
    }
}
//# sourceMappingURL=SheetViewModel.js.map
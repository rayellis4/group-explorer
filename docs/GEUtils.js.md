/* @flow

# GEUtils

A collection of utility routines used throughout GE3.
 * [equals](#equals) -- return whether two arrays are equal
 * [flatten](#flatten) -- flatten a nest of arrays to a single level
 * [fromRainbow](#fromrainbow) -- returns hsl color string
 * [isTouchDevice](#istouchdevice) -- determine whether current device supports a touch interface
 * [htmlToContext](#htmltocontext) -- copy characters from HTML to `<canvas>` context
 * [generateElements](#generateElements) -- create DOM elements from HTML
 * [createActionHandler](#createActionHandler) -- create handler to eval data-action attribute on click
 * [version](#version) -- generate GE3 version number from <meta> tag in top-level web page

```javascript
 */
export {
   equals,
   flatten,
   fromRainbow,
   isTouchDevice,
   htmlToContext,
   generateElements,
   createActionHandler,
   createModelProxy,
}

export {version} from './AutoUpgrade.js'
/*::
export type Tree<T> = Array< T | Tree<T> >;
 */

/*
```
### equals
Determine whether two arrays are equal according to whether their elements are ==.
```javascript
*/
function equals (a /*: Array<any> */, b /*: Array<any> */) /*: boolean */ {
   if (Array.isArray(a) && Array.isArray(b) && a.length == b.length) {
      for (let inx = 0; inx < a.length; inx++) {
         if (a[inx] != b[inx]) {
            return false;
         }
      }
      return true;
   }
   return false;
}
/*
```
### flatten
Flatten an arbitrarily nested array to a single level.
```javascript
*/
function flatten/*:: <T> */(tree /*: Tree<T> */) /*: Array<T> */ {
   return tree.reduce(
      (flattened, el) => {
         if (Array.isArray(el)) {
            flattened.push(...flatten(((el /*: any */) /*: Tree<T> */)))
         } else {
            flattened.push(el)
         }
         return flattened;
      }, []);
}
/*
```
### fromRainbow
Return an hsl string given hue, saturation, and lightness values
```javascript
*/
   // All arguments, including hue, are fractional values 0 <= val <= 1.0
function fromRainbow (
   hue /*: float */,
   saturation /*: float */ = 1.0,
   lightness /*: float */ = .8,
   offset /*: float */ = 0
) /*: css_color */ {
   const h = Math.round(360 * ((hue + offset) - Math.floor(hue + offset)))
   return `hsl(${h}, ${Math.round(100 * saturation)}%, ${Math.round(100 * lightness)}%)`
}
/*
```
### isTouchDevice
Determine whether the current device supports a touch interface
```javascript
*/
function isTouchDevice () /*: boolean */ {
   return 'ontouchstart' in window;
}
/*
```
### htmlToContext

This routine draws characters from an HTML element (usually a `<div>`) onto a
CanvasRenderingContext2D. It preserves their font characteristics, spacing, etc., and centers the
result at `center`. This is used to label graphics in the visualizers with the same text that is
displayed elsewhere. We take particular advantage of the fact all our labels are single line, with
no browser-generated line breaks (this makes the analysis much simpler).  The font characteristics
-- style, size, weight, color -- are determined from the source's CSS style. The character locations
are determined using the `getClientRects()` interface on each of the source tree's text nodes.

```javascript
*/
function htmlToContext (
   source /*: HTMLElement */,
   context /*: CanvasRenderingContext2D */,
   center /*: interface {x: number, y: number} */
) {
   // find all text nodes in source element
   const walker = document.createTreeWalker(source, NodeFilter.SHOW_TEXT)
   const textNodes = []
   for (let nextNode = walker.nextNode(); nextNode != undefined; nextNode = walker.nextNode()) {
      textNodes.push(nextNode)
   }

   const range = document.createRange()
   const nodesAndRects /*: Array<{+node: Node, rect: ClientRect}> */ =
      Array.from(textNodes)
         .reduce((nodes, node) => {
            range.selectNodeContents(node)
            const rects = Array.from(range.getClientRects())
            if (rects.length != 0) {
               nodes.push(...rects.map((rect) => { return { node: node, rect: rect } }))
            }
            return nodes
         }, [])

   const { left: xMin, top: yMin, right: xMax, bottom: yMax } = source.getBoundingClientRect()

   // set up canvas context
   context.fillStyle = (source.style.color != undefined && source.style.color != '') ? source.style.color : 'black'
   context.textAlign = 'start'
   context.textBaseline = 'bottom'

   // copy node text into context at rect location, offset to place center of text at specified point
   for (const { node, rect } of nodesAndRects) {
      const parent = node.parentElement
      const parentStyle = window.getComputedStyle(parent)
      context.font = `${parentStyle.fontStyle} ${parentStyle.fontWeight} ${parentStyle.fontSize} ${parentStyle.fontFamily}`

      const x = rect.left - xMin + center.x - (xMax - xMin) / 2
      const y = rect.top + rect.height - yMin + center.y - (yMax - yMin) / 2
      context.fillText(node.textContent, x, y)
   }
}
/*
```
### generateElements

Create elements from HTML, return results as HTMLCollection
```javascript
 */
function generateElements (html /*: html */ ) /*: HTMLCollection<HTMLElement> */ {
   const template = document.createElement('template');
   template.innerHTML = html.trim();
   return template.content.children;
}
/*
```
### createActionHandler

Creates handler to eval data-action attribute on click event
```javascript
 */
function createActionHandler (element /*: Element */, actionCallback /*: (string) => void */) {
   element.addEventListener('click', (event) => {
      const action = ((event.target /*: any */) /*: Element */).closest('[data-action]')?.getAttribute('data-action')
      if (action != null) {
         event.preventDefault()
         actionCallback(action)
      }
   })
}
/*::
export interface Updatable {
   update(string, any): void,
}
export type SubscriptionProxy<T> = T & {
   $subscribe: (subscriber: Updatable, field: string) => void,
   $unsubscribe: (subscriber: Updatable, field: string) => void,
   $touch: (field: string) => void
}

type Subscription = {
   field: string,
   subscriber: WeakRef<Updatable>,
}
type SubscriptionMap = Map<string, Array<Subscription>>
 */
// Creates proxy for model, in which 'set' invokes update notifications
// DIY notifications via callback to subscriber.update
// Also handles Map-valued fields: mutations via .set()/.delete()/.clear() trigger notifications
function createModelProxy/*:: <T: Object> */ (
   model /*: T */
) /*: SubscriptionProxy<T> */ {
   const subscriptionMap /*: SubscriptionMap */ = new Map()
   const proxyCache /*: Map<string, Map<any,any>> */ = new Map()

   const handler /*: Proxy$traps<T> */ = {
      get(model /*: T */, property /*: string */, _receiver /*: Proxy<T> */) {
         if (property == '$subscribe') {
            return (subscriber /*: Updatable */, field /*: string */) => {
               // should you be able to subscribe to a field that doesn't exist yet? not wrong, but no use case yet
               if (field in model) {
                  subscribe(subscriptionMap, subscriber, field)
               }
            }
         }
         if (property == '$unsubscribe') {
            return (subscriber /*: Updatable */, field /*: string */) => unsubscribe(subscriptionMap, subscriber, field)
         }
         if (property == '$touch') {
            return (field /*: string */) => notifySubscribers(subscriptionMap, field, Reflect.get(model, field))
         }

         const value = Reflect.get(model, property)
         if (value instanceof Map) {
            if (!proxyCache.has(property)) {
               proxyCache.set(property, createMapProxy(value, property))
            }
            return proxyCache.get(property)
         }

         return value
      },
      set(model /*: T */, property /*: string */, value /*: any */, receiver /*: Proxy<T> */) {
         if (Object.getOwnPropertyNames(model).includes(property)) {
            Reflect.set(model, property, value)
            if (value instanceof Map) {
               proxyCache.delete(property)  // invalidate cached proxy if Map field is replaced
            }
            notifySubscribers(subscriptionMap, property, value)
         }

         return Reflect.set(model, property, value, receiver)
      }
   }

   return (new Proxy(model, handler) /*:: as any as SubscriptionProxy<T> */)

   function createMapProxy (map /*: Map<any,any> */, fieldName /*: string */) /*: Map<any,any> */ {
      const MAP_MUTATING_METHODS = ['set', 'delete', 'clear']
      return new Proxy(map, {
         get (target /*: Map<any,any> */, method /*: string */) {
            const value = Reflect.get(target, method)
            if (typeof value === 'function') {
               if (MAP_MUTATING_METHODS.includes(method)) {
                  return (...args /*: Array<any> */) => {
                     const result = value.apply(target, args)
                     notifySubscribers(subscriptionMap, fieldName, {map: target, key: args[0]})
                     return result
                  }
               }
               return value.bind(target)  // correct 'this' binding for non-mutating methods
            }
            return value
         }
      })
   }

   function subscribe (subscriptionMap /*: SubscriptionMap */, subscriber /*: Updatable */, field /*: string */) {
      const newSubscription = {field: field, subscriber: new WeakRef(subscriber)}
      if (!subscriptionMap.has(field)) {
         subscriptionMap.set(field, [])
      }
      subscriptionMap.get(field)?.push(newSubscription)
   }

   // ToDo: unsubscribe from a single field or all fields
   function unsubscribe (subscriptionMap /*: SubscriptionMap */, subscriber /*: Updatable */, _field /*: string */) {
      const subscription = Array.from(subscriptionMap.values()).flat()
         .reduce((subscription, curr) => {
            return (curr.subscriber == subscriber) ? curr : subscription
         }, (null /*: ?Subscription */))
      if (subscription != null) {
         const mappedSubscriptions = (subscriptionMap.get(subscription.field) /*:: as any as Array<Subscription> */)
         const mappedSubscriptionIndex = mappedSubscriptions.findIndex((sub) => sub.subscriber == subscriber)
         mappedSubscriptions.splice(mappedSubscriptionIndex, 1)
         subscriptionMap.set(subscription.field, mappedSubscriptions)
      }
   }

   function notifySubscribers (subscriptionMap /*: SubscriptionMap */, property /*: string */, value /*: any */) {
      const subscriptions = subscriptionMap.get(property)
      if (subscriptions?.length) {
         for (let inx = subscriptions.length - 1; inx >= 0; inx--) {
            const subscriber = subscriptions[inx].subscriber.deref()
            if (subscriber == null) {
               subscriptions.splice(inx, 1)
            } else {
               subscriber.update(property, value)
            }
         }
      }
   }
}

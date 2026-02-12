/* @flow

# GEUtils

A collection of utility routines used throughout GE3.
 * [equals](#equals) -- return whether two arrays are equal
 * [flatten](#flatten) -- flatten a nest of arrays to a single level
 * [fromRainbow](#fromrainbow) -- returns hsl color string
 * [isTouchDevice](#istouchdevice) -- determine whether current device supports a touch interface
 * [htmlToContext](#htmltocontext) -- copy characters from HTML to `<canvas>` context
 * [version](#version) -- generate GE3 version number from <meta> tag in top-level web page
 * [generateElements](#generateElements) -- create DOM elements from HTML
 * [createActionHandler](#createActionHandler) -- create handler to eval data-action attribute on click

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
   executeWhenDocumentLoaded,
}

export {version} from './AutoUpgrade.js'

/*::
import { THREE } from '../lib/externals.js'

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
   saturation /*:: ?: float */ = 1.0,
   lightness /*:: ?: float */ = .8,
   offset /*:: ?: float */ = 0
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
function htmlToContext (source /*: HTMLElement */, context /*: CanvasRenderingContext2D */, center /*: THREE.Vector2 */) {
  // find all text nodes in source element
  const walker = document.createTreeWalker(source, NodeFilter.SHOW_TEXT)
  const textNodes = []
  for (let nextNode = walker.nextNode(); nextNode != undefined; nextNode = walker.nextNode()) {
    textNodes.push(nextNode)
  }

  const range = document.createRange()
  const nodesAndRects =
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
function generateElements (html) {
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
function createActionHandler (element, actionCallback) {
   element.addEventListener('click', (event) => {
      const action = event.target.closest('[data-action]')?.getAttribute('data-action')
      if (action != null) {
         event.preventDefault()
         actionCallback(action)
      }
   })
}
/*
```
### executeWhenDocumentLoaded

Executes fn if document load is complete, otherwise listens for load event and executes then

Used by top-level pages to ensure that load routine runs when, and only when, load is complete
```javascript
 */
function executeWhenDocumentLoaded (fn) {
   if (document.readyState === 'complete') {
      fn()
   } else {
      window.addEventListener('load', () => fn(), {once: true})
   }
}

/* @flow

# SheetView

The View part of the Sheet Model-View-Controller structure.

```javascript
 */
/* global DOMRect MouseEvent ResizeObserver TouchEvent Touch */

import { THREE } from '../lib/externals.js'
import {createLargeCycleGraphView} from './CycleGraphView.js'
import {createLargeMulttableView} from './MulttableView.js'
import * as SheetModel from './SheetModel.js'

export let Graphic /*: HTMLElement */ = null
export let graphicRect /*: DOMRect */ = new DOMRect(0, 0, 0, 0)
export let PixelsPerModelUnit /*: float */ = 0
export let zoomFactor /*: float */ = 1
export let panVector /*: PhysicalUnits */ // pan expressed in window pixels
let _view /*: ?View */ = null  // set by View constructor; used by module-level functions


/*
```
## Units

Routines to annotate basis for pixel measures that expose THREE.Vector2 methods.

model unit -- #graphic is [0,1+x] x [0,1+y], where x * y = 0

zoomFactor -- size of physical display / size of logical display

```
Units
├─ PhysicalUnits     pixels as displayed (includes effect of zooming, panning)
│  ├─ WindowUnits    PhysicalUnits relative to window
│  └─ GraphicUnits   PhysicalUnits relative to #graphic (WindowUnits offset by #graphic(top, left))
├─ LogicalUnits      pixels before zooming (PhysicalUnits scaled by zoomFactor)
│  └─ SheetUnits     pixels before zooming relative to Sheet display

```js
 */
export class PhysicalUnits extends THREE.Vector2 {
  /*::
    // $FlowFixMe
    multiplyScalar: (float) => PhysicalUnits
  */
  toLogicalUnits () /*: LogicalUnits */ {
    return new LogicalUnits(this.x, this.y).multiplyScalar(1 / zoomFactor)
  }
}

export class LogicalUnits extends THREE.Vector2 {
  /*::
    // $FlowFixMe
    multiplyScalar: (float) => LogicalUnits
  */
  toPhysicalUnits () /*: PhysicalUnits */ {
    return new PhysicalUnits(this.x, this.y).multiplyScalar(zoomFactor)
  }
}

export class WindowUnits extends PhysicalUnits {
  /*::
    // $FlowFixMe
    add: (PhysicalUnits) => WindowUnits
    // $FlowFixMe
    clone: () => WindowUnits
    // $FlowFixMe
    multiplyScalar: (float) => WindowUnits
    // $FlowFixMe
       sub: (PhysicalUnits) => WindowUnits

   Events from the system come in these units
  */
  constructor (
    arg1 /*: ?number | MouseEvent | TouchEvent | Touch | WindowUnits | DOMRect |  THREE.Vector2 */,
    y /*: ?number */
  ) {
    (typeof arg1 === 'number' && typeof y === 'number') ? super(arg1, y) : super()
    if (arg1 != null) {
      if (y == null) {
        if (   arg1 instanceof MouseEvent
            || (typeof Touch !== 'undefined' && arg1 instanceof Touch)
        ) {
          this.set(arg1.clientX, arg1.clientY)
        } else if (typeof TouchEvent !== 'undefined' && arg1 instanceof TouchEvent) {
          if (arg1.type === 'touchend') {
            this.set(arg1.changedTouches[0].clientX, arg1.changedTouches[0].clientY)
          } else if (arg1.touches.length === 1) {
            this.set(arg1.touches[0].clientX, arg1.touches[0].clientY)
          } else { // average position of touches
            this.set(...Array.from(arg1.touches)
              .reduce(([x, y], touch) => [x + touch.clientX, y + touch.clientY], [0, 0])
              .map((pos) => pos / arg1.touches.length))
          }
        } else if (arg1 instanceof THREE.Vector2) {
          this.set(arg1.x, arg1.y)
        } else if (arg1 instanceof DOMRect) {
          this.set(arg1.x, arg1.y)
        }
      }
    }
  }

  toGraphicUnits () /*: GraphicUnits */ {
    return new GraphicUnits(this.x, this.y).sub(new GraphicUnits(graphicRect.x, graphicRect.y))
  }

  toSheetUnits () /*: SheetUnits */ {
    return this.toGraphicUnits().toSheetUnits()
  }
}

export class GraphicUnits extends PhysicalUnits {
  /*::
    // $FlowFixMe
    add: (PhysicalUnits) => GraphicUnits
    // $FlowFixMe
    clone: () => GraphicUnits
    // $FlowFixMe
    multiplyScalar: (float) => GraphicUnits
    // $FlowFixMe
    set: (float, float) => GraphicUnits
    // $FlowFixMe
    sub: (PhysicalUnits) => GraphicUnits
  */
  toWindowUnits () /*: WindowUnits */ {
    return new WindowUnits(this.x, this.y)
      .add(new PhysicalUnits(graphicRect.x, graphicRect.y))
  }

  toSheetUnits () /*: SheetUnits */ {
    const thisAsSheet = this.clone()
      .sub(panVector)
      .sub(graphicPOV())
      .multiplyScalar(1 / zoomFactor)
      .add(graphicPOV())

    return new SheetUnits(thisAsSheet.x, thisAsSheet.y)
  }
}

export class SheetUnits extends LogicalUnits {
  /*::
    // $FlowFixMe
    add: (LogicalUnits) => SheetUnits
    // $FlowFixMe
    applyMatrix3: (THREE.Matrix3) => SheetUnits
    // $FlowFixMe
    addScaledVector: (LogicalUnits, float) => SheetUnits
    // $FlowFixMe
    addVectors: (SheetUnits, SheetUnits) => SheetUnits
    // $FlowFixMe
    clone: () => SheetUnits
    // $FlowFixMe
    lerpVectors: (SheetUnits, SheetUnits, float) => SheetUnits
    // $FlowFixMe
    multiplyScalar: (float) => SheetUnits
    // $FlowFixMe
    sub: (LogicalUnits) => SheetUnits
  */
  toGraphicUnits () /*: GraphicUnits */ {
    return new GraphicUnits(this.x, this.y)
      .sub(graphicPOV())
      .multiplyScalar(zoomFactor)
      .add(graphicPOV())
      .add(panVector)
  }

  toWindowUnits () /*: WindowUnits */ {
    return this.toGraphicUnits().toWindowUnits()
  }
}

export function init () {
  Graphic = document.getElementById('graphic')
  graphicRect = ((Graphic.getBoundingClientRect() /*: any */) /*: DOMRect */)
  PixelsPerModelUnit = Math.min(graphicRect.width, graphicRect.height)
  panVector = new PhysicalUnits()

  new ResizeObserver((entries) => {
    if (entries.findIndex((entry) => entry.target.id === 'graphic') !== -1) {
      graphicRect = ((Graphic.getBoundingClientRect() /*: any */) /*: DOMRect */)
    }
  }).observe(document.getElementById('graphic'))
}

function graphicPOV () /*: GraphicUnits */ {
  const pov = new GraphicUnits(graphicRect.width, graphicRect.height).multiplyScalar(0.5)
  return pov
}

export function createViewElement (modelElement /*: SheetModel.SheetElement */) /*: SheetView */ {
  return new (eval(modelElement.className.replace('Element', 'View')))(modelElement)
}

// pan Sheet by {dx, dy} WindowUnits
export function pan (dx /*: float */, dy /*: float */) {
  panVector.set(panVector.x + dx, panVector.y + dy)
  updateTransforms()
}

export function zoom (scaleFactor /*: float */) {
  zoomFactor *= scaleFactor
  updateTransforms()
}

export function redrawAll () {
  graphicRect = ((Graphic.getBoundingClientRect() /*: any */) /*: DOMRect */)
  PixelsPerModelUnit = Math.min(graphicRect.width, graphicRect.height)

  panVector.set(0, 0)
  zoomFactor = 1
  updateTransforms()

  _view?.viewElements.forEach((viewEl) => {
    if (viewEl.modelElement?.isLink) viewEl.redraw()
  })

  setTimeout(() => redrawNodes(), 0)
}

function updateTransforms () {
  _view?.viewElements.forEach((viewEl) => viewEl.updateTransform())
}

export function redrawNodes () {
  _view?.viewElements.forEach((viewEl) => {
    if (viewEl.modelElement?.isNode) viewEl.redraw()
  })
}

function makeCssTransform (
  scale /*: THREE.Vector2 | float */ = new THREE.Vector2(1, 1),
  direction /*: THREE.Vector2 */ = new THREE.Vector2(1, 0),
  position /*: GraphicUnits | SheetUnits */ = new GraphicUnits() // Pixels of the transform's reference
) /*: string */ {
  scale = (typeof scale === 'number') ? new THREE.Vector2(scale, scale) : scale
  return `matrix(${scale.x * direction.x}, ${scale.x * direction.y},
                 ${-scale.y * direction.y}, ${scale.y * direction.x},
                 ${position.x}, ${position.y})`
}

export class View {
   viewModel
   viewElements /*: Map<string, SheetView> */ = new Map()

   constructor (viewModel, rootElement) {
      init()
      _view = this
      this.viewModel = viewModel
      this.viewModel.view = this  // do we need a more general way to hook a View to a ViewModel?
   }

   get zoomFactor () /*: float */ { return zoomFactor }

   viewportOrigin () /*: SheetUnits */ {
      return new GraphicUnits(0, 0).toSheetUnits()
   }

   viewportScale () /*: float */ {
      return Math.min(graphicRect.width, graphicRect.height) / zoomFactor
   }

   addElement (modelElement) {
      let newElement
      switch (modelElement.className) {
      case 'TextElement':        newElement = new TextView(this, modelElement);        break
      case 'CGElement':          newElement = new CGView(this, modelElement);          break
      case 'MTElement':          newElement = new MTView(this, modelElement);          break
      case 'ConnectingElement':  newElement = new ConnectingView(this, modelElement);  break
      case 'MorphismElement':    newElement = new MorphismView(this, modelElement);    break
      }        
      if (newElement != null) {
         this.viewElements.set(modelElement.id, newElement)
      }
   }
   
   removeElement (modelElement) {
      const sheetViewElement = this.viewElements.get(modelElement.id)
      sheetViewElement.destroy()
   }

   moveElement (modelElement) {
      this.viewElements.get(modelElement.id)?.updateTransform()
      this.#redrawLinks(modelElement)
   }

   resizeElement (modelElement) {
      this.viewElements.get(modelElement.id)?.redraw()
      this.#redrawLinks(modelElement)
   }

   #redrawLinks (modelElement) {
      this.viewElements.forEach((viewEl) => {
         if (   viewEl.modelElement?.isLink
             && (   viewEl.modelElement.source?.id === modelElement.id
                 || viewEl.modelElement.destination?.id === modelElement.id)) {
            viewEl.redraw()
         }
      })
   }
}

export class SheetView {
   view /*: View */
   modelElement /*: SheetModel.SheetElement */
   domElement /*: HTMLElement */

   constructor (view /*: View */, modelElement /*: SheetModel.SheetElement */, domElement /*: HTMLElement */) {
      this.view = view
      this.modelElement = modelElement

      this.domElement = domElement || document.createElement('div')
      this.domElement.setAttribute('id', this.modelElement.id)
      this.domElement.classList.add(this.modelElement.className)
      this.domElement.style.position = 'absolute'
      this.domElement.style.left = 0
      this.domElement.style.top = 0
      this.domElement.style.zIndex = modelElement.z
      this.domElement.style.transformOrigin = 'top left'
      Graphic.append(this.domElement)
  }

  // redraw element
  redraw () { /* implemented by subclass */ }

  // retransform element to position and scale
  updateTransform () { /* implemented by subclass */ }

  destroy () {
    this.domElement.remove()
  }

  updateZ () {
    this.domElement.style.zIndex = this.modelElement.z
  }
}

export class NodeView extends SheetView {
  /*::
    +modelElement: SheetModel.NodeElement
  */
   constructor (view /*: View */, modelElement /*: SheetModel.NodeElement */, domElement /*: HTMLElement */) {
      super(view, modelElement, domElement)

      this.domElement.classList.add('draggable')
      this.domElement.classList.add('NodeElement')
   }

   get center () /*: SheetUnits */ {
      return this.position.addScaledVector(this.size, 0.5)
    return this.modelElement.position.addScaledVector(this.modelElement.size, 0.5)
  }

  get rect () /*: DOMRect */ {
    return new DOMRect(...this.position.toArray(), ...this.size.toArray())
  }

  get position () /*: SheetUnits */ {
     return new SheetUnits(this.modelElement.x, this.modelElement.y)
  }

  get size () /*: LogicalUnits */ {
     return new LogicalUnits(this.modelElement.w, this.modelElement.h)
  }
}

export class RectangleView extends NodeView {
  /*::
    +modelElement: SheetModel.RectangleElement
    color: color
  */
   constructor (view /*: View */, modelElement /*: SheetModel.RectangleElement */, domElement /*: HTMLElement */) {
      super(view, modelElement, domElement)

      this.redraw()
   }

  updateTransform () {
    this.domElement.style.transform = makeCssTransform(zoomFactor, undefined, this.position.toGraphicUnits())
  }

  redraw () {
    this.color = this.modelElement.color
    this.domElement.style.width = this.size.x
    this.domElement.style.height = this.size.y
    this.domElement.style.backgroundColor = this.modelElement.color

    this.updateTransform()
  }
}

export class TextView extends NodeView {
  /*::
    +modelElement: SheetModel.TextElement
  */
   constructor (view /*: View */, modelElement /*: SheetModel.TextElement */, domElement /*: HTMLElement */) {
      super(view, modelElement, domElement)
      this.domElement.style.display = 'flex'
      this.domElement.style.flexDirection = 'column'
      this.domElement.style.justifyContent = 'center'
      this.domElement.insertAdjacentHTML('afterbegin', '<div class="content" style="padding: 0 0.5em">')
      this.redraw()
      this.updateZ()
   }

  updateTransform () {
    this.domElement.style.transform = makeCssTransform(zoomFactor, undefined, this.position.toGraphicUnits())
  }

  redraw () {
    // combine color and opacity into an rgba color for transparent/translucent colors
    const background = new THREE.Color(this.modelElement.color).convertLinearToSRGB().multiplyScalar(256)
    const backgroundCss = (this.modelElement.opacity === 1)
      ? `rgb(${background.r}, ${background.g}, ${background.b})`
      : `rgba(${background.r}, ${background.g}, ${background.b}, ${this.modelElement.opacity})`

    const contentElement = this.domElement.querySelector('div.content')

    // simple case: just a rectangle
    if (this.modelElement.text === '') {
      this.domElement.style.width = `${this.modelElement.w}px`
      this.domElement.style.height = `${this.modelElement.h}px`
      this.domElement.style.backgroundColor = backgroundCss
      this.domElement.style.padding = 0
      this.domElement.style.minHeight = ''
      contentElement.textContent = ''

      this.updateTransform()

      return
    }

     // update style from possible edits
     this.domElement.style.backgroundColor = backgroundCss
     this.domElement.style.color = this.modelElement.fontColor
     this.domElement.style.fontSize = this.modelElement.fontSize
     this.domElement.style.lineHeight = 1.2
     this.domElement.style.zIndex = this.modelElement.z
     contentElement.style.textAlign = this.modelElement.alignment
     contentElement.style.marginLeft = (this.modelElement.alignment == 'left') ? '0' : 'auto'
     contentElement.style.marginRight = (this.modelElement.alignment == 'right') ? '0' : 'auto'

     // avoid drawing original (closed) details over an opened element (cf. SheetViewUI.init)
     if (this.modelElement.displayNeedsTextUpdate) {
        if (this.modelElement.isPlainText) {
           contentElement.textContent = this.modelElement.text
        } else {
           contentElement.innerHTML = this.modelElement.text
        }
        this.modelElement.displayNeedsTextUpdate = false
     }
     contentElement.innerHTML = this.modelElement.text

     // create scratch element to determine text content size
     const scratch = this.domElement.cloneNode(true)
     scratch.style.zIndex = '-1'
     scratch.style.transform = 'none'
     scratch.style.width = (this.modelElement.w) ? `${this.modelElement.w}px` : 'max-content'
     scratch.style.height = 'max-content'
     scratch.style.padding = '0'
     document.body.appendChild(scratch)
     const scratchContentElement = scratch.querySelector('.content')
     const {height: scratchHeight, width: scratchWidth} = scratchContentElement.getBoundingClientRect()
     scratch.remove()

     // apply results from scratch element to model, domElement
     // adjust modelElement location so modelElement zoom doesn't move the center of the element
     if (!this.modelElement.w) {
        this.modelElement.w = scratchWidth
     } else if (scratchWidth > this.modelElement.w) {
        this.modelElement.x -= 0.5 * (scratchWidth - this.modelElement.w)
        this.modelElement.w = scratchWidth
     }

     if (this.modelElement.h == null) {
        this.modelElement.h = scratchHeight
     } else if (scratchHeight > this.modelElement.h) {
        this.modelElement.y -= 0.5 * (scratchHeight - this.modelElement.h)
        this.modelElement.h = scratchHeight
     }

     this.domElement.style.width = `${Math.max(this.modelElement.w, Math.floor(scratchWidth))}px`
     this.domElement.style.height = `${this.modelElement.h}px`

     this.updateTransform()
  }
}

export class VisualizerView extends NodeView {
   unitSquarePositions /*: Array<THREE.Vector2> */
   lastZoom /*: float */
  /*::
   +modelElement: SheetModel.VisualizerElement
   +domElement: HTMLCanvasElement
  */
   constructor (view /*: View */, modelElement /*: SheetModel.VisualizerElement */, domElement /*: HTMLElement */) {
      super(view, modelElement, domElement)

      this.domElement.classList.add('VisualizerElement')
   }

  updateTransform () {
    const transformZoom = zoomFactor / this.lastZoom
    this.domElement.style.transform =  makeCssTransform(transformZoom, undefined, this.position.toGraphicUnits())
  }

  redraw () {
    this.lastZoom = zoomFactor
    this.updateTransform()
  }
}

export class CGView extends VisualizerView {
  /*::
    +modelElement: SheetModel.CGElement
    cgViewModel: any
  */
   constructor (view /*: View */, modelElement /*: SheetModel.CGElement */) {
      const cgViewModel = createLargeCycleGraphView(modelElement.group)
      if (modelElement.visualizer != null) {
         cgViewModel.model.fromJSON(modelElement.visualizer)
      }
      super(view, modelElement, cgViewModel.canvas)
      this.cgViewModel = cgViewModel
      this.redraw()
   }

  redraw () {
    super.redraw()

    this.cgViewModel.setSize(this.size.x * zoomFactor, this.size.y * zoomFactor)
    this.cgViewModel.showGraphic()

    this.unitSquarePositions = this.cgViewModel.unitSquarePositions()
  }
}

export class MTView extends VisualizerView {
  /*::
    +modelElement: SheetModel.MTElement
    mtViewModel: any
  */
   constructor (view /*: View */, modelElement /*: SheetModel.MTElement */) {
      const mtViewModel = createLargeMulttableView(modelElement.group)
      if (modelElement.visualizer != null) {
         mtViewModel.model.fromJSON(modelElement.visualizer)
      }
      super(view, modelElement, mtViewModel.canvas)
      this.mtViewModel = mtViewModel
      this.redraw()
   }

  redraw () {
    super.redraw()

    this.mtViewModel.setSize(this.size.x * zoomFactor, this.size.y * zoomFactor)
    this.mtViewModel.showGraphic()

    this.unitSquarePositions = this.mtViewModel.unitSquarePositions()
  }
}

export class CDView extends VisualizerView {
  /*::
    +modelElement: SheetModel.CDElement
  */
   constructor (view /*: View */, modelElement /*: SheetModel.CDElement */) {
      super(view, modelElement, document.createElement('canvas'))
      this.redraw()
   }

  redraw () {
    super.redraw()

    const size = this.size.clone().multiplyScalar(zoomFactor)

    this.domElement.setAttribute('width', size.width)
    this.domElement.setAttribute('height', size.height)

    const context = this.domElement.getContext('2d')
    const visualizer = this.modelElement.visualizer.cayleyDiagramView
    visualizer.setSize(size.width, size.height)
    visualizer.rescaleLines()
    visualizer.render()
    context.drawImage(visualizer.renderer.domElement, 0, 0)

    this.unitSquarePositions = visualizer.unitSquarePositions()
  }
}

const LINE_LEN = 40

class Arrow {
  /*::
    static PIXELS_PER_INCH: number
    line: HTMLCanvasElement
    head: HTMLCanvasElement
    lineWidth: float
    color: color
    highlightColor: color
  */
  constructor (container /*: HTMLElement */, lineWidth /*: number */ = 1, color /*: color */ = 'black') {
    this.line = document.createElement('canvas')
    this.line.setAttribute('width', `${LINE_LEN}px`)
    this.line.style.position = 'absolute'
    this.line.style.left = `-${LINE_LEN / 2}px`
    this.line.style.width = `${LINE_LEN}px`
    this.line.style.pointerEvents = 'auto'
    container.append(this.line)

    this.head = document.createElement('canvas')
    this.head.setAttribute('width', '90px')
    this.head.setAttribute('height', '31px')
    this.head.style.position = 'absolute'
    this.head.style.width = '90px'
    this.head.style.height = '31px'
    this.head.style.left = '-30px'
    this.head.style.top = '-16px'
    this.head.style.transformOrigin = '30px 16px'
    this.head.style.pointerEvents = 'auto'
    container.append(this.head)

    if (Arrow.PIXELS_PER_INCH == null) {
      this.line.style.height= '1in'
      Arrow.PIXELS_PER_INCH = this.line.getBoundingClientRect().height
    }

    this.drawBase(lineWidth, color)
  }

  drawBase (lineWidth /*: float */, color /*: color */) {
    if (this.lineWidth === lineWidth && this.line.getContext('2d').strokeStyle == color && this.highlightColor == null) {
      return
    }

    const ACTIVE_WIDTH = Math.ceil(Arrow.PIXELS_PER_INCH / 20) * 2
    const contextHeight = Math.max(ACTIVE_WIDTH, lineWidth)

    this.line.setAttribute('height', `${contextHeight}px`)
    this.line.style.height = `${contextHeight}px`
    this.line.style.top = `${-contextHeight / 2}px`
    this.line.style.transformOrigin = `${LINE_LEN / 2}px ${contextHeight / 2}px)`

    this.lineWidth = lineWidth
    this.color = color

    const lineContext = this.line.getContext('2d')
    lineContext.clearRect(0, 0, LINE_LEN, contextHeight)
    lineContext.strokeStyle = this.highlightColor || this.color
    lineContext.lineWidth = lineWidth
    lineContext.beginPath()
    lineContext.moveTo(0, Math.ceil(contextHeight / 2))
    lineContext.lineTo(LINE_LEN, Math.ceil(contextHeight / 2))
    lineContext.stroke()

    const headContext = this.head.getContext('2d')
    headContext.clearRect(0, 0, 90, 31)
    headContext.fillStyle = this.highlightColor || this.color
    headContext.beginPath()
    headContext.moveTo(0, 0)
    headContext.lineTo(90, 16)
    headContext.lineTo(0, 31)
    headContext.closePath()
    headContext.fill()
  }

  update (
    start /*: SheetUnits */,
    end /*: SheetUnits */,
    lineWidth /*: number */ = 1,
    headOffset /*: float */ = 1,
    color /*: color */ = 'black'
  ) {
    const FOUR = 4
    this.drawBase(lineWidth * FOUR, color)

    const hasArrowhead = (this.head.style.display !== 'none')
    const direction = end.clone().sub(start).normalize()

    // draw arrowhead halfway between source and destination edges, not halfway between centers
    if (hasArrowhead) {
      const lineLength = start.distanceTo(end)
      const headWidth = Math.sqrt(lineWidth * (lineWidth + 0.1 * lineLength)) + lineWidth
      const headLength = 3 * headWidth

      if (headOffset === 1) {
        const headFraction = headLength / lineLength
        end = new SheetUnits().lerpVectors(start, end, 1 - headFraction)
        headOffset = 1 + headFraction / (3 * (1 - headFraction))
      }

      const headScale = new THREE.Vector2(headLength / 90, headWidth / 31)
      const headCenter = new SheetUnits().lerpVectors(start, end, headOffset)

      this.head.style.transform = makeCssTransform(headScale, direction, headCenter)
    }

    const lineLength = start.distanceTo(end)
    const lineCenter = new SheetUnits().addVectors(start, end).multiplyScalar(0.5)
    const lineScale = new THREE.Vector2(lineLength / LINE_LEN, 1)
    this.line.style.transform =
        `matrix(${lineScale.x * direction.x}, ${lineScale.x * direction.y},
                ${-lineScale.y * direction.y / FOUR}, ${lineScale.y * direction.x / FOUR},
                ${lineCenter.x}, ${lineCenter.y})`
  }
}

export class LinkView extends SheetView {
  /*::
    +modelElement: SheetModel.LinkElement
  */
   constructor (view /*: View */, modelElement /*: SheetModel.LinkElement */) {
      super(view, modelElement)
      this.domElement.classList.add('LinkElement')
   }

  get destination () {
     return this.modelElement.destination
  }

  get destinationView () {
     return this.view.viewElements.get(this.destination.id)
  }

  get source () {
    return this.modelElement.source
  }

  get sourceView () {
     return this.view.viewElements.get(this.source.id)
  }

  getCrossingEndpoints () /*: [SheetUnits, SheetUnits] */ {
    const source = this.source
    const destination = this.destination

    const sourceSize = new LogicalUnits(source.w, source.h)
    const destinationSize = new LogicalUnits(destination.w, destination.h)
    const sourceCenter = new SheetUnits(source.x, source.y).addScaledVector(sourceSize, 0.5)
    const destinationCenter = new SheetUnits(destination.x, destination.y).addScaledVector(destinationSize, 0.5)

    const entryInterpolationFactor = Math.min(
      Math.abs(sourceSize.x / (2 * (destinationCenter.x - sourceCenter.x))),
      Math.abs(sourceSize.y / (2 * (destinationCenter.y - sourceCenter.y))))
    const entry =
      new SheetUnits().lerpVectors(sourceCenter, destinationCenter, entryInterpolationFactor)

    const exitInterpolationFactor = Math.min(
      Math.abs(destinationSize.x / (2 * (destinationCenter.x - sourceCenter.x))),
      Math.abs(destinationSize.y / (2 * (destinationCenter.y - sourceCenter.y))))
    const exit =
      new SheetUnits().lerpVectors(destinationCenter, sourceCenter, exitInterpolationFactor)

    return [entry, exit]
  }
}

/* Connector is constructed from a <div> containing a single Arrow */
export class ConnectingView extends LinkView {
  /*::
    +modelElement: SheetModel.ConnectingElement
    arrow: Arrow
  */
   constructor (view /*: View */, modelElement /*: SheetModel.ConnectingElement */) {
      super(view, modelElement)

      Graphic.append(this.domElement)

      this.arrow = new Arrow(this.domElement, modelElement.thickness, modelElement.color)

      this.redraw()

      this.updateTransform()
   }

  updateTransform () {
    this.domElement.style.transform = makeCssTransform(zoomFactor, undefined, new SheetUnits().toGraphicUnits())
  }

  redraw () {
    const start = this.sourceView.center
    const end = this.destinationView.center

    if (this.modelElement.hasArrowhead) {
      this.arrow.head.style.display = 'block'

      const headLocation = new SheetUnits().addVectors(...this.getCrossingEndpoints()).multiplyScalar(0.5)
      const headOffset = start.distanceTo(headLocation) / start.distanceTo(end)
      this.arrow.update(start, end, this.modelElement.thickness, headOffset, this.modelElement.color)
    } else {
      this.arrow.head.style.display = 'none'

      this.arrow.update(start, end, this.modelElement.thickness, undefined, this.modelElement.color)
    }
  }
}

/* MorphismElements are constructed from a <div> containing:
 *    a <div> showing text information about the morphism (like its name), and which serves as the selection target
 *    a single Arrow from the source group visualizer to the target (showManyArrows = false)
 *    an Array of Arrows from each element in the source visualizer to its mapping in the target (showManyArrows = true)
 */
export class MorphismView extends LinkView {
  /*::
    +modelElement: SheetModel.MorphismElement
    label: HTMLElement
    arrow: Arrow
    arrows: Array<Arrow>
    position: SheetUnits
    labelContent: html
  */
   constructor (view /*: View */, modelElement /*: SheetModel.MorphismElement */) {
      super(view, modelElement)

      this.domElement.style.pointerEvents = 'none'

      this.label = document.createElement('div')
      this.label.style.width = 'auto'
      this.label.style.height = 'auto'
      this.label.style.backgroundColor = 'white'
      this.label.style.border = '2px solid black'
      this.label.style.padding = '5px 10px'
      this.label.style.color = 'black'
      this.label.style.fontSize = '16px'
      this.label.style.textAlign = 'center'
      this.label.style.whiteSpace = 'nowrap'
      this.label.style.position = 'absolute'
      this.label.style.pointerEvents = 'auto'
      this.label.style.transformOrigin = 'top left'
      this.label.style.zIndex = 1
      this.domElement.append(this.label)

      this.redraw()
   }

  updateTransform () {
    const source = this.source
    const destination = this.destination
    this.position = new SheetUnits(Math.min(source.x, destination.x), Math.min(source.y, destination.y))

    this.domElement.style.transform = makeCssTransform(zoomFactor, undefined, this.position.toGraphicUnits())
  }

  redraw () {
    this.updateTransform()

    this.drawLabel()

    if (this.modelElement.showManyArrows) {
      this.drawManyLines()
    } else {
      this.drawSingleLine()
    }
  }

  drawLabel () {
    const modelLabel = this.getLabel()
    if (this.labelContent !== modelLabel) {
      this.labelContent = modelLabel
      this.label.innerHTML = modelLabel
    }

    const [entry, exit] = this.getCrossingEndpoints().map((v) => v.sub(this.position))
    const center = new SheetUnits().addVectors(entry, exit).multiplyScalar(0.5)
    const labelSize = new LogicalUnits(this.label.offsetWidth, this.label.offsetHeight) // note label size is as zoomed
    const topLeftCorner = center.clone().addScaledVector(labelSize, -0.5)

    this.label.style.transform = makeCssTransform(1, undefined, topLeftCorner)
  }

  getLabel () /*: string */ {
    let html = this.modelElement.name
    if (this.modelElement.showDomainAndCodomain) {
      html += ` : ${this.modelElement.source.group.name} ⟶ ${this.modelElement.destination.group.name}`
    }

    if (this.modelElement.showDefiningPairs) {
      html += this.modelElement.mapping
       ?.definingPairs
        .map(([g, h]) => {
          return `<br>${this.name}(${this.source.group.representation[g]}) = ${this.destination.group.representation[h]}`
        })
        .join('')
    }

    if (this.modelElement.showInjectionSurjection) {
      html += '<br>' + (this.modelElement.mapping?.isInjective ? '' : 'not ') + '1-1'
      html += '<br>' + (this.modelElement.mapping?.isSurjective ? '' : 'not ') + 'onto'
    }

    return html
  }

  drawSingleLine () {
    const LINE_WIDTH = 4
    const LINE_COLOR = 'black'

    // create main arrow if it doesn't exist
    if (this.arrow === undefined) {
      this.arrow = new Arrow(this.domElement, LINE_WIDTH, LINE_COLOR)
    }

    // make sure to display arrow
    this.arrow.line.style.display = 'block'
    this.arrow.head.style.display = 'block'

    // hide mapping arrows, if they exist and aren't hidden
    if (this.arrows !== undefined && this.arrows[0].line.style.display !== 'none') {
      for (const { line, head } of this.arrows.values()) {
        line.style.display = 'none'
        head.style.display = 'none'
      }
    }

    // make sure z-index of main arrow is under starting visualizer to terminate it cleanly
    this.domElement.style.zIndex = this.modelElement.z

    const [enter, exit] = this.getCrossingEndpoints().map((v) => v.sub(this.position))
    const lineLength = enter.distanceTo(exit)
    const padding = LINE_WIDTH + 0.5 * Math.sqrt(0.1 * LINE_WIDTH * lineLength)
    const paddingRatio = padding / lineLength
    const start = new SheetUnits().lerpVectors(enter, exit, -paddingRatio)
    this.arrow.update(start, exit, LINE_WIDTH, undefined, LINE_COLOR)
  }

  drawManyLines () {
    const LINE_COLOR = 'black'

    const source = ((this.source /*: any */) /*: SheetModel.VisualizerElement */)
    const destination = ((this.destination /*: any */) /*: SheetModel.VisualizerElement */)

    const LINE_WIDTH = Math.max(Math.min(Math.min(source.w, destination.w) / 200, 2), 1)

    // create mapping arrows if they don't exist
    if (this.arrows === undefined) {
      this.arrows = Array.from(
        { length: ((source /*: any */) /*: SheetModel.VisualizerElement */).group.order },
        () => new Arrow(this.domElement, LINE_WIDTH, LINE_COLOR)
      )
    }

    // display mapping arrows if they're hidden
    if (this.arrows[0].line.style.display === 'none') {
      this.arrows.forEach((arrow) => {
        arrow.line.style.display = 'block'
        arrow.head.style.display = 'block'
      })
    }

    // hide main arrow, if it exists
    if (this.arrow != null) {
      this.arrow.line.style.display = 'none'
      this.arrow.head.style.display = 'none'
    }

    // make sure z-index of arrows displays them on top of the visualizers
    this.domElement.style.zIndex = this.modelElement.z

    // get mapping
    const mapping = this.modelElement.mapping.fullMapping

    // get unitSquarePosition for source and destination visualizers
    // (adjust for using top row of source, destination multtables)
    const sources = (this.modelElement.useMulttableSourceTopRow)
      ? this.sourceView.unitSquarePositions
          .map((pos, _inx, arr) => new THREE.Vector2(arr[0].x + pos.y - arr[0].y, arr[0].y))
      : this.sourceView.unitSquarePositions
    const destinations = (this.modelElement.useMulttableDestinationTopRow)
      ? this.destinationView.unitSquarePositions
          .map((pos, _inx, arr) => new THREE.Vector2(arr[0].x + pos.y - arr[0].y, arr[0].y))
      : this.destinationView.unitSquarePositions

    // get transforms from visualizer unit squares to sheet
    const sourceRect = this.sourceView.rect
    const sourceToSheet = new THREE.Matrix3().set(
      sourceRect.width, 0, sourceRect.left - this.position.x,
      0, sourceRect.height, sourceRect.top - this.position.y,
      0, 0, 1)

    const destinationRect = this.destinationView.rect
    const destinationToSheet = new THREE.Matrix3().set(
      destinationRect.width, 0, destinationRect.left - this.position.x,
      0, destinationRect.height, destinationRect.top - this.position.y,
      0, 0, 1)

    // get offset distance for arrowMargin
    let offsetDistance = 0
    if (this.modelElement.arrowMargin !== 0) {
      const sourceCenter = source.position.clone().addScaledVector(source.size, 0.5)
      const destinationCenter = destination.position.clone().addScaledVector(destination.size, 0.5)
      const centerToCenter = sourceCenter.sub(destinationCenter).length()
      offsetDistance = this.modelElement.arrowMargin * centerToCenter
    }

    // update arrow from each source group element
    for (let inx = 0; inx < source.group.order; inx++) {
      // for each source & destination, transform from visualizer unit square to sheet
      let start = new SheetUnits(...sources[inx].toArray()).applyMatrix3(sourceToSheet)
      let end = new SheetUnits(...destinations[mapping[inx]].toArray()).applyMatrix3(destinationToSheet)

      // adjust start & end if there is an offset
      if (offsetDistance !== 0) {
        const offsetPercentage = offsetDistance / start.distanceTo(end);
        // $FlowFixMe -- syntax unsupported by Flow
        [start, end] = [
          new SheetUnits().lerpVectors(start, end, offsetPercentage),
          new SheetUnits().lerpVectors(end, start, offsetPercentage)
        ]
      }

      // color arrows as needed
      let arrowColor
      if (this.modelElement.arrowColor != 'none') {
         let highlightColor
         if (this.modelElement.arrowColor == 'source') {
            highlightColor = this.modelElement.source.visualizer?.highlightColors?.[0]?.[inx]
         } else {
            const destinationIndex = this.modelElement.mapping.image[inx]
            highlightColor = this.modelElement.destination.visualizer?.highlightColors?.[0]?.[destinationIndex]
         }

         if (highlightColor == null) {
            arrowColor = LINE_COLOR
         } else {
            // if element is highlighted, make sure the color isn't too light
            let color = new THREE.Color(highlightColor)
            const hsl = color.getHSL({})
            arrowColor = '#' + color.setHSL(hsl.h, hsl.s, .15).getHexString()
         }
      }

      // update arrows
      this.arrows[inx].update(start, end, LINE_WIDTH, undefined, arrowColor)
    }
  }
}

// Draw black cross with 100px arms at (x, y) pixels in domElement
export function testCross (
  x /*: float */,
  y /*: float */,
  domElement /*: HTMLElement */ = Graphic,
  color /*: color */ = 'black'
) /*: HTMLCanvasElement */ {
  const canvas = document.createElement('canvas')
  canvas.classList.add('TestCross')
  canvas.style.position = 'absolute'
  canvas.style.pointerEvents = 'none'
  canvas.style.left = 0
  canvas.style.top = 0
  canvas.setAttribute('width', '200px')
  canvas.setAttribute('height', '200px')
  canvas.style.transform = `translate(${x - 100}px, ${y - 100}px)`
  canvas.style.zIndex = 10000
  canvas.style.backgroundColor = 'rgba(0,0,0,0)'
  domElement.append(canvas)

  const context = canvas.getContext('2d')
  context.lineWidth = 1
  context.strokeStyle = color
  context.beginPath()
  context.moveTo(0, 100)
  context.lineTo(200, 100)
  context.moveTo(100, 0)
  context.lineTo(100, 200)
  context.stroke()

  return canvas
}

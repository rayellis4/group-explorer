/* @flow

# SheetView

The View part of the Sheet Model-View-Controller structure.

```javascript
 */
/* global DOMRect MouseEvent ResizeObserver TouchEvent Touch */

import { THREE } from '../lib/externals.js'
import {CayleyDiagramModel} from './CayleyDiagramModel.js'
import {layoutCayleyDiagram, getDefaultStrategies} from './CayleyDiagramGenerator.js'
import {createStaticCayleyDiagramView} from './CayleyDiagramView.js'
import {CycleGraphModel} from './CycleGraphModel.js'
import {createLargeCycleGraphView} from './CycleGraphView.js'
import {createModelProxy} from './GEUtils.js'
import {MulttableModel} from './MulttableModel.js'
import {createLargeMulttableView} from './MulttableView.js'

let Graphic /*: HTMLElement */ = null
export let graphicRect /*: DOMRect */ = new DOMRect(0, 0, 0, 0)
let PixelsPerModelUnit /*: float */ = 0
export let zoomFactor /*: float */ = 1
let panVector /*: THREE.Vector2 */ // pan offset in graphic pixels
let _view /*: ?View */ = null  // set by View constructor; used by module-level functions


export function init () {
  Graphic = document.getElementById('graphic')
  graphicRect = ((Graphic.getBoundingClientRect() /*: any */) /*: DOMRect */)
  PixelsPerModelUnit = Math.min(graphicRect.width, graphicRect.height)
  panVector = new THREE.Vector2()

  new ResizeObserver((entries) => {
    if (entries.findIndex((entry) => entry.target.id === 'graphic') !== -1) {
      graphicRect = ((Graphic.getBoundingClientRect() /*: any */) /*: DOMRect */)
    }
  }).observe(document.getElementById('graphic'))
}

// Model coordinates: the coordinate system the sheet model uses (pre-zoom, pre-pan,
// relative to #graphic origin). All SheetElement positions are stored in these units.
// Display coordinates: graphic-relative pixels as positioned by CSS transforms
// (post-zoom, post-pan, relative to #graphic origin).

function graphicCenter () /*: THREE.Vector2 */ {
  return new THREE.Vector2(graphicRect.width, graphicRect.height).multiplyScalar(0.5)
}

export function modelToDisplay (pt /*: THREE.Vector2 */) /*: THREE.Vector2 */ {
  const center = graphicCenter()
  return pt.clone().sub(center).multiplyScalar(zoomFactor).add(center).add(panVector)
}

export function displayToModel (pt /*: THREE.Vector2 */) /*: THREE.Vector2 */ {
  const center = graphicCenter()
  return pt.clone().sub(panVector).sub(center).multiplyScalar(1 / zoomFactor).add(center)
}

export function fromEvent (
  event /*: MouseEvent | TouchEvent | Touch */
) /*: THREE.Vector2 */ {
  let windowX, windowY
  if (   event instanceof MouseEvent
      || (typeof Touch !== 'undefined' && event instanceof Touch)
  ) {
    windowX = event.clientX
    windowY = event.clientY
  } else if (typeof TouchEvent !== 'undefined' && event instanceof TouchEvent) {
    if (event.type === 'touchend') {
      windowX = event.changedTouches[0].clientX
      windowY = event.changedTouches[0].clientY
    } else if (event.touches.length === 1) {
      windowX = event.touches[0].clientX
      windowY = event.touches[0].clientY
    } else { // average position of touches
      ;[windowX, windowY] = Array.from(event.touches)
        .reduce(([x, y], touch) => [x + touch.clientX, y + touch.clientY], [0, 0])
        .map((pos) => pos / event.touches.length)
    }
  }
  return displayToModel(new THREE.Vector2(windowX - graphicRect.x, windowY - graphicRect.y))
}

// pan Sheet by {dx, dy} display pixels
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

function redrawNodes () {
  _view?.viewElements.forEach((viewEl) => {
    if (viewEl.modelElement?.isNode) viewEl.redraw()
  })
}

export function redrawLinksFor (modelElement /*: SheetModel.NodeElement */) {
  _view?.viewElements.forEach((viewEl) => {
    if (   viewEl.modelElement?.isLink
        && (   viewEl.modelElement.source?.id === modelElement.id
            || viewEl.modelElement.destination?.id === modelElement.id)) {
      viewEl.redraw()
    }
  })
}

function makeCssTransform (
  scale /*: THREE.Vector2 | float */ = new THREE.Vector2(1, 1),
  direction /*: THREE.Vector2 */ = new THREE.Vector2(1, 0),
  position /*: THREE.Vector2 */ = new THREE.Vector2() // display coords, or model coords within a zoomed container
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

   viewportOrigin () /*: THREE.Vector2 */ {
      return displayToModel(new THREE.Vector2(0, 0))
   }

   viewportScale () /*: float */ {
      return Math.min(graphicRect.width, graphicRect.height) / zoomFactor
   }

   addElement (modelElement) {
      let newElement
      switch (modelElement.className) {
      case 'TextElement':        newElement = new TextView(this, modelElement);        break
      case 'CDElement':          newElement = new CDView(this, modelElement);          break
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
      this.viewElements.delete(modelElement.id)
   }

   clear () {
      this.viewElements.forEach((sheetViewElement) => {
         sheetViewElement.destroy()
      })
      this.viewElements.clear()
   }

   moveElement (modelElement) {
      this.viewElements.get(modelElement.id)?.updateTransform()
      this.#redrawLinks(modelElement)
   }

   resizeElement (modelElement) {
      this.viewElements.get(modelElement.id)?.redraw()
      this.#redrawLinks(modelElement)
   }

   getVisualizerJSON (modelElement) {
      const viewElement = this.viewElements.get(modelElement.id)
      return viewElement.getVisualizerJSON()
   }

   updateVisualizer (modelElement, json) {
      const viewElement = this.viewElements.get(modelElement.id)
      viewElement.updateFromJSON(json)
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

class SheetView {
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

class NodeView extends SheetView {
  /*::
    +modelElement: SheetModel.NodeElement
  */
   constructor (view /*: View */, modelElement /*: SheetModel.NodeElement */, domElement /*: HTMLElement */) {
      super(view, modelElement, domElement)

      this.domElement.classList.add('draggable')
      this.domElement.classList.add('NodeElement')
   }

   get center () /*: THREE.Vector2 */ {
      return this.position.addScaledVector(this.size, 0.5)
  }

  get rect () /*: DOMRect */ {
    return new DOMRect(...this.position.toArray(), ...this.size.toArray())
  }

  get position () /*: THREE.Vector2 */ {
     return new THREE.Vector2(this.modelElement.x, this.modelElement.y)
  }

  get size () /*: THREE.Vector2 */ {
     return new THREE.Vector2(this.modelElement.w, this.modelElement.h)
  }
}

class TextView extends NodeView {
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
    this.domElement.style.transform = makeCssTransform(zoomFactor, undefined, modelToDisplay(this.position))
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

     if (this.modelElement.isPlainText) {
        contentElement.textContent = this.modelElement.text
     } else {
        contentElement.innerHTML = this.modelElement.text
     }

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
     if (!this.modelElement.w || scratchWidth > this.modelElement.w) {
        this.modelElement.w = scratchWidth
     }

     if (this.modelElement.h == null || scratchHeight > this.modelElement.h) {
        this.modelElement.h = scratchHeight
     }

     this.domElement.style.width = `${Math.max(this.modelElement.w, Math.floor(scratchWidth))}px`
     this.domElement.style.height = `${this.modelElement.h}px`

     this.updateTransform()
  }
}

class VisualizerView extends NodeView {
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
    this.domElement.style.transform =  makeCssTransform(transformZoom, undefined, modelToDisplay(this.position))
  }

  redraw () {
    this.lastZoom = zoomFactor
    this.updateTransform()

    this.visualizer.setSize(this.size.x * zoomFactor, this.size.y * zoomFactor)
    this.visualizer.showGraphic()

    this.unitSquarePositions = this.visualizer.unitSquarePositions()
  }

  updateFromJSON (json) {
    this.visualizer.fromJSON(json)
    this.redraw()
  }

  restoreHighlights (snapshot) {
    this.modelElement.highlightColors[0] = snapshot
    this.redraw()
  }

  get highlightModelProxy () {
    if (this._highlightSubscriber == null) {
      let debounceTimer = null
      this._highlightSubscriber = {
        update: (field, value) => {
          if (field === 'highlightColors' || (field === 'highlightControl' && value?.nextId != null)) {
            clearTimeout(debounceTimer)
            debounceTimer = setTimeout(() => {
              this.modelElement.onVisualizerChange?.(this.modelElement.getVisualizerJSON?.())
            }, 100)
          }
        }
      }
      this.visualizer.model.$subscribe(this._highlightSubscriber, 'highlightColors')
      this.visualizer.model.$subscribe(this._highlightSubscriber, 'highlightControl')
    }
    return this.visualizer.model
  }

  getVisualizerJSON () {
    return this.visualizer.toJSON()
  }
}

class CGView extends VisualizerView {
  /*::
    +modelElement: SheetModel.CGElement
  */
   constructor (view /*: View */, modelElement /*: SheetModel.CGElement */) {
      const cgModel = createModelProxy(new CycleGraphModel(modelElement.group))
      if (modelElement.highlightColors != null) {
         cgModel.highlightColors = modelElement.highlightColors
      }
      if (modelElement.visualizer != null) {
         cgModel.fromJSON(modelElement.visualizer)
      }
      const cgViewModel = createLargeCycleGraphView(cgModel)

      super(view, modelElement, cgViewModel.canvas)

      this.cgViewModel = cgViewModel
      this.redraw()
   }

   get visualizer () {
      return this.cgViewModel
   }
}

class MTView extends VisualizerView {
  /*::
    +modelElement: SheetModel.MTElement
  */
   constructor (view /*: View */, modelElement /*: SheetModel.MTElement */) {
      const mtModel = createModelProxy(new MulttableModel(modelElement.group))
      if (modelElement.highlightColors != null) {
         mtModel.highlightColors = modelElement.highlightColors
      }
      if (modelElement.organizingSubgroup != null) {
         mtModel.organizingSubgroup = modelElement.organizingSubgroup
      }
      if (modelElement.separation != null) {
         mtModel.separation = modelElement.separation
      }
      if (modelElement.visualizer != null) {
         mtModel.fromJSON(modelElement.visualizer)
      }
      const mtViewModel = createLargeMulttableView(mtModel)

      super(view, modelElement, mtViewModel.canvas)

      this.mtViewModel = mtViewModel
      this.redraw()
   }

   get visualizer () {
      return this.mtViewModel
   }
}

class CDView extends VisualizerView {
   savedVisualizerJSON

   static #sharedViewModel /*: CayleyDiagramViewModel */ = null
   static #activeView /*: ?CDView */ = null

   constructor (view /*: View */, modelElement /*: SheetModel.CDElement */) {
      super(view, modelElement, document.createElement('canvas'))
      this.redraw()
   }

   // Initialize cdViewModel from this element's stored visualizer (or generate a fresh layout).
   #initFromVisualizer (cdViewModel) {
      const group = this.modelElement.group
      const visualizer = this.modelElement.visualizer

      if (visualizer?.view_state != null) {  // restore stored layout
         cdViewModel.model.fromJSON(visualizer)
      } else {  // passed sheet, SheetControl panel
         cdViewModel.model.highlightColors = this.modelElement.highlightColors

         // create diagramControl with default values, if needed
         if (this.modelElement.diagramControl == null)  {
            const generatedStrategyParameters = getDefaultStrategies(group)
            const layout = layoutCayleyDiagram(group, generatedStrategyParameters)
            const arrowGeneratorMap = new Map()
            layout.arrows.forEach((arrow) => {
               arrowGeneratorMap.set(arrow.generator, {generator: arrow.generator, color: arrow.color})
            })
            const arrowGenerators = Array.from(arrowGeneratorMap.values())
            this.modelElement.diagramControl = {
               strategy_parameters: generatedStrategyParameters,
               arrow_generators: arrowGenerators
            }
         }

         // create cdViewModel layout from diagramControl parameters
         const diagramControl = cdViewModel.model.diagramControl = this.modelElement.diagramControl
         if ('strategy_parameters' in diagramControl || 'arrow_generators' in diagramControl) {
            cdViewModel.draw(group, diagramControl.strategy_parameters, diagramControl.arrow_generators)
         } else if ('diagram_name' in diagramControl) {
            cdViewModel.draw(group, diagramControl.diagram_name)
         }
      }

      return cdViewModel.toJSON()
   }

   // swap our json into shared visualizer and use it to draw diagram
   // check the case where we delete the element holding the shared view model
   get visualizer () {
      if (CDView.#activeView == this) {
         return CDView.#sharedViewModel
      }

      if (CDView.#sharedViewModel == null) {  // no shared view model -- create one from this.modelElement
         const cdModel = createModelProxy(new CayleyDiagramModel(this.modelElement.group))
         const cdViewModel = createStaticCayleyDiagramView(cdModel)
         this.savedVisualizerJSON = this.#initFromVisualizer(cdViewModel)
         CDView.#sharedViewModel = cdViewModel
      } else {  // have a shared view model
         if (CDView.#activeView != null) {
            CDView.#activeView.savedVisualizerJSON = CDView.#sharedViewModel.toJSON()
         }
         if (this.savedVisualizerJSON == null) { // first time through
            const visualizer = this.modelElement.visualizer  // remove after use? it's no longer golden
            if (  CDView.#sharedViewModel.group == this.modelElement.group
               && visualizer?.view_state == null
               && this.modelElement.diagramControl?.strategy_parameters == null
               && this.modelElement.highlightColors != null
            ) {  // fast path: same group, no stored layout — just apply highlights
               CDView.#sharedViewModel.model.highlightColors = this.modelElement.highlightColors
               this.savedVisualizerJSON = CDView.#sharedViewModel.toJSON()
            } else {  // clear shared visualizer set new parameters
               const cdViewModel = CDView.#sharedViewModel
               const cdModel = cdViewModel.model
               cdModel.reset()
               cdModel.highlightControl = null
               cdModel.diagramControl = null  // copy from this.modelElement.diagramControl?
               cdModel.group = this.modelElement.group
               this.savedVisualizerJSON = this.#initFromVisualizer(cdViewModel)
            }
         } else if (
            CDView.#sharedViewModel.group == this.modelElement.group
            && this.modelElement.visualizer?.view_state == null
            && this.modelElement.diagramControl?.strategy_parameters == null
            && CDView.#activeView?.modelElement.visualizer?.view_state == null
            && CDView.#activeView?.modelElement.diagramControl?.strategy_parameters == null
         ) {  // fast path: same group, both elements clean — only update highlights
            CDView.#sharedViewModel.model.highlightColors = this.modelElement.highlightColors
         } else {
            CDView.#sharedViewModel.fromJSON(this.savedVisualizerJSON)
         }
      }

      CDView.#activeView = this
      return CDView.#sharedViewModel
   }

   get highlightModelProxy () {
      if (this._highlightModelProxy == null) {
         const visualizer = this.visualizer
         const model = createModelProxy(new CayleyDiagramModel(this.modelElement.group))
         model.highlightColors = [...visualizer.model.highlightColors]
         model.highlightControl = (visualizer.model.highlightControl?.toJSON == null)
            ? visualizer.model.highlightControl
            : visualizer.model.highlightControl.toJSON()
         // store subscriber on instance — WeakRef in createModelProxy would otherwise GC it
         this._highlightSubscriber = {
            update: (field, value) => {
               if (field === 'highlightColors') {
                  const visualizer = this.visualizer
                  visualizer.model.highlightColors = [...value]
                  visualizer.model.highlightControl = model.highlightControl.toJSON()
                  this.redraw()
                  redrawLinksFor(this.modelElement)
                  this.modelElement.onVisualizerChange?.(this.modelElement.getVisualizerJSON?.())
               } else if (field === 'highlightControl' && value?.nextId != null) {
                  // subset created/destroyed — write structure to live model without changing colors
                  this.visualizer.model.highlightControl = value.toJSON()
                  this.modelElement.onVisualizerChange?.(this.modelElement.getVisualizerJSON?.())
               }
            }
         }
         model.$subscribe(this._highlightSubscriber, 'highlightColors')
         model.$subscribe(this._highlightSubscriber, 'highlightControl')
         this._highlightModelProxy = model
      }
      return this._highlightModelProxy
   }

   updateFromJSON (json) {
      this.visualizer.fromJSON(json)
      if (this._highlightModelProxy != null) {
         const hc = this.visualizer.model.highlightControl
         this._highlightModelProxy.highlightControl.fromJSON(hc?.toJSON == null ? hc : hc.toJSON())
         this._highlightModelProxy.highlightColors = [...this.visualizer.model.highlightColors]
         // subscriber handles redraw
      } else {
         this.redraw()
      }
   }

   destroy () {
      if (CDView.#activeView == this) {
         CDView.#activeView = null
      }
      super.destroy()
   }

   redraw () {
      this.lastZoom = zoomFactor
      this.updateTransform()

      const size = this.size.clone().multiplyScalar(zoomFactor)

      this.visualizer.setSize(size.x, size.y)
      this.visualizer.view.rescaleLines()
      this.visualizer.showGraphic()

      this.domElement.setAttribute('width', size.x)
      this.domElement.setAttribute('height', size.y)
      const context = this.domElement.getContext('2d')
      context.drawImage(this.visualizer.view.canvas, 0, 0)

      this.unitSquarePositions = CDView.#sharedViewModel.unitSquarePositions()
   }

   restoreHighlights (snapshot) {
      this.modelElement.highlightColors[0] = snapshot
      if (CDView.#activeView === this) {
         CDView.#sharedViewModel.model.highlightColors = this.modelElement.highlightColors
         CDView.#sharedViewModel.model.$touch('highlightColors')
      } else {
         this.savedVisualizerJSON = null  // force fast path on next access (reads from modelElement)
      }
      this.redraw()
   }

   getVisualizerJSON () {
      const visualizerJSON = super.getVisualizerJSON()
      // diagramControl is initialization-only; bake it into the visualizer JSON once, then clear it
      if (this.modelElement.diagramControl != null) {
         visualizerJSON.diagram_control = this.modelElement.diagramControl
         delete this.modelElement.diagramControl
      }
      return visualizerJSON
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
    start /*: THREE.Vector2 */,  // model coords; container div is CSS-scaled by zoomFactor so these map correctly to display pixels
    end /*: THREE.Vector2 */,
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
        end = new THREE.Vector2().lerpVectors(start, end, 1 - headFraction)
        headOffset = 1 + headFraction / (3 * (1 - headFraction))
      }

      const headScale = new THREE.Vector2(headLength / 90, headWidth / 31)
      const headCenter = new THREE.Vector2().lerpVectors(start, end, headOffset)

      this.head.style.transform = makeCssTransform(headScale, direction, headCenter)
    }

    const lineLength = start.distanceTo(end)
    const lineCenter = new THREE.Vector2().addVectors(start, end).multiplyScalar(0.5)
    const lineScale = new THREE.Vector2(lineLength / LINE_LEN, 1)
    this.line.style.transform =
        `matrix(${lineScale.x * direction.x}, ${lineScale.x * direction.y},
                ${-lineScale.y * direction.y / FOUR}, ${lineScale.y * direction.x / FOUR},
                ${lineCenter.x}, ${lineCenter.y})`
  }
}

class LinkView extends SheetView {
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
     return this.view.viewElements.get(this.modelElement.source.id)
  }

  getCrossingEndpoints () /*: [THREE.Vector2, THREE.Vector2] */ {
    const source = this.source
    const destination = this.destination

    const sourceSize = new THREE.Vector2(source.w, source.h)
    const destinationSize = new THREE.Vector2(destination.w, destination.h)
    const sourceCenter = new THREE.Vector2(source.x, source.y).addScaledVector(sourceSize, 0.5)
    const destinationCenter = new THREE.Vector2(destination.x, destination.y).addScaledVector(destinationSize, 0.5)

    const entryInterpolationFactor = Math.min(
      Math.abs(sourceSize.x / (2 * (destinationCenter.x - sourceCenter.x))),
      Math.abs(sourceSize.y / (2 * (destinationCenter.y - sourceCenter.y))))
    const entry =
      new THREE.Vector2().lerpVectors(sourceCenter, destinationCenter, entryInterpolationFactor)

    const exitInterpolationFactor = Math.min(
      Math.abs(destinationSize.x / (2 * (destinationCenter.x - sourceCenter.x))),
      Math.abs(destinationSize.y / (2 * (destinationCenter.y - sourceCenter.y))))
    const exit =
      new THREE.Vector2().lerpVectors(destinationCenter, sourceCenter, exitInterpolationFactor)

    return [entry, exit]
  }
}

/* Connector is constructed from a <div> containing a single Arrow */
class ConnectingView extends LinkView {
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
    this.domElement.style.transform = makeCssTransform(zoomFactor, undefined, modelToDisplay(new THREE.Vector2()))
  }

  redraw () {
    const start = this.sourceView.center
    const end = this.destinationView.center

    if (this.modelElement.hasArrowhead) {
      this.arrow.head.style.display = 'block'

      const headLocation = new THREE.Vector2().addVectors(...this.getCrossingEndpoints()).multiplyScalar(0.5)
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
class MorphismView extends LinkView {
  /*::
    +modelElement: SheetModel.MorphismElement
    label: HTMLElement
    arrow: Arrow
    arrows: Array<Arrow>
    position: THREE.Vector2
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
      this.label.style.fontSize = modelElement.fontSize ?? '16px'
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
    this.position = new THREE.Vector2(Math.min(source.x, destination.x), Math.min(source.y, destination.y))

    this.domElement.style.transform = makeCssTransform(zoomFactor, undefined, modelToDisplay(this.position))
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
    const center = new THREE.Vector2().addVectors(entry, exit).multiplyScalar(0.5)
    const labelSize = new THREE.Vector2(this.label.offsetWidth, this.label.offsetHeight) // note label size is as zoomed
    const topLeftCorner = center.clone().addScaledVector(labelSize, -0.5)

    // topLeftCorner is in model coords; scale=1 is correct because the parent
    // container is already CSS-scaled by zoomFactor
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
          return `<br>${this.modelElement.name}(${this.source.group.representation[g]}) = ${this.destination.group.representation[h]}`
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
    const start = new THREE.Vector2().lerpVectors(enter, exit, -paddingRatio)
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
      const sourceCenter = source.viewElement.position.addScaledVector(source.viewElement.size, 0.5)
      const destinationCenter = destination.viewElement.position.addScaledVector(destination.viewElement.size, 0.5)
      const centerToCenter = sourceCenter.sub(destinationCenter).length()
      offsetDistance = this.modelElement.arrowMargin * centerToCenter
    }

    // update arrow from each source group element
    for (let inx = 0; inx < source.group.order; inx++) {
      // for each source & destination, transform from visualizer unit square to sheet
      let start = new THREE.Vector2(...sources[inx].toArray()).applyMatrix3(sourceToSheet)
      let end = new THREE.Vector2(...destinations[mapping[inx]].toArray()).applyMatrix3(destinationToSheet)

      // adjust start & end if there is an offset
      if (offsetDistance !== 0) {
        const offsetPercentage = offsetDistance / start.distanceTo(end);
        // $FlowFixMe -- syntax unsupported by Flow
        [start, end] = [
          new THREE.Vector2().lerpVectors(start, end, offsetPercentage),
          new THREE.Vector2().lerpVectors(end, start, offsetPercentage)
        ]
      }

      // color arrows as needed
      let arrowColor
      if (this.modelElement.arrowColor != 'none') {
         let highlightColor
         if (this.modelElement.arrowColor == 'source') {
            highlightColor = this.modelElement.source.viewElement.visualizer.model.highlightColors[0]?.[inx]
         } else {
            const destinationIndex = this.modelElement.mapping.image[inx]
            highlightColor = this.modelElement.destination.viewElement.visualizer.model.highlightColors[0]?.[destinationIndex]
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

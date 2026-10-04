// CayleyDiagramView tests -- headless, so no WebGLRenderer: createLines is run on a bare
// CayleyDiagramView prototype with stand-ins for the scene's spheres and the two line-drawing calls.

import {CayleyDiagramView, layoutToJSON} from '../js/CayleyDiagramView.js'
import {layoutCayleyDiagram} from '../js/CayleyDiagramGenerator.js'
import * as Library from '../js/Library.js'

// ---- fixtures ---------------------------------------------------------------

let Z3xZ3

before(async function () {
   this.timeout(5000)
   await Library.loadLibrary()
   Z3xZ3 = Library.getGroupByRef('../groups/Z_3 x Z_3.group')
})

// a view with just enough state for createLines: spheres for the layout's nodes, and line-drawing
// calls that record the offset each arrow was drawn with (null => straight)
function makeView (nodes, sphereRadius) {
   const view = Object.create(CayleyDiagramView.prototype)
   const spheres = nodes.map((node) => ({userData: {node}, scale: {x: sphereRadius}}))
   Object.defineProperty(view, 'nodes', {value: spheres})
   view.drawnOffsets = new Map()
   view.createStraightLine = function (arrow) { this.drawnOffsets.set(arrow, null) }
   view.createCurvedLine = function (arrow, offset) { this.drawnOffsets.set(arrow, offset) }
   return view
}

// ---- tests ------------------------------------------------------------------

describe('CayleyDiagramView', function () {

   // Regression: createLines used to write its sphere-avoidance offset back into each arrow -- the
   // same objects as the model's layout -- so the shared CDView model's layout no longer matched the
   // element's stored one and SheetView's canFastTrack failed (e.g. Z_3 x Z_3's wrap-around arrow).
   describe('createLines', function () {

      it('does not modify the layout it draws', function () {
         const {layout} = layoutCayleyDiagram(Z3xZ3)
         const before = JSON.stringify(layoutToJSON(layout))
         makeView(layout.nodes, 0.1).createLines(layout.arrows)
         expect(JSON.stringify(layoutToJSON(layout))).to.equal(before)
      })

      it('still curves an arrow with no offset around a sphere in its path', function () {
         const {layout} = layoutCayleyDiagram(Z3xZ3)
         const view = makeView(layout.nodes, 0.1)
         view.createLines(layout.arrows)
         const avoided = layout.arrows.filter((arrow) => arrow.offset == null && view.drawnOffsets.get(arrow) != null)
         expect(avoided.length).to.be.greaterThan(0)
      })

      it('draws an explicit offset as given, even if the arrow passes through a sphere', function () {
         const {layout} = layoutCayleyDiagram(Z3xZ3)
         const view = makeView(layout.nodes, 0.1)
         view.createLines(layout.arrows)
         const throughSphere = layout.arrows.find((arrow) => arrow.offset == null && view.drawnOffsets.get(arrow) != null)
         throughSphere.offset = 0   // as if the user dragged it straight
         view.createLines([throughSphere])
         expect(view.drawnOffsets.get(throughSphere)).to.equal(0)
      })

   })

})

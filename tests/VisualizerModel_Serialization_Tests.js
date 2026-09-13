import {CycleGraphModel} from '../js/CycleGraphModel.js'
import {MulttableModel} from '../js/MulttableModel.js'
import {CayleyDiagramModel} from '../js/CayleyDiagramModel.js'
import * as Library from '../js/Library.js'

// ---- fixtures ---------------------------------------------------------------

let Z2, S3

before(async function () {
   this.timeout(5000)
   await Library.loadLibrary()
   Z2 = Library.getGroupByURL('../groups/Z_2.group')
   S3 = Library.getGroupByURL('../groups/S_3.group')
})

// ---- helpers ----------------------------------------------------------------

// Minimal mock for an opaque control slot — has toJSON/fromJSON like the real thing
function makeMockControl (data) {
   return {
      data,
      toJSON () { return this.data },
      fromJSON (json) { this.data = json }
   }
}

// ---- tests ------------------------------------------------------------------

describe('Visualizer model serialization', function () {

   describe('CycleGraphModel', function () {

      it('toJSON has expected keys', function () {
         const model = new CycleGraphModel(S3)
         expect(model.toJSON()).to.have.all.keys('group_url', 'highlight_colors', 'highlight_control')
      })

      it('round-trips group_url — group is restored when deserializing into different group', function () {
         const model = new CycleGraphModel(S3)
         const model2 = new CycleGraphModel(Z2)
         model2.fromJSON(model.toJSON())
         expect(model2.group.URL).to.equal(S3.URL)
      })

      it('round-trips highlight_colors', function () {
         const model = new CycleGraphModel(S3)
         model.highlightColors = [['red', null, 'blue'], [], ['green']]
         const model2 = new CycleGraphModel(S3)
         model2.fromJSON(model.toJSON())
         expect(model2.highlightColors).to.deep.equal(model.highlightColors)
      })

      it('round-trips highlight_control opaque blob', function () {
         const model = new CycleGraphModel(S3)
         model.highlightControl = makeMockControl({type: 'highlight', subsets: [1, 2, 3]})
         const model2 = new CycleGraphModel(S3)
         model2.fromJSON(model.toJSON())
         expect(model2.highlightControl).to.deep.equal({type: 'highlight', subsets: [1, 2, 3]})
      })

   })

   describe('MulttableModel', function () {

      it('toJSON has expected keys', function () {
         const model = new MulttableModel(S3)
         expect(model.toJSON()).to.have.all.keys(
            'group_url', 'organizing_subgroup', 'separation',
            'coloration', 'color_reordering', 'elements', 'highlight_colors', 'highlight_control'
         )
      })

      it('round-trips group_url — group is restored when deserializing into different group', function () {
         const model = new MulttableModel(S3)
         const model2 = new MulttableModel(Z2)
         model2.fromJSON(model.toJSON())
         expect(model2.group.URL).to.equal(S3.URL)
      })

      it('round-trips scalar fields', function () {
         const model = new MulttableModel(S3)
         model.organizingSubgroup = 1
         model.separation = 0.5
         model.coloration = 'grayscale'
         model.colorReordering = 'elementColorsFixed'
         const model2 = new MulttableModel(S3)
         model2.fromJSON(model.toJSON())
         expect(model2.organizingSubgroup).to.equal(1)
         expect(model2.separation).to.equal(0.5)
         expect(model2.coloration).to.equal('grayscale')
         expect(model2.colorReordering).to.equal('elementColorsFixed')
      })

      it('round-trips elements ordering', function () {
         const model = new MulttableModel(S3)
         const reversed = [...S3.elements].reverse()
         model.elements = reversed
         const model2 = new MulttableModel(S3)
         model2.fromJSON(model.toJSON())
         expect(model2.elements).to.deep.equal(reversed)
      })

      it('round-trips highlight_control opaque blob', function () {
         const model = new MulttableModel(S3)
         model.highlightControl = makeMockControl({type: 'highlight', subsets: [4, 5]})
         const model2 = new MulttableModel(S3)
         model2.fromJSON(model.toJSON())
         expect(model2.highlightControl).to.deep.equal({type: 'highlight', subsets: [4, 5]})
      })

   })

   describe('CayleyDiagramModel', function () {

      it('toJSON has expected keys', function () {
         const model = new CayleyDiagramModel(S3)
         expect(model.toJSON()).to.have.all.keys(
            'group_url', 'background', 'fog_level', 'line_width', 'sphere_scale_factor',
            'zoom_level', 'arrowhead_placement', 'label_scale_factor', 'showing_axes',
            'highlight_colors', 'highlight_control', 'diagram_control', 'layout'
         )
      })

      it('round-trips group_url — group is restored when deserializing into different group', function () {
         const model = new CayleyDiagramModel(S3)
         const model2 = new CayleyDiagramModel(Z2)
         model2.fromJSON(model.toJSON())
         expect(model2.group.URL).to.equal(S3.URL)
      })

      it('round-trips scalar view parameters', function () {
         const model = new CayleyDiagramModel(S3)
         model.background = '#aabbcc'
         model.fog_level = 0.3
         model.line_width = 7
         model.sphere_scale_factor = 1.5
         model.zoom_level = 2
         model.arrowhead_placement = 0.8
         model.label_scale_factor = 1.2
         const model2 = new CayleyDiagramModel(S3)
         model2.fromJSON(model.toJSON())
         expect(model2.background).to.equal('#aabbcc')
         expect(model2.fog_level).to.equal(0.3)
         expect(model2.line_width).to.equal(7)
         expect(model2.sphere_scale_factor).to.equal(1.5)
         expect(model2.zoom_level).to.equal(2)
         expect(model2.arrowhead_placement).to.equal(0.8)
         expect(model2.label_scale_factor).to.equal(1.2)
      })

      it('round-trips showingAxes = true', function () {
         const model = new CayleyDiagramModel(S3)
         model.showingAxes = true
         const model2 = new CayleyDiagramModel(S3)
         model2.fromJSON(model.toJSON())
         expect(model2.showingAxes).to.be.true
      })

      it('showingAxes resets to false when absent from JSON', function () {
         const model = new CayleyDiagramModel(S3)
         model.showingAxes = true
         const json = model.toJSON()
         delete json.showing_axes
         const model2 = new CayleyDiagramModel(S3)
         model2.showingAxes = true
         model2.fromJSON(json)
         expect(model2.showingAxes).to.be.false
      })

      it('round-trips highlight_control opaque blob', function () {
         const model = new CayleyDiagramModel(S3)
         model.highlightControl = makeMockControl({type: 'highlight', colors: ['red', 'blue']})
         const model2 = new CayleyDiagramModel(S3)
         model2.fromJSON(model.toJSON())
         expect(model2.highlightControl).to.deep.equal({type: 'highlight', colors: ['red', 'blue']})
      })

      // Regression: SheetView's shared CayleyDiagramViewModel is reused across every CDElement
      // on a sheet -- fromJSON must clear highlightControl when the incoming JSON has none, not
      // leave whichever element previously held the shared model's highlightControl in place.
      it('clears highlight_control when absent from JSON, even with a live control already set', function () {
         const model = new CayleyDiagramModel(S3)
         model.highlightControl = makeMockControl({type: 'highlight', colors: ['red', 'blue']})
         const json = model.toJSON()
         delete json.highlight_control

         const model2 = new CayleyDiagramModel(S3)
         model2.highlightControl = makeMockControl({type: 'stale', colors: ['green']})
         model2.fromJSON(json)
         expect(model2.highlightControl).to.be.undefined
      })

      it('round-trips diagram_control opaque blob', function () {
         const model = new CayleyDiagramModel(S3)
         model.diagramControl = makeMockControl({strategy: 'circular', level: 2})
         const model2 = new CayleyDiagramModel(S3)
         model2.fromJSON(model.toJSON())
         expect(model2.diagramControl).to.deep.equal({strategy: 'circular', level: 2})
      })
   })

})

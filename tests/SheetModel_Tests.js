// Unit tests for SheetModel -- currently just CDElement.fromJSON's diagram_control/layout
// backfill, the fix for "a fresh sheet CDElement renders blank / opens with empty Generator and
// Arrow panels": SheetControl.addElement creates visualizerJSON as {group_url} alone, and this is
// the one place (called for every CDElement built from JSON, fresh or loaded) that ensures
// layout and, when nothing else was provided, diagram_control.strategy_parameters/arrow_generators
// come out populated and coherent with each other.

import { SheetModel, CDElement, translateRequest } from '../js/SheetModel.js'
import { getDefaultStrategies } from '../js/CayleyDiagramGenerator.js'
import * as Library from '../js/Library.js'

// ---- fixtures ---------------------------------------------------------------

let S3

before(async function () {
   this.timeout(5000)
   await Library.loadLibrary()
   S3 = Library.getGroupByURL('../groups/S_3.group')
})

function makeElement () {
   return new CDElement(new SheetModel(), '1')
}

// ---- tests ------------------------------------------------------------------

describe('SheetModel', function () {

   describe('CDElement.fromJSON', function () {

      it('backfills strategy_parameters, arrow_generators, and layout for a fresh element', function () {
         const element = makeElement()
         element.fromJSON({id: '1', className: 'CDElement', visualizerJSON: {group_url: S3.URL}})

         expect(element.visualizerJSON.diagram_control.strategy_parameters)
            .to.be.an('array').with.length.greaterThan(0)
         expect(element.visualizerJSON.diagram_control.arrow_generators)
            .to.be.an('array').with.length.greaterThan(0)
         expect(element.visualizerJSON.layout).to.not.be.undefined
      })

      it('does not touch an already-provided strategy_parameters', function () {
         const strategyParameters = getDefaultStrategies(S3)
         const element = makeElement()
         element.fromJSON({
            id: '1', className: 'CDElement',
            visualizerJSON: {group_url: S3.URL, diagram_control: {strategy_parameters: strategyParameters}}
         })

         // layout is still computed (it was missing), but the caller's own strategy is kept as-is
         expect(element.visualizerJSON.layout).to.not.be.undefined
         expect(element.visualizerJSON.diagram_control.strategy_parameters).to.equal(strategyParameters)
      })

      it('does not compute a layout at all for a named diagram (chunking/strategy do not apply)', function () {
         const group = Library.getAllGroups().find((g) => g.cayleyDiagrams.length > 0)
         if (group == null) { return this.skip() }
         const element = makeElement()
         element.fromJSON({
            id: '1', className: 'CDElement',
            visualizerJSON: {group_url: group.URL, diagram_control: {diagram_name: group.cayleyDiagrams[0].name}}
         })

         expect(element.visualizerJSON.layout).to.not.be.undefined
         expect(element.visualizerJSON.diagram_control.strategy_parameters).to.be.undefined
      })

      it('leaves an already-computed layout alone', function () {
         const element = makeElement()
         element.fromJSON({id: '1', className: 'CDElement', visualizerJSON: {group_url: S3.URL}})
         const firstLayout = element.visualizerJSON.layout

         const element2 = makeElement()
         element2.fromJSON({id: '1', className: 'CDElement', visualizerJSON: element.visualizerJSON})
         expect(element2.visualizerJSON.layout).to.equal(firstLayout)
      })

   })

   // Regression: arrow_generators applies whichever CD variant (named diagram or generated
   // strategy) is requested, but used to be threaded through only when strategy_parameters was
   // also given -- a request naming only arrow_generators silently lost them.
   describe('translateRequest', function () {

      const arrowGenerators = [{generator: 1, color: '#ff0000'}]

      it('carries arrow_generators through when it is the only CDElement field given', function () {
         const [result] = translateRequest(
            [{className: 'CDElement', groupURL: S3.URL, arrow_generators: arrowGenerators}])
         expect(result.visualizerJSON.diagram_control).to.deep.equal({arrow_generators: arrowGenerators})
      })

      it('carries arrow_generators through alongside diagram_name', function () {
         const [result] = translateRequest(
            [{className: 'CDElement', groupURL: S3.URL, diagram_name: 'foo', arrow_generators: arrowGenerators}])
         expect(result.visualizerJSON.diagram_control).to.deep.equal({diagram_name: 'foo', arrow_generators: arrowGenerators})
      })

      it('carries arrow_generators through alongside strategy_parameters', function () {
         const strategyParameters = getDefaultStrategies(S3)
         const [result] = translateRequest(
            [{className: 'CDElement', groupURL: S3.URL, strategy_parameters: strategyParameters, arrow_generators: arrowGenerators}])
         expect(result.visualizerJSON.diagram_control).to.deep.equal({strategy_parameters: strategyParameters, arrow_generators: arrowGenerators})
      })

      it('leaves diagram_control unset when nothing CD-specific was given', function () {
         const [result] = translateRequest([{className: 'CDElement', groupURL: S3.URL}])
         expect(result.visualizerJSON.diagram_control).to.be.undefined
      })

   })

})

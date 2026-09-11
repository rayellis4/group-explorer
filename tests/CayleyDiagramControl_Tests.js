import {addControl} from '../js/CayleyDiagramControl.js'
import {createModelProxy} from '../js/GEUtils.js'
import * as Library from '../js/Library.js'

// ---- fixtures ---------------------------------------------------------------

let S3

before(async function () {
   this.timeout(5000)
   await Library.loadLibrary()
   S3 = Library.getGroupByURL('../groups/S_3.group')
})

// ---- helpers ----------------------------------------------------------------

function makeModel (group) {
   return createModelProxy({group, layout: null, diagramControl: null})
}

// ---- tests ------------------------------------------------------------------

describe('CayleyDiagramControl', function () {

   let model, rootElement

   beforeEach(function () {
      model = makeModel(S3)
      rootElement = document.createElement('div')
      document.body.appendChild(rootElement)
   })

   afterEach(function () {
      document.body.removeChild(rootElement)
   })

   describe('addControl — initialization', function () {

      it('registers ViewModel as model.diagramControl', function () {
         addControl(rootElement, model)
         expect(model.diagramControl).to.not.be.null
      })

      it('sets model.layout on initialization', function () {
         addControl(rootElement, model)
         expect(model.layout).to.not.be.null
         expect(model.layout).to.include.keys('pov', 'nodes', 'arrows')
      })

      it('initial node count equals group order', function () {
         addControl(rootElement, model)
         expect(model.layout.nodes.length).to.equal(S3.order)
      })

      it('initial arrowGenerators is a non-empty array', function () {
         addControl(rootElement, model)
         expect(model.diagramControl.arrowGenerators).to.be.an('array').with.length.greaterThan(0)
      })

      it('default rightMultiply is true', function () {
         addControl(rootElement, model)
         expect(model.diagramControl.rightMultiply).to.be.true
      })

   })

   describe('ViewModel.addArrow', function () {

      it('increases arrowGenerators count', function () {
         addControl(rootElement, model)
         const vm = model.diagramControl
         const before = vm.arrowGenerators.length
         const notGenerator = S3.elements.find(
            (el) => el !== 0 && !vm.arrowGenerators.some((ag) => ag.generator === el)
         )
         if (notGenerator == null) { return this.skip() }
         vm.addArrow(notGenerator)
         expect(vm.arrowGenerators.length).to.equal(before + 1)
      })

      it('is idempotent — adding the same element twice does not duplicate', function () {
         addControl(rootElement, model)
         const vm = model.diagramControl
         const gen = vm.arrowGenerators[0].generator
         vm.addArrow(gen)
         expect(vm.arrowGenerators.filter((ag) => ag.generator === gen).length).to.equal(1)
      })

      it('newly added arrow appears in model.layout.arrows', function () {
         addControl(rootElement, model)
         const vm = model.diagramControl
         const notGenerator = S3.elements.find(
            (el) => el !== 0 && !vm.arrowGenerators.some((ag) => ag.generator === el)
         )
         if (notGenerator == null) { return this.skip() }
         vm.addArrow(notGenerator)
         const generators = model.layout.arrows.map((a) => a.generator)
         expect(generators).to.include(notGenerator)
      })

   })

   describe('ViewModel.removeArrow', function () {

      it('decreases arrowGenerators count', function () {
         addControl(rootElement, model)
         const vm = model.diagramControl
         const gen = vm.arrowGenerators[0].generator
         const before = vm.arrowGenerators.length
         vm.removeArrow(gen)
         expect(vm.arrowGenerators.length).to.equal(before - 1)
      })

      it('removed generator no longer appears in arrowGenerators', function () {
         addControl(rootElement, model)
         const vm = model.diagramControl
         const gen = vm.arrowGenerators[0].generator
         vm.removeArrow(gen)
         expect(vm.arrowGenerators.map((ag) => ag.generator)).to.not.include(gen)
      })

      it('triggers layout update — model.layout is replaced', function () {
         addControl(rootElement, model)
         const vm = model.diagramControl
         const gen = vm.arrowGenerators[0].generator
         const layoutBefore = model.layout
         vm.removeArrow(gen)
         expect(model.layout).to.not.equal(layoutBefore)
      })

   })

   describe('ViewModel.setRightMultiply', function () {

      it('setRightMultiply(false) updates rightMultiply flag', function () {
         addControl(rootElement, model)
         const vm = model.diagramControl
         vm.setRightMultiply(false)
         expect(vm.rightMultiply).to.be.false
      })

      it('setRightMultiply(true) restores rightMultiply flag', function () {
         addControl(rootElement, model)
         const vm = model.diagramControl
         vm.setRightMultiply(false)
         vm.setRightMultiply(true)
         expect(vm.rightMultiply).to.be.true
      })

      it('triggers layout update — model.layout is replaced', function () {
         addControl(rootElement, model)
         const vm = model.diagramControl
         const layoutBefore = model.layout
         vm.setRightMultiply(false)
         expect(model.layout).to.not.equal(layoutBefore)
      })

      it('node count is unchanged after setRightMultiply', function () {
         addControl(rootElement, model)
         const vm = model.diagramControl
         vm.setRightMultiply(false)
         expect(model.layout.nodes.length).to.equal(S3.order)
      })

   })

   describe('ViewModel.toJSON', function () {

      it('returns object with required keys', function () {
         addControl(rootElement, model)
         const json = model.diagramControl.toJSON()
         const jsonKeys = ['diagram_name', 'strategy_parameters',
            'arrow_generators', 'right_multiply', 'chunk_subgroup_index']
         expect(jsonKeys).to.include.members(Object.keys(json))
      })

      it('strategy_parameters is a non-empty array', function () {
         addControl(rootElement, model)
         const json = model.diagramControl.toJSON()
         expect(json.strategy_parameters).to.be.an('array').with.length.greaterThan(0)
      })

      it('right_multiply matches ViewModel state', function () {
         addControl(rootElement, model)
         const vm = model.diagramControl
         vm.setRightMultiply(false)
         expect(vm.toJSON().right_multiply).to.be.false
      })

   })

   describe('ViewModel.fromJSON', function () {

      it('restores right_multiply', function () {
         addControl(rootElement, model)
         const vm = model.diagramControl
         const json = vm.toJSON()
         vm.setRightMultiply(false)
         vm.fromJSON({...json, right_multiply: true})
         expect(vm.rightMultiply).to.be.true
      })

      it('triggers layout rebuild — model.layout is set', function () {
         addControl(rootElement, model)
         const vm = model.diagramControl
         const json = vm.toJSON()
         model.layout = null
         vm.fromJSON(json)
         expect(model.layout).to.not.be.null
      })

      it('layout after fromJSON has correct node count', function () {
         addControl(rootElement, model)
         const vm = model.diagramControl
         const json = vm.toJSON()
         vm.fromJSON(json)
         expect(model.layout.nodes.length).to.equal(S3.order)
      })

      // Regression for "cayley diagram control loses chunks on import" (7f96dbd, 618f589,
      // ccb3a1e) -- chunking is only ever set through getChunkingChoices()/setChunk(), which
      // requires strategy_parameters to already be populated, so toJSON() always carries the two
      // together; this is the realistic "saved with a chunk, reloaded" path.
      it('chunk_subgroup_index survives an import round trip', function () {
         addControl(rootElement, model)
         const vm = model.diagramControl
         const choices = vm.getChunkingChoices()
         expect(choices.length).to.be.greaterThan(0)   // sanity: S_3 has a chunkable subgroup

         vm.setChunk(choices[0].subgroupIndex)
         const chunkedCount = model.layout.chunks.length
         expect(chunkedCount).to.be.greaterThan(0)

         const json = vm.toJSON()
         expect(json.chunk_subgroup_index).to.equal(choices[0].subgroupIndex)

         vm.setChunk(0)   // clear it, simulating a different prior state
         expect(model.layout.chunks.length).to.equal(0)

         vm.fromJSON(json)   // "reload" from the saved JSON
         expect(vm.chunkSubgroupIndex).to.equal(choices[0].subgroupIndex)
         expect(model.layout.chunks.length).to.equal(chunkedCount)
      })

   })

})

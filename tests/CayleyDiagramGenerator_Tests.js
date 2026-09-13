import {layoutCayleyDiagram, getDefaultStrategies} from '../js/CayleyDiagramGenerator.js'
import * as Library from '../js/Library.js'

// ---- fixtures ---------------------------------------------------------------

let Z2, S3

before(async function () {
   this.timeout(5000)
   await Library.loadLibrary()
   Z2 = Library.getGroupByURL('../groups/Z_2.group')
   S3 = Library.getGroupByURL('../groups/S_3.group')
})

// ---- tests ------------------------------------------------------------------

// layoutCayleyDiagram now returns {layout, arrowGenerators, strategyParameters?} rather than the
// layout alone -- it derives default arrowGenerators (and, when nameOrStrategies is omitted, the
// default strategyParameters) itself instead of leaving that to the caller.

describe('CayleyDiagramGenerator', function () {

   describe('layoutCayleyDiagram — default layout (nameOrStrategies omitted)', function () {

      it('returns pov, nodes, arrows', function () {
         const {layout} = layoutCayleyDiagram(Z2)
         expect(layout).to.include.keys('pov', 'nodes', 'arrows')
      })

      it('node count equals group order', function () {
         expect(layoutCayleyDiagram(Z2).layout.nodes.length).to.equal(Z2.order)
         expect(layoutCayleyDiagram(S3).layout.nodes.length).to.equal(S3.order)
      })

      it('each node has position, element, label', function () {
         layoutCayleyDiagram(Z2).layout.nodes.forEach((node) => {
            expect(node).to.have.property('position')
            expect(node).to.have.property('element')
            expect(node).to.have.property('label')
         })
      })

      it('node elements are 0..order-1 with no duplicates', function () {
         const elements = layoutCayleyDiagram(S3).layout.nodes.map((n) => n.element).sort((a, b) => a - b)
         expect(elements).to.deep.equal([...Array(S3.order).keys()])
      })

      it('each arrow has start_node, end_node, generator, color', function () {
         layoutCayleyDiagram(Z2).layout.arrows.forEach((arrow) => {
            expect(arrow).to.have.property('start_node')
            expect(arrow).to.have.property('end_node')
            expect(arrow).to.have.property('generator')
            expect(arrow).to.have.property('color')
         })
      })

      it('pov has position and up vectors', function () {
         const {pov} = layoutCayleyDiagram(Z2).layout
         expect(pov).to.have.property('position')
         expect(pov).to.have.property('up')
      })

      it('arrows all reference nodes in the node list', function () {
         const {layout} = layoutCayleyDiagram(S3)
         const nodeSet = new Set(layout.nodes)
         layout.arrows.forEach((arrow) => {
            expect(nodeSet.has(arrow.start_node)).to.be.true
            expect(nodeSet.has(arrow.end_node)).to.be.true
         })
      })

      it('reports the default strategyParameters it computed and used', function () {
         expect(layoutCayleyDiagram(S3).strategyParameters).to.deep.equal(getDefaultStrategies(S3))
      })

      it('reports a non-empty default arrowGenerators', function () {
         expect(layoutCayleyDiagram(S3).arrowGenerators).to.be.an('array').with.length.greaterThan(0)
      })

      it('passes rightMultiply and chunkSubgroupIndex through to the layout', function () {
         const withDefaults = layoutCayleyDiagram(S3)
         const chunkableIndex = S3.subgroups.findIndex((sg) => sg.order > 1 && sg.order < S3.order)
         const {layout} = layoutCayleyDiagram(S3, null, undefined, false, chunkableIndex)
         expect(layout).to.not.deep.equal(withDefaults.layout)   // rightMultiply flips arrow direction
         expect(layout.chunks.length).to.be.greaterThan(0)
      })

   })

   describe('layoutCayleyDiagram — strategy-based (nameOrStrategies is an array)', function () {

      it('node count equals group order', function () {
         const strategies = getDefaultStrategies(S3)
         expect(layoutCayleyDiagram(S3, strategies).layout.nodes.length).to.equal(S3.order)
      })

      it('returns chunks field', function () {
         const strategies = getDefaultStrategies(S3)
         expect(layoutCayleyDiagram(S3, strategies).layout).to.have.property('chunks')
      })

      it('reports back the passed-in strategyParameters unchanged', function () {
         const strategies = getDefaultStrategies(S3)
         expect(layoutCayleyDiagram(S3, strategies).strategyParameters).to.equal(strategies)
      })

      it('left multiply produces the same node count as right', function () {
         const strategies = getDefaultStrategies(S3)
         const right = layoutCayleyDiagram(S3, strategies, null, true).layout
         const left  = layoutCayleyDiagram(S3, strategies, null, false).layout
         expect(left.nodes.length).to.equal(right.nodes.length)
      })

      it('left and right multiply differ for non-abelian group (S3)', function () {
         const strategies = getDefaultStrategies(S3)
         const right = layoutCayleyDiagram(S3, strategies, null, true).layout
         const left  = layoutCayleyDiagram(S3, strategies, null, false).layout
         // S3 is non-abelian — at least one arrow's start/end element pair should differ
         const rightPairs = right.arrows.map((a) => `${a.start_node.element}-${a.end_node.element}`).sort()
         const leftPairs  = left.arrows.map((a)  => `${a.start_node.element}-${a.end_node.element}`).sort()
         expect(rightPairs).to.not.deep.equal(leftPairs)
      })

      it('explicit arrowGenerators are used, and reported back unchanged', function () {
         const strategies = getDefaultStrategies(S3)
         const gen = 1  // use element 1 as sole arrow generator
         const arrowGenerators = [{generator: gen, color: '#ff0000'}]
         const result = layoutCayleyDiagram(S3, strategies, arrowGenerators)
         result.layout.arrows.forEach((arrow) => expect(arrow.generator).to.equal(gen))
         expect(result.arrowGenerators).to.equal(arrowGenerators)
      })

   })

   describe('layoutCayleyDiagram — named diagram (nameOrStrategies is a string)', function () {

      it('handles groups with defined cayley diagrams', function () {
         const group = Library.getAllGroups().find((g) => g.cayleyDiagrams.length > 0)
         if (group == null) { return this.skip() }
         const {layout} = layoutCayleyDiagram(group, group.cayleyDiagrams[0].name)
         expect(layout.nodes.length).to.equal(group.order)
      })

      it('does not report a strategyParameters (chunking/strategy do not apply to a named diagram)', function () {
         const group = Library.getAllGroups().find((g) => g.cayleyDiagrams.length > 0)
         if (group == null) { return this.skip() }
         expect(layoutCayleyDiagram(group, group.cayleyDiagrams[0].name).strategyParameters).to.be.undefined
      })

   })

   describe('getDefaultStrategies', function () {

      it('returns a non-empty array', function () {
         expect(getDefaultStrategies(S3)).to.be.an('array').with.length.greaterThan(0)
      })

      it('each strategy has generator, layout, direction, nestingLevel', function () {
         getDefaultStrategies(S3).forEach((s) => {
            expect(s).to.have.all.keys('generator', 'layout', 'direction', 'nestingLevel')
         })
      })

      it('nesting levels cover 0..n-1', function () {
         const strategies = getDefaultStrategies(S3)
         const levels = strategies.map((s) => s.nestingLevel).sort((a, b) => a - b)
         expect(levels).to.deep.equal([...Array(strategies.length).keys()])
      })

      it('layout values are linear, circular, or rotated', function () {
         const valid = new Set(['linear', 'circular', 'rotated'])
         getDefaultStrategies(S3).forEach((s) => expect(valid.has(s.layout)).to.be.true)
      })

   })

})

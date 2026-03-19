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

describe('CayleyDiagramGenerator', function () {

   describe('layoutCayleyDiagram — default layout (nameOrStrategies = null)', function () {

      it('returns pov, nodes, arrows', function () {
         const layout = layoutCayleyDiagram(Z2)
         expect(layout).to.include.keys('pov', 'nodes', 'arrows')
      })

      it('node count equals group order', function () {
         expect(layoutCayleyDiagram(Z2).nodes.length).to.equal(Z2.order)
         expect(layoutCayleyDiagram(S3).nodes.length).to.equal(S3.order)
      })

      it('each node has position, element, label', function () {
         layoutCayleyDiagram(Z2).nodes.forEach((node) => {
            expect(node).to.have.property('position')
            expect(node).to.have.property('element')
            expect(node).to.have.property('label')
         })
      })

      it('node elements are 0..order-1 with no duplicates', function () {
         const elements = layoutCayleyDiagram(S3).nodes.map((n) => n.element).sort((a, b) => a - b)
         expect(elements).to.deep.equal([...Array(S3.order).keys()])
      })

      it('each arrow has start_node, end_node, generator, color', function () {
         layoutCayleyDiagram(Z2).arrows.forEach((arrow) => {
            expect(arrow).to.have.property('start_node')
            expect(arrow).to.have.property('end_node')
            expect(arrow).to.have.property('generator')
            expect(arrow).to.have.property('color')
         })
      })

      it('pov has position and up vectors', function () {
         const {pov} = layoutCayleyDiagram(Z2)
         expect(pov).to.have.property('position')
         expect(pov).to.have.property('up')
      })

      it('arrows all reference nodes in the node list', function () {
         const layout = layoutCayleyDiagram(S3)
         const nodeSet = new Set(layout.nodes)
         layout.arrows.forEach((arrow) => {
            expect(nodeSet.has(arrow.start_node)).to.be.true
            expect(nodeSet.has(arrow.end_node)).to.be.true
         })
      })

   })

   describe('layoutCayleyDiagram — strategy-based', function () {

      it('node count equals group order', function () {
         const strategies = getDefaultStrategies(S3)
         expect(layoutCayleyDiagram(S3, strategies).nodes.length).to.equal(S3.order)
      })

      it('returns chunks field', function () {
         const strategies = getDefaultStrategies(S3)
         expect(layoutCayleyDiagram(S3, strategies)).to.have.property('chunks')
      })

      it('left multiply produces the same node count as right', function () {
         const strategies = getDefaultStrategies(S3)
         const right = layoutCayleyDiagram(S3, strategies, null, true)
         const left  = layoutCayleyDiagram(S3, strategies, null, false)
         expect(left.nodes.length).to.equal(right.nodes.length)
      })

      it('left and right multiply differ for non-abelian group (S3)', function () {
         const strategies = getDefaultStrategies(S3)
         const right = layoutCayleyDiagram(S3, strategies, null, true)
         const left  = layoutCayleyDiagram(S3, strategies, null, false)
         // S3 is non-abelian — at least one arrow's start/end element pair should differ
         const rightPairs = right.arrows.map((a) => `${a.start_node.element}-${a.end_node.element}`).sort()
         const leftPairs  = left.arrows.map((a)  => `${a.start_node.element}-${a.end_node.element}`).sort()
         expect(rightPairs).to.not.deep.equal(leftPairs)
      })

      it('explicit arrowGenerators are used', function () {
         const strategies = getDefaultStrategies(S3)
         const gen = 1  // use element 1 as sole arrow generator
         const layout = layoutCayleyDiagram(S3, strategies, [{generator: gen, color: '#ff0000'}])
         layout.arrows.forEach((arrow) => expect(arrow.generator).to.equal(gen))
      })

   })

   describe('layoutCayleyDiagram — named diagram', function () {

      it('handles groups with defined cayley diagrams', function () {
         const group = Library.getAllGroups().find((g) => g.cayleyDiagrams.length > 0)
         if (group == null) { return this.skip() }
         const layout = layoutCayleyDiagram(group, group.cayleyDiagrams[0].name)
         expect(layout.nodes.length).to.equal(group.order)
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

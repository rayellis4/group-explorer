import {addControl} from '../js/HighlightControl.js'
import {BitSet} from '../js/BitSet.js'
import {Group} from '../js/Group.js'
import {createModelProxy} from '../js/GEUtils.js'

// ---- fixtures ---------------------------------------------------------------

let S3

before(async function () {
   this.timeout(5000)
   const s3json = await fetch('../groups/S_3.group').then((r) => r.json())
   S3 = Group.fromGroupFileJSON(s3json)
})

function makeMockModel (group) {
   return createModelProxy({
      group,
      highlights: [[], [], []],
      highlightConfiguration: {
         highlightTypes: ['background', 'border', 'node'],
         saturation:  [1,   1,   1  ],
         lightness:   [0.8, 0.8, 0.8],
         hueOffset:   [0,   0,   0  ]
      },
      highlightControl: null
   })
}

// ---- per-test setup/teardown ------------------------------------------------

let controlElement, modelProxy, viewModel, view

beforeEach(function () {
   controlElement = document.createElement('div')
   document.body.appendChild(controlElement)
   modelProxy = makeMockModel(S3)
   addControl(controlElement, modelProxy, null)
   viewModel = modelProxy.highlightControl
   view = viewModel.view
})

afterEach(function () {
   controlElement.remove()
})

// ---- tests ------------------------------------------------------------------

describe('HighlightControl', function () {

   describe('ViewModel initialization', function () {

      it('creates one Subgroop per subgroup', function () {
         const subgroops = Array.from(viewModel.displayMap.values()).filter((item) => item?.className === 'Subgroop')
         expect(subgroops.length).to.equal(S3.subgroups.length)
      })

      it('Subgroop items reference the correct subgroup index', function () {
         Array.from(viewModel.displayMap.values())
            .filter((item) => item?.className === 'Subgroop')
            .forEach((item, inx) => expect(item.subgroupIndex).to.equal(inx))
      })

      it('nextId equals number of subgroups after initialization', function () {
         expect(viewModel.nextId).to.equal(S3.subgroups.length)
      })

      it('nextSubsetIndex starts at 0', function () {
         expect(viewModel.nextSubsetIndex).to.equal(0)
      })

   })

   describe('createSubset', function () {

      it('returns a Subset with className Subset', function () {
         const subset = viewModel.createSubset(new BitSet(S3.order, [1, 2]))
         expect(subset.className).to.equal('Subset')
      })

      it('assigns sequential subsetIndex values', function () {
         const s0 = viewModel.createSubset(new BitSet(S3.order, [1]))
         const s1 = viewModel.createSubset(new BitSet(S3.order, [2]))
         expect(s0.subsetIndex).to.equal(0)
         expect(s1.subsetIndex).to.equal(1)
      })

      it('adds subset to displayItems', function () {
         const subset = viewModel.createSubset(new BitSet(S3.order, [1, 2]))
         expect(viewModel.displayMap.get(subset.id)).to.equal(subset)
      })

   })

   describe('createConjugacyClasses', function () {

      it('adds a ConjugacyClasses item with className ConjugacyClasses', function () {
         viewModel.createConjugacyClasses()
         const cc = Array.from(viewModel.displayMap.values()).find((item) => item?.className === 'ConjugacyClasses')
         expect(cc).to.exist
      })

      it('ConjugacyClasses partitions have className ConjugacyClass', function () {
         viewModel.createConjugacyClasses()
         const cc = Array.from(viewModel.displayMap.values()).find((item) => item?.className === 'ConjugacyClasses')
         cc.partitions.forEach((partition) => expect(partition.className).to.equal('ConjugacyClass'))
      })

      it('partition count matches group conjugacy classes', function () {
         viewModel.createConjugacyClasses()
         const cc = Array.from(viewModel.displayMap.values()).find((item) => item?.className === 'ConjugacyClasses')
         expect(cc.partitions.length).to.equal(S3.conjugacyClasses.length)
      })

   })

   describe('destroyItem', function () {

      it('clears displayMap entry', function () {
         const subset = viewModel.createSubset(new BitSet(S3.order, [1]))
         const id = subset.id
         viewModel.destroyItem(id)
         expect(viewModel.displayMap.has(id)).to.be.false
      })

      it('removes the item from the DOM', function () {
         const subset = viewModel.createSubset(new BitSet(S3.order, [1]))
         const id = subset.id
         expect(controlElement.querySelector(`li[id="${id}"]`)).to.exist
         viewModel.destroyItem(id)
         expect(controlElement.querySelector(`li[id="${id}"]`)).to.be.null
      })

   })

   describe('DisplayItemView.name', function () {

      it('Subgroop names are H₀, H₁, ...', function () {
         S3.subgroups.forEach((_sg, inx) => {
            const subgroop = viewModel.displayMap.get(inx)
            expect(view.itemMap[subgroop.id].name).to.equal(`<i>H</i><sub>${inx}</sub>`)
         })
      })

      it('Subset names are S₀, S₁, ...', function () {
         const s0 = viewModel.createSubset(new BitSet(S3.order, [1]))
         const s1 = viewModel.createSubset(new BitSet(S3.order, [2]))
         expect(view.itemMap[s0.id].name).to.equal('<i>S</i><sub>0</sub>')
         expect(view.itemMap[s1.id].name).to.equal('<i>S</i><sub>1</sub>')
      })

      it('ConjugacyClass names are CC₀, CC₁, ...', function () {
         viewModel.createConjugacyClasses()
         const cc = Array.from(viewModel.displayMap.values()).find((item) => item?.className === 'ConjugacyClasses')
         cc.partitions.forEach((partition, inx) => {
            expect(view.itemMap[partition.id].name).to.equal(`<i>CC</i><sub>${inx}</sub>`)
         })
      })

   })

})

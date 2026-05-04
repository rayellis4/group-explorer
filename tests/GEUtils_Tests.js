import * as GEUtils from '../js/GEUtils.js'

const testsWithResults = [
// equals
   ['GEUtils.equals([1],[1,2])', 'false'],
   ['GEUtils.equals([1,2],[1,3])', 'false'],
   ['GEUtils.equals([1,2],[1,2])', 'true'],
// fromRainbow
   ['GEUtils.fromRainbow(0.8, 0.8, 0.8)', 'hsl(288, 80%, 80%)'],
// isTouchDevice
// cleanWindow
// ajaxLoad
// setupFauxSelect
// htmlToContext
]

describe('GEUtils tests', function () {
   testsWithResults.forEach(([test, rslt]) => {
      it(`${test} should be ${rslt}`, () => {
         chai.assert.equal(obj2string(eval(test)), rslt)
      })
   })

   it('GEUtils.countBy([0,1,1,2,4], (el) => el) should be [1,2,1,0,1]', function () {
      const cb1 = GEUtils.countBy([0,1,1,2,4], (el) => el)
      expect(cb1).to.deep.equal([1,2,1,0,1])
   })
})

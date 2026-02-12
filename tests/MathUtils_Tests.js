import * as MathUtils from '../js/MathUtils.js'

const testsWithResults = [
// isPrime
   ['MathUtils.isPrime(3)', 'true'],
   ['MathUtils.isPrime(4)', 'false'],
   ['MathUtils.isPrime(6)', 'false'],
   ['MathUtils.isPrime(227)', 'true'],
   ['MathUtils.isPrime(51529)', 'false'],
// isPrimePower
   ['MathUtils.isPrimePower(3)', 'true'],
   ['MathUtils.isPrimePower(81)', 'true'],
   ['MathUtils.isPrimePower(51529)', 'true'],
   ['MathUtils.isPrimePower(52891)', 'false'],
// getFactors
   ['MathUtils.getFactors(2).sort()', '[2]'],
   ['MathUtils.getFactors(210).sort()', '[2, 3, 5, 7]'],
   ['MathUtils.getFactors(52891).sort()', '[227, 233]'],
]

describe('MathUtils tests', () => {
   testsWithResults.forEach(([test, rslt]) => {
      it(`${test} should be ${rslt}`, () => {
         chai.assert.equal(obj2string(eval(test)), rslt)
      })
   })
})

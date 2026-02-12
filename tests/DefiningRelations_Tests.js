// DefiningRelations tests

import * as Library from '../js/Library.js'
import * as DefiningRelations from '../js/DefiningRelations.js'
import IsomorphicGroups from '../js/IsomorphicGroups.js'

await Library.loadLibrary()
const testGroups = Array.from(Library
   .getAllGroups()
   .filter((G) => G.order != 1)
   .sort((G, H) => G.order - H.order))

describe('DefiningRelations -- test group generation from presentation', () => {
   testGroups.forEach((G) => {
      it(`testMultiplicationTable(${G.shortName}) should be true`, () => {
         chai.assert.equal(testMultiplicationTable(G), true)
      })
   })
})

/* Used in development */
describe('DefiningRelations -- check definitions in groups', () => {
   testGroups.forEach((G) => {
      it(`testGroupDefinition(${G.shortName}) should be true`, () => {
         chai.assert.equal(testGroupDefinition(G), true)
      })
   })
})

// make presentation, find group, find isomorphic group, and check against original group
function testMultiplicationTable (group) {
   const presentation = DefiningRelations.makePresentation(group)
   const generatedGroup = DefiningRelations.generateGroupFromPresentation(presentation)
   const foundGroup = IsomorphicGroups.find(generatedGroup)

   return foundGroup.gapid == group.gapid
}

// Test the validity of group.definition as a presentation
function testGroupDefinition (group) {
   const presentation = parseFormattedPresentation(group.definition)
   const generatedGroup = DefiningRelations.generateGroupFromPresentation(presentation)
   const foundGroup = IsomorphicGroups.find(generatedGroup)

   return foundGroup.gapid == group.gapid
}

function parseFormattedPresentation (formattedPresentation) {
   const defn = document.createElement('span')
   defn.innerHTML = formattedPresentation
   const text = defn.textContent
   const [generators, relatorString] = (text.slice(1,-1) + ',').replaceAll(/\s/g, '').split(':')
   const matches = Array.from(relatorString.matchAll(/([-a-z0-9]+)([=,])/g))
   const relators = []
   let todo = []
   for (let inx = 0; inx < matches.length; inx++) {
      let [relator, _, separator] = matches[inx]
      const maybeRelator = makeRelator(relator)
      if (separator == ',') {
         if (maybeRelator == '1') {
            relators.push(...todo)
         } else {
            const correction = Array
               .from(maybeRelator)
               .reverse()
               .map((char) => (char == char.toLowerCase()) ? char.toUpperCase() : char.toLowerCase())
               .join('')
            for (const uncorrectedRelator of todo) {
               relators.push(uncorrectedRelator + correction)
            }
         }
         todo = []
      } else {
         todo.push(maybeRelator)
      }
   }

   function makeRelator (relator) {
      relator = relator.slice(0, -1)
      const results = []
      for (let inx = 0; inx < relator.length; inx++) {
         let result = relator[inx]
         const exponent = parseInt(relator.substring(inx + 1))
         if (!isNaN(exponent)) {
            if (exponent < 0) {
               result = (result == result.toLowerCase()) ? result.toUpperCase() : result.toLowerCase()
               inx++
            }
            for (let rep = 0; rep < Math.abs(exponent) - 1; rep++) {
               result += result[0]
            }
            inx += (Math.abs(exponent) < 10) ? 1 : 2  // assumes exponent never more than two digits
         }
         results.push(result)
      }
      return results.join('')
   }

   return generators + ':' + relators.join(',')
}

// DefiningRelations tests

import * as Library from '../js/Library.js'
import * as DefiningRelations from '../js/DefiningRelations.js'
import * as IsomorphicGroups from '../js/IsomorphicGroups.js'

await Library.loadLibrary()
const testGroups = Array.from(Library
   .getAllGroups()
   .filter((G) => G.order != 1)
   .sort((G, H) => G.order - H.order))

describe('DefiningRelations -- check Library setup', () => {
   it('testGroups from Library should not be empty -- see setup notes in UnitTests.html', () => {
         chai.assert.equal(testGroups.length != 0, true)
   })
})

describe('DefiningRelations -- test group generation from presentation', () => {
   testGroups.forEach((G) => {
      it(`testMultiplicationTable(${G.shortName}) should be true`, () => {
         chai.assert.equal(testMultiplicationTable(G), true)
      })
   })
})

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
   // remove HTML, braces from group.defintion
   const scratch = document.createElement('span')
   scratch.innerHTML = group.definition
   const presentation = scratch.textContent.replaceAll(/[<>⟨⟩]/g,'').replaceAll(/\s/g, '')
   scratch.remove

   const generatedGroup = DefiningRelations.generateGroupFromPresentation(presentation)
   const foundGroup = IsomorphicGroups.find(generatedGroup)

   return foundGroup.gapid == group.gapid
}

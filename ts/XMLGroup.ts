/*
# XMLGroup

Create Group from XML download

Deprecated in favor of current JSON format

```js
 */

import * as MathML from './MathML.js';
import { Group } from './Group.js'

// Cayley diagram from XML
export type XMLCayleyDiagram = {
   name: html,
   arrows: Array<groupElement>,
   points: Array<Array<float>>
}

// Symmetry object from XML
type Path = {color: Maybe<color>, points: Array<Array<float>>};
type Sphere = {radius: float, color: Maybe<color>, point: Array<float>};
type Operation = {element: groupElement, degrees: float, point: Array<float>};
export type XMLSymmetryObject = {
   name: html,
   operations: Array<Operation>,
   spheres: Array<Sphere>,
   paths: Array<Path>
}

export function fromGroupFileXML (text: string): Group {
   // Replacing named entities with unicode characters to ensure that later fragments parse successfully...
   const cleanText = text.replace(/<br.>/g, "&lt;br/&gt;")  // <br/> is not valid XML; escape it before parsing
   const xml: Document = new DOMParser().parseFromString(cleanText, 'text/xml')

   const G = Group.fromMulttable(multtableFromXML(xml))

   G.names = Array
      .from(xml.querySelectorAll('group > name'))
      .map((name) => (MathML.toHTML(name.innerHTML) as html))
   const gapname = xml.querySelector('gapname')?.innerHTML
      if (gapname != null) G.gapname = gapname
   const gapid = xml.querySelector('gapid')?.innerHTML
      if (gapid != null) G.gapid = gapid
   const shortName = xml.querySelector('group > name')?.getAttribute('text')
      if (shortName != null) G.shortName = shortName
   G.links = xml.querySelector('link')
      ? Array.from(xml.querySelectorAll('link')).map((link) => link.textContent)
      : null
   const definition = MathML.toHTML(xml.querySelector('definition')?.innerHTML)
      if (definition != null) G.definition = definition
   const phrase = xml.querySelector('phrase')?.innerHTML
      if (phrase != null) G.phrase = phrase
   const notes = xml.querySelector('notes')?.textContent
      if (notes != null) G.notes = notes
   const author = xml.querySelector('author')?.textContent
      if (author != null) G.author = author
   G.declaredGenerators = generatorsFromXML(xml)
   G.representations = representationsFromXML(xml)
   G.userRepresentations = []
   G.representationIndex = 0
   G.cayleyDiagrams = cayleyDiagramsFromXML(xml)
   G.symmetryObjects = symmetryObjectsFromXML(xml)
   G.userNotes = ''

   return G
}

// returns representations as array of arrays of innerHTML elements
function representationsFromXML (xml: Document): Array<Array<html>> {
   return Array.from(xml.querySelectorAll('representation'))
      .map((representation) => 
         Array.from(representation.querySelectorAll('element'))
            .map((element) => (MathML.toHTML(element.innerHTML) as html)))
}

// returns <multtable> in [[],[]] format
function multtableFromXML (xml: Document): Array<Array<groupElement>> {
   return Array.from(xml.querySelectorAll('multtable > row'))
      .map((row) =>
         row.textContent
            .split(' ')
            .filter((el) => el.length != 0)
            .map((el) => parseInt(el)))
}

// returns generators specified in XML, not those derived in subgroup computation
function generatorsFromXML (xml: Document): Array<Array<groupElement>> {
   return Array.from(xml.querySelectorAll('generators'))
      .map((generators) =>
         (generators.getAttribute('list')  as html)
            .split(' ')
            .map((generator) => parseInt(generator)))
}

// {name, arrows, points}
// arrows are element numbers
// points are [x,y,z] arrays
function cayleyDiagramsFromXML (xml: Document): Array<XMLCayleyDiagram> {
   return Array.from(xml.querySelectorAll('cayleydiagram'))
      .map((cayleyDiagram) => {
         const name = (cayleyDiagram.querySelector('name')?.textContent as string)
         const arrows = Array.from(cayleyDiagram.querySelectorAll('arrow')).map((arrow) => parseInt(arrow.textContent))
         const points =  Array.from(cayleyDiagram.querySelectorAll('point'))
            .map((point) => [
               Number(point.getAttribute('x')),
               Number(point.getAttribute('y')),
               Number(point.getAttribute('z'))
            ])
         return {name: name, arrows: arrows, points: points}
      })
}

function symmetryObjectsFromXML (xml: Document): Array<XMLSymmetryObject> {
   return Array.from(xml.querySelectorAll('symmetryobject'))
      .map((symmetryObject) => {
         function getPoint (point: Element) {
            return [
               Number(point.getAttribute('x')),
               Number(point.getAttribute('y')),
               Number(point.getAttribute('z'))               
            ]
         }
         const name = (symmetryObject.getAttribute('name') as string)
         const operations = Array.from(symmetryObject.querySelectorAll('operation'))
            .map((operation) => {
               return {
                  element: Number(operation.getAttribute('element')),
                  degrees: Number(operation.getAttribute('degrees')),
                  point: getPoint((operation.querySelector('point') as Element))
               }
            })
         const spheres = Array.from(symmetryObject.querySelectorAll('sphere'))
            .map((sphere) => {
               const radius = Number(sphere.getAttribute('radius'))
               const color = sphere.getAttribute('color')
               const point = getPoint((sphere.querySelector('point') as Element))
               return {radius: radius, color: color, point: point}
            })
         const paths = Array.from(symmetryObject.querySelectorAll('path'))
            .map((path) => {
               const color = path.getAttribute('color')
               const points = Array.from(path.querySelectorAll('point'))
                  .map((point) => getPoint(point))
               return {points: points, color: color}
            })
         return {name: name, operations: operations, spheres: spheres, paths: paths}
      })
}

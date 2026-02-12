// @flow
/*
 * Create Group from XML
 */

import * as MathML from './MathML.js';
import Group from './Group.js'

/*::
// Cayley diagram from XML
export type XMLCayleyDiagram = {
   name: html,
   arrows: Array<groupElement>,
   points: Array<Point>
};

// Symmetry object from XML
type Point = [float, float, float];
type Path = {color: ?color, points: Array<Point>};
type Sphere = {radius: float, color: ?color, point: Point};
type Operation = {element: groupElement, degrees: float, point: Point};
export type XMLSymmetryObject = {
   name: html,
   operations: Array<Operation>,
   spheres: Array<Sphere>,
   paths: Array<Path>
};

export type XMLGroupJSON = {
   name: html,
   gapname: string,
   gapid: string,
   shortName: string,
   links: Array<string> | void;
   other_names: Array<html> | void;
   definition: html,
   phrase: html,
   notes: string,
   author: string,
   _XML_generators: Array<Array<groupElement>>,
   representations: Array<Array<html>>,
   userRepresentations: Array<Array<html>>,
   representationIndex: number,
   cayleyDiagrams: Array<XMLCayleyDiagram>,
   symmetryObjects: Array<XMLSymmetryObject>,

   // Group properties set elsewhere
   lastModifiedOnServer: string,
   URL: string,
   CayleyThumbnail: string,
   rowHTML: string,
   userNotes: string
};

export type BriefXMLGroupJSON = {
   name: html,
   shortName: string,
   author: string,
   notes: string,
   phrase: html,
   representations: Array<Array<html>>,
   representationIndex: number,
   cayleyDiagrams: Array<XMLCayleyDiagram>,
   symmetryObjects: Array<XMLSymmetryObject>,
   multtable: Array<Array<groupElement>>
};
*/

export {fromGroupFileXML}

function fromGroupFileXML (text) {
   // Replacing named entities with unicode characters to ensure that later fragments parse successfully...
   const cleanText = text.replace(/<br.>/g, "&lt;br/&gt;")  // hack to read fgb notes
   const xml /*: Document */ = new DOMParser().parseFromString(cleanText, 'text/xml')

   const G = Group.fromMulttable(multtableFromXML(xml))

   G.names = Array.from(xml.querySelectorAll('group > name')).map((name) => MathML.toHTML(name.innerHTML))
   G.gapname = xml.querySelector('gapname')?.innerHTML
   G.gapid = xml.querySelector('gapid')?.innerHTML
   G.shortName = xml.querySelector('group > name').getAttribute('text')
   G.links = xml.querySelector('link')
      ? Array.from(xml.querySelectorAll('link')).map((link) => link.textContent)
      : null
   G.definition = MathML.toHTML(xml.querySelector('definition')?.innerHTML)
   G.phrase = xml.querySelector('phrase')?.innerHTML
   G.notes = xml.querySelector('notes')?.textContent
   G.author = xml.querySelector('author')?.textContent
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
function representationsFromXML (xml /*: Document */) /*: Array<Array<html>> */ {
   return Array.from(xml.querySelectorAll('representation'))
      .map((representation) => 
         Array.from(representation.querySelectorAll('element'))
            .map((element) => MathML.toHTML(element.innerHTML)))
}

// returns <multtable> in [[],[]] format
function multtableFromXML (xml /*: Document */) /*: Array<Array<groupElement>> */ {
   return Array.from(xml.querySelectorAll('multtable > row'))
      .map((row) =>
         row.textContent
            .split(' ')
            .filter((el) => el.length != 0)
            .map((el) => parseInt(el)))
}

// returns generators specified in XML, not those derived in subgroup computation
function generatorsFromXML (xml /*: Document */) /*: Array<Array<groupElement>> */ {
   return Array.from(xml.querySelectorAll('generators'))
      .map((generators) =>
         generators.getAttribute('list')
            .split(' ')
            .map((generator) => parseInt(generator)))
}

// {name, arrows, points}
// arrows are element numbers
// points are [x,y,z] arrays
function cayleyDiagramsFromXML (xml /*: Document */) /*: Array<XMLCayleyDiagram> */ {
   return Array.from(xml.querySelectorAll('cayleydiagram'))
      .map((cayleyDiagram) => {
         const name = cayleyDiagram.querySelector('name').textContent
         const arrows = Array.from(cayleyDiagram.querySelectorAll('arrow')).map((arrow) => arrow.textContent)
         const points =  Array.from(cayleyDiagram.querySelectorAll('point'))
            .map((point) => [
               Number(point.getAttribute('x')),
               Number(point.getAttribute('y')),
               Number(point.getAttribute('z'))
            ])
         return {name: name, arrows: arrows, points: points}
      })
}

function symmetryObjectsFromXML (xml /*: Document */) /*: Array<XMLSymmetryObject> */ {
   return Array.from(xml.querySelectorAll('symmetryobject'))
      .map((symmetryObject) => {
         function getPoint (point) {
            return [
               Number(point.getAttribute('x')),
               Number(point.getAttribute('y')),
               Number(point.getAttribute('z'))               
            ]
         }
         const name = symmetryObject.getAttribute('name')
         const operations = Array.from(symmetryObject.querySelectorAll('operation'))
            .map((operation) => {
               return {
                  element: Number(operation.getAttribute('element')),
                  degrees: Number(operation.getAttribute('degrees')),
                  point: getPoint(operation.querySelector('point'))
               }
            })
         const spheres = Array.from(symmetryObject.querySelectorAll('sphere'))
            .map((sphere) => {
               const radius = Number(sphere.getAttribute('radius'))
               const color = sphere.getAttribute('color')
               const point = getPoint(sphere.querySelector('point'))
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

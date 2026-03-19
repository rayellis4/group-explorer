/* @flow

# CayleyDiagramGenerator

```javascript
 */
import {THREE} from '../lib/externals.js';
import {BitSet} from './BitSet.js';

export {
   DIRECTION_INDEX,
   AXIS_NAME,
   ARROW_COLORS,
   layoutCayleyDiagram,
   getDefaultStrategies
}
/*::
import type {Tree} from './GEUtils.js';
import XMLGroup from './XMLGroup.js';
import type {XMLCayleyDiagram} from './XMLGroup.js';
import type {NodeData, ArrowData, ChunkData} from './CayleyDiagramView.js';

export type Layout = 'linear' | 'circular' | 'rotated';
type LineDirection = 'X' | 'Y' | 'Z';
type PlaneDirection = 'YZ' | 'XZ' | 'XY';
export type Direction = LineDirection | PlaneDirection;
export type StrategyParameters = {generator: groupElement, layout: Layout, direction: Direction, nestingLevel: number};
export type ArrowGenerator = {generator: groupElement, color: color}

type NodeType = {
   position: THREE.Vector3,
   element: groupElement,
   label: html,
   color: color
}
type ArrowType = {
   start_node: NodeType,
   end_node: NodeType,
   generator: groupElement,
   bidirectional: boolean,
   thirdPoint: THREE.Vector3
   keepCurved: boolean,
   offset: number,
   color: color
}
type ChunkType = {
   box: THREE.Matrix4,
   name: html,
   widths: THREE.Vector3,
   nodes: Array<NodeType>
}
type Layout = {
   pov: { position: THREE.Vector3, up: THREE.Vector3 },
   nodes: Array<NodeType>,
   arrows: Array<ArrowType>,
   chunks: Array<ChunkType>
}
*/

const DEFAULT_ARC_OFFSET = 0.15

const DIRECTION_INDEX = { X: 0, Y: 1, Z: 2, YZ: 0, XZ: 1, XY: 2 };
const AXIS_NAME = ['X', 'Y', 'Z'];
const ARROW_COLORS = ['#5c0e55', '#0b3864', '#552d00', '#004100', '#0d0db0', '#750000']

function layoutCayleyDiagram (
   group /*: Group */,
   nameOrStrategies /*: void | string | Array<StrategyParameters> */,
   arrowGenerators /*: ?Array<ArrowGenerator> */,
   rightMultiply /*: ?boolean */,
   chunkSubgroupIndex /*: ?number */
) /*: Layout */ {
   if (nameOrStrategies == null) {
      return drawDefault(group)
   } else if (typeof nameOrStrategies == 'string') {
      return drawDiagram(group, nameOrStrategies, arrowGenerators, rightMultiply)
   } else {
      return drawFromStrategy(group, nameOrStrategies, arrowGenerators, rightMultiply, chunkSubgroupIndex)
   }
}

function getDefaultStrategies (group /*: Group */) /*: Array<StrategyParameters> */ {
   return generateStrategy(group)
}

function drawDefault (group) {
   if (group.elements.length == 1) {
      const nodes = [{position: new THREE.Vector3(), element: 0, label: group.representation[0]}]
      const chunkTree = new Chunk(nodes, null)
      return makeLayout(chunkTree, [], true)
   }

   const strategyParameters = generateStrategy(group)
   const strategies = strategyParameters.map(
      ({generator, layout, direction, nestingLevel}) =>
         new STRATEGY_BY_LAYOUT[layout](generator, direction, nestingLevel)
   )

   const chunkTree = generateTree(group, strategies)
   chunkTree.strategy.layoutChunk(chunkTree)
   normalizeScene(chunkTree)

   const arrowGeneratorElements = strategies.map((strategy) => strategy.generator).reverse()
   const arrows = createArrows(group, chunkTree, arrowGeneratorElements, true)
   setArrowColors(arrows, null)

   return makeLayout(chunkTree, arrows, true)
}

function drawDiagram (group, diagramName, arrowGenerators, rightMultiply = true) {
   const cayleyDiagram = group.cayleyDiagrams.find((cd) => cd.name == diagramName)
   const nodes = cayleyDiagram.points.map((point, element) => createNode(group, element, point))
   const chunkTree = new Chunk(nodes, null).setPositionFromChildren()
   const arrowGeneratorElements = (arrowGenerators == null)
      ? cayleyDiagram.arrows
      : arrowGenerators.map((ag) => ag.generator)
   const arrows = createArrows(group, chunkTree, arrowGeneratorElements, rightMultiply)
   setArrowColors(arrows, arrowGenerators)

   return makeLayout(chunkTree, arrows, false)
}

function drawFromStrategy (group, strategyParameters, arrowGenerators, rightMultiply = true, chunkSubgroupIndex) {
   if (group.elements.length == 1) {
      const nodes = [{position: new THREE.Vector3(), element: 0, label: group.representation[0]}]
      const chunkTree = new Chunk(nodes, null)
      return makeLayout(chunkTree, [], true)
   }

   const strategies = strategyParameters.map(
      ({generator, layout, direction, nestingLevel}) =>
         new STRATEGY_BY_LAYOUT[layout](generator, direction, nestingLevel)
   )

   const chunkTree = generateTree(group, strategies)
   chunkTree.strategy.layoutChunk(chunkTree)
   normalizeScene(chunkTree)

   const arrowGeneratorElements = (arrowGenerators == null)
      ? strategies.map((strategy) => strategy.generator).reverse()
      : arrowGenerators.map((ag) => ag.generator)

   const arrows = createArrows(group, chunkTree, arrowGeneratorElements, rightMultiply)
   setArrowColors(arrows, arrowGenerators)

   const chunks = createChunks(group, chunkTree, chunkSubgroupIndex)
   return { pov: getPOV(chunkTree, true), nodes: chunkTree.allChildNodes, arrows, chunks }
}

function makeLayout (chunkTree, arrows, generatesFromStrategy) {
   return { pov: getPOV(chunkTree, generatesFromStrategy), nodes: chunkTree.allChildNodes, arrows }
}

/*
 * Position the camera and point it at the center of the scene
 *
 * Camera positioned to match point of view in GE2 for user-specified (not generated) diagrams:
 *   If diagram lies entirely in the y-z plane (all x == 0)
 *     place camera on x-axis, y-axis up (z-axis to the left)
 *   If diagram lies entirely in the x-z plane (all y == 0)
 *     place camera on y-axis, z-axis down (x-axis to the right)
 *   If diagram lies entirely in the x-y plane (all z == 0)
 *     place camera on z-axis, y-axis up (x-axis to the right)
 *   Otherwise place camera with y-axis up, offset a bit from
 *     the (1,1,1) vector so that opposite corners don't line up
 *     and make cubes look flat; look at origin, and adjust camera
 *     distance so that diagram fills field of view
 */
function getPOV (chunkTree, generatesFromStrategy) {
   const pov = {position: new THREE.Vector3(), up: new THREE.Vector3()}
   const nodePositions = chunkTree.allChildNodes.map((node) => node.position)
   if (generatesFromStrategy) {
      // GE3 3.6 defaults for generated layout
      if (nodePositions.every((position) => position.x == 0.0)) {
         pov.position.set(3, 0, 0)
         pov.up.set(0, -1, 0)
      } else if (nodePositions.every((position) => position.y == 0.0)) {
         pov.position.set(0, -3, 0)
         pov.up.set(0, 0, 1)
      } else if (nodePositions.every( (position) => position.z == 0.0 )) {
         pov.position.set(0, 0, -3)
         pov.up.set(0, -1, 0)
      } else {
         pov.position.set(1.7, -1.6, -1.9)
         pov.up.set(0, -1, 0)
      }
      // use GE2 defaults, if configured
      if (localStorage.getItem('POV') == 'GE2') {
         if (nodePositions.every( (position) => position.y == 0.0 )) {
            pov.position.set(0, -3, 0)
            pov.up.set(0, 0, 1)
         } else if (nodePositions.every( (position) => position.x == 0.0 )) {
            pov.position.set(3, 0, 0)
            pov.up.set(0, -1, 0)
         }
      }
   } else {
      // Position for manual layout
      if (nodePositions.every((position) => position.x == 0.0)) {
         pov.position.set(3, 0, 0)
         pov.up.set(0, 1, 0)
      } else if (nodePositions.every((position) => position.y == 0.0)) {
         pov.position.set(0, 3, 0)
         pov.up.set(0, 0, -1)
      } else if (nodePositions.every((position) => position.z == 0.0)) {
         pov.position.set(0, 0, 3)
         pov.up.set(0, 1, 0)
      } else {
         pov.position.set(1.7, 1.6, 1.9)
         pov.up.set(0, 1, 0)
      }
   }

   const radius = getRadius(new THREE.Vector3(), chunkTree.allChildNodes) || 1  // zero radius, one element
   pov.position.multiplyScalar(radius)

   return pov
}

function setArrowColors (arrows, passedArrowGenerators) {
   if (passedArrowGenerators == null) {
      const arrowColors = [...ARROW_COLORS]
      const coloredGeneratorMap = new Map()
      arrows.forEach((arrow) => {
         arrow.color = coloredGeneratorMap.get(arrow.generator)
         if (arrow.color == null) {
            arrow.color = arrowColors.pop()
            coloredGeneratorMap.set(arrow.generator, arrow.color)
         }
      })
   } else {
      const arrowGeneratorMap =
         new Map(passedArrowGenerators.map((arrowGenerator) => [arrowGenerator.generator, arrowGenerator]))
      arrows.forEach((arrow) => arrow.color = arrowGeneratorMap.get(arrow.generator).color)
   }
}

function createChunks (group, chunkTree, chunkSubgroupIndex) {
   if (chunkSubgroupIndex == null) {
      return []
   }

   const findChunksByStrategy = (strategy, chunk = chunkTree) => {
      if (chunk.strategy == strategy) {
         return [chunk]
      } else {
         return chunk.children.map((child) => findChunksByStrategy(strategy, child)).flat(2)
      }
   }

   const findChunksBySubgroupIndex = (subgroupIndex, chunk = chunkTree) => {
      if (!chunk.isChunk || chunk.strategy?.elements == null) {
         return []
      } else if (chunk.strategy.elements.equals(group.subgroups[subgroupIndex].members)) {
         return findChunksByStrategy(chunk.strategy)
      } else {
         return findChunksBySubgroupIndex(subgroupIndex, chunk.children[0])
      }
   }

   const chunks = findChunksBySubgroupIndex(chunkSubgroupIndex)

   const chunkData = chunks.map((chunk) => {
      const allChildNodes = chunk.allChildNodes
      const chunkData = {
         name: allChildNodes[0].label + `<i>H</i><sub>${chunkSubgroupIndex}</sub>`,
         box: chunk.transformedChunkBox,
         widths: chunk.originalChunkSize,
         nodes: allChildNodes,
      }
      return chunkData
   })

   return chunkData
}

function createArrows (group, chunkTree, generators /*: Array<element> */, rightMultiply) /*: Array<ArrowData> */ {
   const areColinear = (position1, position2, position3) => {
      const v1 = new THREE.Vector3().subVectors(position1, position2)
      const v2 = new THREE.Vector3().subVectors(position1, position3)
      return new THREE.Vector3().crossVectors(v1, v2).length() < 1.0e-6
   }

   const isCurved = (startNode /*: NodeData */, endNode /*: NodeData */) /*: boolean? */ => {
      const commonChunk = getCommonChunk(startNode, endNode)
      let drawCurved = commonChunk.strategy instanceof CurvedLayoutStrategy
         && !areColinear(commonChunk.position, startNode.position, endNode.position)

      // straight line between two non-adjacent nodes on the inner circle of dihedral-like display
      const leftBoundary = commonChunk.leftBoundary
      if (  drawCurved
         && leftBoundary.length == 2
         && leftBoundary[1].strategy instanceof LinearLayoutStrategy
         && leftBoundary[1].children.length == 2
      ) {
         const startNodeParentIndex = commonChunk.children.findIndex((chunk) => chunk.children.some((node) => node == startNode))
         const endNodeParentIndex = commonChunk.children.findIndex((chunk) => chunk.children.some((node) => node == endNode))
         if (  commonChunk.children[startNodeParentIndex].children[1] == startNode
            && commonChunk.children[endNodeParentIndex].children[1] == endNode
            && Math.abs(startNodeParentIndex - endNodeParentIndex) != 1
            && Math.abs(startNodeParentIndex - endNodeParentIndex) != commonChunk.children.length - 1
         ) {
            drawCurved = false
         }
      }

      return drawCurved
   }

   // find lowest chunk in tree containing both nodes
   const getCommonChunk = (node1, node2) => {
      const ancestry1 = chunkTree.getNodeAncestry(node1)
      const ancestry2 = chunkTree.getNodeAncestry(node2)
      for (let inx = 0; inx < ancestry1.length; inx++) {
         if (ancestry1[inx] == ancestry2[inx]) {
            return ancestry1[inx]
         }
      }
      return null
   }

   const getThirdPointForLinearLayoutStrategy = (node1, node2) => {
      const ancestry = chunkTree.getNodeAncestry(node1)
      const commonChunk = getCommonChunk(node1, node2)
      const chunkIndex = ancestry.findIndex((chunk) => chunk == commonChunk)

      // look past colinear lines: they don't help to determine the display plane
      let child = null
      for (let inx = chunkIndex - 1; inx >= 0; inx--) {
         const maybeChild = ancestry[inx]
         if (   !maybeChild.strategy instanceof LinearLayoutStrategy
            || maybeChild.strategy.direction != commonChunk.strategy.direction) {
               child = maybeChild
               break
            }
      }

      let parent = null
      for (let inx = chunkIndex + 1; inx < ancestry.length; inx++) {
         const maybeParent = ancestry[inx]
         if (   !maybeParent.strategy instanceof LinearLayoutStrategy
            || maybeParent.strategy.direction != commonChunk.strategy.direction) {
               parent = maybeParent
               break
            }
      }

      // child generally determines the display plane for a line
      const thirdPoint = (child != null)
         ? getThirdPointFromCombinedChunks(child, commonChunk, node1, node2)
         : (parent != null)
            ? getThirdPointFromCombinedChunks(parent, commonChunk, node1, node2)
            : getThirdPointForSingleLine(commonChunk)  // no parent or child, just generate a default

      return thirdPoint
   }

   const getThirdPointFromCombinedChunks = (otherChunk, commonChunk, node1, node2) => {
      const commonChunkDirectionIndex = DIRECTION_INDEX[commonChunk.strategy.direction]
      const otherChunkDirectionIndex = DIRECTION_INDEX[otherChunk.strategy.direction]

      let thirdPoint
      if (otherChunk.strategy instanceof CurvedLayoutStrategy) {              //   line of rings, ring of lines
         if (commonChunkDirectionIndex == otherChunkDirectionIndex) {         //     line is normal to other chunk
            thirdPoint = new THREE.Vector3()
         } else {                                                             //     line is coplanar with other chunk
            thirdPoint = otherChunk.position

            if (areColinear(otherChunk.position, node1.position, node2.position)) {
               const chunkNormal = new THREE.Vector3()
                  .setFromMatrixColumn(otherChunk.transformedChunkBox, DIRECTION_INDEX[otherChunk.strategy.direction])
               thirdPoint = getThirdPointFromNormalAndEndpoints(chunkNormal, node1.position, node2.position)
            }
         }
      } else {                                                                 //   line of (orthogonal) lines
         const remainingDirectionIndex = 3 - (commonChunkDirectionIndex + otherChunkDirectionIndex)
         const planeNormal = new THREE.Vector3()
            .setFromMatrixColumn(otherChunk.transformedChunkBox, remainingDirectionIndex)
         thirdPoint = getThirdPointFromNormalAndEndpoints(planeNormal, node1.position, node2.position)
      }

      return thirdPoint
   }

   const getThirdPointFromNormalAndEndpoints = (normal, position1, position2) => {
      const inPlane = position1.clone().sub(position2).cross(normal)
      const midPoint = position1.clone().add(position2).multiplyScalar(0.5)
      const dotProduct = midPoint.dot(inPlane)

      const thirdPoint = inPlane
         .add(midPoint)
         .multiplyScalar((Math.abs(dotProduct) > 1.e-6 && dotProduct > 0) ? -1 : 1)  // let arrows bow away from center

      return thirdPoint
   }

   const areCoplanar = (normal, point1, point2) => {
      const result = point1.clone().sub(point2).dot(normal) < 1.e-6
      return result
   }

   const getThirdPointForCurvedLayoutStrategy = (node1, node2) => {
      const position1 = node1.position
      const position2 = node2.position
      const commonChunk = getCommonChunk(node1, node2)
      const commonChunkNormal = new THREE.Vector3()
         .setFromMatrixColumn(commonChunk.transformedChunkBox, DIRECTION_INDEX[commonChunk.strategy.direction])
         .normalize()
      const commonPlane =
         new THREE.Plane().setFromCoplanarPoints(commonChunk.position, position1, position2)
      const commonPlaneNormal = commonPlane.normal

      let thirdPoint = commonChunk.position

      if (new THREE.Vector3().crossVectors(commonChunkNormal, commonPlaneNormal).length() > 1.e-6) {
         // chunkNormal and commonPlaneNormal aren't parallel (|A X B| > 0)
         // see if there is plane normal to chunkNormal that contains both node1 and node2
         if (areCoplanar(commonChunkNormal, position1, position2)) {
            // find point at which commonChunkNormal intersects this plane
            const centroid = commonChunk.children
               .reduce((centroid, child) => centroid.add(child.position), new THREE.Vector3())
               .multiplyScalar(1 / commonChunk.children.length)
            const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(commonChunkNormal, position1)
            thirdPoint = plane.projectPoint(centroid, new THREE.Vector3())
         }
      }

      if (areColinear(thirdPoint, position1, position2)) {
         thirdPoint = getThirdPointFromNormalAndEndpoints(commonChunkNormal, position1, position2)
      }

      return thirdPoint
   }

   // this is a stand-alone line
   const getThirdPointForSingleLine = (chunk) => {
      let thirdPoint

      // deal with colinear line-of-lines case?
      const thirdPoints = [
         new THREE.Vector3(0, 0, -1),
         new THREE.Vector3(0, 0, 1),
         new THREE.Vector3(0, 1, 0)
      ]
      thirdPoint = thirdPoints[DIRECTION_INDEX[chunk.strategy.direction]]

      if (localStorage.getItem('POV') == 'GE2') {
         const thirdPoints = [
            new THREE.Vector3(0, 0, -1),
            new THREE.Vector3(0, 0, 1),
            new THREE.Vector3(1, 0, 0)  //  makes z-axis vertical in XZ plane
         ]
         thirdPoint = thirdPoints[DIRECTION_INDEX[chunk.strategy.direction]]
      }

      return thirdPoint
   }

   const getThirdPoint = (node1, node2) => {
      // strategy == null => not generated
      if (chunkTree.strategy == null) {
         return new THREE.Vector3()
      }

      const commonChunk = getCommonChunk(node1, node2)
      const thirdPoint = commonChunk.strategy instanceof CurvedLayoutStrategy
         ? getThirdPointForCurvedLayoutStrategy(node1, node2)
         : getThirdPointForLinearLayoutStrategy(node1, node2)

      return thirdPoint
   }

   const nodes = chunkTree.allChildNodes.sort((a, b) => a.element - b.element)

   const multiply = (a, b) => rightMultiply ? group.mult(a, b) : group.mult(b, a);

   const newArrows = []
   for (const generator of generators) {
      for (const element of group.elements) {
         const product = multiply(element, generator)
         const bidirectional = (multiply(product, generator) == element)
         if (!bidirectional || element < product) {  // test element < product so we only draw an undirected line once
            const generatedCurved = isCurved(nodes[element], nodes[product])
            const newArrow = {
               start_node: nodes[element],
               end_node: nodes[product],
               generator: generator,
               bidirectional: bidirectional,
               thirdPoint: getThirdPoint(nodes[element], nodes[product]),
               keepCurved: generatedCurved,
               offset: generatedCurved ? DEFAULT_ARC_OFFSET : null, // undefined,  // Heuristic value
            }
            newArrows.push(newArrow)
         }
      }
   }

   return newArrows
}

class AbstractLayoutStrategy {
    /*::
      +layoutNodes: (children: Array<Array<NodeData>> ) => Array<Array<NodeData>>;
      generator: groupElement;
      +layout: Layout;
      direction: Direction;
      nesting_level: number;
      elements: BitSet;
    */
    constructor (generator /*: groupElement */, direction /*: Direction */, nesting_level /*: number */) {
        this.generator = generator;          // element# (not 0)
        this.direction = direction;          // X/Y/Z for linear, YZ/XZ/XY for curved
        this.directionIndex = DIRECTION_INDEX[direction]
        this.nesting_level = nesting_level;  // 0 for innermost, increasing to outermost
    }

    get strategyParameters () /*: StrategyParameters */ {
        return { generator: this.generator,
                 layout: this.layout,
                 direction: this.direction,
                 nestingLevel: this.nesting_level,
               };
    }

    transformChild (child /*: Array<NodeData> */, transform /*: THREE.Matrix4 */) {
        if (child.isChunk) {
            child.transform(transform)
        } else {
            child.position = child.position.applyMatrix4(transform)
        }
    }

    layoutChunk (chunk) {
        if (chunk.children[0].isChunk) {
            chunk.children.forEach((child) => child.strategy.layoutChunk(child))
        }
        this.layoutNodes(chunk)
        chunk.setPositionFromChildren()

        return chunk
    }
}

// Scale and translate children to distribute them from 0 to 1 along the <direction> line
class LinearLayoutStrategy extends AbstractLayoutStrategy {
    constructor (generator /*: groupElement */, direction /*: Direction */, nesting_level /*: number */) {
        super(generator, direction, nesting_level);
    }

    get layout () /*: Layout */ {
        return 'linear';
    }

    layoutNodes (chunk) {
        // number of children
        const childCount = chunk.children.length;

        const childWidth = getWidth(chunk.allChildNodes, this.directionIndex)
        let transform = new THREE.Matrix4()
        if (Math.abs(childWidth) < 1.e-6) {
            transform = transform.makeScale(1, 1, 1)  // don't scale child if it has no width in direction of line
        } else {
            const scale = 1 / (2 * childWidth * (childCount - 1))
            transform = transform.makeScale(scale, scale, scale)
        }

        const step = 1 / (childCount - 1)
        const directionVector = new THREE.Vector3().setComponent(this.directionIndex, 1)
        for (let inx = 0; inx < childCount; inx++) {
            transform = transform.setPosition(directionVector.clone().multiplyScalar(inx * step));
            this.transformChild(chunk.children[inx], transform);
        }
    }
}

// calculate position transform as a function of angle theta for circular layout strategy
const positionTransforms = {
    YZ: (r, theta) => new THREE.Vector3(0,                        0.5 - r*Math.cos(theta),  0.5 - r*Math.sin(theta)),
    XZ: (r, theta) => new THREE.Vector3(0.5 + r*Math.sin(theta),  0,                        0.5 - r*Math.cos(theta)),
    XY: (r, theta) => new THREE.Vector3(0.5 + r*Math.sin(theta),  0.5 - r*Math.cos(theta),  0),
}

class CurvedLayoutStrategy extends AbstractLayoutStrategy {
    /*::
      position: (r: number, theta: number) => THREE.Vector3;
    */
    constructor(generator /*: groupElement */, direction /*: Direction */, nesting_level /*: number */) {
        super(generator, direction, nesting_level);
        this.positionTransform = (r, theta) => positionTransforms[((direction /*: any */) /*: PlaneDirection */)](r, theta);
    }

    getRadiusAndScale (chunk) {
        // find 'width', 'length' of prototypical child
        const dir = [
            {lengthDirection: 1, widthDirection: 2},  // YZ length: Y, width: Z
            {lengthDirection: 2, widthDirection: 0},  // XZ length: Z, width: X
            {lengthDirection: 0, widthDirection: 1},  // XY length: X, width: Y
        ]
        const childWidth = getWidth(chunk.children[0].allChildNodes, dir[this.directionIndex].widthDirection)
        const childLength = getWidth(chunk.children[0].allChildNodes, dir[this.directionIndex].lengthDirection)
        const aspectRatio = childLength / childWidth
        const sectorCount = chunk.children.length

        // make circle radius to fit in [0,1] box
        const radius = (Math.abs(childWidth) < 1.e-6)
            ? 0.75 + 0.01 * sectorCount / 2
            : (sectorCount + Math.PI * aspectRatio) / (sectorCount + 2 * Math.PI * aspectRatio)

        // make size of transformed child about half the distance between nodes
        const scale = (Math.abs(childWidth) < 1.e-6)
            ? 0.5 - 0.01 * sectorCount
            : 0.8 * 2 * Math.PI * aspectRatio / (sectorCount + 2 * Math.PI * aspectRatio ) / childLength

        return [radius, scale]
    }
}

// Scale children to fit and translate them so they're distributed
//   around the 0.5*e^i*[0,2*PI] circle centered at [.5,.5]
class CircularLayoutStrategy extends CurvedLayoutStrategy {
    constructor(generator /*: groupElement */, direction /*: Direction */, nesting_level /*: number */) {
        super(generator, direction, nesting_level);
    }

    get layout() /*: Layout */ {
        return 'circular';
    }

    layoutNodes (chunk) {
        const [radius, scale] = this.getRadiusAndScale(chunk)

        const transform = (new THREE.Matrix4()).makeScale(
            ...new THREE.Vector3(...Array.from({length: 3}, (_,inx) => (this.directionIndex == inx) ? 1 : scale)).toArray()
        )

        // translate children to [0.5, 0.5] + [r*sin(th), -r*cos(th)]
        chunk.children.forEach( (child, inx) => {
            transform.setPosition(this.positionTransform(radius, 2*inx*Math.PI/chunk.children.length));
            this.transformChild(child, transform);
        } );
    }
}

// calculate position transform as a function of angle theta for rotation layout strategy
const GE2_positionTransforms = {  // GE2
    YZ: (r, theta) => new THREE.Vector3(0,                        0.5 - r*Math.sin(theta),  0.5 - r*Math.cos(theta)),
    XZ: (r, theta) => new THREE.Vector3(0.5 + r*Math.sin(theta),  0,                        0.5 + r*Math.cos(theta)),
    XY: (r, theta) => new THREE.Vector3(0.5 + r*Math.sin(theta),  0.5 - r*Math.cos(theta),  0),
}

// GE2, Current GE3
const rotationTransforms = {
    YZ: (theta) => new THREE.Matrix4().makeRotationX(theta + Math.PI/2),
    XZ: (theta) => new THREE.Matrix4().makeRotationY(theta + Math.PI/2),
    XY: (theta) => new THREE.Matrix4().makeRotationZ(theta + Math.PI/2),
}

// calculate rotation transform as a function of angle theta for plane directions
const proposedRotationTransforms = {
    YZ: (theta) => new THREE.Matrix4().makeRotationX(theta),
    XZ: (theta) => new THREE.Matrix4().makeRotationY(theta),
    XY: (theta) => new THREE.Matrix4().makeRotationZ(theta),
}

// Scale children to fit, rotate them PI/2 + 2*inx*PI/n, and translate them
//   so they're distributed around the 0.5*e^i*[0,2*PI] circle centered at [.5,.5]
class RotatedLayoutStrategy extends CurvedLayoutStrategy {
    /*::
      rotation: (theta: number) => THREE.Matrix4;
    */
    constructor(generator /*: groupElement */, direction /*: Direction */, nesting_level /*: number */) {
        super(generator, direction, nesting_level);
        if (localStorage.getItem('POV') == 'GE2') {
            this.positionTransform = GE2_positionTransforms[direction]
        }
        this.rotationTransform = (localStorage.getItem('POV') == 'proposed')
            ? proposedRotationTransforms[direction]
            : rotationTransforms[direction]
    }

    get layout() /*: Layout */ {
        return 'rotated';
    }

    layoutNodes (chunk) {
        const [radius, scale] = this.getRadiusAndScale(chunk)

        // scale and translate to origin
        const centroid = getCentroid(chunk.children)
        const toOrigin = new THREE.Matrix4().makeScale(scale, scale, scale).setPosition(centroid.clone().multiplyScalar(-scale))

        // scale, rotate, and translate each child
        chunk.children.forEach((child, inx) => {
            const theta = inx*2*Math.PI/chunk.children.length

            const rotate = this.rotationTransform(theta)
            const toNewPosition = new THREE.Matrix4().makeTranslation(centroid.clone().add(this.positionTransform(radius, theta)))

            // scale and translate child to origin, rotate (about origin), and translate to new position
            this.transformChild(child, toNewPosition.clone().multiply(rotate.clone().multiply(toOrigin)))
        } );
    }
}

const STRATEGY_BY_LAYOUT = {
    linear: LinearLayoutStrategy,
    circular: CircularLayoutStrategy,
    rotated: RotatedLayoutStrategy
};

class Chunk {
    children
    position
    transformedChunkBox
    originalChunkSize

    constructor (children, strategy) {
        this.children = children
        this.strategy = strategy
    }

    get isChunk () {
        return true
    }

    // TODO: cache this
    get allChildNodes () /*: Array<NodeData> */ {
        const allChildNodes = this.children.map((child) =>
            child.isChunk
                ? child.allChildNodes
                : [child]
        ).flat()

        return allChildNodes
    }

    get leftBoundary () {
        const leftBoundary = (this.children[0].isChunk)
            ? [this, ...this.children[0].leftBoundary]
            : [this]
        return leftBoundary
    }

    getNodeAncestry (node) {
        const ancestors = this.children[0].isChunk
            ? [...this.children.find((child) => child.allChildNodes.includes(node)).getNodeAncestry(node), this]
            : [this]

        return ancestors
    }

    setPositionFromChildren () {
        // initialize from children, but only after they've been positioned
        const allChildNodes = this.allChildNodes

        const [xMin, xMax, yMin, yMax, zMin, zMax] = allChildNodes.reduce(
            ([xMin, xMax, yMin, yMax, zMin, zMax], node) => {
                return [
                    Math.min(xMin, node.position.x),
                    Math.max(xMax, node.position.x),
                    Math.min(yMin, node.position.y),
                    Math.max(yMax, node.position.y),
                    Math.min(zMin, node.position.z),
                    Math.max(zMax, node.position.z),
                ]
            },
            [Number.MAX_SAFE_INTEGER, -Number.MAX_SAFE_INTEGER,
             Number.MAX_SAFE_INTEGER, -Number.MAX_SAFE_INTEGER,
             Number.MAX_SAFE_INTEGER, -Number.MAX_SAFE_INTEGER])

        const max = new THREE.Vector3(xMax, yMax, zMax)
        const min = new THREE.Vector3(xMin, yMin, zMin)
        const center = new THREE.Vector3().addVectors(min, max).multiplyScalar(1/2)

        this.originalChunkSize = max.clone().sub(min)
        this.transformedChunkBox = new THREE.Matrix4().identity().setPosition(center)

        this.position = getCentroid(allChildNodes)

        return this
    }

    transform (transform) {
        this.position.applyMatrix4(transform)
        this.transformedChunkBox.premultiply(transform)
        if (this.plane != null) {
            this.plane.applyMatrix4(transform)
        }

        this.children.forEach((child) => {
            if (child.isChunk) {
                child.transform(transform)
            } else {
                child.position = child.position.applyMatrix4(transform)
            }
        })
    }
}

function createNode (G, element, position = [0, 0, 0]) {
    return {
        position: new THREE.Vector3(...position),
        element: element,
        label: G.representation[element],
    }
}

function generateTree (G /*: Group */, strategies /*: Array<AbstractLayoutStrategy> */) /*: Tree<Chunk> */ {
    function populateTree (remainingStrategies, elementsUsed) {
        const currentStrategy = remainingStrategies.pop()

        if (remainingStrategies.length == 0) {
            elementsUsed.add(G.elementPowers[currentStrategy.generator]);
            currentStrategy.elements = elementsUsed.clone();
            return new Chunk(G.elementPowerArray(currentStrategy.generator).map((el) => createNode(G, el)), currentStrategy)
        } else {
            const nodeTreeMultiply = (g, chunkTree) => {
                if (chunkTree.isChunk) {
                    return new Chunk(chunkTree.children.map((child) => nodeTreeMultiply(g, child)), chunkTree.strategy)
                } else {  // node
                    const prod = G.mult(g, chunkTree.element);
                    elementsUsed.set(prod);
                    return createNode(G, prod)
                }
            }

            // Load generators in this order to preferentially generate a <g> X <h> rectangular map
            const generators = G.elementPowerArray(currentStrategy.generator);
            generators.push(...remainingStrategies.map( (strategy) => strategy.generator));

            const chunkTree = [populateTree(remainingStrategies, elementsUsed)]

            const cosetReps = [0];
            for (const g of cosetReps) {
                for (const generator of generators) {
                    const h = G.mult(generator, g);
                    if (!elementsUsed.isSet(h)) {
                        cosetReps.push(h);
                        chunkTree.push(nodeTreeMultiply(h, chunkTree[0]));
                    }
                }
            }
            currentStrategy.elements = elementsUsed.clone();

            return new Chunk(chunkTree, currentStrategy)
        }
    }

    function sortTreeByNestingLevel (nodeTree) /*: boolean */ {
        let changed = false
        if (nodeTree.children[0].isChunk) {
            if (nodeTree.strategy.nesting_level < nodeTree.children[0].strategy.nesting_level) {
                changed = true

                // swap the top chunk of node_tree with the next, like transposing a (non-square) matrix
                const topLength = nodeTree.children.length
                const nextLength = nodeTree.children[0].children.length

                // save strategies to swap them, too
                const topStrategy = nodeTree.strategy
                const nextStrategy = nodeTree.children[0].strategy

                // save next-level children as array of arrays
                const savedChildren = []
                for (let i = 0; i < topLength; i++) {
                    savedChildren.push(nodeTree.children[i].children)
                }

                // clear top level, fill with chunks for next level, filled from savedChildren
                nodeTree.strategy = nextStrategy
                nodeTree.children.splice(0)
                for (let i = 0; i < nextLength; i++) {
                    const tmp = []
                    for (let j = 0; j < topLength; j++) {
                        tmp.push(savedChildren[j][i])
                    }
                    nodeTree.children.push(new Chunk(tmp, topStrategy))
                }
            }

            // visit the rest of the tree and accumulate changes there
            changed ||= nodeTree.children.reduce((anyChanged, child) => sortTreeByNestingLevel(child) || anyChanged, false)
        }

        return changed
    }

    const chunkTree = populateTree([...strategies], new BitSet(G.order))

    while (sortTreeByNestingLevel(chunkTree)) {
        // run sortTreeByNestingLevel until it no longer reports making a change
    }

    return chunkTree
}

function getCentroid (nodes) {
    return nodes
        .reduce((centroid, node) => centroid.add(node.position), new THREE.Vector3(0,0,0))
        .multiplyScalar(1 / nodes.length)
}

function getRadius (center, nodes) {
    const squaredRadius = nodes
        .reduce((squaredRadius, node) => Math.max(squaredRadius, node.position.distanceToSquared(center)), 0)

    return Math.sqrt(squaredRadius)
}

function getWidth (nodes /*: Array<NodeData> */, directionIndex /*: Index */) /*: number */ {
    if (!Array.isArray(nodes))
        return 0

    const [min, max] =
        nodes.reduce(([min, max], node) =>
            [Math.min(min, node.position.getComponent(directionIndex)),
                Math.max(max, node.position.getComponent(directionIndex))],
            [Number.MAX_VALUE, Number.MIN_VALUE])

    return max - min
}

// Normalize scene: translate to centroid, stretch to fill page
function normalizeScene (chunkTree) {
    const allCurvedStrategies = chunkTree.leftBoundary
        .map((chunk) => chunk.strategy)
        .filter((strategy) => strategy instanceof CurvedLayoutStrategy)

    // scale anisotropically unless it would distort a circular/rotated diagram
    const centroid = chunkTree.position.clone()
    const radius = getRadius(centroid, chunkTree.allChildNodes)
    const scaleArray = new THREE.Vector3().setFromMatrixScale(chunkTree.transformedChunkBox).toArray()
        .map((scale, inx) => {
            let adjustedScale = scale / (radius || 1)
            const originalSize = chunkTree.originalChunkSize.getComponent(inx)
            if (originalSize > .01 && originalSize < 0.5) {
                // no curved strategies in this direction
                const unsafeDirections = ['YZ', 'XZ', 'XY'].filter((_, jnx) => inx != jnx)
                const hasUnsafeStrategy = allCurvedStrategies.some((strategy) =>
                    unsafeDirections.includes(strategy.direction)
                )
                if (!hasUnsafeStrategy) {
                    adjustedScale = 1 / originalSize
                }
            }
            return adjustedScale
        })
    const centeringTransform = new THREE.Matrix4().makeTranslation(...centroid.multiplyScalar(-1).toArray())
    const transform = new THREE.Matrix4().makeScale(...scaleArray).multiply(centeringTransform)

    chunkTree.transform(transform)
}

function generateStrategy (G) {
   // Shortcut to generate layout for Abelian group
   if (G.isAbelian) {
      return generateAbelianStrategy(G)
   }

   const normalSubgroups = G.subgroups.filter((H) => H.isNormal && H.order != 1 && H.order != G.order)

   // Use fallback strategy for simple groups
   //   and for subgroups that aren't isomorphic to anything in the library
   if (normalSubgroups.length == 0 || normalSubgroups.some((N) => N.isomorphicGroup == null)) {
      return generateFallbackStrategy(G)  // a simple group
   }

   // Recognize dihedral, semidihedral, and modular groups
   const dihedralStrategy = generateDihedralStrategy(G, normalSubgroups)
   if (dihedralStrategy != null) {
      return dihedralStrategy
   }

   // make split extension, array of [normalSubroup, complement] subgroups
   const splitExtensions = normalSubgroups.reduce(
      (complements, N) => {
         const complement = G.subgroups
            .find((H) => H.order != 1 && H.order != G.order && H.order == G.order / N.order
               && BitSet.intersection(H.members, N.members).popcount() == 1)
         if (complement != null) {
            complements.push([N, complement])
         }
         return complements
      }, [])

   // Direct product: there are split extensions, some quotient is also a normal subgroup
   if (splitExtensions.length != 0 && splitExtensions.some(([_N, H]) => H.isNormal)) {
      return generateDirectProductStrategy(G, splitExtensions)
   }

   // Recognize dicyclic, quaternion groups
   const dicyclicStrategy = generateDicyclicStrategy(G, normalSubgroups)
   if (dicyclicStrategy != null) {
      return dicyclicStrategy
   }

   // Semidirect product: there are split extension, no quotient is a normal subgroup
   if (splitExtensions.length != 0 && splitExtensions.every(([_N, H]) => !H.isNormal)) {
      return generateSemidirectProductStrategy(G, splitExtensions)
   }

   const nonSplitStrategy = generateNonSplitStrategy(G, normalSubgroups)
   if (nonSplitStrategy != null) {
      return nonSplitStrategy
   }

   // unrecognized pattern
   return generateFallbackStrategy(G)
}

/* Fallback strategy: a collection of heuristics
 *   Special cases:
 *      group is order = 1 => draw a single node
 *      group is order = 2 => linear (just two nodes)
 *
 *   General case:
 *      if group is cyclic => circular
 *      if group has two generators, look for a cyclic subgroup that is order |G|/2 and draw this as two connected circles
 *        if |G| = |gen1| * |gen2|, draw this with gen1 rotated in XY plane, gen2 linear in X (e.g., S_3)
 *        if not, draw this with gen1 circular in XY plane, gen2 linear in Z (e.g., Q_4)
 *      if group has two generators but no such cyclic subgroup draw a 2D grid
 *      if group has three generators map each of them to an axis in a 3D grid
 *      if group has four generators, pick the two smallest to display on same axis and map others to the remaining axes
 */
function generateFallbackStrategy (G) {
   let strategies = []
   if (G.order == 1) {
      // this.nodes.push(new Diagram3D.Node(0));  // just draw a single node
      return strategies
   }
   if (G.order == 2) {
      strategies.push({generator: 1, layout: 'linear', direction: 'Y', nestingLevel: 0});
      return strategies
   }

   const element_orders = G.elementOrders;

   // use only enough of the group's generators to generate the group
   const generators /*: Array<groupElement> */ = []
   for (let inx = 0; inx < G.generators.length; inx++) {
      generators.push(G.generators[inx])
      if (G.closure(generators).popcount() == G.order) {
         break
      }
   }

   const ordered_gens = generators.slice().sort( (a,b) => element_orders[b] - element_orders[a] );
   switch (generators.length) {
   case 1:
      strategies.push({generator: generators[0], layout: 'circular', direction: 'XY', nestingLevel: 0});  // cyclic group
      break;
   case 2:
      // does the first ordered_gen (generator with largest element order) have order |G|/2?
      // make sure group is big enough -- can't do a circle with only 2 elements
      if (element_orders[ordered_gens[0]] == G.order/2 && G.order > 4) {
         if (element_orders[ordered_gens[1]] == 2) {
            strategies.push({generator: ordered_gens[1], layout: 'linear', direction: 'X', nestingLevel: 0},
               {generator: ordered_gens[0], layout: 'rotated', direction: 'XY', nestingLevel: 1});  // see D_4
         } else {
            strategies.push({generator: ordered_gens[1], layout: 'circular', direction: 'XY', nestingLevel: 0},
               {generator: ordered_gens[0], layout: 'linear', direction: 'Z', nestingLevel: 1});    // see Q_4
         }
      } else {
         // put greatest # elements in X direction (remember that the 2nd generator will generate
         //   all the elements in the group the first one doesn't)
         const first_gen_order = element_orders[ordered_gens[0]];
         const first_gen_dir = (first_gen_order >= G.order/first_gen_order) ? 'X' : 'Y';
         const second_gen_dir = (first_gen_dir == 'X') ? 'Y' : 'X';
         strategies.push({generator: ordered_gens[0], layout: 'linear', direction: first_gen_dir, nestingLevel: 0},
            {generator: ordered_gens[1], layout: 'linear', direction: second_gen_dir, nestingLevel: 1});  // see S_4
      }
      break;
   case 3:
      strategies.push({generator: generators[0], layout: 'linear', direction: 'X', nestingLevel: 0},
         {generator: generators[1], layout: 'linear', direction: 'Y', nestingLevel: 1},
         {generator: generators[2], layout: 'linear', direction: 'Z', nestingLevel: 2});
      break;
   case 4:
      strategies.push({generator: ordered_gens[0], layout: 'linear', direction: 'X', nestingLevel: 0},
         {generator: ordered_gens[1], layout: 'linear', direction: 'X', nestingLevel: 1},
         {generator: ordered_gens[2], layout: 'linear', direction: 'Y', nestingLevel: 2},
         {generator: ordered_gens[3], layout: 'linear', direction: 'Z', nestingLevel: 3});
      break;
   }
   return strategies;
}

/* Abelian group strategy: use group generators, arrange in x-y-z grid
 */
function generateAbelianStrategy (G) {
   const strategies = []
   let generators = G.generators

   if (generators.length == 1) {
      if (G.order == 2) {
         strategies.push({generator: generators[0], layout: 'linear', direction: 'Y', nestingLevel: 0})
      } else {
         strategies.push({generator: generators[0], layout: 'circular', direction: 'XY', nestingLevel: 0})
      }
   } else if (generators.length == 2 && ((G.elementOrders[generators[0]] == 2) != (G.elementOrders[generators[1]] == 2))) {
      generators = (G.elementOrders[generators[0]] == 2) ? generators : [generators[1], generators[0]]
      strategies.push(
         {generator: generators[0], layout: 'linear', direction: 'X', nestingLevel: 0},
         {generator: generators[1], layout: 'rotated', direction: 'XY', nestingLevel: 1}
      )
   } else {
      for (const [inx, generator] of generators.entries()) {
         const direction = (inx < 3)
            ? AXIS_NAME[inx]
            : (G.elementOrders[generator] == 2) ? 'Z' : 'XY'
         const layout = (inx < 3 || G.elementOrders[generator] == 2)? 'linear' : 'circular'
         strategies.push({generator: generator, layout: layout, direction: direction, nestingLevel: inx})
      }
   }

   return strategies
}

/* Non-Abelian direct product strategy: find normal subgroup/quotient pair with lowest order/generator count
 *
 * Layout pair with `generateStrategyForSplitExtension`
 */
function generateDirectProductStrategy (_G, splitExtensions) {
   let [N, H] = splitExtensions
      .filter(([_N, H]) => H.isNormal)
      .reduce(([N0, H0], [N, H]) => {
         let result = [N0, H0]
         if (  N.order + H.order < N0.order + H0.order
            || N.generators.popcount() + H.generators.popcount() < N0.generators.popcount() + H0.generators.popcount()) {
            result = [N, H]
         }
         return result
      }, splitExtensions[0])

   // exchange N and H so group of order 2 is second
   ;[N, H] = (N.order == 2 || H.order < N.order) ? [H, N] : [N, H]

   return generateStrategyForSplitExtension(N, H)
}

/* Semidirect product strategy: find normal subgroup/quotient pair with lowest total generator count
 *
 * Layout pair with `generateStrategyForSplitExtension`
 */
function generateSemidirectProductStrategy (_G, splitExtensions) {
   // find largest normal subgroup, with fewest generators
   const [N, H] = splitExtensions
      .reduce(([N0, H0], [N, H]) => {
         let result = [N0, H0]
         if (H.isAbelian || !H0.isAbelian) {
            if (N.generators.popcount() + H.generators.popcount() < N0.generators.popcount() + H0.generators.popcount()) {
               result = [N,H]
            }
         }
         return result
      }, splitExtensions[0])

   return generateStrategyForSplitExtension(N, H)
}

/* Split extension strategy: generate strategy to display N, copied according to strategy to display H
 *
 * Generate strategy for displaying N and embed it in this graph
 * Generate strategy for displaying H, embed it in this graph, and correct for nesting levels
 */
function generateStrategyForSplitExtension (N, H) {
   const strategies = generateStrategy(N.isomorphicGroup)
   strategies.forEach((strategy) => strategy.generator = N.isomorphicGroupEmbedding[strategy.generator])

   if (H.order == 2) {  // Special case H.order == 2 as linear copy of N in the Z-direction
      strategies.push({generator: H.generators.first(), layout: 'linear', direction: 'Z', nestingLevel: strategies.length})
   } else {
      const outerStrategies = generateStrategy(H.isomorphicGroup)
      outerStrategies.forEach((strategy) => {
         strategy.generator = H.isomorphicGroupEmbedding[strategy.generator]
         strategy.nestingLevel += strategies.length
      })
      strategies.push(...outerStrategies)
   }

   return strategies
}

/* Dihedral, semidihedral, and modular group strategy: draw two concentric rings
 *
 * |G| = 2*n, cyclic normal subgroup N, |N| = |G|/2, and non-normal quotient |G/N| = 2
 */
function generateDihedralStrategy (G, normalSubgroups) {
   if (G.order % 2 != 0) {
      return null
   }

   const N = normalSubgroups.find((N) => N.order == G.order / 2 && N.generators.popcount() == 1)
   const H = (N == null)
      ? null
      : G.subgroups.find((H) => !H.isNormal && H.order == 2 && !N.members.isSet(H.generators.first()))
   if (H != null) {
      const strategies = [
         {generator: H.generators.first(), layout: 'linear', direction: 'X', nestingLevel: 0},
         {generator: N.generators.first(), layout: 'rotated', direction: 'XY', nestingLevel: 1}
      ]
      return strategies
   }

   return null
}

/* Dicyclic (and quaternion) strategy: draw bullseye pattern
 *
 * |G| = 4*n, non-split extension C_2n . C_2
 */
function generateDicyclicStrategy (G, normalSubgroups) {
   if (G.order % 4 != 0) {
      return null
   }

   const N = normalSubgroups.find((N) => N.order == G.order / 2 && N.generators.popcount() == 1)
   const H = (N == null)
      ? null
      : G.subgroups.find((H) => H.order == 4 && H.generators.popcount() == 1 && BitSet.intersection(N.members, H.members).popcount() == 2)
   if (H != null) {
      const strategies = [
         {generator: H.generators.first(), layout: 'rotated', direction: 'XY', nestingLevel: 1},
         {generator: N.generators.first(), layout: 'linear', direction: 'X', nestingLevel: 0}
      ]

      return strategies
   }

   return null
}

function generateNonSplitStrategy (G, normalSubgroups) {
   const [N, H] = normalSubgroups.reduce(([N0, H0], N) => {
      if (N.order == G.order / 4) {
         const H = G.subgroups.find((H) => H.order == 8
            && BitSet.intersection(N.members, H.members).popcount() == 2
            && G.closure(BitSet.union(N.members, H.members)).popcount() == G.order)
         if (H != null) {
            return [N, H]
         }
      }
      return [N0, H0]
   }, [null, null])

   if (N != null) {
      const strategies = generateStrategy(N.isomorphicGroup)
      strategies.forEach((strategy) => strategy.generator = N.isomorphicGroupEmbedding[strategy.generator])

      const outerStrategies = generateStrategy(H.isomorphicGroup)
      outerStrategies.forEach((strategy) => {
         strategy.generator = H.isomorphicGroupEmbedding[strategy.generator]
         strategy.nestingLevel += strategies.length
      })
      strategies.push(...outerStrategies)

      return strategies
   }

   return null
}

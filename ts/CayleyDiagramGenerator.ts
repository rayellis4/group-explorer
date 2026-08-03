/*

# CayleyDiagramGenerator

```javascript
 */
import * as THREE from '../lib/externals.js';
import { BitSet } from './BitSet.js';

import { DEFAULT_NODE_COLOR } from "./CayleyDiagramModel.js"
import type { NodeType, ArrowType, ChunkType, LayoutType } from "./CayleyDiagramModel.js"
import type { Group } from './Group.ts'
import type { Subgroup } from './Subgroup.ts'
import { XMLCayleyDiagram } from './XMLGroup.js';

type LineDirection = 'X' | 'Y' | 'Z';
type PlaneDirection = 'YZ' | 'XZ' | 'XY';
export type Layout = 'linear' | 'circular' | 'rotated';
export type Direction = LineDirection | PlaneDirection;
export type StrategyParameters = {
   generator: groupElement,
   layout: Layout,
   direction: Direction,
   nestingLevel: number
 }
export type ArrowGenerator = { generator: groupElement, color: color }

export const DIRECTION_INDEX = { X: 0, Y: 1, Z: 2, YZ: 0, XZ: 1, XY: 2 };
export const AXIS_NAME: LineDirection[] = ['X', 'Y', 'Z'];

const DEFAULT_ARC_OFFSET = 0.15

export function layoutCayleyDiagram (
   group: Group,
   diagramName?: string,
   strategyParameters?: StrategyParameters[],
   arrowGenerators?: ArrowGenerator[],
   rightMultiply?: boolean,
   chunkSubgroupIndex?: integer
): LayoutType {
   if (diagramName != null) {
      return drawDiagram(group, diagramName, arrowGenerators, rightMultiply)
   } else if (strategyParameters != null) {
      return drawFromStrategy(group, strategyParameters, arrowGenerators, rightMultiply, chunkSubgroupIndex)
   } else {
      return drawDefault(group)
   }
}

export function getDefaultStrategies (group: Group): StrategyParameters[] {
   return generateStrategy(group)
}

function drawDefault (group: Group) {
   if (group.elements.length == 1) {
      const nodes = [
         { position: new THREE.Vector3(), element: 0, label: group.representation[0], color: DEFAULT_NODE_COLOR }
      ]
      const chunkTree = new Chunk(nodes)
      return makeLayout(chunkTree, [], true)
   }

   const strategyParameters = generateStrategy(group)
   const strategies = strategyParameters.map( ({generator, layout, direction, nestingLevel}:
          {generator: groupElement, layout: Layout, direction: Direction, nestingLevel: integer}) =>
      new STRATEGY_BY_LAYOUT[layout](generator, direction, nestingLevel)
   )

   const chunkTree = generateTree(group, strategies)
   chunkTree.strategy.layoutChunk(chunkTree)
   normalizeScene(chunkTree)

   const arrowGeneratorElements = strategies.map((strategy: AbstractLayoutStrategy) => strategy.generator).reverse()
   const arrows = createArrows(group, chunkTree, arrowGeneratorElements, true)
   setArrowColors(arrows, null)

   return makeLayout(chunkTree, arrows, true)
}

function drawDiagram (
   group: Group,
   diagramName: string,
   arrowGenerators: Maybe<ArrowGenerator[]>,
   rightMultiply: boolean = true
) {
   const cayleyDiagram = group.cayleyDiagrams.find((cd) => cd.name == diagramName) as XMLCayleyDiagram
   const nodes = cayleyDiagram.points.map((point, element) => createNode(group, element, point))
   const chunkTree = new Chunk(nodes).setPositionFromChildren()
   const arrowGeneratorElements = (arrowGenerators == null)
      ? cayleyDiagram.arrows
      : arrowGenerators.map((ag) => ag.generator)
   const arrows = createArrows(group, chunkTree, arrowGeneratorElements, rightMultiply)
   setArrowColors(arrows, arrowGenerators)

   return makeLayout(chunkTree, arrows, false)
}

function drawFromStrategy (
   group: Group,
   strategyParameters: StrategyParameters[],
   arrowGenerators: Maybe<ArrowGenerator[]>,
   rightMultiply: boolean = true,
   chunkSubgroupIndex?: Maybe<integer>
) {
   if (group.elements.length == 1) {
      const nodes = [
         { position: new THREE.Vector3(), element: 0, label: group.representation[0], color: DEFAULT_NODE_COLOR }
      ]
      const chunkTree = new Chunk(nodes)
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

function makeLayout (chunkTree: Chunk, arrows: ArrowType[], generatesFromStrategy: boolean): LayoutType {
   return { pov: getPOV(chunkTree, generatesFromStrategy), nodes: chunkTree.allChildNodes, arrows, chunks: [] }
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
export function getPOV (chunkOrNodePositions: Chunk | {position: THREE.Vector3}[], generatesFromStrategy: boolean) {
   const nodes = (chunkOrNodePositions instanceof Chunk) ? chunkOrNodePositions.allChildNodes : chunkOrNodePositions

   const pov = {position: new THREE.Vector3(), up: new THREE.Vector3()}
   const nodePositions = nodes.map((node) => node.position)
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

   const radius = getRadius(new THREE.Vector3(), nodes) || 1  // zero radius, one element
   pov.position.multiplyScalar(radius)

   return pov
}

function setArrowColors (arrows: ArrowType[], passedArrowGenerators: Maybe<ArrowGenerator[]>) {
   if (passedArrowGenerators == null) {
      const coloredGeneratorMap = new Map()
      const colorsUsed: color[] = []
      arrows.forEach((arrow) => {
         arrow.color = coloredGeneratorMap.get(arrow.generator)
         if (arrow.color == null) {
            arrow.color = nextArrowColor(colorsUsed)
            coloredGeneratorMap.set(arrow.generator, arrow.color)
            colorsUsed.push(arrow.color)
         }
      })
   } else {
      const arrowGeneratorMap = new Map<groupElement, ArrowGenerator>(
         passedArrowGenerators.map((arrowGenerator) => [arrowGenerator.generator, arrowGenerator])
      )
      arrows.forEach((arrow) => arrow.color = (arrowGeneratorMap.get(arrow.generator) as ArrowGenerator).color)
   }
}

// colors from Mat Macaulay's slides, Sasha Trubetskoy's list of distinct colors
const ARROW_COLORS =
   ['#89b910', '#b79100', '#f58231', '#469990', '#808000', '#007700', '#0d0db0', '#990000']
export function nextArrowColor (colorsUsed: color[] = []): color {
   let nextColor
   if (colorsUsed.length < ARROW_COLORS.length) {
      const unusedColors = [...ARROW_COLORS]
      colorsUsed.forEach((color) => {
         const unusedColorIndex = unusedColors.indexOf(color)
         if (unusedColorIndex > 0) {
            unusedColors.splice(unusedColorIndex, 1)
         }
      })
      nextColor = unusedColors.pop() as color
   } else {  // run through color paletter, just create a color from a random hue
      const randomHue = Math.round(Math.random() * 360)
      nextColor = `hsl(${randomHue}, 55%, 50%)`
   }
   return nextColor
}

function createChunks (group: Group, chunkTree: Chunk, chunkSubgroupIndex: Maybe<integer>): ChunkType[] {
   if (chunkSubgroupIndex == null) {
      return []
   }

   const findChunksByStrategy = (strategy: AbstractLayoutStrategy, chunk: Chunk = chunkTree): Chunk[] => {
      if (chunk.strategy == strategy) {
         return [chunk]
      } else {
         return chunk.chunks.map((child) => findChunksByStrategy(strategy, child)).flat(2)
      }
   }

   const findChunksBySubgroupIndex = (subgroupIndex: integer, chunk: Chunk = chunkTree): Chunk[]  => {
      if (chunk.strategy.elements?.equals(group.subgroups[subgroupIndex].members)) {
         return findChunksByStrategy(chunk.strategy)
      } else if (chunk.chunks.length > 0) {
         return findChunksBySubgroupIndex(subgroupIndex, chunk.chunks[0])
      } else {
         return []
      }
   }

   const chunks = findChunksBySubgroupIndex(chunkSubgroupIndex)

   const chunkData: ChunkType[] = chunks.map((chunk) => {
      const allChildNodes = chunk.allChildNodes
      const chunkData: ChunkType = {
         name: allChildNodes[0].label + `<i>H</i><sub>${chunkSubgroupIndex}</sub>`,
         box: chunk.transformedChunkBox,
         widths: chunk.originalChunkSize,
         nodes: allChildNodes,
      }
      return chunkData
   })

   return chunkData
}

function createArrows (
   group: Group,
   chunkTree: Chunk,
   generators: groupElement[],
   rightMultiply: boolean
): ArrowType[] {
   const areColinear = (position1: THREE.Vector3, position2: THREE.Vector3, position3: THREE.Vector3): boolean => {
      const v1 = new THREE.Vector3().subVectors(position1, position2)
      const v2 = new THREE.Vector3().subVectors(position1, position3)
      return new THREE.Vector3().crossVectors(v1, v2).length() < 1.0e-6
   }

   const isCurved = (startNode: NodeType, endNode: NodeType): boolean => {
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
         const startNodeParentIndex =
            commonChunk.chunks.findIndex((child) => child.leaves.some((node) => node == startNode))
         const endNodeParentIndex =
            commonChunk.chunks.findIndex((child) => child.leaves.some((node) => node == endNode))
         if (  commonChunk.chunks[startNodeParentIndex].leaves[1] == startNode
            && commonChunk.chunks[endNodeParentIndex].leaves[1] == endNode
            && Math.abs(startNodeParentIndex - endNodeParentIndex) != 1
            && Math.abs(startNodeParentIndex - endNodeParentIndex) != commonChunk.children.length - 1
         ) {
            drawCurved = false
         }
      }

      return drawCurved
   }

   // find lowest chunk in tree containing both nodes
   const getCommonChunk = (node1: NodeType, node2: NodeType): Chunk => {
      const ancestry1 = chunkTree.getNodeAncestry(node1)
      const ancestry2 = chunkTree.getNodeAncestry(node2)
      for (let inx = 0; inx < ancestry1.length; inx++) {
         if (ancestry1[inx] == ancestry2[inx]) {
            return ancestry1[inx] as Chunk
         }
      }
      return chunkTree  // always a safe bet
   }

   const getThirdPointForLinearLayoutStrategy = (node1: NodeType, node2: NodeType): THREE.Vector3 => {
      const ancestry = chunkTree.getNodeAncestry(node1)
      const commonChunk = getCommonChunk(node1, node2)
      const chunkIndex = ancestry.findIndex((chunk) => chunk == commonChunk)

      // look past colinear lines: they don't help to determine the display plane
      let child = null
      for (let inx = chunkIndex - 1; inx >= 0; inx--) {
         const maybeChild = ancestry[inx] as Chunk
         if ( !(maybeChild.strategy instanceof LinearLayoutStrategy)
            || maybeChild.strategy.direction != commonChunk.strategy.direction) {
               child = maybeChild
               break
            }
      }

      let parent = null
      for (let inx = chunkIndex + 1; inx < ancestry.length; inx++) {
         const maybeParent = ancestry[inx] as Chunk
         if (   !(maybeParent.strategy instanceof LinearLayoutStrategy)
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

   const getThirdPointFromCombinedChunks = (
      otherChunk: Chunk,
      commonChunk: Chunk,
      node1: NodeType,
      node2: NodeType
   ): THREE.Vector3 => {
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

   const getThirdPointFromNormalAndEndpoints = (
      normal: THREE.Vector3,
      position1: THREE.Vector3,
      position2: THREE.Vector3
   ): THREE.Vector3 => {
      const inPlane = position1.clone().sub(position2).cross(normal)
      const midPoint = position1.clone().add(position2).multiplyScalar(0.5)
      const dotProduct = midPoint.dot(inPlane)

      const thirdPoint = inPlane
         .add(midPoint)
         .multiplyScalar((Math.abs(dotProduct) > 1.e-6 && dotProduct > 0) ? -1 : 1)  // let arrows bow away from center

      return thirdPoint
   }

   const areCoplanar = (normal: THREE.Vector3, point1: THREE.Vector3, point2: THREE.Vector3): boolean => {
      const result = point1.clone().sub(point2).dot(normal) < 1.e-6
      return result
   }

   const getThirdPointForCurvedLayoutStrategy = (node1: NodeType, node2: NodeType): THREE.Vector3 => {
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
               .reduce<THREE.Vector3>((centroid, child) => centroid.add(child.position), new THREE.Vector3())
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
   const getThirdPointForSingleLine = (chunk: Chunk): THREE.Vector3 => {
      let thirdPoint

      // deal with colinear line-of-lines case?
      const thirdPoints = [
         new THREE.Vector3(0, 0, -1),
         new THREE.Vector3(0, 0, 1),
         new THREE.Vector3(0, 1, 0)
      ]
      thirdPoint = thirdPoints[DIRECTION_INDEX[chunk.strategy.direction]]

      // ToDo: make a choice with Nathan and remove this
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

   const getThirdPoint = (node1: NodeType, node2: NodeType): THREE.Vector3 => {
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

   const multiply = (a: groupElement, b: groupElement): groupElement =>
      rightMultiply ? group.mult(a, b) : group.mult(b, a);

   const newArrows: ArrowType[] = []
   for (const generator of generators) {
      for (const element of group.elements) {
         const product = multiply(element, generator)
         const bidirectional = (multiply(product, generator) == element)
         if (!bidirectional || element < product) {  // test element < product so we only draw an undirected line once
            const generatedCurved = isCurved(nodes[element], nodes[product])
            const newArrow: ArrowType = {
               start_node: nodes[element],
               end_node: nodes[product],
               generator: generator,
               bidirectional: bidirectional,
               thirdPoint: getThirdPoint(nodes[element], nodes[product]),
               keepCurved: generatedCurved,
               offset: generatedCurved ? DEFAULT_ARC_OFFSET : null,  // Heuristic value
               color: 'white'  // keeps typechecker happy, soon to be overwritten
            }
            newArrows.push(newArrow)
         }
      }
   }

   return newArrows
}

class AbstractLayoutStrategy {
   generator: groupElement
   readonly layout!: Layout
   direction: Direction
   directionIndex: integer
   nesting_level: integer
   elements: Maybe<BitSet>

   constructor (generator: groupElement, direction: Direction, nesting_level: integer) {
      this.generator = generator;          // element# (not 0)
      this.direction = direction;          // X/Y/Z for linear, YZ/XZ/XY for curved
      this.directionIndex = DIRECTION_INDEX[direction]
      this.nesting_level = nesting_level;  // 0 for innermost, increasing to outermost
   }
   
   get strategyParameters (): StrategyParameters {
      return { generator: this.generator,
         layout: this.layout,
         direction: this.direction,
         nestingLevel: this.nesting_level,
      };
   }

   transformChild (child: Chunk | NodeType, transform: THREE.Matrix4) {
      if ('transform' in child) {
         child.transform(transform)
      } else {
         child.position = child.position.applyMatrix4(transform)
      }
   }

   layoutChunk (chunk: Chunk) {
      chunk.chunks.forEach((child) => child.strategy.layoutChunk(child))
      this.layoutNodes(chunk)
      chunk.setPositionFromChildren()

      return chunk
   }

   layoutNodes (_chunk: Chunk) {
      // Subclass responsibility
   }
}

// Scale and translate children to distribute them from 0 to 1 along the <direction> line
class LinearLayoutStrategy extends AbstractLayoutStrategy {
    readonly layout: Layout = 'linear'

    constructor (generator: groupElement, direction: Direction, nesting_level: integer) {
        super(generator, direction, nesting_level);
    }

    layoutNodes (chunk: Chunk) {
        // number of children
        const childCount = chunk.children.length

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
   YZ: (r: float, theta: float) =>
      new THREE.Vector3(0,                        0.5 - r*Math.cos(theta),  0.5 - r*Math.sin(theta)),
   XZ: (r: float, theta: float) =>
      new THREE.Vector3(0.5 + r*Math.sin(theta),  0,                        0.5 - r*Math.cos(theta)),
   XY: (r: float, theta: float) =>
      new THREE.Vector3(0.5 + r*Math.sin(theta),  0.5 - r*Math.cos(theta),  0),
}

class CurvedLayoutStrategy extends AbstractLayoutStrategy {
    positionTransform: (r: number, theta: number) => THREE.Vector3

    constructor(generator: groupElement, direction: Direction, nesting_level: number) {
        super(generator, direction, nesting_level);
        this.positionTransform = positionTransforms[direction as PlaneDirection]
    }

    // radius -- mean radius of annulus that contains children
    // scale -- factor by which to shrink the children of this chunk so they will fit around the circumference
    getRadiusAndScale (chunk: Chunk) {
        // find height, width of child of prototypical chunk child
        const dir = [
            {lengthDirection: 1, widthDirection: 2},  // YZ length: Y, width: Z
            {lengthDirection: 2, widthDirection: 0},  // XZ length: Z, width: X
            {lengthDirection: 0, widthDirection: 1},  // XY length: X, width: Y
        ]

        const nodeSize = 0.3 / Math.sqrt(chunk.allChildNodes.length)  // leave room for nodes in layout
        const childNodes = (chunk.isLeaf) ? chunk.leaves : chunk.chunks[0].allChildNodes
        const childWidth = getWidth(childNodes, dir[this.directionIndex].widthDirection) + nodeSize
        const childHeight = getWidth(childNodes, dir[this.directionIndex].lengthDirection) + nodeSize
        const childCount = chunk.children.length

        let radius = childHeight * 5 / 6
        let scale = 1

       // ad-hoc adjustment for two-node children
       if (  !chunk.isLeaf
          && chunk.chunks[0].leaves.length == 2
        ) {
            radius = 0.75 + 0.01 * childCount / 2
            scale = 0.5 - 0.01 * childCount
        } else
        // recalculate scale if circumference is too crowded
        if (2 * Math.PI * (radius - childHeight / 2) < childWidth * childCount) {
            const aspectRatio = childHeight / childWidth
            const averageArc = 2 * Math.PI / childCount
            // based on the width at the inner radius
            scale = averageArc / (1 + aspectRatio * averageArc) / childWidth
            radius = 1 - childHeight * scale / 2
        }

        return [radius, scale]
    }
}

// Scale children to fit and translate them so they're distributed
//   around the 0.5*e^i*[0,2*PI] circle centered at [.5,.5]
class CircularLayoutStrategy extends CurvedLayoutStrategy {
    readonly layout: Layout = 'circular'

    constructor(generator: groupElement, direction: Direction, nesting_level: integer) {
        super(generator, direction, nesting_level);
    }

    layoutNodes (chunk: Chunk) {
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
   YZ: (r: float, theta: float) =>
      new THREE.Vector3(0,                        0.5 - r*Math.sin(theta),  0.5 - r*Math.cos(theta)),
   XZ: (r: float, theta: float) =>
      new THREE.Vector3(0.5 + r*Math.sin(theta),  0,                        0.5 + r*Math.cos(theta)),
   XY: (r: float, theta: float) =>
      new THREE.Vector3(0.5 + r*Math.sin(theta),  0.5 - r*Math.cos(theta),  0),
}

// GE2, Current GE3
const rotationTransforms = {
    YZ: (theta: float) => new THREE.Matrix4().makeRotationX(theta + Math.PI/2),
    XZ: (theta: float) => new THREE.Matrix4().makeRotationY(theta + Math.PI/2),
    XY: (theta: float) => new THREE.Matrix4().makeRotationZ(theta + Math.PI/2),
}

// calculate rotation transform as a function of angle theta for plane directions
const proposedRotationTransforms = {
    YZ: (theta: float) => new THREE.Matrix4().makeRotationX(theta),
    XZ: (theta: float) => new THREE.Matrix4().makeRotationY(theta),
    XY: (theta: float) => new THREE.Matrix4().makeRotationZ(theta),
}

// Scale children to fit, rotate them PI/2 + 2*inx*PI/n, and translate them
//   so they're distributed around the 0.5*e^i*[0,2*PI] circle centered at [.5,.5]
class RotatedLayoutStrategy extends CurvedLayoutStrategy {
    layout: Layout = 'rotated'
    rotationTransform: (theta: number) => THREE.Matrix4;

    constructor(generator: groupElement, direction: Direction, nesting_level: integer) {
        super(generator, direction, nesting_level);
        // ToDo: make a choice with Nathan and remove this
        if (localStorage.getItem('POV') == 'GE2') {
            this.positionTransform = GE2_positionTransforms[direction as PlaneDirection]
        }
        this.rotationTransform = (localStorage.getItem('POV') == 'proposed')
            ? proposedRotationTransforms[direction as PlaneDirection]
            : rotationTransforms[direction as PlaneDirection]
    }

    layoutNodes (chunk: Chunk) {
        const [radius, scale] = this.getRadiusAndScale(chunk)

        // scale and translate to origin
        const centroid = getCentroid(chunk.children)
        const toOrigin = new THREE.Matrix4()
            .makeScale(scale, scale, scale)
            .setPosition(centroid.clone().multiplyScalar(-scale))

        // scale, rotate, and translate each child
        chunk.children.forEach((child, inx) => {
            const theta = inx*2*Math.PI/chunk.children.length

            const rotate = this.rotationTransform(theta)
            const toNewPosition = new THREE.Matrix4()
                .makeTranslation(centroid.clone().add(this.positionTransform(radius, theta)))

            // scale and translate child to origin, rotate (about origin), and translate to new position
            this.transformChild(child, toNewPosition.clone().multiply(rotate.clone().multiply(toOrigin)))
        } );
    }
}

type AbstractLayoutStrategyType =
   new (generator: groupElement, direction: Direction, nesting_level: integer) => AbstractLayoutStrategy

const STRATEGY_BY_LAYOUT: { [key: string]: AbstractLayoutStrategyType } = {
    linear: LinearLayoutStrategy,
    circular: CircularLayoutStrategy,
    rotated: RotatedLayoutStrategy
}

class Chunk {
   chunks: Chunk[] = []
   leaves: NodeType[] = []
   position!: THREE.Vector3
   strategy!: AbstractLayoutStrategy
   transformedChunkBox!: THREE.Matrix4
   originalChunkSize!: THREE.Vector3
   #allChildNodes!: NodeType[]
    
   constructor (children: Chunk[] | NodeType[], strategy?: AbstractLayoutStrategy) {
      if (children[0] != null) {
         if (Object.getPrototypeOf(children[0]) === Object.prototype) {
            this.leaves.push(...children as NodeType[])
         } else {
            this.chunks.push(...children as Chunk[])
         }
      }
      if (strategy != null)
         this.strategy = strategy
   }

   get children (): Chunk[] | NodeType[]  {
      return (this.isLeaf) ? this.leaves : this.chunks
   }

   get isLeaf (): boolean {
      return this.leaves.length > 0
   }
   
    get allChildNodes (): NodeType[] {
       if (this.#allChildNodes == null) {
          const childNodes = (chunk: Chunk): NodeType[] =>
             (chunk.isLeaf)
                ? [...chunk.leaves]
                : chunk.chunks.map((child) => childNodes(child)).flat(1)
          this.#allChildNodes = childNodes(this).flat(1)
       }

       return this.#allChildNodes
    }

    get leftBoundary (): Chunk[] {
       const leftBoundary = (this.isLeaf)
          ? [this]
          : [this, ...this.chunks[0].leftBoundary]
       return leftBoundary
    }

    getNodeAncestry (node: NodeType): (Chunk | NodeType)[] {
       const ancestors = (this.isLeaf)
          ? [this]
          : [...(this.chunks.find((child) => child.allChildNodes.includes(node)) as Chunk).getNodeAncestry(node), this]
        return ancestors
    }

    setPositionFromChildren () {
        // initialize from children, but only after they've been positioned
        const allChildNodes = this.allChildNodes

        const [xMin, xMax, yMin, yMax, zMin, zMax] = allChildNodes.reduce<[float, float, float, float, float, float]>(
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

    transform (transform: THREE.Matrix4) {
        this.position.applyMatrix4(transform)
        this.transformedChunkBox.premultiply(transform)

       if (this.isLeaf) {
          for (const leaf of this.leaves) {
             leaf.position = leaf.position.applyMatrix4(transform)
          }
       } else {
          for (const chunk of this.chunks) {
             chunk.transform(transform)
          }
       }
    }
}

function createNode (G: Group, element: groupElement, position = [0, 0, 0]): NodeType {
    return {
        position: new THREE.Vector3(...position),
        element: element,
        label: G.representation[element],
        color: DEFAULT_NODE_COLOR
    }
}

function generateTree (G: Group, strategies: AbstractLayoutStrategy[]): Chunk {
   function populateTree (remainingStrategies: AbstractLayoutStrategy[], elementsUsed: BitSet): Chunk {
        const currentStrategy = remainingStrategies.pop() as AbstractLayoutStrategy

        if (remainingStrategies.length == 0) {
            elementsUsed.add(G.elementPowers[currentStrategy.generator]);
            currentStrategy.elements = elementsUsed.clone();
            const leaves = G.getElementPowerArray(currentStrategy.generator).map((el) => createNode(G, el))
            return new Chunk(leaves, currentStrategy)
        } else {
            const nodeTreeMultiply = (g: groupElement, chunk: Chunk): Chunk  => {
                if (chunk.isLeaf) {
                   const newLeaves = chunk.leaves.map((leafNode) => { 
                      const newElement = G.mult(g, leafNode.element)
                      elementsUsed.set(newElement)
                      return createNode(G, newElement)
                   })
                   return new Chunk(newLeaves, chunk.strategy)
                } else {
                   return new Chunk(chunk.chunks.map((child) => nodeTreeMultiply(g, child)), chunk.strategy)
                }
            }

            // Load generators in this order to preferentially generate a <g> X <h> rectangular map
            const generators = G.getElementPowerArray(currentStrategy.generator);
            generators.push(...remainingStrategies.map( (strategy) => strategy.generator));

            const chunks = [populateTree(remainingStrategies, elementsUsed)]

            const cosetReps = [0];
            for (const g of cosetReps) {
                for (const generator of generators) {
                    const h = G.mult(generator, g);
                    if (!elementsUsed.isSet(h)) {
                        cosetReps.push(h);
                        chunks.push(nodeTreeMultiply(h, chunks[0]));
                    }
                }
            }
            currentStrategy.elements = elementsUsed.clone();

            return new Chunk(chunks, currentStrategy)
        }
    }

    function sortTreeByNestingLevel (nodeTree: Chunk): boolean {
        let changed = false
        if (!nodeTree.isLeaf) { 
            if ((nodeTree.strategy as AbstractLayoutStrategy).nesting_level <
                    (nodeTree.chunks[0].strategy as AbstractLayoutStrategy).nesting_level
            ) {
                changed = true

                // swap the top chunk of node_tree with the next, like transposing a (non-square) matrix
                const topLength = nodeTree.chunks.length
                const nextLength = nodeTree.chunks[0].children.length

                // save strategies to swap them, too
                const topStrategy = nodeTree.strategy
                const nextStrategy = nodeTree.chunks[0].strategy

                // save next-level children as array of arrays
                const savedChildren: (Chunk[] | NodeType[])[] = []
                for (let i = 0; i < topLength; i++) {
                    savedChildren.push((nodeTree.children[i] as Chunk).children)
                }

                // clear top level, fill with chunks for next level, filled from savedChildren
                nodeTree.strategy = nextStrategy
                nodeTree.children.splice(0)
                for (let i = 0; i < nextLength; i++) {
                    const tmp: (Chunk | NodeType)[] = []
                    for (let j = 0; j < topLength; j++) {
                        tmp.push(savedChildren[j][i])
                    }
                    nodeTree.chunks.push(new Chunk(tmp as Chunk[] | NodeType[], topStrategy))
                }
            }

            // visit the rest of the tree and accumulate changes there
            changed ||=
               nodeTree.chunks.reduce<boolean>((anyChanged, child) => sortTreeByNestingLevel(child) || anyChanged, false)
        }

        return changed
    }

    const chunkTree = populateTree([...strategies], new BitSet(G.order))

    while (sortTreeByNestingLevel(chunkTree)) {
        // run sortTreeByNestingLevel until it no longer reports making a change
    }

    return chunkTree
}

function getCentroid (nodes: Chunk[] | NodeType[]): THREE.Vector3 {
    return nodes
        .reduce<THREE.Vector3>((centroid, node) => centroid.add(node.position), new THREE.Vector3(0,0,0))
        .multiplyScalar(1 / nodes.length)
}

function getRadius (center: THREE.Vector3, nodes: {position: THREE.Vector3}[]) {
    const squaredRadius = nodes
        .reduce<float>((squaredRadius, node) => Math.max(squaredRadius, node.position.distanceToSquared(center)), 0)

    return Math.sqrt(squaredRadius)
}

function getWidth (nodes: NodeType[], directionIndex: integer): number {
    if (!Array.isArray(nodes))
        return 0

    const [min, max] =
        nodes.reduce<[float, float]>(([min, max], node) =>
            [Math.min(min, node.position.getComponent(directionIndex)),
                Math.max(max, node.position.getComponent(directionIndex))],
            [Number.MAX_VALUE, Number.MIN_VALUE])

    return max - min
}

// Normalize scene: translate to centroid, stretch to fill page
function normalizeScene (chunkTree: Chunk) {
    const allCurvedStrategies = chunkTree.leftBoundary
        .map((chunk) => chunk.strategy as AbstractLayoutStrategy)
        .filter((strategy) => strategy instanceof CurvedLayoutStrategy)

    // scale anisotropically unless it would distort a circular/rotated diagram
    const centroid = chunkTree.position.clone()
    const radius = getRadius(centroid, chunkTree.allChildNodes)
    const scaleArray = new THREE.Vector3()
        .setFromMatrixScale(chunkTree.transformedChunkBox)
        .toArray()
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
        }) as [number, number, number]
    const centeringTransform = new THREE.Matrix4().makeTranslation(...centroid.multiplyScalar(-1).toArray())
    const transform = new THREE.Matrix4().makeScale(...scaleArray).multiply(centeringTransform)

    chunkTree.transform(transform)
}

function generateStrategy (G: Group): StrategyParameters[] {
   if (G.isAbelian) {
      return generateAbelianStrategy(G)  // Abelian group
   }

   if (G.isSimple) {
      return generateFallbackStrategy(G)  // a simple group, completely heuristic layout
   }

   // Recognize dihedral, semidihedral, and modular groups
   //   |G| = 2*n, cyclic normal subgroup N, |N| = |G|/2, and non-normal quotient |G/N| = 2
   if (G.order % 2 == 0) {
      const N = G.nontrivialProperNormalSubgroups.find((N) => N.index == 2 && N.isomorphicGroup.isCyclic)
      if (N != null) {
         const H = G.subgroups
            .find((H) => !H.isNormal && H.order == 2 && !N.members.isSet(H.generators.first() as groupElement))
         if (H != null) {
            return generateDihedralStrategy(N, H)
         }
      }
   }

   // we just need one, all complements are isomorphic
   const getComplement = (N: Subgroup) =>
      G.nontrivialProperSubgroups.find((H) => G.closure(BitSet.union(N.members, H.members)).popcount() == G.order)

   /* Placeholder for when we figure out how to draw a good Cayley diagram for a central product
   const normalSubgroupsInCenter = G.nontrivialProperNormalSubgroups.filter((H) => G.center.members.contains(H.members))
   const maybeCentralExtensions = normalSubgroupsInCenter.reduce((extensions, N) => {
      const K = complement(N)
      if (N.order * K.order > G.order) {
         // need more refinement here
         extensions.push([N, K])
      }
      return extensions
   }, [])
    */

   // make split extension, array of [normalSubroup, complement] subgroups
   const splitExtensions = G.nontrivialProperNormalSubgroups.reduce<[Subgroup, Subgroup][]>(
      (extensions, N: Subgroup) => {
         const H = getComplement(N)
         if (H != null && N.order * H.order == G.order) {
            extensions.push([N, H])
         }
         return extensions
      }, [])

   // Direct product: there are split extensions, some quotient is also a normal subgroup
   if (splitExtensions.length != 0 && splitExtensions.some(([_N, H]) => H.isNormal)) {
      return generateDirectProductStrategy(G, splitExtensions)
   }

   // Recognize dicyclic, quaternion groups
   //   |G| = 4*n, non-split extension C_2n . C_2
   if (G.order % 4 == 0) {
      const N = G.nontrivialProperNormalSubgroups.find((N) => N.index == 2 && N.isomorphicGroup.isCyclic)
      if (N != null) {
         const H = G.subgroups
            .find((H) => H.order == 4
                      && H.generators.popcount() == 1
                      && BitSet.intersection(N.members, H.members).popcount() == 2)
         if (H != null) {
            return generateDicyclicStrategy(N, H)
         }
      }
   }

   // Semidirect product: there are split extensions, but no quotient is a normal subgroup
   if (splitExtensions.length != 0 && !splitExtensions.every(([_N, H]) => H.isNormal)) {
      return generateSemidirectProductStrategy(G, splitExtensions)
   }

   // No split extension
   const nonSplitStrategy = generateNonSplitStrategy(G)
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
function generateFallbackStrategy (G: Group): StrategyParameters[] {
   const strategies: StrategyParameters[] = []
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
   const generators: groupElement[] = []
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
function generateAbelianStrategy (G: Group): StrategyParameters[] {
   const strategies: StrategyParameters[] = []
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
function generateDirectProductStrategy (_G: Group, splitExtensions: [Subgroup, Subgroup][]): StrategyParameters[] {
   let [N, H] = splitExtensions
      .filter(([_N, H]) => H.isNormal)
      .reduce<[Subgroup, Subgroup]>(([N0, H0], [N, H]) => {
         let result: [Subgroup, Subgroup] = [N0, H0]
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
function generateSemidirectProductStrategy (_G: Group, splitExtensions: [Subgroup, Subgroup][]): StrategyParameters[] {
   // find largest normal subgroup, with fewest generators
   const [N, H] = splitExtensions
      .reduce<[Subgroup, Subgroup]>(([N0, H0], [N, H]) => {
         let result: [Subgroup, Subgroup] = [N0, H0]
         if (H.isomorphicGroup.isAbelian || !H0.isomorphicGroup.isAbelian) {
            if (N.generators.popcount() + H.generators.popcount() < N0.generators.popcount() + H0.generators.popcount()) {
               result = [N, H]
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
function generateStrategyForSplitExtension (N: Subgroup, H: Subgroup): StrategyParameters[] {
   const strategies = generateStrategy(N.isomorphicGroup)
   strategies.forEach((strategy) => strategy.generator = N.isomorphicGroupEmbedding[strategy.generator])

   if (H.order == 2) {  // Special case H.order == 2 as linear copy of N in the Z-direction
      strategies.push({generator: H.generators.first() as groupElement, layout: 'linear', direction: 'Z', nestingLevel: strategies.length})
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

// Dihedral, semidihedral, and modular group strategy: draw two concentric rings
function generateDihedralStrategy (N: Subgroup, H: Subgroup): StrategyParameters[] {
   const strategies: StrategyParameters[] = [
      {generator: H.generators.first() as groupElement, layout: 'linear', direction: 'X', nestingLevel: 0},
      {generator: N.generators.first() as groupElement, layout: 'rotated', direction: 'XY', nestingLevel: 1}
   ]

   return strategies
}

// Dicyclic (and quaternion) strategy: draw bullseye pattern
function generateDicyclicStrategy (N: Subgroup, H: Subgroup): StrategyParameters[] {
   const strategies: StrategyParameters[] = [
      {generator: H.generators.first() as groupElement, layout: 'rotated', direction: 'XY', nestingLevel: 1},
      {generator: N.generators.first() as groupElement, layout: 'linear', direction: 'X', nestingLevel: 0}
   ]

   return strategies
}

// Non-split strategy
function generateNonSplitStrategy (G: Group): Maybe<StrategyParameters[]> {
   const normalSubgroups = G.nontrivialProperNormalSubgroups
   const [N, H] = normalSubgroups.reduce<[Maybe<Subgroup>, Maybe<Subgroup>]>(([N0, H0], N) => {
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

   if (N != null && H != null) {
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

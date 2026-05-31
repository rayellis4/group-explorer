// @flow
/*
 * Find relations among a set of generators for a group
 *   (adapted from Butler, ch 5)
 *
 * Used in Sheet to check that a set mapping is a homomorphism
 */

import {BitSet} from './BitSet.js'
import {Group} from './Group.js'
import * as Library from './Library.js'
import * as Log from './Log.js'

export {
   findRelations,
   makePresentation,
   generateGroupFromPresentation,
   parseFormattedPresentation,
   GENERATED_GROUP_PREFIX,
}

export {EXTENDED_GROUP_PREFIX} from './AutoUpgrade.js'

const GENERATED_GROUP_PREFIX = "data:,//GE3/generated"

// Returns an array of relationships as an Array<Array<integer>>, in which, for example,
//   [[1,1], [2,2,2], [1,2,1,2]] means
//     1) el[1]*el[1] = e
//     2) el[2]*el[2]*el[2] = e
//     3) el[1]*el[2]*el[1]*el[2] = e
function findRelations (
   group /*: Group */,
   generators /*: Array<groupElement> */ = group.generators
) /*: Array<Array<groupElement>> */ {
   const relators = findRawRelations(group, generators)
   relators.forEach( (relator, inx) => relators[inx] = relator.map( (el) => (el < 0) ? group.inverses[-el] : el ) );

   return relators
}

function findRawRelations (
   group /*: Group */,
   generators /*: Array<groupElement> */ = group.generators
) /*: Array<Array<groupElement>> */ {
    let G /*: Group */ = group;

    let words /*: Array<Array<groupElement>> */ = [[]];
    generators.forEach( (gen) => words[gen] = [gen] );

    let colored /*: Array<BitSet> */ = [];
    generators.forEach( (gen) => colored[gen] = new BitSet(G.order) );

    const relators /*: Array<Array<groupElement>> */ = [];

    // make spanning tree
    const spanning_tree = [0];
    const in_tree = new BitSet(G.order, spanning_tree);
    for (let inx = 0; inx < spanning_tree.length; inx++) {
        const element = spanning_tree[inx];
        colored.forEach( (_, generator) => {
            const next = G.mult(element, generator);
            if (!in_tree.isSet(next)) {
                in_tree.set(next);
                spanning_tree.push(next);
                words[next] = (element == 0) ? [generator] : [...words[element], generator]
                colored[generator].set(element);
            }
        } )
    }

   const uncolored = colored
       .reduce( (edges /*: Array<[groupElement, groupElement]> */, marks, generator) => {
            edges.push(...marks.clone().complement().toArray().map( (src) => [src, generator] ));
            return edges;
        }, [])
       .sort( ([src1, gen1], [src2, gen2]) => {
            return (words[src2].length + words[G.mult(src2, gen2)].length)
                - (words[src1].length + words[G.mult(src1, gen1)].length)
       } )

    while (uncolored.length > 0) {
        const [source, generator] = ((uncolored.pop() /*: any */) /*: [groupElement, groupElement] */)
        if (colored[generator].isSet(source))
            continue;
        colored[generator].set(source);

        // make relator
        const dest = G.mult(source, generator);
        const relator = [...words[source], generator, ...([...words[dest]].reverse().map( (el) => -el ))];
        relators.push(relator);

        // apply relator to each node
        for (const element of G.elements) {
            // apply relator
            const [_, uncolored_edges] /*: [groupElement, Array<[groupElement, groupElement]>] */ = relator.reduce(
              ([node, uncolored_edges], gen) => {
                if (gen < 0) {
                    const next = G.mult(node, G.inverses[-gen]);
                    if (!colored[-gen].isSet(next))
                        uncolored_edges.push([next, -gen]);
                    node = next;
                } else {
                    if (!colored[gen].isSet(node))
                        uncolored_edges.push([node, gen]);
                    node = G.mult(node, gen);
                }
                return [node, uncolored_edges];
            }, [element, []]);
            if (uncolored_edges.length == 1)
                colored[uncolored_edges[0][1]].set(uncolored_edges[0][0]);
        }
    }

    return relators
}

function makePresentation (group /*: Group */) /*: string */ {
   const relations = findRawRelations(group)

   const characterMap /*: Map<char, string> */ = relations.reduce(
      (characterMap, relator) => {
         relator.forEach((char) => {
            if (!characterMap.has(Math.abs(char))) {
               const offset = characterMap.size / 2
               characterMap.set(char, String.fromCharCode('a'.charCodeAt(0) + offset))
               characterMap.set(-char, String.fromCharCode('A'.charCodeAt(0) + offset))
            }
         })
         return characterMap
      }, new Map())

   const generatorString = Array
      .from(characterMap.values())
      .filter((char) => (char >= 'a') && (char <= 'z'))
      .sort()
      .join(',')

   const relatorString = relations
      .map((relation) => relation.map((el) => characterMap.get(el)).join(''))
      .join(',')

   return generatorString + ':' + relatorString
}

/*::
   type RelationTableRow = Array<?groupElement> & {isDead: ?boolean, isFilled: ?boolean}
   type RelationTable = Array<RelationTableRow>
   type CosetTableRow = Array<?groupElement>
   type CosetTable = Array<CosetTableRow>
 */

function generateGroupFromPresentation (presentation /*: string */) /*: Group */ {
   // parse presentation
   const [generators /*: Array<string> */, relators /*: Array<string> */] = parseFormattedPresentation(presentation)

   // create, fill cosetTable
   const [relationTable /*: RelationTable */, cosetTable /*: CosetTable */ ] = generateCosetTable(generators, relators)

   // check results
   checkCosetTable (presentation, relationTable, cosetTable)

   // create multtable from cosetTable
   const multtable /*: Array<Array<number>> */ = createMulttable(generators, cosetTable)

   // create, decorate group
   const group /*: Group */ = generateGroup(generators, relators, multtable, cosetTable)

   // check to see whether the group is extraordinarily large
   if (group.order > 200 || group.subgroups.length > 1000) {
      const warning =
         `The 'data:,//GE3/generated...' URL generates a group of order ${group.order} with ` +
         `${group.subgroups.length} subgroups: visualizing a group this large and complex ` +
         `may take a while.\n` +
         `Click OK to proceed, Cancel to abort.`
      if (!window.confirm(warning)) {
         return null  // or throw exception
      }
   }

   return group
}

function generateCosetTable (generators /*: Array<string> */, relators /*: Array<string> */) {
   /*
   Initialize: 
     relationKeys -- index of generator associated with each column of relationTable
     relationTable -- group element X relator character count
     cosetTable -- group element X ({generator, generator inverse} * |generator|)
    */
   const cosetTable /*: CosetTableType */ =
      [((Array(2 * generators.length).fill(null) /*: any */) /*: CosetTableRowType */)]

   const relationKeys /*: Array<number> */ = []
   for (let relatorIndex = 0; relatorIndex < relators.length; relatorIndex++) {
      for (let generatorIndex = 0; generatorIndex < relators[relatorIndex].length; generatorIndex++) {
         const char = relators[relatorIndex][generatorIndex]
         const index = 2 * generators.indexOf(char.toLowerCase()) + (isUpperCase(char) ? 1 : 0)
         relationKeys.push(index)
      }
   }

   function newRelation (element /*: groupElement */) /*: CosetTableRowType */ {
      const result = ((Array(relationKeys.length).fill(null) /*: any */) /*: CosetTableRowType */)
      for (let relatorIndex = 0, charIndex = 0;
         relatorIndex < relators.length;
         charIndex += relators[relatorIndex++].length
      ) {
         result[charIndex] = element
      }
      result.push(element)
      return result
   }

   const relationTable /*: CosetTableType */ = [newRelation(0)]

   function setRule (
      prevElement /*: ?groupElement */,
      prevGeneratorIndex /*: integer */,
      currElement /*: groupElement */,
      nextGeneratorIndex /*: integer */,
      nextElement /*: ?groupElement */
   ) {
      const prevGeneratorInverse = inverseIndex(prevGeneratorIndex)
      const nextGeneratorInverse = inverseIndex(nextGeneratorIndex)

      if (prevElement != null && cosetTable[prevElement][prevGeneratorIndex] == null) {
         cosetTable[prevElement][prevGeneratorIndex] = currElement
         cosetTable[currElement][prevGeneratorInverse] = prevElement
      }
      if (nextElement != null && cosetTable[nextElement][nextGeneratorInverse] == null) {
         cosetTable[nextElement][nextGeneratorInverse] = currElement
         cosetTable[currElement][nextGeneratorIndex] = nextElement
      }
   }

   function *cosetTableIterator () {
      for (let rowIndex = 0; rowIndex < cosetTable.length; rowIndex++) {
         for (let columnIndex = 0; columnIndex < cosetTable[0].length; columnIndex++) {
            if (cosetTable[rowIndex].isDead)
               continue
            yield [rowIndex, columnIndex]
         }
      }
   }

   function *relationTableIterator () {
      for (let rowIndex = 0; rowIndex < relationTable.length; rowIndex++) {
         for (let columnIndex = 0; columnIndex < relationTable[0].length; columnIndex++) {
            if (relationTable[rowIndex].isDead)
               continue
            yield [rowIndex, columnIndex]
         }
      }
   }

   function *relationTableNullIterator () {
      for (let rowIndex = 0; rowIndex < relationTable.length; rowIndex++) {
         const relation = relationTable[rowIndex]
         if (relation.isFilled || relation.isDead) {
            continue
         }
         for (let columnIndex = relation.indexOf(null); columnIndex < relation.length; columnIndex++) {
            if (relation[columnIndex] == null) {
               yield [rowIndex, columnIndex]
            }
         }
      }
   }

   function updateRelationTable () {
      for (let updateMade = true; updateMade;) {
         updateMade = false
         for (const [rowIndex, columnIndex] of relationTableNullIterator()) {
            const relation = relationTable[rowIndex]
            const prevElement = ((relation[columnIndex - 1] /*: any */) /*: groupElement */)
            const prevIndex = relationKeys[columnIndex - 1]
            const nextElement = ((relation[columnIndex + 1] /*: any */) /*: groupElement */)
            const nextIndex = relationKeys[columnIndex]
            const fromPrev = cosetTable[prevElement]?.[prevIndex]
            const fromNext = cosetTable[nextElement]?.[inverseIndex(nextIndex)]

            if (fromPrev == null) {
               if (fromNext == null) {
                  continue
               } else {
                  relation[columnIndex] = fromNext
                  if (prevElement != null) {
                     const expectedPrevElement = cosetTable[fromNext][inverseIndex(prevIndex)]
                     if (expectedPrevElement != null && expectedPrevElement != prevElement) {
                        mergeReferences(prevElement, expectedPrevElement)
                        break
                     }
                     cosetTable[prevElement][prevIndex] = fromNext
                     cosetTable[fromNext][inverseIndex(prevIndex)] = prevElement
                  }
               }
            } else {
               if (fromNext == null) {
                  relation[columnIndex] = fromPrev
                  if (nextElement != null) {
                     const expectedNextElement = cosetTable[fromPrev][nextIndex]
                     if (expectedNextElement != null && expectedNextElement != nextElement) {
                        mergeReferences(nextElement, expectedNextElement)
                        break
                     }
                     cosetTable[nextElement][inverseIndex(nextIndex)] = fromPrev
                     cosetTable[fromPrev][nextIndex] = nextElement
                  }
               } else {
                  if (fromPrev == fromNext) {
                     relation[columnIndex] = fromPrev
                  } else {
                     mergeReferences(fromPrev, fromNext)
                     break
                  }
               }
            }

            updateMade ||= fromPrev != null || fromNext != null
         }
      }
      // check for dead rows
      if (relationTable.some((row) => row.isDead)) {
         garbageCollect()
      }
   }

   // replace all references of larger el in relations, cosetTable with reference to lower
   // mark larger el row dead, to be garbage collected at end of update
   const mergeReferences = (el1 /*: groupElement */, el2 /*: groupElement */) => {
      const mergeQueue = []
      mergeQueue.push((el1 < el2) ? [el1, el2] : [el2, el1])

      while (mergeQueue.length > 0) {
         const [low, high] = ((mergeQueue.pop() /*: any */) /*: [groupElement, groupElement] */)
         if (low == high) {
            continue
         }

         // kill high rows in both tables
         relationTable[high].isDead = true
         cosetTable[high].isDead = true

         // replace all high references with low in relations, cosetTable, mergeQueue
         for (const [rowIndex, columnIndex] of relationTableIterator()) {
            if (relationTable[rowIndex][columnIndex] == high) {
               relationTable[rowIndex][columnIndex] = low
            }
         }
         for (const [rowIndex, columnIndex] of cosetTableIterator()) {
            if (cosetTable[rowIndex][columnIndex] == high) {
               cosetTable[rowIndex][columnIndex] = low
            }
         }
         for (const qElement of mergeQueue.values()) {
            qElement[0] = (qElement[0] == high) ? low : qElement[0]
            qElement[1] = (qElement[1] == high) ? low : qElement[1]
            // $FlowExpectedError[unsupported-syntax]
            ;[qElement[0], qElement[1]] = (qElement[0] < qElement[1]) ? qElement : [qElement[1], qElement[0]]
         }

         // migrate data from old high row to low row (and maybe add new coincidence to coincidences)
         for (let columnIndex = 0; columnIndex < cosetTable[0].length; columnIndex++) {
            if (cosetTable[low][columnIndex] != null && cosetTable[high][columnIndex] != null) {
               if (cosetTable[low][columnIndex] != cosetTable[high][columnIndex]) {
                  const el1_ = cosetTable[low][columnIndex]
                  const el2_ = cosetTable[high][columnIndex]
                  mergeQueue.push((el1_ < el2_) ? [el1_, el2_] : [el2_, el1_])
               }
            } else if (cosetTable[low][columnIndex] == null) {
               cosetTable[low][columnIndex] = cosetTable[high][columnIndex]
            }
         }
      }
   }

   // look for dead rows, and if it's not the last row copy the last row into it and delete the last row
   const garbageCollect = () => {
      while (relationTable.some((row) => row.isDead)) {
         const deadRowIndex = relationTable.findIndex((row) => row.isDead)
         const lastRowIndex = relationTable.length - 1
         if (deadRowIndex < lastRowIndex) {
            for (const [rowIndex, columnIndex] of relationTableIterator()) {
               if (relationTable[rowIndex][columnIndex] == lastRowIndex) {
                  relationTable[rowIndex][columnIndex] = deadRowIndex
               }
            }
            relationTable[deadRowIndex] = relationTable[lastRowIndex]

            for (const [rowIndex, columnIndex] of cosetTableIterator()) {
               if (cosetTable[rowIndex][columnIndex] == lastRowIndex) {
                  cosetTable[rowIndex][columnIndex] = deadRowIndex
               }
            }
            cosetTable[deadRowIndex] = cosetTable[lastRowIndex]
         }
         relationTable.pop()
         cosetTable.pop()
      }
   }

   for (var iteration = 1; iteration < 1000; iteration++) {
      // find next null in relationTable; exit loop if there isn't one
      const relation = relationTable.find((relation) => !relation.isFilled)
      if (relation == null) {
         break
      }
      // mark row 'isFilled' so we don't iterate over it again
      const columnIndex = relation.indexOf(null)
      if (columnIndex == -1) {
         relation.isFilled = true
         continue
      }

      // add new row to each element of the rules, relationTable
      const newElement = cosetTable.length
      cosetTable.push(((Array(2 * generators.length).fill(null) /*: any */) /*: CosetTableRowType */))
      relationTable.push(newRelation(newElement))

      // add new data to rules table
      setRule(
         relation[columnIndex - 1],
         relationKeys[columnIndex - 1],
         newElement,
         relationKeys[columnIndex],
         relation[columnIndex + 1]
      )

      updateRelationTable ()
   }

   Log.info(`Iteration count in DefiningRelations.getGroupFromPresentation: ${iteration}`)

   return [relationTable, cosetTable]
}

function isUpperCase (char /*: string */) {
   return char.toUpperCase() == char
}

function inverseIndex (index /*: integer */) {
   return index + ((index % 2 == 0) ? 1 : -1)
}

function checkCosetTable (presentation /*: string */, relationTable, cosetTable) {
   if (relationTable.some((relation) => !relation.isFilled)) {
      for (let inx = 0; inx < cosetTable.length; inx++) {
         for (let jnx = 0; jnx < cosetTable[0].length; jnx++) {
            if (cosetTable[inx][jnx] != null
               && cosetTable[cosetTable[inx][jnx]][inverseIndex(jnx)] != inx
            ) {
               throw new Error(
                  `DefiningRelations.generateGroupFromPresentation processing presentation ${presentation}:\n` +
                     `coset table error at row ${inx}, column ${jnx}`)
            }
         }
      }
      throw new Error(`DefiningRelations.generateGroupFromPresentation failed on ${presentation}`)
   }
}

function createMulttable (generators /*: Array<string> */, cosetTable /*: Array<Array<groupElement>> */) {
   const order = cosetTable.length

   const multtable /*: Array<Array<groupElement>> */ =
      Array.from({length: order}, () => Array(order)) // .from({length: order}, () => null))
   for (let inx = 0; inx < order; inx++) {
      multtable[inx][0] = inx
   }

   const todo = new BitSet(order).setAll().clear(0)
   const previous = new BitSet(order, [0])
   const current = new BitSet(order)
   while (!todo.isEmpty()) {
      current.clearAll()
      for (const inx of previous.toArray()) {  // for every newly-created column
         const previousColumn = multtable.map((row) => row[inx])
         for (let jnx = 0; jnx < generators.length; jnx++) { // for every generator g_i
            const maybeNewColumnIndex = cosetTable[previousColumn[0]][2 * jnx]
            if (todo.isSet(maybeNewColumnIndex)) { // if previousColumn[0] * g_i hasn't been done
               todo.clear(maybeNewColumnIndex)
               current.set(maybeNewColumnIndex)
               for (let knx = 0; knx < order; knx++) {  // multiply old column by generator and insert in multtable
                  multtable[knx][maybeNewColumnIndex] = cosetTable[previousColumn[knx]][2 * jnx]
               }
            }
         }
      }
      previous.setFrom(current)
   }

   return multtable
}

function generateGroup (
   generators /*: Array<string> */,
   relators /*: Array<string> */,
   multtable /*: Array<Array<number>> */,
   cosetTable /*: CosetTable */
) /*: Group */ {
   const group = Group.fromMulttable(multtable)

   const namePrefix = `A Generated Group of Order ${group.order}`
   const nameSuffix = Math.max(
      ...Library.getGroupsByOrder(group.order)
         .filter((G) => G.name.startsWith(namePrefix))
         .map((G) => G.name.slice(namePrefix.length).match(/\d/))
         .map((match) => parseInt(((match /*: any */) /*: RegExp$matchResult */))),
      -1)
   group.names = [namePrefix + ` (${nameSuffix + 1})`]
   group.shortName = `Generated_${group.order}`
   group.library = 'generated'
   group.definition = `⟨${formatGenerators(generators)} : ${formatRelators(relators)}⟩`
   group.notes = 'Generated from definition'
   group.URL = `${GENERATED_GROUP_PREFIX}?${generators.join(',')}:${relators.join(',')}`
   group.representations = [Array.from({length: group.order}, (_, inx) => '' + inx)]
   group.cayleyDiagrams = []
   group.symmetryObjects = []
   group.declaredGenerators = []

   // put generators from group.subgroups first if it's shorter
   if (group.subgroups.at(-1).generators.popcount() < generators.length) {
      group.declaredGenerators.push(group.subgroups.at(-1).generators.toArray())
   }
   group.declaredGenerators.push(generators.map((_, inx) => cosetTable[0][2 * inx]))

   // generate element representations that match the presentation
   const reps = Array(group.order)
   reps[0] = generators.includes('e')  // 'e' if it's not a generator; else 0 if group is Abelian, or 1 if not
      ? (group.isAbelian ? '0' : '1')
      : 'e'
   const queue = [[0, '']]
   const todo = new BitSet(group.order).setAll()
   todo.clear(0)
   while (todo.popcount() != 0) {
      const [el, rep] = queue.shift()
      for (let genIndex = 0; genIndex < generators.length; genIndex++) {
         const el_x_gen = cosetTable[el][2 * genIndex]
         if (reps[el_x_gen] == null) {
            todo.clear(el_x_gen)
            reps[el_x_gen] = rep + generators[genIndex]
            queue.push([el_x_gen, reps[el_x_gen]])
         }
      }
   }
   group.representations = [reps.map((rep) => formatRelator(rep))]

   return group
}

// reads 'a,b | a3=b2=1, bab=a-1', returns [generators, relators] as [['a','b'],['aaa','bb','baba']]
function parseFormattedPresentation (presentation /*: string */) {
   presentation = presentation.replaceAll(/%20/g,'').replaceAll(/\|/g,':')  // cut-and-paste from groupnames.org
   const [generatorString, relatorString] = presentation.split(':')
   const generators = generatorString.split(',').sort()
   const relators = relatorString.split(',')
      .map((relatorExpression) => relatorExpression + ',')  // add ',' terminator to recognize last term
      .map((relatorExpression) => {
         const relators = Array
            .from(relatorExpression.matchAll(/([-a-zA-Z0-9]+)([=,])/g))
            .map(([_relator, relatorTerm, separator]) => { return [relatorTerm, separator] })
            .reduce((relators, [relatorTerm, separator], inx, arr) => {
               if (separator == ',') {  // ',' separator only on last term
                  const relator = parseFormattedRelator(relatorTerm)
                  if (relator != '1') {  // last term != '1', expression is 'term = lastTerm'
                     if (arr.length == 1) {
                        relators.push(relator)
                     } else {  // find inverse of last term and apply to relators so 'term * lastTermInverse = 1'
                        const lastTermInverse = Array
                           .from(relator)
                           .reverse()
                           .map((char) => (char == char.toLowerCase()) ? char.toUpperCase() : char.toLowerCase())
                           .join('')
                        relators = relators.map((rel) => rel + lastTermInverse)
                     }
                  }
               } else {
                  relators.push(parseFormattedRelator(relatorTerm))
               }
               return relators
            }, [])

      return relators
   }).flat(1)

   return [generators, relators]
}

function parseFormattedRelator (relator /*: string */) {
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
         inx += (Math.abs(exponent) < 10) ? 1 : ((Math.abs(exponent) < 100) ? 2 : 3)  // assume exponent < 1000
      }
      results.push(result)
   }

   return results.join('')
}

function formatGenerators (generators /*: Array<string> */) {
   const formattedGenerators = generators
      .map((gen) => `<i>${gen}</i>`)
      .join(', ')

   return formattedGenerators
}

function formatRelators (relators /*: Array<string> */) {
   const formattedRelators = relators
      .map((relator) => formatRelator(relator) + '=<wbr>')
      .join('') + '1'

   return formattedRelators
}

function formatRelator (relator /*: string */) {
   const translatedRelator = []
   let currentChar = relator.charAt(0)
   let currentCount = 1
   for (let inx = 1; inx <= relator.length; inx++) {
      const char = relator.charAt(inx)
      if (char == currentChar) {
         currentCount++
      } else {
         translatedRelator.push(`<i>${currentChar.toLowerCase()}</i>`)
         if (currentChar == currentChar.toUpperCase()) {
            translatedRelator.push(`<sup>-${currentCount}</sup>`)
         } else if (currentCount > 1) {
            translatedRelator.push(`<sup>${currentCount}</sup>`)
         }
         currentChar = char
         currentCount = 1
      }
   }

   return translatedRelator.join('')
}

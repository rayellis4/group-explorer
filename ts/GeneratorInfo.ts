/*

# GeneratorInfo

A [GroupInfo](./GroupInfo.html.md) component that displays the group's generators.

```javascript
 */
import type { Group } from './Group.ts'

export function display (generatorElementId: string, group: Group) {
   const generatorElement = document.getElementById(generatorElementId) as HTMLElement
   generatorElement.innerHTML = makeGeneratorContent(group)

   // rebuild content on representation change
   ;(generatorElement.closest('.all-info') as HTMLElement)
      .addEventListener('representationChange', () => generatorElement.innerHTML = makeGeneratorContent(group))
}

function makeGeneratorContent (group: Group) {
   const generatorLine = (gen: groupElement[]): string => gen.reduce<string>(
      (acc, el, inx) => {
         const rep = group.representation[el]
         if (gen.length == 1) {
            return `The element ${rep} generates the group.`
         } else if (inx == 0) {
            return `The elements ${rep}`
         } else if (inx == gen.length - 1) {
            return acc + ` and ${rep} generate the group.`
         } else {
            return acc + `, ${rep}`
         }
      }, '')

   const generatorLines =
      (group.declaredGenerators != null && group.declaredGenerators.length > 0)
         ? group.declaredGenerators.map((gen: groupElement[]) => `<li>${generatorLine(gen)}</li>`).join('')
         : `<li>${generatorLine(group.generators)}</li>`

   const generatorDisplay =
     `<details>
         <summary>Generators</summary>
         <ul>
            ${generatorLines}
         </ul>
      </details>`

   return generatorDisplay
}

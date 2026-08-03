/*

# CyclicInfo

A [GroupInfo](./GroupInfo.html.md) component that displays whether a group is cyclic.

```javascript
 */
import type { Group } from './Group.ts'

export function display (cyclicInfoElementId: string, group: Group) {
   const cyclicInfoElement = document.getElementById(cyclicInfoElementId) as HTMLElement
   cyclicInfoElement.innerHTML = makeCyclicInfoContent(group)
   
   // rebuild content on representation change
   ;(cyclicInfoElement.closest('.all-info') as HTMLElement)
      .addEventListener('representationChange', () => cyclicInfoElement.innerHTML = makeCyclicInfoContent(group))
}

function makeCyclicInfoContent (group: Group): html {
   const htmlFragments = [
      `<details>
          <summary>
             <span class="title">Cyclic group</span>
             <span class="summary">${group.isCyclic ? 'yes' : 'no'}</span>
          </summary>`
   ]

   if (group.isCyclic) {
      const generator = group.generators[0];
      htmlFragments.push(
         `<div>${group.name} is <a href="./help/rf-groupterms/index.html#cyclic-group">cyclic</a>;
            an element that generates the group is ${group.representation[generator]}.</div>`)
   } else {
      htmlFragments.push(
         `<div>${group.name} is not <a href="./help/rf-groupterms/index.html#cyclic-group">cyclic</a>;
            no element generates the whole group.</div>`)
   }

   htmlFragments.push(
      `<button class="gap-compute" data-GAP="checking if a group is cyclic">Compute this in GAP</button>
      </details>`)

   return htmlFragments.join('')
}

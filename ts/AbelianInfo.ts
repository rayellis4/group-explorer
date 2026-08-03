/*

# AbelianInfo

A [GroupInfo](./GroupInfo.html.md) component that displays information about a group's commutativity.

```javascript
 */
import type { Group } from './Group.ts'

export function display (abelianInfoElementId: string, group: Group) {
   const abelianInfoElement = document.getElementById(abelianInfoElementId) as HTMLElement
   abelianInfoElement.innerHTML = makeAbelianInfoContent(group)

   // rebuild content on representation change
   ;(abelianInfoElement.closest('.all-info') as HTMLElement).addEventListener('representationChange',
      () => abelianInfoElement.innerHTML = makeAbelianInfoContent(group))
}

function makeAbelianInfoContent (group: Group): html {
   const htmlFragments = [
      `<details>
          <summary>
             <span class="title">Abelian Info</span>
             <span class="summary">${group.isAbelian ? 'yes' : 'no'}</span>
          </summary>`
   ]

   if (group.isAbelian) {
      htmlFragments.push(
        `<div>${group.name} is <a href="./help/rf-groupterms/index.html#abelian-group">abelian</a>;
            every pair of elements commutes.</div>`
      )
   } else {
     const [i, j] = group.nonAbelianExample as [groupElement, groupElement]
      htmlFragments.push(
        `<div>${group.name} is not <a href="./help/rf-groupterms/index.html#abelian-group">abelian</a>.
            We can find two elements that do not commute:
            ${group.representation[i]} ⋅ ${group.representation[j]} = ${group.representation[group.multtable[i][j]]}, but
            ${group.representation[j]} ⋅ ${group.representation[i]} = ${group.representation[group.multtable[j][i]]}.</div>`
      )
   }
   
   htmlFragments.push(
      `<button class="gap-compute" data-GAP="checking if a group is abelian">Compute this in GAP</button>
       </details>`)

   return htmlFragments.join('')
}

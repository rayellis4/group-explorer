/*

# OrderClassInfo

A [GroupInfo](./GroupInfo.html.md) component that displays group order classes.

```javascript
 */

import type { Group } from './Group.ts'

export function display (orderClassElementId: string, group: Group) {
   const orderClassElement = document.getElementById(orderClassElementId) as HTMLElement
   orderClassElement.innerHTML = makeOrderClassInfoContent(group)

   // rebuild content on representation change
   ;(orderClassElement.closest('.all-info') as HTMLElement)
      .addEventListener('representationChange', () => orderClassElement.innerHTML = makeOrderClassInfoContent(group))
}

function makeOrderClassInfoContent (group: Group): html {
   const htmlFragments = [
      `<details>
          <summary>
             <span class="title">Order classes</span>
             <span class="summary">${new Set(group.elementOrders).size} order class${(group.order === 1) ? '' : 'es'}</span>
          </summary>`
   ]

   const numOrderClasses = new Set(group.elementOrders).size;
   if (numOrderClasses === 1) {
      htmlFragments.push(
         `<div>In ${group.name}, there is just one
            <a href="./help/rf-groupterms/index.html#order-classes">order class</a>
            containing all the elements of the group.</div>`)
   } else {
      const orderClassList = group.orderClasses.map(
         (orderClass, order) => {
            return (orderClass.popcount() === 0)
               ? ''
               : `<li>Elements of order ${order}: ${orderClass.toArray().map((el) => group.representation[el]).join(', ')}</li>`
         })

      htmlFragments.push(
         `<div class="indent-children">In ${group.name} there are ${numOrderClasses}
            <a href="./help/rf-groupterms/index.html#order-classes">order classes</a>.
            Each is listed here:
               <ul id="order-classes-list">`,
                  ...orderClassList,
              '</ul>',
         '</div>')
   }

   htmlFragments.push(
      `<button class="gap-compute" data-GAP="computing how many order classes a group has">Compute this in GAP</button>
      </details>`)

   return htmlFragments.join('')
}

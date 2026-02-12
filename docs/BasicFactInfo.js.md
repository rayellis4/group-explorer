/* @flow

# BasicFactInfo

A [GroupInfo](./GroupInfo.html.md) component that displays some basic facts about a group, such as
its order and a defining relation.

```javascript
 */
export {display}

function display (basicFactsElementId, group) {
   const basicFacts = [
      {name: 'Order', value: group.order},
      {name: 'GAP name', value: group.gapname},
      {name: 'GAP ID', value: group.gapid},
      {name: 'Other names', value: group.other_names == undefined ? '' : group.other_names.join(', ')},
      {name: 'Definition', value: group.definition},
      {name: 'Notes', value: group.notes},
      {name: 'More info', value: group.links == undefined ? '' : group.links.map((link) => `<a href="${link}">${link}</a>`).join(', ')},
   ]

   const basicFactsHTML = [
     `<style>
         #${basicFactsElementId} td:first-child {
            text-align: right;
            white-space: nowrap;
         }
      </style>
      <details open>
         <summary>Basic Facts</summary>
         <table>`,
            ...basicFacts.map(({name, value}) => (value != null &&  value != '')
               ? `<tr><td>${name}</td><td ${name == 'Definition' ? 'style="white-space:nowrap"' : ''}>${value}</td></tr>`
               : ''),
        `</table>
         <button class="gap-compute" data-GAP="creating this group">Compute this in GAP</button>
        </details>`
   ].join('')

   const basicFactsElement = document.getElementById(basicFactsElementId)
   basicFactsElement.innerHTML = basicFactsHTML
}
